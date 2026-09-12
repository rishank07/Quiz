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

# Complete Practice pages already share original-practice.js. Make that runtime
# guarantee the same global Home + Back controls used across ExamFusion Prep.
# Existing subjects that already load these scripts are left untouched, while
# Ecology (and any future standalone bank) receives them automatically.
runtime_path = practice / "original-practice.js"
runtime = runtime_path.read_text(encoding="utf-8")
nav_marker = "function ensureGlobalOriginalPracticeNavigation()"
if nav_marker not in runtime:
    anchor = "ensureSharedDarkMode();\n"
    if anchor not in runtime:
        raise RuntimeError("Original Practice dark-mode anchor missing")
    nav_loader = r'''
function ensureGlobalOriginalPracticeNavigation(){
 try{
  var defs=[
   {needle:"/home-nav.js",src:"/home-nav.js?v=20260909mobilecompact1"},
   {needle:"/back-parent-map.js",src:"/back-parent-map.js?v=20260912ecology1"},
   {needle:"/back-nav.js",src:"/back-nav.js?v=20260912ecology1"}
  ];
  function alreadyLoaded(needle){
   var scripts=document.scripts||[];
   for(var i=0;i<scripts.length;i++)if((scripts[i].src||"").indexOf(needle)>=0)return true;
   return false;
  }
  for(var i=0;i<defs.length;i++){
   if(alreadyLoaded(defs[i].needle))continue;
   var s=document.createElement("script");
   s.src=defs[i].src;
   s.async=false;
   (document.head||document.documentElement).appendChild(s);
  }
 }catch(e){}
}
ensureGlobalOriginalPracticeNavigation();
'''
    runtime = runtime.replace(anchor, anchor + "\n" + nav_loader + "\n", 1)
if nav_marker not in runtime or "/home-nav.js" not in runtime or "/back-nav.js" not in runtime:
    raise RuntimeError("Original Practice global navigation runtime patch failed")
runtime_path.write_text(runtime, encoding="utf-8")

# Force installed/PWA clients to pick up the corrected shared runtime instead
# of keeping the previous cached copy.
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