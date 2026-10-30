-- Run after 202610290023_legal_preferences.sql, before enabling OAuth providers.
alter table public.profiles add column if not exists needs_onboarding boolean not null default false;
-- This flag is changed only by the completion RPC, never a direct client UPDATE.

create or replace function public.handle_signup()
returns trigger language plpgsql security definer set search_path='' as $$
declare
 social boolean := coalesce(new.raw_app_meta_data->>'provider','') in ('google','apple');
 chosen_username text;
 chosen_name text;
 constraint_name text;
begin
 if not social then
  if new.raw_user_meta_data->>'terms_accepted' is distinct from 'true'
   or new.raw_user_meta_data->>'privacy_accepted' is distinct from 'true' then
   raise exception 'Consent required';
  end if;
  insert into public.profiles(id,username,display_name)
   values(new.id,lower(new.raw_user_meta_data->>'username'),new.raw_user_meta_data->>'display_name');
 else
  chosen_name := left(btrim(coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name','')),60);
  if length(chosen_name)<2 then chosen_name:='Yeni Üye'; end if;
  chosen_username := 'uye_' || left(replace(new.id::text,'-',''),20);
  loop
   begin
    insert into public.profiles(id,username,display_name,needs_onboarding)
     values(new.id,chosen_username,chosen_name,true);
    exit;
   exception when unique_violation then
    get stacked diagnostics constraint_name = CONSTRAINT_NAME;
    if constraint_name <> 'profiles_username_key' then raise; end if;
    chosen_username := 'uye_' || left(replace(gen_random_uuid()::text,'-',''),20);
   end;
  end loop;
 end if;
 insert into public.notification_preferences(user_id) values(new.id);
 return new;
end $$;

create or replace function public.complete_social_signup(
 chosen_username text, chosen_name text, accepted_terms boolean,
 accepted_privacy boolean, accepted_transfer boolean, preference_payload jsonb
) returns setof public.profiles language plpgsql security definer set search_path='' as $$
declare owner uuid:=auth.uid(); current_profile public.profiles;
begin
 if owner is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into current_profile from public.profiles where id=owner for update;
 if not found then raise exception 'Profile missing' using errcode='42501'; end if;
 if not current_profile.needs_onboarding then
  return next current_profile;
  return;
 end if;
 chosen_username:=lower(btrim(chosen_username));
 chosen_name:=btrim(chosen_name);
 if chosen_username is null or chosen_username !~ '^[a-z0-9_]{3,24}$'
  or chosen_name is null or length(chosen_name) not between 2 and 60 then
  raise exception 'Invalid profile' using errcode='22023';
 end if;
 if accepted_terms is distinct from true or accepted_privacy is distinct from true
  or accepted_transfer is distinct from true
  or (preference_payload->>'supabase') is distinct from 'true'
  or nullif(btrim(preference_payload->>'termsVersion'),'') is null then
  raise exception 'Consent required' using errcode='22023';
 end if;
 -- A failed receipt or taken username rolls back the entire completion.
 perform public.append_legal_preference_receipt(owner,preference_payload);
 return query update public.profiles set username=chosen_username,
  display_name=chosen_name,needs_onboarding=false where id=owner returning *;
end $$;
revoke all on function public.complete_social_signup(text,text,boolean,boolean,boolean,jsonb) from public,anon,authenticated;
grant execute on function public.complete_social_signup(text,text,boolean,boolean,boolean,jsonb) to authenticated;
