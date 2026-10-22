-- Public client access is always governed by RLS; trusted mutations use RPCs.
create type public.content_status as enum ('pending','approved','rejected','needs_revision');
create type public.post_kind as enum ('experience','question','tip','update');
create table public.profiles (
 id uuid primary key references auth.users on delete cascade,
 username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
 display_name text not null check(length(display_name) between 2 and 60),
 avatar_url text, bio text not null default '', role text not null default 'user' check(role in ('user','moderator','admin')),
 reputation integer not null default 0,
 membership_level text generated always as (case when reputation <20 then 'Yeni Üye' when reputation <60 then 'Aktif Üye' when reputation <150 then 'Katkıcı' when reputation <400 then 'Güvenilir Üye' else 'Topluluk Uzmanı' end) stored,
 created_at timestamptz not null default now()
);
create table public.countries(id text primary key, name text not null, code text not null unique, flag text not null);
create table public.forum_categories(id text primary key, name text not null);
create table public.posts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles on delete cascade,
 country_id text not null references public.countries, kind public.post_kind not null,
 title text not null check(length(title) between 5 and 180), body text not null check(length(body) between 20 and 8000),
 advice text not null default '' check(length(advice)<=4000), category_id text references public.forum_categories,
 city text, center text, visa_type text, purpose text, first_schengen boolean, employment_status text, financing text, invitation boolean,
 application_date date, appointment_date date, passport_date date, decision_date date,
 result text check(result in ('approved','rejected','waiting')), requested_days integer check(requested_days between 1 and 730), granted_days integer check(granted_days between 0 and 1825), entries text check(entries in ('single','double','multi')),
 source_type text not null default 'submission' check(source_type in ('submission','official','editorial','community_verified')),
 source_url text check(source_url is null or source_url ~ '^https://'), last_verified_at timestamptz,
 status public.content_status not null default 'pending', approved_by uuid references public.profiles, approved_at timestamptz,
 is_sample boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(kind <> 'experience' or (city is not null and result is not null and first_schengen is not null and employment_status is not null and financing is not null)),
 check(decision_date is null or application_date is null or decision_date >= application_date)
);
-- These security-invoker views share a single post identity for comments, saves and votes.
create view public.visa_experiences with (security_invoker=true) as select * from public.posts where kind='experience';
create view public.threads with (security_invoker=true) as select * from public.posts where kind='question';
create view public.critical_tips with (security_invoker=true) as select * from public.posts where kind='tip';
create table public.comments (
 id uuid primary key default gen_random_uuid(),post_id uuid not null references public.posts on delete cascade,
 user_id uuid not null references public.profiles on delete cascade,parent_comment_id uuid references public.comments on delete cascade,
 body text not null check(length(body) between 2 and 3000),status public.content_status not null default 'pending',
 approved_by uuid references public.profiles,approved_at timestamptz,created_at timestamptz not null default now()
);
create table public.helpful_votes(user_id uuid references public.profiles on delete cascade,post_id uuid references public.posts on delete cascade,created_at timestamptz not null default now(),primary key(user_id,post_id));
create table public.country_documents(id uuid primary key default gen_random_uuid(),country_id text not null references public.countries,title text not null,body text not null,category text not null default 'Temel Belgeler',source_url text check(source_url is null or source_url ~ '^https://'),updated_at timestamptz not null default now());
create table public.saved_items(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles on delete cascade,post_id uuid references public.posts on delete cascade,document_id uuid references public.country_documents on delete cascade,created_at timestamptz not null default now(),check(num_nonnulls(post_id,document_id)=1),unique(user_id,post_id),unique(user_id,document_id));
create table public.followed_countries(user_id uuid references public.profiles on delete cascade,country_id text references public.countries on delete cascade,primary key(user_id,country_id));
create table public.notifications(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles on delete cascade,post_id uuid references public.posts on delete cascade,message text not null,read_at timestamptz,created_at timestamptz not null default now());
create table public.notification_preferences(user_id uuid primary key references public.profiles on delete cascade,replies boolean not null default true,approvals boolean not null default true,country_updates boolean not null default true,badges boolean not null default true);
create table public.reports(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles on delete cascade,post_id uuid references public.posts on delete cascade,comment_id uuid references public.comments on delete cascade,reason text not null check(reason in ('Yanlış bilgi','Kişisel bilgi','Spam','Hakaret / taciz','Reklam','Konu dışı','Diğer')),created_at timestamptz not null default now(),resolved_at timestamptz,check(num_nonnulls(post_id,comment_id)=1),unique(user_id,post_id),unique(user_id,comment_id));
create table public.reputation_events(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles on delete cascade,reference text not null unique,points integer not null,created_at timestamptz not null default now());
create table public.badges(id text primary key,name text not null,description text not null,threshold integer not null default 1,kind text not null check(kind in ('experience','comment','country','reputation')),country_id text references public.countries);
create table public.user_badges(user_id uuid references public.profiles on delete cascade,badge_id text references public.badges on delete cascade,created_at timestamptz not null default now(),primary key(user_id,badge_id));
create table public.moderation_actions(id uuid primary key default gen_random_uuid(),moderator_id uuid not null references public.profiles,post_id uuid references public.posts on delete cascade,comment_id uuid references public.comments on delete cascade,decision public.content_status not null,note text not null default '',created_at timestamptz not null default now(),check(num_nonnulls(post_id,comment_id)=1));
create table public.app_settings(key text primary key,value jsonb not null);
create function public.is_staff() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.profiles where id=auth.uid() and role in ('moderator','admin')) $$;
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin') $$;
create function public.handle_signup() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.raw_user_meta_data->>'terms_accepted' <> 'true' or new.raw_user_meta_data->>'privacy_accepted' <> 'true' or new.raw_user_meta_data->>'terms_accepted' is null or new.raw_user_meta_data->>'privacy_accepted' is null then raise exception 'Consent required'; end if;
 insert into public.profiles(id,username,display_name) values(new.id,lower(new.raw_user_meta_data->>'username'),new.raw_user_meta_data->>'display_name');
 insert into public.notification_preferences(user_id) values(new.id);
 return new;
