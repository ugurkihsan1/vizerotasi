-- Social profiles, recipient-scoped post sharing and private direct-chat images.
alter table public.profiles add column if not exists is_private boolean not null default false;
grant update(is_private) on public.profiles to authenticated;
create table if not exists public.user_follows(
 follower_id uuid not null references public.profiles on delete cascade,
 following_id uuid not null references public.profiles on delete cascade,
 status text not null check(status in ('pending','accepted')),created_at timestamptz not null default now(),
 primary key(follower_id,following_id),check(follower_id<>following_id)
);
create index if not exists user_follows_target on public.user_follows(following_id,status,follower_id);
alter table public.user_follows enable row level security;
revoke all on public.user_follows from anon,authenticated;
grant select on public.user_follows to authenticated;
create or replace function public.can_view_profile(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where p.id=target and
 (p.id=auth.uid() or ((auth.uid() is null or not public.chat_pair_blocked(auth.uid(),target)) and
 (not p.is_private or exists(select 1 from public.user_follows f where f.follower_id=auth.uid() and f.following_id=target and f.status='accepted')))))
$$;
revoke execute on function public.can_view_profile from public;
grant execute on function public.can_view_profile to anon,authenticated;
create or replace function public.social_blocked(target uuid) returns boolean language sql stable security definer set search_path='' as $$select auth.uid() is not null and public.chat_pair_blocked(auth.uid(),target)$$;
revoke execute on function public.social_blocked from public,anon;
grant execute on function public.social_blocked to authenticated;
drop policy if exists social_follows_read on public.user_follows;
create policy social_follows_read on public.user_follows for select to authenticated using(
 (follower_id=auth.uid() or following_id=auth.uid() or (status='accepted' and public.can_view_profile(following_id)))
 and not public.social_blocked(follower_id) and not public.social_blocked(following_id));
drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts for select using(user_id=auth.uid() or public.is_staff() or (status='approved' and public.can_view_profile(user_id)));
create or replace function public.social_profile(target uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('is_private',p.is_private,'can_view',public.can_view_profile(p.id),
 'followers',(select count(*) from public.user_follows f where f.following_id=p.id and f.status='accepted' and not public.chat_pair_blocked(f.follower_id,f.following_id)),
 'following',(select count(*) from public.user_follows f where f.follower_id=p.id and f.status='accepted' and not public.chat_pair_blocked(f.follower_id,f.following_id)),
 'relationship',(select f.status from public.user_follows f where f.follower_id=auth.uid() and f.following_id=p.id and not public.chat_pair_blocked(f.follower_id,f.following_id)))
 from public.profiles p where p.id=target
$$;
revoke execute on function public.social_profile from public;
grant execute on function public.social_profile to anon,authenticated;
create or replace function public.social_follow(target uuid,action text default 'follow') returns void language plpgsql security definer set search_path='' as $$
declare private_target boolean;begin
 if auth.uid() is null or target=auth.uid() then raise exception 'Different authenticated user required' using errcode='42501';end if;
 perform 1 from public.profiles where id in (auth.uid(),target) order by id for update;
 if public.chat_pair_blocked(auth.uid(),target) and action not in ('unfollow','remove','reject') then raise exception 'Unavailable' using errcode='42501';end if;
 select is_private into private_target from public.profiles where id=target;
 if not found then raise exception 'User unavailable';end if;
 if action='follow' then
  if (select count(*) from public.user_follows where follower_id=auth.uid() and created_at>now()-interval '1 hour')>=60 then raise exception 'Follow rate limit';end if;
  insert into public.user_follows values(auth.uid(),target,case when private_target then 'pending' else 'accepted' end,now()) on conflict do nothing;
 elsif action='unfollow' then delete from public.user_follows where follower_id=auth.uid() and following_id=target;
 elsif action='accept' then update public.user_follows set status='accepted' where follower_id=target and following_id=auth.uid() and status='pending';
 elsif action in ('reject','remove') then delete from public.user_follows where follower_id=target and following_id=auth.uid();
 else raise exception 'Invalid follow action';end if;
end $$;
revoke execute on function public.social_follow from public,anon;
grant execute on function public.social_follow to authenticated;
create or replace function public.social_open_profile() returns trigger language plpgsql security definer set search_path='' as $$begin
 if old.is_private and not new.is_private then update public.user_follows set status='accepted' where following_id=new.id and status='pending';end if;return new;end $$;
drop trigger if exists social_open_profile on public.profiles;
create trigger social_open_profile after update of is_private on public.profiles for each row execute function public.social_open_profile();
create or replace function public.social_remove_blocked_follows() returns trigger language plpgsql security definer set search_path='' as $$begin
 delete from public.user_follows where (follower_id=new.blocker_id and following_id=new.blocked_id) or (follower_id=new.blocked_id and following_id=new.blocker_id);return new;end $$;
drop trigger if exists social_remove_blocked_follows on public.chat_blocks;
create trigger social_remove_blocked_follows after insert on public.chat_blocks for each row execute function public.social_remove_blocked_follows();
-- Recent useful content is ranked over the full eligible set before pagination.
create or replace function public.discover_posts(page_size integer default 15,page_offset integer default 0) returns setof public.feed language sql stable security invoker set search_path='' as $$
 select f.* from public.feed f where f.status='approved' and f.created_at>=now()-interval '30 days' and not f.is_sample
 order by (ln(1+greatest(f.helpful_count,0))*8+ln(1+greatest(f.comment_count,0)))/power(1+greatest(extract(epoch from now()-f.created_at)/86400,0)/3,1.3) desc,f.created_at desc,f.id desc
 limit least(greatest(page_size,1),30) offset greatest(page_offset,0)
$$;
revoke execute on function public.discover_posts from public;
grant execute on function public.discover_posts to anon,authenticated;
alter table public.chat_messages add column if not exists shared_post_id uuid references public.posts on delete set null;
alter table public.chat_messages add column if not exists image_path text;
alter table public.chat_reports add column if not exists image_path_snapshot text;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('chat-media','chat-media',false,5242880,array['image/jpeg','image/png']) on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;
create or replace function public.chat_can_upload_photo(path text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.chat_rooms r where r.id::text=split_part(path,'/',1) and r.kind='direct' and r.closed_at is null and public.chat_can_read(r.id)
 and split_part(path,'/',2)=auth.uid()::text and path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png)$'
 and exists(select 1 from public.chat_members m where m.room_id=r.id and m.user_id<>auth.uid() and m.status='active' and not public.chat_pair_blocked(auth.uid(),m.user_id))
 and (select count(*) from storage.objects o where o.bucket_id='chat-media' and split_part(o.name,'/',2)=auth.uid()::text and not exists(select 1 from public.chat_messages msg where msg.image_path=o.name))<5)
