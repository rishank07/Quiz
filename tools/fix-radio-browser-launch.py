#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
MUSIC = ROOT / "music.html"
SW = ROOT / "service-worker.js"

LAUNCH_SCRIPT = '  <script defer src="./radio-launch.js?v=20260907v1"></script>\n'


def patch_index(text: str) -> str:
    if "radio-launch.js" not in text:
        anchor = '  <script defer src="./black-mode.js?v=20260902b"></script>\n'
        if anchor not in text:
            raise SystemExit("index black-mode anchor not found")
        text = text.replace(anchor, anchor + LAUNCH_SCRIPT, 1)
    return text


def patch_music(text: str) -> str:
    pattern = re.compile(
        r"if\(!efpInstalledAndroid\)\{\n"
        r"  if\(efpKeepStudy\)efpKeepStudy\.textContent='🎧 Keep Playing & Go Back';\n"
        r"  if\(efpKeepStudyHint\)efpKeepStudyHint\.textContent='Radio separate player me chalta rahega; ye tab pichhle quiz/page par wapas jayega\.';\n"
        r"\}\n"
        r"if\(efpKeepStudy\)efpKeepStudy\.onclick=function\(\)\{.*?\n"
        r"\};\n\n"
        r"document\.addEventListener\('click',function\(e\)\{.*?\n"
        r"\},true\);\n\n",
        re.S,
    )
    replacement = r'''function efpBrowserReturnToStudy(){
  var study=null;
  try{if(window.opener&&!window.opener.closed)study=window.opener}catch(e){}
  if(study){
    try{study.focus()}catch(e){}
    say('Radio yahin chalta rahega — Study tab par wapas chale gaye.');
    try{if(typeof gtag==='function')gtag('event','radio_keep_playing',{mode:'browser_return_to_opener'})}catch(e){}
    return;
  }
  var w=null;try{w=window.open('/','efpExamFusionStudy')}catch(e){}
  if(w){try{w.focus()}catch(e){}say('ExamFusion study tab khul gaya; Radio yahin chalta rahega.');}
  else say('Study tab open nahi ho paya. Browser me new tabs allow karke dobara try karo.',true);
}

if(!efpInstalledAndroid){
  if(efpKeepStudy)efpKeepStudy.textContent='↩ Return to Study';
  if(efpKeepStudyHint)efpKeepStudyHint.textContent='Radio tab open rakho; Return to Study se original ExamFusion tab par wapas jaoge aur gaana chalta rahega.';
}
if(efpKeepStudy)efpKeepStudy.onclick=function(){
  if(audio.paused){say('Pehle koi gaana Play karo, phir Return to Study dabao.',true);return}
  save();
  if(efpInstalledAndroid){efpOpenStudyShell();return}
  efpBrowserReturnToStudy();
};

document.addEventListener('click',function(e){
  if(efpInstalledAndroid||audio.paused||!e.target||!e.target.closest)return;
  var b=e.target.closest('#efp-app-back-button');
  if(!b)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  efpBrowserReturnToStudy();
},true);

'''
    text2, n = pattern.subn(replacement, text, count=1)
    if n == 0:
        # Already patched is fine.
        if "function efpBrowserReturnToStudy()" not in text:
            raise SystemExit("music browser continuity block not found")
        text2 = text
    return text2


def patch_sw(text: str) -> str:
    text, n = re.subn(
        r'const CACHE_VERSION = "efp-pwa-[^"]+";',
        'const CACHE_VERSION = "efp-pwa-2026-09-07-v42-radio-separate-tab";',
        text,
        count=1,
    )
    if n != 1:
        raise SystemExit("service worker cache version marker not found")

    if '  "/radio-launch.js",' not in text:
        anchor = '  "/music.html",\n'
        if anchor not in text:
            raise SystemExit("service worker music app-shell anchor not found")
        text = text.replace(anchor, anchor + '  "/radio-launch.js",\n', 1)
    return text


def write(path: Path, new: str) -> bool:
    old = path.read_text(encoding="utf-8")
    if old == new:
        return False
    path.write_text(new, encoding="utf-8", newline="\n")
    return True


def main():
    changed=[]
    if write(INDEX, patch_index(INDEX.read_text(encoding="utf-8"))): changed.append("index.html")
    if write(MUSIC, patch_music(MUSIC.read_text(encoding="utf-8"))): changed.append("music.html")
    if write(SW, patch_sw(SW.read_text(encoding="utf-8"))): changed.append("service-worker.js")
    print("Updated: " + (", ".join(changed) if changed else "nothing"))

if __name__ == "__main__":
    main()
