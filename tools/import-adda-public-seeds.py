#!/usr/bin/env python3
import json
import re
from pathlib import Path

CATALOG = Path('PYQ/data/pdf-catalog.json')
SOURCE_PAGE = 'https://www.adda247.com/jobs/ssc-mts-previous-year-question-paper/'
BASE24 = 'https://www.adda247.com/jobs/wp-content/uploads/2025/06/'
BASE23 = 'https://www.adda247.com/jobs/wp-content/uploads/sites/22/2025/06/'

SEEDS = []

def add24(date, shift, file):
    SEEDS.append((2024, date, shift, BASE24 + file))

def add23(date, shift, file):
    SEEDS.append((2023, date, shift, BASE23 + file))

# SSC MTS 2024 — English, 65 public shift PDFs exposed by Adda247's PYQ table.
add24('30-09-2024',1,'27113121/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_30-09-2024_S1-min.pdf')
add24('30-09-2024',2,'27113122/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_30-09-2024_S2-min.pdf')
add24('30-09-2024',3,'27113123/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_30-09-2024_S3-min.pdf')
add24('01-10-2024',1,'27113021/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_01-10-2024_S1.pdf')
add24('01-10-2024',2,'27113022/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_01-10-2024_S2-min.pdf')
add24('07-10-2024',1,'27113028/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_07-01-2024_S1-min.pdf')
add24('07-10-2024',2,'27113029/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_07-01-2024_S2-min.pdf')
add24('07-10-2024',3,'27113030/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_07-01-2024_S3-min.pdf')
add24('08-10-2024',1,'27113031/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_08-10-2024_S1-min.pdf')
add24('08-10-2024',2,'27113032/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_08-10-2024_S2-min.pdf')
add24('08-10-2024',3,'27113033/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_08-10-2024_S3-min.pdf')
add24('09-10-2024',1,'27113034/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_09-10-2024_S1-min.pdf')
add24('09-10-2024',2,'27113035/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_09-10-2024_S2-min.pdf')
add24('09-10-2024',3,'27113037/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_09-10-2024_S3-min.pdf')
add24('14-10-2024',1,'27113047/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_14-10-2024_S1-min.pdf')
add24('14-10-2024',2,'27113048/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_14-10-2024_S2-min.pdf')
add24('14-10-2024',3,'27113049/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_14-10-2024_S3-min.pdf')
add24('15-10-2024',1,'27113053/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_15-10-2024_S1-min.pdf')
add24('15-10-2024',2,'27113054/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_15-10-2024_S2-min.pdf')
add24('15-10-2024',3,'27113055/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_15-10-2024_S3-min.pdf')
add24('16-10-2024',1,'27113056/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_16-10-2024_S1-min.pdf')
add24('16-10-2024',2,'27113057/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_16-10-2024_S2-min.pdf')
add24('16-10-2024',3,'27113058/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_16-10-2024_S3-min.pdf')
add24('17-10-2024',1,'27113059/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_17-10-2024_S1-min.pdf')
add24('17-10-2024',2,'27113100/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_17-10-2024_S2-min.pdf')
add24('17-10-2024',3,'27113101/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_17-10-2024_S3-min.pdf')
add24('18-10-2024',1,'27113102/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_18-10-2024_S1-min.pdf')
add24('18-10-2024',2,'27113103/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_18-10-2024_S2-min.pdf')
add24('18-10-2024',3,'27113104/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_18-10-2024_S3-min.pdf')
add24('21-10-2024',1,'27113105/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_21-10-2024_S1-min.pdf')
add24('21-10-2024',2,'27113106/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_21-10-2024_S2-min.pdf')
add24('21-10-2024',3,'27113108/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_21-10-2024_S3-min.pdf')
add24('22-10-2024',1,'27113109/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_22-10-2024_S1-min.pdf')
add24('22-10-2024',2,'27113110/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_22-10-2024_S2-min.pdf')
add24('22-10-2024',3,'27113111/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_22-10-2024_S3-min.pdf')
add24('23-10-2024',1,'27113112/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_23-10-2024_S1-min.pdf')
add24('23-10-2024',2,'27113113/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_23-10-2024_S2-min.pdf')
add24('23-10-2024',3,'27113114/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_23-10-2024_S3-min.pdf')
add24('28-10-2024',1,'27113115/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_28-10-2024_S1-min.pdf')
add24('28-10-2024',2,'27113116/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_28-10-2024_S2-min.pdf')
add24('28-10-2024',3,'27113117/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_28-10-2024_S3-min.pdf')
add24('29-10-2024',1,'27113118/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_29-10-2024_S1-min.pdf')
add24('29-10-2024',2,'27113119/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_29-10-2024_S2-min.pdf')
add24('29-10-2024',3,'27113120/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_29-10-2024_S3-min.pdf')
add24('30-10-2024',1,'27113124/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_30-10-2024_S1-min.pdf')
add24('30-10-2024',2,'27113125/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_30-10-2024_S2-min.pdf')
add24('30-10-2024',3,'27113126/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_30-10-2024_S3-min.pdf')
add24('04-11-2024',1,'27113023/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_04-11-2024_S1-min.pdf')
add24('04-11-2024',2,'27113024/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_04-11-2024_S2-min.pdf')
add24('04-11-2024',3,'27113025/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_04-11-2024_S3-min.pdf')
add24('05-11-2024',1,'27152650/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_05-11-2024_S1-min-1.pdf')
add24('05-11-2024',2,'27152651/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_05-11-2024_S2-min-1.pdf')
add24('05-11-2024',3,'27152652/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_05-11-2024_S3-min-1.pdf')
add24('11-11-2024',1,'27152654/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_11-11-2024_S1-min-1.pdf')
add24('11-11-2024',2,'27152655/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_11-11-2024_S2-min-1.pdf')
add24('11-11-2024',3,'27152656/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_11-11-2024_S3-min-1.pdf')
add24('12-11-2024',1,'27152657/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_12-11-2024_S1-min-1.pdf')
add24('12-11-2024',2,'27152657/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_12-11-2024_S2-min-1.pdf')
add24('12-11-2024',3,'27152658/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_12-11-2024_S3-min-1.pdf')
add24('13-11-2024',1,'27152659/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_13-11-2024_S1-min-1.pdf')
add24('13-11-2024',2,'27152700/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_13-11-2024_S2-min-1.pdf')
add24('13-11-2024',3,'27152701/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_13-11-2024_S3-min-1.pdf')
add24('14-11-2024',1,'27152707/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_14-11-2024_S1-min-1.pdf')
add24('14-11-2024',2,'27152708/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_14-11-2024_S2-min-1.pdf')
add24('14-11-2024',3,'27152709/EN_SSC_MTS_2024_Official_Question_Papers_65_sets_14-11-2024_S3-min-1.pdf')

