#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
HOME_NAV = ROOT / "home-nav.js"
SERVICE_WORKER = ROOT / "service-worker.js"

LOADER_MARK = "EFP_APP_SESSION_LOADER"
LOADER = r'''

/* EFP_APP_SESSION_LOADER — installed-app resume */
(function () {
  "use strict";
  if (typeof document === "undefined" || document.getElementById("efp-app-session-script")) return;
  var script = document.createElement("script");
  script.id = "efp-app-session-script";
  script.src = "/app-session.js?v=20260908answerreset2";
  script.async = false;
  (document.head || document.documentElement).appendChild(script);
})();
'''


def patch_home_nav():
    text = HOME_NAV.read_text(encoding="utf-8-sig")
    original = text
    if LOADER_MARK in text:
        text = text[:text.index("/* " + LOADER_MARK)].rstrip() + LOADER
    else:
        text = text.rstrip() + LOADER
    if text != original:
        HOME_NAV.write_text(text, encoding="utf-8")
        print("Updated app-session loader in home-nav.js")
    else:
        print("home-nav.js app-session loader already current")


def patch_service_worker():
    text = SERVICE_WORKER.read_text(encoding="utf-8-sig")
    original = text
    asset = '  "/app-session.js?v=20260908answerreset2",\n'
    pattern = r'^\s*"/app-session\.js(?:\?[^"\n]*)?",\s*$'
    if re.search(pattern, text, flags=re.MULTILINE):
        text = re.sub(pattern, asset.rstrip(), text, count=1, flags=re.MULTILINE)
    else:
        marker = re.search(r'^\s*"/home-nav\.js(?:\?[^"\n]*)?",\s*$', text, flags=re.MULTILINE)
        if not marker:
            raise SystemExit("home-nav APP_SHELL marker not found")
        text = text[:marker.end()] + "\n" + asset.rstrip() + text[marker.end():]
    if text != original:
        SERVICE_WORKER.write_text(text, encoding="utf-8")
        print("Updated service-worker.js for app-session asset")
    else:
        print("service-worker.js app-session asset already current")


def main():
    patch_home_nav()
    patch_service_worker()


if __name__ == "__main__":
    main()
