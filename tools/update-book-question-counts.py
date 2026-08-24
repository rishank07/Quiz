#!/usr/bin/env python3
"""Generate automatic section counts for ExamFusion Prep.

No AI and no external API are used. The script scans the site content trees,
counts real question/content items, writes Books/question-counts.json, and
ensures navigation hub pages load the tiny count-display script.

The Maths Speed Booster is intentionally excluded from counting.
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

QUESTION_CONTAINER_PRIORITY = (
    "question-box",
    "question-card",
    "quiz-item",
    "mcq-item",
    "question-item",
)

DISPLAY_SCRIPT_NAME = "book-question-counts-display.js"
DISPLAY_SCRIPT_VERSION = "20260821f"
DISPLAY_MARKER = "ExamFusion automatic book question counts"


@dataclass(frozen=True)
class SectionConfig:
    key: str
    relative_root: str
    mode: str
    hub_unit: str


SECTION_CONFIGS = (
    SectionConfig("Ghatnachakra Purvalokan", "Books/Ghatnachakra Purvalokan", "quiz", "Questions"),
    SectionConfig("Lucent's Objective", "Books/Lucent's Objective", "quiz", "Questions"),
    SectionConfig("Pinnacle GS", "Books/Pinnacle GS", "quiz", "Questions"),
    SectionConfig("BlackBook", "Books/BlackBook", "blackbook", "Questions"),
    SectionConfig("Bihar Special", "Bihar Special", "bihar", "Facts"),
    SectionConfig("Current Affairs", "Current Affairs", "quiz", "Questions"),
    SectionConfig("Mind Maps", "Mind Maps", "mindmaps", "Maps"),
)


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.class_counts: dict[str, int] = {name: 0 for name in QUESTION_CONTAINER_PRIORITY}
        self.class_counts.update({"cd": 0, "en-txt": 0})
        self.q_ids: set[str] = set()
        self.hrefs: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        data = dict(attrs)
        classes = set((data.get("class") or "").split())
        for name in self.class_counts:
            if name in classes:
                self.class_counts[name] += 1

        ident = (data.get("id") or "").strip()
        if tag in {"div", "main", "article", "section"} and re.fullmatch(r"q\d{1,5}", ident, re.I):
            self.q_ids.add(ident.lower())

        if tag == "a" and data.get("href"):
            self.hrefs.append(data["href"])

    def quiz_question_count(self) -> int:
        # Pick ONE container convention per file to avoid nested double counts.
        for name in QUESTION_CONTAINER_PRIORITY:
            if self.class_counts[name]:
                return self.class_counts[name]
        return len(self.q_ids)


@dataclass
class PageInfo:
    path: Path
    display_count: int
    aggregate_count: int
    unit: str
    hrefs: list[str]


def read_page_parser(path: Path) -> tuple[PageParser, str]:
    raw = path.read_text(encoding="utf-8", errors="replace")
    parser = PageParser()
    parser.feed(raw)
    return parser, raw


def blackbook_sn_count(raw: str) -> int:
    # Handles both JS object keys (sn: 1) and JSON keys ("sn": 1).
    return len(re.findall(r"(?:[\"']sn[\"']|\bsn\b)\s*:\s*\d+", raw, re.I))


def parse_page(path: Path, config: SectionConfig) -> PageInfo:
    parser, raw = read_page_parser(path)

    if config.mode == "quiz":
        count = parser.quiz_question_count()
        return PageInfo(path, count, count, "Questions", parser.hrefs)

    if config.mode == "bihar":
        # Most Bihar Special pages are bilingual fact cards (.cd). The large
        # BPSC CA compilation uses paired .en-txt/.hi-txt rows; count English
        # rows once so bilingual content is not double-counted. MCQ-style
        # Bihar Special pages (radio-button quizzes, e.g. the 60-set
        # Objective GK file) use .question-box like the Books/ quiz sections
        # instead of fact cards, so fall back to that count when no .cd or
        # .en-txt cards are present.
        count = parser.class_counts["cd"] or parser.class_counts["en-txt"] or parser.class_counts["question-box"]
        return PageInfo(path, count, count, "Facts", parser.hrefs)

    if config.mode == "blackbook":
        count = blackbook_sn_count(raw)
        is_quiz = "quiz" in path.stem.lower()
        # Study-list pages can still display their item total, but the
        # BlackBook top-level question total sums quiz pages only to avoid
        # counting the same vocabulary list twice.
        return PageInfo(path, count, count if is_quiz else 0, "Questions" if is_quiz else "Entries", parser.hrefs)

    if config.mode == "mindmaps":
        # Count every actual mind-map/content HTML page, regardless of its
        # filename convention. Navigation-only hub pages use the known
        # Subject/Chapter/Parts naming pattern and must not count as maps.
        # This also includes Vedic Maths chapter files such as
        # viral-maths-ch01-important-products.html.
        name = path.name.lower()
        is_hub = (
            name in {"subjectname.html", "chaptername.html", "chapternames.html"}
            or name.endswith("parts.html")
        )
        is_map = not is_hub
        # One HTML mind-map/content chapter = one map. Keep leaf links
        # uncluttered; totals are shown on hub/section buttons and landing.
        return PageInfo(path, 0, 1 if is_map else 0, "Maps", parser.hrefs)

    return PageInfo(path, 0, 0, config.hub_unit, parser.hrefs)


def repo_key(path: Path, repo: Path) -> str:
    return path.relative_to(repo).as_posix()


def is_inside(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
        return True
    except ValueError:
        return False


def is_legacy_duplicate(path: Path) -> bool:
    """Skip legacy #U2013/#U2014 filename copies when a real Unicode twin exists."""
    name = path.name
    decoded = name.replace("#U2013", "–").replace("#U2014", "—")
    return decoded != name and (path.with_name(decoded)).exists()


