from pathlib import Path
import re

viewer = Path('Crux-Tricks/viewer-v2.js')
s = viewer.read_text(encoding='utf-8')

old = """  function currentTargetSize(ratio){
    ratio=ratio||defaultRatio;
    var availW=Math.max(260,pdfStage.clientWidth-(devicePortrait()?8:2));
    var width=availW;
    if(!devicePortrait()){
      var availH=Math.max(180,pdfStage.clientHeight-4);
      var fitByHeight=Math.max(240,(availH*.995)/ratio);
      width=Math.min(availW,fitByHeight);
    }
    width=Math.floor(width);
    return {width:width,height:Math.max(100,Math.floor(width*ratio))};
  }
"""

new = """  function currentTargetSize(ratio){
    ratio=ratio||defaultRatio;
    var portraitDevice=devicePortrait();
    var availW=Math.max(260,pdfStage.clientWidth-(portraitDevice?8:2));
    var width=availW;
    if(!portraitDevice){
      var pageIsPortrait=ratio>1.03;
      if(pageIsPortrait){
        width=Math.max(260,availW*.96);
      }else{
        var availH=Math.max(180,pdfStage.clientHeight-4);
        var fitByHeight=Math.max(240,(availH*.995)/ratio);
        width=Math.min(availW,fitByHeight);
      }
    }
    width=Math.floor(width);
    return {width:width,height:Math.max(100,Math.floor(width*ratio))};
  }
"""

if old not in s:
    raise SystemExit('currentTargetSize target not found')

viewer.write_text(s.replace(old,new,1),encoding='utf-8')

html=Path('Crux-Tricks/viewer.html')
h=html.read_text(encoding='utf-8')
h,n=re.subn(r'viewer-v2\.js\?v=[A-Za-z0-9_-]+','viewer-v2.js?v=20260909portraitlandscape2',h,count=1)
if n!=1:
    raise SystemExit('viewer version target not found')
html.write_text(h,encoding='utf-8')

sw=Path('service-worker.js')
w=sw.read_text(encoding='utf-8')
w,n=re.subn(r'const CACHE_VERSION = "[^"]+";','const CACHE_VERSION = "efp-pwa-2026-09-09-v89-portrait-landscape-readable";',w,count=1)
if n!=1:
    raise SystemExit('cache version target not found')
w=re.sub(r'/Crux-Tricks/viewer-v2\.js\?v=[A-Za-z0-9_-]+','/Crux-Tricks/viewer-v2.js?v=20260909portraitlandscape2',w,count=1)
sw.write_text(w,encoding='utf-8')
