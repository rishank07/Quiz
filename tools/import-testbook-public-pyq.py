#!/usr/bin/env python3
import json
import re
import sys
import unicodedata
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

CATALOG = Path('PYQ/data/pdf-catalog.json')
YEARS = {2021, 2022, 2023, 2024, 2025}

GROUP_META = {
    'bpsc': ('BPSC', 'बीपीएससी'),
    'upsc': ('UPSC CSE', 'यूपीएससी सिविल सेवा'),
    'ssc': ('SSC', 'एसएससी'),
    'railway': ('Railway / RRB', 'रेलवे / आरआरबी'),
    'banking': ('Banking', 'बैंकिंग'),
}

SOURCES = [
    # SSC
    ('ssc', 'SSC CGL', 'https://testbook.com/ssc-cgl/previous-year-papers'),
    ('ssc', 'SSC CHSL', 'https://testbook.com/ssc-chsl/previous-year-papers'),
    ('ssc', 'SSC MTS', 'https://testbook.com/ssc-mts/previous-year-papers'),
    ('ssc', 'SSC GD Constable', 'https://testbook.com/ssc-gd-constable/previous-year-papers'),
    ('ssc', 'SSC CPO', 'https://testbook.com/ssc-cpo/previous-year-papers'),
    ('ssc', 'SSC Stenographer', 'https://testbook.com/ssc-stenographer/previous-year-papers'),
    ('ssc', 'SSC Selection Post', 'https://testbook.com/ssc-selection-post/previous-year-papers'),
    ('ssc', 'SSC JE', 'https://testbook.com/ssc-je/previous-year-papers'),
    ('ssc', 'SSC JHT', 'https://testbook.com/ssc-jht/previous-year-papers'),
    # Railway / RRB
    ('railway', 'RRB NTPC', 'https://testbook.com/rrb-ntpc/previous-year-papers'),
    ('railway', 'RRB Group D', 'https://testbook.com/rrb-group-d/previous-year-papers'),
    ('railway', 'RRB ALP', 'https://testbook.com/rrb-alp/previous-year-papers'),
    ('railway', 'RRB JE', 'https://testbook.com/rrb-je/previous-year-papers'),
    ('railway', 'RRB Technician', 'https://testbook.com/rrb-technician/previous-year-papers'),
    ('railway', 'RPF Constable', 'https://testbook.com/rpf-constable/previous-year-papers'),
    ('railway', 'RPF SI', 'https://testbook.com/rpf-si/previous-year-papers'),
    # BPSC
    ('bpsc', 'BPSC', 'https://testbook.com/bpsc-exam/previous-year-papers'),
    # Banking
    ('banking', 'IBPS Clerk', 'https://testbook.com/ibps-clerk/previous-year-papers'),
    ('banking', 'IBPS PO', 'https://testbook.com/ibps-po/previous-year-papers'),
    ('banking', 'IBPS RRB Clerk', 'https://testbook.com/ibps-rrb-clerk/previous-year-papers'),
    ('banking', 'IBPS RRB PO', 'https://testbook.com/ibps-rrb-po/previous-year-papers'),
    ('banking', 'SBI Clerk', 'https://testbook.com/sbi-clerk/previous-year-papers'),
    ('banking', 'SBI PO', 'https://testbook.com/sbi-po/previous-year-papers'),
    # UPSC
    ('upsc', 'UPSC CSE', 'https://testbook.com/upsc-civil-services/previous-year-papers'),
]

UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36 ExamFusionPrep-PYQ-Catalog/1.1'
SESSION = requests.Session()
SESSION.headers.update({'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9'})


def clean_text(s):
    return re.sub(r'\s+', ' ', (s or '')).strip()