def local_html_links(info: PageInfo, known_html: set[Path]) -> set[Path]:
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
        if target in known_html:
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
    src = relative_script_src(page, books_root)
    wanted = f'<script src="{src}?v={DISPLAY_SCRIPT_VERSION}" defer></script>'

    # Upgrade an existing injected script in-place (including version/path).
    pattern = re.compile(
        r'<script\s+src=["\'][^"\']*' + re.escape(DISPLAY_SCRIPT_NAME) + r'(?:\?[^"\']*)?["\']\s+defer\s*>\s*</script>',
        re.I,
    )
    if pattern.search(raw):
        updated = pattern.sub(wanted, raw, count=1)
        if updated != raw:
            page.write_text(updated, encoding="utf-8", newline="\n")
            return True
        return False

    tag = f'\n  <!-- {DISPLAY_MARKER} -->\n  {wanted}\n'
    m = re.search(r"</body\s*>", raw, re.I)
    if m:
        updated = raw[: m.start()] + tag + raw[m.start() :]
    else:
        updated = raw.rstrip() + tag
    page.write_text(updated, encoding="utf-8", newline="\n")
    return True


def build_counts(repo: Path, install_scripts: bool = True) -> tuple[dict, list[Path]]:
    books_root = (repo / "Books").resolve()
    roots: list[tuple[SectionConfig, Path]] = []
    for config in SECTION_CONFIGS:
        root = (repo / config.relative_root).resolve()
        if not root.is_dir():
            raise SystemExit(f"Missing expected section folder: {root}")
        roots.append((config, root))

    config_by_path: dict[Path, SectionConfig] = {}
    html_paths: list[Path] = []
    for config, root in roots:
        for p in root.rglob("*.html"):
            rp = p.resolve()
            # Skip legacy filename copies in every section when the real Unicode twin exists.
            # This prevents stale #U2013/#U2014 copies from inflating totals.
            if is_legacy_duplicate(rp):
                continue
            config_by_path[rp] = config
            html_paths.append(rp)

    html_paths = sorted(set(html_paths), key=lambda p: p.as_posix().lower())
    known_html = set(html_paths)
    info_by_path = {p: parse_page(p, config_by_path[p]) for p in html_paths}

    # Directory aggregates use aggregate_count, which avoids BlackBook study/quiz
    # double-counting and treats each Mind Map chapter as one map.
    directory_totals: dict[Path, int] = {}
    all_dirs: set[Path] = set()
    for p in html_paths:
        config = config_by_path[p]
        root = next(root for cfg, root in roots if cfg == config)
        cur = p.parent
        while is_inside(cur, root):
            all_dirs.add(cur)
            if cur == root:
                break
            cur = cur.parent

    for directory in all_dirs:
        directory_totals[directory] = sum(
            info.aggregate_count
            for path, info in info_by_path.items()
            if is_inside(path, directory)
        )

    page_counts: dict[str, int] = {}
    page_units: dict[str, str] = {}
    page_kinds: dict[str, str] = {}
    hub_pages: list[Path] = []

    for path, info in info_by_path.items():
        key = repo_key(path, repo)
        config = config_by_path[path]

        if info.display_count > 0:
            page_counts[key] = info.display_count
            page_units[key] = info.unit
            page_kinds[key] = "content"
            continue

        children = local_html_links(info, known_html)
        if children:
            total = directory_totals.get(path.parent, 0)
            if total > 0:
                page_counts[key] = total
                page_units[key] = config.hub_unit
                page_kinds[key] = "hub"
            hub_pages.append(path)

    # Ensure each configured top-level section landing target has its aggregate
    # count even when the page has unusual/non-recursive navigation markup.
    section_summaries: dict[str, dict] = {}
    for config, root in roots:
        total = directory_totals.get(root, 0)
        section_summaries[config.key] = {"total": total, "unit": config.hub_unit}

        # Main hub candidates are zero-content HTML pages closest to the root.
        candidates = [
            p for p in html_paths
            if config_by_path[p] == config and p.parent == root and info_by_path[p].display_count == 0
        ]
        for p in candidates:
            if local_html_links(info_by_path[p], known_html):
                key = repo_key(p, repo)
                page_counts[key] = total
                page_units[key] = config.hub_unit
                page_kinds[key] = "hub"
                hub_pages.append(p)

    index_page = (repo / "index.html").resolve()
    changed_pages: list[Path] = []
    if install_scripts:
        for page in sorted(set(hub_pages + ([index_page] if index_page.exists() else []))):
            if ensure_display_script(page, books_root):
                changed_pages.append(page)

    manifest = {
        "schema": 2,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "question_container_priority": list(QUESTION_CONTAINER_PRIORITY),
        "sections": section_summaries,
        "pages": dict(sorted(page_counts.items())),
        "units": dict(sorted(page_units.items())),
        "page_kinds": dict(sorted(page_kinds.items())),
    }
    return manifest, changed_pages


def main() -> int:
    parser = argparse.ArgumentParser(description="Update ExamFusion section counts")
    parser.add_argument("--repo", default=".", help="Repository root")
    parser.add_argument("--no-install-scripts", action="store_true", help="Do not inject display script into hub pages")
    args = parser.parse_args()

    repo = Path(args.repo).resolve()
    manifest, changed_pages = build_counts(repo, install_scripts=not args.no_install_scripts)
    out = repo / "Books" / "question-counts.json"

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

    print("ExamFusion section counts updated:")
    for name, data in manifest["sections"].items():
        print(f"  {name}: {data['total']:,} {data['unit']}")
    print(f"Count-enabled pages: {len(manifest['pages'])}")
    if changed_pages:
        print(f"Installed/upgraded display script on {len(changed_pages)} page(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
