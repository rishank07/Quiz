#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
HOME_NAV = ROOT / "home-nav.js"
SERVICE_WORKER = ROOT / "service-worker.js"

LOADER_MARK = "EFP_APP_SESSION_LOADER"
LOADER = r'''

/* EFP_APP_SESSION_LOADER — installed-app resume + quiz answer persistence */
(function () {
  "use strict";
  if (typeof document === "undefined" || document.getElementById("efp-app-session-script")) return;
  var script = document.createElement("script");
  script.id = "efp-app-session-script";
  script.src = "/app-session.js?v=20260906resume1";
  script.async = false;
  (document.head || document.documentElement).appendChild(script);
})();
'''


def patch_home_nav():
    text = HOME_NAV.read_text(encoding="utf-8-sig")
    if LOADER_MARK not in text:
        text = text.rstrip() + LOADER
        HOME_NAV.write_text(text, encoding="utf-8")
        print("Added app-session loader to home-nav.js")
    else:
        print("home-nav.js app-session loader already current")


def patch_service_worker():
    text = SERVICE_WORKER.read_text(encoding="utf-8-sig")
    original = text
    text = re.sub(
        r'const CACHE_VERSION = "[^"]+";',
        'const CACHE_VERSION = "efp-pwa-2026-09-06-v31-session-restore";',
        text,
        count=1,
    )
    if '"/app-session.js"' not in text:
        marker = '  "/home-nav.js",\n'
        if marker not in text:
            raise SystemExit("home-nav APP_SHELL marker not found")
        text = text.replace(marker, marker + '  "/app-session.js",\n', 1)
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
