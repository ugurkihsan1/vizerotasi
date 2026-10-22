-- Server-authoritative membership, durable founding cohort and moderated document notes.
-- Apply after the existing community schema. No user is promoted to an admin by this migration.
create sequence if not exists public.member_number_seq;
revoke all on sequence public.member_number_seq from public,anon,authenticated;
alter table public.profiles add column if not exists member_number bigint;
with numbered as (select id,coalesce((select max(member_number) from public.profiles),0)+row_number() over(order by created_at,id) as n from public.profiles where member_number is null)
 update public.profiles p set member_number=n.n from numbered n where p.id=n.id;
do $$ declare max_number bigint; begin
 select max(member_number) into max_number from public.profiles;
 if max_number is not null then perform setval('public.member_number_seq',greatest(max_number,(select last_value from public.member_number_seq)),true); end if;
end $$;
alter table public.profiles alter column member_number set default nextval('public.member_number_seq');
alter table public.profiles alter column member_number set not null;
create unique index if not exists profiles_member_number_idx on public.profiles(member_number);
alter table public.profiles add column if not exists is_pioneer boolean generated always as (member_number<=1000) stored;
alter table public.profiles alter column membership_level drop expression if exists;
alter table public.profiles alter column membership_level set default 'Yeni Üye';
alter table public.profiles add column if not exists badge_score integer not null default 0;
alter table public.profiles add column if not exists reputation_metrics jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists progress_recomputed_at timestamptz;
alter table public.countries add column if not exists is_schengen boolean not null default false;
update public.countries set is_schengen=true where code in ('AT','BE','BG','HR','CZ','DK','EE','FI','FR','DE','GR','HU','IS','IT','LV','LI','LT','LU','MT','NL','NO','PL','PT','RO','SK','SI','ES','SE','CH');
create table if not exists public.membership_levels (
 id text primary key,name text not null unique,rank integer not null unique,
 min_score integer not null,min_experiences integer not null,min_comments integer not null,min_liked_comments integer not null,
 min_comment_votes integer not null,min_supporters integer not null,min_countries integer not null,min_account_days integer not null,
 icon text not null,color text not null
);
alter table public.membership_levels enable row level security;
create policy levels_read on public.membership_levels for select using(true);
create policy levels_admin on public.membership_levels for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.badges add column if not exists badge_group text not null default 'legacy' check(badge_group in ('legacy','level','achievement'));
alter table public.badges add column if not exists icon text not null default 'ribbon-outline';
alter table public.badges add column if not exists is_active boolean not null default true;
create table if not exists public.member_trust_adjustments (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles on delete cascade,
 reference text not null unique,report_id uuid references public.reports on delete set null,
 points integer not null check(points between -2000 and -1),moderator_id uuid not null references public.profiles,
 internal_note text not null,created_at timestamptz not null default now()
);
alter table public.member_trust_adjustments enable row level security;
create policy trust_staff on public.member_trust_adjustments for select to authenticated using(public.is_staff());
create index if not exists trust_subject_idx on public.member_trust_adjustments(user_id);
create index if not exists comments_author_status_idx on public.comments(user_id,status);
create index if not exists comment_votes_target_idx on public.comment_helpful_votes(comment_id);
insert into public.membership_levels select * from jsonb_to_recordset($levels$[{"id": "gezgin", "name": "Gezgin", "rank": 1, "min_score": 40, "min_experiences": 2, "min_comments": 0, "min_liked_comments": 2, "min_comment_votes": 3, "min_supporters": 2, "min_countries": 1, "min_account_days": 0, "icon": "footsteps-outline", "color": "#4F8F70"}, {"id": "kasif", "name": "Kaşif", "rank": 2, "min_score": 160, "min_experiences": 5, "min_comments": 10, "min_liked_comments": 5, "min_comment_votes": 12, "min_supporters": 5, "min_countries": 2, "min_account_days": 7, "icon": "compass-outline", "color": "#388897"}, {"id": "seyyah", "name": "Seyyah", "rank": 3, "min_score": 450, "min_experiences": 10, "min_comments": 25, "min_liked_comments": 15, "min_comment_votes": 40, "min_supporters": 15, "min_countries": 3, "min_account_days": 30, "icon": "map-outline", "color": "#526DB1"}, {"id": "rehber", "name": "Rehber", "rank": 4, "min_score": 1100, "min_experiences": 20, "min_comments": 50, "min_liked_comments": 30, "min_comment_votes": 120, "min_supporters": 35, "min_countries": 4, "min_account_days": 90, "icon": "trail-sign-outline", "color": "#8464B3"}, {"id": "elci", "name": "Elçi", "rank": 5, "min_score": 2800, "min_experiences": 35, "min_comments": 100, "min_liked_comments": 60, "min_comment_votes": 300, "min_supporters": 80, "min_countries": 6, "min_account_days": 180, "icon": "ribbon-outline", "color": "#B47C35"}, {"id": "buyukelci", "name": "Büyükelçi", "rank": 6, "min_score": 8000, "min_experiences": 60, "min_comments": 150, "min_liked_comments": 100, "min_comment_votes": 1000, "min_supporters": 200, "min_countries": 8, "min_account_days": 365, "icon": "diamond-outline", "color": "#81559C"}]$levels$::jsonb) as l(id text,name text,rank integer,min_score integer,min_experiences integer,min_comments integer,min_liked_comments integer,min_comment_votes integer,min_supporters integer,min_countries integer,min_account_days integer,icon text,color text) on conflict(id) do nothing;
insert into public.badges(id,name,description,threshold,kind,badge_group,icon) select id,name,'Çok boyutlu topluluk seviyesi',min_score,'reputation','level',icon from public.membership_levels on conflict(id) do nothing;
insert into public.badges(id,name,description,threshold,kind,badge_group,icon) values
('europe-conqueror','Avrupa Fatihi','5 farklı Schengen ülkesinden onaylı deneyim.',5,'country','achievement','earth-outline'),
('travel-companion','Yol Arkadaşı','İlk 30 günlerindeki 3 farklı üyeye onaylı yorumla destek.',3,'comment','achievement','people-outline'),
('appointment-detective','Dedektif','Randevu kategorisinde 3 onaylı bilgi veya deneyim.',3,'experience','achievement','search-outline'),
('pioneer-member','Öncü Üye','Kayıt sırasındaki ilk 1000 üyeden biri.',1000,'reputation','achievement','flag-outline') on conflict(id) do nothing;
create function public.eligible_contributor(target_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where p.id=target_user and p.created_at<=now()-interval '7 days' and
 (exists(select 1 from public.posts where user_id=target_user and status='approved' and not is_sample)
 or exists(select 1 from public.comments c join public.posts t on t.id=c.post_id where c.user_id=target_user and c.status='approved' and t.status='approved' and not t.is_sample)))
