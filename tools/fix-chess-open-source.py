#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SW = ROOT / "service-worker.js"
CHESS = ROOT / "chess.html"


def patch_sw(text: str) -> str:
    text, n = re.subn(
        r'const CACHE_VERSION = "efp-pwa-[^"]+";',
        'const CACHE_VERSION = "efp-pwa-2026-09-07-v45-stockfish-chess";',
        text,
        count=1,
    )
    if n != 1:
        raise SystemExit("service-worker cache version marker not found")

    if '/cm-chessboard@8.14.0/' not in text:
        old = '        url.pathname.includes("/chess.js@1.4.0/")\n'
        new = (
            '        url.pathname.includes("/chess.js@1.4.0/") ||\n'
            '        url.pathname.includes("/cm-chessboard@8.14.0/")\n'
        )
        if old not in text:
            raise SystemExit("jsDelivr chess cache marker not found")
        text = text.replace(old, new, 1)
    return text


def validate_chess(text: str) -> None:
    required = [
        "cm-chessboard@8.14.0",
        "stockfish-18-lite-single.js",
        "Stockfish 18",
        "id=\"board\"",
        "id=\"level\"",
        "id=\"newGame\"",
    ]
    missing = [item for item in required if item not in text]
    if missing:
        raise SystemExit("New open-source chess page missing markers: " + ", ".join(missing))


def main() -> None:
    chess = CHESS.read_text(encoding="utf-8")
    validate_chess(chess)

    old = SW.read_text(encoding="utf-8")
    new = patch_sw(old)
    if new != old:
        SW.write_text(new, encoding="utf-8", newline="\n")
        print("Updated: service-worker.js")
    else:
        print("Updated: nothing")


if __name__ == "__main__":
    main()
