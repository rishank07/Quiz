#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "Crux-Tricks" / "index.html"

GUARD = (
    '<style id="efp-crux-restore-guard">'
    'html.efp-crux-restoring{background:#0f172a}'
    'html.efp-crux-restoring body{visibility:hidden!important}'
    '.topbar>.home-btn{display:none!important}'
    '</style>'
    '<script id="efp-crux-restore-guard-init">'
    '(function(){'
    'function managed(s){return !!(s&&s.efpCruxNav===true&&s.level&&s.level!=="material")}'
    'try{if(managed(history.state))document.documentElement.classList.add("efp-crux-restoring")}catch(e){}'
    'window.addEventListener("popstate",function(e){if(managed(e.state))document.documentElement.classList.add("efp-crux-restoring")},true);'
    'setTimeout(function(){document.documentElement.classList.remove("efp-crux-restoring")},2500);'
    '})();'
    '</script>'
)

FLASH_SCRIPT = '<script src="crux-restore-flash.js?v=20260906flash1"></script>'

text = PATH.read_text(encoding="utf-8-sig")
original = text

if 'id="efp-crux-restore-guard"' not in text:
    marker = '<meta name="theme-color" content="#0f172a">'
    if marker not in text:
        raise SystemExit("theme-color marker not found")
    text = text.replace(marker, marker + GUARD, 1)

if 'crux-restore-flash.js' not in text:
    pattern = re.compile(r'(<script src="crux-search-route\.js\?v=[^"]+"></script>)')
    text, count = pattern.subn(r'\1' + FLASH_SCRIPT, text, count=1)
    if count != 1:
        raise SystemExit("crux-search-route script marker not found")

if text != original:
    PATH.write_text(text, encoding="utf-8")
    print("Updated Crux-Tricks/index.html")
else:
    print("Crux restore flash guard already current")
