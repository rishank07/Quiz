(function(){
  'use strict';

  var docs=Array.isArray(window.EF_CRUX_DOCS)?window.EF_CRUX_DOCS:[];
  var params=new URLSearchParams(location.search);
  var id=params.get('id');
  var doc=docs.find(function(x){return x.id===id});
  if(!doc){var missing=document.getElementById('title');if(missing)missing.textContent='Document not found';return;}

  function isCompactReader(){
    var mq=window.matchMedia;
    var coarse=!!(mq&&mq('(hover:none) and (pointer:coarse)').matches);
    var w=window.innerWidth||document.documentElement.clientWidth||0;
    var h=window.innerHeight||document.documentElement.clientHeight||0;
    var shortSide=Math.min(w,h),longSide=Math.max(w,h);
    return !!(mq&&(mq('(max-width:900px)').matches||(coarse&&shortSide<=1100&&longSide<=1600)));
  }
  function devicePortrait(){return window.innerHeight>=window.innerWidth;}

  var mobileReader=isCompactReader();
  var isTrick=doc.kind==='tricks';
  var isBookCrux=doc.kind==='crux';
  var isEconomicsCrux=isBookCrux&&doc.subject==='Economics';
  var isAdvanceMaths=doc.id==='ct0468'||doc.sourceTitle==='Advance Maths Formula Book';
  if(isTrick)document.documentElement.classList.add('efp-trick-pdf');
  if(isBookCrux)document.documentElement.classList.add('efp-book-crux-pdf');
  if(isEconomicsCrux)document.documentElement.classList.add('efp-economics-crux-pdf');
  if(isAdvanceMaths)document.documentElement.classList.add('efp-advance-maths-dark-pdf');

  var page=Math.max(1,Math.min(doc.pages,parseInt(params.get('page')||'1',10)||1));
  var pages=[];
  var pdfDoc=null;
  var renderTask=null;
  var zoom=mobileReader?1:1;
  var autoFit=true;
  var lastPageLandscape=false;
  var continuous=false;
  var continuousRoot=null;
  var continuousObserver=null;
  var continuousRenders={};
  var pageRatios={};
  var defaultRatio=.707;
  var scrollTimer=null;
  var scrollRAF=0;
  var resizeTimer=null;
  var controlsTimer=null;

  var title=document.getElementById('title');
  var crumb=document.getElementById('crumb');
  var input=document.getElementById('pageInput');
  var total=document.getElementById('pageTotal');
  var favBtn=document.getElementById('favBtn');
  var bookmarkPage=document.getElementById('bookmarkPage');
  var completeBtn=document.getElementById('completeBtn');
  var resetProgressBtn=document.getElementById('resetProgressBtn');
  var openPdf=document.getElementById('openPdf');
  var openPdf2=document.getElementById('openPdf2');
  var docSearch=document.getElementById('docSearch');
  var docHits=document.getElementById('docHits');
  var pdfStage=document.getElementById('pdfStage');
  var pdfCanvas=document.getElementById('pdfCanvas');
  var pdfLoading=document.getElementById('pdfLoading');
  var pdfError=document.getElementById('pdfError');
  var zoomLabel=document.getElementById('zoomLabel');
  var prevBtn=document.getElementById('prev');
  var nextBtn=document.getElementById('next');
  var zoomInBtn=document.getElementById('zoomIn');
  var zoomOutBtn=document.getElementById('zoomOut');

  function installStyles(){
    var st=document.createElement('style');
    st.id='efp-pdf-v2-style';
    st.textContent=[
      'html.dark.efp-book-crux-pdf #pdfCanvas{filter:invert(.95) hue-rotate(180deg) saturate(1.04) brightness(1.10) contrast(1.18)!important;background:#080d15!important}',
      'html.dark.efp-economics-crux-pdf #pdfCanvas{filter:invert(.965) hue-rotate(180deg) saturate(1.08) brightness(1.12) contrast(1.22)!important;background:#060b12!important}',
      'html.dark.efp-trick-pdf #pdfCanvas{filter:invert(.965) hue-rotate(180deg) saturate(1.18) brightness(1.12) contrast(1.22)!important;background:#070b12!important}',
      'html.dark.efp-trick-pdf.efp-advance-maths-dark-pdf #pdfCanvas{filter:none!important;background:#05070b!important}',
      'html:not(.dark).efp-advance-maths-dark-pdf #pdfCanvas{filter:invert(.965) hue-rotate(180deg) saturate(1.02) brightness(1.08) contrast(1.14)!important;background:#fff!important}',
      'html.efp-continuous-mobile-pdf,html.efp-continuous-mobile-pdf body{height:100%!important;overflow:hidden!important}',
      'html.efp-continuous-mobile-pdf .reader-head{height:38px!important;min-height:38px!important;padding:3px 48px!important;grid-template-columns:minmax(0,1fr)!important}',
      'html.efp-continuous-mobile-pdf .reader-title b{font-size:10px!important;line-height:1.1!important}',
      'html.efp-continuous-mobile-pdf .reader-title small{display:none!important}',
      'html.efp-continuous-mobile-pdf .reader-shell{height:calc(100dvh - 38px)!important;width:100%!important;margin:0!important}',
      'html.efp-continuous-mobile-pdf .toolbar,html.efp-continuous-mobile-pdf .doc-search{display:none!important}',
      'html.efp-continuous-mobile-pdf .pdf-mode{height:100%!important;padding:0!important}',
      'html.efp-continuous-mobile-pdf .pdf-stage{height:100%!important;min-height:0!important;padding:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior-y:contain!important;-webkit-overflow-scrolling:touch!important;touch-action:pan-y pinch-zoom!important;background:#cdd3da!important}',
      'html.dark.efp-continuous-mobile-pdf .pdf-stage{background:#101318!important}',
      'html.efp-continuous-mobile-pdf #pdfCanvas{display:none!important}',
      '#efpContinuousPages{display:block;width:100%;box-sizing:border-box;padding:6px 0 calc(18px + env(safe-area-inset-bottom))}',
      '.efp-cont-page{position:relative;display:flex;align-items:flex-start;justify-content:center;margin:0 auto 9px;overflow:hidden;background:transparent}',
      '.efp-cont-page canvas{display:block;margin:0 auto!important;max-width:none!important;box-shadow:0 1px 5px rgba(0,0,0,.18)!important;background:#fff}',
      '.efp-cont-page .efp-page-badge{position:absolute;right:7px;bottom:6px;z-index:2;min-width:26px;padding:3px 6px;border-radius:999px;background:rgba(15,23,42,.60);color:#fff;font:700 10px/1 system-ui,sans-serif;text-align:center;pointer-events:none;opacity:.42}',
      'html.dark .efp-cont-page canvas{filter:invert(.94) hue-rotate(180deg) saturate(1.08) brightness(1.08) contrast(1.14)!important;background:#0a0f18!important}',
      'html.dark.efp-book-crux-pdf .efp-cont-page canvas{filter:invert(.965) hue-rotate(180deg) saturate(1.06) brightness(1.13) contrast(1.22)!important}',
      'html.dark.efp-economics-crux-pdf .efp-cont-page canvas{filter:invert(.975) hue-rotate(180deg) saturate(1.10) brightness(1.15) contrast(1.25)!important}',
      'html.dark.efp-trick-pdf .efp-cont-page canvas{filter:invert(.97) hue-rotate(180deg) saturate(1.22) brightness(1.14) contrast(1.25)!important}',
      'html.dark.efp-trick-pdf.efp-advance-maths-dark-pdf .efp-cont-page canvas{filter:none!important;background:#05070b!important}',
      'html:not(.dark).efp-advance-maths-dark-pdf .efp-cont-page canvas{filter:invert(.965) hue-rotate(180deg) saturate(1.02) brightness(1.08) contrast(1.14)!important;background:#fff!important}',
      'html.efp-continuous-mobile-pdf .mobile-reader-bar{transition:opacity .18s ease,transform .22s ease!important}',
      'html.efp-continuous-mobile-pdf .mobile-reader-bar.efp-reader-hidden{opacity:0!important;pointer-events:none!important;transform:translateX(-50%) translateY(calc(100% + 28px))!important}',
      'html.efp-continuous-mobile-pdf #efp-home-button{top:max(3px,env(safe-area-inset-top))!important;right:max(6px,env(safe-area-inset-right))!important;bottom:auto!important;left:auto!important;width:32px!important;min-width:32px!important;height:32px!important;min-height:32px!important;padding:0!important;border-radius:50%!important;background:rgba(8,14,24,.22)!important;box-shadow:none!important}',
      'html.efp-continuous-mobile-pdf #efp-app-back-button{top:max(3px,env(safe-area-inset-top))!important;left:max(6px,env(safe-area-inset-left))!important;right:auto!important;bottom:auto!important;width:32px!important;min-width:32px!important;height:32px!important;min-height:32px!important;padding:0!important;border-radius:50%!important;background:rgba(8,14,24,.22)!important;box-shadow:none!important}',
      'html.efp-continuous-mobile-pdf #efp-home-button .efp-home-label,html.efp-continuous-mobile-pdf #efp-app-back-button .efp-back-label{display:none!important}',
      'html.efp-continuous-mobile-pdf #efp-home-button .efp-home-icon,html.efp-continuous-mobile-pdf #efp-app-back-button .efp-back-icon{font-size:17px!important}',
      '@media(orientation:landscape){html.efp-continuous-mobile-pdf .reader-head{height:34px!important;min-height:34px!important}html.efp-continuous-mobile-pdf .reader-shell{height:calc(100dvh - 34px)!important}.efp-cont-page{margin-bottom:8px}}'
    ].join('');
    document.head.appendChild(st);
  }
  installStyles();

  function safe(raw,f){try{return JSON.parse(raw)||f}catch(e){return f}}
  function bms(){var v=safe(localStorage.getItem('efp_bookmarks'),{});return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
  function saveB(v){try{localStorage.setItem('efp_bookmarks',JSON.stringify(v))}catch(e){}}
  function fk(){return 'cruxdoc:'+doc.id}
  function pk(){return 'cruxpage:'+doc.id+':'+page}
  function prog(){var a=safe(localStorage.getItem('efp_visited_crux_'+doc.id),[]);return Array.isArray(a)?a:[]}
  function saveProg(a){try{localStorage.setItem('efp_visited_crux_'+doc.id,JSON.stringify(Array.from(new Set(a))))}catch(e){}}
  function recent(){var a=safe(localStorage.getItem('efp_visited_crux_recent'),[]);return Array.isArray(a)?a:[]}
  function pushRecent(){var a=recent().filter(function(x){return x!==doc.id});a.unshift(doc.id);try{localStorage.setItem('efp_visited_crux_recent',JSON.stringify(a.slice(0,20)))}catch(e){}}
  function toast(s){var t=document.getElementById('toast');if(!t)return;t.textContent=s;t.classList.add('show');clearTimeout(t._efp);t._efp=setTimeout(function(){t.classList.remove('show')},1500)}
  function markVisited(){var a=prog().filter(function(x){return !/^last:/.test(x)});a.push('p:'+page,'last:'+page);saveProg(a);pushRecent();if(typeof gtag==='function')gtag('event','crux_page_view',{document_id:doc.id,document_title:doc.title,page_number:page,source:doc.source,reader_mode:continuous?'pdfjs_continuous_mobile':'pdfjs_original_pdf'})}
  function updateUrl(){var p=new URLSearchParams(location.search);p.set('id',doc.id);p.set('page',String(page));history.replaceState(null,'',location.pathname+'?'+p.toString())}
  function pdfUrl(){return doc.pdf+'#page='+page+'&zoom=page-width'}
  function updateControls(){
    input.value=page;
    total.textContent=pdfDoc?pdfDoc.numPages:doc.pages;
    var b=bms();
    favBtn.textContent=b[fk()]?'★':'☆';favBtn.classList.toggle('on',!!b[fk()]);
    bookmarkPage.textContent=b[pk()]?'🔖 Bookmarked':'🔖 Bookmark Page';bookmarkPage.classList.toggle('bookmarked',!!b[pk()]);
    completeBtn.textContent=prog().indexOf('complete')>=0?'✓ Completed':'✓ Complete';
    openPdf.href=pdfUrl();openPdf2.href=pdfUrl();
    zoomLabel.textContent=autoFit?'Fit':Math.round(zoom*100)+'%';
  }
  function showError(msg){pdfLoading.hidden=true;pdfCanvas.hidden=true;pdfError.hidden=false;var p=pdfError.querySelector('p');if(p)p.textContent=msg||'PDF could not be displayed inside the app.'}

  function pageShell(n){return continuousRoot?continuousRoot.querySelector('.efp-cont-page[data-page="'+n+'"]'):null}
  function currentTargetSize(ratio){
    ratio=ratio||defaultRatio;
    var availW=Math.max(260,pdfStage.clientWidth-8);
    var width=availW;
    if(!devicePortrait()){
      var availH=Math.max(180,pdfStage.clientHeight-12);
      var fitByHeight=Math.max(240,(availH*.94)/ratio);
      width=Math.min(availW,fitByHeight);
    }
    width=Math.floor(width);
    return {width:width,height:Math.max(100,Math.floor(width*ratio))};
  }
  function sizeShell(el,ratio){if(!el)return;var s=currentTargetSize(ratio);el.style.width=s.width+'px';el.style.height=s.height+'px';el.style.minHeight=s.height+'px'}

  function renderContinuousPage(n,force){
    if(!continuous||!pdfDoc)return Promise.resolve();
    var el=pageShell(n);if(!el)return Promise.resolve();
    if(!force&&el.dataset.rendered==='1')return Promise.resolve();
    if(continuousRenders[n])return continuousRenders[n];
    continuousRenders[n]=pdfDoc.getPage(n).then(function(pg){
      var base=pg.getViewport({scale:1});
      var ratio=base.height/base.width;
      pageRatios[n]=ratio;
      var size=currentTargetSize(ratio);
      var cssScale=(size.width/base.width)*(autoFit?1:zoom);
      var dpr=Math.min(window.devicePixelRatio||1,2.25);
      var vp=pg.getViewport({scale:cssScale*dpr});
      var c=el.querySelector('canvas');
      if(!c){c=document.createElement('canvas');c.setAttribute('aria-label','PDF page '+n);el.appendChild(c)}
      c.width=Math.max(1,Math.floor(vp.width));c.height=Math.max(1,Math.floor(vp.height));
      c.style.width=Math.max(1,Math.floor(vp.width/dpr))+'px';c.style.height=Math.max(1,Math.floor(vp.height/dpr))+'px';
      el.style.width=c.style.width;el.style.height=c.style.height;el.style.minHeight=c.style.height;
      var ctx=c.getContext('2d',{alpha:false});
      return pg.render({canvasContext:ctx,viewport:vp}).promise.then(function(){el.dataset.rendered='1'});
    }).catch(function(err){if(console&&console.error)console.error(err)}).then(function(){delete continuousRenders[n]});
    return continuousRenders[n];
  }
  function trimContinuous(center){
    if(!continuousRoot)return;
    var list=continuousRoot.querySelectorAll('.efp-cont-page[data-rendered="1"]');
    for(var i=0;i<list.length;i++){
      var n=parseInt(list[i].dataset.page,10)||0;
      if(Math.abs(n-center)>6){var c=list[i].querySelector('canvas');if(c)c.remove();list[i].dataset.rendered='0';sizeShell(list[i],pageRatios[n]||defaultRatio)}
    }
  }
  function setCurrent(n,mark){
    n=Math.max(1,Math.min(pdfDoc?pdfDoc.numPages:doc.pages,n));
    if(n===page){updateControls();return;}
    page=n;updateControls();updateUrl();if(mark!==false)markVisited();trimContinuous(page);
  }
  function visibleContinuousPage(){
    if(!continuousRoot)return page;
    var stageRect=pdfStage.getBoundingClientRect();
    var x=stageRect.left+stageRect.width/2;
    var y=stageRect.top+Math.min(180,stageRect.height*.32);
    var el=document.elementFromPoint(x,y);
    if(el&&el.closest){var shell=el.closest('.efp-cont-page');if(shell&&continuousRoot.contains(shell))return parseInt(shell.dataset.page,10)||page;}
    var shells=continuousRoot.children,best=page,bestDist=Infinity;
    for(var i=0;i<shells.length;i++){
      var r=shells[i].getBoundingClientRect();var d=Math.abs(r.top-stageRect.top-8);if(d<bestDist){bestDist=d;best=parseInt(shells[i].dataset.page,10)||best}
      if(r.top>stageRect.bottom)break;
    }
    return best;
  }
  function showMobileControlsBriefly(){
    var bar=document.getElementById('mobileReaderBar');if(!bar)return;
    bar.classList.remove('efp-reader-hidden');
    clearTimeout(controlsTimer);controlsTimer=setTimeout(function(){if(continuous&&!document.body.classList.contains('mobile-tools-open'))bar.classList.add('efp-reader-hidden')},1800);
  }
  function onContinuousScroll(){
    var bar=document.getElementById('mobileReaderBar');if(bar)bar.classList.add('efp-reader-hidden');
    clearTimeout(scrollTimer);scrollTimer=setTimeout(showMobileControlsBriefly,520);
    if(!scrollRAF)scrollRAF=requestAnimationFrame(function(){scrollRAF=0;var n=visibleContinuousPage();if(n!==page)setCurrent(n,true)});
  }
  function buildContinuous(firstPg){
    if(!pdfDoc)return;
    continuous=true;
    document.documentElement.classList.add('efp-continuous-mobile-pdf');
    document.documentElement.classList.remove('efp-mobile-rotated-page');
    pdfCanvas.hidden=true;pdfCanvas.style.display='none';pdfError.hidden=true;pdfLoading.hidden=true;
    if(!continuousRoot){continuousRoot=document.createElement('div');continuousRoot.id='efpContinuousPages';pdfStage.insertBefore(continuousRoot,pdfError||null)}
    continuousRoot.innerHTML='';continuousRoot.hidden=false;
    var b=firstPg.getViewport({scale:1});defaultRatio=b.height/b.width;
    var frag=document.createDocumentFragment();
    for(var n=1;n<=pdfDoc.numPages;n++){
      var d=document.createElement('div');d.className='efp-cont-page';d.dataset.page=String(n);d.dataset.rendered='0';d.setAttribute('aria-label','Page '+n);sizeShell(d,pageRatios[n]||defaultRatio);
      var badge=document.createElement('span');badge.className='efp-page-badge';badge.textContent=String(n);d.appendChild(badge);frag.appendChild(d);
    }
    continuousRoot.appendChild(frag);
    if(continuousObserver){try{continuousObserver.disconnect()}catch(e){}}
    continuousObserver=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting){var n=parseInt(entry.target.dataset.page,10);if(n)renderContinuousPage(n,false)}})},{root:pdfStage,rootMargin:'900px 0px',threshold:.01});
    Array.prototype.forEach.call(continuousRoot.children,function(el){continuousObserver.observe(el)});
    pdfStage.removeEventListener('scroll',onContinuousScroll);pdfStage.addEventListener('scroll',onContinuousScroll,{passive:true});
    pdfStage.addEventListener('pointerdown',showMobileControlsBriefly,{passive:true});
    requestAnimationFrame(function(){go(page,false);renderContinuousPage(page,false);if(page>1)renderContinuousPage(page-1,false);if(page<pdfDoc.numPages)renderContinuousPage(page+1,false);showMobileControlsBriefly()});
  }
  function reflowContinuous(){
    if(!continuous||!continuousRoot)return;
    var saved=page;
    var list=continuousRoot.querySelectorAll('.efp-cont-page');
    for(var i=0;i<list.length;i++){
      var n=parseInt(list[i].dataset.page,10)||0;sizeShell(list[i],pageRatios[n]||defaultRatio);var c=list[i].querySelector('canvas');if(c)c.remove();list[i].dataset.rendered='0';
    }
    continuousRenders={};
    requestAnimationFrame(function(){go(saved,false);renderContinuousPage(saved,false);if(saved>1)renderContinuousPage(saved-1,false);if(saved<pdfDoc.numPages)renderContinuousPage(saved+1,false)});
  }
  function disableContinuous(){
    continuous=false;document.documentElement.classList.remove('efp-continuous-mobile-pdf');
    if(continuousRoot)continuousRoot.hidden=true;
    pdfStage.removeEventListener('scroll',onContinuousScroll);
    pdfCanvas.style.display='';
  }

  function renderSinglePage(){
    if(!pdfDoc)return;
    mobileReader=isCompactReader();
    document.documentElement.classList.toggle('efp-compact-reader',mobileReader);
    pdfError.hidden=true;pdfLoading.hidden=false;pdfLoading.textContent='Loading page '+page+'…';pdfCanvas.hidden=true;pdfCanvas.style.display='';
    if(renderTask){try{renderTask.cancel()}catch(e){}renderTask=null}
    pdfDoc.getPage(page).then(function(pg){
      var base=pg.getViewport({scale:1});
      var landscape=base.width>base.height*1.03;
      lastPageLandscape=landscape;
      document.documentElement.classList.toggle('efp-landscape-page',landscape);
      document.documentElement.classList.toggle('efp-portrait-page',!landscape);
      document.documentElement.classList.toggle('efp-auto-fit',autoFit);
      document.documentElement.classList.remove('efp-mobile-rotated-page');
      var availableW=Math.max(260,pdfStage.clientWidth-(mobileReader?4:18));
      var stageTop=pdfStage.getBoundingClientRect().top;
      var visibleH=Math.max(220,window.innerHeight-stageTop-(mobileReader?4:18));
      var widthFit=availableW/base.width;
      var fit=widthFit;
      if(!mobileReader&&landscape&&autoFit)fit=Math.min(widthFit,visibleH/base.height);
      var cssScale=fit*(autoFit?1:zoom);
      var dpr=Math.min(window.devicePixelRatio||1,mobileReader?3:2);
      var vp=pg.getViewport({scale:cssScale*dpr});
      var ctx=pdfCanvas.getContext('2d',{alpha:false});
      pdfStage.style.overflowY='auto';pdfStage.style.overflowX=mobileReader&&autoFit?'hidden':'auto';
      pdfCanvas.width=Math.floor(vp.width);pdfCanvas.height=Math.floor(vp.height);pdfCanvas.style.width=Math.floor(vp.width/dpr)+'px';pdfCanvas.style.height=Math.floor(vp.height/dpr)+'px';
      renderTask=pg.render({canvasContext:ctx,viewport:vp});return renderTask.promise;
    }).then(function(){renderTask=null;pdfLoading.hidden=true;pdfCanvas.hidden=false;markVisited();updateUrl();updateControls()}).catch(function(err){if(err&&err.name==='RenderingCancelledException')return;showError('This PDF page could not be rendered inside the app.');if(console&&console.error)console.error(err)});
  }

  function go(n,smooth){
    var max=pdfDoc?pdfDoc.numPages:doc.pages;
    var next=Math.max(1,Math.min(max,n));
    if(continuous){
      page=next;updateControls();updateUrl();markVisited();
      var el=pageShell(page);
      return renderContinuousPage(page,false).then(function(){if(el)pdfStage.scrollTo({top:Math.max(0,el.offsetTop-4),left:0,behavior:smooth===false?'auto':'smooth'});trimContinuous(page)});
    }
    if(next===page){updateControls();return;}
    page=next;renderSinglePage();pdfStage.scrollTo({top:0,left:0,behavior:'auto'});window.scrollTo({top:0,behavior:'smooth'});
  }

  function chooseReaderAfterLoad(){
    return pdfDoc.getPage(page).then(function(pg){
      var b=pg.getViewport({scale:1});
      var landscape=b.width>b.height*1.03;
      lastPageLandscape=landscape;
      if(isCompactReader()&&landscape){buildContinuous(pg)}else{disableContinuous();renderSinglePage()}
    });
  }
  function loadPdf(){
    if(!window.pdfjsLib){showError('PDF viewer failed to load. Check your internet connection once, then reopen this page.');return}
    pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    pdfLoading.hidden=false;pdfLoading.textContent='Loading original PDF…';
    pdfjsLib.getDocument({url:doc.pdf}).promise.then(function(loaded){pdfDoc=loaded;total.textContent=loaded.numPages;if(page>loaded.numPages)page=loaded.numPages;return chooseReaderAfterLoad()}).catch(function(err){showError('Original PDF could not be loaded inside the app.');if(console&&console.error)console.error(err)});
  }

  function loadPagesForSearch(){var s=document.createElement('script');s.src='pages/'+doc.id+'.js?v=20260908maths1';s.onload=function(){pages=Array.isArray(window.EF_CRUX_DOC_PAGES)?window.EF_CRUX_DOC_PAGES:[];runDocSearch()};s.onerror=function(){docSearch.placeholder='PDF search index unavailable — use page number';docSearch.disabled=true};document.head.appendChild(s)}
  function runDocSearch(){var q=docSearch.value.trim().toLowerCase();docHits.innerHTML='';if(q.length<2||!pages.length)return;var hits=[];for(var i=0;i<pages.length;i++)if(String(pages[i]).toLowerCase().includes(q))hits.push(i+1);hits.slice(0,30).forEach(function(n){var b=document.createElement('button');b.textContent='Page '+n;b.addEventListener('click',function(){go(n,true)});docHits.appendChild(b)});if(!hits.length){var s=document.createElement('span');s.textContent='No matching page';docHits.appendChild(s)}else if(hits.length>30){var m=document.createElement('span');m.textContent=' +'+(hits.length-30)+' more';docHits.appendChild(m)}}

  title.textContent=doc.title;crumb.textContent=doc.breadcrumb+' · '+doc.pages+' pages';document.title=doc.title+' | Original PDF | ExamFusion Prep';
  var backBtn=document.getElementById('backBtn');if(backBtn)backBtn.addEventListener('click',function(){if(history.length>1)history.back();else location.href='index.html'});
  prevBtn.addEventListener('click',function(){go(page-1,true)});
  nextBtn.addEventListener('click',function(){go(page+1,true)});
  input.addEventListener('change',function(){go(parseInt(input.value,10)||page,true)});
  input.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();go(parseInt(input.value,10)||page,true);input.blur()}});
  zoomInBtn.addEventListener('click',function(){autoFit=false;zoom=Math.min(2.25,Math.round((zoom+.10)*100)/100);updateControls();if(continuous)reflowContinuous();else renderSinglePage()});
  zoomOutBtn.addEventListener('click',function(){autoFit=false;zoom=Math.max(.70,Math.round((zoom-.10)*100)/100);updateControls();if(continuous)reflowContinuous();else renderSinglePage()});
  favBtn.addEventListener('click',function(){var b=bms();if(b[fk()])delete b[fk()];else b[fk()]=true;saveB(b);updateControls();toast(b[fk()]?'Added to favourites':'Removed from favourites')});
  bookmarkPage.addEventListener('click',function(){var b=bms();if(b[pk()])delete b[pk()];else b[pk()]=true;saveB(b);updateControls();toast(b[pk()]?'Page bookmarked · Open My Pages to view it':'Page bookmark removed')});
  completeBtn.addEventListener('click',function(){var a=prog(),i=a.indexOf('complete');if(i>=0){saveProg([]);updateControls();toast('Completion removed · Progress reset to 0%')}else{var max=pdfDoc?pdfDoc.numPages:doc.pages,done=['complete'];for(var n=1;n<=max;n++)done.push('p:'+n);done.push('last:'+page);saveProg(done);updateControls();toast('Marked complete · Progress 100%')}});
  if(resetProgressBtn)resetProgressBtn.addEventListener('click',function(){if(!window.confirm('Reset reading progress for this PDF?\n\nBookmarks and favourites will stay saved.'))return;saveProg([]);updateControls();toast('Reading progress reset to 0%');if(typeof gtag==='function')gtag('event','crux_progress_reset',{document_id:doc.id,document_title:doc.title,source:doc.source})});
  var st;docSearch.addEventListener('input',function(){clearTimeout(st);st=setTimeout(runDocSearch,140)});

  function refitForViewport(){
    clearTimeout(resizeTimer);resizeTimer=setTimeout(function(){
      mobileReader=isCompactReader();autoFit=true;zoom=1;updateControls();
      if(!pdfDoc||document.body.classList.contains('mobile-tools-open'))return;
      pdfDoc.getPage(page).then(function(pg){var b=pg.getViewport({scale:1}),landscape=b.width>b.height*1.03;if(mobileReader&&landscape){if(!continuous)buildContinuous(pg);else reflowContinuous()}else{if(continuous)disableContinuous();renderSinglePage()}});
    },180);
  }
  window.addEventListener('resize',refitForViewport);
  window.addEventListener('orientationchange',refitForViewport);
  if(window.visualViewport)window.visualViewport.addEventListener('resize',refitForViewport);
  if(window.screen&&screen.orientation&&screen.orientation.addEventListener)screen.orientation.addEventListener('change',refitForViewport);

  function dark(){document.documentElement.classList.toggle('dark',localStorage.getItem('efp_black_mode')==='on');var d=document.getElementById('darkBtn');if(d)d.textContent=document.documentElement.classList.contains('dark')?'Light':'Dark'}
  var darkBtn=document.getElementById('darkBtn');if(darkBtn)darkBtn.addEventListener('click',function(){localStorage.setItem('efp_black_mode',document.documentElement.classList.contains('dark')?'off':'on');dark()});
  dark();updateControls();loadPdf();loadPagesForSearch();
})();