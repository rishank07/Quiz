#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
MUSIC = ROOT / "music.html"
SW = ROOT / "service-worker.js"

LAUNCH_SCRIPT = '  <script defer src="./radio-launch.js?v=20260907v2"></script>\n'

BROWSER_TAB_FLOW = r'''function efpFindStudyTab(goHome){
  var study=null;
  try{
    if(window.opener&&!window.opener.closed&&window.opener.location.origin===window.location.origin)study=window.opener;
  }catch(e){}

  if(!study){
    try{
      if(goHome){
        study=window.open('/','efpExamFusionStudy');
      }else{
        study=window.open('','efpExamFusionStudy');
        if(study){
          try{if(!study.location.href||study.location.href==='about:blank')study.location.href='/'}catch(e){}
        }
      }
    }catch(e){}
  }

  if(!study)return null;
  try{
    if(goHome)study.location.href='/';
    study.focus();
  }catch(e){}
  return study;
}

function efpBrowserReturnToStudy(){
  var study=efpFindStudyTab(false);
  if(study){
    say('Radio yahin chalta rahega — Study tab par wapas chale gaye.');
    try{if(typeof gtag==='function')gtag('event','radio_keep_playing',{mode:'browser_return_to_study'})}catch(e){}
  }else{
    say('Study tab open nahi ho paya. Browser me new tabs allow karke dobara try karo.',true);
  }
}

function efpBrowserOpenStudyHome(){
  var study=efpFindStudyTab(true);
  if(study){
    say('ExamFusion Home study tab me khul gaya — Radio yahin chalta rahega.');
    try{if(typeof gtag==='function')gtag('event','radio_keep_playing',{mode:'browser_home_in_study_tab'})}catch(e){}
  }else{
    say('ExamFusion Home open nahi ho paya. Browser me new tabs allow karke dobara try karo.',true);
  }
}

if(!efpInstalledAndroid){
  if(efpKeepStudy)efpKeepStudy.textContent='↩ Return to Study';
  if(efpKeepStudyHint)efpKeepStudyHint.textContent='Radio tab open rakho; Return to Study se existing ExamFusion tab par wapas jaoge. Home bhi usi tab ko reuse karega.';
}
if(efpKeepStudy)efpKeepStudy.onclick=function(){
  save();
  if(efpInstalledAndroid){
    if(audio.paused){say('Pehle koi gaana Play karo, phir Keep Playing & Study dabao.',true);return}
    efpOpenStudyShell();
    return;
  }
  efpBrowserReturnToStudy();
};

document.addEventListener('click',function(e){
  if(efpInstalledAndroid||!e.target||!e.target.closest)return;
  var home=e.target.closest('#efp-home-button, .efp-brand[href="/"], .efp-brand[href="/index.html"]');
  if(!home)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  save();
  efpBrowserOpenStudyHome();
},true);

document.addEventListener('click',function(e){
  if(efpInstalledAndroid||!e.target||!e.target.closest)return;
  var b=e.target.closest('#efp-app-back-button');
  if(!b)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  save();
  efpBrowserReturnToStudy();
},true);
'''


def patch_index(text: str) -> str:
    if "radio-launch.js" not in text:
        anchor = '  <script defer src="./black-mode.js?v=20260902b"></script>\n'
        if anchor not in text:
            raise SystemExit("index black-mode anchor not found")
        text = text.replace(anchor, anchor + LAUNCH_SCRIPT, 1)
    else:
        text, n = re.subn(
            r'  <script defer src="\./radio-launch\.js\?v=[^"]+"></script>\n',
            LAUNCH_SCRIPT,
            text,
            count=1,
        )
        if n != 1:
            raise SystemExit("radio-launch script tag found but version marker could not be updated")
    return text


def patch_music(text: str) -> str:
    # Preferred path: replace the currently installed browser continuity block.
    pattern = re.compile(
        r"function efpBrowserReturnToStudy\(\)\{.*?\nif\(efpStudyClose\)",
        re.S,
    )
    text2, n = pattern.subn(BROWSER_TAB_FLOW + "\nif(efpStudyClose)", text, count=1)
    if n == 1:
        return text2

    # First-time/fallback path after the older browser-flow installer.
    old_pattern = re.compile(
        r"if\(!efpInstalledAndroid\)\{\n"
        r"  if\(efpKeepStudy\)efpKeepStudy\.textContent='🎧 Keep Playing & Go Back';.*?"
        r"document\.addEventListener\('click',function\(e\)\{.*?\n\},true\);\n\n",
        re.S,
    )
    text2, n = old_pattern.subn(BROWSER_TAB_FLOW + "\n", text, count=1)
    if n != 1:
        raise SystemExit("music browser continuity block not found")
    return text2


def patch_sw(text: str) -> str:
    text, n = re.subn(
        r'const CACHE_VERSION = "efp-pwa-[^"]+";',
        'const CACHE_VERSION = "efp-pwa-2026-09-07-v43-radio-two-tabs";',
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
