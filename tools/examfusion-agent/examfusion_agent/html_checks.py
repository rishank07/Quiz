from __future__ import annotations

import re
from collections import Counter
from urllib.parse import unquote, urlparse
from pathlib import Path
from bs4 import BeautifulSoup

from .utils import (
    contains_mojibake,
    local_target,
    looks_bilingual,
    normalize_question,
    normalize_ws,
    relpath,
    script_counts,
    stable_id,
)

QUESTION_CLASS_RE = re.compile(r"question|mcq|quiz[-_ ]?item|question[-_ ]?card", re.I)
QUESTION_NO_RE = re.compile(r"(?:^|\b)(?:Q(?:uestion)?|प्रश्न)\s*[#.:\-]?\s*(\d{1,5})\b", re.I)


def issue(path: str, code: str, severity: str, message: str, **extra):
    data = {
        "id": stable_id(path, code, message),
        "file": path,
        "code": code,
        "severity": severity,
        "message": message,
    }
    data.update(extra)
    return data


def _question_nodes(soup: BeautifulSoup):
    # Prefer complete MCQ cards so duplicate/AI checks see
    # question + options + answer + explanation together.
    preferred = []

    for tag in soup.find_all(True):
        classes = " ".join(tag.get("class", []))
        ident = tag.get("id", "")
        marker = f"{classes} {ident}"

        if re.search(r"question[-_ ]?card|quiz[-_ ]?item|mcq[-_ ]?card", marker, re.I):
            text = normalize_ws(tag.get_text(" ", strip=True))
            if len(text) >= 40:
                preferred.append(tag)

    if preferred:
        # Keep outer complete cards, not nested question-text elements.
        out = []
        preferred_ids = {id(n) for n in preferred}

        for n in preferred:
            if any(id(parent) in preferred_ids for parent in n.parents):
                continue
            out.append(n)

        return out[:2000]

    # Fallback for older pages that do not have a complete question-card wrapper.
    nodes = []

    for tag in soup.find_all(True):
        classes = " ".join(tag.get("class", []))
        ident = tag.get("id", "")
        marker = f"{classes} {ident}"

        if QUESTION_CLASS_RE.search(marker):
            text = normalize_ws(tag.get_text(" ", strip=True))
            if len(text) >= 40:
                nodes.append(tag)

    out = []
    node_ids = {id(n) for n in nodes}

    for n in nodes:
        if any(id(parent) in node_ids for parent in n.parents):
            continue
        out.append(n)

    return out[:2000]


