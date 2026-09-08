from pathlib import Path

viewer = Path('Crux-Tricks/viewer-v2.js')
s = viewer.read_text(encoding='utf-8')

def rep(old, new, label):
    global s
    if old not in s:
        raise SystemExit(f'anchor not found: {label}')
    s = s.replace(old, new, 1)

rep(
"  function devicePortrait(){return window.innerHeight>=window.innerWidth;}\n",
"""  function devicePortrait(){
    var mq=window.matchMedia;
    if(mq){try{return mq('(orientation: portrait)').matches}catch(e){}}
    return window.innerHeight>=window.innerWidth;
  }
""",
'device orientation'
)

rep(
"""  var searchQuery='';
  var activeSearchPage=0;
  var searchFocusPending=false;
  var searchGeneration=0;
""",
"""  var searchQuery='';
  var activeSearchPage=0;
  var searchFocusPending=false;
  var searchGeneration=0;
  var programmaticScrollUntil=0;
  var searchHighlightKeepUntil=0;
""",
'search state vars'
)

rep(
"""  function clearSearchHighlightLayers(){
    var layers=document.querySelectorAll('.efp-search-layer');
    for(var i=0;i<layers.length;i++)layers[i].remove();
  }
  function matchedTextItemIndexes(items,q){
    var normalized=[],matched={};
    for(var i=0;i<items.length;i++){
      var text=normalizeSearchText(items[i]&&items[i].str);normalized.push(text);
      if(text&&text.indexOf(q)>=0)matched[i]=true;
    }
    if(q.indexOf(' ')>=0){
      for(var start=0;start<normalized.length;start++){
        if(!normalized[start])continue;
        var combined='';
        for(var end=start;end<normalized.length&&end<start+8;end++){
          if(!normalized[end])continue;
          combined=(combined+' '+normalized[end]).trim();
          if(combined.indexOf(q)>=0){for(var k=start;k<=end;k++)if(normalized[k])matched[k]=true;break}
          if(combined.length>Math.max(120,q.length*4))break;
        }
      }
    }
    return matched;
  }
""",
"""  function clearSearchHighlightLayers(){
    var layers=document.querySelectorAll('.efp-search-layer');
    for(var i=0;i<layers.length;i++)layers[i].remove();
  }
  function clearSearchHighlightState(keepQuery){
    activeSearchPage=0;searchFocusPending=false;searchGeneration++;searchHighlightKeepUntil=0;clearSearchHighlightLayers();
    if(!keepQuery)searchQuery='';
  }
  function addSearchRange(out,index,start,end){
    start=Math.max(0,Math.min(1,start));end=Math.max(start,Math.min(1,end));if(end<=start)return;
    if(!out[index])out[index]=[];out[index].push({start:start,end:end});
  }
  function matchedTextRanges(items,q){
    var normalized=[],matched={};
    for(var i=0;i<items.length;i++){
      var raw=String(items[i]&&items[i].str||'');
      var lower=raw.toLowerCase();
      normalized.push(normalizeSearchText(raw));
      if(!raw||!q)continue;
      var from=0,pos=-1,found=false,denom=Math.max(1,raw.length);
      while((pos=lower.indexOf(q,from))>=0){
        addSearchRange(matched,i,pos/denom,(pos+q.length)/denom);found=true;from=pos+Math.max(1,q.length);
      }
      if(!found&&normalizeSearchText(raw)===q)addSearchRange(matched,i,0,1);
    }
    if(q.indexOf(' ')>=0){
      for(var start=0;start<normalized.length;start++){
        if(!normalized[start])continue;
        var combined='';
        for(var end=start;end<normalized.length&&end<start+8;end++){
          if(!normalized[end])continue;
          combined=(combined+' '+normalized[end]).trim();
          if(combined.indexOf(q)>=0){
            for(var k=start;k<=end;k++)if(normalized[k]&&!matched[k])addSearchRange(matched,k,0,1);
            break;
          }
          if(combined.length>Math.max(120,q.length*4))break;
        }
      }
    }
    return matched;
  }
""",
'highlight matching helpers'
)

