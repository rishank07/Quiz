"""Content integrity and saved-progress checks for the full CA explanation sync."""
import importlib,json,re,subprocess,collections
from pathlib import Path
from lxml import html
s=importlib.import_module('sync-current-affairs-explanations')
ROOT=s.ROOT
report=json.loads((ROOT/'audits/current-affairs/full-explanations-20261031.json').read_text())
base=report.get('source_commit','58d95fd94b8c7c4ab750a521ff33430f023bc707')
dynamic=json.loads(subprocess.check_output(['node',str(ROOT/'tools/export-ca-dynamic.cjs'),'--ref',base],cwd=ROOT,text=True))
changes=[];counts=collections.Counter();bad=[]
for p in sorted(s.QUIZ.rglob('*.html')):
    rel=str(p.relative_to(ROOT));after=p.read_text();before=subprocess.check_output(['git','show',base+':'+rel],cwd=ROOT,text=True)
    old_match=s.MASTER.search(before);old=json.loads(old_match[2]) if old_match else dynamic[p.name]
    new=json.loads(s.MASTER.search(after)[2]);a,b=s.sections(old),s.sections(new)
    assert [len(x['questions']) for x in a]==[len(x['questions']) for x in b],rel+': section/question positions changed'
    bank=json.loads(re.search(r'<script id="efp-ca-facts"[^>]*>([\s\S]*?)</script>',after)[1])
    assert after.count('src="/ca-explanations.js?')==1,rel
    assert after.count('id="efp-ca-facts"')==1,rel
    assert 'EFP_CA_EXPLANATIONS.render' in after or 'rapid-runtime.js?v=20261031full1' in after,rel
    old_store=re.findall(r'(?:const|let|var)\s+STORE\s*=\s*([^,;]+)',before)
    assert all(key in after for key in old_store),rel+': storage key changed'
    for si,(os,ns) in enumerate(zip(a,b)):
        for qi,(oq,nq) in enumerate(zip(os['questions'],ns['questions'])):
            counts['questions']+=1
            oi=next(i for i,o in enumerate(oq['o']) if o['en']==oq['a']['en']);ni=next(i for i,o in enumerate(nq['o']) if o['en']==nq['a']['en'])
            assert oi==ni,(rel,si,qi,'correct option position changed')
            assert len(oq['o'])==len(nq['o']) and 2<=len(nq['o'])<=4,(rel,si,qi,'option count changed')
            if oq['a']['en']!=nq['a']['en']:
                assert s.NOTE.search(oq['a']['en']) or 'Kheda Satyagraha' in oq['a']['en'],(rel,si,qi,'unexpected answer change')
                changes.append({'quiz':rel,'position':[si,qi],'old':oq['a']['en'],'new':nq['a']['en'],'correct_option_index':ni})
            assert sum(o['en']==nq['a']['en'] for o in nq['o'])==1,(rel,si,qi,'duplicate correct option')
            assert not any(s.NOTE.search(o['en']) for o in nq['o']),(rel,si,qi,'editing note remains in options')
            facts=bank[nq['exp_ref']]
            assert facts and all(pair['en'].strip() and pair['hi'].strip() for pair in facts),(rel,si,qi,'empty explanation')
            assert not any(re.match(r'^(?:<b>)?(Answer|उत्तर)\s*:',pair['en'],re.I) for pair in facts),(rel,si,qi,'generic answer bullet')
            if not nq['exp_ref'].startswith('extra-'):counts['source_linked_questions']+=1
            if 'Chief Justice Of Kerala High Court' in nq['q']['en']:
                assert 'Patna' not in ' '.join(pair['en'] for pair in facts),(rel,si,qi,'Kerala matched to Patna')
            if 'Executive Director of RBI' in nq['q']['en']:
                assert 'SEBI' not in ' '.join(pair['en'] for pair in facts),(rel,si,qi,'RBI matched to SEBI')
            if 'which fact correctly gives “Rajesh Kumar Singh”' in nq['q']['en']:
                assert 'Rajesh Kumar Singh' in ' '.join(pair['en'] for pair in facts),(rel,si,qi,'DRDO context mismatch')
    source=s.source_for(p);nodes=s.source_records(source);node_map={r['id']:r for r in nodes}
    for key,facts in bank.items():
        if key.startswith('extra-'):continue
        rec=node_map[key]
        for lang in ('en','hi'):
            original=[s.strip_html(v) for v in rec['facts'][lang]]
            actual=[s.strip_html(pair[lang]) for pair in facts]
            assert original==actual,(rel,key,lang,'reading/quiz explanation mismatch')
        counts['paired_fact_sets']+=1
    for script in html.fromstring(after).xpath('//script[not(@src)]'):
        if 'json' in script.get('type',''):continue
        # Compile actual inline scripts without running analytics or page actions.
        code=script.text or ''
        if code.strip():
            result=subprocess.run(['node','-e','new (require("node:vm").Script)(require("node:fs").readFileSync(0,"utf8"))'],input=code,text=True,capture_output=True)
            assert result.returncode==0,(rel,result.stderr)
    counts['quizzes']+=1
audit=ROOT/'audits/current-affairs/full-explanations-20261031.json';report=json.loads(audit.read_text())
report['answer_changes']=changes;report['validation']=dict(counts);report['source_commit']='58d95fd94b8c7c4ab750a521ff33430f023bc707'
if '--record' in __import__('sys').argv:audit.write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('PASS',json.dumps(dict(counts)), 'reviewed answer replacements',len(changes))
