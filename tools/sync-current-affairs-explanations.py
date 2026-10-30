"""Sync paired reading facts into CA quizzes without moving saved question IDs.

The reading HTML is the content source. Each quiz stores its fact lists once,
and questions refer to their original reading card. Run from the repo root.
"""
import collections, difflib, html as esc, json, re, subprocess
from pathlib import Path
from lxml import html, etree

ROOT=Path(__file__).resolve().parents[1]
READ=ROOT/'Current Affairs/Topic Names/2026'
QUIZ=ROOT/'Current Affairs/Topic Names/Rapid Practice/2026'
MASTER=re.compile(r'(<script[^>]*id=["\']master-data["\'][^>]*>)([\s\S]*?)(</script>)',re.I)
NAMES={'Appointments':'APPOINTMENT2026','Asian_Games':'ASIANGAMES2026','Awards':'AWARDS2026_PROPER_BILINGUAL','BRICS':'BRICS2026','Bills_and_Acts':'BILLSANDACT2026','Books_and_Authors':'BOOKS2026_PROPER_BILINGUAL','Census_2027':'CENSUS2027','Central_Schemes':'CENTRALSCHEMES2026','Commonwealth_Games':'COMMONWEALTHGAMES2026','DRDO_and_Defence':'DRDOANDDEFENCE2026','Days_and_Themes':'DAYSANDTHEME2026','Economic_Survey_2025-26':'ECONOMICSURVEY2026','Environment':'ENVIRONMENT2026','Film_Awards':'FILMSAWARDS2026','First_in_India':'FIRSTININDIA2026_PROPER_BILINGUAL','GI_Tags':'GITAG2026_PROPER_BILINGUAL','Independence_Day':'INDEPENDENCEDAY2026','Index':'INDEX2026_PROPER_BILINGUAL','Military_Exercises':'EXERCISES2026_PROPER_BILINGUAL','MoU':'MOU2026','Name_Changes':'RENAME2026','Science_and_Technology':'SCIENCETECH2026','Sports':'SPORTS2026','State_Schemes':'STATESCHEME2026','Summits_and_Conferences':'SUMMITS2026','Union_Budget_2026-27':'BUDGET2026-27'}

def text(n):return ' '.join(n.itertext()).strip()
def norm(s):return re.sub(r'[^\w]+','',re.sub(r'^Q\s*\d+[.\s:]*','',s,flags=re.I)).casefold()
def sections(d):
    if isinstance(d,list):return d
    return sum((sections(v) for v in d.values()),[])
