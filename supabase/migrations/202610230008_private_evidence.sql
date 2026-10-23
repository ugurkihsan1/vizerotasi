-- Private supporting evidence is independent from publication and official-source status.
create table if not exists public.post_verifications (
 post_id uuid primary key references public.posts on delete cascade,
 status text not null default 'pending' check(status in ('pending','verified','declined')),
 verified_at timestamptz
);
create table if not exists public.post_evidence (
 id uuid primary key default gen_random_uuid(),post_id uuid not null references public.posts on delete cascade,
 user_id uuid not null references public.profiles on delete cascade,storage_path text not null unique,
 file_name text not null check(length(file_name) between 1 and 180),mime_type text not null check(mime_type in ('application/pdf','image/jpeg','image/png')),
 size_bytes bigint not null check(size_bytes between 1 and 8388608),created_at timestamptz not null default now()
);
create index if not exists evidence_post_idx on public.post_evidence(post_id);
alter table public.post_evidence enable row level security;
alter table public.post_verifications enable row level security;
revoke all on public.post_evidence,public.post_verifications from anon,authenticated;
grant select on public.post_evidence to authenticated;
grant select on public.post_verifications to anon,authenticated;
drop policy if exists evidence_private_read on public.post_evidence;
create policy evidence_private_read on public.post_evidence for select to authenticated using(user_id=auth.uid() or public.is_staff());
drop policy if exists verification_read on public.post_verifications;
create policy verification_read on public.post_verifications for select using(exists(select 1 from public.posts p where p.id=post_id and (p.status='approved' or p.user_id=auth.uid() or public.is_staff())));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('post-evidence','post-evidence',false,8388608,array['application/pdf','image/jpeg','image/png']) on conflict(id) do update set public=false,file_size_limit=8388608,allowed_mime_types=excluded.allowed_mime_types;
create or replace function public.can_upload_post_evidence(path text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (storage.foldername(path))[1]=auth.uid()::text and exists(
 select 1 from public.posts p where p.id::text=(storage.foldername(path))[2] and p.user_id=auth.uid() and p.kind in ('tip','experience')
 and not exists(select 1 from public.post_verifications v where v.post_id=p.id and v.status='verified')
 and (select count(*) from storage.objects o where o.bucket_id='post-evidence' and (storage.foldername(o.name))[1]=auth.uid()::text and (storage.foldername(o.name))[2]=p.id::text)<5)
$$;
revoke execute on function public.can_upload_post_evidence from public,anon;
grant execute on function public.can_upload_post_evidence to authenticated;
drop policy if exists evidence_upload on storage.objects;
create policy evidence_upload on storage.objects for insert to authenticated with check(bucket_id='post-evidence' and public.can_upload_post_evidence(name));
drop policy if exists evidence_download on storage.objects;
create policy evidence_download on storage.objects for select to authenticated using(bucket_id='post-evidence' and ((storage.foldername(name))[1]=auth.uid()::text or (public.is_staff() and exists(select 1 from public.post_evidence e where e.storage_path=name))));
-- Files cannot be replaced; only unregistered uploads can be removed by their owner.
drop policy if exists evidence_cleanup on storage.objects;
create policy evidence_cleanup on storage.objects for delete to authenticated using(bucket_id='post-evidence' and (storage.foldername(name))[1]=auth.uid()::text and not exists(select 1 from public.post_evidence e where e.storage_path=name));
create or replace function public.register_post_evidence(target uuid,path text,original_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare p public.posts%rowtype; obj storage.objects%rowtype; eid uuid; size bigint; mime text;
begin
 select * into p from public.posts where id=target for update;
 if p.user_id is distinct from auth.uid() or p.kind not in ('tip','experience') then raise exception 'Evidence owner required';end if;
 if exists(select 1 from public.post_verifications where post_id=target and status='verified') then raise exception 'Verified evidence is immutable';end if;
 if (select count(*) from public.post_evidence where post_id=target)>=5 then raise exception 'Maximum 5 evidence files';end if;
 if (storage.foldername(path))[1]<>auth.uid()::text or (storage.foldername(path))[2]<>target::text then raise exception 'Invalid evidence path';end if;
 select * into obj from storage.objects where bucket_id='post-evidence' and name=path;
 if not found then raise exception 'Uploaded file required';end if;
 size:=(obj.metadata->>'size')::bigint;mime:=obj.metadata->>'mimetype';
 if size is null or size not between 1 and 8388608 or mime is null or mime not in ('application/pdf','image/jpeg','image/png') then raise exception 'Invalid evidence file';end if;
 insert into public.post_evidence(post_id,user_id,storage_path,file_name,mime_type,size_bytes) values(target,p.user_id,path,left(trim(original_name),180),mime,size) returning id into eid;
 insert into public.post_verifications(post_id,status) values(target,'pending') on conflict(post_id) do update set status='pending',verified_at=null;
 return eid;
end $$;
create or replace function public.remove_post_evidence(target uuid) returns void language plpgsql security definer set search_path='' as $$
declare e public.post_evidence%rowtype;
begin
 select * into e from public.post_evidence where id=target;
 if e.user_id is distinct from auth.uid() then raise exception 'Evidence owner required';end if;
 perform 1 from public.posts where id=e.post_id for update;
 if exists(select 1 from public.post_verifications where post_id=e.post_id and status='verified') then raise exception 'Verified evidence is immutable';end if;
 delete from public.post_evidence where id=target;
 if not exists(select 1 from public.post_evidence where post_id=e.post_id) then delete from public.post_verifications where post_id=e.post_id;end if;
end $$;
-- The existing score calculator includes trusted admin:* adjustments. The unique event
-- is added only by this staff RPC, removed on withdrawal, and never duplicated.
create or replace function public.review_post_evidence(target uuid,decision text,internal_note text default '') returns void language plpgsql security definer set search_path='' as $$
declare p public.posts%rowtype; old_status text; changed integer;
begin
 if not public.is_staff() or decision not in ('verified','declined') then raise exception 'Staff decision required';end if;
 select * into p from public.posts where id=target for update;
 if not found or p.user_id=auth.uid() then raise exception 'Independent reviewer required';end if;
 select status into old_status from public.post_verifications where post_id=target;
 if old_status is null then raise exception 'Evidence submission required';end if;
 if decision='verified' and (p.status<>'approved' or p.is_sample or not exists(select 1 from public.post_evidence e join storage.objects o on o.bucket_id='post-evidence' and o.name=e.storage_path where e.post_id=target)) then raise exception 'Published post and evidence required';end if;
 if old_status=decision then return;end if;
 update public.post_verifications set status=decision,verified_at=case when decision='verified' then now() else null end where post_id=target;
 if decision='verified' then
 insert into public.reputation_events(user_id,reference,points) values(p.user_id,'admin:evidence:'||target::text,10) on conflict(reference) do nothing;
 get diagnostics changed=row_count;if changed=1 then update public.profiles set reputation=reputation+10 where id=p.user_id;end if;
 else
 delete from public.reputation_events where reference='admin:evidence:'||target::text;get diagnostics changed=row_count;
 if changed=1 then update public.profiles set reputation=reputation-10 where id=p.user_id;end if;
 end if;
 perform public.refresh_member_progress(p.user_id);
 insert into public.moderation_actions(moderator_id,post_id,decision,note) values(auth.uid(),target,p.status,'Belge inceleme: '||decision||'. '||left(internal_note,2000));
 insert into public.notifications(user_id,post_id,message) values(p.user_id,target,case when decision='verified' then 'Deneyimin belgeyle doğrulandı. +10 doğrulama puanı kazandın. Bu, resmî kural onayı değildir.' else 'Belge incelemesi doğrulama için yeterli bulunmadı. Paylaşımının yayın durumu değişmedi.' end);
end $$;
-- Removing publication also removes verification and its bonus in the same transaction.
create or replace function public.withdraw_evidence_verification() returns trigger language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if (old.status='approved' and new.status<>'approved') or old.body is distinct from new.body or old.title is distinct from new.title or old.country_id is distinct from new.country_id then
  update public.post_verifications set status='pending',verified_at=null where post_id=new.id;
  delete from public.reputation_events where reference='admin:evidence:'||new.id::text;get diagnostics n=row_count;
  if n=1 then update public.profiles set reputation=reputation-10 where id=new.user_id;perform public.refresh_member_progress(new.user_id);end if;
 end if;
 return new;
end $$;
drop trigger if exists evidence_publication_withdrawn on public.posts;
create trigger evidence_publication_withdrawn after update of status,body,title,country_id on public.posts for each row execute function public.withdraw_evidence_verification();
create or replace function public.relocate_critical_tip(target uuid,new_category text) returns void language plpgsql security definer set search_path='' as $$
declare p public.posts%rowtype;
begin
 if not public.is_staff() then raise exception 'Staff required';end if;
 select * into p from public.posts where id=target for update;
 if p.kind is distinct from 'tip' or not exists(select 1 from public.forum_categories where id=new_category) then raise exception 'Valid critical topic required';end if;
 update public.posts set category_id=new_category where id=target;
 insert into public.moderation_actions(moderator_id,post_id,decision,note) values(auth.uid(),target,p.status,'Konu bağlantısı: '||coalesce(p.category_id,'')||' → '||new_category);
end $$;
revoke execute on function public.register_post_evidence,public.remove_post_evidence,public.review_post_evidence,public.relocate_critical_tip,public.withdraw_evidence_verification from public,anon;
grant execute on function public.register_post_evidence,public.remove_post_evidence,public.review_post_evidence,public.relocate_critical_tip to authenticated;

-- Correct the two existing Germany insurance notes explicitly reported by the owner.
-- Do not infer topics from arbitrary user text or overwrite later staff corrections.
update public.posts set category_id='doc-insurance'
where id in ('63cf9771-c5fc-4793-ac68-47effcc007f6','a5997c85-bcbe-48a6-9642-b60e4a5bfec1')
and country_id='germany' and kind='tip' and status='approved'
and category_id in ('documents','sponsor') and trim(title)='sağlık sigortası';

create or replace function public.remove_deleted_post_bonus() returns trigger language plpgsql security definer set search_path='' as $$
declare n integer;begin
 delete from public.reputation_events where reference='admin:evidence:'||old.id::text;get diagnostics n=row_count;
 if n=1 then update public.profiles set reputation=reputation-10 where id=old.user_id;perform public.refresh_member_progress(old.user_id);end if;
 return old;
end $$;
revoke execute on function public.remove_deleted_post_bonus from public,anon,authenticated;
drop trigger if exists evidence_post_deleted on public.posts;
create trigger evidence_post_deleted after delete on public.posts for each row execute function public.remove_deleted_post_bonus();