# SSC MTS 2023 — 27 English public shift PDFs from Adda247's table.
for date, files in {
 '01-09-2023': [('30112438','S1'),('30112440','S2'),('30112441','S3')],
 '04-09-2023': [('30112443','S1'),('30112445','S2'),('30112446','S3')],
 '05-09-2023': [('30112448','S1'),('30112450','S2'),('30112451','S3')],
 '06-09-2023': [('30112454','S1'),('30112455','S2'),('30112457','S3')],
 '08-09-2023': [('30112458','S1'),('30112500','S2'),('30112502','S3')],
 '11-09-2023': [('30112504','S1'),('30112506','S2'),('30112507','S3')],
 '12-09-2023': [('30112509','S1'),('30112511','S2'),('30112513','S3')],
 '13-09-2023': [('30112515','S1'),('30112517','S2'),('30112519','S3')],
 '14-09-2023': [('30112520','S1'),('30112522','S2'),('30112524','S3')],
}.items():
    dmy = date
    for folder, s in files:
        shift = int(s[-1])
        add23(dmy, shift, f'{folder}/MTS-2023-Papers-English-{dmy}-{s}.pdf')


def norm_date(text):
    text = text or ''
    m = re.search(r'\b(\d{1,2})[-/](\d{1,2})[-/](20\d{2})\b', text)
    if m:
        return f'{int(m.group(1)):02d}-{int(m.group(2)):02d}-{m.group(3)}'
    # ISO date metadata
    m = re.search(r'\b(20\d{2})-(\d{2})-(\d{2})\b', text)
    if m:
        return f'{m.group(3)}-{m.group(2)}-{m.group(1)}'
    return None


