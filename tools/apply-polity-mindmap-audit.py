#!/usr/bin/env python3
"""Replay source-backed Polity mind-map corrections without reserialising HTML."""
import hashlib
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
PLAN = json.loads((ROOT / 'audits/polity-mindmaps/corrections.json').read_text())
sha = lambda text: hashlib.sha256(text.encode()).hexdigest()
source = (ROOT / 'Original Practice/Polity_Complete_Practice.html').read_text()
assert sha(source) == PLAN['source_sha256'], 'Original Practice changed; re-review the audit'
master = json.loads(re.search(r'<script id="master-data"[^>]*>(.*?)</script>', source, re.S)[1])
chapters = list(next(iter(master.values())).values())
check = '--check' in sys.argv
count = 0
for chapter in PLAN['chapters']:
    path = ROOT / chapter['file']
    raw = path.read_text()
    for edit in chapter['edits']:
        for ref in edit['refs']:
            section, question = map(int, re.fullmatch(r'S(\d+)Q(\d+)', ref).groups())
            assert chapters[chapter['number'] - 1][section - 1]['questions'][question - 1]
    if sha(raw) == chapter['updated_sha256']:
        print(f"Chapter {chapter['number']:02}: verified")
        continue
    assert not check, f'{path}: reviewed output does not match'
    assert sha(raw) == chapter['base_sha256'], f'{path}: concurrent change; re-review required'
    for edit in chapter['edits']:
        for patch in reversed(edit['replay']):
            start, end = patch['start'], patch['end']
            assert raw[start:end] == patch['before'], f'{path}: replay mismatch'
            raw = raw[:start] + patch['after'] + raw[end:]
        count += 1
    assert sha(raw) == chapter['updated_sha256'], f'{path}: output fingerprint mismatch'
    path.write_text(raw)
print(f'{count} correction rules replayed; {len(PLAN["chapters"])} chapters verified.')
