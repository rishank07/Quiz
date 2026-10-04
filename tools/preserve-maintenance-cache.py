"""Keep legacy break-tool installers from reverting a newer PWA cache key."""
import hashlib
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
CACHE = re.compile(r'const CACHE_VERSION = "(efp-pwa-[^"]+)";')


def fingerprint(root: Path) -> str:
    assets = [root / name for name in
              ("index.html", "music.html", "chess.html", "radio-launch.js", "service-worker.js")]
    assets.extend(sorted((root / "vendor/stockfish").rglob("*")))
    digest = hashlib.sha256()
    for asset in assets:
        if not asset.is_file():
            continue
        content = asset.read_bytes()
        if asset.name == "service-worker.js":
            content = CACHE.sub('const CACHE_VERSION = "efp-pwa-placeholder";',
                                content.decode()).encode()
        digest.update(str(asset.relative_to(root)).encode() + b"\0")
        digest.update(content + b"\0")
    return digest.hexdigest()


def maintain(stage: str, snapshot: Path, root: Path = ROOT) -> None:
    sw = root / "service-worker.js"
    content = sw.read_text()
    match = CACHE.search(content)
    if not match:
        raise SystemExit("CACHE_VERSION marker not found")
    if stage == "snapshot":
        snapshot.write_text(json.dumps({"version": match[1], "fingerprint": fingerprint(root)}))
        return
    if stage != "restore":
        raise SystemExit("Expected snapshot or restore")
    saved = json.loads(snapshot.read_text())
    current = fingerprint(root)
    # A no-op maintenance run keeps the current cache. Real asset changes get
    # a stable content-based key instead of one of the installers' 2026-09 keys.
    version = saved["version"] if current == saved["fingerprint"] else "efp-pwa-maintenance-" + current[:20]
    sw.write_text(CACHE.sub('const CACHE_VERSION = "' + version + '";', content, count=1))
    print("PWA maintenance cache: " + version)


if __name__ == "__main__":
    maintain(sys.argv[1], Path(sys.argv[2]))
