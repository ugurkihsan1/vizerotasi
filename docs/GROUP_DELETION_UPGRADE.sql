-- Supabase SQL Editor: requires the existing sharing groups update (010).
begin;
-- Owners, active group managers and application admins can remove a group.
-- This capability does not grant non-member admins access to its private feed.
create or replace function public.sharing_remove_group(target uuid) returns void
language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 perform 1 from public.sharing_groups where id=target for update;
 if not found then return;end if;
 if not (public.sharing_is_manager(target) or public.is_admin()) then
  raise exception 'Group removal forbidden' using errcode='42501';
 end if;
 delete from public.sharing_groups where id=target;
end $$;
revoke all on function public.sharing_remove_group(uuid) from public,anon;
grant execute on function public.sharing_remove_group(uuid) to authenticated;
notify pgrst,'reload schema';

commit;
