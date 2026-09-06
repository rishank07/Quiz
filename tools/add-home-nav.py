#!/usr/bin/env python3
"""Ensure every HTML page loads the shared ExamFusion Prep Home control."""

from __future__ import annotations

import argparse
from pathlib import Path

SCRIPT_TAG = '  <script defer src="/home-nav.js?v=20260906"></script>\n'
MARKER = "/home-nav.js"


def inject(path: Path) -> bool:
    raw = path.read_bytes()
    bom = raw.startswith(b"\xef\xbb\xbf")
    payload = raw[3:] if bom else raw
    try:
        text = payload.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise RuntimeError(f"Non-UTF-8 HTML file: {path}") from exc

    if MARKER in text:
        return False

    lower = text.lower()
    head_end = lower.rfind("</head>")
    if head_end != -1:
        text = text[:head_end] + SCRIPT_TAG + text[head_end:]
    else:
        body_end = lower.rfind("</body>")
        if body_end != -1:
            text = text[:body_end] + SCRIPT_TAG + text[body_end:]
        else:
            if text and not text.endswith("\n"):
                text += "\n"
            text += SCRIPT_TAG

    out = text.encode("utf-8")
    if bom:
        out = b"\xef\xbb\xbf" + out
    path.write_bytes(out)
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=".")
    args = parser.parse_args()

    root = Path(args.repo).resolve()
    changed = []
    html_files = sorted(
        p for p in root.rglob("*.html")
        if ".git" not in p.parts
    )

    for path in html_files:
        if inject(path):
            changed.append(path.relative_to(root).as_posix())

    print(f"HTML pages scanned: {len(html_files)}")
    print(f"HTML pages updated: {len(changed)}")
    for path in changed:
        print(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
