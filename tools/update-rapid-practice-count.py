#!/usr/bin/env python3
"""Keep the Current Affairs Rapid Practice total in sync with its quiz data.

Rapid Practice pages render questions from <script id="master-data"> JSON, so
there are no static .question-box elements for the generic section counter to
see. This helper counts those JSON question records and writes one standard
<meta name="efp-question-count"> override on the Rapid Practice hub. The
existing update-book-question-counts.py pipeline then treats that total exactly
like every other ExamFusion section count.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

MASTER_DATA_RE = re.compile(
    r'<script\b[^>]*\bid=["\']master-data["\'][^>]*>(.*?)</script\s*>',
    re.I | re.S,
)
META_RE = re.compile(
    r'<meta\s+name=["\']efp-question-count["\']\s+content=["\']\d+["\']\s*/?>',
    re.I,
)


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
    match = MASTER_DATA_RE.search(raw)
    if not match:
        return 0
    try:
        data = json.loads(match.group(1).strip())
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid Rapid Practice master-data JSON in {path}: {exc}") from exc
    return count_question_records(data)


def update_hub_meta(hub: Path, total: int) -> bool:
    raw = hub.read_text(encoding="utf-8", errors="replace")
    wanted = f'<meta name="efp-question-count" content="{total}">'

    if META_RE.search(raw):
        updated = META_RE.sub(wanted, raw, count=1)
    else:
        head = re.search(r"</head\s*>", raw, re.I)
        if not head:
            raise SystemExit(f"Rapid Practice hub has no </head>: {hub}")
        updated = raw[: head.start()] + "  " + wanted + "\n" + raw[head.start() :]

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
        raise SystemExit("No Rapid Practice master-data questions were found")

    changed = update_hub_meta(hub, total)
    print(f"Rapid Practice: {total:,} questions across {len(counted)} quiz files")
    print("Hub count updated" if changed else "Hub count already current")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
