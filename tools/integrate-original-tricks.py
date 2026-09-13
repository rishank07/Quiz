#!/usr/bin/env python3
"""Integrate the latest ExamFusion Original Tricks PDFs."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
from pathlib import Path
from urllib.parse import quote


VERSION = "20260912ecologytricks1"

TRICK_BOOKS = [
    {
        "filename": "Economics_Tricks.pdf",
        "target": "pdfs/Tricks/Economics_Tricks.pdf",
        "subject": "Economics",
        "branch": "",
        "title": "01 Economics Tricks",
        "heading": "DEMAND, SUPPLY AND NATURE OF MARKET - MEMORY TRICKS",
        "source_title": "Economics Tricks",
        "sort_key": "001",
        "hi": "अर्थशास्त्र ट्रिक्स",
    },
    {
        "filename": "Indian_Geography_Tricks.pdf",
        "target": "pdfs/Tricks/Indian_Geography_Tricks.pdf",
        "subject": "Geography",
        "branch": "Indian Geography",
        "title": "01 Indian Geography Tricks",
        "heading": "GENERAL INTRODUCTION - MEMORY TRICK SHEET",
        "source_title": "Indian Geography Tricks",
        "sort_key": "001",
        "hi": "भारतीय भूगोल ट्रिक्स",
    },
    {
        "filename": "World_Geography_Tricks.pdf",
        "target": "pdfs/Tricks/World_Geography_Tricks.pdf",
        "subject": "Geography",
        "branch": "World Geography",
        "title": "02 World Geography Tricks",
        "heading": "GEOGRAPHY: AN INTRODUCTION - MEMORY TRICKS",
        "source_title": "World Geography Tricks",
        "sort_key": "002",
        "hi": "विश्व भूगोल ट्रिक्स",
    },
    {
        "filename": "Environment_&_Ecology_Tricks.pdf",
        "target": "pdfs/Tricks/Environment_&_Ecology_Tricks.pdf",
        "subject": "Environment & Ecology",
        "branch": "",
        "title": "01 Environment & Ecology Tricks",
        "heading": "ENVIRONMENT — MEMORY-TRICK SHEET",
        "source_title": "Environment & Ecology Tricks",
        "sort_key": "001",
        "hi": "पर्यावरण एवं पारिस्थितिकी ट्रिक्स",
    },
]


def compact(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def read_js_array(path: Path, variable: str) -> list[dict]:
    raw = path.read_text(encoding="utf-8")
    match = re.fullmatch(
        rf"\s*(?:var\s+)?(?:window\.)?{re.escape(variable)}\s*=\s*(\[.*\])\s*;?\s*",
        raw,
        re.S,
    )
    if not match:
        raise ValueError(f"Could not parse {variable} in {path}")
    value = json.loads(match.group(1))
    if not isinstance(value, list):
        raise ValueError(f"{variable} must be an array")
    return value


def write_window_array(path: Path, variable: str, value: list[dict]) -> None:
    path.write_text(
        f"window.{variable}={compact(value)};\n",
        encoding="utf-8",
        newline="\n",
    )


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


def replace_regex(path: Path, pattern: str, replacement: str, label: str) -> None:
    raw = path.read_text(encoding="utf-8")
    updated, count = re.subn(pattern, replacement, raw)
    if count == 0 and replacement not in raw:
        raise ValueError(f"Could not update {label} in {path}")
    if updated != raw:
        path.write_text(updated, encoding="utf-8", newline="\n")


def update_asset_versions(repo: Path) -> None:
    crux = repo / "Crux-Tricks"
    for name in ("index.html", "viewer.html", "my-pages.html"):
        replace_regex(
            crux / name,
            r"crux-manifest\.js\?v=[A-Za-z0-9._-]+",
            f"crux-manifest.js?v={VERSION}",
            "Crux manifest cache key",
        )
    replace_regex(
        crux / "index.html",
        r"crux-tricks\.js\?v=[A-Za-z0-9._-]+",
        f"crux-tricks.js?v={VERSION}",
        "Crux hub script cache key",
    )
    replace_regex(
        crux / "viewer.html",
        r"viewer-v2\.js\?v=[A-Za-z0-9._-]+",
        f"viewer-v2.js?v={VERSION}",
        "PDF viewer cache key",
    )
    for name in ("viewer-v2.js", "viewer.js"):
        replace_regex(
            crux / name,
            r"pages/'\+doc\.id\+'\.js\?v=[A-Za-z0-9._-]+",
            f"pages/'+doc.id+'.js?v={VERSION}",
            "page-search payload cache key",
        )
    controller_path = crux / "crux-tricks.js"
    controller = controller_path.read_text(encoding="utf-8")
    controller = controller.replace(
        "var SUBJECT_ORDER=['History','Polity','Geography','Science','Economics','Maths','Static GK'];",
        "var SUBJECT_ORDER=['History','Polity','Geography','Environment & Ecology','Science','Economics','Maths','Static GK'];",
        1,
    )
    client_function = (
        "function getClients(){if(searchClients)return searchClients;if(typeof efCreateSearchWorker!=='function')return[];"
        "searchClients=["
        "efCreateSearchWorker({workerUrl:new URL('../search-worker.js?v=20260908econcrux1',document.baseURI).href,"
        "logicUrl:new URL('../search-logic.js?v=20260904v9',document.baseURI).href,"
        "indexUrl:new URL('search-snippets-crux-tricks.js?v=20260905cruxroute1',document.baseURI).href,"
        "mode:'snippet',globalName:'EF_CRUX_TRICKS_SNIPPET_INDEX',sectionPrefix:'./Crux-Tricks/',limit:80}),"
        "efCreateSearchWorker({workerUrl:new URL('../search-worker.js?v=20260908econcrux1',document.baseURI).href,"
        "logicUrl:new URL('../search-logic.js?v=20260904v9',document.baseURI).href,"
        "indexUrl:new URL('search-snippets-economics-crux.js?v=20260908econcrux1',document.baseURI).href,"
        "mode:'snippet',globalName:'EF_CRUX_TRICKS_SNIPPET_INDEX',sectionPrefix:'./Crux-Tricks/',limit:80}),"
        "efCreateSearchWorker({workerUrl:new URL('../search-worker.js?v=20260908econcrux1',document.baseURI).href,"
        "logicUrl:new URL('../search-logic.js?v=20260904v9',document.baseURI).href,"
        f"indexUrl:new URL('search-snippets-original-geo-economics-tricks.js?v={VERSION}',document.baseURI).href,"
        "mode:'snippet',globalName:'EF_CRUX_TRICKS_SNIPPET_INDEX',sectionPrefix:'./Crux-Tricks/',limit:80})"
        "].filter(Boolean);return searchClients}"
    )
    controller, count = re.subn(
        r"function getClients\(\)\{.*?return searchClients\}",
        client_function,
        controller,
        count=1,
    )
    if count != 1:
        raise ValueError("Could not update Crux full-text search clients")
    controller_path.write_text(controller, encoding="utf-8", newline="\n")

    hub_path = crux / "index.html"
    hub = hub_path.read_text(encoding="utf-8")
    hub = hub.replace(
        "var SO=['History','Polity','Geography','Science','Economics','Maths','Static GK'];",
        "var SO=['History','Polity','Geography','Environment & Ecology','Science','Economics','Maths','Static GK'];",
        1,
    )
    hub = hub.replace(
        "var ICON={History:'🏛️',Polity:'⚖️',Geography:'🌍',Science:'🧪',Economics:'₹',Maths:'➗','Static GK':'🎯'};",
        "var ICON={History:'🏛️',Polity:'⚖️',Geography:'🌍','Environment & Ecology':'🌿',Science:'🧪',Economics:'₹',Maths:'➗','Static GK':'🎯'};",
        1,
    )
    hub = hub.replace(
        "var HI={History:'इतिहास',Polity:'राजव्यवस्था',Geography:'भूगोल',Science:'विज्ञान',Economics:'अर्थशास्त्र',Maths:'गणित','Static GK':'सामान्य ज्ञान'};",
        "var HI={History:'इतिहास',Polity:'राजव्यवस्था',Geography:'भूगोल','Environment & Ecology':'पर्यावरण एवं पारिस्थितिकी',Science:'विज्ञान',Economics:'अर्थशास्त्र',Maths:'गणित','Static GK':'सामान्य ज्ञान'};",
        1,
    )
    hub_path.write_text(hub, encoding="utf-8", newline="\n")
    replace_regex(
        repo / "index.html",
        r"search-index-main\.js\?v=[A-Za-z0-9._-]+",
        f"search-index-main.js?v={VERSION}",
        "home search index cache key",
    )

    service_worker = repo / "service-worker.js"
    raw = service_worker.read_text(encoding="utf-8")
    raw = re.sub(r"^// v\d+.*$", "// v39 Environment and Ecology Original Tricks 20260912", raw, count=1, flags=re.M)
    raw = re.sub(
        r'const CACHE_VERSION = "[^"]+";',
        'const CACHE_VERSION = "efp-pwa-2026-09-12-v71-ecology-tricks";',
        raw,
        count=1,
    )
    raw = re.sub(
        r'/Crux-Tricks/crux-tricks\.js\?v=[A-Za-z0-9._-]+',
        f"/Crux-Tricks/crux-tricks.js?v={VERSION}",
        raw,
        count=1,
    )
    raw = re.sub(
        r'/Crux-Tricks/viewer-v2\.js\?v=[A-Za-z0-9._-]+',
        f"/Crux-Tricks/viewer-v2.js?v={VERSION}",
        raw,
        count=1,
    )
    service_worker.write_text(raw, encoding="utf-8", newline="\n")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=".")
    parser.add_argument("--source-dir", required=True)
    args = parser.parse_args()

    repo = Path(args.repo).resolve()
    source_dir = Path(args.source_dir).resolve()
    crux = repo / "Crux-Tricks"
    pages_dir = crux / "pages"
    pages_dir.mkdir(parents=True, exist_ok=True)

    manifest_path = crux / "crux-manifest.js"
    docs = read_js_array(manifest_path, "EF_CRUX_DOCS")
    old_target_docs = [
        doc
        for doc in docs
        if doc.get("kind") == "tricks"
        and doc.get("source") == "ExamFusion Original"
        and (
            doc.get("sourceTitle") in {book["source_title"] for book in TRICK_BOOKS}
            or doc.get("pdf", "").endswith(tuple(book["filename"] for book in TRICK_BOOKS))
        )
    ]
    old_target_ids = {doc["id"] for doc in old_target_docs}
    docs = [doc for doc in docs if doc.get("id") not in old_target_ids]
    max_id = max(int(str(doc.get("id", "ct0"))[2:]) for doc in docs)

    new_docs: list[dict] = []
    new_snippets: list[dict] = []
    page_counts: dict[str, int] = {}
    for offset, book in enumerate(TRICK_BOOKS, start=1):
        source_pdf = source_dir / book["filename"]
        if not source_pdf.is_file():
            raise FileNotFoundError(source_pdf)
        target_pdf = crux / book["target"]
        target_pdf.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_pdf, target_pdf)
        page_text = extract_pages(target_pdf)
        doc_id = f"ct{max_id + offset:04d}"
        breadcrumb = "Crux & Tricks / Original Memory Tricks / " + book["subject"]
        if book["branch"]:
            breadcrumb += " / " + book["branch"]
        doc = {
            "id": doc_id,
            "kind": "tricks",
            "source": "ExamFusion Original",
            "subject": book["subject"],
            "branch": book["branch"],
            "title": book["title"],
            "heading": book["heading"],
            "pages": len(page_text),
            "pdf": quote(book["target"], safe="/"),
            "breadcrumb": breadcrumb,
            "sourceTitle": book["source_title"],
            "sortKey": book["sort_key"],
        }
        new_docs.append(doc)
        page_counts[doc_id] = len(page_text)

        (pages_dir / f"{doc_id}.js").write_text(
            f"window.EF_CRUX_DOC_ID={compact(doc_id)};\n"
            f"window.EF_CRUX_DOC_PAGES={compact(page_text)};\n",
            encoding="utf-8",
            newline="\n",
        )
        new_snippets.append(
            {
                "f": f"./Crux-Tricks/viewer.html?id={doc_id}",
                "t": book["title"],
                "b": breadcrumb,
                "x": [chr(0xE000 + index) + text for index, text in enumerate(page_text)],
            }
        )

    write_window_array(manifest_path, "EF_CRUX_DOCS", docs + new_docs)

    snippets_path = crux / "search-snippets-crux-tricks.js"
    snippets = read_js_array(snippets_path, "EF_CRUX_TRICKS_SNIPPET_INDEX")
    snippets = [
        item
        for item in snippets
        if not any(f"id={old_id}" in str(item.get("f", "")) for old_id in old_target_ids)
    ]
    write_window_array(snippets_path, "EF_CRUX_TRICKS_SNIPPET_INDEX", snippets)
    write_window_array(
        crux / "search-snippets-original-geo-economics-tricks.js",
        "EF_CRUX_TRICKS_SNIPPET_INDEX",
        new_snippets,
    )

    main_index_path = repo / "search-index-main.js"
    main_index = read_js_array(main_index_path, "SEARCH_INDEX")
    main_index = [
        item
        for item in main_index
        if not any(f"id={old_id}" in str(item.get("url", "")) for old_id in old_target_ids)
    ]
    for book, doc in zip(TRICK_BOOKS, new_docs):
        main_index.append(
            {
                "title": book["source_title"],
                "url": f"./Crux-Tricks/viewer.html?id={doc['id']}",
                "section": "Crux & Tricks",
                "breadcrumb": doc["breadcrumb"],
                "leaf": True,
                "hi": book["hi"],
            }
        )
    main_index_path.write_text(
        f"var SEARCH_INDEX = {compact(main_index)};\n",
        encoding="utf-8",
        newline="\n",
    )

    update_asset_versions(repo)

    # Keep every Original-Tricks subject card centered at all viewport widths.
    css_path = crux / "crux-tricks.css"
    css = css_path.read_text(encoding="utf-8")
    css = css.replace(
        ".subject-grid>.subject{flex:1 1 140px!important;max-width:220px!important}",
        ".subject-grid>.subject{flex:1 1 220px!important;max-width:220px!important}",
        1,
    )
    css_path.write_text(css, encoding="utf-8", newline="\n")

    expected_pages = {
        "Economics Tricks": 59,
        "Indian Geography Tricks": 101,
        "World Geography Tricks": 93,
        "Environment & Ecology Tricks": 31,
    }
    actual_pages = {doc["sourceTitle"]: doc["pages"] for doc in new_docs}
    if actual_pages != expected_pages:
        raise ValueError(f"Unexpected PDF page counts: {actual_pages}")
    if len({doc["id"] for doc in docs + new_docs}) != len(docs) + len(new_docs):
        raise ValueError("Duplicate Crux document IDs detected")

    print(
        compact(
            {
                "documents": len(docs) + len(new_docs),
                "added": [doc["id"] for doc in new_docs],
                "pages": page_counts,
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
