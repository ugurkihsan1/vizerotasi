-- Optional visa history and invitation notes; blank narratives are allowed only for experiences.
alter table public.posts add column if not exists previous_visas jsonb not null default '[]'::jsonb;
alter table public.posts add column if not exists invitation_notes text not null default '';
create or replace function public.valid_previous_visas(data jsonb) returns boolean language plpgsql immutable set search_path='' as $$ declare v jsonb;dt text;begin
 if jsonb_typeof(data)<>'array' or jsonb_array_length(data)>10 or length(data::text)>16000 then return false;end if;
 for v in select * from jsonb_array_elements(data) loop
  if jsonb_typeof(v)<>'object' then return false;end if;
  if exists(select 1 from jsonb_object_keys(v) k where k not in ('country','issue_date','duration','entries','notes')) then return false;end if;
  if jsonb_typeof(v->'country') is distinct from 'string' or length(trim(v->>'country')) not between 1 and 80 then return false;end if;
  if jsonb_typeof(v->'issue_date') is distinct from 'string' or jsonb_typeof(v->'duration') is distinct from 'string' or jsonb_typeof(v->'entries') is distinct from 'string' or jsonb_typeof(v->'notes') is distinct from 'string' then return false;end if;
  if length(v->>'duration')>100 or length(v->>'notes')>500 or (v->>'entries') not in ('','single','double','multi') then return false;end if;
  dt:=v->>'issue_date';if dt<>'' then if dt!~'^\d{4}-\d{2}-\d{2}$' or to_char(dt::date,'YYYY-MM-DD')<>dt then return false;end if;end if;
 end loop;return true;
 exception when others then return false;
end $$;
alter table public.posts drop constraint if exists posts_body_check;
alter table public.posts add constraint posts_body_check check(length(body)<=8000 and (kind='experience' or length(body)>=20));
alter table public.posts drop constraint if exists posts_history_valid;
alter table public.posts add constraint posts_history_valid check(public.valid_previous_visas(previous_visas) and (previous_visas='[]'::jsonb or (kind='experience' and first_schengen is false)));
alter table public.posts drop constraint if exists posts_invitation_notes_valid;
alter table public.posts add constraint posts_invitation_notes_valid check(length(invitation_notes)<=2000 and (kind='experience' or invitation_notes=''));
grant insert(previous_visas,invitation_notes) on public.posts to authenticated;
insert into public.forum_categories(id,name) values
 ('doc-form','Başvuru formu'),('doc-photo','Biyometrik fotoğraf'),('doc-insurance','Seyahat sağlık sigortası'),('doc-itinerary','Ulaşım / Seyahat planı'),('doc-purpose','Seyahat amacı / Niyet dilekçesi'),('doc-registry','Nüfus kayıt örneği'),('doc-residence-history','Tarihçeli yerleşim yeri'),('doc-residence','İkamet belgesi'),('doc-minors','18 yaş altı / Muvafakatname'),('doc-copies','Pasaport ve kimlik fotokopileri') on conflict(id) do nothing;
-- Append columns without changing the existing view-column order or bypassing RLS.
do $$ declare n text;definition text;cols text;begin
 foreach n in array array['feed','visa_experiences','threads','critical_tips'] loop
  if to_regclass('public.'||n) is null then continue;end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name=n and column_name='previous_visas') then continue;end if;
  definition:=regexp_replace(pg_get_viewdef(('public.'||n)::regclass,true),';\s*$','');
  select string_agg('base.'||quote_ident(column_name),',' order by ordinal_position) into cols from information_schema.columns where table_schema='public' and table_name=n;
  execute 'create or replace view public.'||quote_ident(n)||' with (security_invoker=true) as select '||cols||',p.previous_visas,p.invitation_notes from ('||definition||') base join public.posts p on p.id=base.id';
 end loop;
end $$;
