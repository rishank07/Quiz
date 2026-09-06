#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
SW = ROOT / "service-worker.js"
CHESS = ROOT / "chess.html"
MUSIC = ROOT / "music.html"

MUSIC_MARKER = 'href="./music.html"'
CHESS_MARKER = 'href="./chess.html"'
TELEGRAM_MARKER = "        <!-- Telegram Section -->"
OLD_MUSIC_LABEL = '<span class="link-text bilabel"><span class="bilabel-en">Retro Break Music</span><span class="bilabel-hi">पुराने बॉलीवुड गीत</span></span>'
NEW_MUSIC_LABEL = '<span class="link-text bilabel"><span class="bilabel-en">Retro Radio</span><span class="bilabel-hi">पुराने फिल्मी गीत</span></span>'
GA_ID = "G-Q1WNRY8ECV"
GA_SNIPPET = '''<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-Q1WNRY8ECV"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag("js", new Date());
  gtag("config", "G-Q1WNRY8ECV");
</script>
'''

CARDS = '''        <li>\n          <a href="./music.html" onclick="openPage(event)">\n            <i class="fa-solid fa-music menu-icon"></i>\n            <span class="link-text bilabel"><span class="bilabel-en">Retro Radio</span><span class="bilabel-hi">पुराने फिल्मी गीत</span></span>\n            <span class="badge-new">BREAK</span>\n            <i class="fa-solid fa-chevron-right chevron-icon"></i>\n          </a>\n        </li>\n\n        <li>\n          <a href="./chess.html" onclick="openPage(event)">\n            <i class="fa-solid fa-chess-knight menu-icon"></i>\n            <span class="link-text bilabel"><span class="bilabel-en">Play Chess</span><span class="bilabel-hi">कंप्यूटर के साथ शतरंज</span></span>\n            <span class="badge-new">10 LEVELS</span>\n            <i class="fa-solid fa-chevron-right chevron-icon"></i>\n          </a>\n        </li>\n\n'''


def patch_index(text: str) -> str:
    if MUSIC_MARKER not in text and CHESS_MARKER not in text:
        if TELEGRAM_MARKER not in text:
            raise SystemExit("Telegram insertion marker not found in index.html")
        text = text.replace(TELEGRAM_MARKER, CARDS + TELEGRAM_MARKER, 1)
    elif MUSIC_MARKER not in text or CHESS_MARKER not in text:
        raise SystemExit("Only one break-tool card exists; refusing partial duplicate insertion")
    else:
        text = text.replace(OLD_MUSIC_LABEL, NEW_MUSIC_LABEL, 1)
    return text


def patch_music(text: str) -> str:
    if GA_ID in text:
        return text
    favicon = '<link rel="icon" type="image/png" href="./favicon.png">\n'
    if favicon in text:
        return text.replace(favicon, favicon + GA_SNIPPET, 1)
    if "</head>" in text:
        return text.replace("</head>", GA_SNIPPET + "</head>", 1)
    raise SystemExit("Could not find a safe GA insertion point in music.html")


def patch_sw(text: str) -> str:
    text, n = re.subn(
        r'const CACHE_VERSION = "efp-pwa-[^"]+";',
        'const CACHE_VERSION = "efp-pwa-2026-09-07-v38-radio-ga";',
        text,
        count=1,
    )
    if n != 1:
        raise SystemExit("CACHE_VERSION marker not found")

    anchor = '  "/backup-restore.html",\n'
    additions = '  "/music.html",\n  "/chess.html",\n'
    if '  "/music.html",' not in text:
        if anchor not in text:
            raise SystemExit("APP_SHELL anchor not found")
        text = text.replace(anchor, anchor + additions, 1)

    old_external = '''    if (url.origin === "https://cdn.jsdelivr.net" && url.pathname.includes("/pdfjs-dist@3.11.174/")) {\n      event.respondWith(staleWhileRevalidate(event, true));\n    }\n    return;'''
    new_external = '''    if (url.origin === "https://cdn.jsdelivr.net" && (\n        url.pathname.includes("/pdfjs-dist@3.11.174/") ||\n        url.pathname.includes("/chess.js@1.4.0/")\n      )) {\n      event.respondWith(staleWhileRevalidate(event, true));\n    }\n    return;'''
    if '/chess.js@1.4.0/' not in text:
        if old_external not in text:
            raise SystemExit("External CDN cache marker not found")
        text = text.replace(old_external, new_external, 1)
    return text


def patch_chess(text: str) -> str:
    old = '''      files().forEach((f,fi)=>ranks().forEach((r,ri)=>{\n        const sq=f+r,p=game.get(sq),b=document.createElement('button');'''
    new = '''      ranks().forEach((r,ri)=>files().forEach((f,fi)=>{\n        const sq=f+r,p=game.get(sq),b=document.createElement('button');'''
    if old in text:
        text = text.replace(old, new, 1)
    elif new not in text:
        raise SystemExit("Chess render-order marker not found")
    return text


def write_if_changed(path: Path, new: str) -> bool:
    old = path.read_text(encoding="utf-8")
    if old == new:
        return False
    path.write_text(new, encoding="utf-8", newline="\n")
    return True


def main():
    index_old = INDEX.read_text(encoding="utf-8")
    sw_old = SW.read_text(encoding="utf-8")
    chess_old = CHESS.read_text(encoding="utf-8")
    music_old = MUSIC.read_text(encoding="utf-8")
    changed = []
    if write_if_changed(INDEX, patch_index(index_old)):
        changed.append("index.html")
    if write_if_changed(MUSIC, patch_music(music_old)):
        changed.append("music.html")
    if write_if_changed(SW, patch_sw(sw_old)):
        changed.append("service-worker.js")
    if write_if_changed(CHESS, patch_chess(chess_old)):
        changed.append("chess.html")
    print("Updated: " + (", ".join(changed) if changed else "nothing"))


if __name__ == "__main__":
    main()
