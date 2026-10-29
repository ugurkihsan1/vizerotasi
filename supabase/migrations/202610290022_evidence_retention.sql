-- Physical removal is performed ONLY through the Storage API by the Edge worker.
-- Queue records intentionally survive post/account deletion and contain no file content.
begin;
alter table public.post_verifications add column if not exists reviewed_at timestamptz;
update public.post_verifications set reviewed_at=coalesce(verified_at,now())
 where status in ('verified','declined') and reviewed_at is null;
alter table public.post_evidence add column if not exists retention_due_at timestamptz;
update public.post_evidence e set retention_due_at=case when v.status in ('verified','declined')
 then greatest(coalesce(v.reviewed_at,now()),now())+interval '30 days'
 else greatest(e.created_at+interval '90 days',now()+interval '1 day') end
 from public.post_verifications v where v.post_id=e.post_id and e.retention_due_at is null;
update public.post_evidence set retention_due_at=greatest(created_at+interval '90 days',now()+interval '1 day') where retention_due_at is null;
alter table public.post_evidence alter column retention_due_at set default (now()+interval '90 days');
alter table public.post_evidence alter column retention_due_at set not null;
create index if not exists evidence_retention_due_idx on public.post_evidence(retention_due_at,id);

create table if not exists public.evidence_cleanup_jobs (
 id uuid primary key default gen_random_uuid(),
 evidence_id uuid, post_id uuid, user_id uuid not null,
 storage_path text not null unique,
 created_at timestamptz not null default now(),
 available_at timestamptz not null default now(),
 lease_token uuid, lease_until timestamptz,
 attempts integer not null default 0
);
create index if not exists evidence_cleanup_available_idx on public.evidence_cleanup_jobs(available_at,lease_until);
alter table public.evidence_cleanup_jobs enable row level security;
revoke all on public.evidence_cleanup_jobs from public,anon,authenticated;
-- Only a one-way fingerprint survives completion, preventing reuse of a retired
-- random filename by a late/retried Storage request. No owner, filename or content.
create table if not exists public.evidence_retired_paths(path_hash text primary key);
alter table public.evidence_retired_paths enable row level security;
revoke all on public.evidence_retired_paths from public,anon,authenticated;
create or replace function public.retire_evidence_path() returns trigger
language plpgsql security definer set search_path='' as $$ begin
 insert into public.evidence_retired_paths(path_hash) values(md5(new.storage_path)) on conflict do nothing;
 return new;
end $$;
drop trigger if exists evidence_cleanup_retire_path on public.evidence_cleanup_jobs;
create trigger evidence_cleanup_retire_path after insert on public.evidence_cleanup_jobs for each row execute function public.retire_evidence_path();

create table if not exists public.retention_worker_health (
 singleton boolean primary key default true check(singleton),
 last_success_at timestamptz
);
alter table public.retention_worker_health enable row level security;
revoke all on public.retention_worker_health from public,anon,authenticated;
insert into public.retention_worker_health(singleton) values(true) on conflict do nothing;

create or replace function public.evidence_retention_insert_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare uploaded_at timestamptz;
begin
 perform 1 from public.posts where id=new.post_id for update;
 if exists(select 1 from public.evidence_cleanup_jobs where post_id=new.post_id) then
  raise exception 'Evidence cleanup in progress; try again later';
 end if;
 if exists(select 1 from public.evidence_retired_paths where path_hash=md5(new.storage_path)) then raise exception 'Retired evidence path';end if;
 if split_part(new.storage_path,'/',1)<>new.user_id::text or split_part(new.storage_path,'/',2)<>new.post_id::text
 or array_length(string_to_array(new.storage_path,'/'),1)<>3 or split_part(new.storage_path,'/',3) in ('','.','..')
 or strpos(new.storage_path,chr(92))>0 or new.storage_path~'[[:cntrl:]]' then
  raise exception 'Invalid evidence path';
 end if;
 select (to_jsonb(obj)->>'created_at')::timestamptz into uploaded_at
 from storage.objects obj where obj.bucket_id='post-evidence' and obj.name=new.storage_path;
 -- A delayed registration must not restart the retention clock.
 new.created_at:=least(coalesce(uploaded_at,new.created_at,now()),now());
 new.retention_due_at:=new.created_at+interval '90 days';
 return new;
