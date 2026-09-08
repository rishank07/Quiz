from pathlib import Path
import re

viewer = Path('Crux-Tricks/viewer-v2.js')
s = viewer.read_text(encoding='utf-8')

old_css = "html.efp-continuous-mobile-pdf .pdf-stage{height:100%!important;min-height:0!important;padding:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior-y:contain!important;-webkit-overflow-scrolling:touch!important;touch-action:pan-y pinch-zoom!important;background:#cdd3da!important}"
new_css = "html.efp-continuous-mobile-pdf .pdf-stage{height:100%!important;min-height:0!important;padding:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;overflow-y:auto!important;overflow-x:auto!important;overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important;touch-action:pan-x pan-y!important;background:#cdd3da!important}"
if old_css not in s:
    raise SystemExit('continuous stage CSS target not found')
s = s.replace(old_css, new_css, 1)

needle = "      'html.dark.efp-continuous-mobile-pdf .pdf-stage{background:#101318!important}',\n"
insert = "      'html.dark.efp-continuous-mobile-pdf .pdf-stage{background:#101318!important}',\n      'html.efp-pdf-zoomed .pdf-stage{overflow:auto!important;cursor:grab!important}',\n      'html.efp-pdf-dragging .pdf-stage{cursor:grabbing!important;user-select:none!important}',\n"
if needle not in s:
    raise SystemExit('style insert target not found')
s = s.replace(needle, insert, 1)

old_size = """  function currentTargetSize(ratio){
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
new_size = """  function currentTargetSize(ratio){
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
    if(!autoFit)width=width*zoom;
    width=Math.floor(width);
    return {width:width,height:Math.max(100,Math.floor(width*ratio))};
  }
"""
if old_size not in s:
    raise SystemExit('currentTargetSize target not found')
s = s.replace(old_size, new_size, 1)

old_zoom = """  zoomInBtn.addEventListener('click',function(){autoFit=false;zoom=Math.min(2.25,Math.round((zoom+.10)*100)/100);updateControls();if(continuous)reflowContinuous();else renderSinglePage()});
  zoomOutBtn.addEventListener('click',function(){autoFit=false;zoom=Math.max(.70,Math.round((zoom-.10)*100)/100);updateControls();if(continuous)reflowContinuous();else renderSinglePage()});
"""
new_zoom = """  function clampReaderZoom(v){return Math.max(.70,Math.min(3.00,Math.round(v*100)/100))}
  function applyReaderZoom(next,focusX,focusY){
    var oldZoom=autoFit?1:zoom;
    var oldLeft=pdfStage.scrollLeft||0,oldTop=pdfStage.scrollTop||0;
    focusX=Number.isFinite(focusX)?focusX:pdfStage.clientWidth/2;
    focusY=Number.isFinite(focusY)?focusY:pdfStage.clientHeight/2;
    autoFit=false;zoom=clampReaderZoom(next);
    document.documentElement.classList.add('efp-pdf-zoomed');
    updateControls();
    var scaleRatio=zoom/Math.max(.01,oldZoom);
    if(continuous)reflowContinuous();else renderSinglePage();
    setTimeout(function(){
      pdfStage.scrollLeft=Math.max(0,(oldLeft+focusX)*scaleRatio-focusX);
      pdfStage.scrollTop=Math.max(0,(oldTop+focusY)*scaleRatio-focusY);
    },120);
  }
  zoomInBtn.addEventListener('click',function(){applyReaderZoom((autoFit?1:zoom)+.10)});
  zoomOutBtn.addEventListener('click',function(){applyReaderZoom((autoFit?1:zoom)-.10)});
