"""Audit every catalog PDF and its viewer/global page indexes.

Run with Python + PyMuPDF: python tools/audit-crux-pdf-search.py [--repair]
Existing page text (including handwritten Maths OCR) is preserved.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

import fitz

ROOT = Path(__file__).resolve().parents[1]
CRUX = ROOT / "Crux-Tricks"


def assignment(path: Path, name: str):
    text = path.read_text(encoding="utf-8")
    match = re.search(r"(?:window\.)?" + re.escape(name) + r"\s*=\s*", text)
    if not match:
        raise ValueError(f"{path}: missing {name}")
    return json.JSONDecoder().raw_decode(text[match.end():])[0]


def encode(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repair", action="store_true")
    args = parser.parse_args()
    docs = assignment(CRUX / "crux-manifest.js", "EF_CRUX_DOCS")
    assert len({d["id"] for d in docs}) == len(docs), "Duplicate catalog IDs"
    main_index = CRUX / "search-snippets-crux-tricks.js"
    records = assignment(main_index, "EF_CRUX_TRICKS_SNIPPET_INDEX")
    indexed = {}
    for path in CRUX.glob("search-snippets-*.js"):
        for record in assignment(path, "EF_CRUX_TRICKS_SNIPPET_INDEX"):
            for doc_id in parse_qs(urlparse(record["f"]).query).get("id", []):
                indexed.setdefault(doc_id, []).append(record)
    errors, repaired, added = [], [], []
    total_pages = 0
    for doc in docs:
        doc_id = doc["id"]
        pdf_path = CRUX / unquote(doc["pdf"])
        if not pdf_path.is_file():
            errors.append(f"{doc_id}: missing PDF {pdf_path}")
            continue
        with fitz.open(pdf_path) as pdf:
            total_pages += len(pdf)
            if len(pdf) != doc["pages"]:
                errors.append(f"{doc_id}: catalog says {doc['pages']} pages, PDF has {len(pdf)}")
                continue
            page_path = CRUX / "pages" / f"{doc_id}.js"
            try:
                assert assignment(page_path, "EF_CRUX_DOC_ID") == doc_id
                pages = assignment(page_path, "EF_CRUX_DOC_PAGES")
                assert isinstance(pages, list) and len(pages) == len(pdf)
                assert all(isinstance(page, str) and page.strip() for page in pages)
            except (OSError, ValueError, AssertionError):
                if not args.repair:
                    errors.append(f"{doc_id}: missing/invalid viewer page index")
                    continue
                pages = [page.get_text().strip() for page in pdf]
                if not all(pages):
                    errors.append(f"{doc_id}: needs OCR; refusing to replace index with blank text")
                    continue
                page_path.parent.mkdir(parents=True, exist_ok=True)
                page_path.write_text(
                    f"window.EF_CRUX_DOC_ID={encode(doc_id)};\n"
                    f"window.EF_CRUX_DOC_PAGES={encode(pages)};\n", encoding="utf-8")
                repaired.append(doc_id)
            if doc_id not in indexed:
                if not args.repair:
                    errors.append(f"{doc_id}: missing homepage/Crux full-text index")
                    continue
                records.append({"f": f"./Crux-Tricks/viewer.html?id={doc_id}",
                                "t": doc["title"], "b": doc["breadcrumb"],
                                "x": [chr(0xE000 + i) + " " + page for i, page in enumerate(pages)]})
                added.append(doc_id)
            else:
                entries = indexed[doc_id]
                hits = [text for entry in entries for text in entry["x"]]
                if len(hits) != len(pdf):
                    errors.append(f"{doc_id}: global index page count differs from PDF")
                for i, text in enumerate(hits):
                    if not text or ord(text[0]) != 0xE000 + i or not text[1:].strip():
                        errors.append(f"{doc_id}: invalid global page marker/text at page {i+1}")
    if added:
        main_index.write_text("window.EF_CRUX_TRICKS_SNIPPET_INDEX=" + encode(records) + ";\n", encoding="utf-8")
    print(json.dumps({"pdfs": len(docs), "pages": total_pages,
                      "viewer_indexes_repaired": len(repaired), "global_records_added": len(added),
                      "errors": errors}, ensure_ascii=False, indent=2))
    raise SystemExit(bool(errors))


if __name__ == "__main__":
    main()
