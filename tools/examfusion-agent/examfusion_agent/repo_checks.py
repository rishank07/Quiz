from __future__ import annotations

import re
from pathlib import Path
from urllib.parse import unquote, urlparse
from xml.etree import ElementTree as ET

from .utils import relpath, stable_id


def issue(path: str, code: str, severity: str, message: str, **extra):
    d = {"id": stable_id(path, code, message), "file": path, "code": code, "severity": severity, "message": message}
    d.update(extra)
    return d


def tracked_html(repo_root: Path, tracked_roots: list[str], excludes: list[str]) -> list[Path]:
    from .utils import is_excluded
    files = []
    for root_name in tracked_roots:
        base = (repo_root / root_name)
        if not base.exists():
            continue
        for p in base.rglob("*.html"):
            rel = relpath(p, repo_root)
            if not is_excluded(rel, excludes):
                files.append(p)
    return sorted(set(files))


def check_sitemap(repo_root: Path, html_files: list[Path], sitemap_file: str) -> list[dict]:
    path = repo_root / sitemap_file
    if not path.exists():
        return [issue(sitemap_file, "SITEMAP_MISSING", "review", f"Configured sitemap file '{sitemap_file}' does not exist.")]
    try:
        root = ET.fromstring(path.read_text(encoding="utf-8", errors="replace"))
    except Exception as e:
        return [issue(sitemap_file, "SITEMAP_INVALID_XML", "critical", f"Cannot parse sitemap XML: {e}")]

    locs = set()
    for elem in root.iter():
        if elem.tag.lower().endswith("loc") and elem.text:
            u = urlparse(elem.text.strip())
            locs.add(unquote(u.path).lstrip("/"))

    out = []
    for p in html_files:
        rel = relpath(p, repo_root)
        candidates = {rel, rel.replace(" ", "%20")}
        if not any(c in locs for c in candidates):
            out.append(issue(rel, "SITEMAP_ENTRY_MISSING", "review", "Tracked HTML page not found in sitemap.xml."))
    return out


def check_search_indexes(repo_root: Path, html_files: list[Path], index_files: list[str]) -> list[dict]:
    existing = []
    for name in index_files:
        p = repo_root / name
        if p.exists():
            existing.append((name, p.read_text(encoding="utf-8", errors="replace")))
    if not existing:
        return []

    out = []
    for p in html_files:
        rel = relpath(p, repo_root)
        basename = p.name
        encoded_rel = rel.replace(" ", "%20")
        found = any(rel in text or encoded_rel in text or basename in text for _, text in existing)
        if not found:
            out.append(issue(rel, "SEARCH_INDEX_ENTRY_MISSING", "review", f"Page not referenced by configured search index files: {', '.join(n for n, _ in existing)}"))
    return out
