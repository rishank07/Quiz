from pathlib import Path

p=Path('Crux-Tricks/viewer-v2.js')
s=p.read_text(encoding='utf-8')
old="""    if(key==='ArrowRight'||key==='PageDown'||(key===' '&&!e.shiftKey)){e.preventDefault();go(page+1,true);return;}\n    if(key==='ArrowLeft'||key==='PageUp'||(key===' '&&e.shiftKey)){e.preventDefault();go(page-1,true);return;}\n    if(key==='+'||key==='='){e.preventDefault();applyReaderZoom(steppedReaderZoom(1));return;}\n"""
new="""    if(key==='ArrowRight'||key==='PageDown'||(key===' '&&!e.shiftKey)){e.preventDefault();go(page+1,true);return;}\n    if(key==='ArrowLeft'||key==='PageUp'||(key===' '&&e.shiftKey)){e.preventDefault();go(page-1,true);return;}\n    if(key==='ArrowDown'){e.preventDefault();pdfStage.scrollBy({top:Math.max(72,Math.round(pdfStage.clientHeight*.12)),left:0,behavior:'auto'});return;}\n    if(key==='ArrowUp'){e.preventDefault();pdfStage.scrollBy({top:-Math.max(72,Math.round(pdfStage.clientHeight*.12)),left:0,behavior:'auto'});return;}\n    if(key==='+'||key==='='){e.preventDefault();applyReaderZoom(steppedReaderZoom(1));return;}\n"""
if old not in s:
    raise SystemExit('keyboard anchor not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

p=Path('Crux-Tricks/viewer.html')
s=p.read_text(encoding='utf-8')
s=s.replace('viewer-v2.js?v=20260909zoomstep1','viewer-v2.js?v=20260909arrowscroll1')
p.write_text(s,encoding='utf-8')

p=Path('service-worker.js')
s=p.read_text(encoding='utf-8')
s=s.replace('efp-pwa-2026-09-09-v93-pdf-zoom-step','efp-pwa-2026-09-09-v94-pdf-arrow-scroll')
s=s.replace('/Crux-Tricks/viewer-v2.js?v=20260909zoomstep1','/Crux-Tricks/viewer-v2.js?v=20260909arrowscroll1')
p.write_text(s,encoding='utf-8')
