-- Exact country-document topics avoid merging distinct checklist items.
insert into public.forum_categories(id,name) values('visa-fee','Vize ücreti') on conflict(id) do update set name=excluded.name;
insert into public.forum_categories(id,name)
select 'document-'||id::text,title from public.country_documents
on conflict(id) do update set name=excluded.name;
create or replace function public.sync_document_topic() returns trigger
language plpgsql security definer set search_path='' as $$ begin
 insert into public.forum_categories(id,name) values('document-'||new.id::text,new.title) on conflict(id) do update set name=excluded.name;
 return new;
end $$;
revoke all on function public.sync_document_topic() from public,anon,authenticated;
drop trigger if exists sync_document_topic on public.country_documents;
create trigger sync_document_topic after insert or update of title on public.country_documents for each row execute function public.sync_document_topic();
create or replace function public.check_post_document_topic() returns trigger
language plpgsql security definer set search_path='' as $$ begin
 if new.kind='tip' and left(coalesce(new.category_id,''),9)='document-' and not exists(
  select 1 from public.country_documents d where 'document-'||d.id::text=new.category_id and d.country_id=new.country_id
 ) then raise exception 'Document must belong to selected country' using errcode='23514';end if;
 return new;
end $$;
revoke all on function public.check_post_document_topic() from public,anon,authenticated;
drop trigger if exists check_post_document_topic on public.posts;
create trigger check_post_document_topic before insert or update of country_id,category_id,kind on public.posts for each row execute function public.check_post_document_topic();
-- An explicitly identified existing BLS fee post was filed under the form topic.
-- Only routing changes; the author's words and publication status remain intact.
update public.posts set category_id='visa-fee'
where id='0542061e-8117-444f-9c79-2d7755095dd4' and country_id='spain' and kind='tip'
and category_id='doc-form' and title='BLS başvuru ücretini nakit istiyor kart geçmiyor';
notify pgrst,'reload schema';
