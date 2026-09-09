#!/usr/bin/env python3
"""Ensure every HTML page loads shared Home + logical Back navigation."""

from __future__ import annotations

import argparse
from pathlib import Path

SCRIPT_SPECS = (
    ("/back-parent-map.js", '  <script defer src="/back-parent-map.js?v=20260906hier1"></script>\n'),
    ("/back-nav.js", '  <script defer src="/back-nav.js?v=20260906hier1"></script>\n'),
    ("/home-nav.js", '  <script defer src="/home-nav.js?v=20260906nav2"></script>\n'),
)

MATHS_SPEED_BOOSTER_FILE = Path("Maths Speed Booster/math-speed-booster.html")
MATHS_FIT_MARKER = "/Maths%20Speed%20Booster/math-speed-booster-fit.css"
MATHS_FIT_TAG = (
    '  <link rel="stylesheet" '
    'href="/Maths%20Speed%20Booster/math-speed-booster-fit.css?v=20260906fit1">\n'
)

RAPID_PRACTICE_DIR = Path("Current Affairs/Topic Names/Rapid Practice")
RAPID_BACK_BOOTSTRAP_MARKER = 'id="efp-rapid-back-bootstrap"'
RAPID_BACK_BOOTSTRAP = (
    '  <script id="efp-rapid-back-bootstrap">'
    'document.documentElement.classList.add("efp-crux-back-fallback");'
    '</script>\n'
)
RAPID_BACK_BUTTON_MARKER = 'id="efp-app-back-button"'
RAPID_BACK_BUTTON = (
    '\n<button id="efp-app-back-button" type="button" '
    'aria-label="Go back to the previous page" aria-keyshortcuts="Alt+ArrowLeft" '
    'title="Back" onclick="history.back()">'
    '<span class="efp-back-icon" aria-hidden="true">&#8592;</span>'
    '<span class="efp-back-label">Back</span>'
    '</button>\n'
)


def is_rapid_practice_quiz(rel: Path) -> bool:
    return RAPID_PRACTICE_DIR in rel.parents


def inject(path: Path, root: Path) -> bool:
    raw = path.read_bytes()
    bom = raw.startswith(b"\xef\xbb\xbf")
    payload = raw[3:] if bom else raw
    try:
        text = payload.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise RuntimeError(f"Non-UTF-8 HTML file: {path}") from exc

    rel = path.relative_to(root)
    head_blocks = [tag for marker, tag in SCRIPT_SPECS if marker not in text]

    if rel == MATHS_SPEED_BOOSTER_FILE and MATHS_FIT_MARKER not in text:
        head_blocks.insert(0, MATHS_FIT_TAG)

    rapid_quiz = is_rapid_practice_quiz(rel)
    if rapid_quiz and RAPID_BACK_BOOTSTRAP_MARKER not in text:
        # Rapid Practice pages already load the shared Home styles. Reuse the
        # same fallback Back appearance that those styles provide on Crux pages
        # so the standard fixed Back control is identical on mobile/desktop.
        head_blocks.append(RAPID_BACK_BOOTSTRAP)

    changed = False
    if head_blocks:
        block = "".join(head_blocks)
        lower = text.lower()
        head_end = lower.rfind("</head>")
        if head_end != -1:
            text = text[:head_end] + block + text[head_end:]
        else:
            body_end = lower.rfind("</body>")
            if body_end != -1:
                text = text[:body_end] + block + text[body_end:]
            else:
                if text and not text.endswith("\n"):
                    text += "\n"
                text += block
        changed = True

    if rapid_quiz and RAPID_BACK_BUTTON_MARKER not in text:
        lower = text.lower()
        body_end = lower.rfind("</body>")
        if body_end != -1:
            text = text[:body_end] + RAPID_BACK_BUTTON + text[body_end:]
        else:
            if text and not text.endswith("\n"):
                text += "\n"
            text += RAPID_BACK_BUTTON
        changed = True

    if not changed:
        return False

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
        if inject(path, root):
            changed.append(path.relative_to(root).as_posix())

    print(f"HTML pages scanned: {len(html_files)}")
    print(f"HTML pages updated: {len(changed)}")
    for path in changed:
        print(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