def scan_html(path: Path, repo_root: Path, site_url: str | None = None) -> tuple[list[dict], list[dict]]:
    rel = relpath(path, repo_root)
    raw = path.read_text(encoding="utf-8", errors="replace")
    soup = BeautifulSoup(raw, "html.parser")
    issues: list[dict] = []
    ai_candidates: list[dict] = []

    # Encoding / head basics
    if contains_mojibake(raw):
        markers = ", ".join(contains_mojibake(raw))
        issues.append(issue(rel, "ENCODING_MOJIBAKE", "critical", f"Possible broken text/encoding markers found: {markers}"))

    meta_charset = soup.find("meta", attrs={"charset": True})
    if not meta_charset:
        issues.append(issue(rel, "MISSING_CHARSET", "safe", "Missing <meta charset=\"UTF-8\">; safe auto-fix available."))

    if not soup.title or not normalize_ws(soup.title.get_text()):
        issues.append(issue(rel, "MISSING_TITLE", "review", "HTML <title> is missing or empty."))

    # Self-referential SEO metadata should point to the file that actually exists.
    # This catches stale folder names after pages are moved/renamed.
    if site_url:
        site_host = urlparse(site_url).hostname
        expected_paths = {rel}
        if rel == "index.html":
            expected_paths.add("")
        url_fields = []
        og = soup.find("meta", attrs={"property": "og:url"})
        if og and og.get("content"):
            url_fields.append(("og:url", str(og.get("content"))))
        canonical = soup.find("link", attrs={"rel": lambda v: v and ("canonical" in v if isinstance(v, list) else str(v).lower() == "canonical")})
        if canonical and canonical.get("href"):
            url_fields.append(("canonical", str(canonical.get("href"))))
        for field, value in url_fields:
            parsed = urlparse(value)
            if parsed.hostname == site_host:
                actual_path = unquote(parsed.path).lstrip("/")
                if actual_path not in expected_paths:
                    issues.append(issue(
                        rel,
                        "SELF_URL_MISMATCH",
                        "review",
                        f"{field} points to '{actual_path}' instead of this page's path '{rel}'.",
                    ))

    # duplicate ids
    ids = [t.get("id") for t in soup.find_all(attrs={"id": True}) if t.get("id")]
    for ident, count in Counter(ids).items():
        if count > 1:
            issues.append(issue(rel, "DUPLICATE_ID", "critical", f"Duplicate HTML id '{ident}' appears {count} times."))

    # local links/assets
    for tag, attr in (("a", "href"), ("img", "src"), ("script", "src"), ("link", "href")):
        for node in soup.find_all(tag):
            value = node.get(attr)
            if not value:
                continue
            target = local_target(path, value, repo_root)
            if target is None:
                continue
            # Directory links can resolve to index.html on static hosting.
            exists = target.exists() or (target.is_dir() and (target / "index.html").exists())
            if not exists:
                issues.append(issue(rel, "BROKEN_LOCAL_LINK", "critical", f"Missing local target: {value}", target=value))

    # Question-number anomalies: count one leading number per complete question card.
    # Counting the whole page produced many false positives from explanations/scripts.
    full_text = normalize_ws(soup.get_text(" ", strip=True))
    qnodes = _question_nodes(soup)
    qnums = []
    for node in qnodes:
        text_head = normalize_ws(node.get_text(" ", strip=True))[:180]
        m = QUESTION_NO_RE.search(text_head)
        if m:
            qnums.append(int(m.group(1)))
    for num, count in Counter(qnums).items():
        if count > 1:
            issues.append(issue(
                rel,
                "QUESTION_NUMBER_REPEAT",
                "review",
                f"Question number {num} appears on {count} separate question cards; inspect numbering/duplication.",
            ))

    seen_questions: dict[str, int] = {}
    for idx, node in enumerate(qnodes, start=1):
        text = normalize_ws(node.get_text(" ", strip=True))
        if len(text) < 40:
            continue
        dev, lat = script_counts(text)
        if (dev >= 8 and lat < 8) or (lat >= 20 and dev < 4):
            issues.append(issue(rel, "POSSIBLE_MISSING_TRANSLATION", "review", f"Question block {idx} appears mostly single-language (Devanagari={dev}, Latin={lat}).", block=idx, snippet=text[:500]))
            ai_candidates.append({"file": rel, "block": idx, "reason": "possible_missing_translation", "text": text, "html": str(node)})
        elif looks_bilingual(text):
            ai_candidates.append({"file": rel, "block": idx, "reason": "bilingual_semantic_audit", "text": text, "html": str(node)})

        # Exact duplicate guard on the normalized complete question card.
        n = normalize_question(text)
        if len(n) > 60:
            if n in seen_questions:
                issues.append(issue(rel, "DUPLICATE_QUESTION_BLOCK", "critical", f"Question block {idx} duplicates block {seen_questions[n]}.", block=idx, duplicate_of=seen_questions[n]))
            else:
                seen_questions[n] = idx

        lower = text.lower()
        if ("correct answer" in lower or "सही उत्तर" in text) and ("explanation" in lower or "व्याख्या" in text):
            ai_candidates.append({"file": rel, "block": idx, "reason": "answer_explanation_consistency", "text": text, "html": str(node)})

    # If no known question wrappers exist, create a file-level AI candidate only for quiz-like files.
    if not qnodes and re.search(r"correct answer|सही उत्तर|question|प्रश्न", full_text, re.I):
        ai_candidates.append({"file": rel, "block": None, "reason": "file_level_quiz_audit", "text": full_text[:12000], "html": raw[:12000]})

    return issues, ai_candidates


def apply_safe_fixes(path: Path) -> list[str]:
    """Apply only byte-light fixes that preserve the page's existing formatting/design."""
    raw = path.read_text(encoding="utf-8", errors="replace")
    changed = []

    if not re.search(r"<meta\s+[^>]*charset\s*=", raw, re.I):
        m = re.search(r"<head(?:\s[^>]*)?>", raw, re.I)
        if m:
            insertion = '\n    <meta charset="UTF-8">'
            raw = raw[:m.end()] + insertion + raw[m.end():]
            changed.append("Added UTF-8 meta charset without reformatting the HTML")

    if changed:
        path.write_text(raw, encoding="utf-8", newline="\n")
    return changed
