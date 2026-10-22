"""Regenerate the additive country seed from the reviewed, source-linked catalog."""
import json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
countries = json.loads((root / 'src/content/country-guides.json').read_text())
keys = ['id','country_id','title','body','category','source_url','visa_type','sort_order','requirement','source_name','source_document','source_type','source_scope','source_updated_at','source_checked_at','topic_ids']
documents = [{k: d[k] for k in keys} for c in countries for d in c['documents']]
rows = [{k: c[k] for k in ['id','name','code','flag','is_schengen']} for c in countries]
cols = ','.join(keys)
sql = '''-- Official-source catalog. Additive and repeatable; existing administrator edits are preserved.
-- Run after migration 002; publication dates are not inferred from retrieval dates.
alter table public.countries add column if not exists is_schengen boolean not null default false;
alter table public.country_documents add column if not exists source_checked_at date;
alter table public.country_documents add column if not exists topic_ids text[] not null default '{}';
insert into public.countries(id,name,code,flag,is_schengen)
select * from jsonb_to_recordset($countries$'''+json.dumps(rows,ensure_ascii=False)+'''$countries$::jsonb) as c(id text,name text,code text,flag text,is_schengen boolean) on conflict(id) do nothing;
insert into public.country_documents('''+cols+''')
select '''+cols+''' from jsonb_to_recordset($documents$'''+json.dumps(documents,ensure_ascii=False)+'''$documents$::jsonb) as d(id uuid,country_id text,title text,body text,category text,source_url text,visa_type text,sort_order integer,requirement text,source_name text,source_document text,source_type text,source_scope text,source_updated_at date,source_checked_at date,topic_ids text[]) on conflict(id) do nothing;
'''
(root / 'supabase/migrations/202610220006_country_guides.sql').write_text(sql)
parts = ['202610220002_spain_tourism.sql','202610220005_instant_comments.sql','202610220006_country_guides.sql']
(root / 'docs/COUNTRIES_AND_COMMENTS_UPGRADE.sql').write_text('-- Supabase SQL Editor: run the COMPLETE file. Repeatable; existing edits/removed comments stay intact.\n-- Requires the existing base schema (001). Does not reinstall or reset community badge rules (004).\nbegin;\n'+'\n'.join((root/'supabase/migrations'/p).read_text() for p in parts)+'\ncommit;\n')
print(f'{len(countries)} country records; {len(documents)} official document records')
