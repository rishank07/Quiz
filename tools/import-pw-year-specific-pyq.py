#!/usr/bin/env python3
import json
import re
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

CATALOG = Path('PYQ/data/pdf-catalog.json')
PAGES = [
    ('RRB NTPC', 2021, 'CBT 1', 'https://www.pw.live/railway/exams/rrb-ntpc-2021-cbt-1-question-paper'),
    ('RRB NTPC', 2022, 'CBT 2', 'https://www.pw.live/railway/exams/rrb-ntpc-2022-cbt-2-level-2-question-paper'),
    ('RRB NTPC', 2022, 'CBT 2', 'https://www.pw.live/railway/exams/rrb-ntpc-2022-cbt-2-level-3-question-paper'),
    ('RRB NTPC', 2022, 'CBT 2', 'https://www.pw.live/railway/exams/rrb-ntpc-2022-cbt-2-level-5-question-paper'),
    ('RRB Group D', 2022, 'CBT 1', 'https://www.pw.live/railway/exams/rrb-group-d-2022-cbt-1-question-papers'),
]

S = requests.Session()
S.headers.update({'User-Agent':'Mozilla/5.0 Chrome/140 Safari/537.36 ExamFusionPrep-PYQ/2.0'})


def txt(node):
    return re.sub(r'\s+', ' ', node.get_text(' ', strip=True) if node else '').strip()


def local_context(a):
    tr = a.find_parent('tr')
    if tr: return txt(tr)
    li = a.find_parent('li')
    if li: return txt(li)
    p = a.find_parent('p')
    if p: return txt(p)
    return txt(a.parent)


def public_link(href, base):
    u = urlparse(urljoin(base, href).split('#')[0])
    host, path = u.netloc.lower(), u.path.lower()
    if host == 'static.pw.live' and '.pdf' in path:
        return u.geturl()
    if host == 'drive.google.com' and ('/file/d/' in path or '/open' in path or '/uc' in path):
        return u.geturl()
    return None


def date_shift(label):
    date = None
    shift = None
    m = re.search(r'\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(20\d{2})\b', label, re.I)
    if m: date = f'{m.group(1)} {m.group(2)} {m.group(3)}'
    m = re.search(r'\bshift\s*([123])\b', label, re.I)
    if m: shift = int(m.group(1))
    return date, shift


def main():
    data = json.loads(CATALOG.read_text(encoding='utf-8'))
    railway = next((e for e in data.get('exams',[]) if e.get('id') == 'railway'), None)
    if not railway:
        railway = {'id':'railway','name':'Railway / RRB','hi':'रेलवे / आरआरबी','years':[]}
        data.setdefault('exams',[]).append(railway)

    existing_urls = {p.get('pdf','').split('#')[0] for e in data.get('exams',[]) for y in e.get('years',[]) for p in y.get('papers',[]) if p.get('pdf')}
    existing_ids = {p.get('id') for e in data.get('exams',[]) for y in e.get('years',[]) for p in y.get('papers',[]) if p.get('id')}
    existing_signature = set()
    for e in data.get('exams',[]):
        for y in e.get('years',[]):
            for p in y.get('papers',[]):
                blob = f"{p.get('paper','')} {p.get('label','')} {p.get('date','')} shift {p.get('shift','')}"
                date, shift = date_shift(blob)
                if date and shift:
                    existing_signature.add((p.get('paper','').lower(), int(y.get('year',0)), date.lower(), shift))

    added = 0
    by_page = []
    for exam, year, stage, page in PAGES:
        try:
            r = S.get(page, timeout=30); r.raise_for_status()
        except Exception as exc:
            print(f'WARN {page}: {exc}')
            continue
        soup = BeautifulSoup(r.text, 'html.parser')
        page_added = 0
        candidates = 0
        for a in soup.find_all('a', href=True):
            url = public_link(a['href'], page)
            if not url: continue
            candidates += 1
            if url in existing_urls: continue
            label = local_context(a)
            if str(year) not in label:
                # This importer is restricted to a year-specific PW page, so title context fixes the year.
                label = f'{exam} {stage} {year} · {label}'
            if exam.lower() not in label.lower():
                label = f'{exam} · {label}'
            date, shift = date_shift(label)
            sig = (exam.lower(), year, date.lower(), shift) if date and shift else None
            if sig and sig in existing_signature: continue
            slug = re.sub(r'[^a-z0-9]+','-',label.lower()).strip('-')[:105]
            pid = f'pw-{year}-{slug}'
            n = 2
            while pid in existing_ids:
                pid = f'pw-{year}-{slug}-{n}'; n += 1
            yn = next((y for y in railway.get('years',[]) if int(y.get('year',0)) == year), None)
            if not yn:
                yn = {'year':year,'papers':[]}; railway.setdefault('years',[]).append(yn)
            paper = {
                'id': pid,
                'label': label[:220],
                'stage': stage,
                'paper': exam,
                'language': 'English',
                'pdf': url,
                'source': f'Free/public Physics Wallah PYQ PDF · {exam}',
                'source_page': page,
            }
            if date: paper['date'] = date
            if shift: paper['shift'] = shift
            yn.setdefault('papers',[]).append(paper)
            existing_urls.add(url); existing_ids.add(pid)
            if sig: existing_signature.add(sig)
            added += 1; page_added += 1
        by_page.append((page,candidates,page_added))
        print(f'PW YEAR PAGE {exam} {year} {stage}: candidates={candidates} added={page_added}')

    railway['years'].sort(key=lambda y:int(y.get('year',0)), reverse=True)
    for y in railway['years']:
        y['papers'] = sorted(y.get('papers',[]), key=lambda p:(p.get('paper',''),p.get('date',''),p.get('shift',0),p.get('label','')))
    if added:
        data['version'] = int(data.get('version',1)) + 1
    data['updated'] = '2026-09-16'
    data['pw_year_specific_import'] = {'pages':len(PAGES),'added_this_run':added}
    CATALOG.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    total = sum(len(y.get('papers',[])) for e in data.get('exams',[]) for y in e.get('years',[]))
    rail = sum(len(y.get('papers',[])) for y in railway.get('years',[]))
    print(f'PW YEAR SUMMARY added={added} total={total} railway={rail}')

if __name__ == '__main__': main()
