-- The product no longer offers private profiles; keep blocking and chat privacy intact.
update public.profiles set is_private=false where is_private;
update public.user_follows set status='accepted' where status='pending';
revoke update(is_private) on public.profiles from authenticated;
create or replace function public.keep_profiles_public() returns trigger language plpgsql set search_path='' as $$begin new.is_private:=false;return new;end $$;
drop trigger if exists keep_profiles_public on public.profiles;
create trigger keep_profiles_public before insert or update of is_private on public.profiles for each row execute function public.keep_profiles_public();
notify pgrst,'reload schema';