end $$;
drop trigger if exists evidence_retention_insert on public.post_evidence;
create trigger evidence_retention_insert before insert on public.post_evidence for each row execute function public.evidence_retention_insert_guard();

create or replace function public.evidence_review_retention() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.posts where id=new.post_id for update;
 if new.status in ('verified','declined') then
  if exists(select 1 from public.evidence_cleanup_jobs where post_id=new.post_id) then
   raise exception 'Evidence cleanup in progress; try again later';
  end if;
  new.reviewed_at:=case when tg_op='INSERT' then now()
   when old.status is distinct from new.status then now() else coalesce(old.reviewed_at,now()) end;
 else new.reviewed_at:=null;
 end if;
 update public.post_evidence e set retention_due_at=case when new.status in ('verified','declined') then new.reviewed_at+interval '30 days'
  else e.created_at+interval '90 days' end
 where e.post_id=new.post_id and not exists(select 1 from public.evidence_cleanup_jobs q where q.storage_path=e.storage_path);
 return new;
end $$;
drop trigger if exists evidence_review_retention on public.post_verifications;
create trigger evidence_review_retention before insert or update of status on public.post_verifications for each row execute function public.evidence_review_retention();

-- Capture removal/cascades too, so a failed client-side Storage delete remains retryable.
create or replace function public.enqueue_removed_evidence() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.evidence_cleanup_jobs(evidence_id,post_id,user_id,storage_path)
 values(old.id,old.post_id,old.user_id,old.storage_path) on conflict(storage_path) do nothing;
 return old;
end $$;
drop trigger if exists evidence_deleted_cleanup on public.post_evidence;
create trigger evidence_deleted_cleanup after delete on public.post_evidence for each row execute function public.enqueue_removed_evidence();

-- A retired filename must never be reused while an old worker can still delete it.
create or replace function public.evidence_cleanup_path_available(path text) returns boolean
language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.evidence_cleanup_jobs where storage_path=path or post_id::text=split_part(path,'/',2))
 and not exists(select 1 from public.evidence_retired_paths where path_hash=md5(path));
$$;
drop policy if exists evidence_retention_upload on storage.objects;
create policy evidence_retention_upload on storage.objects as restrictive for insert to authenticated
 with check(bucket_id<>'post-evidence' or public.evidence_cleanup_path_available(name));

create or replace function public.claim_evidence_cleanup(batch_size integer default 25)
returns table(job_id uuid,evidence_id uuid,post_id uuid,user_id uuid,storage_path text,lease_token uuid)
language plpgsql security definer set search_path='' as $$
declare e record; o record; n integer:=least(greatest(coalesce(batch_size,25),1),100);
begin
 -- Post locks serialize admission with registration and staff review. SKIP LOCKED
 -- permits concurrent workers without acting on a decision being changed.
 for e in select pe.* from public.post_evidence pe join public.posts p on p.id=pe.post_id
  where pe.retention_due_at<=now()
  and not exists(select 1 from public.evidence_cleanup_jobs q where q.storage_path=pe.storage_path)
  order by pe.retention_due_at,pe.id for update of p skip locked limit n
 loop
  -- Re-check after acquiring the post lock: a reviewer may have committed a
  -- newer deadline after the outer statement took its snapshot.
  if exists(select 1 from public.post_evidence current_file where current_file.id=e.id and current_file.retention_due_at<=now()) then
   insert into public.evidence_cleanup_jobs(evidence_id,post_id,user_id,storage_path)
   values(e.id,e.post_id,e.user_id,e.storage_path) on conflict on constraint evidence_cleanup_jobs_storage_path_key do nothing;
  end if;
 end loop;
 -- Also remove abandoned uploads which were never successfully registered.
 -- to_jsonb keeps this compatible with minimal test schemas; hosted Storage
 -- provides a timestamp-typed created_at. Unknown ages are never guessed.
 for o in select obj.name from storage.objects obj where obj.bucket_id='post-evidence'
  and (to_jsonb(obj)->>'created_at')::timestamptz<=now()-interval '90 days'
  and obj.name~'^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}/[^/]+$'
  and split_part(obj.name,'/',3) not in ('.','..') and strpos(obj.name,chr(92))=0 and obj.name!~'[[:cntrl:]]'
  and split_part(obj.name,'/',1)~'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  and split_part(obj.name,'/',2)~'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  and not exists(select 1 from public.post_evidence pe where pe.storage_path=obj.name)
  and not exists(select 1 from public.evidence_cleanup_jobs q where q.storage_path=obj.name)
  order by obj.name limit n
 loop
  perform 1 from public.posts where id=split_part(o.name,'/',2)::uuid for update skip locked;
  if not found and exists(select 1 from public.posts where id=split_part(o.name,'/',2)::uuid) then continue;end if;
  if not exists(select 1 from public.post_evidence pe where pe.storage_path=o.name) then
   insert into public.evidence_cleanup_jobs(post_id,user_id,storage_path)
   values(split_part(o.name,'/',2)::uuid,split_part(o.name,'/',1)::uuid,o.name) on conflict on constraint evidence_cleanup_jobs_storage_path_key do nothing;
  end if;
 end loop;
 return query with due as (
  select q.id from public.evidence_cleanup_jobs q where q.available_at<=now()
  and (q.lease_until is null or q.lease_until<=now())
  order by q.available_at,q.id for update skip locked limit n
 ), claimed as (
  update public.evidence_cleanup_jobs q set lease_token=gen_random_uuid(),lease_until=now()+interval '10 minutes',attempts=q.attempts+1
  from due where q.id=due.id returning q.*
 ) select c.id,c.evidence_id,c.post_id,c.user_id,c.storage_path,c.lease_token from claimed c;
