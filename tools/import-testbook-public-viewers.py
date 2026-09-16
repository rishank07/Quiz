#!/usr/bin/env python3
import json
import re
import unicodedata
from pathlib import Path
from urllib.parse import urljoin, urlparse, parse_qs

import requests
from bs4 import BeautifulSoup

CATALOG = Path('PYQ/data/pdf-catalog.json')
YEARS = {2021, 2022, 2023, 2024, 2025}
SOURCES = [
    ('ssc', 'SSC CGL', 'https://testbook.com/ssc-cgl/previous-year-papers'),
    ('ssc', 'SSC CHSL', 'https://testbook.com/ssc-chsl/previous-year-papers'),
    ('ssc', 'SSC MTS', 'https://testbook.com/ssc-mts/previous-year-papers'),
    ('ssc', 'SSC GD Constable', 'https://testbook.com/ssc-gd-constable/previous-year-papers'),
    ('ssc', 'SSC CPO', 'https://testbook.com/ssc-cpo/previous-year-papers'),
    ('ssc', 'SSC Stenographer', 'https://testbook.com/ssc-stenographer/previous-year-papers'),
    ('ssc', 'SSC Selection Post', 'https://testbook.com/ssc-selection-post/previous-year-papers'),
    ('ssc', 'SSC JE', 'https://testbook.com/ssc-je/previous-year-papers'),
    ('ssc', 'SSC JHT', 'https://testbook.com/ssc-jht/previous-year-papers'),
    ('railway', 'RRB NTPC', 'https://testbook.com/rrb-ntpc/previous-year-papers'),
    ('railway', 'RRB Group D', 'https://testbook.com/rrb-group-d/previous-year-papers'),
    ('railway', 'RRB ALP', 'https://testbook.com/rrb-alp/previous-year-papers'),
    ('railway', 'RRB JE', 'https://testbook.com/rrb-je/previous-year-papers'),
    ('railway', 'RRB Technician', 'https://testbook.com/rrb-technician/previous-year-papers'),
    ('railway', 'RPF Constable', 'https://testbook.com/rpf-constable/previous-year-papers'),
    ('railway', 'RPF SI', 'https://testbook.com/rpf-si/previous-year-papers'),
    ('bpsc', 'BPSC', 'https://testbook.com/bpsc-exam/previous-year-papers'),
    ('banking', 'IBPS Clerk', 'https://testbook.com/ibps-clerk/previous-year-papers'),
    ('banking', 'IBPS PO', 'https://testbook.com/ibps-po/previous-year-papers'),
    ('banking', 'IBPS RRB Clerk', 'https://testbook.com/ibps-rrb-clerk/previous-year-papers'),
    ('banking', 'IBPS RRB PO', 'https://testbook.com/ibps-rrb-po/previous-year-papers'),
    ('banking', 'SBI Clerk', 'https://testbook.com/sbi-clerk/previous-year-papers'),
    ('banking', 'SBI PO', 'https://testbook.com/sbi-po/previous-year-papers'),
    ('upsc', 'UPSC CSE', 'https://testbook.com/upsc-civil-services/previous-year-papers'),
]
GROUP_META = {
    'bpsc': ('BPSC', 'बीपीएससी'),
    'upsc': ('UPSC CSE', 'यूपीएससी सिविल सेवा'),
    'ssc': ('SSC', 'एसएससी'),
    'railway': ('Railway / RRB', 'रेलवे / आरआरबी'),
    'banking': ('Banking', 'बैंकिंग'),
}
BLACKLIST = (
    'current affairs', 'practice mock', 'mock test', 'practice set',
    'ai-generated', 'ai generated', 'important questions', 'study material',
    'syllabus pdf', 'formula', 'notes pdf', 'ebook for', 'top 200',
)
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36 ExamFusionPrep-PYQ-Viewer/1.0'
S = requests.Session()
S.headers.update({'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9'})


def clean(s):
    return re.sub(r'\s+', ' ', (s or '')).strip()


def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')[:120]


def find_exam(catalog, exam_id):
    return next((x for x in catalog.get('exams', []) if x.get('id') == exam_id), None)


