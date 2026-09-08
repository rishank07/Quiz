from pathlib import Path
import re

p=Path('Crux-Tricks/viewer-v2.js')
s=p.read_text(encoding='utf-8')

anchor="""  var controlsTimer=null;\n  var PAGE_BATCH_SIZE=20;\n"""
replacement="""  var controlsTimer=null;\n  var searchQuery='';\n  var activeSearchPage=0;\n  var searchFocusPending=false;\n  var searchGeneration=0;\n  var PAGE_BATCH_SIZE=20;\n"""
if anchor not in s:
    raise SystemExit('search state anchor not found')
s=s.replace(anchor,replacement,1)

css_anchor="""      '.efp-cont-page{position:relative;display:flex;align-items:flex-start;justify-content:center;margin:0 auto 9px;overflow:hidden;background:transparent}',\n      '.efp-cont-page canvas{display:block;margin:0 auto!important;max-width:none!important;box-shadow:0 1px 5px rgba(0,0,0,.18)!important;background:#fff}',\n"""
css_repl="""      '.efp-cont-page{position:relative;display:flex;align-items:flex-start;justify-content:center;margin:0 auto 9px;overflow:hidden;background:transparent}',\n      '.efp-cont-page canvas{display:block;margin:0 auto!important;max-width:none!important;box-shadow:0 1px 5px rgba(0,0,0,.18)!important;background:#fff}',\n      '.efp-search-layer{position:absolute;pointer-events:none;z-index:3;overflow:hidden}',\n      '.efp-cont-page>.efp-search-layer{left:0;top:0}',\n      '.efp-search-mark{position:absolute;border-radius:3px;background:rgba(255,224,0,.42);border:1px solid rgba(232,155,0,.72);box-shadow:0 0 0 1px rgba(255,245,120,.22) inset;mix-blend-mode:multiply}',\n      '.efp-search-mark.efp-search-active{background:rgba(255,166,0,.68);border-color:rgba(214,110,0,.96);box-shadow:0 0 0 2px rgba(255,205,35,.42),0 1px 5px rgba(0,0,0,.18)}',\n      'html.dark .efp-search-mark{background:rgba(255,232,35,.50);border-color:rgba(255,202,52,.92);mix-blend-mode:screen}',\n      'html.dark .efp-search-mark.efp-search-active{background:rgba(255,180,0,.78);border-color:#ffd34f;mix-blend-mode:screen}',\n"""
if css_anchor not in s:
    raise SystemExit('css anchor not found')
s=s.replace(css_anchor,css_repl,1)

