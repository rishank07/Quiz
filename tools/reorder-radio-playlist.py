#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MUSIC = ROOT / "music.html"
SW = ROOT / "service-worker.js"

PLAYLIST_BLOCK = '''    <div class="playlist-picker">
      <div class="playlist-picker-title">🎶 Choose a Playlist</div>
      <div class="playlist-picker-help">Har option ek alag playlist hai. Apni pasand ki playlist select karein:</div>
      <div class="chips" id="chips"></div>
    </div>
'''

CONTROLS_BLOCK_END = '''      <button class="ctl" id="repeat" aria-pressed="false" aria-label="Repeat one" title="Repeat one">🔁</button>
    </div>
'''


def patch_music(text: str) -> str:
    playlist_pos = text.find(PLAYLIST_BLOCK)
    controls_pos = text.find('<div class="controls">')
    if playlist_pos == -1:
        raise SystemExit("Retro Radio playlist block not found")
    if controls_pos == -1 or CONTROLS_BLOCK_END not in text:
        raise SystemExit("Retro Radio controls block not found")

    # Desired order: Now Playing -> player buttons -> Choose a Playlist -> seek/volume.
    if playlist_pos > controls_pos:
        return text

    text = text.replace(PLAYLIST_BLOCK, "", 1)
    text = text.replace(
        CONTROLS_BLOCK_END,
        CONTROLS_BLOCK_END + "\n" + PLAYLIST_BLOCK,
        1,
    )
    return text


def patch_sw(text: str) -> str:
    text, n = re.subn(
        r'const CACHE_VERSION = "efp-pwa-[^"]+";',
        'const CACHE_VERSION = "efp-pwa-2026-09-07-v54-radio-controls-first";',
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
