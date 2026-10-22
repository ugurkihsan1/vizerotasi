-- Run this complete file in Supabase SQL Editor as the project owner.
-- Grants the first administrator and installs the explicit admin self-review rule.
begin;
update public.profiles set role = 'admin' where username = 'uugurrk' returning username, role;

-- Admins may publish their own submissions. Moderators still require a second reviewer.
-- Normal users cannot invoke moderation; transaction/audit/idempotent awards are preserved.
create or replace function public.moderate(target uuid, decision public.content_status, is_comment boolean default false, internal_note text default '') returns void language plpgsql security definer set search_path='' as $$
declare author uuid; pid uuid; old_status public.content_status; k public.post_kind; pts integer; inserted integer; b record; n integer;
begin
 if not public.is_staff() then raise exception 'Forbidden' using errcode='42501'; end if;
 if decision='pending' then raise exception 'Invalid decision'; end if;
 if is_comment then select user_id,post_id,status into author,pid,old_status from public.comments where id=target for update;
 else select user_id,id,status,kind into author,pid,old_status,k from public.posts where id=target for update; end if;
 if author is null then raise exception 'Not found'; end if;
 if author=auth.uid() and not public.is_admin() then raise exception 'Cannot moderate own content'; end if;
 if old_status=decision then return; end if;
 if is_comment then update public.comments set status=decision,approved_by=case when decision='approved' then auth.uid() end,approved_at=case when decision='approved' then now() end where id=target;
 else update public.posts set status=decision,approved_by=case when decision='approved' then auth.uid() end,approved_at=case when decision='approved' then now() end,updated_at=now() where id=target; end if;
 insert into public.moderation_actions(moderator_id,post_id,comment_id,decision,note) values(auth.uid(),case when not is_comment then target end,case when is_comment then target end,decision,internal_note);
 if coalesce((select approvals from public.notification_preferences where user_id=author),true) then
 insert into public.notifications(user_id,post_id,message) values(author,pid,case decision when 'approved' then 'Gönderin onaylandı 🎉' when 'needs_revision' then 'Gönderin için düzenleme istendi.' else 'Gönderin yayına alınamadı.' end); end if;
 if decision='approved' then
 pts:=case when is_comment then 2 when k='experience' then 8 when k='question' then 5 else 0 end;
 insert into public.reputation_events(user_id,reference,points) values(author,(case when is_comment then 'comment' else 'post' end)||'_approval:'||target::text,pts) on conflict(reference) do nothing;
 get diagnostics inserted=row_count;
 if inserted=1 then update public.profiles set reputation=reputation+pts where id=author; end if;
 for b in select * from public.badges where coalesce(to_jsonb(badges)->>'badge_group','legacy')='legacy' loop
 n:=0;
 if b.kind='experience' then select count(*) into n from public.posts where user_id=author and kind='experience' and status='approved';
 elsif b.kind='comment' then select count(*) into n from public.comments where user_id=author and status='approved';
 elsif b.kind='country' then select count(*) into n from public.posts where user_id=author and country_id=b.country_id and status='approved';
 else select reputation into n from public.profiles where id=author; end if;
 if n>=b.threshold then
 insert into public.user_badges(user_id,badge_id) values(author,b.id) on conflict do nothing;
 get diagnostics inserted=row_count;
 if inserted=1 and coalesce((select badges from public.notification_preferences where user_id=author),true) then insert into public.notifications(user_id,message) values(author,'Yeni rozetin: '||b.name); end if;
 end if;
 end loop;
 if is_comment then
 insert into public.notifications(user_id,post_id,message)
 select distinct recipient,pid,'Paylaşımına yeni bir yanıt geldi.' from (
 select user_id recipient from public.posts where id=pid union select user_id from public.comments where id=(select parent_comment_id from public.comments where id=target)
 ) r where recipient<>author and coalesce((select replies from public.notification_preferences where user_id=recipient),true);
 end if;
 end if;
end $$;

commit;
