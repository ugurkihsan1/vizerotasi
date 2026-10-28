-- Voluntary application buddies. No prototype data is imported or seeded.
begin;
do $$ begin
 if to_regprocedure('public.chat_pair_blocked(uuid,uuid)') is null then
   raise exception 'Apply CHAT_UPGRADE.sql before APPLICATION_BUDDIES_UPGRADE.sql';
 end if;
end $$;
create table if not exists public.application_buddy_plans (
 user_id uuid not null references public.profiles(id) on delete cascade,
 country_id text not null references public.countries(id) on delete cascade,
 application_city text not null check(length(trim(application_city)) between 2 and 80),
 destination_city text not null check(length(trim(destination_city)) between 2 and 80),
 application_month date not null check(extract(day from application_month)=1),
 purpose text not null check(purpose in ('Turistik','Aile ziyareti','Arkadaş ziyareti','İş / Ticari','Eğitim','Kültürel etkinlik','Sportif etkinlik','Konferans / Kongre','Erasmus / Değişim','Sağlık / Tedavi','Transit','Diğer')),
 stage text not null check(stage in ('appointment_search','appointment_booked','documents','submitted')),
 updated_at timestamptz not null default now(),
 primary key(user_id,country_id)
);
create index if not exists application_buddies_country_month_idx on public.application_buddy_plans(country_id,application_month,updated_at desc);
alter table public.application_buddy_plans enable row level security;
revoke all on public.application_buddy_plans from public,anon,authenticated;
grant select,delete on public.application_buddy_plans to authenticated;
drop policy if exists buddy_own_read on public.application_buddy_plans;
create policy buddy_own_read on public.application_buddy_plans for select to authenticated using(user_id=auth.uid());
drop policy if exists buddy_own_delete on public.application_buddy_plans;
create policy buddy_own_delete on public.application_buddy_plans for delete to authenticated using(user_id=auth.uid());

create or replace function public.buddy_city_key(value text) returns text
language sql immutable set search_path='' as $$
 select lower(translate(trim(coalesce(value,'')),'İIıŞşĞğÜüÖöÇç','iiiSsGgUuOoCc'))
$$;
revoke all on function public.buddy_city_key(text) from public,anon,authenticated;

create or replace function public.save_buddy_plan(
 target_country text, plan_city text, target_destination text,
 target_month date, target_purpose text, target_stage text
) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if target_month is null or extract(day from target_month)<>1
 or target_month<date_trunc('month',current_date)::date
 or target_month>(date_trunc('month',current_date)+interval '12 months')::date then
   raise exception 'Invalid application month' using errcode='22023';
 end if;
 insert into public.application_buddy_plans(user_id,country_id,application_city,destination_city,application_month,purpose,stage)
 values(auth.uid(),target_country,trim(plan_city),trim(target_destination),target_month,target_purpose,target_stage)
 on conflict(user_id,country_id) do update set application_city=excluded.application_city,
 destination_city=excluded.destination_city,application_month=excluded.application_month,
 purpose=excluded.purpose,stage=excluded.stage,updated_at=now();
end $$;
revoke all on function public.save_buddy_plan(text,text,text,date,text,text) from public,anon;
grant execute on function public.save_buddy_plan(text,text,text,date,text,text) to authenticated;

create or replace function public.find_application_buddies(
 target_country text, filter_city text default null, filter_destination text default null,
 filter_month date default null, page_size integer default 20, page_offset integer default 0
) returns table(
 user_id uuid, username text, display_name text, avatar_url text,
 country_id text, application_city text, destination_city text,
 application_month date, purpose text, stage text, total_count bigint
) language plpgsql stable security definer set search_path='' as $$
declare own_plan public.application_buddy_plans%rowtype;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select b.* into own_plan from public.application_buddy_plans b
 where b.user_id=auth.uid() and b.country_id=target_country
 and b.application_month>=date_trunc('month',current_date)::date;
 return query
 select b.user_id,p.username,p.display_name,p.avatar_url,b.country_id,
 b.application_city,b.destination_city,b.application_month,b.purpose,b.stage,count(*) over()
 from public.application_buddy_plans b join public.profiles p on p.id=b.user_id
 where b.country_id=target_country and b.user_id<>auth.uid()
 and b.application_month>=date_trunc('month',current_date)::date
 and not public.chat_pair_blocked(auth.uid(),b.user_id)
 and (nullif(trim(filter_city),'') is null or public.buddy_city_key(b.application_city)=public.buddy_city_key(filter_city))
 and (nullif(trim(filter_destination),'') is null or public.buddy_city_key(b.destination_city)=public.buddy_city_key(filter_destination))
 and (filter_month is null or b.application_month=filter_month)
 order by (
   case when public.buddy_city_key(b.application_city)=public.buddy_city_key(own_plan.application_city) and own_plan.user_id is not null then 50 else 0 end
   +case when b.application_month=coalesce(own_plan.application_month,date_trunc('month',current_date)::date) then 50
     when abs((extract(year from b.application_month)*12+extract(month from b.application_month))-(extract(year from coalesce(own_plan.application_month,current_date))*12+extract(month from coalesce(own_plan.application_month,current_date))))=1 then 20 else 0 end
   +case when b.purpose=own_plan.purpose then 10 else 0 end
 ) desc,
 abs((extract(year from b.application_month)*12+extract(month from b.application_month))-(extract(year from coalesce(own_plan.application_month,current_date))*12+extract(month from coalesce(own_plan.application_month,current_date)))),
 b.updated_at desc,b.user_id
 limit greatest(1,least(coalesce(page_size,20),50)) offset greatest(coalesce(page_offset,0),0);
end $$;
revoke all on function public.find_application_buddies(text,text,text,date,integer,integer) from public,anon;
grant execute on function public.find_application_buddies(text,text,text,date,integer,integer) to authenticated;
notify pgrst,'reload schema';
commit;
