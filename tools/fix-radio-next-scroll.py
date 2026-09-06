#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MUSIC = ROOT / "music.html"
SW = ROOT / "service-worker.js"

OLD = "function markCurrent(){list.querySelectorAll('.row').forEach(function(r){var on=+r.dataset.i===pos;r.setAttribute('aria-current',on?'true':'false');if(on)r.scrollIntoView({block:'nearest'})})}"
NEW = "function markCurrent(){list.querySelectorAll('.row').forEach(function(r){var on=+r.dataset.i===pos;r.setAttribute('aria-current',on?'true':'false');if(on){var top=r.offsetTop-list.offsetTop,bottom=top+r.offsetHeight,viewTop=list.scrollTop,viewBottom=viewTop+list.clientHeight;if(top<viewTop)list.scrollTop=Math.max(0,top);else if(bottom>viewBottom)list.scrollTop=Math.max(0,bottom-list.clientHeight)}})}"


def patch_music(text: str) -> str:
    if OLD in text:
        return text.replace(OLD, NEW, 1)
    if NEW in text:
        return text
    raise SystemExit("Retro Radio markCurrent scroll marker not found")


def patch_sw(text: str) -> str:
    text, n = re.subn(
        r'const CACHE_VERSION = "efp-pwa-[^"]+";',
        'const CACHE_VERSION = "efp-pwa-2026-09-07-v57-radio-no-page-scroll";',
        text,
        count=1,
    )
    if n != 1:
        raise SystemExit("service worker cache version marker not found")
    return text


def write(path: Path, new: str) -> bool:
    old = path.read_text(encoding="utf-8")
    if old == new:
        return False
    path.write_text(new, encoding="utf-8", newline="\n")
    return True


def main():
    changed = []
    if write(MUSIC, patch_music(MUSIC.read_text(encoding="utf-8"))):
        changed.append("music.html")
    if write(SW, patch_sw(SW.read_text(encoding="utf-8"))):
        changed.append("service-worker.js")
    print("Updated: " + (", ".join(changed) if changed else "nothing"))


if __name__ == "__main__":
    main()
