-- Separate travel/community stories from structured visa-application experiences.
alter type public.post_kind add value if not exists 'general';
notify pgrst,'reload schema';
insert into public.forum_categories(id,name) values('general-experience','Genel deneyim') on conflict(id) do nothing;