def ensure_exam(catalog, exam_id):
    e = find_exam(catalog, exam_id)
    name, hi = GROUP_META[exam_id]
    if e:
        e['name'], e['hi'] = name, hi
        return e
    e = {'id': exam_id, 'name': name, 'hi': hi, 'years': []}
    catalog.setdefault('exams', []).append(e)
    return e


def year_node(exam, year):
    for y in exam.setdefault('years', []):
        if int(y.get('year')) == year:
            return y
    y = {'year': year, 'papers': []}
    exam['years'].append(y)
    exam['years'].sort(key=lambda z: int(z.get('year', 0)), reverse=True)
    return y


def is_viewer(url):
    u = urlparse(url)
    if u.netloc.lower() not in {'testbook.com', 'www.testbook.com'}:
        return False
    if u.path.rstrip('/') != '/pdf-viewer':
        return False
    return bool(parse_qs(u.query).get('id'))


def non_pyq(text):
    t = clean(text).lower()
    return any(x in t for x in BLACKLIST)


def row_text(a):
    tr = a.find_parent('tr')
    if tr:
        return clean(tr.get_text(' ', strip=True))
    # Prefer a compact card/list parent, not the whole page.
    node = a.parent
    for _ in range(3):
        if not node:
            break
        txt = clean(node.get_text(' ', strip=True))
        if 10 <= len(txt) <= 700:
            return txt
        node = node.parent
    return clean(a.get_text(' ', strip=True))


def infer_year(a, text):
    candidates = [text, clean(a.get_text(' ', strip=True))]
    # Nearest preceding heading usually carries the Testbook year section.
    h = a.find_previous(['h2', 'h3', 'h4'])
    if h:
        candidates.append(clean(h.get_text(' ', strip=True)))
    for c in candidates:
        for m in re.finditer(r'\b(2021|2022|2023|2024|2025)\b', c):
            y = int(m.group(1))
            if y in YEARS:
                return y
    return None


def infer_stage(text):
    t = text.lower()
    for pat, val in [
        ('cbt-ii', 'CBT 2'), ('cbt ii', 'CBT 2'), ('cbt 2', 'CBT 2'),
        ('cbt-i', 'CBT 1'), ('cbt i', 'CBT 1'), ('cbt 1', 'CBT 1'),
        ('tier-ii', 'Tier II'), ('tier ii', 'Tier II'), ('tier 2', 'Tier II'),
        ('tier-i', 'Tier I'), ('tier i', 'Tier I'), ('tier 1', 'Tier I'),
        ('mains', 'Mains'), ('prelim', 'Prelims'),
        ('paper-ii', 'Paper II'), ('paper ii', 'Paper II'),
        ('paper-i', 'Paper I'), ('paper i', 'Paper I'),
    ]:
        if pat in t:
            return val
    return 'Previous Year Paper'


def label_from_anchor(a, exam_label, year, text):
    tr = a.find_parent('tr')
    label = ''
    if tr:
        cells = tr.find_all(['td', 'th'])
        if cells:
            label = clean(cells[0].get_text(' ', strip=True))
            if len(label) < 8 and len(cells) > 1:
                label = clean(' · '.join(c.get_text(' ', strip=True) for c in cells[:-1]))
    if not label:
        label = text
    label = re.sub(r'\bDownload PDF\b', '', label, flags=re.I)
    label = re.sub(r'\bPDF Download\b', '', label, flags=re.I)
    label = clean(label).strip('·|- ')
    if not label or label.lower() in {'download', 'click here'}:
        label = f'{exam_label} {year} Question Paper'
    if exam_label.lower() not in label.lower():
        label = f'{exam_label} · {label}'
    return label[:300]


def cleanup_junk(catalog):
    removed = 0
    for exam in catalog.get('exams', []):
        for y in exam.get('years', []):
            keep = []
            for p in y.get('papers', []):
                src = (p.get('source') or '').lower()
                text = f"{p.get('label','')} {p.get('paper','')}"
                if 'testbook' in src and non_pyq(text):
                    removed += 1
                    continue
                keep.append(p)
            y['papers'] = keep
    return removed


