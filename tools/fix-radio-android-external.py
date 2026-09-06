#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
RADIO = ROOT / "radio-launch.js"
MUSIC = ROOT / "music.html"
INDEX = ROOT / "index.html"
SW = ROOT / "service-worker.js"

RADIO_CONTENT = r'''/* ExamFusion Prep — Retro Radio launcher.
   Normal browsers keep Study + Radio in two reusable tabs.
   Installed Android app turns the user's actual Radio tap into a Chrome VIEW
   intent, so the TWA itself never navigates to music.html. */
(function () {
  "use strict";

  var STUDY_WINDOW = "efpExamFusionStudy";
  var RADIO_WINDOW = "efpRetroRadio";
  var CHROME_PACKAGE = "com.android.chrome";

  function isInstalledAndroid() {
    var isAndroid = /Android/i.test(navigator.userAgent || "");
    var standalone = false;
    try { standalone = window.matchMedia("(display-mode: standalone)").matches; } catch (_) {}
    var twa = /^android-app:\/\//i.test(document.referrer || "");
    return isAndroid && (standalone || twa);
  }

  function isRadioLink(anchor) {
    if (!anchor || !anchor.href) return false;
    try {
      var url = new URL(anchor.href, window.location.href);
      return url.origin === window.location.origin && /\/music\.html$/i.test(url.pathname);
    } catch (_) { return false; }
  }

  function bindCurrentTabAsStudy() {
    try {
      window.name = STUDY_WINDOW;
      try { sessionStorage.setItem("efp_radio_study_bound", "1"); } catch (_) {}
      return window.name === STUDY_WINDOW;
    } catch (_) { return false; }
  }

  function safeCurrentStudyUrl() {
    try {
      var url = new URL(window.location.href);
      if (url.origin === window.location.origin && !/\/music\.html$/i.test(url.pathname)) return url.href;
    } catch (_) {}
    return window.location.origin + "/";
  }

  function buildAndroidRadioUrl(href) {
    var url = new URL(href, window.location.href);
    url.searchParams.set("from", "android-app");
    url.searchParams.set("return", safeCurrentStudyUrl());
    return url.href;
  }

  function buildChromeIntent(httpsUrl) {
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

  function prepareAndroidChromeClick(anchor) {
    var oldHref = anchor.getAttribute("href");
    var oldTarget = anchor.getAttribute("target");
    var oldRel = anchor.getAttribute("rel");
    var radioUrl = buildAndroidRadioUrl(anchor.href);

    anchor.setAttribute("href", buildChromeIntent(radioUrl));
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noopener noreferrer");

    window.setTimeout(function () {
      try {
        if (oldHref == null) anchor.removeAttribute("href"); else anchor.setAttribute("href", oldHref);
        if (oldTarget == null) anchor.removeAttribute("target"); else anchor.setAttribute("target", oldTarget);
        if (oldRel == null) anchor.removeAttribute("rel"); else anchor.setAttribute("rel", oldRel);
      } catch (_) {}
    }, 250);
  }

  document.addEventListener("click", function (event) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

    var anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;
    if (!isRadioLink(anchor)) return;

    if (isInstalledAndroid()) {
      /* Keep the user's click as the actual navigation gesture. We stop site
         onclick handlers, but deliberately DO NOT prevent the anchor default. */
      prepareAndroidChromeClick(anchor);
      event.stopPropagation();
      event.stopImmediatePropagation();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    bindCurrentTabAsStudy();

    var player = null;
    try { player = window.open("", RADIO_WINDOW); } catch (_) {}
    if (player) {
      var alreadyRadio = false;
      try {
        alreadyRadio = player.location.origin === window.location.origin &&
          /\/music\.html$/i.test(player.location.pathname);
      } catch (_) {}
      if (!alreadyRadio) {
        try { player.location.href = anchor.href; } catch (_) {}
      }
      try { player.focus(); } catch (_) {}
      return;
    }
    window.location.href = anchor.href;
  }, true);
})();
'''