end $$;
create trigger on_signup after insert on auth.users for each row execute function public.handle_signup();
-- No client UPDATE grant for protected profile or moderation columns.
revoke all on public.profiles, public.posts, public.comments from anon,authenticated;
grant select on public.profiles,public.posts,public.comments to anon,authenticated;
grant update(display_name,bio,avatar_url) on public.profiles to authenticated;
grant insert(user_id,country_id,kind,title,body,advice,category_id,city,center,visa_type,purpose,first_schengen,employment_status,financing,invitation,application_date,appointment_date,passport_date,decision_date,result,requested_days,granted_days,entries) on public.posts to authenticated;
grant insert(post_id,user_id,parent_comment_id,body) on public.comments to authenticated;
-- All tables must use RLS, including tables added later in this migration.
do $$ declare t text; begin foreach t in array array['profiles','countries','forum_categories','posts','comments','helpful_votes','country_documents','saved_items','followed_countries','notifications','notification_preferences','reports','reputation_events','badges','user_badges','moderation_actions','app_settings'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;
create policy profiles_read on public.profiles for select using(true);
create policy profiles_edit on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy posts_read on public.posts for select using(status='approved' or user_id=auth.uid() or public.is_staff());
create policy posts_insert on public.posts for insert to authenticated with check(user_id=auth.uid() and status='pending' and approved_by is null and approved_at is null and source_type='submission' and kind<>'update');
create policy comments_read on public.comments for select using(exists(select 1 from public.posts p where p.id=post_id) and (status='approved' or user_id=auth.uid() or public.is_staff()));
create policy comments_insert on public.comments for insert to authenticated with check(user_id=auth.uid() and status='pending' and approved_by is null and exists(select 1 from public.posts p where p.id=post_id and p.status='approved'));
create function public.check_comment_parent() returns trigger language plpgsql set search_path='' as $$ begin
 if new.parent_comment_id is not null and not exists(select 1 from public.comments c where c.id=new.parent_comment_id and c.post_id=new.post_id and c.parent_comment_id is null and c.status='approved') then raise exception 'Invalid reply'; end if; return new; end $$;
create trigger check_reply before insert on public.comments for each row execute function public.check_comment_parent();
create policy votes_read on public.helpful_votes for select using(exists(select 1 from public.posts p where p.id=post_id));
create policy votes_insert on public.helpful_votes for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.posts p where p.id=post_id and p.status='approved' and p.user_id<>auth.uid()));
create policy votes_delete on public.helpful_votes for delete to authenticated using(user_id=auth.uid());
create policy saves_read on public.saved_items for select to authenticated using(user_id=auth.uid());
create policy saves_insert on public.saved_items for insert to authenticated with check(user_id=auth.uid() and (document_id is not null or exists(select 1 from public.posts p where p.id=post_id and p.status='approved')));
create policy saves_delete on public.saved_items for delete to authenticated using(user_id=auth.uid());
create policy follows_own on public.followed_countries for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy notifications_own on public.notifications for select to authenticated using(user_id=auth.uid());
grant update(read_at) on public.notifications to authenticated;
revoke insert,delete,update on public.notifications from authenticated;
grant update(read_at) on public.notifications to authenticated;
create policy notifications_read on public.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy preferences_own on public.notification_preferences for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy reports_insert on public.reports for insert to authenticated with check(user_id=auth.uid() and resolved_at is null and ((post_id is not null and exists(select 1 from public.posts p where p.id=post_id and p.status='approved')) or (comment_id is not null and exists(select 1 from public.comments c where c.id=comment_id and c.status='approved'))));
create policy reports_read on public.reports for select to authenticated using(user_id=auth.uid() or public.is_staff());
create policy reports_resolve on public.reports for update to authenticated using(public.is_staff()) with check(public.is_staff());
revoke update on public.reports from authenticated; grant update(resolved_at) on public.reports to authenticated;
create policy reputation_read on public.reputation_events for select to authenticated using(user_id=auth.uid() or public.is_staff());
create policy badges_read on public.user_badges for select using(true);
create policy moderation_staff on public.moderation_actions for select to authenticated using(public.is_staff());
do $$ declare t text; begin foreach t in array array['countries','forum_categories','badges','country_documents'] loop
 execute format('create policy public_read on public.%I for select using(true)',t);
 execute format('create policy admin_manage on public.%I for all to authenticated using(public.is_admin()) with check(public.is_admin())',t);
 end loop; end $$;