$$;
revoke execute on function public.eligible_contributor from public,anon,authenticated;
create function public.refresh_member_progress(target_user uuid) returns void language plpgsql security definer set search_path='' as $$
declare p public.profiles%rowtype; old_label text; new_label text; earned_rank integer:=0; score integer; exps integer; comments_count integer; questions_count integer; countries_count integer; appointment_count integer; welcomes integer; comment_votes integer; liked_comments integer; supporters integer; post_votes integer; penalties integer; adjustments integer; age_days integer; b record; new_badge boolean; should_have boolean; changed integer;
begin
 select * into p from public.profiles where id=target_user for update; if not found then return; end if;
 old_label:=p.membership_level;
 select count(*) filter(where kind='experience'),count(*) filter(where kind='question'),count(*) filter(where kind in ('tip','experience','update') and category_id='appointment'),count(distinct country_id) filter(where kind='experience' and country_id in(select id from public.countries where is_schengen))
 into exps,questions_count,appointment_count,countries_count from public.posts where user_id=target_user and status='approved' and not is_sample;
 select count(*) into comments_count from public.comments c join public.posts t on t.id=c.post_id where c.user_id=target_user and c.status='approved' and t.status='approved' and not t.is_sample;
 select count(*),count(distinct v.comment_id),count(distinct v.user_id) into comment_votes,liked_comments,supporters from public.comment_helpful_votes v join public.comments c on c.id=v.comment_id join public.posts t on t.id=c.post_id
 where c.user_id=target_user and c.status='approved' and t.status='approved' and not t.is_sample and v.user_id<>target_user and public.eligible_contributor(v.user_id);
 select count(*) into post_votes from public.helpful_votes v join public.posts t on t.id=v.post_id where t.user_id=target_user and t.status='approved' and not t.is_sample and v.user_id<>target_user and public.eligible_contributor(v.user_id);
 select count(distinct t.user_id) into welcomes from public.comments c join public.posts t on t.id=c.post_id join public.profiles newcomer on newcomer.id=t.user_id where c.user_id=target_user and c.status='approved' and t.status='approved' and not t.is_sample and t.user_id<>target_user and c.created_at>=newcomer.created_at and c.created_at<newcomer.created_at+interval '30 days';
 select coalesce(sum(points),0) into penalties from public.member_trust_adjustments where user_id=target_user;
 select coalesce(sum(points),0) into adjustments from public.reputation_events where user_id=target_user and reference like 'admin:%';
 age_days:=greatest(0,extract(day from now()-p.created_at)::integer);
 score:=greatest(0,least(exps,120)*12+least(comments_count,400)+least(questions_count,80)*3+countries_count*30+least(comment_votes,2000)*3+least(liked_comments,200)*2+least(post_votes,400)+penalties+adjustments);
 select rank,name into earned_rank,new_label from public.membership_levels where score>=min_score and exps>=min_experiences and comments_count>=min_comments and liked_comments>=min_liked_comments and comment_votes>=min_comment_votes and supporters>=min_supporters and countries_count>=min_countries and age_days>=min_account_days order by rank desc limit 1;
 earned_rank:=coalesce(earned_rank,0);new_label:=coalesce(new_label,case when p.is_pioneer then 'Öncü Üye' else 'Yeni Üye' end);
 update public.profiles set badge_score=score,membership_level=new_label,progress_recomputed_at=now(),reputation_metrics=jsonb_build_object('approved_experiences',exps,'approved_comments',comments_count,'approved_questions',questions_count,'experience_countries',countries_count,'appointment_posts',appointment_count,'welcomed_members',welcomes,'qualified_comment_votes',comment_votes,'liked_comments',liked_comments,'unique_supporters',supporters,'qualified_post_votes',post_votes,'account_days',age_days,'penalty_points',penalties,'level_rank',earned_rank) where id=target_user;
 for b in select * from public.badges where badge_group<>'legacy' and is_active loop
  should_have:=case when b.badge_group='level' then b.id=(select id from public.membership_levels where rank=earned_rank)
    when b.id='europe-conqueror' then countries_count>=5 when b.id='travel-companion' then welcomes>=3 when b.id='appointment-detective' then appointment_count>=3 when b.id='pioneer-member' then p.is_pioneer else false end;
  if coalesce(should_have,false) then
   insert into public.user_badges(user_id,badge_id) values(target_user,b.id) on conflict do nothing;get diagnostics changed=row_count;
   if changed=1 and b.id<>'pioneer-member' and b.badge_group='achievement' and coalesce((select badges from public.notification_preferences where user_id=target_user),true) then insert into public.notifications(user_id,message) values(target_user,'Yeni rozetin: '||b.name); end if;
  else delete from public.user_badges where user_id=target_user and badge_id=b.id;end if;
 end loop;
 if coalesce((select badges from public.notification_preferences where user_id=target_user),true) and old_label is distinct from new_label and (earned_rank>0 or exists(select 1 from public.membership_levels where name=old_label)) then
  insert into public.notifications(user_id,message) values(target_user,'Topluluk seviyen: '||new_label);
 end if;
