#!/usr/bin/env python3
"""Refresh publication metadata for the reviewed Ecology batch."""
import json,re
from pathlib import Path
from urllib.parse import quote,unquote
ROOT=Path(__file__).resolve().parents[1]
plan=json.loads((ROOT/'audits/ecology-mindmaps/corrections.json').read_text())
rev=plan['revision']
def update(name,fn):
    p=ROOT/name;raw=p.read_text();new=fn(raw)
    if new!=raw:p.write_text(new)
for name in ['homepage-fulltext-search.js','Mind Maps/SubjectName.html']:
    update(name,lambda s:re.sub(r'(search-snippets-mindmaps\.js\?v=)[A-Za-z0-9_-]+',lambda m:m[1]+rev,s))
for name in ['index.html','service-worker.js']:
    update(name,lambda s:re.sub(r'(homepage-fulltext-search\.js\?v=)[A-Za-z0-9_-]+',lambda m:m[1]+rev,s))
update('service-worker.js',lambda s:re.sub(r'const CACHE_VERSION = "[^"]+";',f'const CACHE_VERSION = "efp-pwa-{rev}";',s,count=1))
targets={c['file'] for c in plan['chapters']}|{'Mind Maps/SubjectName.html'}
def sitemap(raw):
    def entry(m):
        block=m[0];loc=re.search(r'<loc>(.*?)</loc>',block)
        if not loc:return block
        url=unquote(loc[1]).split('examfusionprep.com/',1)[-1]
        if url not in targets:return block
        if '<lastmod>' in block:return re.sub(r'<lastmod>.*?</lastmod>','<lastmod>2026-10-21</lastmod>',block)
        return block.replace('</loc>','</loc><lastmod>2026-10-21</lastmod>',1)
    return re.sub(r'<url>.*?</url>',entry,raw,flags=re.S)
update('sitemap.xml',sitemap)
print('PASS: publication revision '+rev)