create policy settings_admin on public.app_settings for all to authenticated using(public.is_admin()) with check(public.is_admin());
create function public.moderate(target uuid, decision public.content_status, is_comment boolean default false, internal_note text default '') returns void language plpgsql security definer set search_path='' as $$
declare author uuid; pid uuid; old_status public.content_status; k public.post_kind; pts integer; inserted integer; b record; n integer;
begin
 if not public.is_staff() then raise exception 'Forbidden' using errcode='42501'; end if;
 if decision='pending' then raise exception 'Invalid decision'; end if;
 if is_comment then select user_id,post_id,status into author,pid,old_status from public.comments where id=target for update;
 else select user_id,id,status,kind into author,pid,old_status,k from public.posts where id=target for update; end if;
 if author is null then raise exception 'Not found'; end if;
 if author=auth.uid() then raise exception 'Cannot moderate own content'; end if;
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
 for b in select * from public.badges loop
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
create function public.admin_adjust_reputation(target_user uuid, delta integer, reason text, event_key text) returns void language plpgsql security definer set search_path='' as $$ declare n integer; begin
 if not public.is_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
 if length(reason)<5 then raise exception 'Reason required'; end if;
 insert into public.reputation_events(user_id,reference,points) values(target_user,'admin:'||event_key,delta) on conflict do nothing;
 get diagnostics n=row_count;
 if n=1 then update public.profiles set reputation=reputation+delta where id=target_user; end if;
