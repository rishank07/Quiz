#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
MUSIC = ROOT / "music.html"
SW = ROOT / "service-worker.js"

LAUNCH_SCRIPT = '  <script defer src="./radio-launch.js?v=20260907v8"></script>\n'

BROWSER_TAB_FLOW = r'''var EFP_STUDY_WINDOW='efpExamFusionStudy';
var EFP_ANDROID_SESSION_KEY='efp_android_app_session';

function efpDetectAndroidAppSession(){
  var isAndroid=/Android/i.test(navigator.userAgent||'');
  if(!isAndroid)return false;
  var standalone=false;try{standalone=window.matchMedia('(display-mode: standalone)').matches}catch(e){}
  var twa=/^android-app:\/\//i.test(document.referrer||'');
  var launchMarker=false;
  try{
    var source=new URLSearchParams(location.search).get('source')||'';
    launchMarker=source==='windows-pwa'||source==='android-app'||source==='pwa';
  }catch(e){}
  var remembered=false;try{remembered=sessionStorage.getItem(EFP_ANDROID_SESSION_KEY)==='1'}catch(e){}
  var installed=standalone||twa||launchMarker||remembered;
  if(installed){try{sessionStorage.setItem(EFP_ANDROID_SESSION_KEY,'1')}catch(e){}}
  return installed;
}

/* Re-evaluate here because some TWA launches do not expose standalone/referrer
   on every navigation. The launch marker is remembered only in this app tab. */
efpInstalledAndroid=efpDetectAndroidAppSession();

function efpFindStudyTab(goHome){
  var study=null;
  try{study=window.open('',EFP_STUDY_WINDOW)}catch(e){}
  if(!study)return null;
  try{
    var href='';
    try{href=String(study.location.href||'')}catch(e){}
    if(goHome||!href||href==='about:blank')study.location.href='/';
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
    say('Study tab open nahi ho paya. Browser me pop-ups/new tabs allow karke dobara try karo.',true);
  }
}

function efpBrowserOpenStudyHome(){
  var study=efpFindStudyTab(true);
  if(study){
    say('ExamFusion Home study tab me khul gaya — Radio yahin chalta rahega.');
    try{if(typeof gtag==='function')gtag('event','radio_keep_playing',{mode:'browser_home_in_study_tab'})}catch(e){}
  }else{
    say('ExamFusion Home open nahi ho paya. Browser me pop-ups/new tabs allow karke dobara try karo.',true);
  }
}

function efpWireBrowserHomeTargets(){
  if(efpInstalledAndroid)return;
  var homes=document.querySelectorAll('#efp-home-button, .efp-brand[href="/"], .efp-brand[href="/index.html"]');
  for(var i=0;i<homes.length;i++){
    try{
      homes[i].setAttribute('href','/');
      homes[i].setAttribute('target',EFP_STUDY_WINDOW);
      homes[i].setAttribute('data-efp-radio-home','1');
    }catch(e){}
  }
}

if(efpInstalledAndroid){
  /* Android APK/TWA stays intentionally simple: normal in-app Radio page,
     normal Home/Back navigation, no background-study shell or browser intents. */
  var efpContinuityBox=document.getElementById('efpContinuity');
  if(efpContinuityBox){efpContinuityBox.hidden=true;efpContinuityBox.style.display='none'}
  if(efpStudyShell)efpStudyShell.hidden=true;
}else{
  if(efpKeepStudy)efpKeepStudy.textContent='↩ Return to Study';
  if(efpKeepStudyHint)efpKeepStudyHint.textContent='Radio tab open rakho; Return to Study existing ExamFusion tab ko focus karega. Home bhi usi tab ko landing page par le jayega.';
  efpWireBrowserHomeTargets();
  try{
    var efpHomeObserver=new MutationObserver(function(){efpWireBrowserHomeTargets()});
    efpHomeObserver.observe(document.documentElement,{childList:true,subtree:true});
  }catch(e){}
}

if(efpKeepStudy)efpKeepStudy.onclick=function(){
  if(efpInstalledAndroid)return;
  save();
  efpBrowserReturnToStudy();
};

document.addEventListener('click',function(e){
  if(efpInstalledAndroid)return;
  if(!e.target||!e.target.closest)return;
  var home=e.target.closest('#efp-home-button, .efp-brand[href="/"], .efp-brand[href="/index.html"]');
  if(!home)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  save();
  efpBrowserOpenStudyHome();
},true);

document.addEventListener('click',function(e){
  if(efpInstalledAndroid)return;
  if(!e.target||!e.target.closest)return;
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
        return text.replace(anchor, anchor + LAUNCH_SCRIPT, 1)
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
    # Collapse any previous Android/browser routing revision into one final block.
    start = text.find("var EFP_STUDY_WINDOW='efpExamFusionStudy';")
    end_marker = "if(efpStudyClose)efpStudyClose.onclick=efpCloseStudyShell;"
    end = text.find(end_marker, start)
    if start == -1 or end == -1:
        raise SystemExit("music continuity block not found")
    return text[:start] + BROWSER_TAB_FLOW + "\n" + text[end:]


def patch_sw(text: str) -> str:
    text, n = re.subn(
        r'const CACHE_VERSION = "efp-pwa-[^"]+";',
        'const CACHE_VERSION = "efp-pwa-2026-09-07-v51-radio-app-detect";',
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
