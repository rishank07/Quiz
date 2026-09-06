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

RADIO_BRAND_CSS = '''
/* ExamFusion Prep brand header */
.efp-brand{display:flex;align-items:center;justify-content:center;gap:11px;width:max-content;max-width:100%;margin:0 auto 4px;padding:7px 11px;border-radius:16px;text-decoration:none;color:var(--text);border:1px solid rgba(245,179,1,.14);background:rgba(255,255,255,.025)}
.efp-brand img{width:48px;height:48px;object-fit:cover;border-radius:13px;box-shadow:0 8px 22px rgba(0,0,0,.28)}
.efp-brand-copy{text-align:left;min-width:0}.efp-brand-name{font-size:17px;font-weight:850;line-height:1.15;letter-spacing:.01em}.efp-brand-tag{margin-top:3px;color:var(--muted);font-size:10.5px;letter-spacing:.055em;white-space:nowrap}
@media(max-width:390px){.efp-brand img{width:43px;height:43px}.efp-brand-name{font-size:15.5px}.efp-brand-tag{font-size:9.7px}}
'''
RADIO_BRAND_HTML = '''  <a class="efp-brand" href="/" aria-label="ExamFusion Prep home">
    <img src="./logo.png" alt="ExamFusion Prep logo">
    <div class="efp-brand-copy">
      <div class="efp-brand-name">ExamFusion Prep</div>
      <div class="efp-brand-tag">STUDY • PRACTICE • REVISE</div>
    </div>
  </a>
'''
OLD_RADIO_SUB = '    <p class="sub">Purane filmi gaane, seedha Internet Archive se. Search, shuffle, repeat aur seek — bina YouTube embed player ke.</p>'
NEW_RADIO_SUB = '    <p class="sub">Purane filmi gaane — search, shuffle, repeat aur seek ke saath.</p>'