end $$;
create function public.admin_set_role(target_user uuid, new_role text) returns void language plpgsql security definer set search_path='' as $$ begin
 if not public.is_admin() or new_role not in ('user','moderator','admin') or target_user=auth.uid() then raise exception 'Forbidden' using errcode='42501'; end if;
 update public.profiles set role=new_role where id=target_user;
end $$;
create function public.revise_post(target uuid,new_title text,new_body text) returns void language plpgsql security definer set search_path='' as $$ begin
 update public.posts set title=new_title,body=new_body,status='pending',approved_by=null,approved_at=null,updated_at=now() where id=target and user_id=auth.uid() and status in ('needs_revision','rejected');
 if not found then raise exception 'Forbidden'; end if;
end $$;
-- Security-invoker aggregate views never bypass content visibility policies.
alter table public.posts add column title_body tsvector generated always as (to_tsvector('simple',title||' '||body)) stored;
create view public.feed with (security_invoker=true) as select p.*,
 (select count(*)::integer from public.helpful_votes v where v.post_id=p.id) helpful_count,
 (select count(*)::integer from public.comments c where c.post_id=p.id and c.status='approved') comment_count
 from public.posts p;
create index posts_feed_idx on public.posts(status,country_id,created_at desc,id);
create index posts_author_idx on public.posts(user_id,created_at desc);
create index posts_filter_idx on public.posts(kind,result,first_schengen,employment_status);
create index posts_search_idx on public.posts using gin(title_body);
create index comments_post_idx on public.comments(post_id,status,created_at);
create index notifications_user_idx on public.notifications(user_id,created_at desc);
create index saved_posts_idx on public.saved_items(post_id);
create index votes_posts_idx on public.helpful_votes(post_id);
create index posts_category_idx on public.posts(category_id);
revoke execute on function public.moderate,public.admin_set_role,public.admin_adjust_reputation,public.revise_post from public,anon;
grant execute on function public.moderate,public.admin_set_role,public.admin_adjust_reputation,public.revise_post to authenticated;
insert into public.countries values ('germany','Almanya','DE','🇩🇪'),('estonia','Estonya','EE','🇪🇪'),('poland','Polonya','PL','🇵🇱'),('france','Fransa','FR','🇫🇷'),('spain','İspanya','ES','🇪🇸'),('italy','İtalya','IT','🇮🇹'),('greece','Yunanistan','GR','🇬🇷'),('hungary','Macaristan','HU','🇭🇺'),('netherlands','Hollanda','NL','🇳🇱');
insert into public.forum_categories values ('documents','Belgeler'),('appointment','Randevu'),('finance','Finansal Durum'),('invitation','Davet Mektubu'),('student','Öğrenci'),('employment','Çalışan'),('sponsor','Sponsor'),('rejection','Ret'),('passport','Pasaport'),('other','Diğer');
insert into public.badges values ('first-experience','İlk Deneyim','İlk onaylı deneyimin',1,'experience',null),('comments-10','10 Onaylı Yorum','10 yorumla katkıda bulundun',10,'comment',null),('comments-50','50 Onaylı Yorum','50 onaylı yorum',50,'comment',null),('comments-100','100 Onaylı Yorum','100 onaylı yorum',100,'comment',null),('estonia','Estonya Katkıcısı','Estonya için 5 katkı',5,'country','estonia'),('germany','Almanya Katkıcısı','Almanya için 5 katkı',5,'country','germany'),('france','Fransa Katkıcısı','Fransa için 5 katkı',5,'country','france'),('expert','Topluluk Uzmanı','400 katkı puanı',400,'reputation',null);
-- Avatar-only storage. No passport/financial document uploads.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('avatars','avatars',true,2097152,array['image/jpeg','image/png','image/webp']);
create policy avatars_read on storage.objects for select using(bucket_id='avatars');
create policy avatars_insert on storage.objects for insert to authenticated with check(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy avatars_update on storage.objects for update to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create function public.country_stats(target_country text) returns table(experiences bigint,questions bigint,tips bigint,average_days numeric,recent bigint) language sql stable security invoker set search_path='' as $$
 select count(*) filter(where kind='experience'),count(*) filter(where kind='question'),count(*) filter(where kind='tip'),round(avg(decision_date-application_date) filter(where kind='experience')),count(*) filter(where created_at>now()-interval '7 days') from public.posts where country_id=target_country and status='approved'
$$;
-- Basic server-enforced submission limits; an API call cannot bypass these.
create function public.limit_submissions() returns trigger language plpgsql security definer set search_path='' as $$ declare recent_count integer; begin
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,0));
 if TG_TABLE_NAME='posts' then select count(*) into recent_count from public.posts where user_id=new.user_id and created_at>now()-interval '1 hour';
 elsif TG_TABLE_NAME='comments' then select count(*) into recent_count from public.comments where user_id=new.user_id and created_at>now()-interval '1 hour';
 else select count(*) into recent_count from public.reports where user_id=new.user_id and created_at>now()-interval '1 hour'; end if;
 if recent_count >= (case when TG_TABLE_NAME='posts' then 10 else 50 end) then raise exception 'Submission limit reached' using errcode='P0001'; end if; return new;
