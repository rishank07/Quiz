#!/usr/bin/env python3
"""Keep homepage integrations that are outside the generic section counter.

The generic book-count workflow owns the landing-count block, so it used to
remove Original Practice and Crux & Tricks every time it regenerated counts.
This post-processing step restores those authoritative totals, adds the PYQ
library with its live catalog total, keeps document-oriented units labelled
correctly, and ensures the homepage full-text bridge remains wired in.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

COUNT_RE = re.compile(
    r'(<script\s+id="efLandingCountsData"\s+type="application/json">)(.*?)(</script>)',
    re.I | re.S,
)
FULLTEXT_MARKER = "<!-- ExamFusion homepage full-text bridge -->"
FULLTEXT_TAG = (
    f"  {FULLTEXT_MARKER}\n"
    '  <script src="./homepage-search-ui.js?v=20260924instantreturn1" defer></script>\n'
    '  <script src="./homepage-fulltext-search.js?v=20260924instantreturn1" defer></script>\n'
)
LANDING_MARKER = "<!-- ExamFusion landing counts: start -->"
PYQ_CARD_MARKER = "data-efp-pyq-card"
PYQ_CARD = '''        <li data-efp-pyq-card>
          <a href="./PYQ/index.html" onclick="openPage(event)">
            <i class="fa-solid fa-file-circle-question menu-icon"></i>
            <span class="link-text bilabel"><span class="bilabel-en">Previous Year Papers (PYQ)</span><span class="bilabel-hi">पिछले वर्षों के प्रश्नपत्र</span></span>
            <span class="badge-new">PYQ</span>
            <i class="fa-solid fa-chevron-right chevron-icon"></i>
          </a>
        </li>

'''

COMPACT_LABEL_OLD = '''        if (unit === "Maps") return value + " Maps";
        if (unit === "Facts") return value + " Facts";
        return value + " Q";'''
COMPACT_LABEL_NEW = '''        if (unit === "Maps") return value + " Maps";
        if (unit === "Facts") return value + " Facts";
        if (unit === "PDFs") return value + " PDFs";
        if (unit === "PYQs") return value + " PYQs";
        return value + " Q";'''
FULL_LABEL_OLD = '''        if (unit === "Maps") return value + (Number(total) === 1 ? " Map" : " Maps");
        if (unit === "Facts") return value + (Number(total) === 1 ? " Fact" : " Facts");
        return value + (Number(total) === 1 ? " Question" : " Questions");'''
FULL_LABEL_NEW = '''        if (unit === "Maps") return value + (Number(total) === 1 ? " Map" : " Maps");
        if (unit === "Facts") return value + (Number(total) === 1 ? " Fact" : " Facts");
        if (unit === "PDFs") return value + (Number(total) === 1 ? " PDF" : " PDFs");
        if (unit === "PYQs") return value + (Number(total) === 1 ? " PYQ" : " PYQs");
        return value + (Number(total) === 1 ? " Question" : " Questions");'''


def original_practice_total(repo: Path) -> int:
    path = repo / "Original Practice" / "question-counts.json"
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        total = int(data.get("total_questions", 0))
        if total > 0:
            return total
    except (OSError, ValueError, TypeError, json.JSONDecodeError):
        pass
    return 41418


def crux_document_total(repo: Path) -> int:
    path = repo / "Crux-Tricks" / "crux-manifest.js"
    try:
        raw = path.read_text(encoding="utf-8", errors="replace")
        # EF_CRUX_DOCS contains one object per source PDF/document. Counting
        # the stable ct ids stays correct even when a PDF has multiple pages.
        total = len(re.findall(r'\{"id":"ct\d+"', raw))
        if total > 0:
            return total
    except OSError:
        pass
    return 466


def pyq_document_total(repo: Path) -> int:
    path = repo / "PYQ" / "data" / "pdf-catalog.json"
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        total = sum(
            len(year.get("papers", []))
            for exam in data.get("exams", [])
            for year in exam.get("years", [])
        )
        if total > 0:
            return total
    except (OSError, TypeError, json.JSONDecodeError):
        pass
    return 853


def ensure_pyq_card(raw: str) -> str:
    if PYQ_CARD_MARKER in raw:
        return raw
    anchor = '''        <li>\n          <a href="./Crux-Tricks/index.html" onclick="openPage(event)">'''
    if anchor not in raw:
        raise SystemExit("Crux & Tricks landing card anchor not found in index.html")
    return raw.replace(anchor, PYQ_CARD + anchor, 1)


def update_index(repo: Path) -> bool:
    index = repo / "index.html"
    raw = index.read_text(encoding="utf-8", errors="replace")
    changed = False

    updated = ensure_pyq_card(raw)
    if updated != raw:
        raw = updated
        changed = True

    # Keep the headline copy and hub count aligned with the new landing card.
    replacements = {
        "Free MCQs, Original Practice, Crux, Memory Tricks, Mind Maps &amp; Current Affairs":
            "Free MCQs, Original Practice, PYQs, Crux, Memory Tricks, Mind Maps &amp; Current Affairs",
        '<i class="fa-solid fa-layer-group"></i>10 Study Hubs':
            '<i class="fa-solid fa-layer-group"></i>11 Study Hubs',
        "Free SSC, Railway, UPSC & BPSC preparation — 46,414 Original Practice questions, 476 revision crux & memory-trick PDFs, Mind Maps and Current Affairs.":
            "Free SSC, Railway, UPSC & BPSC preparation — Original Practice, previous-year papers (PYQs), revision crux & memory-trick PDFs, Mind Maps and Current Affairs.",
    }
    for old, new in replacements.items():
        updated = raw.replace(old, new)
        if updated != raw:
            raw = updated
            changed = True

    match = COUNT_RE.search(raw)
    if not match:
        raise SystemExit("efLandingCountsData block not found in index.html")

    try:
        payload = json.loads(match.group(2))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid efLandingCountsData JSON: {exc}") from exc

    op_total = original_practice_total(repo)
    crux_total = crux_document_total(repo)
    pyq_total = pyq_document_total(repo)
    payload["./Original Practice/index.html"] = {
        "total": op_total,
        "unit": "Questions",
    }
    payload["./PYQ/index.html"] = {
        "total": pyq_total,
        "unit": "PYQs",
    }
    payload["./Crux-Tricks/index.html"] = {
        "total": crux_total,
        "unit": "PDFs",
    }
    encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    replacement = match.group(1) + encoded + match.group(3)
    updated = raw[: match.start()] + replacement + raw[match.end() :]
    if updated != raw:
        raw = updated
        changed = True

    # The generic landing formatter treats every unknown unit as Questions.
    # Explicitly teach it document-oriented units used by Crux and PYQ.
    updated = raw.replace(COMPACT_LABEL_OLD, COMPACT_LABEL_NEW)
    updated = updated.replace(FULL_LABEL_OLD, FULL_LABEL_NEW)
    if updated != raw:
        raw = updated
        changed = True

    # Let deep-search result groups use the same icon as the PYQ landing card.
    section_icon_anchor = '        "Original Practice": "fa-pen-to-square",\n        "Crux & Tricks": "fa-lightbulb",'
    section_icon_replacement = '        "Original Practice": "fa-pen-to-square",\n        "Previous Year Papers (PYQ)": "fa-file-circle-question",\n        "Crux & Tricks": "fa-lightbulb",'
    updated = raw.replace(section_icon_anchor, section_icon_replacement)
    if updated != raw:
        raw = updated
        changed = True

    # Remove any older copy/version of the bridge, then place one canonical tag
    # immediately before the landing-count block. This location is after the
    # homepage search listener and before the count-rendering helper.
    bridge_re = re.compile(
        r'\s*<!--\s*ExamFusion homepage full-text bridge\s*-->\s*'
        r'(?:<script\s+src=["\'][^"\']*homepage-search-ui\.js(?:\?[^"\']*)?["\']\s+defer\s*>\s*</script>\s*)?'
        r'<script\s+src=["\'][^"\']*homepage-fulltext-search\.js(?:\?[^"\']*)?["\']\s+defer\s*>\s*</script>\s*',
        re.I,
    )
    existing_bridge = bridge_re.search(raw)
    bridge_tag = FULLTEXT_TAG
    if existing_bridge:
        # Keep the page's current asset versions. The counts workflow must not
        # roll back a search fix whenever it regenerates the landing block.
        script_tags = re.findall(
            r'<script\s+src=["\'][^"\']*homepage-(?:search-ui|fulltext-search)\.js'
            r'(?:\?[^"\']*)?["\']\s+defer\s*>\s*</script>',
            existing_bridge.group(0),
            re.I,
        )
        if len(script_tags) == 2:
            bridge_tag = f"  {FULLTEXT_MARKER}\n  {script_tags[0]}\n  {script_tags[1]}\n"
    without_bridge = bridge_re.sub("\n", raw)
    if LANDING_MARKER not in without_bridge:
        raise SystemExit("Landing-count marker not found in index.html")
    updated = without_bridge.replace(LANDING_MARKER, bridge_tag + "  " + LANDING_MARKER, 1)
    if updated != raw:
        raw = updated
        changed = True

    if changed:
        index.write_text(raw, encoding="utf-8", newline="\n")

    print(f"Original Practice: {op_total:,} Questions")
    print(f"PYQ Library: {pyq_total:,} PYQs")
    print(f"Crux & Tricks: {crux_total:,} PDFs")
    print("Landing hub count: 11")
    print("Homepage full-text bridge: wired")
    return changed


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=".")
    args = parser.parse_args()
    repo = Path(args.repo).resolve()
    update_index(repo)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
