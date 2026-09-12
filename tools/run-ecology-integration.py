#!/usr/bin/env python3
from pathlib import Path
import runpy

root = Path(__file__).resolve().parents[1]
practice = root / "Original Practice"

# Normalize only the exact layout boundaries that differ from the compact
# anchors used by the idempotent integrator. This preserves the live markup.
index_path = practice / "index.html"
text = index_path.read_text(encoding="utf-8")
text = text.replace(
    "across 163 chapters of History, Polity, Science, Geography and Economics for SSC, Railway, UPSC and BPSC.",
    "across 163 chapters of History, Polity, Science, Geography, Economics and Environment &amp; Ecology for SSC, Railway, UPSC and BPSC.",
)
if "Environment_Ecology_Complete_Practice.html" not in text:
    compact = '</a></section><section class="features">'
    if compact not in text:
        candidates = [
            '</a>\n  </section>\n  <section class="features">',
            '</a>\r\n  </section>\r\n  <section class="features">',
        ]
        for candidate in candidates:
            if candidate in text:
                text = text.replace(candidate, compact, 1)
                break
        else:
            raise RuntimeError("Could not locate Original Practice grid/features boundary")
index_path.write_text(text, encoding="utf-8")

mixed_path = practice / "Mixed_Practice.html"
mixed = mixed_path.read_text(encoding="utf-8")
mixed = mixed.replace(
    "Choose History, Polity, Science, Geography, Economics or specific subject groups",
    "Choose History, Polity, Science, Geography, Economics, Environment &amp; Ecology or specific subject groups",
)
if "ecology:'Environment_Ecology_Complete_Practice.html'" not in mixed:
    old = "economics:'Economics_Complete_Practice.html'}"
    new = "economics:'Economics_Complete_Practice.html',ecology:'Environment_Ecology_Complete_Practice.html'}"
    if old not in mixed:
        raise RuntimeError("Could not locate Mixed Practice FILES economics boundary")
    mixed = mixed.replace(old, new, 1)
mixed_path.write_text(mixed, encoding="utf-8")

runpy.run_path(str(root / "tools" / "integrate-ecology-original-practice.py"), run_name="__main__")

# Ecology was originally a standalone generated HTML file, so it did not load
# the site's global navigation scripts. Without these, Home is missing and the
# Back control falls back to the legacy placement from black-mode.js.
ecology_path = practice / "Environment_Ecology_Complete_Practice.html"
ecology = ecology_path.read_text(encoding="utf-8")
nav_scripts = [
    ('/home-nav.js', '<script defer src="/home-nav.js?v=20260909mobilecompact1"></script>'),
    ('/back-parent-map.js', '<script defer src="/back-parent-map.js?v=20260912ecology1"></script>'),
    ('/back-nav.js', '<script defer src="/back-nav.js?v=20260912ecology1"></script>'),
]
missing_nav = [tag for needle, tag in nav_scripts if needle not in ecology]
if missing_nav:
    if '</head>' not in ecology:
        raise RuntimeError("Ecology HTML closing head tag missing")
    block = '\n<!-- ExamFusion global Home + Back controls -->\n' + '\n'.join(missing_nav) + '\n'
    ecology = ecology.replace('</head>', block + '</head>', 1)
if not all(needle in ecology for needle, _ in nav_scripts):
    raise RuntimeError("Ecology global navigation patch failed")
ecology_path.write_text(ecology, encoding="utf-8")

# Force installed/PWA clients to pick up the corrected Ecology HTML instead of
# keeping the previous cached copy with the missing Home navigation.
sw_path = root / "service-worker.js"
sw = sw_path.read_text(encoding="utf-8")
sw = sw.replace(
    'const CACHE_VERSION = "efp-pwa-2026-09-12-v69-ecology-original-practice";',
    'const CACHE_VERSION = "efp-pwa-2026-09-12-v70-ecology-nav-fix";',
)
sw_path.write_text(sw, encoding="utf-8")

# Keep the hub source readable after the compact insertion anchor has done its job.
text = index_path.read_text(encoding="utf-8")
text = text.replace('</a></section><section class="features">', '</a>\n  </section>\n  <section class="features">', 1)
index_path.write_text(text, encoding="utf-8")