end $$;
create trigger posts_rate_limit before insert on public.posts for each row execute function public.limit_submissions();
create trigger comments_rate_limit before insert on public.comments for each row execute function public.limit_submissions();
create trigger reports_rate_limit before insert on public.reports for each row execute function public.limit_submissions();
create function public.admin_edit_tip(target uuid,new_title text,new_body text,new_source_type text,new_source_url text) returns void language plpgsql security definer set search_path='' as $$ begin
 if not public.is_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
 if new_source_type not in ('official','editorial','community_verified') or (new_source_type='official' and new_source_url is null) then raise exception 'Source required'; end if;
 update public.posts set title=new_title,body=new_body,source_type=new_source_type,source_url=nullif(new_source_url,''),last_verified_at=now(),status='pending',approved_by=null,approved_at=null where id=target and kind='tip';
 if not found then raise exception 'Not found'; end if;
end $$;
revoke execute on function public.admin_edit_tip from public,anon; grant execute on function public.admin_edit_tip to authenticated;
create function public.level_notification() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if new.membership_level<>old.membership_level then insert into public.notifications(user_id,message) values(new.id,'Üyelik seviyen: '||new.membership_level); end if; return new;
end $$;
create trigger level_changed after update of reputation on public.profiles for each row execute function public.level_notification();
create function public.country_update_notification() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if new.status='approved' and old.status<>'approved' and new.kind in ('update','tip') then
 insert into public.notifications(user_id,post_id,message) select f.user_id,new.id,'Takip ettiğin ülkede yeni bir kritik paylaşım var.' from public.followed_countries f join public.notification_preferences p on p.user_id=f.user_id where f.country_id=new.country_id and p.country_updates and f.user_id<>new.user_id;
 end if;return new;
end $$;
create trigger country_update_published after update of status on public.posts for each row execute function public.country_update_notification();
alter table public.profiles add constraint bio_length check(length(bio)<=300);
create table public.comment_helpful_votes(user_id uuid references public.profiles on delete cascade,comment_id uuid references public.comments on delete cascade,primary key(user_id,comment_id));
alter table public.comment_helpful_votes enable row level security;
create policy comment_votes_read on public.comment_helpful_votes for select using(exists(select 1 from public.comments c where c.id=comment_id and c.status='approved'));
create policy comment_votes_add on public.comment_helpful_votes for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.comments c where c.id=comment_id and c.status='approved' and c.user_id<>auth.uid()));
create policy comment_votes_remove on public.comment_helpful_votes for delete to authenticated using(user_id=auth.uid());
create function public.profile_stats(target_user uuid) returns table(contributions bigint,helpful bigint,countries bigint) language sql stable security invoker set search_path='' as $$
 select count(*),coalesce(sum((select count(*) from public.helpful_votes v where v.post_id=p.id)),0)::bigint,count(distinct country_id) from public.posts p where user_id=target_user and status='approved'
$$;