def norm_shift(text):
    text = (text or '').lower()
    m = re.search(r'(?:shift\s*|[_-]s)([123])\b', text)
    if m:
        return int(m.group(1))
    if 'morning' in text: return 1
    if 'afternoon' in text: return 2
    if 'evening' in text: return 3
    return None


def signature(paper, year):
    blob = ' '.join(str(paper.get(k,'')) for k in ('label','date','pdf','paper','source'))
    low = blob.lower()
    if 'mts' not in low and 'multi tasking' not in low:
        return None
    date = norm_date(blob)
    shift = norm_shift(blob)
    if not date or not shift:
        return None
    lang = (paper.get('language') or 'English').lower()
    return ('ssc mts', int(year), date, shift, lang)


def main():
    data = json.loads(CATALOG.read_text(encoding='utf-8'))
    ssc = next((x for x in data.get('exams',[]) if x.get('id') == 'ssc'), None)
    if not ssc:
        ssc = {'id':'ssc','name':'SSC','hi':'एसएससी','years':[]}
        data.setdefault('exams',[]).append(ssc)

    existing_urls = set()
    existing_sigs = set()
    for exam in data.get('exams',[]):
        for y in exam.get('years',[]):
            year = int(y.get('year',0))
            for p in y.get('papers',[]):
                if p.get('pdf'): existing_urls.add(p['pdf'].split('#')[0])
                sig = signature(p, year)
                if sig: existing_sigs.add(sig)

    added = 0
    skipped_url = 0
    skipped_same_paper = 0
    for year, date, shift, url in SEEDS:
        sig = ('ssc mts', year, date, shift, 'english')
        if url in existing_urls:
            skipped_url += 1
            continue
        if sig in existing_sigs:
            skipped_same_paper += 1
            continue
        yn = next((x for x in ssc['years'] if int(x.get('year',0)) == year), None)
        if yn is None:
            yn = {'year':year,'papers':[]}
            ssc['years'].append(yn)
        yn.setdefault('papers',[]).append({
            'id': f'adda247-ssc-mts-{year}-{date}-shift-{shift}-english',
            'label': f'SSC MTS {year} · {date} · Shift {shift} · English',
            'stage': 'Tier I',
            'paper': 'SSC MTS',
            'language': 'English',
            'date': date,
            'shift': shift,
            'pdf': url,
            'source': 'Free/public Adda247 PYQ PDF · SSC MTS',
            'source_page': SOURCE_PAGE,
        })
        existing_urls.add(url)
        existing_sigs.add(sig)
        added += 1

    ssc['years'].sort(key=lambda x:int(x.get('year',0)), reverse=True)
    for y in ssc['years']:
        y['papers'] = sorted(y.get('papers',[]), key=lambda p:(p.get('paper',''),p.get('date',''),p.get('shift',0),p.get('label','')))

    data['version'] = max(int(data.get('version',1)) + (1 if added else 0), 8)
    data['updated'] = '2026-09-16'
    data['adda247_seed_import'] = {
        'source_page': SOURCE_PAGE,
        'verified_public_seed_count': len(SEEDS),
        'added_this_run': added,
        'skipped_exact_url': skipped_url,
        'skipped_same_exam_date_shift_language': skipped_same_paper,
        'policy': 'Public Adda247 PDF links exposed in the SSC MTS PYQ table; no locked/login/paywall bypass; duplicate date+shift papers skipped.'
    }
    CATALOG.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    total = sum(len(y.get('papers',[])) for e in data.get('exams',[]) for y in e.get('years',[]))
    ssc_total = sum(len(y.get('papers',[])) for y in ssc.get('years',[]))
    print(f'ADDA SEED SUMMARY seeds={len(SEEDS)} added={added} same_paper_skipped={skipped_same_paper} url_skipped={skipped_url} total={total} ssc={ssc_total}')

if __name__ == '__main__':
    main()