rep(
"""        var matched=matchedTextItemIndexes(items,searchQuery);
        var keys=Object.keys(matched);if(!keys.length)return false;
        var layer=document.createElement('div');layer.className='efp-search-layer';
        if(!continuous)layer.id='efpSingleSearchLayer';
        layer.style.left=layerLeft+'px';layer.style.top=layerTop+'px';layer.style.width=cssW+'px';layer.style.height=cssH+'px';
        var first=null,count=0;
        for(var m=0;m<keys.length;m++){
          var item=items[parseInt(keys[m],10)];if(!item||!item.transform)continue;
          var tx=pdfjsLib.Util.transform(cssViewport.transform,item.transform);
          var h=Math.max(4,Math.hypot(tx[2],tx[3]));
          var w=Math.max(4,Math.abs((Number(item.width)||0)*cssViewport.scale));
          var left=tx[4],top=tx[5]-h;
          if(!isFinite(left)||!isFinite(top)||!isFinite(w)||!isFinite(h))continue;
          if(left>cssW||top>cssH||left+w<0||top+h<0)continue;
          left=Math.max(0,left);top=Math.max(0,top);w=Math.min(w,cssW-left);h=Math.min(h*1.08,cssH-top);
          var mark=document.createElement('span');mark.className='efp-search-mark'+(count===0?' efp-search-active':'');
          mark.style.left=left+'px';mark.style.top=top+'px';mark.style.width=Math.max(3,w)+'px';mark.style.height=Math.max(3,h)+'px';
          layer.appendChild(mark);if(!first)first=mark;count++;
        }
""",
"""        var matched=matchedTextRanges(items,searchQuery);
        var keys=Object.keys(matched);if(!keys.length)return false;
        var layer=document.createElement('div');layer.className='efp-search-layer';
        if(!continuous)layer.id='efpSingleSearchLayer';
        layer.style.left=layerLeft+'px';layer.style.top=layerTop+'px';layer.style.width=cssW+'px';layer.style.height=cssH+'px';
        var first=null,count=0;
        for(var m=0;m<keys.length;m++){
          var itemIndex=parseInt(keys[m],10),item=items[itemIndex];if(!item||!item.transform)continue;
          var tx=pdfjsLib.Util.transform(cssViewport.transform,item.transform);
          var h=Math.max(4,Math.hypot(tx[2],tx[3]));
          var fullW=Math.max(4,Math.abs((Number(item.width)||0)*cssViewport.scale));
          var baseLeft=tx[4],top=tx[5]-h;
          if(!isFinite(baseLeft)||!isFinite(top)||!isFinite(fullW)||!isFinite(h))continue;
          var ranges=matched[itemIndex]||[];
          for(var r=0;r<ranges.length;r++){
            var rr=ranges[r];
            var left=baseLeft+fullW*rr.start;
            var w=Math.max(3,fullW*(rr.end-rr.start));
            if(left>cssW||top>cssH||left+w<0||top+h<0)continue;
            left=Math.max(0,left);var safeTop=Math.max(0,top);w=Math.min(w,cssW-left);var safeH=Math.min(h*1.08,cssH-safeTop);
            var mark=document.createElement('span');mark.className='efp-search-mark'+(count===0?' efp-search-active':'');
            mark.style.left=left+'px';mark.style.top=safeTop+'px';mark.style.width=Math.max(3,w)+'px';mark.style.height=Math.max(3,safeH)+'px';
            layer.appendChild(mark);if(!first)first=mark;count++;
          }
        }
""",
'exact substring highlight boxes'
)

