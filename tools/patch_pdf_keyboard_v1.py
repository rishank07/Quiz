from pathlib import Path

viewer = Path('Crux-Tricks/viewer-v2.js')
html = Path('Crux-Tricks/viewer.html')
sw = Path('service-worker.js')

text = viewer.read_text(encoding='utf-8')
anchor = """  zoomInBtn.addEventListener('click',function(){applyReaderZoom((autoFit?1:zoom)+.10)});\n  zoomOutBtn.addEventListener('click',function(){applyReaderZoom((autoFit?1:zoom)-.10)});\n\n  var pinchStartDist=0,pinchStartZoom=1,pinchScale=1,pinchFocusX=0,pinchFocusY=0;\n"""
replacement = """  zoomInBtn.addEventListener('click',function(){applyReaderZoom((autoFit?1:zoom)+.10)});\n  zoomOutBtn.addEventListener('click',function(){applyReaderZoom((autoFit?1:zoom)-.10)});\n\n  function resetReaderFit(){\n    autoFit=true;zoom=1;\n    document.documentElement.classList.remove('efp-pdf-zoomed');\n    updateControls();\n    if(continuous)reflowContinuous();else renderSinglePage();\n    setTimeout(function(){pdfStage.scrollLeft=0},120);\n  }\n  function keyboardTargetIsEditable(target){\n    if(!target||!target.closest)return false;\n    return !!target.closest('input,textarea,select,button,a,[contenteditable=\\"true\\"],[role=\\"textbox\\"]');\n  }\n  function handleReaderKeyboard(e){\n    if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||keyboardTargetIsEditable(e.target))return;\n    var key=e.key;\n    var max=pdfDoc?pdfDoc.numPages:doc.pages;\n    if(key==='ArrowRight'||key==='PageDown'||(key===' '&&!e.shiftKey)){e.preventDefault();go(page+1,true);return;}\n    if(key==='ArrowLeft'||key==='PageUp'||(key===' '&&e.shiftKey)){e.preventDefault();go(page-1,true);return;}\n    if(key==='+'||key==='='){e.preventDefault();applyReaderZoom((autoFit?1:zoom)+.10);return;}\n    if(key==='-'||key==='_'){e.preventDefault();applyReaderZoom((autoFit?1:zoom)-.10);return;}\n    if(key==='0'||key==='f'||key==='F'){e.preventDefault();resetReaderFit();return;}\n    if(key==='Home'){e.preventDefault();go(1,true);return;}\n    if(key==='End'){e.preventDefault();go(max,true);return;}\n    if(key==='b'||key==='B'){if(e.repeat)return;e.preventDefault();bookmarkPage.click();return;}\n    if(key==='g'||key==='G'){if(e.repeat)return;e.preventDefault();input.focus();input.select();return;}\n    if(key==='/'){if(e.repeat)return;e.preventDefault();if(docSearch&&!docSearch.disabled){docSearch.focus();docSearch.select();}return;}\n    if(key==='?'){if(e.repeat)return;e.preventDefault();toast('←/→ page · +/- zoom · 0/F fit · B bookmark · G page · / search');}\n  }\n  document.addEventListener('keydown',handleReaderKeyboard);\n\n  var pinchStartDist=0,pinchStartZoom=1,pinchScale=1,pinchFocusX=0,pinchFocusY=0;\n"""
if anchor not in text:
    raise SystemExit('viewer keyboard anchor not found')
text = text.replace(anchor, replacement, 1)
viewer.write_text(text, encoding='utf-8')

h = html.read_text(encoding='utf-8')
old = 'viewer-v2.js?v=20260909zoompan1'
new = 'viewer-v2.js?v=20260909keyboard1'
if old not in h:
    raise SystemExit('viewer.html cache-bust anchor not found')
h = h.replace(old, new, 1)
html.write_text(h, encoding='utf-8')

s = sw.read_text(encoding='utf-8')
old_ver = 'efp-pwa-2026-09-09-v91-pdf-zoom-pan'
new_ver = 'efp-pwa-2026-09-09-v92-pdf-keyboard'
if old_ver not in s:
    raise SystemExit('service worker version anchor not found')
s = s.replace(old_ver, new_ver, 1)
s = s.replace('/Crux-Tricks/viewer-v2.js?v=20260909zoompan1', '/Crux-Tricks/viewer-v2.js?v=20260909keyboard1', 1)
sw.write_text(s, encoding='utf-8')
