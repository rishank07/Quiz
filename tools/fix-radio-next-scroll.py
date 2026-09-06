#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MUSIC = ROOT / "music.html"
SW = ROOT / "service-worker.js"

OLD_SCROLL = "function markCurrent(){list.querySelectorAll('.row').forEach(function(r){var on=+r.dataset.i===pos;r.setAttribute('aria-current',on?'true':'false');if(on){var top=r.offsetTop-list.offsetTop,bottom=top+r.offsetHeight,viewTop=list.scrollTop,viewBottom=viewTop+list.clientHeight;if(top<viewTop)list.scrollTop=Math.max(0,top);else if(bottom>viewBottom)list.scrollTop=Math.max(0,bottom-list.clientHeight)}})}"
NEW_SCROLL = "function markCurrent(){var lr=list.getBoundingClientRect(),listVisible=lr.bottom>0&&lr.top<(window.innerHeight||document.documentElement.clientHeight);list.querySelectorAll('.row').forEach(function(r){var on=+r.dataset.i===pos;r.setAttribute('aria-current',on?'true':'false');if(on&&listVisible){var top=r.offsetTop-list.offsetTop,bottom=top+r.offsetHeight,viewTop=list.scrollTop,viewBottom=viewTop+list.clientHeight;if(top<viewTop)list.scrollTop=Math.max(0,top);else if(bottom>viewBottom)list.scrollTop=Math.max(0,bottom-list.clientHeight)}})}"

OLD_STEP = "function step(delta){if(!tracks.length)return;var i;if(shuffleOn){i=Math.floor(Math.random()*tracks.length);if(tracks.length>1&&i===pos)i=(i+1)%tracks.length}else{i=(pos+delta+tracks.length)%tracks.length}pendingResume=0;select(i,true,0)}"
NEW_STEP = "function step(delta){if(!tracks.length)return;var androidApp=/ExamFusionPrepAndroid\\//i.test(navigator.userAgent||''),keepY=androidApp?(window.scrollY||window.pageYOffset||0):null,i;if(shuffleOn){i=Math.floor(Math.random()*tracks.length);if(tracks.length>1&&i===pos)i=(i+1)%tracks.length}else{i=(pos+delta+tracks.length)%tracks.length}pendingResume=0;select(i,true,0);if(androidApp){var restore=function(){window.scrollTo(0,keepY)};requestAnimationFrame(restore);setTimeout(restore,40);setTimeout(restore,140)}}"

ANCHOR_CSS = ".list{max-height:350px;overflow:auto;-webkit-overflow-scrolling:touch}"
ANCHOR_CSS_NEW = ".list{max-height:350px;overflow:auto;-webkit-overflow-scrolling:touch;overflow-anchor:none;overscroll-behavior:contain}"


def patch_music(text: str) -> str:
    if OLD_SCROLL in text:
        text = text.replace(OLD_SCROLL, NEW_SCROLL, 1)
    elif NEW_SCROLL not in text:
        raise SystemExit("Retro Radio markCurrent scroll marker not found")

    if OLD_STEP in text:
        text = text.replace(OLD_STEP, NEW_STEP, 1)
    elif NEW_STEP not in text:
        raise SystemExit("Retro Radio step marker not found")

    if ANCHOR_CSS in text:
        text = text.replace(ANCHOR_CSS, ANCHOR_CSS_NEW, 1)
    elif ANCHOR_CSS_NEW not in text:
        raise SystemExit("Retro Radio list CSS marker not found")
    return text


def patch_sw(text: str) -> str:
    text, n = re.subn(
        r'const CACHE_VERSION = "efp-pwa-[^"]+";',
        'const CACHE_VERSION = "efp-pwa-2026-09-07-v58-radio-android-scroll-lock";',
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
