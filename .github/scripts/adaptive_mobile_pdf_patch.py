from pathlib import Path
import re

viewer = Path('Crux-Tricks/viewer-v2.js')
s = viewer.read_text(encoding='utf-8')

old_choose = """  function chooseReaderAfterLoad(){
    return pdfDoc.getPage(page).then(function(pg){
      var b=pg.getViewport({scale:1});
      var landscape=b.width>b.height*1.03;
      lastPageLandscape=landscape;
      if(isCompactReader()&&landscape){buildContinuous(pg)}else{disableContinuous();renderSinglePage()}
    });
  }
"""
new_choose = """  function chooseReaderAfterLoad(){
    return pdfDoc.getPage(page).then(function(pg){
      var b=pg.getViewport({scale:1});
      var landscape=b.width>b.height*1.03;
      lastPageLandscape=landscape;
      document.documentElement.classList.toggle('efp-landscape-page',landscape);
      document.documentElement.classList.toggle('efp-portrait-page',!landscape);
      if(isCompactReader())buildContinuous(pg);else{disableContinuous();renderSinglePage()}
    });
  }
"""
if old_choose not in s:
    raise SystemExit('chooseReaderAfterLoad target not found')
s = s.replace(old_choose, new_choose, 1)

old_refit = """      pdfDoc.getPage(page).then(function(pg){var b=pg.getViewport({scale:1}),landscape=b.width>b.height*1.03;if(mobileReader&&landscape){if(!continuous)buildContinuous(pg);else reflowContinuous()}else{if(continuous)disableContinuous();renderSinglePage()}});
"""
new_refit = """      pdfDoc.getPage(page).then(function(pg){
        var b=pg.getViewport({scale:1}),landscape=b.width>b.height*1.03;
        lastPageLandscape=landscape;
        document.documentElement.classList.toggle('efp-landscape-page',landscape);
        document.documentElement.classList.toggle('efp-portrait-page',!landscape);
        if(mobileReader){if(!continuous)buildContinuous(pg);else reflowContinuous()}else{if(continuous)disableContinuous();renderSinglePage()}
      });
"""
if old_refit not in s:
    raise SystemExit('refit target not found')
s = s.replace(old_refit, new_refit, 1)

viewer.write_text(s, encoding='utf-8')

html = Path('Crux-Tricks/viewer.html')
h = html.read_text(encoding='utf-8')
h, n = re.subn(r'viewer-v2\.js\?v=[A-Za-z0-9_-]+', 'viewer-v2.js?v=20260909adaptiveall1', h, count=1)
if n != 1:
    raise SystemExit('viewer script version not found')
html.write_text(h, encoding='utf-8')

sw = Path('service-worker.js')
w = sw.read_text(encoding='utf-8')
w, n = re.subn(r'const CACHE_VERSION = "[^"]+";', 'const CACHE_VERSION = "efp-pwa-2026-09-09-v88-pdf-adaptive-all";', w, count=1)
if n != 1:
    raise SystemExit('CACHE_VERSION not found')
w, n2 = re.subn(r'/Crux-Tricks/viewer-v2\.js\?v=[A-Za-z0-9_-]+', '/Crux-Tricks/viewer-v2.js?v=20260909adaptiveall1', w, count=1)
if n2 != 1:
    raise SystemExit('service worker viewer asset not found')
sw.write_text(w, encoding='utf-8')
