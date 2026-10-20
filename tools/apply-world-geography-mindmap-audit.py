#!/usr/bin/env python3
"""Verify sequential, source-referenced World Geography edits against original Git blobs."""
import hashlib,json,re,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
plan=json.loads((ROOT/'audits/world-geography-mindmaps/corrections.json').read_text())
blob=lambda b:hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
raw=(ROOT/plan['source']).read_bytes()
assert blob(raw)==plan['source_blob_sha'],'Original Practice changed: re-review source'
master=json.loads(re.search(r'<script id="master-data"[^>]*>(.*?)</script>',raw.decode(),re.S)[1])
chapters=list(next(v for k,v in master.items() if 'world' in k.lower()).values())
assert len(chapters)==29
assert [c['number'] for c in plan['chapters']]==list(range(1,len(plan['chapters'])+1))
total=0
for c in plan['chapters']:
    original=subprocess.check_output(['git','cat-file','-p',c['base_blob_sha']],cwd=ROOT)
    assert blob(original)==c['base_blob_sha']
    text=original.decode()
    for e in c['edits']:
        assert text[e['start']:e['end']]==e['before'],f"Replay mismatch: chapter {c['number']}"
        for ref in e['source']:
            si,qi=map(int,re.fullmatch(r'S(\d+)Q(\d+)',ref['ref']).groups())
            q=chapters[c['number']-1][si-1]['questions'][qi-1]
            assert [q['q']['en'],q['a']['en'],q.get('exp',{}).get('en','')]==[ref['q'],ref['a'],ref['exp']],'Source citation changed'
        text=text[:e['start']]+e['after']+text[e['end']:]
        total+=1
    assert blob(text.encode())==c['result_blob_sha'],'Reviewed output hash mismatch'
    assert (ROOT/c['file']).read_bytes()==text.encode(),'Reviewed page differs from replay'
print(f"PASS: {total} source-referenced edits across {len(plan['chapters'])} chapters; exact replay and Original Practice fingerprint")
