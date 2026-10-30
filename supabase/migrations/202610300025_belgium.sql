-- Add Belgium to the shared country list used by Discover, communities and posts.
-- Preserve any country record already added or edited by an administrator.
insert into public.countries (id, name, code, flag, is_schengen)
values ('belgium', 'Belçika', 'BE', '🇧🇪', true)
on conflict do nothing;
