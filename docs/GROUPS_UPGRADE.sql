-- Run in Supabase SQL Editor. Requires the base 001 migration. Repeatable.
begin;
-- Approval-based sharing groups, separate from public country posts and chat.
create table if not exists public.sharing_groups (
 id uuid primary key default gen_random_uuid(),name text not null check(length(trim(name)) between 2 and 60),
 description text not null default '' check(length(description)<=500),owner_id uuid references public.profiles on delete set null,
 is_system boolean not null default false,created_at timestamptz not null default now()
);
create table if not exists public.sharing_group_members (
 group_id uuid not null references public.sharing_groups on delete cascade,user_id uuid not null references public.profiles on delete cascade,
 status text not null check(status in ('pending','active','declined','left','removed')),role text not null default 'member' check(role in ('member','manager')),
 created_at timestamptz not null default now(),primary key(group_id,user_id)
);
create index if not exists sharing_members_user on public.sharing_group_members(user_id,status);
create table if not exists public.sharing_group_posts (
 id uuid primary key default gen_random_uuid(),group_id uuid not null references public.sharing_groups on delete cascade,
 user_id uuid not null references public.profiles on delete cascade,body text not null check(length(trim(body)) between 1 and 5000),
 created_at timestamptz not null default now()
);
create index if not exists sharing_posts_time on public.sharing_group_posts(group_id,created_at desc,id desc);
create table if not exists public.sharing_group_comments (
 id uuid primary key default gen_random_uuid(),post_id uuid not null references public.sharing_group_posts on delete cascade,
 user_id uuid not null references public.profiles on delete cascade,body text not null check(length(trim(body)) between 1 and 2000),created_at timestamptz not null default now()
);
create index if not exists sharing_comments_post on public.sharing_group_comments(post_id,created_at,id);
create table if not exists public.sharing_group_likes (
 post_id uuid not null references public.sharing_group_posts on delete cascade,user_id uuid not null references public.profiles on delete cascade,
 primary key(post_id,user_id)
);
alter table public.sharing_groups enable row level security;
alter table public.sharing_group_members enable row level security;
alter table public.sharing_group_posts enable row level security;
alter table public.sharing_group_comments enable row level security;
alter table public.sharing_group_likes enable row level security;
revoke all on public.sharing_groups,public.sharing_group_members,public.sharing_group_posts,public.sharing_group_comments,public.sharing_group_likes from anon,authenticated;
grant select on public.sharing_groups to anon,authenticated;
grant select on public.sharing_group_members,public.sharing_group_posts,public.sharing_group_comments,public.sharing_group_likes to authenticated;
create or replace function public.sharing_is_manager(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.sharing_groups g where g.id=target and (g.owner_id=auth.uid() or (g.is_system and public.is_staff()) or exists(select 1 from public.sharing_group_members m where m.group_id=g.id and m.user_id=auth.uid() and m.status='active' and m.role='manager')))
$$;
create or replace function public.sharing_can_read(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.sharing_is_manager(target) or exists(select 1 from public.sharing_group_members where group_id=target and user_id=auth.uid() and status='active')
$$;
revoke execute on function public.sharing_is_manager,public.sharing_can_read from public,anon;
grant execute on function public.sharing_is_manager,public.sharing_can_read to authenticated;
drop policy if exists sharing_groups_read on public.sharing_groups;
create policy sharing_groups_read on public.sharing_groups for select using(true);
drop policy if exists sharing_members_read on public.sharing_group_members;
create policy sharing_members_read on public.sharing_group_members for select to authenticated using(user_id=auth.uid() or public.sharing_is_manager(group_id));
drop policy if exists sharing_posts_read on public.sharing_group_posts;
create policy sharing_posts_read on public.sharing_group_posts for select to authenticated using(public.sharing_can_read(group_id));
drop policy if exists sharing_comments_read on public.sharing_group_comments;
create policy sharing_comments_read on public.sharing_group_comments for select to authenticated using(exists(select 1 from public.sharing_group_posts p where p.id=post_id and public.sharing_can_read(p.group_id)));
drop policy if exists sharing_likes_read on public.sharing_group_likes;
create policy sharing_likes_read on public.sharing_group_likes for select to authenticated using(exists(select 1 from public.sharing_group_posts p where p.id=post_id and public.sharing_can_read(p.group_id)));
-- One built-in group, never overwrite user edits on reruns.
insert into public.sharing_groups(id,name,description,is_system) values('00000000-0000-0000-0000-00000000e001','Erasmus','Erasmus yolculuğunda kabul mektubu, vize, konaklama ve öğrenci hayatı üzerine yardımlaş.',true) on conflict(id) do nothing;
create or replace function public.sharing_create(group_name text,group_description text default '') returns uuid language plpgsql security definer set search_path='' as $$
declare gid uuid;begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 if length(trim(coalesce(group_name,''))) not between 2 and 60 or length(coalesce(group_description,''))>500 then raise exception 'Invalid group details';end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 if (select count(*) from public.sharing_groups where owner_id=auth.uid() and created_at>now()-interval '1 day')>=5 then raise exception 'Group rate limit';end if;
 insert into public.sharing_groups(name,description,owner_id) values(trim(group_name),trim(coalesce(group_description,'')),auth.uid()) returning id into gid;
 insert into public.sharing_group_members(group_id,user_id,status,role) values(gid,auth.uid(),'active','manager');return gid;
end $$;
create or replace function public.sharing_request(target uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 perform 1 from public.sharing_groups where id=target for update;if not found then raise exception 'Group unavailable';end if;
 if exists(select 1 from public.sharing_group_members where group_id=target and user_id=auth.uid() and status='removed') then raise exception 'Membership unavailable' using errcode='42501';end if;
 insert into public.sharing_group_members(group_id,user_id,status) values(target,auth.uid(),'pending') on conflict(group_id,user_id) do update set status='pending',role='member',created_at=now() where sharing_group_members.status in ('left','declined');
end $$;
create or replace function public.sharing_manage(target uuid,member_id uuid,decision text) returns void language plpgsql security definer set search_path='' as $$
declare g public.sharing_groups; m public.sharing_group_members;owner_power boolean;begin
 select * into g from public.sharing_groups where id=target for update;
 if not found or not public.sharing_is_manager(target) then raise exception 'Manager required' using errcode='42501';end if;
 select * into m from public.sharing_group_members where group_id=target and user_id=member_id;
 if not found or member_id=g.owner_id or member_id=auth.uid() then raise exception 'Member unavailable';end if;
 owner_power:=coalesce(g.owner_id=auth.uid(),false) or (g.is_system and public.is_staff());
 if m.role='manager' and not owner_power then raise exception 'Owner required' using errcode='42501';end if;
 if decision in ('approve','decline') then
  if m.status<>'pending' then raise exception 'Request unavailable';end if;
  update public.sharing_group_members set status=case when decision='approve' then 'active' else 'declined' end where group_id=target and user_id=member_id;
 elsif decision='remove' then update public.sharing_group_members set status='removed',role='member' where group_id=target and user_id=member_id;
 elsif decision='unban' and m.status='removed' then update public.sharing_group_members set status='left',role='member' where group_id=target and user_id=member_id;
 elsif decision in ('manager','member','transfer') then
  if not owner_power or m.status<>'active' then raise exception 'Owner required' using errcode='42501';end if;
  if decision='transfer' then
   if g.is_system then raise exception 'System group cannot transfer';end if;
   update public.sharing_groups set owner_id=member_id where id=target;
  end if;
  update public.sharing_group_members set role=case when decision='member' then 'member' else 'manager' end where group_id=target and user_id=member_id;
 else raise exception 'Invalid decision';end if;
end $$;
create or replace function public.sharing_leave(target uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 perform 1 from public.sharing_groups where id=target for update;
 if exists(select 1 from public.sharing_groups where id=target and owner_id=auth.uid()) then raise exception 'Transfer ownership first';end if;
 update public.sharing_group_members set status='left',role='member' where group_id=target and user_id=auth.uid() and status in ('active','pending');
end $$;
create or replace function public.sharing_publish(target uuid,post_body text,client_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.sharing_groups where id=target for update;
 if not public.sharing_can_read(target) then raise exception 'Membership required' using errcode='42501';end if;
 if exists(select 1 from public.sharing_group_posts where id=client_id and group_id=target and user_id=auth.uid()) then return client_id;end if;
 if length(trim(coalesce(post_body,''))) not between 1 and 5000 then raise exception 'Invalid post';end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 if (select count(*) from public.sharing_group_posts where user_id=auth.uid() and created_at>now()-interval '1 hour')>=30 then raise exception 'Post rate limit';end if;
 insert into public.sharing_group_posts(id,group_id,user_id,body) values(client_id,target,auth.uid(),trim(post_body));return client_id;
end $$;
create or replace function public.sharing_comment(target_post uuid,comment_body text,client_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare gid uuid;begin
 select group_id into gid from public.sharing_group_posts where id=target_post;
 perform 1 from public.sharing_groups where id=gid for update;
 if not public.sharing_can_read(gid) then raise exception 'Membership required' using errcode='42501';end if;
 if exists(select 1 from public.sharing_group_comments where id=client_id and post_id=target_post and user_id=auth.uid()) then return client_id;end if;
 if length(trim(coalesce(comment_body,''))) not between 1 and 2000 then raise exception 'Invalid comment';end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 if (select count(*) from public.sharing_group_comments where user_id=auth.uid() and created_at>now()-interval '1 hour')>=60 then raise exception 'Comment rate limit';end if;
 insert into public.sharing_group_comments(id,post_id,user_id,body) values(client_id,target_post,auth.uid(),trim(comment_body));return client_id;
end $$;
create or replace function public.sharing_like(target_post uuid,liked boolean) returns void language plpgsql security definer set search_path='' as $$
declare gid uuid;begin
 select group_id into gid from public.sharing_group_posts where id=target_post;
 perform 1 from public.sharing_groups where id=gid for update;
 if not public.sharing_can_read(gid) then raise exception 'Membership required' using errcode='42501';end if;
 if liked then insert into public.sharing_group_likes(post_id,user_id) values(target_post,auth.uid()) on conflict do nothing;
 else delete from public.sharing_group_likes where post_id=target_post and user_id=auth.uid();end if;
end $$;
create or replace function public.sharing_delete(target uuid,is_comment boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare gid uuid;author uuid;begin
 if is_comment then select p.group_id,c.user_id into gid,author from public.sharing_group_comments c join public.sharing_group_posts p on p.id=c.post_id where c.id=target;
 else select group_id,user_id into gid,author from public.sharing_group_posts where id=target;end if;
 perform 1 from public.sharing_groups where id=gid for update;
 if not public.sharing_can_read(gid) or not (author=auth.uid() or public.sharing_is_manager(gid)) then raise exception 'Removal unavailable' using errcode='42501';end if;
 if is_comment then delete from public.sharing_group_comments where id=target;else delete from public.sharing_group_posts where id=target;end if;
end $$;
create or replace function public.sharing_directory(target_group uuid default null) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(x order by x.is_system desc,x.created_at desc,x.id),'[]'::jsonb) from (
 select g.*,m.status as my_status,coalesce(public.sharing_is_manager(g.id),false) as is_manager,
 (select count(*) from public.sharing_group_members a where a.group_id=g.id and a.status='active') as member_count,
 case when public.sharing_is_manager(g.id) then (select count(*) from public.sharing_group_members a where a.group_id=g.id and a.status='pending') else 0 end as request_count
 from public.sharing_groups g left join public.sharing_group_members m on m.group_id=g.id and m.user_id=auth.uid()
 where target_group is null or g.id=target_group
 order by g.is_system desc,g.created_at desc,g.id limit 200) x
$$;
create or replace function public.sharing_feed(target uuid,page_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;begin
 if not public.sharing_can_read(target) then raise exception 'Membership required' using errcode='42501';end if;
 select coalesce(jsonb_agg(x order by x.created_at desc,x.id desc),'[]'::jsonb) into result from (
 select p.*,jsonb_build_object('display_name',u.display_name,'username',u.username,'avatar_url',u.avatar_url) as author,
 (select count(*) from public.sharing_group_likes l where l.post_id=p.id) as like_count,
 exists(select 1 from public.sharing_group_likes l where l.post_id=p.id and l.user_id=auth.uid()) as liked,
 (select count(*) from public.sharing_group_comments c where c.post_id=p.id) as comment_count
 from public.sharing_group_posts p join public.profiles u on u.id=p.user_id where p.group_id=target order by p.created_at desc,p.id desc limit 20 offset greatest(0,least(coalesce(page_offset,0),10000))) x;
 return result;
end $$;
-- Explicit grants only; discovery is public, membership and content mutations require login.
revoke execute on function public.sharing_create,public.sharing_request,public.sharing_manage,public.sharing_leave,public.sharing_publish,public.sharing_comment,public.sharing_like,public.sharing_delete,public.sharing_feed,public.sharing_directory from public,anon;
grant execute on function public.sharing_create,public.sharing_request,public.sharing_manage,public.sharing_leave,public.sharing_publish,public.sharing_comment,public.sharing_like,public.sharing_delete,public.sharing_feed,public.sharing_directory to authenticated;
grant execute on function public.sharing_directory to anon;
notify pgrst,'reload schema';

commit;