end $$;
revoke execute on function public.refresh_member_progress from public,anon,authenticated;
create function public.refresh_my_progress() returns void language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 if exists(select 1 from public.profiles where id=auth.uid() and (progress_recomputed_at is null or progress_recomputed_at<now()-interval '1 minute')) then perform public.refresh_member_progress(auth.uid());end if;
end $$;
revoke execute on function public.refresh_my_progress from public,anon;grant execute on function public.refresh_my_progress to authenticated;
create function public.refresh_progress_after_content() returns trigger language plpgsql security definer set search_path='' as $$ declare subject uuid; other_user uuid;subjects uuid[];begin
 subject:=case when TG_OP='DELETE' then old.user_id else new.user_id end;
 subjects:=array[subject];
 if TG_TABLE_NAME='posts' then select array_agg(distinct user_id) into subjects from (select subject as user_id union select user_id from public.comments where post_id=case when TG_OP='DELETE' then old.id else new.id end) people;end if;
 for other_user in select id from public.profiles where id=any(subjects) or id in(select c.user_id from public.comment_helpful_votes v join public.comments c on c.id=v.comment_id where v.user_id=any(subjects) union select p.user_id from public.helpful_votes v join public.posts p on p.id=v.post_id where v.user_id=any(subjects)) order by id loop perform public.refresh_member_progress(other_user);end loop;
 return null;
