#!/usr/bin/env python3
from __future__ import annotations
import json, re
from pathlib import Path
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[1]
PRACTICE = ROOT / 'Original Practice'
ECO_FILE = 'Environment_Ecology_Complete_Practice.html'
ECO_PATH = PRACTICE / ECO_FILE
TOTAL_Q = 41418
TOTAL_CH = 163
ECO_Q = 527
ECO_CH = 8
ECO_SUBJECT = 'Environment & Ecology'
ECO_HI = 'पर्यावरण एवं पारिस्थितिकी'


def read(path): return path.read_text(encoding='utf-8')
def write(path, text): path.write_text(text, encoding='utf-8')
def must(cond, msg):
    if not cond: raise RuntimeError(msg)

def master_from(path):
    text = read(path)
    m = re.search(r'<script id="master-data" type="application/json">\s*([\s\S]*?)\s*</script>', text)
    must(m, f'master-data missing: {path}')
    return json.loads(m.group(1))

def count_master(master):
    q=0; ch=0; groups=[]
    for name, chapters in master.items():
        gq=0
        for sections in chapters.values():
            ch += 1
            for sec in sections:
                gq += len(sec.get('questions', []))
        q += gq
        groups.append({'name':name,'chapters':len(chapters),'questions':gq})
    return q,ch,groups

def split_chapter(ch):
    parts=str(ch).split(' - ')
    if len(parts)>1 and re.search(r'[\u0900-\u097f]',parts[-1]):
        return ' - '.join(parts[:-1]), parts[-1]
    if ' / ' in ch:
        a,b=ch.split(' / ',1); return a,b
    return ch,''

def qs(params): return urlencode(params)

def chapter_records(master, rootrel):
    out=[]
    for subject, chapters in master.items():
        for chapter in chapters:
            en,hi=split_chapter(chapter)
            out.append({'title': f'{en}{" / "+hi if hi else ""}',
                        'url': f'{rootrel}{ECO_FILE}?{qs({"subject":subject,"chapter":chapter})}',
                        'section':'Original Practice',
                        'breadcrumb': f'Original Practice / Environment & Ecology / {subject}',
                        'leaf': True, 'hi': hi})
        out.append({'title':subject,'url':f'{rootrel}{ECO_FILE}?{qs({"subject":subject})}',
                    'section':'Original Practice','breadcrumb':'Original Practice / Environment & Ecology',
                    'leaf':False,'hi':ECO_HI})
    return out

def qtext(q,i):
    parts=[chr(0xE000+i)+q['q']['en']]
    if q['q'].get('hi') != q['q']['en']: parts.append(q['q'].get('hi',''))
    parts.append('Answer: '+q['a']['en'])
    if q['a'].get('hi') != q['a']['en']: parts.append('उत्तर: '+q['a'].get('hi',''))
    parts.append('Explanation: '+q['exp']['en'])
    if q['exp'].get('hi') != q['exp']['en']: parts.append('व्याख्या: '+q['exp'].get('hi',''))
    return ' '.join(x for x in parts if x)

def snippet_records(master):
    out=[]
    for subject, chapters in master.items():
        for chapter, sections in chapters.items():
            for si, sec in enumerate(sections,1):
                title=sec['title']['en']
                if sec['title'].get('hi') != title: title += ' / '+sec['title'].get('hi','')
                out.append({'f':f'./Original%20Practice/{ECO_FILE}?{qs({"subject":subject,"chapter":chapter})}&section={si}',
                            't':title,
                            'b':f'Original Practice / Environment & Ecology / {subject} / {chapter}',
                            'x':[qtext(q,i) for i,q in enumerate(sec['questions'])]})
    return out