fn_anchor="""  function sizeShell(el,ratio){if(!el)return;var s=currentTargetSize(ratio);el.style.width=s.width+'px';el.style.height=s.height+'px';el.style.minHeight=s.height+'px'}\n\n  function fullHdDensity(cssWidth,cssHeight,compact){\n"""
fn_repl="""  function sizeShell(el,ratio){if(!el)return;var s=currentTargetSize(ratio);el.style.width=s.width+'px';el.style.height=s.height+'px';el.style.minHeight=s.height+'px'}\n\n  function normalizeSearchText(v){return String(v||'').toLowerCase().replace(/\\s+/g,' ').trim()}\n  function clearSearchHighlightLayers(){\n    var layers=document.querySelectorAll('.efp-search-layer');\n    for(var i=0;i<layers.length;i++)layers[i].remove();\n  }\n  function matchedTextItemIndexes(items,q){\n    var normalized=[],matched={};\n    for(var i=0;i<items.length;i++){\n      var text=normalizeSearchText(items[i]&&items[i].str);normalized.push(text);\n      if(text&&text.indexOf(q)>=0)matched[i]=true;\n    }\n    if(q.indexOf(' ')>=0){\n      for(var start=0;start<normalized.length;start++){\n        if(!normalized[start])continue;\n        var combined='';\n        for(var end=start;end<normalized.length&&end<start+8;end++){\n          if(!normalized[end])continue;\n          combined=(combined+' '+normalized[end]).trim();\n          if(combined.indexOf(q)>=0){for(var k=start;k<=end;k++)if(normalized[k])matched[k]=true;break}\n          if(combined.length>Math.max(120,q.length*4))break;\n        }\n      }\n    }\n    return matched;\n  }\n  function renderSearchHighlights(n){\n    if(!pdfDoc||!searchQuery||n!==activeSearchPage)return Promise.resolve(false);\n    var generation=searchGeneration;\n    return pdfDoc.getPage(n).then(function(pg){\n      var container,canvas,layerLeft=0,layerTop=0;\n      if(continuous){\n        container=pageShell(n);if(!container)return false;canvas=container.querySelector('canvas');\n      }else{\n        if(n!==page)return false;container=pdfStage;canvas=pdfCanvas;\n      }\n      if(!canvas||canvas.hidden||canvas.style.display==='none')return false;\n      var cssW=parseFloat(canvas.style.width)||canvas.clientWidth||0;\n      var cssH=parseFloat(canvas.style.height)||canvas.clientHeight||0;\n      if(!cssW||!cssH)return false;\n      var base=pg.getViewport({scale:1});\n      var cssViewport=pg.getViewport({scale:cssW/base.width});\n      if(!continuous){layerLeft=canvas.offsetLeft;layerTop=canvas.offsetTop}\n      return pg.getTextContent().then(function(tc){\n        if(generation!==searchGeneration||n!==activeSearchPage||!searchQuery)return false;\n        var old=container.querySelector(continuous?':scope > .efp-search-layer':'#efpSingleSearchLayer');if(old)old.remove();\n        var items=tc&&Array.isArray(tc.items)?tc.items:[];\n        if(!items.length)return false;\n        var matched=matchedTextItemIndexes(items,searchQuery);\n        var keys=Object.keys(matched);if(!keys.length)return false;\n        var layer=document.createElement('div');layer.className='efp-search-layer';\n        if(!continuous)layer.id='efpSingleSearchLayer';\n        layer.style.left=layerLeft+'px';layer.style.top=layerTop+'px';layer.style.width=cssW+'px';layer.style.height=cssH+'px';\n        var first=null,count=0;\n        for(var m=0;m<keys.length;m++){\n          var item=items[parseInt(keys[m],10)];if(!item||!item.transform)continue;\n          var tx=pdfjsLib.Util.transform(cssViewport.transform,item.transform);\n          var h=Math.max(4,Math.hypot(tx[2],tx[3]));\n          var w=Math.max(4,Math.abs((Number(item.width)||0)*cssViewport.scale));\n          var left=tx[4],top=tx[5]-h;\n          if(!isFinite(left)||!isFinite(top)||!isFinite(w)||!isFinite(h))continue;\n          if(left>cssW||top>cssH||left+w<0||top+h<0)continue;\n          left=Math.max(0,left);top=Math.max(0,top);w=Math.min(w,cssW-left);h=Math.min(h*1.08,cssH-top);\n          var mark=document.createElement('span');mark.className='efp-search-mark'+(count===0?' efp-search-active':'');\n          mark.style.left=left+'px';mark.style.top=top+'px';mark.style.width=Math.max(3,w)+'px';mark.style.height=Math.max(3,h)+'px';\n          layer.appendChild(mark);if(!first)first=mark;count++;\n        }\n        if(!count)return false;\n        container.appendChild(layer);\n        if(first&&searchFocusPending){\n          searchFocusPending=false;\n          var targetTop=(continuous?(container.offsetTop||0):0)+layerTop+(first.offsetTop||0)-pdfStage.clientHeight*.30;\n          var targetLeft=layerLeft+(first.offsetLeft||0)-pdfStage.clientWidth*.35;\n          pdfStage.scrollTo({top:Math.max(0,targetTop),left:Math.max(0,targetLeft),behavior:'smooth'});\n        }\n        return true;\n      });\n    }).catch(function(err){if(console&&console.warn)console.warn('PDF search highlight unavailable',err);return false});\n  }\n\n  function fullHdDensity(cssWidth,cssHeight,compact){\n"""
if fn_anchor not in s:
    raise SystemExit('highlight function anchor not found')
s=s.replace(fn_anchor,fn_repl,1)

render_anchor="""      return pg.render({canvasContext:ctx,viewport:vp}).promise.then(function(){el.dataset.rendered='1'});\n"""
render_repl="""      return pg.render({canvasContext:ctx,viewport:vp}).promise.then(function(){el.dataset.rendered='1';if(searchQuery&&n===activeSearchPage)return renderSearchHighlights(n)});\n"""
if render_anchor not in s:
    raise SystemExit('continuous render anchor not found')
s=s.replace(render_anchor,render_repl,1)

trim_anchor="""      if(Math.abs(n-center)>KEEP_RENDER_RADIUS){var c=list[i].querySelector('canvas');if(c){c.width=1;c.height=1;c.remove()}list[i].dataset.rendered='0';sizeShell(list[i],pageRatios[n]||defaultRatio)}\n"""
trim_repl="""      if(Math.abs(n-center)>KEEP_RENDER_RADIUS){var c=list[i].querySelector('canvas');if(c){c.width=1;c.height=1;c.remove()}var hl=list[i].querySelector('.efp-search-layer');if(hl)hl.remove();list[i].dataset.rendered='0';sizeShell(list[i],pageRatios[n]||defaultRatio)}\n"""
if trim_anchor not in s:
    raise SystemExit('trim anchor not found')
