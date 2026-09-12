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

# Keep the hub source readable after the compact insertion anchor has done its job.
text = index_path.read_text(encoding="utf-8")
text = text.replace('</a></section><section class="features">', '</a>\n  </section>\n  <section class="features">', 1)
index_path.write_text(text, encoding="utf-8")
