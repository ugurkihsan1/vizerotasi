-- Store the reported processing duration without fabricating calendar dates.
begin;
alter table public.posts add column if not exists processing_days integer
  check (processing_days between 0 and 36500);
grant insert(processing_days) on public.posts to authenticated;
-- Retain the current view's column order, permissions and security-invoker RLS.
-- New columns must be appended after the existing derived counts.
do $$
declare columns_sql text;
begin
  select string_agg(case a.attname
    when 'helpful_count' then '(select count(*)::integer from public.helpful_votes v where v.post_id=p.id) as helpful_count'
    when 'comment_count' then '(select count(*)::integer from public.comments c where c.post_id=p.id and c.status=''approved'') as comment_count'
    else format('p.%I',a.attname) end, ', ' order by a.attnum)
  into columns_sql from pg_attribute a
  where a.attrelid='public.feed'::regclass and a.attnum>0 and not a.attisdropped and a.attname<>'processing_days';
  execute 'create or replace view public.feed with (security_invoker=true) as select ' || columns_sql || ', p.processing_days from public.posts p';
end $$;
create or replace function public.country_stats(target_country text)
returns table(experiences bigint, questions bigint, tips bigint, average_days numeric, recent bigint)
language sql stable security invoker set search_path='' as $$
  select count(*) filter(where kind='experience'),
    count(*) filter(where kind='question'), count(*) filter(where kind='tip'),
    round(avg(coalesce(processing_days, case
      when application_date>='1985-01-01'::date and decision_date>=application_date and decision_date<=current_date
      then decision_date-application_date end)) filter(where kind='experience' and result in ('approved','rejected'))),
    count(*) filter(where created_at>now()-interval '7 days')
  from public.posts where country_id=target_country and status='approved'
$$;
notify pgrst, 'reload schema';
commit;
