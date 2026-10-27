-- Supabase SQL Editor: run this entire repeatable file after the base community schema.
begin;
-- Followed-country rooms and consent-based private messaging. No staff bypass of private history.
create table if not exists public.chat_rooms(
 id uuid primary key default gen_random_uuid(),kind text not null check(kind in ('community','direct','group')),
 country_id text references public.countries on delete cascade,direct_key text unique,
 started_by uuid references public.profiles on delete set null,
 title text not null default '' check(length(title)<=80),created_by uuid references public.profiles on delete set null,
 created_at timestamptz not null default now(),closed_at timestamptz,
 check((kind='community')=(country_id is not null)),check((kind='direct')=(direct_key is not null))
);
create unique index if not exists chat_community_unique on public.chat_rooms(country_id) where kind='community';
create table if not exists public.chat_members(
 room_id uuid not null references public.chat_rooms on delete cascade,user_id uuid not null references public.profiles on delete cascade,
 status text not null check(status in ('active','invited','declined','left')),invited_by uuid references public.profiles on delete set null,
 joined_at timestamptz not null default now(),last_read_at timestamptz not null default now(),primary key(room_id,user_id)
);
create index if not exists chat_members_user on public.chat_members(user_id,status,room_id);
create table if not exists public.chat_messages(
 id uuid primary key default gen_random_uuid(),room_id uuid not null references public.chat_rooms on delete cascade,
 sender_id uuid not null references public.profiles on delete cascade,body text not null check(length(body)<=2000),
 created_at timestamptz not null default now(),hidden_at timestamptz,check(length(trim(body))>0 or hidden_at is not null)
);
create index if not exists chat_messages_room_time on public.chat_messages(room_id,created_at desc,id desc);
create index if not exists chat_messages_sender_time on public.chat_messages(sender_id,created_at desc);
create table if not exists public.chat_blocks(
 blocker_id uuid not null references public.profiles on delete cascade,blocked_id uuid not null references public.profiles on delete cascade,
 created_at timestamptz not null default now(),primary key(blocker_id,blocked_id),check(blocker_id<>blocked_id)
);
create table if not exists public.chat_reports(
 id uuid primary key default gen_random_uuid(),message_id uuid references public.chat_messages on delete set null,
 reporter_id uuid not null references public.profiles on delete cascade,sender_id uuid references public.profiles on delete set null,
 body_snapshot text not null,reason text not null check(length(reason) between 2 and 500),created_at timestamptz not null default now(),
 resolved_at timestamptz,reviewed_by uuid references public.profiles on delete set null,unique(message_id,reporter_id)
);
alter table public.chat_rooms enable row level security;
alter table public.chat_members enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_blocks enable row level security;
alter table public.chat_reports enable row level security;
revoke all on public.chat_rooms,public.chat_members,public.chat_messages,public.chat_blocks,public.chat_reports from anon,authenticated;
grant select on public.chat_rooms,public.chat_members,public.chat_messages,public.chat_blocks,public.chat_reports to authenticated;
create or replace function public.chat_can_read(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.chat_members m join public.chat_rooms r on r.id=m.room_id where r.id=target and m.user_id=auth.uid() and m.status='active' and (r.kind<>'community' or exists(select 1 from public.followed_countries f where f.user_id=auth.uid() and f.country_id=r.country_id)))
$$;
create or replace function public.chat_can_see(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.chat_can_read(target) or exists(select 1 from public.chat_members m join public.chat_rooms r on r.id=m.room_id where m.room_id=target and m.user_id=auth.uid() and m.status='invited' and r.closed_at is null and r.kind<>'community')
$$;
create or replace function public.chat_pair_blocked(a uuid,b uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.chat_blocks where (blocker_id=a and blocked_id=b) or (blocker_id=b and blocked_id=a))
$$;
revoke execute on function public.chat_pair_blocked from public,anon,authenticated;
revoke execute on function public.chat_can_read,public.chat_can_see from public,anon;
grant execute on function public.chat_can_read,public.chat_can_see to authenticated;
drop policy if exists chat_rooms_read on public.chat_rooms;
create policy chat_rooms_read on public.chat_rooms for select to authenticated using(public.chat_can_see(id));
drop policy if exists chat_members_read on public.chat_members;
create policy chat_members_read on public.chat_members for select to authenticated using((user_id=auth.uid() and public.chat_can_see(room_id)) or public.chat_can_read(room_id));
drop policy if exists chat_messages_read on public.chat_messages;
create policy chat_messages_read on public.chat_messages for select to authenticated using(public.chat_can_read(room_id));
drop policy if exists chat_blocks_read on public.chat_blocks;
create policy chat_blocks_read on public.chat_blocks for select to authenticated using(blocker_id=auth.uid());
drop policy if exists chat_reports_read on public.chat_reports;
create policy chat_reports_read on public.chat_reports for select to authenticated using(reporter_id=auth.uid() or public.is_staff());
create or replace function public.chat_open_community(target_country text,follow_country boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid;begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 if not exists(select 1 from public.countries where id=target_country) then raise exception 'Country unavailable';end if;
 if follow_country then insert into public.followed_countries(user_id,country_id) values(auth.uid(),target_country) on conflict do nothing;end if;
 if not exists(select 1 from public.followed_countries where user_id=auth.uid() and country_id=target_country) then raise exception 'Follow country required' using errcode='42501';end if;
 insert into public.chat_rooms(kind,country_id,title) select 'community',id,name||' topluluğu' from public.countries where id=target_country on conflict(country_id) where kind='community' do nothing;
 select id into rid from public.chat_rooms where country_id=target_country and kind='community';
 insert into public.chat_members(room_id,user_id,status) values(rid,auth.uid(),'active') on conflict(room_id,user_id) do update set status='active';
 return rid;
end $$;
create or replace function public.chat_create_private(recipients uuid[],room_title text default '') returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid;ids uuid[];peer uuid;key text;begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 if coalesce(cardinality(recipients),0) not between 1 and 9 then raise exception 'Choose 1 to 9 people';end if;
 select array_agg(distinct x order by x) into ids from unnest(recipients) x where x is not null and x<>auth.uid();
 if coalesce(cardinality(ids),0) not between 1 and 9 then raise exception 'Choose 1 to 9 people';end if;
 if exists(select 1 from unnest(ids) x where not exists(select 1 from public.profiles where id=x) or public.chat_pair_blocked(auth.uid(),x)) then raise exception 'Conversation unavailable' using errcode='42501';end if;
 if cardinality(ids)=1 then
  peer:=ids[1];key:=least(auth.uid()::text,peer::text)||':'||greatest(auth.uid()::text,peer::text);
  select id into rid from public.chat_rooms where direct_key=key;
  if rid is not null then
   update public.chat_members set status='active' where room_id=rid and user_id=auth.uid() and status in ('declined','left');
   return rid;
  end if;
 elsif length(trim(room_title)) not between 2 and 80 then raise exception 'Group title required';end if;
 -- Serialize per-creator room limits as well as double-tap creation attempts.
 perform 1 from public.profiles where id=auth.uid() for update;
 if (select count(*) from public.chat_rooms where started_by=auth.uid() and created_at>now()-interval '1 hour')>=10 then raise exception 'Room creation rate limit';end if;
 if cardinality(ids)=1 then
  insert into public.chat_rooms(kind,direct_key,created_by,started_by) values('direct',key,auth.uid(),auth.uid()) on conflict(direct_key) do nothing returning id into rid;
  if rid is null then select id into rid from public.chat_rooms where direct_key=key;return rid;end if;
 else insert into public.chat_rooms(kind,title,created_by,started_by) values('group',trim(room_title),auth.uid(),auth.uid()) returning id into rid;end if;
 insert into public.chat_members(room_id,user_id,status,invited_by) values(rid,auth.uid(),'active',auth.uid());
 insert into public.chat_members(room_id,user_id,status,invited_by,last_read_at) select rid,x,'invited',auth.uid(),'1970-01-01'::timestamptz from unnest(ids) x;
 return rid;
end $$;
create or replace function public.chat_answer_invite(target uuid,accept_invite boolean) returns void language plpgsql security definer set search_path='' as $$
declare r public.chat_rooms%rowtype;m public.chat_members%rowtype;begin
 select * into r from public.chat_rooms where id=target for update;
 select * into m from public.chat_members where room_id=target and user_id=auth.uid();
 if m.status is distinct from 'invited' or r.closed_at is not null then raise exception 'Invitation required' using errcode='42501';end if;
 if accept_invite and (m.invited_by is null or public.chat_pair_blocked(auth.uid(),m.invited_by)) then raise exception 'Conversation unavailable' using errcode='42501';end if;
 update public.chat_members set status=case when accept_invite then 'active' else 'declined' end,joined_at=now() where room_id=target and user_id=auth.uid();
end $$;
create or replace function public.chat_send(target uuid,message_body text,client_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.chat_rooms%rowtype;existing public.chat_messages%rowtype;peer public.chat_members%rowtype;begin
 select * into r from public.chat_rooms where id=target for update;
 if not public.chat_can_read(target) then raise exception 'Room membership required' using errcode='42501';end if;
 if r.closed_at is not null then raise exception 'Room closed';end if;
 if client_id is null or length(trim(message_body)) not between 1 and 2000 then raise exception 'Message must contain 1 to 2000 characters';end if;
 select * into existing from public.chat_messages where id=client_id;
 if found then if existing.sender_id=auth.uid() and existing.room_id=target then return existing.id;else raise exception 'Invalid message id';end if;end if;
 if r.kind='direct' then
  select * into peer from public.chat_members where room_id=target and user_id<>auth.uid();
  if peer.status is null or peer.status not in ('active','invited') or public.chat_pair_blocked(auth.uid(),peer.user_id) then raise exception 'Conversation unavailable' using errcode='42501';end if;
  if peer.status='invited' and (select count(*) from public.chat_messages where room_id=target and sender_id=auth.uid())>=3 then raise exception 'Wait for invitation acceptance';end if;
 end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 if (select count(*) from public.chat_messages where sender_id=auth.uid() and created_at>now()-interval '1 minute')>=60 then raise exception 'Message rate limit';end if;
 insert into public.chat_messages(id,room_id,sender_id,body) values(client_id,target,auth.uid(),trim(message_body));
 return client_id;
end $$;
create or replace function public.chat_mark_read(target uuid) returns void language plpgsql security definer set search_path='' as $$
begin if not public.chat_can_read(target) then raise exception 'Room membership required' using errcode='42501';end if;
 if exists(select 1 from public.chat_rooms r join public.chat_members peer on peer.room_id=r.id and peer.user_id<>auth.uid() where r.id=target and r.kind='direct' and public.chat_pair_blocked(auth.uid(),peer.user_id)) then return;end if;
 update public.chat_members m set last_read_at=now() where room_id=target and user_id=auth.uid() and exists(select 1 from public.chat_messages msg where msg.room_id=target and msg.sender_id<>auth.uid() and msg.hidden_at is null and msg.created_at>m.last_read_at);end $$;
create or replace function public.chat_invite_members(target uuid,recipients uuid[]) returns void language plpgsql security definer set search_path='' as $$
declare r public.chat_rooms%rowtype;ids uuid[];begin
 select * into r from public.chat_rooms where id=target for update;
 if r.kind is distinct from 'group' or r.created_by is distinct from auth.uid() or not public.chat_can_read(target) or r.closed_at is not null then raise exception 'Group owner required' using errcode='42501';end if;
 if coalesce(cardinality(recipients),0) not between 1 and 9 then raise exception 'Choose 1 to 9 people';end if;
 select array_agg(distinct x) into ids from unnest(recipients) x where x is not null and x<>auth.uid() and not exists(select 1 from public.chat_members m where m.room_id=target and m.user_id=x and m.status in ('active','invited'));
 if coalesce(cardinality(ids),0)=0 then return;end if;
 if cardinality(ids)>9 or (select count(*) from public.chat_members where room_id=target and status in ('active','invited'))+cardinality(ids)>10 then raise exception 'Maximum 10 room members';end if;
 if exists(select 1 from unnest(ids) x where not exists(select 1 from public.profiles where id=x) or public.chat_pair_blocked(auth.uid(),x) or exists(select 1 from public.chat_members where room_id=target and user_id=x and status='declined')) then raise exception 'Invitation unavailable' using errcode='42501';end if;
 insert into public.chat_members(room_id,user_id,status,invited_by,last_read_at) select target,x,'invited',auth.uid(),'1970-01-01'::timestamptz from unnest(ids) x on conflict(room_id,user_id) do update set status='invited',invited_by=auth.uid(),joined_at=now(),last_read_at='1970-01-01'::timestamptz;
end $$;
create or replace function public.chat_leave(target uuid,remove_user uuid default null) returns void language plpgsql security definer set search_path='' as $$
declare r public.chat_rooms%rowtype;who uuid:=coalesce(remove_user,auth.uid());successor uuid;begin
 select * into r from public.chat_rooms where id=target for update;
 if r.kind is distinct from 'group' or not public.chat_can_read(target) then raise exception 'Group membership required' using errcode='42501';end if;
 if who<>auth.uid() and (r.created_by is distinct from auth.uid() or who=r.created_by) then raise exception 'Group owner required' using errcode='42501';end if;
 update public.chat_members set status='left' where room_id=target and user_id=who;
 if who=r.created_by then
  select user_id into successor from public.chat_members where room_id=target and status='active' order by joined_at,user_id limit 1;
  if successor is null then update public.chat_rooms set closed_at=now() where id=target;update public.chat_members set status='declined' where room_id=target and status='invited';
  else update public.chat_rooms set created_by=successor where id=target;end if;
 end if;
end $$;
create or replace function public.chat_close_group(target uuid) returns void language plpgsql security definer set search_path='' as $$
declare r public.chat_rooms%rowtype;begin
 select * into r from public.chat_rooms where id=target for update;
 if not public.chat_can_read(target) or r.kind is distinct from 'group' or r.created_by is distinct from auth.uid() then raise exception 'Group owner required' using errcode='42501';end if;
 update public.chat_rooms set closed_at=now() where id=target;
 update public.chat_members set status='declined' where room_id=target and status='invited';
end $$;
create or replace function public.chat_block_user(target_user uuid,block_user boolean default true) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or target_user=auth.uid() or not exists(select 1 from public.profiles where id=target_user) then raise exception 'Valid user required';end if;
 if block_user then
  insert into public.chat_blocks(blocker_id,blocked_id) values(auth.uid(),target_user) on conflict do nothing;
  update public.chat_members set status='declined' where user_id=auth.uid() and invited_by=target_user and status='invited';
 else delete from public.chat_blocks where blocker_id=auth.uid() and blocked_id=target_user;end if;
end $$;
create or replace function public.chat_hide_message(target uuid) returns void language plpgsql security definer set search_path='' as $$
declare m public.chat_messages%rowtype;begin
 select * into m from public.chat_messages where id=target for update;
 if not public.chat_can_read(m.room_id) or (m.sender_id<>auth.uid() and not (public.is_staff() and exists(select 1 from public.chat_rooms where id=m.room_id and kind='community'))) then raise exception 'Message access required' using errcode='42501';end if;
 update public.chat_messages set body='',hidden_at=now() where id=target;
end $$;
create or replace function public.chat_report_message(target uuid,report_reason text) returns void language plpgsql security definer set search_path='' as $$
declare m public.chat_messages%rowtype;begin
 select * into m from public.chat_messages where id=target;
 if not public.chat_can_read(m.room_id) or m.sender_id=auth.uid() or m.hidden_at is not null then raise exception 'Message access required' using errcode='42501';end if;
 if length(trim(report_reason)) not between 2 and 500 then raise exception 'Report reason required';end if;
 insert into public.chat_reports(message_id,reporter_id,sender_id,body_snapshot,reason) values(target,auth.uid(),m.sender_id,m.body,trim(report_reason)) on conflict(message_id,reporter_id) do nothing;
end $$;
create or replace function public.chat_review_report(target uuid,hide_message boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare r public.chat_reports%rowtype;begin
 if not public.is_staff() then raise exception 'Staff required' using errcode='42501';end if;
 select * into r from public.chat_reports where id=target for update;
 if not found or r.sender_id=auth.uid() then raise exception 'Independent reviewer required';end if;
 if r.resolved_at is not null then return;end if;
 if hide_message then update public.chat_messages set body='',hidden_at=now() where id=r.message_id;end if;
 update public.chat_reports set resolved_at=now(),reviewed_by=auth.uid() where id=target;
end $$;
create or replace function public.chat_inbox(page_size integer default 30,page_offset integer default 0) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (
 select r.id,r.kind,r.country_id,r.created_by,r.closed_at,m.status,
 case when r.kind='direct' then coalesce((select p.display_name||' · @'||p.username from public.chat_members other join public.profiles p on p.id=other.user_id where other.room_id=r.id and other.user_id<>auth.uid() limit 1),'Özel sohbet') else r.title end as title,
 coalesce(last_msg.created_at,r.created_at) as last_at,
 case when m.status='invited' then null else last_msg.body end as last_body,
 case when m.status='active' and r.closed_at is null and (r.kind<>'direct' or not exists(select 1 from public.chat_members peer where peer.room_id=r.id and peer.user_id<>auth.uid() and public.chat_pair_blocked(auth.uid(),peer.user_id))) then (select count(*) from public.chat_messages msg where msg.room_id=r.id and msg.sender_id<>auth.uid() and msg.created_at>m.last_read_at and msg.hidden_at is null) else 0 end as unread_count
 from public.chat_rooms r join public.chat_members m on m.room_id=r.id and m.user_id=auth.uid()
 left join lateral(select msg.body,msg.created_at from public.chat_messages msg where msg.room_id=r.id and m.status='active' order by msg.created_at desc,msg.id desc limit 1) last_msg on true
 where public.chat_can_see(r.id)
 order by (m.status='invited') desc,coalesce(last_msg.created_at,r.created_at) desc,r.id
 limit greatest(1,least(page_size,50)) offset greatest(0,least(page_offset,10000))
 ) x
$$;
create or replace function public.chat_unread_count() returns bigint language sql stable security definer set search_path='' as $$
 select (select count(*) from public.chat_members pending where pending.user_id=auth.uid() and pending.status='invited' and public.chat_can_see(pending.room_id)) + count(*) from public.chat_messages msg join public.chat_members m on m.room_id=msg.room_id and m.user_id=auth.uid() join public.chat_rooms r on r.id=m.room_id
 where m.status='active' and r.closed_at is null and public.chat_can_read(r.id) and (r.kind<>'direct' or not exists(select 1 from public.chat_members peer where peer.room_id=r.id and peer.user_id<>auth.uid() and public.chat_pair_blocked(auth.uid(),peer.user_id))) and msg.sender_id<>auth.uid() and msg.hidden_at is null and msg.created_at>m.last_read_at
$$;
-- Private history is never returned by staff privileges. Only the explicitly reported
-- message snapshot is shared with moderation via chat_reports.
revoke execute on function public.chat_open_community,public.chat_create_private,public.chat_answer_invite,public.chat_send,public.chat_mark_read,public.chat_invite_members,public.chat_leave,public.chat_close_group,public.chat_block_user,public.chat_hide_message,public.chat_report_message,public.chat_review_report,public.chat_inbox,public.chat_unread_count from public,anon;
grant execute on function public.chat_open_community,public.chat_create_private,public.chat_answer_invite,public.chat_send,public.chat_mark_read,public.chat_invite_members,public.chat_leave,public.chat_close_group,public.chat_block_user,public.chat_hide_message,public.chat_report_message,public.chat_review_report,public.chat_inbox,public.chat_unread_count to authenticated;
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime' and not puballtables) and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='chat_messages') then
  alter publication supabase_realtime add table public.chat_messages;
 end if;
end $$;
notify pgrst,'reload schema';

commit;
