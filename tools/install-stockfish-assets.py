#!/usr/bin/env python3
from pathlib import Path
import hashlib
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "vendor" / "stockfish"
DEST.mkdir(parents=True, exist_ok=True)

FILES = {
    "stockfish-18-lite-single.js": (
        "https://github.com/nmrugg/stockfish.js/releases/download/v18.0.0/stockfish-18-lite-single.js",
        "2278005057f381491f1c9bb3e44c9f5920b3a00bef9759e33cc6582769a1f1fe",
    ),
    "stockfish-18-lite-single.wasm": (
        "https://github.com/nmrugg/stockfish.js/releases/download/v18.0.0/stockfish-18-lite-single.wasm",
        "a8fbc05ec6920b56d7485826dcb02c5ffd2826bcbf751cf973046f237a9096f1",
    ),
}

LICENSE_URL = "https://raw.githubusercontent.com/nmrugg/stockfish.js/master/Copying.txt"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def download(url: str, path: Path) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": "ExamFusionPrep-GitHub-Actions"})
    with urllib.request.urlopen(req, timeout=120) as r, path.open("wb") as f:
        while True:
            chunk = r.read(1024 * 1024)
            if not chunk:
                break
            f.write(chunk)


def ensure_asset(name: str, url: str, expected: str) -> bool:
    path = DEST / name
    if path.exists() and sha256(path) == expected:
        return False
    tmp = path.with_suffix(path.suffix + ".tmp")
    if tmp.exists():
        tmp.unlink()
    download(url, tmp)
    actual = sha256(tmp)
    if actual != expected:
        tmp.unlink(missing_ok=True)
        raise SystemExit(f"SHA256 mismatch for {name}: {actual}")
    tmp.replace(path)
    return True


def main() -> None:
    changed = []
    for name, (url, expected) in FILES.items():
        if ensure_asset(name, url, expected):
            changed.append(name)

    license_path = DEST / "COPYING.txt"
    if not license_path.exists() or license_path.stat().st_size < 1000:
        download(LICENSE_URL, license_path)
        changed.append("COPYING.txt")

    notice = DEST / "NOTICE.txt"
    notice_text = (
        "Stockfish.js v18.0.0 lite single-threaded build\n"
        "Upstream: https://github.com/nmrugg/stockfish.js\n"
        "Engine: Stockfish 18\n"
        "License: GNU GPL v3 (see COPYING.txt)\n"
        "Files are unmodified release assets from upstream.\n"
    )
    if not notice.exists() or notice.read_text(encoding="utf-8") != notice_text:
        notice.write_text(notice_text, encoding="utf-8", newline="\n")
        changed.append("NOTICE.txt")

    print("Stockfish vendor: " + (", ".join(changed) if changed else "already current"))


if __name__ == "__main__":
    main()
