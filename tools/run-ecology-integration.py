#!/usr/bin/env python3
from pathlib import Path
import runpy

root = Path(__file__).resolve().parents[1]
index_path = root / "Original Practice" / "index.html"
text = index_path.read_text(encoding="utf-8")

# The existing hub formats the end of the final subject card across lines,
# while the integrator intentionally uses a compact boundary anchor. Normalize
# only that boundary before running the idempotent integration script.
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
                index_path.write_text(text, encoding="utf-8")
                break
        else:
            raise RuntimeError("Could not locate Original Practice grid/features boundary")

runpy.run_path(str(root / "tools" / "integrate-ecology-original-practice.py"), run_name="__main__")
