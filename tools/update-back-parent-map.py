#!/usr/bin/env python3
"""Generate logical Back parents from the site's real HTML navigation graph."""

from __future__ import annotations

import argparse
import html
import json
import posixpath
from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

SITE_HOSTS = {"examfusionprep.com", "www.examfusionprep.com"}
OUTPUT_NAME = "back-parent-map.js"


class LinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.hrefs: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag.lower() != "a":
            return
        for key, value in attrs:
            if key and key.lower() == "href" and value:
                self.hrefs.append(value)
                break


def repo_posix(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def clean_rel_path(value: str) -> str:
    value = unquote(value).replace("\\", "/")
    value = posixpath.normpath(value)
    while value.startswith("../"):
        value = value[3:]
    if value == ".":
        return ""
    return value.lstrip("/")


def resolve_local_html(source: str, href: str, html_files: set[str]) -> str | None:
    raw = html.unescape((href or "").strip())
    if not raw or raw.startswith(("#", "javascript:", "mailto:", "tel:", "data:")):
        return None

    parts = urlsplit(raw)
    if parts.scheme:
        if parts.scheme.lower() not in {"http", "https"}:
            return None
        if parts.netloc.lower() not in SITE_HOSTS:
            return None
        candidate = clean_rel_path(parts.path)
    elif raw.startswith("//"):
        if parts.netloc.lower() not in SITE_HOSTS:
            return None
        candidate = clean_rel_path(parts.path)
    elif parts.path.startswith("/"):
        candidate = clean_rel_path(parts.path)
    else:
        candidate = clean_rel_path(posixpath.join(posixpath.dirname(source), parts.path))

    if not candidate:
        candidate = "index.html"
    if candidate.endswith("/"):
        candidate += "index.html"
    if candidate in html_files:
        return candidate
    as_index = posixpath.join(candidate, "index.html")
    if as_index in html_files:
        return as_index
    return None


def nav_score(path: str) -> int:
    base = posixpath.basename(path).lower()
    stem = base[:-5] if base.endswith(".html") else base

    if base == "index.html":
        return 120
    if base in {"subjectname.html", "chaptername.html"}:
        return 115
    if base in {"topic names.html", "topicnames.html"}:
        return 112
    if stem.endswith("parts") or "parts" in stem:
        return 108
    if "chapter" in stem and ("name" in stem or "list" in stem or "menu" in stem):
        return 100
    if "subject" in stem and ("name" in stem or "list" in stem or "menu" in stem):
        return 95
    if "topic" in stem and ("name" in stem or "list" in stem or "menu" in stem):
        return 92
    if any(token in stem for token in ("landing", "menu", "dashboard", "home")):
        return 80
    return 0


def directory_parts(path: str) -> tuple[str, ...]:
    directory = posixpath.dirname(path)
    return tuple(part for part in directory.split("/") if part)


def common_prefix_len(a: tuple[str, ...], b: tuple[str, ...]) -> int:
    count = 0
    for left, right in zip(a, b):
        if left != right:
            break
        count += 1
    return count


def candidate_rank(source: str, target: str) -> tuple[int, int, int, int, int]:
    sdir = directory_parts(source)
    tdir = directory_parts(target)
    common = common_prefix_len(sdir, tdir)
    ancestor = int(len(sdir) <= len(tdir) and sdir == tdir[: len(sdir)])
    distance = (len(sdir) - common) + (len(tdir) - common)
    return (ancestor, common, nav_score(source), -distance, -len(source))


def nearest_structural_parent(target: str, html_files: set[str]) -> str | None:
    current = posixpath.dirname(target)

    while True:
        candidates = [
            path
            for path in html_files
            if path != target
            and posixpath.dirname(path) == current
            and nav_score(path) > 0
        ]
        if candidates:
            candidates.sort(key=lambda path: (nav_score(path), -len(path)), reverse=True)
            return candidates[0]

        if not current:
            break
        parent = posixpath.dirname(current)
        if parent == current:
            break
        current = parent

    if target != "index.html" and "index.html" in html_files:
        return "index.html"
    return None


def make_url_path(repo_path: str) -> str:
    if repo_path == "index.html":
        return "/index.html"
    return "/" + repo_path


def generate(root: Path) -> tuple[dict[str, str], int]:
    paths = sorted(
        repo_posix(path, root)
        for path in root.rglob("*.html")
        if ".git" not in path.parts
    )
    html_files = set(paths)
    incoming: dict[str, set[str]] = defaultdict(set)

    for source in paths:
        file_path = root / source
        try:
            text = file_path.read_text(encoding="utf-8-sig")
        except UnicodeDecodeError:
            continue

        parser = LinkParser()
        try:
            parser.feed(text)
        except Exception:
            continue

        for href in parser.hrefs:
            target = resolve_local_html(source, href, html_files)
            if target and target != source:
                incoming[target].add(source)

    parent_map: dict[str, str] = {}
    for target in paths:
        if target == "index.html":
            continue

        nav_candidates = [src for src in incoming.get(target, ()) if nav_score(src) > 0]
        parent: str | None = None
        if nav_candidates:
            parent = max(nav_candidates, key=lambda src: candidate_rank(src, target))
        if not parent:
            parent = nearest_structural_parent(target, html_files)
        if not parent or parent == target:
            continue

        parent_map[make_url_path(target)] = make_url_path(parent)

    return parent_map, len(paths)


def validate(parent_map: dict[str, str]) -> None:
    for child, parent in parent_map.items():
        if child == parent:
            raise RuntimeError(f"Back parent self-loop: {child}")

    sample = {
        "/Books/Ghatnachakra Purvalokan/History/Ancient History/ChapterNames/Stone Age.html":
            "/Books/Ghatnachakra Purvalokan/History/Ancient History/ChapterName.html",
        "/Books/Ghatnachakra Purvalokan/History/Ancient History/ChapterName.html":
            "/Books/Ghatnachakra Purvalokan/History/HistoryParts.html",
        "/Books/Ghatnachakra Purvalokan/History/HistoryParts.html":
            "/Books/Ghatnachakra Purvalokan/SubjectName.html",
        "/Books/Ghatnachakra Purvalokan/SubjectName.html":
            "/index.html",
    }
    for child, expected in sample.items():
        if child in parent_map and parent_map[child] != expected:
            raise RuntimeError(
                f"Unexpected hierarchy for {child}: {parent_map[child]} != {expected}"
            )


def write_map(root: Path, parent_map: dict[str, str], html_count: int) -> bool:
    output = root / OUTPUT_NAME
    payload = (
        "/* Generated by tools/update-back-parent-map.py. Do not edit manually. */\n"
        f"/* HTML pages scanned: {html_count}; logical parents: {len(parent_map)} */\n"
        "window.EFP_BACK_PARENT_MAP = Object.freeze("
        + json.dumps(parent_map, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        + ");\n"
    )
    old = output.read_text(encoding="utf-8") if output.exists() else None
    if old == payload:
        return False
    output.write_text(payload, encoding="utf-8")
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=".")
    args = parser.parse_args()

    root = Path(args.repo).resolve()
    parent_map, html_count = generate(root)
    validate(parent_map)
    changed = write_map(root, parent_map, html_count)

    print(f"HTML pages scanned: {html_count}")
    print(f"Logical Back parents generated: {len(parent_map)}")
    print(f"{OUTPUT_NAME}: {'updated' if changed else 'already current'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
