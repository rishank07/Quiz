#!/usr/bin/env python3
"""Ingest 70th BPSC CCE Prelims 2024 Set-G into ExamFusion PYQ.

Question text is extracted from a publicly available text-layer reproduction of
Set-G; scoring is NEVER taken from that reproduction. Answers are overwritten
from BPSC's official FINAL answer key dated 17 Jan 2025.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import requests
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "PYQ" / "data" / "bpsc" / "2024.json"

TEXT_SOURCE = "https://forumias.com/blog/wp-content/uploads/2024/12/70th-BPSC-Prelims-Questions-with-Answer.pdf"
QUESTION_SCAN = "https://www.studyiq.com/articles/wp-content/uploads/2024/12/13144608/DOC-20241213-WA0174.pdf"
FINAL_KEY = "https://bpsc.bihar.gov.in/Notices/NB-2025-01-17-02.pdf"

# BPSC official Final Answer Key: Integrated 70th CCE (Preliminary), 13-12-2024,
# Set-G. X = question deleted by the Commission.
KEYS = [
    "C","A","D","B","D","D","D","A","D","C","B","D","A","D","A","A","A","C","C","A","B","A","D","C","A","C","A","D","C","A",
    "D","C","B","B","D","D","D","A","B","C","B","A","C","C","A","A","B","X","B","B","D","D","D","X","B","X","A","C","D","B",
    "B","B","B","D","C","B","B","B","C","B","C","A","B","A","D","D","C","B","A","C","C","A","D","B","A","D","D","B","D","A",
    "D","B","A","A","D","D","D","A","D","B","A","C","A","C","D","A","C","B","A","D","A","C","B","C","A","B","D","A","A","D",
    "X","A","D","C","C","A","D","B","C","B","C","D","A","C","D","C","B","C","A","D","C","D","C","A","B","B","A","B","A","D"
]
LETTER_TO_INDEX = {"A": 0, "B": 1, "C": 2, "D": 3}
FOOTER_TOKENS = (
    "forum learning centre:",
    "road, patna, bihar 800001",
    "9311740400",
    "9311740900",
    "academy.forumias.com",
    "admissions@forumias",
    "helpdesk@forumias",
)


def download(url: str) -> bytes:
    r = requests.get(url, timeout=60, headers={"User-Agent": "ExamFusionPrep-PYQ/1.0"})
    r.raise_for_status()
    if not r.content.startswith(b"%PDF"):
        raise RuntimeError(f"Expected PDF from {url}, got {r.headers.get('content-type')}")
    return r.content


def clean_pdf_text(pdf_bytes: bytes) -> str:
    tmp = ROOT / ".tmp-bpsc-2024.pdf"
    tmp.write_bytes(pdf_bytes)
    try:
        reader = PdfReader(str(tmp))
        pages = []
        for page in reader.pages:
            text = page.extract_text() or ""
            kept = []
            for raw in text.splitlines():
                line = raw.strip()
                if not line:
                    continue
                low = line.lower()
                if "70th bpsc prelims 2024" in low:
                    continue
                if any(token in low for token in FOOTER_TOKENS):
                    continue
                if re.fullmatch(r"\[?\d+\]?", line):
                    continue
                kept.append(line)
            pages.append("\n".join(kept))
        return "\n".join(pages)
    finally:
        tmp.unlink(missing_ok=True)


def tidy(value: str) -> str:
    value = value.replace("\u00a0", " ")
    value = re.sub(r"\s+", " ", value).strip()
    value = re.sub(r"\s*Ans\)\s*[A-Da-d](?:\s+OR\s+[A-Da-d])?.*$", "", value, flags=re.I)
    return value.strip()


def parse_questions(text: str) -> list[dict]:
    starts = list(re.finditer(r"(?m)\bQ\.(\d{1,3})\)\s*", text))
    if len(starts) != 150:
        raise RuntimeError(f"Expected 150 question starts, extracted {len(starts)}")

    rows = []
    for idx, m in enumerate(starts):
        number = int(m.group(1))
        if number != idx + 1:
            raise RuntimeError(f"Question sequence broke at {number}; expected {idx + 1}")
        end = starts[idx + 1].start() if idx + 1 < len(starts) else len(text)
        block = text[m.end():end]
        block = re.split(r"\bAns\)\s*", block, maxsplit=1, flags=re.I)[0]

        # Only treat a)/b)/c)/d) at the START of a PDF text line as option
        # markers. This avoids false positives such as Article 102(1)(c).
        markers = list(re.finditer(r"(?mi)^\s*([a-d])\)\s*", block))
        if len(markers) < 4:
            raise RuntimeError(f"Q{number}: expected four line-start option markers, found {len(markers)}")
        markers = markers[:4]
        if [x.group(1).lower() for x in markers] != list("abcd"):
            raise RuntimeError(f"Q{number}: option order is not a,b,c,d: {[x.group(1) for x in markers]}")

        stem = tidy(block[:markers[0].start()])
        options = []
        for oi, om in enumerate(markers):
            oe = markers[oi + 1].start() if oi + 1 < 4 else len(block)
            options.append(tidy(block[om.end():oe]))

        stem = re.sub(r"\s+70TH BPSC.*$", "", stem, flags=re.I)
        options = [re.sub(r"\s+70TH BPSC.*$", "", x, flags=re.I).strip() for x in options]
        # The text-layer reproduction contains a stray glyph rendered as a
        # literal trailing "x" in Q1 option C. It is not part of the paper.
        if number == 1 and len(options) >= 3 and options[2].lower() == "i, ii and iv x":
            options[2] = "i, ii and iv"
        if not stem or any(not x for x in options):
            raise RuntimeError(f"Q{number}: empty stem/option after cleanup")

        searchable = " ".join([stem, *options]).lower()
        leaked = [token for token in FOOTER_TOKENS if token in searchable]
        if leaked:
            raise RuntimeError(f"Q{number}: source footer contamination remained: {leaked}")

        key = KEYS[number - 1]
        deleted = key == "X"
        answer = None if deleted else LETTER_TO_INDEX[key]
        q = {
            "id": f"bpsc-70cce-2024-g-{number:03d}",
            "number": number,
            "question": stem,
            "options": options,
            "answer": answer,
            "deleted": deleted,
            "paper": "General Studies",
            "stage": "Prelims",
            "date": "2024-12-13",
            "set": "G",
            "source": {
                "type": "official-final-key",
                "label": "BPSC 70th CCE Set-G · Final Answer Key",
                "verified": True,
                "url": FINAL_KEY,
                "question_paper_url": QUESTION_SCAN,
                "text_extraction_url": TEXT_SOURCE
            }
        }
        if number in {8, 52}:
            q["requires_figure"] = True
        if number == 62:
            q["source_scan_recommended"] = True
        rows.append(q)
    return rows


def main() -> None:
    if len(KEYS) != 150:
        raise RuntimeError(f"Official key length must be 150, got {len(KEYS)}")
    if [i + 1 for i, key in enumerate(KEYS) if key == "X"] != [48, 54, 56, 121]:
        raise RuntimeError("Deleted-question guard does not match BPSC final key")

    questions = parse_questions(clean_pdf_text(download(TEXT_SOURCE)))
    if len(questions) != 150:
        raise RuntimeError("Final question count is not 150")
    if sum(q["deleted"] for q in questions) != 4:
        raise RuntimeError("Expected four deleted questions")

    payload = {
        "schema_version": 1,
        "exam": "bpsc",
        "year": 2024,
        "exam_name": "Integrated 70th Combined Competitive Examination",
        "paper": "General Studies",
        "stage": "Prelims",
        "date": "2024-12-13",
        "set": "G",
        "coverage": {"questions": 150, "complete": True},
        "provenance": {
            "answer_key": FINAL_KEY,
            "question_paper_scan": QUESTION_SCAN,
            "text_extraction": TEXT_SOURCE,
            "note": "Question/options text extracted from a text-layer reproduction; answers and deleted status are from BPSC's official final key."
        },
        "questions": questions
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)}: {len(questions)} questions, 4 deleted")


if __name__ == "__main__":
    main()