s=s.replace(trim_anchor,trim_repl,1)

reflow_anchor="""      var n=parseInt(list[i].dataset.page,10)||0;sizeShell(list[i],pageRatios[n]||defaultRatio);var c=list[i].querySelector('canvas');if(c)c.remove();list[i].dataset.rendered='0';\n"""
reflow_repl="""      var n=parseInt(list[i].dataset.page,10)||0;sizeShell(list[i],pageRatios[n]||defaultRatio);var c=list[i].querySelector('canvas');if(c)c.remove();var hl=list[i].querySelector('.efp-search-layer');if(hl)hl.remove();list[i].dataset.rendered='0';\n"""
if reflow_anchor not in s:
    raise SystemExit('reflow anchor not found')
s=s.replace(reflow_anchor,reflow_repl,1)

single_anchor="""    }).then(function(){renderTask=null;pdfLoading.hidden=true;pdfCanvas.hidden=false;markVisited();updateUrl();updateControls()}).catch(function(err){if(err&&err.name==='RenderingCancelledException')return;showError('This PDF page could not be rendered inside the app.');if(console&&console.error)console.error(err)});\n"""
single_repl="""    }).then(function(){renderTask=null;pdfLoading.hidden=true;pdfCanvas.hidden=false;markVisited();updateUrl();updateControls();if(searchQuery&&page===activeSearchPage)renderSearchHighlights(page)}).catch(function(err){if(err&&err.name==='RenderingCancelledException')return;showError('This PDF page could not be rendered inside the app.');if(console&&console.error)console.error(err)});\n"""
if single_anchor not in s:
    raise SystemExit('single render anchor not found')
s=s.replace(single_anchor,single_repl,1)

search_old="""  function runDocSearch(){var q=docSearch.value.trim().toLowerCase();docHits.innerHTML='';if(q.length<2||!pages.length)return;var hits=[];for(var i=0;i<pages.length;i++)if(String(pages[i]).toLowerCase().includes(q))hits.push(i+1);hits.slice(0,30).forEach(function(n){var b=document.createElement('button');b.textContent='Page '+n;b.addEventListener('click',function(){go(n,true)});docHits.appendChild(b)});if(!hits.length){var s=document.createElement('span');s.textContent='No matching page';docHits.appendChild(s)}else if(hits.length>30){var m=document.createElement('span');m.textContent=' +'+(hits.length-30)+' more';docHits.appendChild(m)}}\n"""
search_new="""  function runDocSearch(){\n    var q=normalizeSearchText(docSearch.value);docHits.innerHTML='';\n    if(q!==searchQuery){searchQuery=q;activeSearchPage=0;searchFocusPending=false;searchGeneration++;clearSearchHighlightLayers()}\n    if(q.length<2||!pages.length)return;\n    var hits=[];for(var i=0;i<pages.length;i++)if(normalizeSearchText(pages[i]).includes(q))hits.push(i+1);\n    hits.slice(0,30).forEach(function(n){\n      var b=document.createElement('button');b.textContent='Page '+n;\n      b.addEventListener('click',function(){\n        activeSearchPage=n;searchFocusPending=true;searchGeneration++;clearSearchHighlightLayers();\n        var moved=go(n,true);\n        if(continuous)Promise.resolve(moved).then(function(){return renderSearchHighlights(n)});\n      });\n      docHits.appendChild(b);\n    });\n    if(!hits.length){var empty=document.createElement('span');empty.textContent='No matching page';docHits.appendChild(empty)}\n    else if(hits.length>30){var more=document.createElement('span');more.textContent=' +'+(hits.length-30)+' more';docHits.appendChild(more)}\n  }\n"""
if search_old not in s:
    raise SystemExit('runDocSearch anchor not found')
s=s.replace(search_old,search_new,1)

p.write_text(s,encoding='utf-8')

p=Path('Crux-Tricks/viewer.html')
s=p.read_text(encoding='utf-8')
s=re.sub(r'viewer-v2\.js\?v=20260909[a-z0-9]+','viewer-v2.js?v=20260909searchhighlight1',s)
p.write_text(s,encoding='utf-8')

p=Path('service-worker.js')
s=p.read_text(encoding='utf-8')
s=re.sub(r'const CACHE_VERSION = "[^"]+";','const CACHE_VERSION = "efp-pwa-2026-09-09-v95-pdf-search-highlight";',s,count=1)
s=re.sub(r'/Crux-Tricks/viewer-v2\.js\?v=20260909[a-z0-9]+','/Crux-Tricks/viewer-v2.js?v=20260909searchhighlight1',s)
p.write_text(s,encoding='utf-8')
