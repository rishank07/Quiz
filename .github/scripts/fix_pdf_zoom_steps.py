from pathlib import Path

viewer = Path('Crux-Tricks/viewer-v2.js')
text = viewer.read_text(encoding='utf-8')
old = "  zoomInBtn.addEventListener('click',function(){applyReaderZoom((autoFit?1:zoom)+.10)});\n  zoomOutBtn.addEventListener('click',function(){applyReaderZoom((autoFit?1:zoom)-.10)});"
new = "  function steppedReaderZoom(direction){\n    var current=Math.round((autoFit?1:zoom)*100);\n    var next;\n    if(direction>0)next=current%10===0?current+10:Math.ceil(current/10)*10;\n    else next=current%10===0?current-10:Math.floor(current/10)*10;\n    return clampReaderZoom(next/100);\n  }\n  zoomInBtn.addEventListener('click',function(){applyReaderZoom(steppedReaderZoom(1))});\n  zoomOutBtn.addEventListener('click',function(){applyReaderZoom(steppedReaderZoom(-1))});"
if old not in text:
    raise SystemExit('button zoom block not found')
text = text.replace(old, new, 1)
old_k = "    if(key==='+'||key==='='){e.preventDefault();applyReaderZoom((autoFit?1:zoom)+.10);return;}\n    if(key==='-'||key==='_'){e.preventDefault();applyReaderZoom((autoFit?1:zoom)-.10);return;}"
new_k = "    if(key==='+'||key==='='){e.preventDefault();applyReaderZoom(steppedReaderZoom(1));return;}\n    if(key==='-'||key==='_'){e.preventDefault();applyReaderZoom(steppedReaderZoom(-1));return;}"
if old_k not in text:
    raise SystemExit('keyboard zoom block not found')
text = text.replace(old_k, new_k, 1)
viewer.write_text(text, encoding='utf-8')

html = Path('Crux-Tricks/viewer.html')
h = html.read_text(encoding='utf-8')
if 'viewer-v2.js?v=20260909keyboard1' not in h:
    raise SystemExit('viewer cache token not found')
h = h.replace('viewer-v2.js?v=20260909keyboard1', 'viewer-v2.js?v=20260909zoomstep1', 1)
html.write_text(h, encoding='utf-8')

sw = Path('service-worker.js')
s = sw.read_text(encoding='utf-8')
if 'efp-pwa-2026-09-09-v92-pdf-keyboard' not in s:
    raise SystemExit('service worker version not found')
s = s.replace('efp-pwa-2026-09-09-v92-pdf-keyboard', 'efp-pwa-2026-09-09-v93-pdf-zoom-step', 1)
if '/Crux-Tricks/viewer-v2.js?v=20260909keyboard1' not in s:
    raise SystemExit('service worker viewer token not found')
s = s.replace('/Crux-Tricks/viewer-v2.js?v=20260909keyboard1', '/Crux-Tricks/viewer-v2.js?v=20260909zoomstep1', 1)
sw.write_text(s, encoding='utf-8')