end $$;

create or replace function public.finish_evidence_cleanup(target uuid,token uuid) returns void
language plpgsql security definer set search_path='' as $$
declare q public.evidence_cleanup_jobs%rowtype; pid uuid;
begin
 select post_id into pid from public.evidence_cleanup_jobs where id=target;
 perform 1 from public.posts where id=pid for update;
 select * into q from public.evidence_cleanup_jobs where id=target for update;
 if not found then return;end if;
 if q.lease_token is distinct from token or q.lease_until<now() then raise exception 'Cleanup lease expired';end if;
 if exists(select 1 from storage.objects where bucket_id='post-evidence' and name=q.storage_path) then raise exception 'Physical evidence file remains';end if;
 -- Preserve the historical review and its reward. Retention is not a new review.
 delete from public.post_evidence where id=q.evidence_id and storage_path=q.storage_path;
 delete from public.evidence_cleanup_jobs where id=target;
end $$;

create or replace function public.retry_evidence_cleanup(target uuid,token uuid) returns void
language sql security definer set search_path='' as $$
 update public.evidence_cleanup_jobs set lease_token=null,lease_until=null,
 available_at=now()+interval '1 hour'
 where id=target and lease_token=token;
$$;
create or replace function public.retention_worker_succeeded() returns void
language sql security definer set search_path='' as $$
 update public.retention_worker_health set last_success_at=now() where singleton;
$$;
create or replace function public.retention_policy_status()
returns table(active boolean,last_success_at timestamptz,reviewed_days integer,pending_days integer)
language sql stable security definer set search_path='' as $$
 select coalesce(h.last_success_at>=now()-interval '36 hours',false)
 and not exists(select 1 from public.post_evidence where retention_due_at<now()-interval '24 hours')
 and not exists(select 1 from public.evidence_cleanup_jobs where created_at<now()-interval '24 hours'),h.last_success_at,30,90
 from public.retention_worker_health h where h.singleton;
$$;
revoke all on function public.evidence_retention_insert_guard(),public.evidence_review_retention(),public.enqueue_removed_evidence(),public.retire_evidence_path(),public.evidence_cleanup_path_available(text),public.claim_evidence_cleanup(integer),public.finish_evidence_cleanup(uuid,uuid),public.retry_evidence_cleanup(uuid,uuid),public.retention_worker_succeeded(),public.retention_policy_status() from public,anon,authenticated;
grant execute on function public.evidence_cleanup_path_available(text) to authenticated;
grant execute on function public.claim_evidence_cleanup(integer),public.finish_evidence_cleanup(uuid,uuid),public.retry_evidence_cleanup(uuid,uuid),public.retention_worker_succeeded() to service_role;
grant execute on function public.retention_policy_status() to anon,authenticated;
notify pgrst,'reload schema';
commit;
