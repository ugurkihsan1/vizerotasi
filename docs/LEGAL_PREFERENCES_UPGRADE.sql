begin;

-- Receipts record a user's actual choice, including refusal/withdrawal. They do
-- not establish that consent is valid or replace an international-transfer basis.
create table if not exists public.legal_preference_receipts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 privacy_version text not null check(length(privacy_version) between 1 and 64),
 transfer_version text not null check(length(transfer_version) between 1 and 64),
 terms_version text check(terms_version is null or length(terms_version) between 1 and 64),
 supabase boolean not null,
 google boolean not null,
 github boolean not null,
 source text not null check(source in ('web','native')),
 acknowledged_at timestamptz not null,
 received_at timestamptz not null default clock_timestamp()
);
create unique index if not exists legal_preference_receipts_dedupe_idx
 on public.legal_preference_receipts
 (user_id,privacy_version,transfer_version,coalesce(terms_version,''),source,acknowledged_at,supabase,google,github);
create index if not exists legal_preference_receipts_owner_idx
 on public.legal_preference_receipts(user_id,received_at desc,id);

alter table public.legal_preference_receipts enable row level security;
revoke all on public.legal_preference_receipts from public,anon,authenticated;
grant select on public.legal_preference_receipts to authenticated;
drop policy if exists legal_preference_receipts_read_own on public.legal_preference_receipts;
create policy legal_preference_receipts_read_own on public.legal_preference_receipts
 for select to authenticated using(user_id=auth.uid());

-- Internal helper is callable only by the function owner, including the signup
-- trigger. Neither clients nor service metadata can supply a different owner.
create or replace function public.append_legal_preference_receipt(target_user uuid,preference_payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare
 privacy_value text;
 transfer_value text;
 terms_value text;
 source_value text;
 acknowledged_value timestamptz;
 receipt_id uuid;
begin
 if target_user is null or not exists(select 1 from public.profiles where id=target_user) then
  raise exception 'legal_preferences_owner_required' using errcode='42501';
 end if;
 if preference_payload is null or jsonb_typeof(preference_payload)<>'object' then
  raise exception 'legal_preferences_invalid' using errcode='22023';
 end if;
 if exists(select 1 from jsonb_object_keys(preference_payload) k
  where k not in ('privacyVersion','transferVersion','termsVersion','supabase','google','github','acknowledgedAt','source')) then
  raise exception 'legal_preferences_invalid' using errcode='22023';
 end if;
 if jsonb_typeof(preference_payload->'privacyVersion') is distinct from 'string'
 or jsonb_typeof(preference_payload->'transferVersion') is distinct from 'string'
 or jsonb_typeof(preference_payload->'supabase') is distinct from 'boolean'
 or jsonb_typeof(preference_payload->'google') is distinct from 'boolean'
 or jsonb_typeof(preference_payload->'github') is distinct from 'boolean'
 or jsonb_typeof(preference_payload->'source') is distinct from 'string'
 or jsonb_typeof(preference_payload->'acknowledgedAt') is distinct from 'string'
 or (preference_payload ? 'termsVersion' and jsonb_typeof(preference_payload->'termsVersion') is distinct from 'string') then
  raise exception 'legal_preferences_invalid' using errcode='22023';
 end if;
 privacy_value:=preference_payload->>'privacyVersion';
 transfer_value:=preference_payload->>'transferVersion';
 terms_value:=preference_payload->>'termsVersion';
 source_value:=preference_payload->>'source';
 if length(btrim(privacy_value)) not between 1 and 64
 or length(btrim(transfer_value)) not between 1 and 64
 or length(privacy_value)>64 or length(transfer_value)>64
 or (terms_value is not null and (length(btrim(terms_value)) not between 1 and 64 or length(terms_value)>64))
 or source_value not in ('web','native')
 or (preference_payload->>'acknowledgedAt') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$' then
  raise exception 'legal_preferences_invalid' using errcode='22023';
 end if;
 begin
  acknowledged_value:=(preference_payload->>'acknowledgedAt')::timestamptz;
 exception when others then
  raise exception 'legal_preferences_invalid' using errcode='22023';
 end;
 if not isfinite(acknowledged_value)
 or acknowledged_value<timestamptz '2000-01-01 00:00:00+00'
 or acknowledged_value>clock_timestamp()+interval '5 minutes' then
  raise exception 'legal_preferences_invalid' using errcode='22023';
 end if;
 insert into public.legal_preference_receipts
 (user_id,privacy_version,transfer_version,terms_version,supabase,google,github,source,acknowledged_at)
 values(target_user,privacy_value,transfer_value,terms_value,
  (preference_payload->>'supabase')::boolean,(preference_payload->>'google')::boolean,
  (preference_payload->>'github')::boolean,source_value,acknowledged_value)
 on conflict do nothing returning id into receipt_id;
 if receipt_id is null then
  select r.id into receipt_id from public.legal_preference_receipts r
  where r.user_id=target_user and r.privacy_version=privacy_value
  and r.transfer_version=transfer_value and r.terms_version is not distinct from terms_value
  and r.source=source_value and r.acknowledged_at=acknowledged_value
  and r.supabase=(preference_payload->>'supabase')::boolean
  and r.google=(preference_payload->>'google')::boolean
  and r.github=(preference_payload->>'github')::boolean;
 end if;
 return receipt_id;
end $$;
revoke all on function public.append_legal_preference_receipt(uuid,jsonb) from public,anon,authenticated;

create or replace function public.record_legal_preferences(preference_payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then
  raise exception 'legal_preferences_auth_required' using errcode='42501';
 end if;
 return public.append_legal_preference_receipt(auth.uid(),preference_payload);
end $$;
revoke all on function public.record_legal_preferences(jsonb) from public,anon,authenticated;
grant execute on function public.record_legal_preferences(jsonb) to authenticated;

create or replace function public.capture_signup_legal_preferences()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb;
begin
 select raw_user_meta_data->'legal_preferences' into payload from auth.users where id=new.id;
 -- Legacy accounts are not silently opted in. Only explicit signup metadata
 -- present at profile creation is captured; later metadata edits have no effect.
 if payload is not null then
  perform public.append_legal_preference_receipt(new.id,payload);
 end if;
 return new;
end $$;
revoke all on function public.capture_signup_legal_preferences() from public,anon,authenticated;
drop trigger if exists capture_signup_legal_preferences on public.profiles;
create trigger capture_signup_legal_preferences after insert on public.profiles
 for each row execute function public.capture_signup_legal_preferences();

notify pgrst,'reload schema';
commit;