rep(
"""        if(first&&searchFocusPending){
          searchFocusPending=false;
          var targetTop=(continuous?(container.offsetTop||0):0)+layerTop+(first.offsetTop||0)-pdfStage.clientHeight*.30;
          var targetLeft=layerLeft+(first.offsetLeft||0)-pdfStage.clientWidth*.35;
          pdfStage.scrollTo({top:Math.max(0,targetTop),left:Math.max(0,targetLeft),behavior:'smooth'});
        }
""",
"""        if(first&&searchFocusPending){
          searchFocusPending=false;
          searchHighlightKeepUntil=Date.now()+1400;
          programmaticScrollUntil=Math.max(programmaticScrollUntil,Date.now()+1400);
          var targetTop=(continuous?(container.offsetTop||0):0)+layerTop+(first.offsetTop||0)-pdfStage.clientHeight*.30;
          var targetLeft=layerLeft+(first.offsetLeft||0)-pdfStage.clientWidth*.35;
          pdfStage.scrollTo({top:Math.max(0,targetTop),left:Math.max(0,targetLeft),behavior:'smooth'});
        }
""",
'highlight focus scroll lock'
)

rep(
"      var cssScale=(size.width/base.width)*(autoFit?1:zoom);\n",
"      var cssScale=size.width/base.width;\n",
'continuous double zoom'
)

rep(
"""  function onContinuousScroll(){
    hideMobileReaderUi();
    clearTimeout(scrollTimer);
    if(devicePortrait())scrollTimer=setTimeout(showMobileControlsBriefly,520);
    if(!scrollRAF)scrollRAF=requestAnimationFrame(function(){scrollRAF=0;var n=visibleContinuousPage();if(n!==page)setCurrent(n,true)});
  }
""",
"""  function onContinuousScroll(){
    hideMobileReaderUi();
    clearTimeout(scrollTimer);
    if(devicePortrait())scrollTimer=setTimeout(showMobileControlsBriefly,520);
    var now=Date.now();
    if(activeSearchPage&&now>searchHighlightKeepUntil&&now>programmaticScrollUntil)clearSearchHighlightState(true);
    if(!scrollRAF)scrollRAF=requestAnimationFrame(function(){
      scrollRAF=0;if(Date.now()<programmaticScrollUntil)return;
      var n=visibleContinuousPage();if(n!==page)setCurrent(n,true);
    });
  }
""",
'continuous scroll tracking lock'
)

rep(
"""  function go(n,smooth){
    var max=pdfDoc?pdfDoc.numPages:doc.pages;
    var next=Math.max(1,Math.min(max,n));
    if(continuous){
      page=next;ensureBatchAround(page);updateControls();updateUrl();markVisited();
      var el=pageShell(page);
      var searchJumpPending=!!(searchQuery&&page===activeSearchPage&&searchFocusPending);
      return renderContinuousPage(page,false).then(function(){if(el&&!searchJumpPending)pdfStage.scrollTo({top:Math.max(0,el.offsetTop-4),left:0,behavior:smooth===false?'auto':'smooth'});trimContinuous(page)});
    }
    if(next===page){updateControls();return;}
    page=next;renderSinglePage();pdfStage.scrollTo({top:0,left:0,behavior:'auto'});window.scrollTo({top:0,behavior:'smooth'});
  }
""",
"""  function go(n,smooth){
    var max=pdfDoc?pdfDoc.numPages:doc.pages;
    var next=Math.max(1,Math.min(max,n));
    var from=page;
    if(continuous){
      page=next;ensureBatchAround(page);updateControls();updateUrl();markVisited();
      var el=pageShell(page);
      var searchJumpPending=!!(searchQuery&&page===activeSearchPage&&searchFocusPending);
      var useSmooth=smooth!==false&&Math.abs(next-from)<=1&&!searchJumpPending;
      if(!searchJumpPending)programmaticScrollUntil=Date.now()+(useSmooth?850:300);
      return renderContinuousPage(page,false).then(function(highlighted){
        if(el&&!searchJumpPending){pdfStage.scrollTo({top:Math.max(0,el.offsetTop-4),left:0,behavior:useSmooth?'smooth':'auto'});}
        else if(el&&searchJumpPending&&highlighted!==true){programmaticScrollUntil=Date.now()+300;pdfStage.scrollTo({top:Math.max(0,el.offsetTop-4),left:0,behavior:'auto'});searchFocusPending=false;}
        trimContinuous(page);return highlighted===true;
      });
    }
    if(next===page){updateControls();return Promise.resolve(false);}
    page=next;renderSinglePage();pdfStage.scrollTo({top:0,left:0,behavior:'auto'});window.scrollTo({top:0,behavior:'smooth'});return Promise.resolve(false);
  }
""",
'programmatic page jump'
)