$$;
revoke execute on function public.chat_can_upload_photo from public,anon;
grant execute on function public.chat_can_upload_photo to authenticated;
drop policy if exists chat_media_upload on storage.objects;
create policy chat_media_upload on storage.objects for insert to authenticated with check(bucket_id='chat-media' and public.chat_can_upload_photo(name));
create or replace function public.chat_media_can_cleanup(path text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and split_part(path,'/',2)=auth.uid()::text and not exists(select 1 from public.chat_messages m where m.image_path=path and m.hidden_at is null) and not exists(select 1 from public.chat_reports r where r.image_path_snapshot=path and r.resolved_at is null)
$$;
revoke execute on function public.chat_media_can_cleanup from public,anon;
grant execute on function public.chat_media_can_cleanup to authenticated;
drop policy if exists chat_media_read on storage.objects;
create policy chat_media_read on storage.objects for select to authenticated using(bucket_id='chat-media' and (
 exists(select 1 from public.chat_messages m where m.image_path=name and m.hidden_at is null and public.chat_can_read(m.room_id) and not exists(select 1 from public.chat_members p where p.room_id=m.room_id and p.user_id<>auth.uid() and public.social_blocked(p.user_id)))
 or exists(select 1 from public.chat_reports r where r.image_path_snapshot=name and r.resolved_at is null and public.is_staff() and r.sender_id<>auth.uid())
 or public.chat_media_can_cleanup(name)
));
drop policy if exists chat_media_cleanup on storage.objects;
create policy chat_media_cleanup on storage.objects for delete to authenticated using(bucket_id='chat-media' and public.chat_media_can_cleanup(name));
create or replace function public.chat_send_attachment(target uuid,client_id uuid,shared_post uuid default null,photo_path text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.chat_rooms%rowtype;p public.posts%rowtype;obj storage.objects%rowtype;m public.chat_messages%rowtype;mid uuid;begin
 if auth.uid() is null or (shared_post is null)=(photo_path is null) then raise exception 'One attachment required' using errcode='42501';end if;
 select * into r from public.chat_rooms where id=target for update;
 if not public.chat_can_read(target) or r.closed_at is not null then raise exception 'Active room required' using errcode='42501';end if;
 if exists(select 1 from public.chat_members peer where peer.room_id=target and (peer.status='invited' or (peer.status='active' and peer.user_id<>auth.uid() and public.chat_pair_blocked(auth.uid(),peer.user_id)))) then raise exception 'Accepted unblocked conversation required' using errcode='42501';end if;
 select * into m from public.chat_messages where id=client_id;
 if found then
  if m.sender_id<>auth.uid() or m.room_id<>target or m.hidden_at is not null or m.shared_post_id is distinct from shared_post or m.image_path is distinct from photo_path then raise exception 'Invalid attachment retry' using errcode='42501';end if;return m.id;
 end if;
 if shared_post is not null then
  select * into p from public.posts where id=shared_post and status='approved';
  if not found or not public.can_view_profile(p.user_id) then raise exception 'Post unavailable' using errcode='42501';end if;
  -- No private post snapshots are copied into chat: every active recipient must already have access.
  if exists(select 1 from public.chat_members peer join public.profiles a on a.id=p.user_id where peer.room_id=target and peer.status='active' and peer.user_id<>a.id and (public.chat_pair_blocked(peer.user_id,a.id) or (a.is_private and not exists(select 1 from public.user_follows f where f.follower_id=peer.user_id and f.following_id=a.id and f.status='accepted')))) then raise exception 'Recipient cannot view private post' using errcode='42501';end if;
 else
  if r.kind<>'direct' or split_part(photo_path,'/',1)<>target::text or split_part(photo_path,'/',2)<>auth.uid()::text then raise exception 'Private photo access required' using errcode='42501';end if;
  select * into obj from storage.objects where bucket_id='chat-media' and name=photo_path;
  if not found or coalesce((obj.metadata->>'size')::bigint,0) not between 1 and 5242880 or coalesce(obj.metadata->>'mimetype','') not in ('image/jpeg','image/png') then raise exception 'Invalid photo';end if;
  if exists(select 1 from public.chat_messages where image_path=photo_path) then raise exception 'Photo already sent';end if;
 end if;
 mid:=public.chat_send(target,case when shared_post is not null then 'Paylaşım' else 'Fotoğraf' end,client_id);
 update public.chat_messages set shared_post_id=shared_post,image_path=photo_path where id=mid;
 return mid;
end $$;
revoke execute on function public.chat_send_attachment from public,anon;
grant execute on function public.chat_send_attachment to authenticated;
create or replace function public.chat_report_message(target uuid,report_reason text) returns void language plpgsql security definer set search_path='' as $$
declare m public.chat_messages%rowtype;begin
 select * into m from public.chat_messages where id=target;
 if not public.chat_can_read(m.room_id) or m.sender_id=auth.uid() or m.hidden_at is not null then raise exception 'Message access required' using errcode='42501';end if;
 if length(trim(report_reason)) not between 2 and 500 then raise exception 'Report reason required';end if;
 insert into public.chat_reports(message_id,reporter_id,sender_id,body_snapshot,reason,image_path_snapshot) values(target,auth.uid(),m.sender_id,m.body,trim(report_reason),m.image_path) on conflict(message_id,reporter_id) do nothing;
end $$;
notify pgrst,'reload schema';
