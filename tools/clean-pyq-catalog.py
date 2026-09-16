#!/usr/bin/env python3
import json
import re
from pathlib import Path

CATALOG = Path('PYQ/data/pdf-catalog.json')
TARGET = {2021, 2022, 2023, 2024, 2025}
ALL_YEAR_RE = re.compile(r'\b(20(?:1[0-9]|2[0-9]))\b')
NON_PYQ_RE = re.compile(r'\b(mock|similar\s+paper|model\s+paper|sample\s+paper|practice\s+(?:paper|set))\b', re.I)


def explicit_years(p):
    # Label is the safest human-readable identity. Do not use upload URL dates.
    label = str(p.get('label', ''))
    return {int(x) for x in ALL_YEAR_RE.findall(label)}


def is_non_pyq(p):
    text = f"{p.get('label','')} {p.get('paper','')} {p.get('pdf','')}"
    return bool(NON_PYQ_RE.search(text))


def main():
    data = json.loads(CATALOG.read_text(encoding='utf-8'))
    removed_outside = []
    removed_non_pyq = []
    moved = []

    for exam in data.get('exams', []):
        target_nodes = {int(y.get('year', 0)): y for y in exam.get('years', []) if int(y.get('year',0)) in TARGET}
        for year in TARGET:
            target_nodes.setdefault(year, {'year': year, 'papers': []})

        original = []
        for y in exam.get('years', []):
            bucket = int(y.get('year', 0))
            for p in y.get('papers', []):
                original.append((bucket, p))

        for y in target_nodes.values():
            y['papers'] = []

        for bucket, p in original:
            if bucket not in TARGET:
                removed_outside.append((exam.get('id'), bucket, p.get('label')))
                continue
            if is_non_pyq(p):
                removed_non_pyq.append((exam.get('id'), bucket, p.get('label')))
                continue

            years = explicit_years(p)
            target_years = years & TARGET
            outside_years = years - TARGET

            # One explicit year in the label is strong enough to enforce.
            if len(years) == 1:
                only = next(iter(years))
                if only not in TARGET:
                    removed_outside.append((exam.get('id'), bucket, p.get('label')))
                    continue
                dest = only
                if dest != bucket:
                    moved.append((exam.get('id'), bucket, dest, p.get('label')))
                target_nodes[dest]['papers'].append(p)
                continue

            # Multiple explicit years can mean exam-cycle vs held-on date; keep the
            # current bucket only if it is one of those target years, otherwise use
            # the sole target year when unambiguous. Otherwise leave bucket unchanged.
            if len(target_years) == 1 and bucket not in years and outside_years:
                dest = next(iter(target_years))
                moved.append((exam.get('id'), bucket, dest, p.get('label')))
                target_nodes[dest]['papers'].append(p)
            else:
                target_nodes[bucket]['papers'].append(p)

        # Exact URL dedupe after moves. Prefer the first occurrence in descending year order.
        seen_urls = set()
        cleaned_years = []
        for year in sorted(TARGET, reverse=True):
            node = target_nodes[year]
            unique = []
            for p in node.get('papers', []):
                url = str(p.get('pdf','')).split('#')[0]
                if url and url in seen_urls:
                    continue
                if url:
                    seen_urls.add(url)
                unique.append(p)
            if unique:
                node['papers'] = sorted(unique, key=lambda p: (p.get('paper',''), p.get('date',''), p.get('shift',0) if isinstance(p.get('shift',0), int) else 0, p.get('label','')))
                cleaned_years.append(node)
        exam['years'] = cleaned_years

    before_meta = data.get('catalog_cleanup', {})
    data['catalog_cleanup'] = {
        'policy': 'Keep 2021–2025 only; move papers with one explicit target year to that year; remove papers with one explicit out-of-window year; remove mock/similar/model/sample/practice papers; dedupe exact PDF URLs.',
        'removed_out_of_window_this_run': len(removed_outside),
        'removed_non_pyq_this_run': len(removed_non_pyq),
        'moved_to_correct_year_this_run': len(moved),
    }
    if removed_outside or removed_non_pyq or moved:
        data['version'] = int(data.get('version', 1)) + 1
    data['updated'] = '2026-09-16'
    CATALOG.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    counts = {}
    total = 0
    for e in data.get('exams', []):
        n = sum(len(y.get('papers', [])) for y in e.get('years', []))
        counts[e.get('id')] = n
        total += n
    print(f'CLEAN SUMMARY removed_outside={len(removed_outside)} removed_non_pyq={len(removed_non_pyq)} moved={len(moved)} total={total} by_exam={counts}')
    for row in removed_non_pyq[:20]: print('REMOVED NON-PYQ', row)
    for row in removed_outside[:20]: print('REMOVED OUTSIDE', row)
    for row in moved[:20]: print('MOVED', row)

if __name__ == '__main__':
    main()
