#!/usr/bin/env python3
"""Integrate the 19 Ghatnachakra Economics Crux PDFs and search metadata."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
from pathlib import Path
from urllib.parse import quote


CHAPTERS = [
    (1, "Nature of Indian Economy", "Economics_Chapter_01_Nature_of_Indian_Economy_Crux.pdf"),
    (2, "National Income & Gross Domestic Product", "Economics_Chapter_02_National_Income_GDP_Crux.pdf"),
    (3, "Sustainable Economic Development", "Economics_Chapter_03_Sustainable_Economic_Development_Crux.pdf"),
    (4, "Agriculture and Allied Sectors", "Economics_Chapter_04_Agriculture_and_Allied_Sectors_Crux.pdf"),
    (5, "Industrial Sector", "Economics_Chapter_05_Industrial_Sector_Crux.pdf"),
    (6, "Tertiary Sector", "Economics_Chapter_06_Tertiary_Sector_Crux.pdf"),
    (7, "Fiscal Policy & Revenue", "Economics_Chapter_07_Fiscal_Policy_and_Revenue_Crux.pdf"),
    (8, "Planning", "Economics_Chapter_08_Planning_Crux.pdf"),
    (9, "Money & Banking", "Economics_Chapter_09_Money_and_Banking_Crux.pdf"),
    (10, "Human Development", "Economics_Chapter_10_Human_Development_Crux.pdf"),
    (11, "Employment and Welfare Schemes", "Economics_Chapter_11_Employment_and_Welfare_Schemes_Crux.pdf"),
    (12, "Poverty & Unemployment", "Economics_Chapter_12_Poverty_and_Unemployment_Crux.pdf"),
    (13, "International Trade", "Economics_Chapter_13_International_Trade_Crux.pdf"),
    (14, "Foreign Exchange, FDI, External Debt", "Economics_Chapter_14_Foreign_Exchange_FDI_External_Debt_Crux.pdf"),
    (15, "International Organizations", "Economics_Chapter_15_International_Organizations_Crux.pdf"),
    (16, "Miscellaneous", "Economics_Chapter_16_Miscellaneous_Crux.pdf"),
    (17, "India : Population", "Economics_Chapter_17_India_Population_Crux.pdf"),
    (18, "India : Urbanization", "Economics_Chapter_18_India_Urbanization_Crux.pdf"),
    (19, "World : Population & Urbanization", "Economics_Chapter_19_World_Population_and_Urbanization_Crux.pdf"),
]


def compact(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def read_js_array(path: Path, variable: str) -> list[dict]:
    raw = path.read_text(encoding="utf-8")
    match = re.fullmatch(rf"\s*(?:var\s+)?(?:window\.)?{re.escape(variable)}\s*=\s*(\[.*\])\s*;?\s*", raw, re.S)
    if not match:
        raise ValueError(f"Could not parse {variable} in {path}")
    value = json.loads(match.group(1))
    if not isinstance(value, list):
        raise ValueError(f"{variable} must be an array")
    return value


def extract_pages(pdf: Path) -> list[str]:
    result = subprocess.run(
        ["pdftotext", "-layout", str(pdf), "-"],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    text = result.stdout.decode("utf-8", errors="replace").replace("\x00", "")
    pages = [page.strip() for page in text.split("\f")]
    if pages and not pages[-1]:
        pages.pop()
    if not pages or any(not page for page in pages):
        raise ValueError(f"Empty searchable page extracted from {pdf.name}")
    return pages


def replace_once(raw: str, old: str, new: str, label: str) -> str:
    count = raw.count(old)
    if count == 0 and new in raw:
        return raw
    if count != 1:
        raise ValueError(f"Expected one {label} marker, found {count}")
    return raw.replace(old, new, 1)


def update_crux_hub(crux_dir: Path) -> None:
    path = crux_dir / "index.html"
    raw = path.read_text(encoding="utf-8")
    raw = replace_once(
        raw,
        'content="Topic-wise revision crux and ExamFusion Original chapter tricks for History, Polity, Geography, Science and Static GK — SSC, Railway, UPSC & BPSC."><meta name="theme-color"',
        'content="Topic-wise revision crux and ExamFusion Original chapter tricks for History, Polity, Geography, Science, Economics and Static GK — SSC, Railway, UPSC & BPSC."><meta name="robots" content="index,follow"><link rel="canonical" href="https://examfusionprep.com/Crux-Tricks/index.html"><meta property="og:title" content="Crux & Memory Tricks | ExamFusion Prep"><meta property="og:description" content="Revision crux and memory tricks for History, Polity, Geography, Science, Economics and Static GK."><meta property="og:type" content="website"><meta property="og:url" content="https://examfusionprep.com/Crux-Tricks/index.html"><meta name="theme-color"',
        "Crux SEO metadata",
    )
    raw = replace_once(
        raw,
        "var SO=['History','Polity','Geography','Science','Static GK'];var ICON={History:'🏛️',Polity:'⚖️',Geography:'🌍',Science:'🧪','Static GK':'🎯'};var HI={History:'इतिहास',Polity:'राजव्यवस्था',Geography:'भूगोल',Science:'विज्ञान','Static GK':'सामान्य ज्ञान'};",
        "var SO=['History','Polity','Geography','Science','Economics','Static GK'];var ICON={History:'🏛️',Polity:'⚖️',Geography:'🌍',Science:'🧪',Economics:'₹','Static GK':'🎯'};var HI={History:'इतिहास',Polity:'राजव्यवस्था',Geography:'भूगोल',Science:'विज्ञान',Economics:'अर्थशास्त्र','Static GK':'सामान्य ज्ञान'};",
        "Crux subject definitions",
    )
    raw = replace_once(
        raw,
        "if(s==='Polity')return'../Books/Ghatnachakra Purvalokan/Polity/ChapterName.html';return''}",
        "if(s==='Polity')return'../Books/Ghatnachakra Purvalokan/Polity/ChapterName.html';if(s==='Economics')return'../Books/Ghatnachakra Purvalokan/Economics/ChapterName.html';return''}",
        "Economics Hindi-title map",
    )
    raw = replace_once(
        raw,
        ".subject-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.parts",
        ".subject-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.subject:last-child:nth-child(odd){grid-column:1/-1;width:calc(50% - 4.5px);justify-self:center}.parts",
        "mobile odd-subject centering",
    )
    raw = raw.replace("crux-manifest.js?v=20260904v9", "crux-manifest.js?v=20260908econcrux1")
    raw = raw.replace("crux-tricks.js?v=20260905cruxroute1", "crux-tricks.js?v=20260908econcrux1")
    path.write_text(raw, encoding="utf-8", newline="\n")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=".")
    parser.add_argument("--source-dir", required=True)
    args = parser.parse_args()

    repo = Path(args.repo).resolve()
    source_dir = Path(args.source_dir).resolve()
    crux_dir = repo / "Crux-Tricks"
    pdf_dir = crux_dir / "pdfs" / "Books CRUX" / "Ghatnachakra" / "Economics"
    pages_dir = crux_dir / "pages"
    pdf_dir.mkdir(parents=True, exist_ok=True)
    pages_dir.mkdir(parents=True, exist_ok=True)

    manifest_path = crux_dir / "crux-manifest.js"
    docs = read_js_array(manifest_path, "EF_CRUX_DOCS")
    docs = [doc for doc in docs if not (
        doc.get("kind") == "crux"
        and doc.get("source") == "Ghatnachakra"
        and doc.get("subject") == "Economics"
    )]
    max_id = max(int(str(doc.get("id", "ct0"))[2:]) for doc in docs)

    economics_docs: list[dict] = []
    economics_snippets: list[dict] = []
    total_pages = 0
    for offset, (number, title, filename) in enumerate(CHAPTERS, start=1):
        source_pdf = source_dir / filename
        if not source_pdf.is_file():
            raise FileNotFoundError(source_pdf)
        target_pdf = pdf_dir / filename
        shutil.copy2(source_pdf, target_pdf)
        page_text = extract_pages(target_pdf)
        total_pages += len(page_text)
        doc_id = f"ct{max_id + offset:04d}"
        display_title = f"{number:02d} {title}"
        pdf_relative = target_pdf.relative_to(crux_dir).as_posix()
        breadcrumb = "Crux & Tricks / Ghatnachakra / Economics"
        doc = {
            "id": doc_id,
            "kind": "crux",
            "source": "Ghatnachakra",
            "subject": "Economics",
            "branch": "",
            "title": display_title,
            "heading": f"{title.upper()} — FULL MIND MAP",
            "pages": len(page_text),
            "pdf": quote(pdf_relative, safe="/"),
            "breadcrumb": breadcrumb,
            "sourceTitle": title,
            "sortKey": f"{number:03d}.000",
        }
        economics_docs.append(doc)

        page_payload = (
            f'window.EF_CRUX_DOC_ID={compact(doc_id)};\n'
            f'window.EF_CRUX_DOC_PAGES={compact(page_text)};\n'
        )
        (pages_dir / f"{doc_id}.js").write_text(page_payload, encoding="utf-8", newline="\n")
        economics_snippets.append({
            "f": f"./Crux-Tricks/viewer.html?id={doc_id}",
            "t": display_title,
            "b": breadcrumb,
            "x": [chr(0xE000 + page_index) + page for page_index, page in enumerate(page_text)],
        })

    manifest_path.write_text(
        f"window.EF_CRUX_DOCS={compact(docs + economics_docs)};\n",
        encoding="utf-8",
        newline="\n",
    )
    update_crux_hub(crux_dir)
    (crux_dir / "search-snippets-economics-crux.js").write_text(
        "// Full-text search index for Ghatnachakra Economics Crux. Loaded on search intent only.\n"
        f"window.EF_CRUX_TRICKS_SNIPPET_INDEX={compact(economics_snippets)};\n",
        encoding="utf-8",
        newline="\n",
    )

    search_index_path = repo / "search-index-main.js"
    search_index = read_js_array(search_index_path, "SEARCH_INDEX")
    economics_urls = {f"./Crux-Tricks/viewer.html?id={doc['id']}" for doc in economics_docs}
    search_index = [record for record in search_index if not (
        record.get("section") == "Crux & Tricks"
        and record.get("breadcrumb") == "Crux & Tricks / Ghatnachakra / Economics"
    )]
    search_index.extend({
        "title": doc["sourceTitle"],
        "url": f"./Crux-Tricks/viewer.html?id={doc['id']}",
        "section": "Crux & Tricks",
        "breadcrumb": doc["breadcrumb"],
        "leaf": True,
    } for doc in economics_docs)
    if not economics_urls.issubset({record.get("url") for record in search_index}):
        raise ValueError("Economics Crux records were not added to the main search index")
    search_index_path.write_text(
        f"var SEARCH_INDEX = {compact(search_index)};\n",
        encoding="utf-8",
        newline="\n",
    )

    expected_ids = {doc["id"] for doc in economics_docs}
    if len(expected_ids) != 19 or len(economics_snippets) != 19:
        raise ValueError("Economics integration must contain exactly 19 documents")
    print(compact({
        "documents": len(docs) + len(economics_docs),
        "economics_documents": len(economics_docs),
        "economics_pages": total_pages,
        "first_id": economics_docs[0]["id"],
        "last_id": economics_docs[-1]["id"],
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