def slugify(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s[:110] or 'paper'


def infer_year(anchor, label):
    own = clean_text(anchor.get_text(' ', strip=True))
    candidates = [own]
    tr = anchor.find_parent('tr')
    if tr:
        candidates.append(clean_text(tr.get_text(' ', strip=True)))
    parent = anchor.parent
    if parent:
        candidates.append(clean_text(parent.get_text(' ', strip=True)))
    # Testbook often wraps a table under a nearby year heading. Walk a few ancestors/siblings.
    node = anchor
    for _ in range(5):
        node = getattr(node, 'parent', None)
        if not node:
            break
        candidates.append(clean_text(node.get_text(' ', strip=True))[:1500])
    candidates.append(label)
    for text in candidates:
        years = [int(x) for x in re.findall(r'\b20(?:21|22|23|24|25)\b', text)]
        for y in years:
            if y in YEARS:
                return y
    return None


def infer_stage(text):
    t = text.lower()
    if 'cbt 2' in t or 'cbt-2' in t or 'cbt ii' in t:
        return 'CBT 2'
    if 'cbt 1' in t or 'cbt-1' in t or 'cbt i' in t:
        return 'CBT 1'
    if 'tier-ii' in t or 'tier ii' in t or 'tier 2' in t:
        return 'Tier II'
    if 'tier-i' in t or 'tier i' in t or 'tier 1' in t:
        return 'Tier I'
    if 'mains' in t or 'main exam' in t:
        return 'Mains'
    if 'prelim' in t:
        return 'Prelims'
    if 'paper ii' in t or 'paper 2' in t:
        return 'Paper II'
    if 'paper i' in t or 'paper 1' in t:
        return 'Paper I'
    return 'Previous Year Paper'


def infer_language(text):
    t = text.lower()
    if 'hindi' in t or re.search(r'[\u0900-\u097f]', text):
        return 'Hindi'
    return 'English'


def context_text(anchor):
    parts = [clean_text(anchor.get_text(' ', strip=True))]
    tr = anchor.find_parent('tr')
    if tr:
        parts.append(clean_text(tr.get_text(' ', strip=True)))
    return ' · '.join(x for x in parts if x)


def direct_public_testbook_pdf(href):
    if not href:
        return False
    u = urlparse(href)
    host = (u.netloc or '').lower()
    path = (u.path or '').lower()
    if host != 'cdn.testbook.com':
        return False
    return path.endswith('.pdf') or '.pdf' in path


def find_exam(catalog, exam_id):
    for exam in catalog.get('exams', []):
        if exam.get('id') == exam_id:
            return exam
    return None


def ensure_exam(catalog, exam_id):
    exam = find_exam(catalog, exam_id)
    name, hi = GROUP_META.get(exam_id, (exam_id.upper(), exam_id))
    if exam:
        exam['name'] = name
        exam['hi'] = hi
        return exam
    exam = {'id': exam_id, 'name': name, 'hi': hi, 'years': []}
    catalog.setdefault('exams', []).append(exam)
    return exam


def get_year_node(exam, year):
    for y in exam.setdefault('years', []):
        if int(y.get('year')) == int(year):
            return y
    node = {'year': year, 'papers': []}
    exam['years'].append(node)
    exam['years'].sort(key=lambda x: int(x.get('year', 0)), reverse=True)
    return node


def fetch_page(url):
    r = SESSION.get(url, timeout=30)
    r.raise_for_status()
    return r.text


def main():
    if not CATALOG.exists():
        raise SystemExit(f'Missing {CATALOG}')
    catalog = json.loads(CATALOG.read_text(encoding='utf-8'))

    for group_id in GROUP_META:
        # Railway is created only when at least one public PDF is actually found.
        if group_id != 'railway' or find_exam(catalog, group_id):
            ensure_exam(catalog, group_id)

    existing_urls = set()
    existing_ids = set()
    for exam in catalog.get('exams', []):
        for y in exam.get('years', []):
            for p in y.get('papers', []):
                if p.get('pdf'):
                    existing_urls.add(p['pdf'].split('#')[0])
                if p.get('id'):
                    existing_ids.add(p['id'])

    added = []
    page_stats = []
    errors = []

    for group_id, exam_label, page_url in SOURCES:
        try:
            html = fetch_page(page_url)
        except Exception as e:
            errors.append((exam_label, str(e)))
            print(f'WARN fetch {exam_label}: {e}', file=sys.stderr)
            continue

        soup = BeautifulSoup(html, 'html.parser')
        candidates = 0
        page_added = 0
        for a in soup.find_all('a', href=True):
            href = urljoin(page_url, a.get('href', '').strip()).split('#')[0]
            if not direct_public_testbook_pdf(href):
                continue
            candidates += 1
            if href in existing_urls:
                continue

            txt = context_text(a)
            year = infer_year(a, exam_label)
            if year not in YEARS:
                continue

            anchor_label = clean_text(a.get_text(' ', strip=True))
            if not anchor_label or anchor_label.lower() in {'download pdf', 'download link', 'download', 'click here'}:
                anchor_label = txt or f'{exam_label} {year} Question Paper'

            language = infer_language(anchor_label + ' ' + txt)
            stage = infer_stage(anchor_label + ' ' + txt)
            full_label = anchor_label
            if exam_label.lower() not in full_label.lower():
                full_label = f'{exam_label} · {full_label}'
            if language not in full_label:
                full_label = f'{full_label} · {language}'

            base_id = f'testbook-{slugify(exam_label)}-{year}-{slugify(full_label)}'
            pid = base_id
            n = 2
            while pid in existing_ids:
                pid = f'{base_id}-{n}'
                n += 1

            exam = ensure_exam(catalog, group_id)
            y_node = get_year_node(exam, year)
            paper = {
                'id': pid,
                'label': full_label,
                'stage': stage,
                'paper': exam_label,
                'language': language,
                'pdf': href,
                'source': f'Free/public Testbook PDF · {exam_label}',
                'source_page': page_url,
            }
            y_node.setdefault('papers', []).append(paper)
            existing_urls.add(href)
            existing_ids.add(pid)
            added.append((group_id, year, exam_label, full_label, href))
            page_added += 1

        page_stats.append((exam_label, candidates, page_added))
        print(f'{exam_label}: public CDN candidates={candidates}, added={page_added}')

    # Stable, readable ordering within each year and remove empty dynamically-created groups.
    cleaned_exams = []
    for exam in catalog.get('exams', []):
        for y in exam.get('years', []):
            y['papers'] = sorted(y.get('papers', []), key=lambda p: (p.get('paper',''), p.get('stage',''), p.get('label','')))
        if any(y.get('papers') for y in exam.get('years', [])):
            cleaned_exams.append(exam)
    catalog['exams'] = cleaned_exams

    catalog['updated'] = '2026-09-16'
    catalog['version'] = max(int(catalog.get('version', 1)), 5)
    catalog['testbook_public_import'] = {
        'policy': 'Direct public cdn.testbook.com PDFs only; no Pro/locked bypass; PDFs remain externally hosted.',
        'pages_scanned': len(page_stats),
        'added_this_run': len(added),
    }

    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    totals = {}
    total = 0
    for exam in catalog.get('exams', []):
        count = sum(len(y.get('papers', [])) for y in exam.get('years', []))
        totals[exam.get('id')] = count
        total += count
    print(f'IMPORT SUMMARY added={len(added)} total={total} by_exam={totals}')
    if errors:
        print('Fetch warnings:', errors)


if __name__ == '__main__':
    main()
