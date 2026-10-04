#!/usr/bin/env python3
from pathlib import Path
import html as H, json, re
from lxml import html as LH

R=Path(__file__).resolve().parents[1]
T=R/'Current Affairs/Topic Names/2026/Topic Wise/AWARDS2026_PROPER_BILINGUAL.html'
P=R/'Current Affairs/Topic Names/Rapid Practice/2026/Topic Wise/Awards_2026_Current_Affairs_Rapid_Practice.html'
I=R/'search-snippets-current-affairs.js'; RI=R/'search-snippets-current-affairs-rapid.js'
records=[]
for f in ('awards_2026_pdf_data1.json','awards_2026_pdf_data2.json'):
    records += json.loads((Path(__file__).with_name(f)).read_text(encoding='utf8'))
assert len(records)==19

def plain(x): return re.sub(r'<[^>]+>','',x)
def card(n,r):
    L='ABCD'; opts=[]
    for i,o in enumerate(r['opts']):
        en,hi=o; c=' correct-option' if i==r['ans'] else ''; ok=' (सही उत्तर ✔)' if i==r['ans'] else ''
        opts.append(f'<li class="option{c}"><span class="opt-en">{L[i]}) {H.escape(en)}</span><span class="opt-hi">{L[i]}) {H.escape(hi)}{ok}</span></li>')
    h=''.join('<li>'+x+'</li>' for x in r['exp_hi']); e=''.join('<li>'+x+'</li>' for x in r['exp_en'])
    return f'''<main class="question-card" id="q{n}"><div class="question-text">Q{n}. {H.escape(r['q_hi'])}<span>{H.escape(r['q_en'])}</span></div><ul class="options">{''.join(opts)}</ul><div class="explanation-box"><div class="lang-section"><h4>📝 स्पष्टीकरण (Hindi)</h4><ul>{h}</ul></div><div class="lang-section"><h4>📝 Explanation (English)</h4><ul>{e}</ul></div></div></main>'''
def rapid_q(r):
    return {'q':{'en':r['q_en'],'hi':r['q_hi']},'o':[{'en':a,'hi':b} for a,b in r['opts']], 'a':{'en':r['opts'][r['ans']][0],'hi':r['opts'][r['ans']][1]}, 'exp':{'en':' '.join(plain(x) for x in r['exp_en']),'hi':' '.join(plain(x) for x in r['exp_hi'])}}

def sync_topic():
    s=T.read_text(encoding='utf8')
    if 'id="q109"' in s:
        assert 'id="q127"' in s; return False
    a=s.index('<main class="question-card" id="q108">'); b=s.index('</main>',a)+7
    T.write_text(s[:b]+'\n\n'+'\n\n'.join(card(109+i,r) for i,r in enumerate(records))+s[b:],encoding='utf8')
    return True

def sync_rapid():
    s=P.read_text(encoding='utf8'); m=re.search(r'(<script id="master-data" type="application/json">)(.*?)(</script>)',s,re.S); d=json.loads(m.group(2))
    main=[]; drills=[]
    for sec in d:
        if sec['title']['en'].startswith('Main MCQs'): main+=sec['questions']
        elif sec['title']['en'].startswith('Explanation Drill'): drills+=sec['questions']
    if len(main)>=127:
        assert {r['q_en'] for r in records}<={q['q']['en'] for q in main}; return False
    assert (len(main),len(drills))==(108,223)
    main += [rapid_q(r) for r in records]; nd=[]
    for i in range(0,len(main),30):
        a=i+1;b=min(i+30,len(main));nd.append({'title':{'en':f'Main MCQs Q{a}–Q{b}','hi':f'मुख्य MCQ Q{a}–Q{b}'},'questions':main[i:i+30]})
    for i in range(0,len(drills),30):
        a=i+1;b=min(i+30,len(drills));nd.append({'title':{'en':f'Explanation Drill: Facts {a}–{b}','hi':f'स्पष्टीकरण अभ्यास: तथ्य {a}–{b}'},'questions':drills[i:i+30]})
    payload=json.dumps(nd,ensure_ascii=False,separators=(',',':')).replace('</script>',r'<\/script>')
    s=s[:m.start(2)]+payload+s[m.end(2):]
    s=s.replace('<b>331</b><span>Total Practice</span>','<b>350</b><span>Total Practice</span>').replace('<b>108</b><span>Main MCQs</span>','<b>127</b><span>Main MCQs</span>')
    P.write_text(s,encoding='utf8'); return True