def main():
    catalog = json.loads(CATALOG.read_text(encoding='utf-8'))
    removed = cleanup_junk(catalog)

    existing_urls = set()
    existing_sigs = set()
    existing_ids = set()
    for e in catalog.get('exams', []):
        for y in e.get('years', []):
            year = int(y.get('year'))
            for p in y.get('papers', []):
                url = (p.get('pdf') or '').split('#')[0]
                if url:
                    existing_urls.add(url)
                existing_ids.add(p.get('id', ''))
                if 'testbook' in (p.get('source') or '').lower():
                    existing_sigs.add((e.get('id'), year, slug(p.get('label', ''))))

    total_added = 0
    warnings = []
    for group_id, exam_label, page_url in SOURCES:
        try:
            r = S.get(page_url, timeout=30)
            r.raise_for_status()
        except Exception as ex:
            warnings.append((exam_label, str(ex)))
            print(f'WARN fetch {exam_label}: {ex}')
            continue
        soup = BeautifulSoup(r.text, 'html.parser')
        candidates = added = locked = junk = duplicate = 0
        for a in soup.find_all('a', href=True):
            url = urljoin(page_url, a.get('href', '').strip()).split('#')[0]
            if not is_viewer(url):
                continue
            candidates += 1
            text = row_text(a)
            low = text.lower()
            if 'unlock now' in low or re.search(r'(^|\s)pro($|\s)', low):
                locked += 1
                continue
            if non_pyq(text):
                junk += 1
                continue
            year = infer_year(a, text)
            if year not in YEARS:
                continue
            label = label_from_anchor(a, exam_label, year, text)
            if non_pyq(label):
                junk += 1
                continue
            sig = (group_id, year, slug(label))
            if url in existing_urls or sig in existing_sigs:
                duplicate += 1
                continue
            language = (parse_qs(urlparse(url).query).get('language') or [''])[0].strip().title()
            if not language:
                language = 'Hindi' if ('hindi' in low or re.search(r'[\u0900-\u097f]', text)) else 'English'
            exam = ensure_exam(catalog, group_id)
            yn = year_node(exam, year)
            base_id = f'testbook-viewer-{slug(exam_label)}-{year}-{slug(label)}'
            pid = base_id
            n = 2
            while pid in existing_ids:
                pid = f'{base_id}-{n}'; n += 1
            paper = {
                'id': pid,
                'label': label,
                'stage': infer_stage(text),
                'paper': exam_label,
                'language': language,
                'pdf': url,
                'source': f'Free/public Testbook PDF viewer · {exam_label}',
                'source_page': page_url,
            }
            yn.setdefault('papers', []).append(paper)
            existing_urls.add(url)
            existing_sigs.add(sig)
            existing_ids.add(pid)
            added += 1
            total_added += 1
        print(f'{exam_label}: public viewers={candidates}, added={added}, locked={locked}, junk={junk}, duplicate={duplicate}')

    # Stable ordering and no empty years/groups.
    cleaned_exams = []
    for e in catalog.get('exams', []):
        new_years = []
        for y in e.get('years', []):
            if y.get('papers'):
                y['papers'] = sorted(y['papers'], key=lambda p: (p.get('paper',''), p.get('stage',''), p.get('label','')))
                new_years.append(y)
        e['years'] = sorted(new_years, key=lambda y: int(y.get('year', 0)), reverse=True)
        if e['years']:
            cleaned_exams.append(e)
    catalog['exams'] = cleaned_exams
    catalog['version'] = max(int(catalog.get('version', 1)), 6)
    catalog['updated'] = '2026-09-16'
    catalog['testbook_public_viewer_import'] = {
        'policy': 'Public Testbook pdf-viewer links only; locked/Pro rows and non-PYQ material are excluded.',
        'added_this_run': total_added,
        'removed_non_pyq_testbook_entries': removed,
    }
    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    totals = {}
    grand = 0
    for e in catalog.get('exams', []):
        n = sum(len(y.get('papers', [])) for y in e.get('years', []))
        totals[e.get('id')] = n
        grand += n
    print(f'VIEWER IMPORT SUMMARY added={total_added} removed_junk={removed} total={grand} by_exam={totals}')
    if warnings:
        print('Fetch warnings:', warnings)


if __name__ == '__main__':
    main()
