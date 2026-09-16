#!/usr/bin/env python3
"""Build/validate the ExamFusion PYQ manifest from year chunks."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "PYQ" / "data"
MANIFEST = DATA / "manifest.json"
EXAM_ORDER = ["bpsc", "upsc", "ssc", "railway", "banking"]
NAMES = {
    "bpsc": ("BPSC", "बीपीएससी"),
    "upsc": ("UPSC", "यूपीएससी"),
    "ssc": ("SSC", "एसएससी"),
    "railway": ("Railway", "रेलवे"),
    "banking": ("Banking", "बैंकिंग"),
}


def fail(msg: str) -> None:
    raise ValueError(msg)


def validate_chunk(path: Path, payload: dict) -> tuple[int, int]:
    exam = str(payload.get("exam", "")).strip().lower()
    year = payload.get("year")
    questions = payload.get("questions")
    if exam not in NAMES:
        fail(f"{path}: unknown exam {exam!r}")
    if not isinstance(year, int):
        fail(f"{path}: year must be an integer")
    if path.parent.name != exam or path.stem != str(year):
        fail(f"{path}: expected path PYQ/data/{exam}/{year}.json")
    if not isinstance(questions, list):
        fail(f"{path}: questions must be an array")

    seen = set()
    verified = 0
    for i, q in enumerate(questions, 1):
        if not isinstance(q, dict):
            fail(f"{path}: question #{i} is not an object")
        qid = str(q.get("id", "")).strip()
        if not qid:
            fail(f"{path}: question #{i} has no id")
        if qid in seen:
            fail(f"{path}: duplicate id {qid}")
        seen.add(qid)
        opts = q.get("options")
        ans = q.get("answer")
        if not isinstance(opts, list) or len(opts) < 2:
            fail(f"{path}: {qid} has invalid options")
        if not isinstance(ans, int) or ans < 0 or ans >= len(opts):
            fail(f"{path}: {qid} has invalid answer index")
        source = q.get("source")
        if not isinstance(source, dict) or not source.get("type") or not source.get("label"):
            fail(f"{path}: {qid} has incomplete source metadata")
        if source.get("verified") is True:
            verified += 1
    return len(questions), verified


def main() -> int:
    base = json.loads(MANIFEST.read_text(encoding="utf-8"))
    collected = {key: [] for key in EXAM_ORDER}
    total = 0

    for path in sorted(DATA.glob("*/*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        count, verified = validate_chunk(path, payload)
        exam = payload["exam"].lower()
        year = payload["year"]
        total += count
        collected[exam].append({
            "year": year,
            "count": count,
            "verified": verified,
            "file": f"./data/{exam}/{year}.json",
        })

    exams = []
    for exam in EXAM_ORDER:
        years = sorted(collected[exam], key=lambda x: x["year"], reverse=True)
        name, hi = NAMES[exam]
        exams.append({
            "id": exam,
            "name": name,
            "hi": hi,
            "status": "available" if years else "ready-for-ingestion",
            "years": years,
            "count": sum(x["count"] for x in years),
        })

    base["exams"] = exams
    base["totalQuestions"] = total
    MANIFEST.write_text(json.dumps(base, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"PYQ manifest built: {total:,} questions across {sum(len(x['years']) for x in exams)} year chunks")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"PYQ validation failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