def jsontext(d):return json.dumps(d,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
def source_for(p):
    stem=p.name.replace('_2026_Current_Affairs_Rapid_Practice.html','').replace('_Current_Affairs_Rapid_Practice.html','').replace('_Rapid_Practice.html','')
    key=NAMES.get(stem,stem.upper()+'2026')
    return next(READ.rglob(key+'.html'))
def strip_html(s):return ' '.join(html.fragment_fromstring('<div>'+s+'</div>').itertext()).strip()

def source_records(p):
    tree=html.fromstring(p.read_bytes());out=[]
    for card in tree.xpath('//*[contains(concat(" ",normalize-space(@class)," ")," question-card ")]'):
        qs=card.xpath('.//*[@class="question-text"]')
        if not qs:continue
        qn=qs[0];spans=qn.xpath('./span');en=text(spans[-1]) if spans and not re.search('[\u0900-\u097f]',text(spans[-1])) else (qn.text or text(qn))
        facts={}
        for lang in card.xpath('.//*[contains(concat(" ",normalize-space(@class)," ")," lang-section ")]'):
            heading=' '.join(lang.xpath('.//h4//text()'))
            code='en' if 'English' in heading else 'hi'
            facts[code]=[etree.tostring(li,encoding='unicode',method='html') for li in lang.xpath('.//li')]
        out.append({'id':card.get('id'),'q':en,'facts':facts,'key':norm(en),'body':norm(strip_html(' '.join(facts.get('en',[])))),'node':card})
    return out

def match(q,records):
    stem=q['q']['en']
    for pattern in [r'^Regarding\s+[“"](.+?)[”"]\s*,?\s*(?:which|—)',r'additional fact is correct regarding\s+“(.+)”\s*\?',r'item\s+“(.+)”\s*,\s*which']:
        m=re.search(pattern,stem,re.I)
        if m:stem=m.group(1);break
    key=norm(stem)
    exact=[r for r in records if r['key']==key]
    if len(exact)==1:return exact[0],'exact'
    if exact:
        # Same question may be repeated with distinct options: use its answer.
        hit=[r for r in exact if norm(q['a']['en']) in r['body']]
        if len(hit)==1:return hit[0],'answer-disambiguated'
        if all(r['facts']==exact[0]['facts'] for r in exact):return exact[0],'identical'
        answers=[]
        for r in exact:
            nodes=r['node'].xpath('.//*[contains(concat(" ",normalize-space(@class)," ")," correct-option ")]//*[contains(@class,"opt-en")]')
            if nodes and norm(q['a']['en']) in norm(text(nodes[0])):answers.append(r)
        if len(answers)==1:return answers[0],'correct-option'
        if re.match(r'Regarding|Which additional fact',q['q']['en'],re.I):return exact[0],'shared-parent'
    exp=q.get('exp',{}).get('en','')
    if isinstance(exp,list):exp=' '.join(exp)
    exp=re.sub(r'^(Answer|Fact|Verified fact):\s*','',exp,flags=re.I)
    if q.get('exp_html',{}).get('en'):
        exp=strip_html(q['exp_html']['en'])
        exp=re.sub(r'^Answer:\s*.*?\.\s*','',exp)
    ek=norm(exp)
    if len(ek)>=16:
        hits=[r for r in records if ek in r['body'] or (len(r['body'])>45 and r['body'] in ek)]
        if len(hits)==1:return hits[0],'explanation'
    labels=[]
    for r in records:
        fs=r['facts'].get('en',[])
        if fs:
            label=strip_html(fs[0]).split(':')[0];lk=norm(label)
            if 14<=len(lk)<=75 and lk in key:labels.append(r)
    if len(labels)==1 and norm(q['a']['en']) in labels[0]['body']:return labels[0],'subject'
    candidates=[]
    for r in records:
        sm=difflib.SequenceMatcher(None,key,r['key'])
        if sm.real_quick_ratio()>=.91 and sm.quick_ratio()>=.91:candidates.append((sm.ratio(),r))
    ranked=sorted(candidates,key=lambda x:-x[0])
    # Similar wording alone is unsafe: RBI/SEBI and Kerala/Patna differ by
    # only one token. Require the existing answer in the candidate facts.
    if ranked and ranked[0][0]>=.91 and (len(ranked)<2 or ranked[0][0]-ranked[1][0]>.025) and norm(q['a']['en']) in ranked[0][1]['body']:return ranked[0][1],'fuzzy'
    return None,'unmatched'

def inventory():
    dynamic=json.loads(subprocess.check_output(['node',str(ROOT/'tools/export-ca-dynamic.cjs')],text=True)) if any(not MASTER.search(p.read_text()) for p in QUIZ.rglob('*.html')) else {}
    result=[];unmatched=[]
    for p in sorted(QUIZ.rglob('*.html')):
        h=p.read_text();m=MASTER.search(h);d=json.loads(m[2]) if m else dynamic[p.name]
        source=source_for(p);records=source_records(source);counts=collections.Counter()
        for si,s in enumerate(sections(d)):
            for qi,q in enumerate(s['questions']):
                r,kind=match(q,records);counts[kind]+=1
                if not r:unmatched.append({'quiz':p.name,'si':si,'qi':qi,'q':q})
        result.append({'quiz':p.name,'source':source.name,'matches':dict(counts)})
    (ROOT.parent/'ca-unmatched.json').write_text(json.dumps(unmatched,ensure_ascii=False,indent=2))
    print(json.dumps(result,ensure_ascii=False,indent=2));print('UNMATCHED',len(unmatched))

NOTE=re.compile(r'source document|answer marker|best.fit answer|See source explanation|स्रोत दस्तावेज़|स्रोत दस्तावेज़|उत्तर मार्कर',re.I)
OVERRIDES={
 ('FEBRUARY2026','q37'):{'hi':["नॉर्थ ब्लॉक और साउथ ब्लॉक: 'युगे युगीन भारत' राष्ट्रीय संग्रहालय का हिस्सा बनेंगे।","प्रधानमंत्री कार्यालय का नया परिसर: सेवा तीर्थ।","राजपथ का नया नाम: कर्तव्य पथ।","कर्तव्य भवन: मंत्रालयों के अलग नए भवन।","राज भवन का नया नाम: लोक भवन।","मुगल गार्डन का नया नाम: अमृत उद्यान।","नेहरू मेमोरियल म्यूज़ियम एंड लाइब्रेरी का नया नाम: प्राइम मिनिस्टर्स म्यूज़ियम एंड लाइब्रेरी।"], 'en':["North Block and South Block: Will be part of the Yuge Yugeen Bharat National Museum.","New PMO complex: Seva Teerth.","Rajpath's new name: Kartavya Path.","Kartavya Bhavans: Separate new ministry buildings.","Raj Bhavan's new name: Lok Bhavan.","Mughal Gardens' new name: Amrit Udyan.","Nehru Memorial Museum & Library's new name: Prime Ministers' Museum and Library."]},
 ('FEBRUARY2026','q44'):{'hi':["युम्नाम खेमचंद सिंह: मणिपुर के नए मुख्यमंत्री।","राजनीतिक पार्टी: भाजपा।","अनुच्छेद 163: मुख्यमंत्री की अध्यक्षता वाली मंत्रिपरिषद राज्यपाल को सहायता और सलाह देती है।","अनुच्छेद 164: मुख्यमंत्री और अन्य मंत्रियों की नियुक्ति।","अनुच्छेद 167: राज्यपाल के प्रति मुख्यमंत्री के कर्तव्य।","राज्यपाल: अजय कुमार भल्ला।","सीटें: विधानसभा 60; लोकसभा 2; राज्यसभा 1।","राज्य का गठन: 21 जनवरी 1972।"]},
 ('DAYSANDTHEME2026','q12'):{'en':["Theme 2026: Driven to End Malaria: Now We Can. Now We Must.","Cause of malaria: Plasmodium parasites.","Transmission: Through the bite of an infected female Anopheles mosquito."]},
 ('DAYSANDTHEME2026','q20'):{'en':["Tuberculosis (TB): A bacterial disease that mainly affects the lungs.","Theme 2026: Yes! We Can End TB: Led by countries. Powered by people."]},
 ('DAYSANDTHEME2026','q22'):{'en':["National Women's Day: Observed on Sarojini Naidu's birth anniversary.","Sarojini Naidu: An Indian political activist.","INC presidency: Sarojini Naidu was its first Indian woman president.","Title: Mahatma Gandhi called her the Nightingale of India (Bharat Kokila)."],'hi':["राष्ट्रीय महिला दिवस: सरोजिनी नायडू की जयंती पर मनाया जाता है।","सरोजिनी नायडू: भारतीय राजनीतिक कार्यकर्ता।","कांग्रेस अध्यक्षता: सरोजिनी नायडू भारतीय राष्ट्रीय कांग्रेस की पहली भारतीय महिला अध्यक्ष थीं।","उपाधि: महात्मा गांधी ने उन्हें 'भारत कोकिला' (Nightingale of India) कहा।"]},
 ('DAYSANDTHEME2026','q23'):{'en':["Theme 2026: Turning Stories into Action.","International Epilepsy Day in 2026: 9 February.","National Epilepsy Day: 17 November.","Epilepsy: A disorder in which nerve cell activity in the brain is disturbed."]},
 ('DAYSANDTHEME2026','q40'):{'en':["Janjatiya Gaurav Divas (Tribal Pride Day): 15 November.","Occasion: The birth anniversary of Birsa Munda.","Birsa Munda: A legendary tribal leader.","Birth: 15 November 1875, in present-day Jharkhand.","Title: Dharti Aaba (Father of the Land).","Movement: Led Ulgulan, or the Great Tumult, during 1899–1900."]},
 ('DAYSANDTHEME2026','q43'):{'en':["International Day of Non-Violence: 2 October.","Occasion: Mahatma Gandhi's birthday.","Birth: 2 October 1869, Porbandar.","Major movements: Champaran Satyagraha (1917); Kheda Satyagraha (1918); Khilafat Movement (1919); Non-Cooperation Movement (1920); Civil Disobedience Movement (1930); Quit India Movement (1942)."]},
 ('DAYSANDTHEME2026','q44'):{'en':["Theme 2025: Modernization and Operational Readiness.","Indian Air Force establishment: 8 October 1932.","Indian Army Day: 15 January.","Indian Navy Day: 4 December."]},
 ('DAYSANDTHEME2026','q48'):{'en':["Rhino species: Black, White, Greater one-horned, Sumatran and Javan — five species.","Distribution: Black and White rhinos occur in Africa; Javan rhinos occur in Asia.","Kaziranga National Park, Assam: Known for the Greater one-horned rhinoceros."]},
 ('DAYSANDTHEME2026','q62'):{'en':["Reason for observance: Chandrayaan-3 landed in the lunar south polar region on 23 August 2023.","Theme 2025: Aryabhatta to Gaganyaan: Ancient Wisdom to Infinite Possibilities.","Theme 2026: Towards Viksit Bharat: Innovating, Collaborating and Aspiring to Global Space Leadership."]},
}

def inner(li):
    node=html.fragment_fromstring(li)
    return (esc.escape(node.text or '')+''.join(etree.tostring(c,encoding='unicode',method='html') for c in node)) if node.tag=='li' else li

def sanitize(s):
    s=inner(s) if re.match(r'\s*<li[ >]',s) else s
    node=html.fragment_fromstring('<div>'+s+'</div>')
    def clean(n):
        content=esc.escape(n.text or '')+''.join(clean(c)+esc.escape(c.tail or '') for c in n)
        if n.tag in ('b','strong'):return '<b>'+content+'</b>'
        if n.tag=='span' and 'highlight-text' in n.get('class','').split():
            val=text(n)
            label=re.match(r'^([^:]{2,55}):\s*(.+)$',val)
            if label:
                value=esc.escape(label[2])
                if len(label[2])<=65 and len(label[2].split())<=7:value='<span class="highlight-text">'+value+'</span>'
                return '<b>'+esc.escape(label[1])+':</b> '+value
            if len(val)<=65 and len(val.split())<=7 and not re.search(r'\b(is|are|was|were|has|have|known|caused)\b|है[ं।]?|होता|होती|द्वारा',val,re.I):return '<span class="highlight-text">'+content+'</span>'
        return content
    s=clean(node).strip()
    s=re.sub(r'^(?:<b>)?(?:Answer|Correct Answer|उत्तर|सही उत्तर)\s*:\s*(?:</b>)?\s*','',s,flags=re.I)
    if '<b>' not in s:
        m=re.match(r'^([^<:]{2,65}):\s*',s)
        if m:s='<b>'+m[1]+':</b> '+s[m.end():]
    return s

def paired(record,source):
    original=record['facts']
    if len(original.get('en',[]))==len(original.get('hi',[])):
        keep=[i for i,(en,hi) in enumerate(zip(original['en'],original['hi'])) if not NOTE.search(strip_html(en)+' '+strip_html(hi))]
        fs={lang:[vals[i] for i in keep] for lang,vals in original.items()}
    else:fs={lang:[s for s in vals if strip_html(s) and not NOTE.search(strip_html(s))] for lang,vals in original.items()}
    for lang,vals in OVERRIDES.get((source.stem,record['id']),{}).items():fs[lang]=[esc.escape(v) for v in vals]
    if source.stem=='DAYSANDTHEME2026' and record['id']=='q39' and len(fs['hi'])==6:fs['hi'].pop(3)
    if source.stem=='DAYSANDTHEME2026' and record['id']=='q43':fs['hi']=[v.replace('1917–18','1918') for v in fs['hi']]
    if len(fs.get('en',[]))!=len(fs.get('hi',[])):raise ValueError(f"Unpaired facts: {source.name}#{record['id']} {list(map(len,fs.values()))}")
    return [{'en':sanitize(en),'hi':sanitize(hi)} for en,hi in zip(fs.get('en',[]),fs.get('hi',[]))]

def own_facts(q):
    # These standalone revision rows are not the similarly worded reading
    # cards about SEBI, Patna HC or National Women's Day.
    targeted={
        'whohasbeenappointedasthechiefjusticeofkeralahighcourt':[
            {'en':'<b>Chief Justice, Kerala High Court:</b> <span class="highlight-text">Justice Soumen Sen</span>.','hi':'<b>केरल उच्च न्यायालय के मुख्य न्यायाधीश:</b> <span class="highlight-text">न्यायमूर्ति सौमेन सेन</span>।'},
            {'en':'<b>Oath of office:</b> <span class="highlight-text">10 January 2026</span>.','hi':'<b>शपथ ग्रहण:</b> <span class="highlight-text">10 जनवरी 2026</span>।'},
            {'en':'<b>Previous position:</b> Chief Justice of the <span class="highlight-text">Meghalaya High Court</span>.','hi':'<b>पूर्व पद:</b> <span class="highlight-text">मेघालय उच्च न्यायालय</span> के मुख्य न्यायाधीश।'}],
        'whowasappointedexecutivedirectorofrbiinaugust2026':[
            {'en':'<b>RBI Executive Director:</b> <span class="highlight-text">Monisha Chakraborty</span>, effective <span class="highlight-text">3 August 2026</span>.','hi':'<b>RBI की कार्यकारी निदेशक:</b> <span class="highlight-text">मोनिशा चक्रवर्ती</span>; नियुक्ति <span class="highlight-text">3 अगस्त 2026</span> से प्रभावी।'},
            {'en':'<b>Responsibilities:</b> Foreign Exchange Department and Financial Markets Regulation Department.','hi':'<b>जिम्मेदारियाँ:</b> विदेशी मुद्रा विभाग और वित्तीय बाजार विनियमन विभाग।'}],
        'worldunanidayonthebirthanniversaryofhakimajmalkhan':[
            {'en':'<b>World Unani Day:</b> <span class="highlight-text">11 February</span>.','hi':'<b>विश्व यूनानी दिवस:</b> <span class="highlight-text">11 फरवरी</span>।'},
            {'en':'<b>Occasion:</b> Birth anniversary of Unani physician and educationist <span class="highlight-text">Hakim Ajmal Khan</span>.','hi':'<b>अवसर:</b> यूनानी चिकित्सक और शिक्षाविद् <span class="highlight-text">हकीम अजमल खान</span> की जयंती।'}]
    }
    if norm(q['q']['en']) in targeted:return targeted[norm(q['q']['en'])]
    fs={}
    for lang in ('en','hi'):
        if q.get('exp_html',{}).get(lang):
            node=html.fragment_fromstring('<div>'+q['exp_html'][lang]+'</div>');parts=node.xpath('./p|./ul/li')
            vals=[inner('<li>'+''.join(etree.tostring(c,encoding='unicode',method='html') for c in n)+'</li>') if not n.text else esc.escape(n.text)+''.join(etree.tostring(c,encoding='unicode',method='html') for c in n) for n in parts]
        else:
            e=q.get('exp',{}).get(lang,'');vals=e if isinstance(e,list) else re.split(r'\n\s*[•●]\s*',e.lstrip('•● '))
            vals=[re.sub(r'\[\[(.+?)\]\]',r'<span class="highlight-text">\1</span>',re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',esc.escape(v))) for v in vals]
        vals=[v for v in vals if strip_html(v) and not NOTE.search(strip_html(v))]
        if len(vals)>1 and re.match(r'^(Answer|उत्तर):',strip_html(vals[0]),re.I):vals.pop(0)
        fs[lang]=[sanitize(v) for v in vals]
    if len(fs['en'])!=len(fs['hi']):
        # Existing unstructured bilingual prose is one paired fact, preserving all text.
        fs={lang:[' '.join(vals)] for lang,vals in fs.items()}
    return [{'en':a,'hi':b} for a,b in zip(fs['en'],fs['hi'])] or [{'en':esc.escape(q['a']['en']),'hi':esc.escape(q['a']['hi'])}]

def update_reading(raw,records,factbank):
    # Replace only explanation UL contents; preserve headers, options and CSS verbatim.
    for r in records:
        pairs=factbank[r['id']]
        if not pairs:continue
        start=re.search(r'<(?:main|div)\b[^>]*\bid=["\']'+re.escape(r['id'])+r'["\'][^>]*>',raw)
        if not start:raise ValueError(r['id'])
        end=re.search(r'<(?:main|div)\b[^>]*class=["\']question-card["\']',raw[start.end():])
        boundary=start.end()+end.start() if end else len(raw)
        part=raw[start.start():boundary]
        def repl(m):
            lang='en' if 'English' in m[1] else 'hi'
            return m[1]+'\n'+''.join('<li>'+pair[lang]+'</li>\n' for pair in pairs)+m[3]
        part,n=re.subn(r'(<h4[^>]*>[^<]*(?:Explanation|स्पष्टीकरण)[\s\S]*?</h4>\s*<ul[^>]*>)([\s\S]*?)(</ul>)',repl,part,count=2)
        if n!=2:raise ValueError(f"Missing bilingual lists {r['id']} {n}")
        raw=raw[:start.start()]+part+raw[boundary:]
    return raw

def apply():
    needs_dynamic=any(not MASTER.search(p.read_text()) for p in QUIZ.rglob('*.html'))
    dynamic=json.loads(subprocess.check_output(['node',str(ROOT/'tools/export-ca-dynamic.cjs')],text=True)) if needs_dynamic else {}
    report=[];unmatched=[];changes=[]
    for p in sorted(QUIZ.rglob('*.html')):
        print('Sync',p.name,flush=True)
        h=p.read_text();m=MASTER.search(h);d=json.loads(m[2]) if m else dynamic[p.name]
        source=source_for(p);original=source.read_text();records=source_records(source)
        bank={r['id']:paired(r,source) for r in records};counts=collections.Counter();refs={};total=0
        # Existing main/section order is left intact, including the three dynamic banks.
        for si,s in enumerate(sections(d)):
            for qi,q in enumerate(s['questions']):
                total+=1;r,kind=match(q,records);counts[kind]+=1
                ref=r['id'] if r else 'extra-'+str(si)+'-'+str(qi)
                if not r:
                    bank[ref]=own_facts(q);unmatched.append({'quiz':p.name,'position':[si,qi],'q':q['q']['en']})
                if NOTE.search(q['a']['en']):
                    pairs=bank[ref]
                    if not r:raise ValueError('Unmapped source-note question '+q['q']['en'])
                    answer={lang:strip_html(pairs[0][lang]) for lang in ('en','hi')}
                    ci=next(i for i,o in enumerate(q['o']) if o['en']==q['a']['en'])
                    q['o'][ci]=answer;q['a']=answer
                    pool=[other['a'] for sec in sections(d) for other in sec['questions'] if not NOTE.search(other['a']['en']) and other['a']['en']!=answer['en']]
                    used={answer['en']}
                    for oi,opt in enumerate(q['o']):
                        if oi==ci:continue
                        if NOTE.search(opt['en']) or opt['en'] in used:q['o'][oi]=next(dict(a) for a in pool if a['en'] not in used)
                        used.add(q['o'][oi]['en'])
                    changes.append({'quiz':p.name,'position':[si,qi],'change':'Replace source-editing note with actual topic fact; correct option index preserved'})
                # Correct mistranslated proper names without changing English answer identity.
                for obj in [q['q'],q['a'],*q['o']]:
                    obj['hi']=obj['hi'].replace('जैनिक पापी','यानिक सिनर').replace('खेड़ा सत्याग्रह (1917–18)','खेड़ा सत्याग्रह (1918)')
                    obj['en']=obj['en'].replace('Kheda Satyagraha (1917–1918)','Kheda Satyagraha (1918)')
                old_exp=q.get('exp',{})
                if NOTE.search(' '.join(' '.join(v) if isinstance(v,list) else v for v in old_exp.values())):
                    q['exp']={lang:' '.join(strip_html(pair[lang]) for pair in bank[ref]) for lang in ('en','hi')}
                ci=next(i for i,o in enumerate(q['o']) if o['en']==q['a']['en'])
                used={q['a']['en']}
                for oi,opt in enumerate(q['o']):
                    if oi==ci:continue
                    if NOTE.search(opt['en']):
                        pool=(other['a'] for sec in sections(d) for other in sec['questions'])
                        q['o'][oi]=next(dict(a) for a in pool if not NOTE.search(a['en']) and a['en'] not in used and len(a['en'])<120)
                    used.add(q['o'][oi]['en'])
                if r and source.stem=='DAYSANDTHEME2026' and r['id']=='q22':
                    q['q']['en']=q['q']['en'].replace('1st Woman President','First Indian Woman President')
                    q['q']['hi']=q['q']['hi'].replace('पहली महिला अध्यक्ष','पहली भारतीय महिला अध्यक्ष')
                if 'which fact correctly gives “FATF”' in q['q']['en']:
                    if q['a']['en']=='Financial Action Task Force':q['q']={'en':'What is the full form of FATF?','hi':'FATF का पूरा नाम क्या है?'}
                    elif 'Anti-money' in q['a']['en']:q['q']={'en':'What is the principal role of FATF?','hi':'FATF की प्रमुख भूमिका क्या है?'}
                q['exp_ref']=ref;refs[f'rp-{si}-{qi}']=ref
        # One shared ordered list per reading card supplies both language views.
        updated=update_reading(original,records,bank).replace('जैनिक पापी','यानिक सिनर')
        if updated!=original:source.write_text(updated)
        for pairs in bank.values():
            for pair in pairs:
                pair['hi']=pair['hi'].replace('जैनिक पापी','यानिक सिनर')
        if m:h=h[:m.start(2)]+jsontext(d)+h[m.end(2):]
        else:
            h=h.replace('</head>','<script id="master-data" type="application/json">'+jsontext(d)+'</script>\n</head>')
            # Freeze derived options and IDs; subsequent reading edits cannot reshuffle them.
            h=re.sub(r'<script\b[^>]*src=["\'][^"\']*(?:search-index|brics-search-index)\.js[^"\']*["\'][^>]*></script>','',h)
            h=re.sub(r'<script>window.CA_SEARCH_INDEX=[\s\S]*?</script>','',h)
            if 'function boot' in h:
                h=re.sub(r'function boot\(\)\{[\s\S]*?\}boot\(\);',"function boot(){SECTIONS=JSON.parse(document.getElementById('master-data').textContent);TOTAL_QUESTIONS=SECTIONS.reduce((n,s)=>n+s.questions.length,0);current=Math.max(0,Math.min(SECTIONS.length-1,saved.section||0));applyDark();renderQuestions()}boot();",h)
            h=re.sub(r'rapid-runtime\.js\?v=[^"\'<>]+','rapid-runtime.js?v=20261031full1',h)
        h=re.sub(r'<script[^>]*id=["\']efp-ca-facts["\'][^>]*>[\s\S]*?</script>','',h)
        h=re.sub(r'<script src="/ca-explanations\.js[^\"]*"></script>\s*|<link rel="stylesheet" href="/ca-explanations\.css[^\"]*">\s*','',h)
        h=h.replace('</head>','<script id="efp-ca-facts" type="application/json">'+jsontext(bank)+'</script>\n<script src="/ca-explanations.js?v=20261031full1"></script>\n<link rel="stylesheet" href="/ca-explanations.css?v=20261031full1">\n</head>')
        # Delegate presentation to the shared fact renderer, preserving quiz interactions.
        h=re.sub(r'\$\{(?:escapeHtml\(q\.exp\.(en|hi)\)|explanationHtml\(q,["\'](en|hi)["\']\)|formatExplanation\(q\.exp\.(en|hi)\)|explanationHtml\(q\.exp\.(en|hi)\)|explanationText\(q,["\'](en|hi)["\']\))\}',lambda x:'${window.EFP_CA_EXPLANATIONS.render(q,"'+next(v for v in x.groups() if v)+'")}',h)
        p.write_text(h)
        report.append({'quiz':str(p.relative_to(ROOT)),'reading':str(source.relative_to(ROOT)),'questions':total,'source_matches':dict(counts),'fact_sets':len(bank),'facts':sum(len(v) for v in bank.values()),'refs':refs})
    runtime=QUIZ/'Topic Wise/rapid-runtime.js';s=runtime.read_text()
    if 'function legacyBoot' not in s:
        s=s.replace("function boot(){const src=", "function legacyBoot(){const src=")
        s=s.replace('boot();',"function boot(){const el=document.getElementById('master-data');if(!el){legacyBoot();return}SECTIONS=JSON.parse(el.textContent);TOTAL_QUESTIONS=SECTIONS.reduce((n,s)=>n+s.questions.length,0);current=Math.max(0,Math.min(SECTIONS.length-1,saved.section||0));applyDark();renderQuestions()}boot();")
    s=s.replace('escapeHtml(q.exp.en)','window.EFP_CA_EXPLANATIONS.render(q,"en")').replace('escapeHtml(q.exp.hi)','window.EFP_CA_EXPLANATIONS.render(q,"hi")')
    runtime.write_text(s)
    audit={'date':'2026-10-31','scope':'2026 monthly and topic-wise current-affairs quiz explanation parity','quizzes':report,'question_changes':changes,'unmatched_existing_explanations_preserved':unmatched}
    (ROOT/'audits/current-affairs').mkdir(parents=True,exist_ok=True)
    (ROOT/'audits/current-affairs/full-explanations-20261031.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2))
    print('TOTAL',sum(r['questions'] for r in report),'QUIZZES',len(report),'UNMAPPED',len(unmatched),'NOTE_FIXES',len(changes))

if __name__=='__main__':
    import sys
    apply() if '--apply' in sys.argv else inventory()
