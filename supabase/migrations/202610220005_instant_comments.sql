-- Comments publish immediately; posts retain their existing approval workflow.
alter table public.comments alter column status set default 'approved';
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert to authenticated with check(user_id=auth.uid() and status='approved' and approved_by is null and exists(select 1 from public.posts p where p.id=post_id and p.status='approved'));
create or replace function public.publish_new_comment() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if not exists(select 1 from public.posts where id=new.post_id and status='approved') then raise exception 'Published post required';end if;
 new.status:='approved';new.approved_at:=now();new.approved_by:=null;return new;
end $$;
revoke execute on function public.publish_new_comment() from public,anon,authenticated;
drop trigger if exists publish_new_comment on public.comments;
create trigger publish_new_comment before insert on public.comments for each row execute function public.publish_new_comment();
create or replace function public.reward_published_comment(target uuid) returns void language plpgsql security definer set search_path='' as $$ declare c public.comments%rowtype;changed integer;b record;total integer;begin
 select * into c from public.comments where id=target and status='approved';if not found then return;end if;
 insert into public.reputation_events(user_id,reference,points) values(c.user_id,'comment_approval:'||c.id::text,2) on conflict(reference) do nothing;get diagnostics changed=row_count;
 if changed=0 then return;end if;
 update public.profiles set reputation=reputation+2 where id=c.user_id;
 select count(*) into total from public.comments where user_id=c.user_id and status='approved';
 for b in select * from public.badges where kind='comment' and coalesce(to_jsonb(badges)->>'badge_group','legacy')='legacy' and threshold<=total loop
  insert into public.user_badges(user_id,badge_id) values(c.user_id,b.id) on conflict do nothing;
 end loop;
 insert into public.notifications(user_id,post_id,message)
 select recipient,c.post_id,'Gönderine veya yorumuna yeni bir yanıt geldi.' from (
 select user_id recipient from public.posts where id=c.post_id union select user_id from public.comments where id=c.parent_comment_id
 ) people where recipient<>c.user_id and coalesce((select replies from public.notification_preferences where user_id=recipient),true);
end $$;
revoke execute on function public.reward_published_comment(uuid) from public,anon,authenticated;
create or replace function public.comment_published_rewards() returns trigger language plpgsql security definer set search_path='' as $$ begin perform public.reward_published_comment(new.id);return null;end $$;
revoke execute on function public.comment_published_rewards() from public,anon,authenticated;
drop trigger if exists comment_published_rewards on public.comments;
create trigger comment_published_rewards after insert on public.comments for each row execute function public.comment_published_rewards();
-- Release only the existing pending queue on published posts. Removed comments stay removed.
do $$ declare c record;begin
 for c in update public.comments set status='approved',approved_by=null,approved_at=now() where status='pending' and exists(select 1 from public.posts p where p.id=post_id and p.status='approved') returning id loop
 perform public.reward_published_comment(c.id);
 end loop;
end $$;
