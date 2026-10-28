begin;
alter table public.notifications add column if not exists actor_id uuid references public.profiles(id) on delete cascade;
alter table public.notifications add column if not exists kind text not null default 'activity' check(kind in ('activity','follow'));
alter table public.notification_preferences add column if not exists follows boolean not null default true;
grant update(follows) on public.notification_preferences to authenticated;
create unique index if not exists notifications_follow_pair_idx on public.notifications(user_id,actor_id) where kind='follow';
create or replace function public.notify_user_follow() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status<>'accepted' or (TG_OP='UPDATE' and old.status='accepted') then return new;end if;
 if new.follower_id=new.following_id or public.chat_pair_blocked(new.follower_id,new.following_id) then return new;end if;
 if not coalesce((select follows from public.notification_preferences where user_id=new.following_id),true) then return new;end if;
 insert into public.notifications(user_id,actor_id,kind,message)
 select new.following_id,new.follower_id,'follow',p.display_name||' seni takip etmeye başladı.'
 from public.profiles p where p.id=new.follower_id
 on conflict(user_id,actor_id) where kind='follow' do nothing;
 return new;
end $$;
revoke all on function public.notify_user_follow() from public,anon,authenticated;
drop trigger if exists notify_user_follow on public.user_follows;
create trigger notify_user_follow after insert or update of status on public.user_follows for each row execute function public.notify_user_follow();
create or replace function public.remove_user_follow_notice() returns trigger language plpgsql security definer set search_path='' as $$
begin delete from public.notifications where kind='follow' and user_id=old.following_id and actor_id=old.follower_id;return old;end $$;
revoke all on function public.remove_user_follow_notice() from public,anon,authenticated;
drop trigger if exists remove_user_follow_notice on public.user_follows;
create trigger remove_user_follow_notice after delete on public.user_follows for each row execute function public.remove_user_follow_notice();
-- Restore only recent, still-active follows; preserve their original timestamps.
insert into public.notifications(user_id,actor_id,kind,message,created_at)
select f.following_id,f.follower_id,'follow',p.display_name||' seni takip etmeye başladı.',f.created_at
from public.user_follows f join public.profiles p on p.id=f.follower_id
where f.status='accepted' and f.created_at>=now()-interval '7 days'
and not public.chat_pair_blocked(f.follower_id,f.following_id)
and coalesce((select follows from public.notification_preferences n where n.user_id=f.following_id),true)
on conflict(user_id,actor_id) where kind='follow' do nothing;
-- Discover is now search and countries only; the featured feed is retired.
drop function if exists public.discover_posts(integer,integer);
do $$begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime' and not puballtables)
 and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then
  alter publication supabase_realtime add table public.notifications;
 end if;
end $$;
notify pgrst,'reload schema';
commit;
