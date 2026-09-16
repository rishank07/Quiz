#!/usr/bin/env python3
"""Ingest 69th BPSC CCE Prelims 2023 Set-A into ExamFusion PYQ."""
from __future__ import annotations

import json
import re
from pathlib import Path

import requests
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "PYQ" / "data" / "bpsc" / "2023.json"
QUESTION_SOURCE = "https://examdhara.com/blog/wp-content/uploads/2025/03/69th-BPSC-Prelims-Question-Paper-Pdf-Bilingual.pdf"
FINAL_KEY = "https://bpsc.bihar.gov.in/Archive/2023/NB-2023-10-28-03.pdf"

KEYS = """
D A C C D D C C B C D C D A B A D A D A C C C C A B B B D B
A B X C A B D D C A D B C D C A A A A A B C C C B C C B B X
C C C C B C C D A C A C C A D D B A B A D D A A D A D C D C
A A A A B C C B C A D C D B C A C B A C D D C D C A D B A D
D X A C A C B C B D A B C B C A C C B C C D B D B B D A C A
""".split()
LETTER_TO_INDEX = {"A": 0, "B": 1, "C": 2, "D": 3}
POLLUTION = (
    "for more study material please visit",
    "www.examdhara.com",
    "19–c/fi/cc/pt–2023",
    "19-c/fi/cc/pt-2023",
)


def download(url: str) -> bytes:
    r = requests.get(url, timeout=90, headers={"User-Agent": "ExamFusionPrep-PYQ/1.0"})
    r.raise_for_status()
    if not r.content.startswith(b"%PDF"):
        raise RuntimeError(f"Expected PDF from {url}, got {r.headers.get('content-type')}")
    return r.content


def normalize_text(value: str) -> str:
    value = value.replace("\u00ad", "").replace("\u0002", "-")
    value = value.replace("–", "-").replace("—", "-")
    value = re.sub(r"\s+", " ", value).strip()
    return value


def english_text(pdf_bytes: bytes) -> str:
    tmp = ROOT / ".tmp-bpsc-2023.pdf"
    tmp.write_bytes(pdf_bytes)
    try:
        reader = PdfReader(str(tmp))
        pages: list[str] = []
        # The bilingual booklet alternates English and Hindi pages after the
        # cover. Set-A English pages are 1,3,5,...; rough-work pages at the end
        # contain no question starts and are harmless.
        for page_index in range(1, len(reader.pages), 2):
            text = reader.pages[page_index].extract_text() or ""
            kept = []
            for raw in text.splitlines():
                line = raw.strip()
                if not line:
                    continue
                low = line.lower()
                if any(token in low for token in POLLUTION):
                    continue
                # Isolated printed page numbers / P.T.O. artefacts.
                if re.fullmatch(r"\[?\s*\d+\s*\]?", line):
                    continue
                if "p.t.o." in low and len(line) < 40:
                    continue
                kept.append(line)
            pages.append("\n".join(kept))
        return "\n".join(pages)
    finally:
        tmp.unlink(missing_ok=True)


def option_markers(text: str, start: int) -> list[re.Match[str]]:
    found: list[re.Match[str]] = []
    for letter in "ABCD":
        m = re.search(rf"(?m)^\s*\({letter}\)\s*", text[start:])
        if not m:
            raise RuntimeError(f"Missing option ({letter}) after offset {start}")
        # Convert sliced match to absolute-position proxy by searching in full
        # text from the exact absolute offset.
        abs_m = re.search(rf"(?m)^\s*\({letter}\)\s*", text, pos=start + m.start())
        if not abs_m:
            raise RuntimeError(f"Could not resolve option ({letter})")
        found.append(abs_m)
        start = abs_m.end()
    return found


def parse(text: str) -> list[dict]:
    rows: list[dict] = []
    cursor = 0
    for qno in range(1, 151):
        qpat = re.compile(rf"(?m)^\s*{qno}\.\s+")
        qmatch = qpat.search(text, cursor)
        if not qmatch:
            raise RuntimeError(f"Could not locate Q{qno} after offset {cursor}")

        marks = option_markers(text, qmatch.end())
        if not (marks[0].start() < marks[1].start() < marks[2].start() < marks[3].start()):
            raise RuntimeError(f"Q{qno}: option order broken")

        if qno < 150:
            next_pat = re.compile(rf"(?m)^\s*{qno + 1}\.\s+")
            next_q = next_pat.search(text, marks[3].end())
            if not next_q:
                raise RuntimeError(f"Q{qno}: could not locate Q{qno+1} after option D")
            block_end = next_q.start()
        else:
            block_end = len(text)

        stem = normalize_text(text[qmatch.end():marks[0].start()])
        options = [
            normalize_text(text[marks[i].end():(marks[i+1].start() if i < 3 else block_end)])
            for i in range(4)
        ]
        if not stem or any(not x for x in options):
            raise RuntimeError(f"Q{qno}: empty stem/option")

        # Remove any residual printed footer fragments that shared a line with
        # a question/option, then reject if a known source watermark survives.
        def scrub(v: str) -> str:
            v = re.sub(r"\s*19[-–]C/FI/CC/PT[-–]2023.*$", "", v, flags=re.I)
            v = re.sub(r"\s*For More Study Material Please Visit.*$", "", v, flags=re.I)
            return v.strip()

        stem = scrub(stem)
        options = [scrub(x) for x in options]
        joined = " ".join([stem, *options]).lower()
        if any(token in joined for token in POLLUTION):
            raise RuntimeError(f"Q{qno}: source watermark/footer contamination survived")

        key = KEYS[qno - 1]
        deleted = key == "X"
        rows.append({
            "id": f"bpsc-69cce-2023-a-{qno:03d}",
            "number": qno,
            "question": stem,
            "options": options,
            "answer": None if deleted else LETTER_TO_INDEX[key],
            "deleted": deleted,
            "paper": "General Studies",
            "stage": "Prelims",
            "date": "2023-09-30",
            "set": "A",
            "source": {
                "type": "official-final-key",
                "label": "BPSC 69th CCE Set-A · Final Answer Key",
                "verified": True,
                "url": FINAL_KEY,
                "question_paper_url": QUESTION_SOURCE,
                "text_extraction_url": QUESTION_SOURCE
            }
        })
        cursor = block_end
    return rows


def main() -> None:
    if len(KEYS) != 150:
        raise RuntimeError(f"Expected 150 answer keys, got {len(KEYS)}")
    if [i + 1 for i, x in enumerate(KEYS) if x == "X"] != [33, 60, 122]:
        raise RuntimeError("Deleted-question guard must be Q33, Q60, Q122")

    rows = parse(english_text(download(QUESTION_SOURCE)))
    if len(rows) != 150:
        raise RuntimeError(f"Expected 150 questions, got {len(rows)}")

    payload = {
        "schema_version": 1,
        "exam": "bpsc",
        "year": 2023,
        "exam_name": "69th Integrated Combined Competitive Examination",
        "paper": "General Studies",
        "stage": "Prelims",
        "date": "2023-09-30",
        "set": "A",
        "coverage": {"questions": 150, "complete": True},
        "provenance": {
            "answer_key": FINAL_KEY,
            "question_paper": QUESTION_SOURCE,
            "note": "Set-A question/options text extracted from a bilingual reproduction; scoring/deleted status follows the BPSC final answer key."
        },
        "questions": rows
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)}: {len(rows)} questions, {sum(q['deleted'] for q in rows)} deleted")


if __name__ == "__main__":
    main()