end $$;
create trigger progress_after_post after insert or update of status or delete on public.posts for each row execute function public.refresh_progress_after_content();
create trigger progress_after_comment after insert or update of status or delete on public.comments for each row execute function public.refresh_progress_after_content();
create function public.refresh_progress_after_vote() returns trigger language plpgsql security definer set search_path='' as $$ declare subject uuid;begin
 if TG_TABLE_NAME='comment_helpful_votes' then select user_id into subject from public.comments where id=case when TG_OP='DELETE' then old.comment_id else new.comment_id end;
 else select user_id into subject from public.posts where id=case when TG_OP='DELETE' then old.post_id else new.post_id end;end if;
 if subject is not null then perform public.refresh_member_progress(subject);end if;return null;
end $$;
create trigger progress_after_comment_vote after insert or delete on public.comment_helpful_votes for each row execute function public.refresh_progress_after_vote();
create trigger progress_after_post_vote after insert or delete on public.helpful_votes for each row execute function public.refresh_progress_after_vote();
drop trigger if exists level_changed on public.profiles;
create function public.refresh_progress_after_profile() returns trigger language plpgsql security definer set search_path='' as $$ begin perform public.refresh_member_progress(new.id);return null;end $$;
create trigger progress_after_signup after insert on public.profiles for each row execute function public.refresh_progress_after_profile();
create trigger progress_after_adjustment after update of reputation on public.profiles for each row execute function public.refresh_progress_after_profile();
create function public.refresh_progress_after_trust() returns trigger language plpgsql security definer set search_path='' as $$ begin perform public.refresh_member_progress(new.user_id);return null;end $$;
create trigger progress_after_trust after insert on public.member_trust_adjustments for each row execute function public.refresh_progress_after_trust();
create function public.review_member_report(target_report uuid,confirmed boolean,deduction integer default 25,moderator_note text default '') returns void language plpgsql security definer set search_path='' as $$ declare r public.reports%rowtype;subject uuid;ref text;changed integer;begin
 if not public.is_admin() then raise exception 'Forbidden' using errcode='42501';end if;
 select * into r from public.reports where id=target_report for update;if not found then raise exception 'Not found';end if;
 if r.resolved_at is not null then return;end if;
 if confirmed then
  if deduction not between 1 and 2000 or length(trim(moderator_note))<5 then raise exception 'Reason and deduction required';end if;
  if r.post_id is not null then select user_id into subject from public.posts where id=r.post_id;ref:='post:'||r.post_id::text;else select user_id into subject from public.comments where id=r.comment_id;ref:='comment:'||r.comment_id::text;end if;
  insert into public.member_trust_adjustments(user_id,reference,report_id,points,moderator_id,internal_note) values(subject,'confirmed-report:'||ref,r.id,-deduction,auth.uid(),moderator_note) on conflict(reference) do nothing;get diagnostics changed=row_count;
  if changed=1 then insert into public.notifications(user_id,post_id,message) values(subject,r.post_id,'İncelenen bir topluluk ihlali nedeniyle rozet puanın güncellendi.');end if;
 end if;
 update public.reports set resolved_at=now() where (r.post_id is not null and post_id=r.post_id) or (r.comment_id is not null and comment_id=r.comment_id);
end $$;
revoke execute on function public.review_member_report from public,anon;grant execute on function public.review_member_report to authenticated;
create view public.member_feedback_queue with(security_invoker=true) as select coalesce(p.user_id,c.user_id) user_id,count(distinct r.user_id)::integer reporters from public.reports r left join public.posts p on p.id=r.post_id left join public.comments c on c.id=r.comment_id where public.is_staff() and r.resolved_at is null group by coalesce(p.user_id,c.user_id) having count(distinct r.user_id)>=3;

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
 for b in select * from public.badges where badge_group='legacy' loop
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

