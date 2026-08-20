from __future__ import annotations

import fnmatch
import hashlib
import json
import os
import re
from pathlib import Path
from urllib.parse import unquote, urlparse

DEVANAGARI_RE = re.compile(r"[\u0900-\u097F]")
LATIN_RE = re.compile(r"[A-Za-z]")
MOJIBAKE_MARKERS = ("\ufffd", "Ã", "Â", "â€", "â€™", "â€œ", "â€�", "ðŸ")


def load_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def write_text(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8", newline="\n")


def relpath(path: Path, root: Path) -> str:
    return path.resolve().relative_to(root.resolve()).as_posix()


def normalize_ws(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def normalize_question(text: str) -> str:
    text = normalize_ws(text).lower()
    text = re.sub(r"^(q(?:uestion)?|प्रश्न)\s*\d+\s*[:.)-]?\s*", "", text, flags=re.I)
    text = re.sub(r"[^\w\u0900-\u097F]+", " ", text, flags=re.UNICODE)
    return normalize_ws(text)


def script_counts(text: str) -> tuple[int, int]:
    return len(DEVANAGARI_RE.findall(text)), len(LATIN_RE.findall(text))


def looks_bilingual(text: str) -> bool:
    d, l = script_counts(text)
    return d >= 8 and l >= 12


def contains_mojibake(text: str) -> list[str]:
    return [m for m in MOJIBAKE_MARKERS if m in text]


def is_excluded(rel: str, globs: list[str]) -> bool:
    return any(fnmatch.fnmatch(rel, g) or fnmatch.fnmatch("/" + rel, g) for g in globs)


def is_external_url(value: str) -> bool:
    value = (value or "").strip()
    if not value or value.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
        return True
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} or value.startswith("//")


def local_target(source: Path, value: str, repo_root: Path) -> Path | None:
    if is_external_url(value):
        return None
    raw = unquote(value.split("#", 1)[0].split("?", 1)[0]).strip()
    if not raw:
        return None
    if raw.startswith("/"):
        return (repo_root / raw.lstrip("/")).resolve()
    return (source.parent / raw).resolve()


def stable_id(*parts: str) -> str:
    raw = "|".join(parts).encode("utf-8", errors="ignore")
    return hashlib.sha1(raw).hexdigest()[:12]


def dump_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
