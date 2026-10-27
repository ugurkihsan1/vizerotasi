-- Owner-only content removal and administrator-maintained country metadata.
alter table public.countries add column if not exists is_schengen boolean not null default false;
alter table public.countries add column if not exists cover_url text check(cover_url is null or cover_url ~ '^https://');
alter table public.countries add column if not exists summary text not null default '';
alter table public.countries add column if not exists source_url text check(source_url is null or source_url ~ '^https://');
alter table public.countries add column if not exists appointment_url text check(appointment_url is null or appointment_url ~ '^https://');
create or replace function public.delete_own_content(target uuid,is_comment boolean default false) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 if is_comment then
  delete from public.comments where id=target and user_id=auth.uid();
 else
  delete from public.posts where id=target and user_id=auth.uid();
 end if;
 if not found then raise exception 'Content unavailable' using errcode='42501';end if;
end $$;
create or replace function public.admin_save_country(payload jsonb) returns text language plpgsql security definer set search_path='' as $$
declare cid text:=trim(payload->>'id');cname text:=trim(payload->>'name');ccode text:=upper(trim(payload->>'code'));flag text;u text;begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501';end if;
 if cid is null or cid !~ '^[a-z][a-z0-9-]{1,39}$' or length(coalesce(cname,'')) not between 2 and 60 or ccode is null or ccode !~ '^[A-Z]{2}$' or length(coalesce(payload->>'summary',''))>3000 then raise exception 'Invalid country';end if;
 foreach u in array array[payload->>'cover_url',payload->>'source_url',payload->>'appointment_url'] loop
  if coalesce(u,'')<>'' and (u !~ '^https://[^/[:space:]]+' or u ~ '[[:space:]]' or length(u)>2000) then raise exception 'HTTPS URL required';end if;
 end loop;
 perform pg_advisory_xact_lock(hashtextextended('country:'||ccode,0));
 if exists(select 1 from public.countries where code=ccode and id<>cid) then raise exception 'Country code already exists';end if;
 flag:=chr(127397+ascii(substr(ccode,1,1)))||chr(127397+ascii(substr(ccode,2,1)));
 insert into public.countries(id,name,code,flag,is_schengen,cover_url,summary,source_url,appointment_url)
 values(cid,cname,ccode,flag,coalesce((payload->>'is_schengen')::boolean,false),nullif(payload->>'cover_url',''),coalesce(payload->>'summary',''),nullif(payload->>'source_url',''),nullif(payload->>'appointment_url',''))
 on conflict(id) do update set name=excluded.name,code=excluded.code,flag=excluded.flag,is_schengen=excluded.is_schengen,cover_url=excluded.cover_url,summary=excluded.summary,source_url=excluded.source_url,appointment_url=excluded.appointment_url;
 return cid;
end $$;
revoke execute on function public.delete_own_content,public.admin_save_country from public,anon;
grant execute on function public.delete_own_content,public.admin_save_country to authenticated;
notify pgrst,'reload schema';