RADIO_STUDY_CSS = '''
/* Keep-playing browser + installed-app study mode */
.efp-continuity{margin-top:14px;text-align:center}.efp-continuity-btn{width:100%;border:1px solid rgba(245,179,1,.45);background:linear-gradient(135deg,rgba(245,179,1,.18),rgba(62,166,255,.10));color:var(--text);border-radius:13px;padding:12px 14px;font:inherit;font-size:13.5px;font-weight:800;cursor:pointer;box-shadow:0 9px 24px rgba(0,0,0,.18)}.efp-continuity-btn:active{transform:scale(.985)}.efp-continuity-hint{margin-top:7px;color:var(--muted);font-size:10.8px;line-height:1.45}
html.efp-study-open,html.efp-study-open body{overflow:hidden!important}.efp-study-shell{position:fixed;inset:0;z-index:2147483000;background:#070a13;display:flex;flex-direction:column}.efp-study-shell[hidden]{display:none!important}.efp-study-top{flex:0 0 auto;display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;gap:8px;align-items:center;padding:max(8px,env(safe-area-inset-top)) 9px 8px;background:#0b1120;border-bottom:1px solid #1f2a44;box-shadow:0 6px 20px rgba(0,0,0,.28)}.efp-study-back,.efp-study-mini{border:1px solid #29364f;background:#111827;color:#e8ecf6;border-radius:10px;min-height:40px;padding:0 11px;font:inherit;font-weight:750;cursor:pointer}.efp-study-mini{width:42px;padding:0;font-size:16px}.efp-study-copy{min-width:0}.efp-study-copy strong{display:block;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.efp-study-copy span{display:block;margin-top:2px;color:#94a3c4;font-size:9.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.efp-study-frame{display:block;flex:1 1 auto;width:100%;min-height:0;border:0;background:#070a13}
@media(max-width:390px){.efp-study-top{grid-template-columns:auto minmax(0,1fr) 38px 38px;gap:5px;padding-left:6px;padding-right:6px}.efp-study-back{padding:0 8px;font-size:11.5px}.efp-study-mini{width:38px}.efp-study-copy strong{font-size:11.5px}}
'''
RADIO_STUDY_BUTTON = '''    <div class="efp-continuity" id="efpContinuity">
      <button class="efp-continuity-btn" id="efpKeepStudy" type="button">🎧 Keep Playing &amp; Study</button>
      <div class="efp-continuity-hint" id="efpKeepStudyHint">Music yahin chalta rahega; ExamFusion study ek new tab me khulega.</div>
    </div>
'''
RADIO_STUDY_SHELL = '''<div class="efp-study-shell" id="efpStudyShell" hidden>
  <div class="efp-study-top">
    <button class="efp-study-back" id="efpStudyClose" type="button">‹ Radio</button>
    <div class="efp-study-copy"><strong id="efpStudyNow">Retro Radio</strong><span>Music keeps playing while you study</span></div>
    <button class="efp-study-mini" id="efpStudyPlay" type="button" aria-label="Play or pause">⏸</button>
    <button class="efp-study-mini" id="efpStudyNext" type="button" aria-label="Next song">⏭</button>
  </div>
  <iframe class="efp-study-frame" id="efpStudyFrame" title="ExamFusion Prep Study Mode" src="about:blank"></iframe>
</div>
'''
RADIO_STUDY_JS = r'''
function efpIsInstalledAndroid(){
  var isAndroid=/Android/i.test(navigator.userAgent||'');
  var standalone=false;try{standalone=window.matchMedia('(display-mode: standalone)').matches}catch(e){}
  var twa=/^android-app:\/\//i.test(document.referrer||'');
  return isAndroid&&(standalone||twa);
}
var efpKeepStudy=document.getElementById('efpKeepStudy'),efpKeepStudyHint=document.getElementById('efpKeepStudyHint'),efpStudyShell=document.getElementById('efpStudyShell'),efpStudyFrame=document.getElementById('efpStudyFrame'),efpStudyClose=document.getElementById('efpStudyClose'),efpStudyPlay=document.getElementById('efpStudyPlay'),efpStudyNext=document.getElementById('efpStudyNext'),efpStudyNow=document.getElementById('efpStudyNow');
var efpInstalledAndroid=efpIsInstalledAndroid();
function efpSyncStudyBar(){if(efpStudyNow)efpStudyNow.textContent=(title&&title.textContent)||'Retro Radio';if(efpStudyPlay)efpStudyPlay.textContent=audio.paused?'▶':'⏸'}
function efpOpenStudyShell(){
  if(!efpStudyShell||!efpStudyFrame)return;
  if(efpStudyFrame.getAttribute('src')==='about:blank')efpStudyFrame.src='/';
  efpStudyShell.hidden=false;document.documentElement.classList.add('efp-study-open');efpSyncStudyBar();
  try{if(typeof gtag==='function')gtag('event','radio_keep_playing',{mode:'android_study_shell'})}catch(e){}
}
function efpCloseStudyShell(){if(!efpStudyShell)return;efpStudyShell.hidden=true;document.documentElement.classList.remove('efp-study-open');}
if(efpInstalledAndroid){
  if(efpKeepStudy)efpKeepStudy.textContent='🎵 Keep Playing & Study in App';
  if(efpKeepStudyHint)efpKeepStudyHint.textContent='Quiz, Crux aur Current Affairs isi app ke Study Mode me khulenge; Radio unload nahi hoga.';
}
if(efpKeepStudy)efpKeepStudy.onclick=function(){
  if(audio.paused){say('Pehle koi gaana Play karo, phir Keep Playing & Study dabao.',true);return}
  save();
  if(efpInstalledAndroid){efpOpenStudyShell();return}
  var w=null;try{w=window.open('/','_blank')}catch(e){}
  if(w){try{w.opener=null;w.focus()}catch(e){}say('Music yahin chalta rahega — study new tab me khul gaya.');try{if(typeof gtag==='function')gtag('event','radio_keep_playing',{mode:'browser_new_tab'})}catch(e){}}
  else say('New tab block ho gaya. Browser me pop-ups/new tabs allow karke dobara try karo.',true);
};
if(efpStudyClose)efpStudyClose.onclick=efpCloseStudyShell;
if(efpStudyPlay)efpStudyPlay.onclick=function(){if(audio.paused)audio.play().catch(function(){});else audio.pause();efpSyncStudyBar()};
if(efpStudyNext)efpStudyNext.onclick=function(){step(1);setTimeout(efpSyncStudyBar,120)};
audio.addEventListener('playing',efpSyncStudyBar);audio.addEventListener('pause',efpSyncStudyBar);audio.addEventListener('loadedmetadata',efpSyncStudyBar);
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
    if GA_ID not in text:
        favicon = '<link rel="icon" type="image/png" href="./favicon.png">\n'
        if favicon in text:
            text = text.replace(favicon, favicon + GA_SNIPPET, 1)
        elif "</head>" in text:
            text = text.replace("</head>", GA_SNIPPET + "</head>", 1)
        else:
            raise SystemExit("Could not find a safe GA insertion point in music.html")

    css = ""
    if ".efp-brand{" not in text:
        css += RADIO_BRAND_CSS
    if ".efp-continuity{" not in text:
        css += RADIO_STUDY_CSS
    if css:
        if "</style>" not in text:
            raise SystemExit("Could not find Retro Radio style block")
        text = text.replace("</style>", css + "</style>", 1)

    text = text.replace(OLD_RADIO_SUB, NEW_RADIO_SUB, 1)

    if 'class="efp-brand"' not in text:
        anchor = '<main class="wrap">\n'
        if anchor not in text:
            raise SystemExit("Could not find Retro Radio main wrapper")
        text = text.replace(anchor, anchor + RADIO_BRAND_HTML, 1)

    if 'id="efpKeepStudy"' not in text:
        anchor = '    <div class="status" id="status">Fetching track list…</div>\n'
        if anchor not in text:
            raise SystemExit("Could not find Retro Radio status block")
        text = text.replace(anchor, anchor + RADIO_STUDY_BUTTON, 1)

    if 'id="efpStudyShell"' not in text:
        anchor = '<audio id="audio" preload="metadata"></audio>\n'
        if anchor not in text:
            raise SystemExit("Could not find Retro Radio audio element")
        text = text.replace(anchor, anchor + RADIO_STUDY_SHELL, 1)

    if 'function efpIsInstalledAndroid()' not in text:
        anchor = "var restoreKey=(saved.collection&&COLLECTIONS.some(function(c){return c.key===saved.collection}))?saved.collection:COLLECTIONS[0].key;"
        if anchor not in text:
            raise SystemExit("Could not find Retro Radio restore anchor")
        text = text.replace(anchor, RADIO_STUDY_JS + "\n" + anchor, 1)
    return text


def patch_sw(text: str) -> str:
    text, n = re.subn(
        r'const CACHE_VERSION = "efp-pwa-[^"]+";',
        'const CACHE_VERSION = "efp-pwa-2026-09-07-v40-radio-study-mode";',
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