"""
if old_zoom not in s:
    raise SystemExit('zoom button target not found')
s = s.replace(old_zoom, new_zoom, 1)

anchor = "  favBtn.addEventListener('click',function(){var b=bms();"
if anchor not in s:
    raise SystemExit('gesture insertion anchor not found')

gestures = r"""
  var pinchStartDist=0,pinchStartZoom=1,pinchScale=1,pinchFocusX=0,pinchFocusY=0;
  function touchDistance(t){var dx=t[0].clientX-t[1].clientX,dy=t[0].clientY-t[1].clientY;return Math.sqrt(dx*dx+dy*dy)}
  function clearPinchPreview(){
    var target=continuous&&continuousRoot?continuousRoot:pdfCanvas;
    if(target){target.style.transform='';target.style.transformOrigin=''}
  }
  pdfStage.addEventListener('touchstart',function(e){
    if(e.touches.length!==2)return;
    pinchStartDist=touchDistance(e.touches);if(!pinchStartDist)return;
    pinchStartZoom=autoFit?1:zoom;pinchScale=1;
    var r=pdfStage.getBoundingClientRect();
    pinchFocusX=(e.touches[0].clientX+e.touches[1].clientX)/2-r.left;
    pinchFocusY=(e.touches[0].clientY+e.touches[1].clientY)/2-r.top;
    e.preventDefault();
  },{passive:false});
  pdfStage.addEventListener('touchmove',function(e){
    if(!pinchStartDist||e.touches.length!==2)return;
    e.preventDefault();
    pinchScale=Math.max(.45,Math.min(3.5,touchDistance(e.touches)/pinchStartDist));
    var target=continuous&&continuousRoot?continuousRoot:pdfCanvas;
    if(target){
      target.style.transformOrigin=(pdfStage.scrollLeft+pinchFocusX)+'px '+(pdfStage.scrollTop+pinchFocusY)+'px';
      target.style.transform='scale('+pinchScale+')';
    }
  },{passive:false});
  function finishPinch(e){
    if(!pinchStartDist||e.touches&&e.touches.length>=2)return;
    if(e&&e.cancelable)e.preventDefault();
    clearPinchPreview();
    var next=pinchStartZoom*pinchScale;
    pinchStartDist=0;pinchScale=1;
    applyReaderZoom(next,pinchFocusX,pinchFocusY);
  }
  pdfStage.addEventListener('touchend',finishPinch,{passive:false});
  pdfStage.addEventListener('touchcancel',finishPinch,{passive:false});

  var pendingWheelZoom=null,wheelZoomTimer=null,wheelFocusX=0,wheelFocusY=0;
  pdfStage.addEventListener('wheel',function(e){
    if(!(e.ctrlKey||e.metaKey))return;
    e.preventDefault();
    var base=pendingWheelZoom==null?(autoFit?1:zoom):pendingWheelZoom;
    pendingWheelZoom=clampReaderZoom(base*Math.exp(-e.deltaY*.003));
    var r=pdfStage.getBoundingClientRect();wheelFocusX=e.clientX-r.left;wheelFocusY=e.clientY-r.top;
    clearTimeout(wheelZoomTimer);wheelZoomTimer=setTimeout(function(){var z=pendingWheelZoom;pendingWheelZoom=null;applyReaderZoom(z,wheelFocusX,wheelFocusY)},70);
  },{passive:false});

  var dragPan=null;
  pdfStage.addEventListener('pointerdown',function(e){
    if(e.pointerType!=='mouse'||e.button!==0||autoFit)return;
    dragPan={x:e.clientX,y:e.clientY,left:pdfStage.scrollLeft,top:pdfStage.scrollTop};
    document.documentElement.classList.add('efp-pdf-dragging');
    try{pdfStage.setPointerCapture(e.pointerId)}catch(_){ }
    e.preventDefault();
  });
  pdfStage.addEventListener('pointermove',function(e){
    if(!dragPan)return;
    pdfStage.scrollLeft=dragPan.left-(e.clientX-dragPan.x);
    pdfStage.scrollTop=dragPan.top-(e.clientY-dragPan.y);
    e.preventDefault();
  });
  function finishDrag(e){if(!dragPan)return;dragPan=null;document.documentElement.classList.remove('efp-pdf-dragging');try{pdfStage.releasePointerCapture(e.pointerId)}catch(_){ }}
  pdfStage.addEventListener('pointerup',finishDrag);
  pdfStage.addEventListener('pointercancel',finishDrag);

"""
s = s.replace(anchor, gestures + anchor, 1)

viewer.write_text(s, encoding='utf-8')

html = Path('Crux-Tricks/viewer.html')
h = html.read_text(encoding='utf-8')
h, n = re.subn(r'viewer-v2\.js\?v=[A-Za-z0-9_-]+', 'viewer-v2.js?v=20260909zoompan1', h, count=1)
if n != 1:
    raise SystemExit('viewer cache-bust target not found')
html.write_text(h, encoding='utf-8')

sw = Path('service-worker.js')
w = sw.read_text(encoding='utf-8')
w, n = re.subn(r'const CACHE_VERSION = "[^"]+";', 'const CACHE_VERSION = "efp-pwa-2026-09-09-v91-pdf-zoom-pan";', w, count=1)
if n != 1:
    raise SystemExit('cache version target not found')
w, n = re.subn(r'/Crux-Tricks/viewer-v2\.js\?v=[A-Za-z0-9_-]+', '/Crux-Tricks/viewer-v2.js?v=20260909zoompan1', w, count=1)
if n != 1:
    raise SystemExit('service worker viewer asset target not found')
sw.write_text(w, encoding='utf-8')
