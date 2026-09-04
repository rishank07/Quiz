#!/usr/bin/env python3
"""Keep homepage integrations that are outside the generic section counter.

The generic book-count workflow owns the landing-count block, so it used to
remove Original Practice and Crux & Tricks every time it regenerated counts.
This small post-processing step restores those two authoritative totals and
ensures the homepage full-text bridge remains wired in.
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
    '  <script src="./homepage-fulltext-search.js?v=20260905books2" defer></script>\n'
)
LANDING_MARKER = "<!-- ExamFusion landing counts: start -->"


def original_practice_total(repo: Path) -> int:
    path = repo / "Original Practice" / "question-counts.json"
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        total = int(data.get("total_questions", 0))
        if total > 0:
            return total
    except (OSError, ValueError, TypeError, json.JSONDecodeError):
        pass
    return 38776


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
    return 447


def update_index(repo: Path) -> bool:
    index = repo / "index.html"
    raw = index.read_text(encoding="utf-8", errors="replace")
    changed = False

    match = COUNT_RE.search(raw)
    if not match:
        raise SystemExit("efLandingCountsData block not found in index.html")

    try:
        payload = json.loads(match.group(2))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid efLandingCountsData JSON: {exc}") from exc

    op_total = original_practice_total(repo)
    crux_total = crux_document_total(repo)
    payload["./Original Practice/index.html"] = {
        "total": op_total,
        "unit": "Questions",
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

    # Remove any older copy/version of the bridge, then place one canonical tag
    # immediately before the landing-count block. This location is after the
    # homepage search listener and before the count-rendering helper.
    bridge_re = re.compile(
        r'\s*<!--\s*ExamFusion homepage full-text bridge\s*-->\s*'
        r'<script\s+src=["\'][^"\']*homepage-fulltext-search\.js(?:\?[^"\']*)?["\']\s+defer\s*>\s*</script>\s*',
        re.I,
    )
    without_bridge = bridge_re.sub("\n", raw)
    if LANDING_MARKER not in without_bridge:
        raise SystemExit("Landing-count marker not found in index.html")
    updated = without_bridge.replace(LANDING_MARKER, FULLTEXT_TAG + "  " + LANDING_MARKER, 1)
    if updated != raw:
        raw = updated
        changed = True

    if changed:
        index.write_text(raw, encoding="utf-8", newline="\n")

    print(f"Original Practice: {op_total:,} Questions")
    print(f"Crux & Tricks: {crux_total:,} PDFs")
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
