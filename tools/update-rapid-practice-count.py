#!/usr/bin/env python3
"""Keep the Current Affairs Rapid Practice total in sync with its quiz data.

Rapid Practice pages currently exist in multiple formats:
- legacy/self-contained pages with <script id="master-data"> JSON
- generated pages exposing window.RAPID_CONFIG with a total field
- generated self-contained pages exposing a TOTAL_COUNT constant

This helper understands all three formats, refreshes the hub catalog from each
quiz, and updates its visible totals and standard question-count meta override.
The existing section-count workflow runs it whenever quiz content changes.
"""
from __future__ import annotations

import argparse
import ast
import json
import re
from pathlib import Path
from urllib.parse import unquote

MASTER_DATA_RE = re.compile(
    r'<script\b[^>]*\bid=["\']master-data["\'][^>]*>(.*?)</script\s*>',
    re.I | re.S,
)
RAPID_CONFIG_TOTAL_RE = re.compile(
    r'window\.RAPID_CONFIG\s*=\s*\{.*?\btotal\s*:\s*(\d+)',
    re.I | re.S,
)
TOTAL_COUNT_RE = re.compile(r'\bTOTAL_COUNT\s*=\s*(\d+)', re.I)
META_RE = re.compile(
    r'<meta\s+name=["\']efp-question-count["\']\s+content=["\']\d+["\']\s*/?>',
    re.I,
)
CATALOG_RE = re.compile(r'\bconst\s+DATA\s*=\s*(\[.*?\]);', re.S)


def count_question_records(node) -> int:
    """Count Rapid Practice question objects without depending on section names."""
    if isinstance(node, dict):
        # Rapid Practice question records use q/o/a (+ exp). Count the record
        # once, then do not recurse into its bilingual text/options.
        if "q" in node and "o" in node and "a" in node and isinstance(node.get("o"), list):
            return 1
        return sum(count_question_records(value) for value in node.values())
    if isinstance(node, list):
        return sum(count_question_records(value) for value in node)
    return 0


def count_page(path: Path) -> int:
    raw = path.read_text(encoding="utf-8", errors="replace")

    # Original Rapid Practice format: count actual question records from the
    # embedded master-data JSON so the total cannot drift from the data.
    master_match = MASTER_DATA_RE.search(raw)
    if master_match:
        try:
            data = json.loads(master_match.group(1).strip())
        except json.JSONDecodeError as exc:
            raise SystemExit(f"Invalid Rapid Practice master-data JSON in {path}: {exc}") from exc
        return count_question_records(data)

    # New generated runtime format, e.g.
    # window.RAPID_CONFIG={...,total:55};
    config_match = RAPID_CONFIG_TOTAL_RE.search(raw)
    if config_match:
        return int(config_match.group(1))

    # New generated self-contained format, e.g.
    # const ... TOTAL_COUNT=284;
    total_match = TOTAL_COUNT_RE.search(raw)
    if total_match:
        return int(total_match.group(1))

    return 0


def update_hub_meta(hub: Path, total: int) -> bool:
    raw = hub.read_text(encoding="utf-8", errors="replace")
    catalog_match = CATALOG_RE.search(raw)
    if not catalog_match:
        raise SystemExit(f"Rapid Practice hub has no DATA catalog: {hub}")
    try:
        catalog = ast.literal_eval(catalog_match.group(1))
    except (ValueError, SyntaxError) as exc:
        raise SystemExit(f"Invalid Rapid Practice DATA catalog: {exc}") from exc
    rapid_root = (hub.parent / "Rapid Practice").resolve()
    for row in catalog:
        if not isinstance(row, list) or len(row) != 6:
            raise SystemExit("Invalid Rapid Practice catalog row")
        page = (hub.parent / unquote(row[3])).resolve()
        if not page.is_relative_to(rapid_root) or not page.is_file():
            raise SystemExit(f"Missing or invalid Rapid Practice catalog page: {row[3]}")
        count = count_page(page)
        if not count:
            raise SystemExit(f"No questions found in catalog page: {row[3]}")
        row[4] = count
    catalog_text = "[\n" + ",\n".join(
        json.dumps(row, ensure_ascii=False, separators=(",", ":")) for row in catalog
    ) + "\n]"
    updated = raw[:catalog_match.start(1)] + catalog_text + raw[catalog_match.end(1):]
    wanted = f'<meta name="efp-question-count" content="{total}">'

    if META_RE.search(updated):
        updated = META_RE.sub(wanted, updated, count=1)
    else:
        head = re.search(r"</head\s*>", updated, re.I)
        if not head:
            raise SystemExit(f"Rapid Practice hub has no </head>: {hub}")
        updated = updated[:head.start()] + "  " + wanted + "\n" + updated[head.start():]

    # Correct initial HTML too, before JavaScript renders the catalog totals.
    values = {
        "rapidQuizCount": f"{len(catalog):,}",
        "rapidQuestionCount": f"{sum(row[4] for row in catalog):,}",
        "openedCopy": f"0 / {len(catalog)} quizzes opened",
    }
    for element_id, value in values.items():
        pattern = re.compile(r'(<(?:b|span)\b[^>]*\bid="' + element_id + r'"[^>]*>)[^<]*(</(?:b|span)>)')
        updated, replacements = pattern.subn(lambda match: match[1] + value + match[2], updated)
        if replacements != 1:
            raise SystemExit(f"Missing or duplicate hub counter: {element_id}")

    if updated == raw:
        return False
    hub.write_text(updated, encoding="utf-8", newline="\n")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Update Rapid Practice aggregate question count")
    parser.add_argument("--repo", default=".", help="Repository root")
    args = parser.parse_args()

    repo = Path(args.repo).resolve()
    rapid_root = repo / "Current Affairs" / "Topic Names" / "Rapid Practice"
    hub = repo / "Current Affairs" / "Topic Names" / "Rapid Practice.html"

    if not rapid_root.is_dir():
        raise SystemExit(f"Missing Rapid Practice folder: {rapid_root}")
    if not hub.is_file():
        raise SystemExit(f"Missing Rapid Practice hub: {hub}")

    pages = sorted(rapid_root.rglob("*.html"), key=lambda p: p.as_posix().lower())
    counted = []
    total = 0
    for page in pages:
        count = count_page(page)
        if count:
            counted.append((page, count))
            total += count

    if not counted:
        raise SystemExit("No Rapid Practice questions were found")

    changed = update_hub_meta(hub, total)
    print(f"Rapid Practice: {total:,} questions across {len(counted)} quiz files")
    print("Hub count updated" if changed else "Hub count already current")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