def patch_ecology_html(master):
    p=ECO_PATH; text=read(p)
    if 'name="description"' not in text[:5000]:
        text=text.replace('</title>', '</title>\n<meta name="description" content="527 bilingual Environment & Ecology practice MCQs across 8 chapters for SSC, Railway, UPSC and BPSC — with search, bookmarks, progress tracking and dark mode.">',1)
    if 'original-practice.css' not in text:
        text=text.replace('</head>', '<link rel="stylesheet" href="./original-practice.css?v=20260912ecology1">\n</head>',1)
    if 'G-Q1WNRY8ECV' not in text:
        ga='''\n<script async src="https://www.googletagmanager.com/gtag/js?id=G-Q1WNRY8ECV"></script>\n<script>\nwindow.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}\ngtag('js',new Date());gtag('config','G-Q1WNRY8ECV');\n</script>\n'''
        text=text.replace('</head>', ga+'</head>',1)
    if 'data-efp-ecology-footer' not in text:
        footer='''\n<footer data-efp-ecology-footer style="max-width:1100px;margin:30px auto 16px;padding:14px 18px;text-align:center;font:600 12px/1.6 system-ui;color:#64748b">© 2026 ExamFusion Prep. All Rights Reserved. मेहनत आपकी, साथ हमारा 🎯 · <a href="../privacy-policy.html">Privacy Policy</a> · <a href="../support.html">Support</a></footer>\n'''
        text=text.replace('</body>', footer+'</body>',1)
    if 'original-practice.js' not in text:
        scripts='''\n<script src="../search-logic.js?v=20260904v8"></script>\n<script src="./original-practice.js?v=20260912ecology1"></script>\n'''
        text=text.replace('</body>', scripts+'</body>',1)
    write(p,text)

def patch_runtime():
    p=PRACTICE/'original-practice.js'; t=read(p)
    if 'environment_ecology_complete_practice.html' not in t:
        needle=' "economics_complete_practice.html":{slug:"economics",label:"Economics"}'
        must(needle in t,'original-practice CONFIGS economics anchor missing')
        t=t.replace(needle, needle+',\n "environment_ecology_complete_practice.html":{slug:"ecology",label:"Environment & Ecology"}',1)
    if 'var specialIndex=' not in t:
        t=t.replace('var economicsSearch=CFG.slug==="economics";', 'var specialIndex=CFG.slug==="economics"?{file:"../search-snippets-economics-original-practice.js?v=20260908econ1",global:"EF_ECONOMICS_ORIGINAL_PRACTICE_SNIPPET_INDEX"}:CFG.slug==="ecology"?{file:"../search-snippets-ecology-original-practice.js?v=20260912ecology1",global:"EF_ECOLOGY_ORIGINAL_PRACTICE_SNIPPET_INDEX"}:{file:"../search-snippets-original-practice.js?v=20260904v8",global:"EF_ORIGINAL_PRACTICE_SNIPPET_INDEX"};',1)
        t=t.replace('indexUrl:new URL(economicsSearch?"../search-snippets-economics-original-practice.js?v=20260908econ1":"../search-snippets-original-practice.js?v=20260904v8",document.baseURI).href,','indexUrl:new URL(specialIndex.file,document.baseURI).href,',1)
        t=t.replace('globalName:economicsSearch?"EF_ECONOMICS_ORIGINAL_PRACTICE_SNIPPET_INDEX":"EF_ORIGINAL_PRACTICE_SNIPPET_INDEX",','globalName:specialIndex.global,',1)
    must('slug:"ecology"' in t and 'EF_ECOLOGY_ORIGINAL_PRACTICE_SNIPPET_INDEX' in t,'runtime ecology patch failed')
    write(p,t)

def patch_practice_index(master):
    p=PRACTICE/'index.html'; t=read(p)
    t=t.replace('40,891','41,418').replace('155 chapters','163 chapters').replace('155 Chapters','163 Chapters')
    t=t.replace('History · Polity · Science · Geography · Economics','History · Polity · Science · Geography · Economics · Environment & Ecology')
    if 'Environment_Ecology_Complete_Practice.html' not in t:
        anchor='</a></section><section class="features">'
        must(anchor in t,'practice index card insertion anchor missing')
        card='''</a>\n<a class="subject-card" href="./Environment_Ecology_Complete_Practice.html" data-progress-key="efp_visited_originalpractice_ecology" data-total-chapters="8">\n  <div class="subject-top"><span class="subject-icon">🌿</span><span class="original-badge">ORIGINAL</span></div>\n  <h2>Environment &amp; Ecology <span>पर्यावरण एवं पारिस्थितिकी</span></h2><p>527 Questions · 8 Chapters</p><div class="progress-line"><span class="progress-copy">0 / 8 chapters opened</span><span>→</span></div>\n</a></section><section class="features">'''
        t=t.replace(anchor,card,1)
    t=t.replace('original-practice-index.js?v=20260908econ1','original-practice-index.js?v=20260912ecology1')
    write(p,t)