do $$ declare u record;begin for u in select id from public.profiles order by member_number loop perform public.refresh_member_progress(u.id);end loop;end $$;
-- Community document warnings are linked to actual approved experiences or explicitly editorial.
create table public.document_notes (
 id uuid primary key default gen_random_uuid(),country_id text not null references public.countries,
 document_id uuid references public.country_documents on delete cascade,document_key text,
 document_title text not null,title text not null check(length(title) between 5 and 160),body text not null check(length(body) between 20 and 3000),
 source_type text not null check(source_type in ('experience','editorial')),post_id uuid references public.posts on delete cascade,
 scope text not null default '',created_by uuid not null default auth.uid() references public.profiles,
 status public.content_status not null default 'pending',approved_by uuid references public.profiles,approved_at timestamptz,
 created_at timestamptz not null default now(),check(document_id is not null or document_key is not null),check(source_type<>'experience' or post_id is not null)
);
alter table public.document_notes enable row level security;
create policy document_notes_read on public.document_notes for select using((status='approved' and (source_type='editorial' or exists(select 1 from public.posts p where p.id=post_id and p.status='approved' and p.kind='experience' and p.country_id=document_notes.country_id and not p.is_sample))) or created_by=auth.uid() or public.is_staff());
create policy document_notes_insert on public.document_notes for insert to authenticated with check(created_by=auth.uid() and public.is_staff() and status='pending' and approved_by is null and approved_at is null and (source_type='editorial' or exists(select 1 from public.posts p where p.id=post_id and p.country_id=document_notes.country_id and p.status='approved' and p.kind='experience' and not p.is_sample)) and (document_id is null or exists(select 1 from public.country_documents d where d.id=document_id and d.country_id=document_notes.country_id)));
revoke update,delete on public.document_notes from authenticated;
create index document_notes_country_idx on public.document_notes(country_id,status,created_at desc);
create table public.document_note_confirmations(user_id uuid references public.profiles on delete cascade,note_id uuid references public.document_notes on delete cascade,created_at timestamptz not null default now(),primary key(user_id,note_id));
alter table public.document_note_confirmations enable row level security;
create policy note_confirmations_read on public.document_note_confirmations for select using(exists(select 1 from public.document_notes n where n.id=note_id and n.status='approved'));
create policy note_confirmations_add on public.document_note_confirmations for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.document_notes n where n.id=note_id and n.status='approved' and n.source_type='experience' and n.created_by<>auth.uid() and (n.post_id is null or exists(select 1 from public.posts p where p.id=n.post_id and p.status='approved' and p.kind='experience' and p.user_id<>auth.uid()))));
create policy note_confirmations_remove on public.document_note_confirmations for delete to authenticated using(user_id=auth.uid());
create index note_confirmations_note_idx on public.document_note_confirmations(note_id);
create view public.document_note_feed with(security_invoker=true) as select n.*,(select p.user_id from public.posts p where p.id=n.post_id) source_user_id,(select count(*)::integer from public.document_note_confirmations c where c.note_id=n.id) similar_count from public.document_notes n;
create table public.document_note_reviews(id uuid primary key default gen_random_uuid(),note_id uuid not null references public.document_notes on delete cascade,moderator_id uuid not null references public.profiles,decision public.content_status not null,created_at timestamptz not null default now());
alter table public.document_note_reviews enable row level security;
create policy note_reviews_staff on public.document_note_reviews for select to authenticated using(public.is_staff());
create function public.moderate_document_note(target uuid,decision public.content_status) returns void language plpgsql security definer set search_path='' as $$ declare n public.document_notes%rowtype;begin
 if not public.is_staff() then raise exception 'Forbidden' using errcode='42501';end if;
 select * into n from public.document_notes where id=target for update;if not found then raise exception 'Not found';end if;
 if n.status=decision then return;end if;
 if n.created_by=auth.uid() and not public.is_admin() then raise exception 'Second reviewer required';end if;
 if decision not in ('approved','rejected','needs_revision') then raise exception 'Invalid decision';end if;
 if decision='approved' and n.source_type='experience' and not exists(select 1 from public.posts p where p.id=n.post_id and p.country_id=n.country_id and p.status='approved' and p.kind='experience' and not p.is_sample) then raise exception 'Approved source experience required';end if;
 insert into public.document_note_reviews(note_id,moderator_id,decision) values(n.id,auth.uid(),decision);
 update public.document_notes set status=decision,approved_by=case when decision='approved' then auth.uid() end,approved_at=case when decision='approved' then now() end where id=target;
end $$;
revoke execute on function public.moderate_document_note from public,anon;grant execute on function public.moderate_document_note to authenticated;
