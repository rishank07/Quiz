/* ExamFusion Prep — Current Affairs Move to Top (v3 hard-cache-bust)
   Robust across browser scrolling, Android WebView and inner scrollers. */
(function(){
  "use strict";

  var ID="efp-ca-direct-top";
  var SHOW_AFTER=180;
  var activeScroller=null;
  var rafPending=false;

  function isStandardCurrentAffairsPage(){
    var p="";
    try{p=decodeURIComponent(window.location.pathname||"");}catch(_){p=window.location.pathname||"";}
    p=p.replace(/\\/g,"/").replace(/\/{2,}/g,"/");
    return /^\/Current Affairs\/Topic Names\/(?:2025|2026)\/(?:Month Wise|Topic Wise)\/[^/]+\.html$/i.test(p);
  }

  function installRenderStabilityFix(){
    if(!isStandardCurrentAffairsPage() || !document.head) return;
    if(document.getElementById("efp-ca-render-stability-v1")) return;

    var style=document.createElement("style");
    style.id="efp-ca-render-stability-v1";
    style.textContent=[
      "html,body{background-color:#0b101e!important;overscroll-behavior-y:none!important;}",
      ".question-card,.oneliner-card{-webkit-backdrop-filter:none!important;backdrop-filter:none!important;background:#161f2f!important;}",
      ".explanation-box{-webkit-backdrop-filter:none!important;backdrop-filter:none!important;background:#0e1628!important;}",
      ".star{animation:none!important;opacity:.38!important;transform:none!important;box-shadow:0 0 3px rgba(255,255,255,.28)!important;}",
      "#efp-app-back-button,#efp-home-button,#efp-move-top-button,#efp-ca-direct-top{-webkit-backdrop-filter:none!important;backdrop-filter:none!important;}",
      "@media(max-width:900px),(hover:none),(pointer:coarse){.question-card,.oneliner-card{box-shadow:0 6px 20px rgba(0,0,0,.22)!important;}.star-bg{contain:paint!important;}}"
    ].join("");
    document.head.appendChild(style);
    document.documentElement.classList.add("efp-ca-render-stable");
  }

  function mainY(){
    var de=document.documentElement;
    var b=document.body;
    return Math.max(
      window.pageYOffset||0,
      window.scrollY||0,
      de ? de.scrollTop||0 : 0,
      b ? b.scrollTop||0 : 0
    );
  }

  function innerY(){
    try{return activeScroller ? Number(activeScroller.scrollTop)||0 : 0;}catch(_){return 0;}
  }

  function currentY(){
    return Math.max(mainY(),innerY());
  }

  function homeSafeBottom(){
    var home=document.getElementById("efp-home-button");
    if(!home) return 16;
    try{
      var r=home.getBoundingClientRect();
      var cs=window.getComputedStyle ? window.getComputedStyle(home) : null;
      var visible=r.width>0 && r.height>0 &&
        (!cs || (cs.display!=="none" && cs.visibility!=="hidden" && parseFloat(cs.opacity||"1")>0));
      if(visible &&
         r.bottom>0 &&
         r.top<window.innerHeight &&
         r.top>window.innerHeight*0.45 &&
         r.left>window.innerWidth*0.45){
        return Math.max(16,Math.ceil(window.innerHeight-r.top+12));
      }
    }catch(_){}
    return 16;
  }

  function showState(btn,on){
    btn.style.opacity=on?"1":"0";
    btn.style.visibility=on?"visible":"hidden";
    btn.style.pointerEvents=on?"auto":"none";
    btn.style.transform=on?"translateY(0) scale(1)":"translateY(8px) scale(.96)";
  }

  function update(){
    rafPending=false;
    var btn=document.getElementById(ID);
    if(!btn) return;
    var bottom=homeSafeBottom();
    if(typeof window.EFP_MOVE_TOP_SAFE_BOTTOM==="function"){
      bottom=window.EFP_MOVE_TOP_SAFE_BOTTOM(btn,bottom);
    }
    btn.style.bottom=bottom+"px";
    showState(btn,currentY()>=SHOW_AFTER);
  }

  function schedule(){
    if(rafPending) return;
    rafPending=true;
    (window.requestAnimationFrame||function(fn){return setTimeout(fn,16);})(update);
  }

  function onScroll(ev){
    var t=ev && ev.target;
    if(t && t!==document && t!==window && typeof t.scrollTop==="number"){
      if(t.scrollTop>0) activeScroller=t;
      else if(activeScroller===t) activeScroller=null;
    }
    schedule();
  }

  function scrollElementTop(el,smooth){
    if(!el || el===window || el===document) return;
    try{
      if(typeof el.scrollTo==="function"){
        el.scrollTo({top:0,left:0,behavior:smooth?"smooth":"auto"});
      }else{
        el.scrollTop=0;
      }
    }catch(_){
      try{el.scrollTop=0;}catch(__){}
    }
  }

  function goTop(){
    var smooth=!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    scrollElementTop(activeScroller,smooth);
    try{
      window.scrollTo({top:0,left:0,behavior:smooth?"smooth":"auto"});
    }catch(_){
      try{window.scrollTo(0,0);}catch(__){}
    }
    try{if(document.documentElement) document.documentElement.scrollTop=0;}catch(_){}
    try{if(document.body) document.body.scrollTop=0;}catch(_){}
    activeScroller=null;
    setTimeout(update,80);
    setTimeout(update,350);
  }

  function build(){
    var btn=document.getElementById(ID);
    if(btn) return btn;

    btn=document.createElement("button");
    btn.id=ID;
    btn.type="button";
    btn.setAttribute("aria-label","Move to top");
    btn.setAttribute("title","Move to top");
    btn.textContent="↑";
    btn.style.cssText=[
      "position:fixed",
      "right:16px",
      "bottom:16px",
      "z-index:2147483646",
      "width:44px",
      "height:44px",
      "min-width:44px",
      "min-height:44px",
      "padding:0",
      "margin:0",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "border:1px solid rgba(246,217,138,.78)",
      "border-radius:50%",
      "background:#142238",
      "color:#ffd86b",
      "font:900 22px/1 system-ui,-apple-system,'Segoe UI',sans-serif",
      "box-shadow:0 7px 20px rgba(0,0,0,.34)",
      "cursor:pointer",
      "opacity:0",
      "visibility:hidden",
      "pointer-events:none",
      "transform:translateY(8px) scale(.96)",
      "transition:opacity .16s ease,transform .16s ease,visibility .16s ease",
      "-webkit-tap-highlight-color:transparent",
      "touch-action:manipulation"
    ].join(";");
    btn.addEventListener("click",goTop,{passive:true});
    (document.body||document.documentElement).appendChild(btn);
    return btn;
  }

  function install(){
    installRenderStabilityFix();
    build();
    window.addEventListener("scroll",onScroll,{passive:true,capture:true});
    document.addEventListener("scroll",onScroll,{passive:true,capture:true});
    window.addEventListener("resize",schedule,{passive:true});
    window.addEventListener("orientationchange",schedule,{passive:true});
    window.addEventListener("pageshow",schedule,{passive:true});
    if(window.ResizeObserver && document.body){
      var resizeObserver=new ResizeObserver(schedule);
      resizeObserver.observe(document.body);
      window.__efpCaTopResizeObserver=resizeObserver;
    }
    if(window.visualViewport){
      window.visualViewport.addEventListener("resize",schedule,{passive:true});
      window.visualViewport.addEventListener("scroll",schedule,{passive:true});
    }
    window.__efpCaTopPoll=setInterval(update,500);
    update();
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",install,{once:true});
  }else{
    install();
  }
})();