def patch_mixed():
    p=PRACTICE/'Mixed_Practice.html'; t=read(p)
    if "ecology:'Environment_Ecology_Complete_Practice.html'" not in t:
        t=t.replace(" economics:'Economics_Complete_Practice.html'", " economics:'Economics_Complete_Practice.html',\n ecology:'Environment_Ecology_Complete_Practice.html'",1)
    if "ecology:{key:'ecology'" not in t:
        needle=" economics:{key:'economics',label:'Economics',hi:'अर्थशास्त्र',count:2115,file:'economics',groups:['Economics / अर्थशास्त्र'],domain:'economics',kind:'major',icon:'₹'},"
        must(needle in t,'Mixed Practice economics POOL anchor missing')
        eco=" ecology:{key:'ecology',label:'Environment & Ecology',hi:'पर्यावरण एवं पारिस्थितिकी',count:527,file:'ecology',groups:['Environment & Ecology'],domain:'ecology',kind:'major',icon:'🌿'},"
        t=t.replace(needle,needle+'\n'+eco,1)
    t=t.replace("var MAJOR=['history','polity','science','geography','economics'];", "var MAJOR=['history','polity','science','geography','economics','ecology'];")
    t=t.replace('grid-template-columns:repeat(5,minmax(0,1fr))','grid-template-columns:repeat(6,minmax(0,1fr))')
    if "['polity','economics','geography','ecology']" not in t:
        t=t.replace("['polity','economics','geography']", "['polity','economics','geography','ecology']",1)
        t=t.replace("['geography','chemistry','biology']", "['geography','chemistry','biology','ecology']",1)
    must("'ecology'" in t and ECO_FILE in t,'Mixed Practice ecology patch failed')
    write(p,t)

def patch_counts(master):
    p=PRACTICE/'question-counts.json'; data=json.loads(read(p))
    q,ch,groups=count_master(master)
    data['total_questions']=TOTAL_Q; data['total_chapters']=TOTAL_CH
    data.setdefault('subjects',{})['ecology']={'filename':ECO_FILE,'label':'Environment & Ecology','hi':ECO_HI,'slug':'ecology','icon':'fa-leaf','questions':q,'chapters':ch,'subjects':groups}
    write(p,json.dumps(data,ensure_ascii=False,indent=2)+'\n')

def patch_generated_indexes(master):
    records_local=chapter_records(master,'./')
    p=PRACTICE/'original-practice-index.js'; t=read(p)
    m=re.search(r'window\.EFP_ORIGINAL_PRACTICE_INDEX\s*=\s*(\[.*\]);?\s*$',t,re.S); must(m,'OP index JSON parse anchor missing')
    arr=json.loads(m.group(1)); arr=[r for r in arr if ECO_FILE not in str(r.get('url',''))]; arr.extend(records_local)
    write(p,'window.EFP_ORIGINAL_PRACTICE_INDEX = '+json.dumps(arr,ensure_ascii=False,separators=(',',':'))+';\n')
    p=ROOT/'search-index-main.js'; t=read(p)
    m=re.search(r'var\s+SEARCH_INDEX\s*=\s*(\[.*\]);?\s*$',t,re.S); must(m,'main search index JSON parse anchor missing')
    arr=json.loads(m.group(1)); arr=[r for r in arr if ECO_FILE not in str(r.get('url',''))]
    recs=chapter_records(master,'./Original%20Practice/')
    ins=max([i+1 for i,r in enumerate(arr) if r.get('section')=='Original Practice'] or [len(arr)])
    arr[ins:ins]=recs
    write(p,'var SEARCH_INDEX = '+json.dumps(arr,ensure_ascii=False,separators=(',',':'))+';\n')
    sp=ROOT/'search-snippets-ecology-original-practice.js'
    header='// Full-text global-search index for Environment & Ecology Original Practice.\n// Grouped by section; each x[] entry is one MCQ (question + correct answer + explanation).\n// Loaded only after the user searches, keeping the homepage responsive.\n'
    write(sp,header+'window.EF_ECOLOGY_ORIGINAL_PRACTICE_SNIPPET_INDEX = '+json.dumps(snippet_records(master),ensure_ascii=False,separators=(',',':'))+';\n')

def patch_back_parent():
    p=ROOT/'back-parent-map.js'; t=read(p)
    m=re.search(r'window\.EFP_BACK_PARENT_MAP\s*=\s*Object\.freeze\((\{.*\})\);?',t,re.S); must(m,'back parent JSON anchor missing')
    data=json.loads(m.group(1)); data['/Original Practice/'+ECO_FILE]='/Original Practice/index.html'
    data=dict(sorted(data.items()))
    header=f'/* Generated by tools/update-back-parent-map.py. Do not edit manually. */\n/* HTML pages scanned: {len(data)+1}; logical parents: {len(data)} */\n'
    write(p,header+'window.EFP_BACK_PARENT_MAP = Object.freeze('+json.dumps(data,ensure_ascii=False,separators=(',',':'))+');\n')

