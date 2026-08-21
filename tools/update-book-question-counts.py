#!/usr/bin/env python3
"""Generate automatic question counts for ExamFusion Books.

No AI and no external API are used. The script scans the three book trees,
counts real quiz question containers, writes Books/question-counts.json, and
ensures navigation hub pages load the tiny count-display script.

Designed to be deterministic and safe for GitHub Actions.
"""
from __future__ import annotations

import argparse
import json
import os
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

BOOK_DIRS = (
    "Ghatnachakra Purvalokan",
    "Lucent's Objective",
    "Pinnacle GS",
)

# Existing Books use question-box. The remaining names make future templates
# work too without counting nested question-text elements.
QUESTION_CONTAINER_PRIORITY = (
    "question-box",
    "question-card",
    "quiz-item",
    "mcq-item",
    "question-item",
)

DISPLAY_SCRIPT_NAME = "book-question-counts-display.js"
DISPLAY_MARKER = "ExamFusion automatic book question counts"


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.class_counts = {name: 0 for name in QUESTION_CONTAINER_PRIORITY}
        self.q_ids: set[str] = set()
        self.hrefs: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        data = dict(attrs)
        classes = set((data.get("class") or "").split())
        for name in QUESTION_CONTAINER_PRIORITY:
            if name in classes:
                self.class_counts[name] += 1

        # Conservative fallback used only if no known question class exists.
        ident = (data.get("id") or "").strip()
        if tag in {"div", "main", "article", "section"} and re.fullmatch(r"q\d{1,5}", ident, re.I):
            self.q_ids.add(ident.lower())

        if tag == "a" and data.get("href"):
            self.hrefs.append(data["href"])

    def question_count(self) -> int:
        # Pick ONE container convention per file to avoid nested double counts.
        for name in QUESTION_CONTAINER_PRIORITY:
            if self.class_counts[name]:
                return self.class_counts[name]
        return len(self.q_ids)


@dataclass
class PageInfo:
    path: Path
    questions: int
    hrefs: list[str]


def parse_page(path: Path) -> PageInfo:
    parser = PageParser()
    parser.feed(path.read_text(encoding="utf-8", errors="replace"))
    return PageInfo(path=path, questions=parser.question_count(), hrefs=parser.hrefs)


def repo_key(path: Path, repo: Path) -> str:
    return path.relative_to(repo).as_posix()


