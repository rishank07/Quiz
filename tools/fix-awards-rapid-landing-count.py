#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "Current Affairs/Topic Names/Rapid Practice.html"
s = path.read_text(encoding="utf-8")

s = s.replace('<b>9,048</b><span>Total practice questions</span>', '<b>9,067</b><span>Total practice questions</span>')
s = s.replace("['2026-topic','Awards','पुरस्कार','Rapid Practice/2026/Topic Wise/Awards_2026_Current_Affairs_Rapid_Practice.html',331,12]", "['2026-topic','Awards','पुरस्कार','Rapid Practice/2026/Topic Wise/Awards_2026_Current_Affairs_Rapid_Practice.html',350,13]")

# Keep this robust if aggregate counts have changed around the Awards entry.
s = re.sub(
    r"(\['2026-topic','Awards','पुरस्कार','Rapid Practice/2026/Topic Wise/Awards_2026_Current_Affairs_Rapid_Practice\.html',)\d+,\d+(\])",
    r"\g<1>350,13\2",
    s,
)
# The aggregate count is also emitted as metadata by the count tool; mirror it in the visible hero.
s = re.sub(r'(<div class="hero-stats">.*?<div class="stat"><b>)\d{1,3}(?:,\d{3})*(</b><span>Total practice questions</span>)', r'\g<1>9,067\2', s, count=1, flags=re.S)

path.write_text(s, encoding="utf-8")
print("Rapid Practice landing synced: 9,067 total; Awards 350 Q / 13 sections")