def patch_home():
    p=ROOT/'index.html'; t=read(p)
    t=t.replace('40,891','41,418').replace('40891','41418')
    t=t.replace('search-index-main.js?v=20260908econ1','search-index-main.js?v=20260912ecology1')
    if 'search-snippets-ecology-original-practice.js' not in t:
        pos=t.find('indexUrl: new URL("search-snippets-economics-original-practice.js')
        must(pos>=0,'home economics search client anchor missing')
        end=t.find('          })',pos); must(end>=0,'home economics search client end missing'); end += len('          })')
        eco=''',\n          efCreateSearchWorker({\n            workerUrl: new URL("search-worker.js?v=20260905cruxroute1", document.baseURI).href,\n            logicUrl: new URL("search-logic.js?v=20260904v8", document.baseURI).href,\n            indexUrl: new URL("search-snippets-ecology-original-practice.js?v=20260912ecology1", document.baseURI).href,\n            mode: "snippet",\n            globalName: "EF_ECOLOGY_ORIGINAL_PRACTICE_SNIPPET_INDEX",\n            sectionPrefix: "./Original%20Practice/",\n            limit: 24\n          })'''
        t=t[:end]+eco+t[end:]
    write(p,t)

def patch_sitemap():
    p=ROOT/'sitemap.xml'; t=read(p)
    t=re.sub(r'(<loc>https://examfusionprep\.com/Original%20Practice/(?:index\.html|History_Complete_Practice\.html|Polity_Complete_Practice\.html|Science_Complete_Practice\.html|Geography_Complete_Practice\.html|Economics_Complete_Practice\.html)</loc>\s*<lastmod>)[^<]+',r'\g<1>2026-09-12',t)
    if ECO_FILE not in t:
        block=f'''  <url>\n    <loc>https://examfusionprep.com/Original%20Practice/{ECO_FILE}</loc>\n    <lastmod>2026-09-12</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n'''
        idx=t.rfind('</urlset>'); must(idx>=0,'sitemap closing tag missing'); t=t[:idx]+block+t[idx:]
    write(p,t)

def patch_service_worker():
    p=ROOT/'service-worker.js'; t=read(p)
    t=re.sub(r'const CACHE_VERSION = "[^"]+";', 'const CACHE_VERSION = "efp-pwa-2026-09-12-v69-ecology-original-practice";', t, count=1)
    write(p,t)

def patch_tool_fallbacks():
    for rel in ['tools/update-home-integrations.py','tools/integrate-economics-original-practice.js']:
        p=ROOT/rel
        if p.exists():
            t=read(p).replace('40891','41418').replace('40,891','41,418')
            write(p,t)

def main():
    must(ECO_PATH.exists(),'Ecology HTML missing')
    master=master_from(ECO_PATH)
    q,ch,groups=count_master(master)
    must(q==ECO_Q and ch==ECO_CH,f'Unexpected Ecology count: {q} questions / {ch} chapters')
    must(len(master)==1 and next(iter(master))==ECO_SUBJECT,f'Unexpected Ecology subject: {list(master)}')
    patch_ecology_html(master)
    patch_runtime()
    patch_practice_index(master)
    patch_mixed()
    patch_counts(master)
    patch_generated_indexes(master)
    patch_back_parent()
    patch_home()
    patch_sitemap()
    patch_service_worker()
    patch_tool_fallbacks()
    must(ECO_FILE in read(PRACTICE/'index.html'),'Ecology card missing from Original Practice index')
    must(ECO_FILE in read(PRACTICE/'Mixed_Practice.html'),'Ecology missing from Mixed Practice')
    must('slug:"ecology"' in read(PRACTICE/'original-practice.js'),'Ecology runtime config missing')
    must('EF_ECOLOGY_ORIGINAL_PRACTICE_SNIPPET_INDEX' in read(ROOT/'search-snippets-ecology-original-practice.js'),'Ecology snippet index missing')
    must('search-snippets-ecology-original-practice.js' in read(ROOT/'index.html'),'Homepage full-text ecology client missing')
    print(json.dumps({'ok':True,'ecology_questions':q,'ecology_chapters':ch,'total_questions':TOTAL_Q,'total_chapters':TOTAL_CH},ensure_ascii=False))

if __name__=='__main__': main()
