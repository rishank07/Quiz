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

# Only public previous-year-paper pages. Fetch failures are tolerated and logged.
SOURCES = [
    # Adda247 — SSC
    ('Adda247', 'ssc', 'SSC CGL', 'https://www.adda247.com/jobs/ssc-cgl-previous-year-question-paper/'),
    ('Adda247', 'ssc', 'SSC CHSL', 'https://www.adda247.com/jobs/ssc-chsl-previous-year-question-paper/'),
    ('Adda247', 'ssc', 'SSC MTS', 'https://www.adda247.com/jobs/ssc-mts-previous-year-question-paper/'),
    ('Adda247', 'ssc', 'SSC GD Constable', 'https://www.adda247.com/jobs/ssc-gd-previous-year-question-papers/'),
    ('Adda247', 'ssc', 'SSC CPO', 'https://www.adda247.com/jobs/ssc-cpo-previous-year-question-paper/'),
    ('Adda247', 'ssc', 'SSC JHT', 'https://www.adda247.com/jobs/ssc-jht-previous-year-question-paper/'),
    ('Adda247', 'ssc', 'SSC Stenographer', 'https://www.adda247.com/jobs/ssc-stenographer-previous-year-question-paper/'),
    ('Adda247', 'ssc', 'SSC Selection Post', 'https://www.adda247.com/jobs/ssc-selection-post-previous-year-question-paper/'),
    # Adda247 — Railway
    ('Adda247', 'railway', 'RRB NTPC', 'https://www.adda247.com/jobs/rrb-ntpc-previous-year-question-papers/'),
    ('Adda247', 'railway', 'RRB Technician', 'https://www.adda247.com/jobs/rrb-technician-previous-year-question-paper/'),
    ('Adda247', 'railway', 'RRB Group D', 'https://www.adda247.com/jobs/rrb-group-d-previous-year-question-papers/'),
    ('Adda247', 'railway', 'RRB ALP', 'https://www.adda247.com/jobs/rrb-alp-previous-year-question-paper/'),
    ('Adda247', 'railway', 'RPF Constable', 'https://www.adda247.com/jobs/rpf-previous-year-question-paper/'),
    # Adda247 — Banking
    ('Adda247', 'banking', 'IBPS PO', 'https://www.adda247.com/jobs/ibps-po-previous-year-question-paper/'),
    ('Adda247', 'banking', 'IBPS Clerk', 'https://www.adda247.com/jobs/ibps-clerk-previous-year-question-paper/'),
    ('Adda247', 'banking', 'IBPS RRB', 'https://www.adda247.com/jobs/ibps-rrb-previous-year-question-paper/'),
    ('Adda247', 'banking', 'SBI PO', 'https://www.adda247.com/jobs/sbi-po-previous-year-question-paper/'),
    ('Adda247', 'banking', 'SBI Clerk', 'https://www.adda247.com/jobs/sbi-clerk-previous-year-question-paper/'),
    # Adda247 — Bihar/BPSC (page availability changes; harmless if missing)
    ('Adda247', 'bpsc', 'BPSC', 'https://www.adda247.com/bn/jobs/bpsc-previous-year-question-paper/'),

    # Physics Wallah — Banking
    ('Physics Wallah', 'banking', 'IBPS Clerk', 'https://www.pw.live/banking/exams/ibps-clerk-previous-year-question-paper'),
    ('Physics Wallah', 'banking', 'IBPS PO', 'https://www.pw.live/banking/exams/ibps-po-previous-year-question-paper'),
    ('Physics Wallah', 'banking', 'IBPS RRB Clerk', 'https://www.pw.live/banking/exams/ibps-rrb-clerk-previous-year-question-paper'),
    ('Physics Wallah', 'banking', 'IBPS RRB PO', 'https://www.pw.live/banking/exams/ibps-rrb-po-previous-year-question-paper'),
    ('Physics Wallah', 'banking', 'SBI PO', 'https://www.pw.live/banking/exams/sbi-po-previous-year-question-paper'),
    ('Physics Wallah', 'banking', 'SBI Clerk', 'https://www.pw.live/banking/exams/sbi-clerk-previous-year-question-paper'),
    # Physics Wallah — Railway
    ('Physics Wallah', 'railway', 'RRB NTPC', 'https://www.pw.live/railway/exams/rrb-ntpc-previous-year-question-papers'),
    ('Physics Wallah', 'railway', 'RRB Group D', 'https://www.pw.live/railway/exams/rrb-group-d-previous-year-question-paper'),
    ('Physics Wallah', 'railway', 'RRB ALP', 'https://www.pw.live/railway/exams/rrb-alp-previous-year-question-paper'),
    ('Physics Wallah', 'railway', 'RRB Technician', 'https://www.pw.live/railway/exams/rrb-technician-previous-year-question-paper'),
    # Physics Wallah — SSC
    ('Physics Wallah', 'ssc', 'SSC CGL', 'https://www.pw.live/ssc/exams/ssc-cgl-previous-year-question-paper'),
    ('Physics Wallah', 'ssc', 'SSC CHSL', 'https://www.pw.live/ssc/exams/ssc-chsl-previous-year-question-paper'),
    ('Physics Wallah', 'ssc', 'SSC MTS', 'https://www.pw.live/ssc/exams/ssc-mts-previous-year-question-paper'),
    ('Physics Wallah', 'ssc', 'SSC GD Constable', 'https://www.pw.live/ssc/exams/ssc-gd-previous-year-question-paper'),
    # Physics Wallah — BPSC
    ('Physics Wallah', 'bpsc', 'BPSC', 'https://www.pw.live/state-psc/exams/bpsc-previous-year-question-paper'),
]

UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36 ExamFusionPrep-PYQ-Catalog/2.0'
SESSION = requests.Session()
SESSION.headers.update({
    'User-Agent': UA,
    'Accept-Language': 'en-US,en;q=0.9,hi;q=0.7',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
})


def clean_text(s):
    return re.sub(r'\s+', ' ', (s or '')).strip()


def slugify(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s[:125] or 'paper'


def source_short(provider):
    return 'adda247' if provider == 'Adda247' else 'pw'


def find_exam(catalog, exam_id):
    return next((x for x in catalog.get('exams', []) if x.get('id') == exam_id), None)


def ensure_exam(catalog, exam_id):
    exam = find_exam(catalog, exam_id)
    name, hi = GROUP_META.get(exam_id, (exam_id.upper(), exam_id))
    if exam:
        exam['name'], exam['hi'] = name, hi
        return exam
    exam = {'id': exam_id, 'name': name, 'hi': hi, 'years': []}
    catalog.setdefault('exams', []).append(exam)
    return exam


def get_year_node(exam, year):
    for node in exam.setdefault('years', []):
        if int(node.get('year', 0)) == int(year):
            return node
    node = {'year': year, 'papers': []}
    exam['years'].append(node)
    exam['years'].sort(key=lambda x: int(x.get('year', 0)), reverse=True)
    return node


def fetch_html(url):
    r = SESSION.get(url, timeout=30)
    r.raise_for_status()
    return r.text


def column_header(anchor):
    td = anchor.find_parent(['td', 'th'])
    tr = anchor.find_parent('tr')
    table = anchor.find_parent('table')
    if not td or not tr or not table:
        return ''
    cells = tr.find_all(['td', 'th'], recursive=False)
    try:
        idx = cells.index(td)
    except ValueError:
        return ''
    for header_row in table.find_all('tr')[:3]:
        hcells = header_row.find_all(['th', 'td'], recursive=False)
        if idx < len(hcells):
            text = clean_text(hcells[idx].get_text(' ', strip=True))
            if text and header_row is not tr:
                return text
    return ''


def nearest_heading(anchor):
    h = anchor.find_previous(['h2', 'h3', 'h4', 'h5'])
    return clean_text(h.get_text(' ', strip=True)) if h else ''


def row_text(anchor):
    tr = anchor.find_parent('tr')
    if tr:
        return clean_text(tr.get_text(' ', strip=True))
    li = anchor.find_parent('li')
    if li:
        return clean_text(li.get_text(' ', strip=True))
    p = anchor.find_parent('p')
    if p:
        return clean_text(p.get_text(' ', strip=True))
    return clean_text(anchor.parent.get_text(' ', strip=True)) if anchor.parent else ''


def context(anchor, exam_label):
    return ' · '.join(x for x in [nearest_heading(anchor), row_text(anchor), column_header(anchor), exam_label] if x)


def infer_year(anchor, exam_label):
    # Use local row/header context only; never infer from article publication date.
    candidates = [row_text(anchor), nearest_heading(anchor), column_header(anchor), clean_text(anchor.get_text(' ', strip=True))]
    for text in candidates:
        years = re.findall(r'\b20(?:21|22|23|24|25)\b', text)
        if years:
            y = int(years[0])
            if y in YEARS:
                return y
    return None


def infer_language(anchor, text):
    h = column_header(anchor).lower()
    t = text.lower()
    if 'hindi' in h or 'हिंदी' in h or 'hindi' in t or re.search(r'[\u0900-\u097f]', text):
        return 'Hindi'
    if 'english' in h or 'english' in t:
        return 'English'
    return 'English'


def infer_stage(text):
    t = text.lower()
    if 'cbt 2' in t or 'cbt-2' in t or 'cbt ii' in t:
        return 'CBT 2'
    if 'cbt 1' in t or 'cbt-1' in t or 'cbt i' in t:
        return 'CBT 1'
    if 'tier 2' in t or 'tier-ii' in t or 'tier ii' in t:
        return 'Tier II'
    if 'tier 1' in t or 'tier-i' in t or 'tier i' in t:
        return 'Tier I'
    if 'mains' in t or 'main exam' in t:
        return 'Mains'
    if 'prelim' in t:
        return 'Prelims'
    return 'Previous Year Paper'


def parse_date(text):
    # Preserve a readable date/shift from local context when available.
    m = re.search(r'\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+20\d{2})\b', text, re.I)
    return m.group(1) if m else None


def public_resource(provider, href):
    if not href:
        return False
    u = urlparse(href)
    host = (u.netloc or '').lower()
    path = (u.path or '').lower()

    # Explicit public file hosts used by these source pages.
    if provider == 'Adda247':
        if host.endswith('adda247.com') and '.pdf' in path:
            return True
    if provider == 'Physics Wallah':
        if host == 'static.pw.live' and '.pdf' in path:
            return True

    # Public Drive viewer links embedded on source pages. No login/paywall bypass.
    if host == 'drive.google.com' and ('/file/d/' in path or '/open' in path or '/uc' in path):
        return True
    return False


def build_label(anchor, exam_label, year, language):
    row = row_text(anchor)
    heading = nearest_heading(anchor)
    text = row or heading or clean_text(anchor.get_text(' ', strip=True))
    text = re.sub(r'(?i)\b(click\s*(?:here|to\s*download)?|download\s*(?:pdf|link)?)\b', ' ', text)
    text = clean_text(text).strip('·|- ')
    if len(text) < 4:
        text = f'{exam_label} {year} Question Paper'
    if exam_label.lower() not in text.lower():
        text = f'{exam_label} · {text}'
    if language.lower() not in text.lower():
        text = f'{text} · {language}'
    return text[:220]


def semantic_key(exam_label, year, label, language):
    s = label.lower()
    s = re.sub(r'\b(testbook|adda247|physics wallah|pw|public|official|download|pdf|click|here)\b', ' ', s)
    s = re.sub(r'[^a-z0-9]+', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return (exam_label.lower(), int(year), language.lower(), s)


def main():
    catalog = json.loads(CATALOG.read_text(encoding='utf-8'))
    existing_urls, existing_ids, existing_semantic = set(), set(), set()
    for exam in catalog.get('exams', []):
        for y in exam.get('years', []):
            year = int(y.get('year', 0))
            for p in y.get('papers', []):
                url = (p.get('pdf') or '').split('#')[0]
                if url:
                    existing_urls.add(url)
                if p.get('id'):
                    existing_ids.add(p['id'])
                existing_semantic.add(semantic_key(p.get('paper', exam.get('name','')), year, p.get('label',''), p.get('language','English')))

    added = []
    errors = []
    stats = []

    for provider, group_id, exam_label, page_url in SOURCES:
        try:
            html = fetch_html(page_url)
        except Exception as e:
            errors.append((provider, exam_label, str(e)))
            print(f'WARN {provider} {exam_label}: {e}', file=sys.stderr)
            continue

        soup = BeautifulSoup(html, 'html.parser')
        candidates = page_added = skipped_no_year = skipped_dup = 0
        for a in soup.find_all('a', href=True):
            href = urljoin(page_url, a.get('href','').strip()).split('#')[0]
            if not public_resource(provider, href):
                continue
            candidates += 1
            if href in existing_urls:
                skipped_dup += 1
                continue

            year = infer_year(a, exam_label)
            if year not in YEARS:
                skipped_no_year += 1
                continue

            ctx = context(a, exam_label)
            language = infer_language(a, ctx)
            stage = infer_stage(ctx)
            label = build_label(a, exam_label, year, language)
            skey = semantic_key(exam_label, year, label, language)
            if skey in existing_semantic:
                skipped_dup += 1
                continue

            base = f'{source_short(provider)}-{slugify(exam_label)}-{year}-{slugify(label)}'
            pid = base
            n = 2
            while pid in existing_ids:
                pid = f'{base}-{n}'
                n += 1

            paper = {
                'id': pid,
                'label': label,
                'stage': stage,
                'paper': exam_label,
                'language': language,
                'pdf': href,
                'source': f'Free/public {provider} PYQ resource · {exam_label}',
                'source_page': page_url,
            }
            date = parse_date(ctx)
            if date:
                paper['date'] = date

            exam = ensure_exam(catalog, group_id)
            get_year_node(exam, year).setdefault('papers', []).append(paper)
            existing_urls.add(href)
            existing_ids.add(pid)
            existing_semantic.add(skey)
            added.append((provider, group_id, year, exam_label, label, href))
            page_added += 1

        stats.append((provider, exam_label, candidates, page_added, skipped_no_year, skipped_dup))
        print(f'{provider} {exam_label}: candidates={candidates}, added={page_added}, no_year={skipped_no_year}, duplicate={skipped_dup}')

    # Stable ordering and empty-year cleanup.
    for exam in catalog.get('exams', []):
        exam['years'] = [y for y in exam.get('years', []) if y.get('papers')]
        exam['years'].sort(key=lambda x: int(x.get('year',0)), reverse=True)
        for y in exam['years']:
            y['papers'] = sorted(y.get('papers', []), key=lambda p: (p.get('paper',''), p.get('stage',''), p.get('date',''), p.get('label','')))

    catalog['updated'] = '2026-09-16'
    catalog['version'] = max(int(catalog.get('version', 1)) + (1 if added else 0), 7)
    catalog['multi_source_public_import'] = {
        'policy': 'Only openly linked Adda247/Physics Wallah PDFs or public Drive viewers from PYQ pages; no login/paywall/locked-content bypass; files remain externally hosted.',
        'sources_scanned': len(stats),
        'added_this_run': len(added),
        'providers': sorted(set(x[0] for x in stats)),
    }

    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    totals = {}
    total = 0
    for exam in catalog.get('exams', []):
        count = sum(len(y.get('papers', [])) for y in exam.get('years', []))
        totals[exam.get('id')] = count
        total += count
    providers = {}
    for provider, *_ in added:
        providers[provider] = providers.get(provider, 0) + 1
    print(f'MULTISOURCE SUMMARY added={len(added)} added_by_provider={providers} total={total} by_exam={totals}')
    if errors:
        print(f'FETCH WARNINGS ({len(errors)}):')
        for e in errors:
            print('  ', e)


if __name__ == '__main__':
    main()