rep(
"""        var samePage=n===page;
        activeSearchPage=n;searchFocusPending=true;searchGeneration++;clearSearchHighlightLayers();
        var moved=go(n,true);
        if(continuous)Promise.resolve(moved).then(function(){return renderSearchHighlights(n)});
        else if(samePage)renderSearchHighlights(n);
""",
"""        var samePage=n===page;
        activeSearchPage=n;searchFocusPending=true;searchGeneration++;searchHighlightKeepUntil=Date.now()+1400;clearSearchHighlightLayers();
        var moved=go(n,true);
        if(continuous)Promise.resolve(moved).then(function(highlighted){if(highlighted!==true)return renderSearchHighlights(n);return true});
        else if(samePage)renderSearchHighlights(n);
""",
'search result click'
)

rep(
"  var st;docSearch.addEventListener('input',function(){clearTimeout(st);st=setTimeout(runDocSearch,140)});\n",
"""  var st;docSearch.addEventListener('input',function(){
    clearTimeout(st);
    if(normalizeSearchText(docSearch.value).length<2){docHits.innerHTML='';clearSearchHighlightState(false);return;}
    st=setTimeout(runDocSearch,120);
  });
  pdfStage.addEventListener('pointerdown',function(){if(activeSearchPage&&Date.now()>searchHighlightKeepUntil)clearSearchHighlightState(true)},{passive:true});
  pdfStage.addEventListener('wheel',function(e){if(!(e.ctrlKey||e.metaKey)&&activeSearchPage&&Date.now()>searchHighlightKeepUntil)clearSearchHighlightState(true)},{passive:true});
""",
'immediate search clear and interaction clear'
)

rep(
"""  function refitForViewport(){
    clearTimeout(resizeTimer);resizeTimer=setTimeout(function(){
      mobileReader=isCompactReader();autoFit=true;zoom=1;if(devicePortrait())document.documentElement.classList.remove('efp-reader-ui-hidden');updateControls();
      if(!pdfDoc||document.body.classList.contains('mobile-tools-open'))return;
""",
"""  function refitForViewport(){
    clearTimeout(resizeTimer);resizeTimer=setTimeout(function(){
      if(document.body.classList.contains('mobile-tools-open'))return;
      var ae=document.activeElement;if(ae&&ae.closest&&ae.closest('input,textarea,[contenteditable=\"true\"]'))return;
      mobileReader=isCompactReader();autoFit=true;zoom=1;if(devicePortrait())document.documentElement.classList.remove('efp-reader-ui-hidden');updateControls();
      if(!pdfDoc)return;
""",
'keyboard viewport guard'
)

viewer.write_text(s, encoding='utf-8')

html = Path('Crux-Tricks/viewer.html')
h = html.read_text(encoding='utf-8')
if 'viewer-v2.js?v=20260909searchhighlight1' not in h:
    raise SystemExit('viewer html cache anchor not found')
h = h.replace('viewer-v2.js?v=20260909searchhighlight1','viewer-v2.js?v=20260909searchfixes1')
html.write_text(h, encoding='utf-8')

sw = Path('service-worker.js')
w = sw.read_text(encoding='utf-8')
if 'efp-pwa-2026-09-09-v95-pdf-search-highlight' not in w:
    raise SystemExit('service worker cache anchor not found')
w = w.replace('efp-pwa-2026-09-09-v95-pdf-search-highlight','efp-pwa-2026-09-09-v96-pdf-search-fixes')
w = w.replace('/Crux-Tricks/viewer-v2.js?v=20260909searchhighlight1','/Crux-Tricks/viewer-v2.js?v=20260909searchfixes1')
sw.write_text(w, encoding='utf-8')
