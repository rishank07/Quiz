from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding="utf-8")
    if new in text:
        print(f"{label}: already applied")
        return
    if old not in text:
        raise SystemExit(f"{label}: expected text not found in {path}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")
    print(f"{label}: applied")


# 1) The restore guard hid the whole Crux page while history was restoring.
# It knew source/subjects/parts/chapters/utility, but not the new Pinnacle
# "exam" level. Therefore Back from SSC subjects restored the Exam UI correctly
# underneath, yet the guard never released visibility, producing a blank dark page.
restore = ROOT / "Crux-Tricks" / "crux-restore-flash.js"
replace_once(
    restore,
    '''    if (state.level === "source") {\n      return visible("source") && !visible("material");\n    }\n    if (state.level === "subjects") {''',
    '''    if (state.level === "source") {\n      return visible("source") && !visible("material");\n    }\n    if (state.level === "exam") {\n      return visible("exam") && !visible("material") && !visible("source") && !visible("study");\n    }\n    if (state.level === "subjects") {''',
    "restore guard exam state",
)

# 2) Cache-bust the fixed restore helper in the Crux page.
index = ROOT / "Crux-Tricks" / "index.html"
replace_once(
    index,
    'crux-restore-flash.js?v=20260906flash2',
    'crux-restore-flash.js?v=20260917examback1',
    "Crux restore helper cache bust",
)

# 3) Add a direct logical-back fallback for the Exam pane. Normally the browser
# history bridge handles it first; this protects slow startup/older WebView cases.
back_nav = ROOT / "back-nav.js"
replace_once(
    back_nav,
    '''  /* Crux & Memory Tricks is a multi-step SPA inside one index.html:\n     Material -> Source -> Subject -> Part -> Chapter. Browser history cannot''',
    '''  /* Crux & Memory Tricks is a multi-step SPA inside one index.html:\n     Material -> Source -> Exam -> Subject -> Part -> Chapter. Browser history cannot''',
    "back-nav hierarchy comment",
)
replace_once(
    back_nav,
    '''    if (isVisibleByHiddenFlag("study")) {\n      consumeBackEvent(event);\n      return clickCruxControl("backSource");\n    }\n\n    if (isVisibleByHiddenFlag("source")) {''',
    '''    if (isVisibleByHiddenFlag("study")) {\n      consumeBackEvent(event);\n      return clickCruxControl("backSource");\n    }\n\n    if (isVisibleByHiddenFlag("exam")) {\n      consumeBackEvent(event);\n      return clickCruxControl("backExam");\n    }\n\n    if (isVisibleByHiddenFlag("source")) {''',
    "back-nav exam fallback",
)

# 4) Rotate PWA cache and pre-cache the corrected helper. Also force this helper
# network-first once the new service worker is active, so an old cached version
# cannot keep recreating the blank screen.
sw = ROOT / "service-worker.js"
replace_once(
    sw,
    '// v80 Crux Ecology + Pinnacle SSC library 20260917\nconst CACHE_VERSION = "efp-pwa-2026-09-17-v80-crux-eco-ssc";',
    '// v81 Crux Pinnacle exam-back blank-screen fix 20260917\nconst CACHE_VERSION = "efp-pwa-2026-09-17-v81-crux-exam-back";',
    "service worker cache version",
)
replace_once(
    sw,
    '''  "/Crux-Tricks/crux-search-route.js",\n  "/Crux-Tricks/crux-tricks.css",''',
    '''  "/Crux-Tricks/crux-search-route.js",\n  "/Crux-Tricks/crux-restore-flash.js?v=20260917examback1",\n  "/Crux-Tricks/crux-tricks.css",''',
    "precache restore helper",
)
replace_once(
    sw,
    '''  if (url.pathname === "/home-nav.js") {\n    event.respondWith(freshCoreAsset(request));\n    return;\n  }''',
    '''  if (url.pathname === "/home-nav.js" ||\n      url.pathname === "/Crux-Tricks/crux-restore-flash.js") {\n    event.respondWith(freshCoreAsset(request));\n    return;\n  }''',
    "fresh Crux restore helper",
)

print("Crux Pinnacle SSC exam-back fix complete.")
