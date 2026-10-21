#!/usr/bin/env python3
"""Verify reviewed Chemistry corrections against original Git blobs and audited OP."""
import hashlib,json,re,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
plan=json.loads((ROOT/'audits/chemistry-mindmaps/corrections.json').read_text())
blob=lambda b:hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
raw=(ROOT/plan['source']).read_bytes()
assert blob(raw)==plan['source_blob_sha'],'Original Practice changed: re-review source'
master=json.loads(re.search(r'<script id="master-data"[^>]*>(.*?)</script>',raw.decode(),re.S)[1])
chapters={int(name.split('.')[0]):sections for name,sections in master['Chemistry'].items()}
assert len(chapters)==10
assert sum(len(s['questions']) for sections in chapters.values() for s in sections)==plan['source_questions']
assert [c['number'] for c in plan['chapters']]==list(range(1,11))
total=0
for c in plan['chapters']:
    original=subprocess.check_output(['git','cat-file','-p',c['base_blob_sha']],cwd=ROOT)
    assert blob(original)==c['base_blob_sha']
    text=original.decode()
    for e in c['edits']:
        assert text[e['start']:e['end']]==e['before'],f"Replay mismatch: chapter {c['number']}"
        assert e['source'],'Every edit requires source evidence'
        for ref in e['source']:
            cn,si,qi=map(int,ref['ref'].split(':'))
            q=chapters[cn][si]['questions'][qi]
            assert [q['q']['en'],q['a']['en'],q.get('exp',{}).get('en','')]==[ref['q'],ref['a'],ref['exp']],'Source citation changed'
        text=text[:e['start']]+e['after']+text[e['end']:]
        total+=1
    assert blob(text.encode())==c['result_blob_sha'],'Reviewed output hash mismatch'
    assert (ROOT/c['file']).read_bytes()==text.encode(),'Reviewed page differs from replay'
print(f"PASS: {total} source-referenced edits across 10 Chemistry chapters; exact replay; OP fingerprint and {plan['source_questions']} source questions")