def groups(path):
    s=path.read_text(encoding='utf8'); D=json.JSONDecoder(); out=[]
    for m in re.finditer(r'\.concat\(',s): x,_=D.raw_decode(s[m.end():]);out+=x
    return out
def txt(x): return ' '.join(' '.join(x.itertext()).split())
def cls(c,n):
    x=c.xpath(".//*[contains(concat(' ',normalize-space(@class),' '),' "+n+" ')]"); return txt(x[0]) if x else ''
def write_groups(path,var,g):
    cut=1 if len(g)>1 else len(g)
    path.write_text('// ExamFusion Prep Current Affairs question-level search index.\n'+''.join(f'window.{var} = (window.{var} || []).concat('+json.dumps(x,ensure_ascii=False,separators=(',',':'))+');\n' for x in (g[:cut],g[cut:]) if x),encoding='utf8')

def sync_main_index():
    g=groups(I); z=next(x for x in g if x['f'].endswith('AWARDS2026_PROPER_BILINGUAL.html'))
    tr=LH.fromstring(T.read_bytes()); cs=tr.xpath("//*[contains(concat(' ',normalize-space(@class),' '),' question-card ')]"); cs.sort(key=lambda c:int((c.get('id') or 'q999999')[1:]))
    z['x']=[f"\x01{c.get('id')}\x02{cls(c,'question-text')} Answer: {cls(c,'correct-option')} Explanation: {cls(c,'explanation-box')}" for c in cs]; assert len(z['x'])==127
    write_groups(I,'EF_SNIPPET_INDEX',g)
def sync_rapid_index():
    g=groups(RI); z=next(x for x in g if x['f'].endswith('Awards_2026_Current_Affairs_Rapid_Practice.html'))
    s=P.read_text(encoding='utf8'); d=json.loads(re.search(r'<script id="master-data" type="application/json">(.*?)</script>',s,re.S).group(1)); out=[]; clean=lambda v:' '.join(str(v or '').split())
    for si,sec in enumerate(d):
        for qi,x in enumerate(sec['questions']):
            q=x.get('q',{});a=x.get('a',{});e=x.get('exp',{}); out.append(f"\x01rp-{si}-{qi}\x02{clean(q.get('en'))} {clean(q.get('hi'))} Answer: {clean(a.get('en'))} / {clean(a.get('hi'))}. {clean(e.get('en'))} {clean(e.get('hi'))}")
    assert len(out)==350; z['x']=out; write_groups(RI,'EF_SNIPPET_INDEX_RAPID',g)
def bust():
    tag='20261004awards19'
    for rel in ['Current Affairs/Topic Names.html','homepage-fulltext-search.js','Current Affairs/Topic Names/rapid-search-enhancer.js']:
        p=R/rel; s=p.read_text(encoding='utf8'); p.write_text(re.sub(r'(search-snippets-current-affairs(?:-rapid)?\.js\?v=)[A-Za-z0-9_-]+',r'\g<1>'+tag,s),encoding='utf8')
    p=R/'service-worker.js'; s=p.read_text(encoding='utf8'); p.write_text(re.sub(r'const CACHE_VERSION = "[^"]+";',f'const CACHE_VERSION = "efp-pwa-{tag}";',s,count=1),encoding='utf8')
def validate():
    ids=re.findall(r'<main class="question-card" id="(q\d+)">',T.read_text(encoding='utf8')); assert len(ids)==127 and ids[-1]=='q127'
    s=P.read_text(encoding='utf8'); d=json.loads(re.search(r'<script id="master-data" type="application/json">(.*?)</script>',s,re.S).group(1)); a=sum(len(x['questions']) for x in d if x['title']['en'].startswith('Main MCQs')); b=sum(len(x['questions']) for x in d if x['title']['en'].startswith('Explanation Drill')); assert (a,b,a+b)==(127,223,350)
def main():
    changed=sync_topic()|sync_rapid(); validate(); sync_main_index(); sync_rapid_index()
    if changed: bust()
    print('Awards 2026 synced: 127 topic MCQs; Rapid Practice 350 = 127 main + 223 drills.')
if __name__=='__main__': main()
