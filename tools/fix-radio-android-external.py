#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
RADIO = ROOT / "radio-launch.js"
MUSIC = ROOT / "music.html"
INDEX = ROOT / "index.html"
SW = ROOT / "service-worker.js"

RADIO_BLOCK = r'''  function buildChromeIntent(httpsUrl) {
    var url = new URL(httpsUrl);
    var scheme = url.protocol.replace(":", "") || "https";
    var data = url.host + url.pathname + url.search + url.hash;
    return "intent://" + data +
      "#Intent;scheme=" + scheme +
      ";action=android.intent.action.VIEW" +
      ";category=android.intent.category.BROWSABLE" +
      ";package=" + CHROME_PACKAGE +
      ";end";
  }

  function fireChromeIntent(intentUrl) {
    var link = document.createElement("a");
    link.href = intentUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    window.setTimeout(function () {
      try { link.remove(); } catch (_) {}
    }, 1200);
  }

  function openRadioOutsideAndroidApp(anchor) {
    var radioUrl = buildAndroidRadioUrl(anchor.href);
    fireChromeIntent(buildChromeIntent(radioUrl));
  }
'''

MUSIC_APP_INTENT = r'''function efpAndroidAppIntent(targetUrl){
  try{
    var target=new URL(targetUrl,location.origin);
    var scheme=(target.protocol||'https:').replace(':','');
    var data=target.host+target.pathname+target.search+target.hash;
    return 'intent://'+data+'#Intent;scheme='+scheme+';action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package='+EFP_ANDROID_APP_PACKAGE+';end';
  }catch(e){return ''}
}

function efpOpenAndroidApp(goHome){
  var target=efpAndroidReturnTarget(!!goHome);
  var intent=efpAndroidAppIntent(target);
  try{if(typeof gtag==='function')gtag('event','radio_return_to_android_app',{destination:goHome?'home':'study'})}catch(e){}
  if(!intent){say('ExamFusion app return link ready nahi ho paya.',true);return}
  var link=document.createElement('a');
  link.href=intent;
  link.style.display='none';
  document.body.appendChild(link);
  link.click();
  setTimeout(function(){try{link.remove()}catch(e){}},1200);
}
'''


def patch_radio(text: str) -> str:
    pattern = re.compile(
        r"  function buildChromeIntent\(httpsUrl\) \{.*?\n  \}\n\n"
        r"  function openRadioOutsideAndroidApp\(anchor\) \{.*?\n  \}\n",
        re.S,
    )
    text2, n = pattern.subn(RADIO_BLOCK, text, count=1)
    if n != 1:
        raise SystemExit("radio-launch Android Chrome block not found")
    return text2


def patch_music(text: str) -> str:
    pattern = re.compile(
        r"function efpAndroidAppIntent\(targetUrl\)\{.*?\n\}\n\n"
        r"function efpOpenAndroidApp\(goHome\)\{.*?\n\}\n",
        re.S,
    )
    text2, n = pattern.subn(MUSIC_APP_INTENT, text, count=1)
    if n != 1:
        raise SystemExit("music Android app return block not found")
    return text2


def patch_index(text: str) -> str:
    text2, n = re.subn(
        r'<script defer src="\./radio-launch\.js\?v=[^"]+"></script>',
        '<script defer src="./radio-launch.js?v=20260907v5"></script>',
        text,
        count=1,
    )
    if n != 1:
        raise SystemExit("index radio-launch tag not found")
    return text2


def patch_sw(text: str) -> str:
    text2, n = re.subn(
        r'const CACHE_VERSION = "efp-pwa-[^"]+";',
        'const CACHE_VERSION = "efp-pwa-2026-09-07-v48-radio-real-chrome-tab";',
        text,
        count=1,
    )
    if n != 1:
        raise SystemExit("service worker cache marker not found")
    return text2


def write(path: Path, new: str) -> bool:
    old = path.read_text(encoding="utf-8")
    if old == new:
        return False
    path.write_text(new, encoding="utf-8", newline="\n")
    return True


def main():
    changed=[]
    if write(RADIO, patch_radio(RADIO.read_text(encoding="utf-8"))): changed.append("radio-launch.js")
    if write(MUSIC, patch_music(MUSIC.read_text(encoding="utf-8"))): changed.append("music.html")
    if write(INDEX, patch_index(INDEX.read_text(encoding="utf-8"))): changed.append("index.html")
    if write(SW, patch_sw(SW.read_text(encoding="utf-8"))): changed.append("service-worker.js")
    print("Updated: " + (", ".join(changed) if changed else "nothing"))

if __name__ == "__main__":
    main()
