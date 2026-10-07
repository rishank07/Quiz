"""Install continuation reset hooks and fresh runtime URLs without touching banks."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
changed = []
rapid = list((ROOT / 'Current Affairs/Topic Names/Rapid Practice').rglob('*.html'))
rapid.append(ROOT / 'Current Affairs/Topic Names/Rapid Practice/2026/Topic Wise/rapid-runtime.js')
pattern = re.compile(r'(function resetAll\(\)\{if\(!confirm\([^\n;]*?\)\)return;)(?!if\(window\.EFP_QUIZ_CONTINUITY\))')
for file in rapid:
    source = file.read_text()
    result = pattern.sub(r'\1if(window.EFP_QUIZ_CONTINUITY)window.EFP_QUIZ_CONTINUITY.clear();', source)
    if result != source:
        file.write_text(result)
        changed.append(file.relative_to(ROOT))
for file in (ROOT / 'Original Practice').glob('*Complete_Practice.html'):
    source = file.read_text()
    result = re.sub(r'((?:original|english)-practice\.js)\?v=[^"\s]+', r'\1?v=20261007continue1', source)
    if result != source:
        file.write_text(result)
        changed.append(file.relative_to(ROOT))
file = ROOT / 'Crux-Tricks/viewer.html'
source = file.read_text()
result = re.sub(r'(viewer-v2\.js)\?v=[^"\s]+', r'\1?v=20261007continue1', source)
if result != source:
    file.write_text(result)
    changed.append(file.relative_to(ROOT))
# Catch missed runtime variants while leaving study data, IDs and counts intact.
for file in rapid:
    source = file.read_text()
    if 'function resetAll()' in source:
        assert re.search(r'function resetAll\(\)\{if\(!confirm\([^\n;]*?\)\)return;if\(window\.EFP_QUIZ_CONTINUITY\)window\.EFP_QUIZ_CONTINUITY\.clear\(\);', source), file
print(f'Quiz continuation: {len(changed)} files updated; all native reset hooks verified')