def is_inside(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
        return True
    except ValueError:
        return False


def local_book_html_links(info: PageInfo, repo: Path, books_root: Path, known_html: set[Path]) -> set[Path]:
    out: set[Path] = set()
    for href in info.hrefs:
        href = href.strip()
        if not href or href.startswith(("#", "mailto:", "javascript:", "tel:")):
            continue
        parts = urlsplit(href)
        if parts.scheme or parts.netloc:
            continue
        raw_path = unquote(parts.path)
        if not raw_path.lower().endswith((".html", ".htm")):
            continue
        target = (info.path.parent / raw_path).resolve()
        if target in known_html and is_inside(target, books_root):
            out.add(target)
    return out


def relative_script_src(page: Path, books_root: Path) -> str:
    target = books_root / DISPLAY_SCRIPT_NAME
    rel = os.path.relpath(target, start=page.parent).replace(os.sep, "/")
    if not rel.startswith("."):
        rel = "./" + rel
    return rel


def ensure_display_script(page: Path, books_root: Path) -> bool:
    raw = page.read_text(encoding="utf-8", errors="replace")
    if DISPLAY_MARKER in raw or DISPLAY_SCRIPT_NAME in raw:
        return False

    src = relative_script_src(page, books_root)
    tag = (
        f'\n  <!-- {DISPLAY_MARKER} -->\n'
        f'  <script src="{src}" defer></script>\n'
    )
    m = re.search(r"</body\s*>", raw, re.I)
    if m:
        updated = raw[: m.start()] + tag + raw[m.start() :]
    else:
        updated = raw.rstrip() + tag
    page.write_text(updated, encoding="utf-8", newline="\n")
    return True


def build_counts(repo: Path, install_scripts: bool = True) -> tuple[dict, list[Path]]:
    books_root = repo / "Books"
    roots = [books_root / name for name in BOOK_DIRS]
    missing = [str(p) for p in roots if not p.is_dir()]
    if missing:
        raise SystemExit("Missing expected book folder(s): " + ", ".join(missing))

    html_paths = sorted(
        (p.resolve() for root in roots for p in root.rglob("*.html")),
        key=lambda p: p.as_posix().lower(),
    )
    known_html = set(html_paths)
    info_by_path = {p: parse_page(p) for p in html_paths}

    # Direct recursive directory totals. This makes hub-page counts robust even
    # when a new chapter is added before navigation is reorganized.
    directory_totals: dict[Path, int] = {}
    all_dirs: set[Path] = set()
    for p in html_paths:
        cur = p.parent
        while is_inside(cur, books_root) and cur != books_root:
            all_dirs.add(cur)
            cur = cur.parent

    for directory in all_dirs:
        directory_totals[directory] = sum(
            info.questions
            for path, info in info_by_path.items()
            if is_inside(path, directory)
        )

    page_counts: dict[str, int] = {}
    page_kinds: dict[str, str] = {}
    hub_pages: list[Path] = []

    for path, info in info_by_path.items():
        key = repo_key(path, repo)
        if info.questions > 0:
            page_counts[key] = info.questions
            page_kinds[key] = "quiz"
            continue

        children = local_book_html_links(info, repo, books_root.resolve(), known_html)
        if children:
            # Hub's button represents everything beneath its folder.
            page_counts[key] = directory_totals.get(path.parent, 0)
            page_kinds[key] = "hub"
            hub_pages.append(path)

    # The home page contains the three main book buttons.
    index_page = (repo / "index.html").resolve()
    changed_pages: list[Path] = []
    if install_scripts:
        for page in sorted(set(hub_pages + ([index_page] if index_page.exists() else []))):
            if ensure_display_script(page, books_root.resolve()):
                changed_pages.append(page)

    books = {}
    for name, root in zip(BOOK_DIRS, roots):
        root_resolved = root.resolve()
        total = sum(info.questions for p, info in info_by_path.items() if is_inside(p, root_resolved))
        # Immediate subdirectories are useful for verification/debugging and future UI.
        sections = {}
        for child in sorted((x for x in root.iterdir() if x.is_dir()), key=lambda x: x.name.lower()):
            sections[child.name] = sum(
                info.questions for p, info in info_by_path.items() if is_inside(p, child.resolve())
            )
        books[name] = {"total": total, "sections": sections}

    manifest = {
        "schema": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "question_container_priority": list(QUESTION_CONTAINER_PRIORITY),
        "books": books,
        "pages": dict(sorted(page_counts.items())),
        "page_kinds": dict(sorted(page_kinds.items())),
    }
    return manifest, changed_pages


def main() -> int:
    parser = argparse.ArgumentParser(description="Update ExamFusion book question counts")
    parser.add_argument("--repo", default=".", help="Repository root")
    parser.add_argument("--no-install-scripts", action="store_true", help="Do not inject display script into hub pages")
    args = parser.parse_args()

    repo = Path(args.repo).resolve()
    manifest, changed_pages = build_counts(repo, install_scripts=not args.no_install_scripts)
    out = repo / "Books" / "question-counts.json"

    # generated_at would otherwise force a Git commit even when counts are unchanged.
    old = None
    if out.exists():
        try:
            old = json.loads(out.read_text(encoding="utf-8"))
        except Exception:
            old = None
    if old:
        old_cmp = dict(old)
        new_cmp = dict(manifest)
        old_cmp.pop("generated_at", None)
        new_cmp.pop("generated_at", None)
        if old_cmp == new_cmp:
            manifest["generated_at"] = old.get("generated_at", manifest["generated_at"])

    new_text = json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    old_text = out.read_text(encoding="utf-8", errors="replace") if out.exists() else None
    if old_text != new_text:
        out.write_text(new_text, encoding="utf-8", newline="\n")

    total = sum(book["total"] for book in manifest["books"].values())
    print(f"Book question counts updated: {total:,} total questions")
    for name, data in manifest["books"].items():
        print(f"  {name}: {data['total']:,}")
        for section, count in data["sections"].items():
            print(f"    {section}: {count:,}")
    print(f"Count-enabled pages: {len(manifest['pages'])}")
    if changed_pages:
        print(f"Installed display script on {len(changed_pages)} page(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
