#!/usr/bin/env python3
"""Install the shared GA exclusion before tracking, including cold first visits."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "analytics-guard.js"
MARK = "efp-analytics-guard"


def install():
    # Keep the readable source authoritative; the inline copy avoids a blocking
    # network request and works without service-worker control or local storage.
    code = SOURCE.read_text(encoding="utf-8")
    code = re.sub(r"/\*.*?\*/", "", code, flags=re.S)
    code = " ".join(line.strip() for line in code.splitlines() if line.strip())
    snippet = f'<script id="{MARK}">{code}</script>'
    previous = re.compile(r'\s*<script\b[^>]*\bid=["\']' + MARK + r'["\'][^>]*>.*?</script>', re.I | re.S)
    tracked = changed = 0
    for path in sorted(ROOT.rglob("*.html")):
        raw = path.read_bytes()
        text = raw.decode("utf-8-sig")
        if not re.search(r"googletagmanager\.com/gtag/js|gtag\s*\(", text):
            continue
        tracked += 1
        clean = previous.sub("", text)
        head = re.search(r"<head(?:\s[^>]*)?>", clean, re.I)
        if not head:
            raise RuntimeError(f"Tracked page has no head: {path.relative_to(ROOT)}")
        # Retain the encoding declaration before the script when present.
        charset = re.match(r'\s*<meta\b[^>]*\bcharset\s*=[^>]*>', clean[head.end():], re.I)
        start = head.end() + (charset.end() if charset else 0)
        updated = clean[:start] + "\n  " + snippet + clean[start:]
        output = (b"\xef\xbb\xbf" if raw.startswith(b"\xef\xbb\xbf") else b"") + updated.encode("utf-8")
        if output != raw:
            path.write_bytes(output)
            changed += 1
    print(f"Analytics guard: {tracked} tracked pages, {changed} updated")


if __name__ == "__main__":
    install()
