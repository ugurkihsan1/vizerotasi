-- Privileged operations are callable only by the authenticated Edge server.
-- Never DELETE storage.objects in SQL: physical files are removed via Storage API.
create table if not exists public.account_deletion_jobs (
 user_id uuid primary key references auth.users on delete cascade,
 started_at timestamptz not null default now()
);
alter table public.account_deletion_jobs enable row level security;
revoke all on public.account_deletion_jobs from public,anon,authenticated;

create or replace function public.account_can_upload() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid())
 and not exists(select 1 from public.account_deletion_jobs where user_id=auth.uid());
$$;
revoke all on function public.account_can_upload() from public,anon;
grant execute on function public.account_can_upload() to authenticated;
drop policy if exists account_active_upload on storage.objects;
create policy account_active_upload on storage.objects as restrictive for insert to authenticated with check(public.account_can_upload());
drop policy if exists account_active_file_update on storage.objects;
create policy account_active_file_update on storage.objects as restrictive for update to authenticated using(public.account_can_upload()) with check(public.account_can_upload());

-- Keep moderation decisions on other people's content, without a deleted staff ID.
do $$ declare item record;begin
 for item in select * from (values
 ('posts','approved_by'),('comments','approved_by'),('document_notes','approved_by'),
 ('moderation_actions','moderator_id'),('member_trust_adjustments','moderator_id'),('document_note_reviews','moderator_id')
 ) as refs(table_name,column_name) loop
  execute format('alter table public.%I alter column %I drop not null',item.table_name,item.column_name);
  execute format('alter table public.%I drop constraint if exists %I',item.table_name,item.table_name||'_'||item.column_name||'_fkey');
  execute format('alter table public.%I add constraint %I foreign key (%I) references public.profiles(id) on delete set null',item.table_name,item.table_name||'_'||item.column_name||'_fkey',item.column_name);
 end loop;
end $$;
alter table public.document_notes drop constraint if exists document_notes_created_by_fkey;
alter table public.document_notes add constraint document_notes_created_by_fkey foreign key(created_by) references public.profiles(id) on delete cascade;

create or replace function public.account_deletion_files(target uuid)
returns table(bucket_id text,object_name text)
language sql stable security definer set search_path='' as $$
 select o.bucket_id,o.name from storage.objects o
 where (o.bucket_id in ('avatars','post-evidence') and split_part(o.name,'/',1)=target::text)
 or (o.bucket_id='chat-media' and split_part(o.name,'/',2)=target::text)
 order by o.bucket_id,o.name limit 1000;
$$;
create or replace function public.begin_account_deletion(target uuid) returns void
language plpgsql security definer set search_path='' as $$ begin
 if target is null or not exists(select 1 from auth.users where id=target) then raise exception 'Account not found';end if;
 insert into public.account_deletion_jobs(user_id) values(target) on conflict(user_id) do nothing;
end $$;
create or replace function public.finish_account_deletion(target uuid) returns void
language plpgsql security definer set search_path='' as $$ begin
 perform 1 from public.account_deletion_jobs where user_id=target for update;
 if not found then raise exception 'Deletion not started';end if;
 if exists(select 1 from public.account_deletion_files(target)) then raise exception 'Account files remain';end if;
 -- Reports can contain copies of a deleted sender's text/photo, not just a FK.
 delete from public.chat_reports where sender_id=target or reporter_id=target;
 update public.chat_rooms set title='' where kind='direct' and id in(select room_id from public.chat_members where user_id=target);
 -- Auth sessions/identities and profile-owned rows follow their existing cascades.
 delete from auth.users where id=target;
end $$;
revoke all on function public.account_deletion_files(uuid),public.begin_account_deletion(uuid),public.finish_account_deletion(uuid) from public,anon,authenticated;
grant execute on function public.account_deletion_files(uuid),public.begin_account_deletion(uuid),public.finish_account_deletion(uuid) to service_role;
notify pgrst,'reload schema';
