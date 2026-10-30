"""Refresh existing CA search anchors after the paired explanation sync.

Index the complete context once per source fact set. Revision-drill results keep
their targeted fact so the search payload does not repeat entire explanations.
"""
import importlib, json, re
from pathlib import Path
from urllib.parse import unquote
from lxml import html

sync=importlib.import_module('sync-current-affairs-explanations')
ROOT=sync.ROOT
def compact(x):return json.dumps(x,ensure_ascii=False,separators=(',',':'))
def text(node):return ' '.join(' '.join(node.itertext()).split())
def concat_groups(raw):
    groups=[];decoder=json.JSONDecoder()
    for m in re.finditer(r'\.concat\(',raw):groups.extend(decoder.raw_decode(raw[m.end():])[0])
    return groups
def cards(path):
    t=html.fromstring(path.read_bytes())
    return {n.get('id'):n for n in t.xpath('//*[@id]') if n.get('id')}
def refresh_reading():
    p=ROOT/'search-snippets-current-affairs.js';groups=concat_groups(p.read_text());count=0
    for group in groups:
        file=ROOT/unquote(group['f']).removeprefix('./')
        if '/2026/' not in group['f'] or not file.exists():continue
        nodes=cards(file)
        for i,old in enumerate(group['x']):
            anchor=re.match('\x01([^\x02]+)\x02',old)
            if anchor and anchor[1] in nodes:group['x'][i]='\x01'+anchor[1]+'\x02'+text(nodes[anchor[1]]);count+=1
    p.write_text('// Current Affairs question, options and complete bilingual explanation.\nwindow.EF_SNIPPET_INDEX=(window.EF_SNIPPET_INDEX||[]).concat('+compact(groups)+');\n')
    print('Reading search anchors:',count)
    p=ROOT/'Current Affairs/Topic Names/search-index.js';raw=p.read_text();start=raw.index('[');data,end=json.JSONDecoder().raw_decode(raw[start:]);count=0
    loaded={}
    for item in data:
        file=ROOT/'Current Affairs'/unquote(item['f']).removeprefix('./')
        if '/2026/' not in item['f'] or not file.exists():continue
        if file not in loaded:loaded[file]=cards(file)
        number=re.match(r'Q(\d+)',item['x'])
        if number and 'q'+number[1] in loaded[file]:item['x']=text(loaded[file]['q'+number[1]]);count+=1
    p.write_text(raw[:start]+compact(data)+raw[start+end:])
    print('Section search anchors:',count)
def refresh_rapid():
    for name,global_name,concat in [('search-snippets-current-affairs-rapid.js','EF_SNIPPET_INDEX_RAPID',True),('search-snippets-current-affairs-rapid-extra.js','EF_RAPID_EXTRA_INDEX',False)]:
        p=ROOT/name;raw=p.read_text();groups=concat_groups(raw) if concat else json.JSONDecoder().raw_decode(raw[raw.index('['):])[0];count=0
        if not concat and not any('BRICS_2026' in g['f'] for g in groups):
            file=next(sync.QUIZ.rglob('BRICS_2026*.html'));page=file.read_text();data=sync.sections(json.loads(sync.MASTER.search(page)[2]))
            groups.append({'f':'./'+str(file.relative_to(ROOT)).replace(' ','%20'),'t':'BRICS 2026 Rapid Practice','b':'Current Affairs / Rapid Practice / 2026 / Topic Wise','x':['\x01rp-'+str(si)+'-'+str(qi)+'\x02' for si,s in enumerate(data) for qi,q in enumerate(s['questions'])]})
        for group in groups:
            file=ROOT/unquote(group['f']).removeprefix('./')
            if '/2026/' not in group['f'] or not file.exists():continue
            page=file.read_text();d=json.loads(sync.MASTER.search(page)[2]);bank=json.loads(re.search(r'<script id="efp-ca-facts"[^>]*>([\s\S]*?)</script>',page)[1]);entries={};seen=set()
            for si,section in enumerate(sync.sections(d)):
                for qi,q in enumerate(section['questions']):
                    ref=q['exp_ref']
                    if ref not in seen:
                        context=' '.join(sync.strip_html(pair['en'])+' '+sync.strip_html(pair['hi']) for pair in bank[ref]);seen.add(ref)
                    else:
                        vals=q.get('exp',{});context=' '.join(' '.join(v) if isinstance(v,list) else v for v in vals.values())
                        if sync.NOTE.search(context):context=' '.join(sync.strip_html(pair['en'])+' '+sync.strip_html(pair['hi']) for pair in bank[ref])
                    anchor=f'rp-{si}-{qi}'
                    entries[anchor]='\x01'+anchor+'\x02'+q['q']['en']+' '+q['q']['hi']+' Answer: '+q['a']['en']+' '+q['a']['hi']+' Explanation: '+context
            for i,old in enumerate(group['x']):
                anchor=re.match('\x01([^\x02]+)\x02',old)
                if anchor and anchor[1] in entries:group['x'][i]=entries[anchor[1]];count+=1
        p.write_text('// CA quiz anchors: complete source context plus targeted revision facts.\nwindow.'+global_name+('=(window.'+global_name+'||[]).concat(' if concat else '=')+compact(groups)+(');\n' if concat else ';\n'))
        print(name,count)
if __name__=='__main__':refresh_reading();refresh_rapid()
