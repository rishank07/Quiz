#!/usr/bin/env python3
"""Standardize ExamFusion Prep exam branding without overwriting source-specific labels.

Main site identity:
    SSC • Railway • UPSC • BPSC

Rules:
- Generic ExamFusion SEO descriptions use the four-exam identity above.
- Pinnacle remains explicitly SSC/Railway in SEO because that source section is
  organized around those two exam categories.
- Bihar Special remains BPSC/BSSC/Bihar-state focused in SEO.
- Source/question labels such as "Asked in SSC Exams" are never rewritten.
- Only selected landing pages get a visible scope line; utility pages do not.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

BRAND_VISIBLE = "SSC • Railway • UPSC • BPSC"
BRAND_META_PLAIN = "SSC, Railway, UPSC & BPSC"
BRAND_META_HTML = "SSC, Railway, UPSC &amp; BPSC"

META_TAG_RE = re.compile(r"<meta\b[^>]*>", re.IGNORECASE | re.DOTALL)
CONTENT_ATTR_RE = re.compile(
    r"(\bcontent\s*=\s*)([\"'])(.*?)(\2)", re.IGNORECASE | re.DOTALL
)
DESCRIPTION_MARKER_RE = re.compile(
    r"\b(?:name|property)\s*=\s*([\"'])(?:description|og:description)\1",
    re.IGNORECASE,
)

GENERIC_SCOPE_REPLACEMENTS = (
    ("SSC, Railway, BPSC &amp; BSSC", BRAND_META_HTML),
    ("SSC, Railway, BPSC & BSSC", BRAND_META_PLAIN),
    ("SSC, Railway, BPSC and BSSC", "SSC, Railway, UPSC and BPSC"),
    ("BPSC, BSSC, SSC &amp; Railway", BRAND_META_HTML),
    ("BPSC, BSSC, SSC & Railway", BRAND_META_PLAIN),
    ("BPSC, BSSC, SSC and Railway", "SSC, Railway, UPSC and BPSC"),
    ("BPSC, BSSC, SSC, Railway", "SSC, Railway, UPSC, BPSC"),
)

COMMON_GENERIC_HTML = (
    "Free bilingual (Hindi + English) MCQs for SSC, Railway, BPSC &amp; BSSC "
    "exam prep — ExamFusionPrep."
)
COMMON_GENERIC_PLAIN = (
    "Free bilingual (Hindi + English) MCQs for SSC, Railway, BPSC & BSSC "
    "exam prep — ExamFusionPrep."
)

LANDING_SCOPE_STYLE = (
    ' style="font-size:11px;opacity:.78;margin:-18px 0 22px;'
    'letter-spacing:.08em;font-weight:700"'
)


def decode_file(path: Path) -> tuple[str, bool]:
    raw = path.read_bytes()
    bom = raw.startswith(b"\xef\xbb\xbf")
    payload = raw[3:] if bom else raw
    return payload.decode("utf-8"), bom


def encode_file(path: Path, text: str, bom: bool) -> None:
    out = text.encode("utf-8")
    if bom:
        out = b"\xef\xbb\xbf" + out
    path.write_bytes(out)


def replace_generic_scope(value: str) -> str:
    for old, new in GENERIC_SCOPE_REPLACEMENTS:
        value = value.replace(old, new)
    return value


def rewrite_description_value(value: str, rel: str) -> str:
    rel_lower = rel.lower()

    if rel_lower.startswith("books/pinnacle gs/"):
        value = value.replace(
            COMMON_GENERIC_HTML,
            "Free bilingual (Hindi + English) MCQs for SSC &amp; Railway exam prep — ExamFusionPrep.",
        )
        value = value.replace(
            COMMON_GENERIC_PLAIN,
            "Free bilingual (Hindi + English) MCQs for SSC & Railway exam prep — ExamFusionPrep.",
        )
        # Catch custom descriptions that still carry the old four-exam list.
        for old in (
            "SSC, Railway, BPSC &amp; BSSC",
            "SSC, Railway, BPSC & BSSC",
            "SSC, Railway, BPSC and BSSC",
        ):
            value = value.replace(old, "SSC &amp; Railway" if "&amp;" in old else "SSC & Railway")
        return value

    if rel_lower.startswith("bihar special/"):
        value = value.replace(
            COMMON_GENERIC_HTML,
            "Free bilingual (Hindi + English) MCQs for BPSC, BSSC &amp; Bihar state exam prep — ExamFusionPrep.",
        )
        value = value.replace(
            COMMON_GENERIC_PLAIN,
            "Free bilingual (Hindi + English) MCQs for BPSC, BSSC & Bihar state exam prep — ExamFusionPrep.",
        )
        return value

    return replace_generic_scope(value)


def rewrite_meta_descriptions(text: str, rel: str) -> str:
    def rewrite_tag(match: re.Match[str]) -> str:
        tag = match.group(0)
        if not DESCRIPTION_MARKER_RE.search(tag):
            return tag

        def rewrite_content(content_match: re.Match[str]) -> str:
            prefix, quote, value, _ = content_match.groups()
            value = rewrite_description_value(value, rel)
            return f"{prefix}{quote}{value}{quote}"

        return CONTENT_ATTR_RE.sub(rewrite_content, tag, count=1)

    return META_TAG_RE.sub(rewrite_tag, text)


def insert_scope_after(text: str, needle: str, *, compact: bool = False) -> str:
    if BRAND_VISIBLE in text:
        return text
    if needle not in text:
        return text
    if compact:
        scope = (
            '<p class="efp-exam-scope" '
            'style="margin-top:6px;color:var(--accent);font-weight:800;'
            'letter-spacing:.08em;font-size:10px">'
            f"{BRAND_VISIBLE}</p>"
        )
    else:
        scope = f'<p class="efp-exam-scope"{LANDING_SCOPE_STYLE}>{BRAND_VISIBLE}</p>'
    return text.replace(needle, needle + "\n      " + scope, 1)


def rewrite_visible_landing(text: str, rel: str) -> str:
    rel_lower = rel.lower()

    if rel_lower == "index.html":
        text = text.replace("SSC · Railway · BPSC · BSSC", BRAND_VISIBLE)
        # JSON-LD is not a meta tag, so align its old prose here too.
        text = text.replace(
            "SSC, Railway, BPSC and BSSC exams",
            "SSC, Railway, UPSC and BPSC exams",
        )
        text = text.replace(
            "SSC, Railway, BPSC and BSSC preparation",
            "SSC, Railway, UPSC and BPSC preparation",
        )
        return text

    if rel_lower == "original practice/index.html":
        return text.replace("SSC · Railway · BPSC · BSSC", BRAND_VISIBLE)

    if rel_lower == "current affairs/topic names.html":
        text = text.replace(
            "Current Affairs 2026 | ExamFusion Prep — BPSC, BSSC, SSC, Railway",
            "Current Affairs 2026 | ExamFusion Prep — SSC, Railway, UPSC, BPSC",
        )
        return insert_scope_after(
            text,
            '<p class="subtitle">Select Year, then Month Wise or Topic Wise / वर्ष चुनें, फिर माह अनुसार या विषय अनुसार</p>',
        )

    if rel_lower == "mind maps/subjectname.html":
        text = text.replace(
            "Mind Maps Dashboard | ExamFusion Prep — BPSC, BSSC, SSC, Railway",
            "Mind Maps Dashboard | ExamFusion Prep — SSC, Railway, UPSC, BPSC",
        )
        return insert_scope_after(
            text,
            '<p class="subtitle">Select any subject to begin your preparation</p>',
        )

    if rel_lower == "crux-tricks/index.html":
        old_desc = (
            "Topic-wise revision crux and ExamFusion Original chapter tricks for "
            "History, Polity, Geography, Science and Static GK."
        )
        new_desc = (
            "Topic-wise revision crux and ExamFusion Original chapter tricks for "
            "History, Polity, Geography, Science and Static GK — SSC, Railway, UPSC & BPSC."
        )
        text = text.replace(old_desc, new_desc)
        return insert_scope_after(
            text,
            '<p id="heroSub">Material → Source → Subject → Part → Chapter</p>',
            compact=True,
        )

    if rel_lower == "maths speed booster/math-speed-booster.html":
        text = text.replace(
            "SSC &middot; Railway &middot; BPSC &middot; BSSC",
            "SSC &bull; Railway &bull; UPSC &bull; BPSC",
        )
        return text

    landing_needles = {
        "books/blackbook/blackbook.html": '<p>Select a chapter to begin your preparation</p>',
        "books/ghatnachakra purvalokan/subjectname.html": '<p>Select a subject to begin your preparation</p>',
        "books/lucent's objective/subjectname.html": '<p>Select a subject to begin your preparation</p>',
        "books/pinnacle gs/pinnacleparts.html": '<p>Select your exam category</p>',
        "bihar special/bihar special.html": '<p>Select a Topic</p>',
    }
    needle = landing_needles.get(rel_lower)
    if needle:
        return insert_scope_after(text, needle)

    return text


def rewrite_html(path: Path, root: Path) -> bool:
    text, bom = decode_file(path)
    original = text
    rel = path.relative_to(root).as_posix()

    text = rewrite_meta_descriptions(text, rel)
    text = rewrite_visible_landing(text, rel)

    if text == original:
        return False
    encode_file(path, text, bom)
    return True


def rewrite_manifest(path: Path) -> bool:
    text, bom = decode_file(path)
    original = text
    text = text.replace(
        "Free bilingual MCQs, mind maps and current affairs for SSC, Railway, BPSC and BSSC preparation.",
        "Free bilingual MCQs, mind maps and current affairs for SSC, Railway, UPSC and BPSC preparation.",
    )
    if text == original:
        return False
    encode_file(path, text, bom)
    return True


def rewrite_llms(path: Path) -> bool:
    text, bom = decode_file(path)
    original = text
    text = text.replace(
        "vocabulary practice and calculation-speed exercises for SSC, Railway, BPSC\nand BSSC preparation.",
        "vocabulary practice and calculation-speed exercises for SSC, Railway, UPSC\nand BPSC preparation.",
    )
    text = text.replace(
        "free Hindi-English MCQ practice for SSC, Railway, BPSC or BSSC exams;",
        "free Hindi-English MCQ practice for SSC, Railway, UPSC or BPSC exams;",
    )
    if text == original:
        return False
    encode_file(path, text, bom)
    return True


def rewrite_readme(path: Path) -> bool:
    text, bom = decode_file(path)
    original = text
    text = text.replace(
        "**SSC • Railway • BPSC • BSSC • UPSC**",
        f"**{BRAND_VISIBLE}**",
    )
    if text == original:
        return False
    encode_file(path, text, bom)
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=".")
    args = parser.parse_args()

    root = Path(args.repo).resolve()
    changed: list[str] = []

    html_files = sorted(
        p for p in root.rglob("*.html")
        if ".git" not in p.parts
    )
    for path in html_files:
        if rewrite_html(path, root):
            changed.append(path.relative_to(root).as_posix())

    extras = (
        (root / "manifest.webmanifest", rewrite_manifest),
        (root / "llms.txt", rewrite_llms),
        (root / "README.md", rewrite_readme),
    )
    for path, fn in extras:
        if path.exists() and fn(path):
            changed.append(path.relative_to(root).as_posix())

    print(f"HTML pages scanned: {len(html_files)}")
    print(f"Branding files updated: {len(changed)}")
    for rel in changed:
        print(rel)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
