#!/usr/bin/env python3
"""Synchronize only reviewed Biology search groups, preserving other groups."""
import importlib.util,json,re,sys
from pathlib import Path
from urllib.parse import unquote
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('mindmap_index',ROOT/'tools/sync-history-mindmap-index.py')
indexer=importlib.util.module_from_spec(spec);spec.loader.exec_module(indexer)
plan=json.loads((ROOT/'audits/biology-mindmaps/corrections.json').read_text())
selected={c['file'] for c in plan['chapters']}
path=ROOT/'search-snippets-mindmaps.js';raw=path.read_text();replacements=[];seen=set()
for start,end,g in indexer.group_spans(raw):
    f=unquote(g['f']).removeprefix('./')
    if f not in selected: continue
    seen.add(f);updated=dict(g);updated['x']=indexer.extract((ROOT/f).read_text())
    if updated!=g: replacements.append((start,end,json.dumps(updated,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')))
assert seen==selected,'Missing or duplicate reviewed search groups'
if '--check' in sys.argv: assert not replacements,f'{len(replacements)} groups need refresh'
else:
    for start,end,new in reversed(replacements): raw=raw[:start]+new+raw[end:]
    if replacements:path.write_text(raw)
print(f"PASS: {len(selected)} reviewed Biology search groups; refreshed {len(replacements)}")