BROWSER_FLOW = r'''var EFP_STUDY_WINDOW='efpExamFusionStudy';
var EFP_ANDROID_APP_PACKAGE='com.examfusionprep.app';
var EFP_FROM_ANDROID_APP=false;
try{EFP_FROM_ANDROID_APP=new URLSearchParams(location.search).get('from')==='android-app'}catch(e){}

function efpAndroidReturnTarget(goHome){
  var fallback=location.origin+'/';
  if(goHome)return fallback;
  try{
    var raw=new URLSearchParams(location.search).get('return');
    if(!raw)return fallback;
    var target=new URL(raw,location.origin);
    if(target.origin!==location.origin)return fallback;
    if(/\/music\.html$/i.test(target.pathname))return fallback;
    return target.href;
  }catch(e){return fallback}
}

function efpAndroidAppIntent(targetUrl){
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
  }else say('Study tab open nahi ho paya. Browser me pop-ups/new tabs allow karke dobara try karo.',true);
}

function efpBrowserOpenStudyHome(){
  var study=efpFindStudyTab(true);
  if(study){
    say('ExamFusion Home study tab me khul gaya — Radio yahin chalta rahega.');
    try{if(typeof gtag==='function')gtag('event','radio_keep_playing',{mode:'browser_home_in_study_tab'})}catch(e){}
  }else say('ExamFusion Home open nahi ho paya. Browser me pop-ups/new tabs allow karke dobara try karo.',true);
}

function efpWireBrowserHomeTargets(){
  if(efpInstalledAndroid||EFP_FROM_ANDROID_APP)return;
  var homes=document.querySelectorAll('#efp-home-button, .efp-brand[href="/"], .efp-brand[href="/index.html"]');
  for(var i=0;i<homes.length;i++){
    try{
      homes[i].setAttribute('href','/');
      homes[i].setAttribute('target',EFP_STUDY_WINDOW);
      homes[i].setAttribute('data-efp-radio-home','1');
    }catch(e){}
  }
}

if(EFP_FROM_ANDROID_APP){
  if(efpKeepStudy)efpKeepStudy.textContent='↩ Return to Study';
  if(efpKeepStudyHint)efpKeepStudyHint.textContent='ExamFusion app par wapas jao; Radio browser me open rahega aur music chalta rahega.';
}else if(!efpInstalledAndroid){
  if(efpKeepStudy)efpKeepStudy.textContent='↩ Return to Study';
  if(efpKeepStudyHint)efpKeepStudyHint.textContent='Radio tab open rakho; Return to Study existing ExamFusion tab ko focus karega. Home bhi usi tab ko landing page par le jayega.';
  efpWireBrowserHomeTargets();
  try{
    var efpHomeObserver=new MutationObserver(function(){efpWireBrowserHomeTargets()});
    efpHomeObserver.observe(document.documentElement,{childList:true,subtree:true});
  }catch(e){}
}

if(efpKeepStudy)efpKeepStudy.onclick=function(){
  save();
  if(EFP_FROM_ANDROID_APP){efpOpenAndroidApp(false);return}
  if(efpInstalledAndroid){
    if(audio.paused){say('Pehle koi gaana Play karo, phir Keep Playing & Study dabao.',true);return}
    efpOpenStudyShell();return;
  }
  efpBrowserReturnToStudy();
};

document.addEventListener('click',function(e){
  if(!e.target||!e.target.closest)return;
  var home=e.target.closest('#efp-home-button, .efp-brand[href="/"], .efp-brand[href="/index.html"]');
  if(!home)return;
  if(EFP_FROM_ANDROID_APP){
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();save();efpOpenAndroidApp(true);return;
  }
  if(efpInstalledAndroid)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();save();efpBrowserOpenStudyHome();
},true);

document.addEventListener('click',function(e){
  if(!e.target||!e.target.closest)return;
  var b=e.target.closest('#efp-app-back-button');
  if(!b)return;
  if(EFP_FROM_ANDROID_APP){
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();save();efpOpenAndroidApp(false);return;
  }
  if(efpInstalledAndroid)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();save();efpBrowserReturnToStudy();
},true);
'''


def patch_music(text: str) -> str:
    pattern = re.compile(
        r"var EFP_STUDY_WINDOW='efpExamFusionStudy';\n.*?\nif\(efpStudyClose\)efpStudyClose\.onclick",
        re.S,
    )
    text2, n = pattern.subn(BROWSER_FLOW + "\nif(efpStudyClose)efpStudyClose.onclick", text, count=1)
    if n != 1:
        raise SystemExit("canonical music routing block not found")
    return text2


def patch_index(text: str) -> str:
    text2, n = re.subn(
        r'<script defer src="\./radio-launch\.js\?v=[^"]+"></script>',
        '<script defer src="./radio-launch.js?v=20260907v6"></script>',
        text,
        count=1,
    )
    if n != 1:
        raise SystemExit("index radio-launch tag not found")
    return text2


def patch_sw(text: str) -> str:
    text2, n = re.subn(
        r'const CACHE_VERSION = "efp-pwa-[^"]+";',
        'const CACHE_VERSION = "efp-pwa-2026-09-07-v49-radio-direct-intent";',
        text,
        count=1,
    )
    if n != 1:
        raise SystemExit("service worker cache marker not found")
    return text2


def write(path: Path, new: str) -> bool:
    old = path.read_text(encoding="utf-8")
    if old == new:return False
    path.write_text(new, encoding="utf-8", newline="\n")
    return True


def main():
    changed=[]
    if write(RADIO, RADIO_CONTENT):changed.append("radio-launch.js")
    if write(MUSIC, patch_music(MUSIC.read_text(encoding="utf-8"))):changed.append("music.html")
    if write(INDEX, patch_index(INDEX.read_text(encoding="utf-8"))):changed.append("index.html")
    if write(SW, patch_sw(SW.read_text(encoding="utf-8"))):changed.append("service-worker.js")
    print("Updated: "+(", ".join(changed) if changed else "nothing"))

if __name__ == "__main__":
    main()
