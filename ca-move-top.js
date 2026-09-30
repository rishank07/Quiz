/* ExamFusion Prep — dedicated Current Affairs Move to Top */
(function(){
  "use strict";
  var ID="efp-ca-direct-top";
  var STYLE_ID="efp-ca-direct-top-style";
  var SHOW_AFTER=220;
  var MIN_RANGE=300;

  function scrollRoot(){
    return document.scrollingElement || document.documentElement || document.body;
  }

  function scrollRange(){
    var root=scrollRoot();
    var h=Math.max(
      root ? root.scrollHeight : 0,
      document.documentElement ? document.documentElement.scrollHeight : 0,
      document.body ? document.body.scrollHeight : 0
    );
    return Math.max(0,h-window.innerHeight);
  }

  function injectStyle(){
    if(!document.head || document.getElementById(STYLE_ID)) return;
    var s=document.createElement("style");
    s.id=STYLE_ID;
    s.textContent=
      "#"+ID+"{position:fixed!important;right:max(14px,env(safe-area-inset-right))!important;"+
      "bottom:var(--efp-ca-top-bottom,max(14px,env(safe-area-inset-bottom)))!important;"+
      "z-index:2147483646!important;width:46px;height:46px;min-width:46px;min-height:46px;padding:0!important;"+
      "display:flex!important;align-items:center;justify-content:center;border:1px solid rgba(246,217,138,.72)!important;"+
      "border-radius:50%!important;background:linear-gradient(145deg,rgba(10,18,32,.97),rgba(28,43,67,.96))!important;"+
      "color:#ffd86b!important;font:900 23px/1 system-ui,-apple-system,'Segoe UI',sans-serif!important;"+
      "box-shadow:0 8px 24px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.10)!important;"+
      "-webkit-backdrop-filter:blur(9px);backdrop-filter:blur(9px);cursor:pointer!important;"+
      "opacity:0;visibility:hidden;pointer-events:none;transform:translateY(8px) scale(.96);"+
      "transition:opacity .18s ease,visibility .18s ease,transform .18s ease!important}"+
      "#"+ID+".show{opacity:1!important;visibility:visible!important;pointer-events:auto!important;transform:translateY(0) scale(1)!important}"+
      "#"+ID+":hover{border-color:#ffe9a8!important;background:linear-gradient(145deg,#172740,#294464)!important}"+
      "#"+ID+":focus-visible{outline:3px solid #ffd866!important;outline-offset:3px!important}"+
      "@media(max-width:639px){#"+ID+"{width:42px;height:42px;min-width:42px;min-height:42px;font-size:21px!important}}"+
      "@media(prefers-reduced-motion:reduce){#"+ID+"{transition:none!important}}"+
      "@media(print){#"+ID+"{display:none!important}}";
    document.head.appendChild(s);
  }

  function position(button){
    var home=document.getElementById("efp-home-button");
    if(!home){
      button.style.removeProperty("--efp-ca-top-bottom");
      return;
    }
    var rect=home.getBoundingClientRect();
    var cs=window.getComputedStyle ? window.getComputedStyle(home) : null;
    var visible=rect.width>0 && rect.height>0 &&
      (!cs || (cs.display!=="none" && cs.visibility!=="hidden" && parseFloat(cs.opacity||"1")>0));
    if(visible && rect.top>window.innerHeight*.45 && rect.left>window.innerWidth*.45){
      button.style.setProperty("--efp-ca-top-bottom",
        Math.max(14,Math.ceil(window.innerHeight-rect.top+(window.innerWidth<=639?12:14)))+"px");
    }else{
      button.style.removeProperty("--efp-ca-top-bottom");
    }
  }

  function update(){
    var b=document.getElementById(ID);
    if(!b) return;
    var root=scrollRoot();
    var y=Math.max(window.pageYOffset||0, root ? root.scrollTop||0 : 0);
    var range=scrollRange();
    position(b);
    b.classList.toggle("show", range>=MIN_RANGE && y>=SHOW_AFTER);
  }

  function install(){
    if(!document.documentElement) return;
    injectStyle();
    var b=document.getElementById(ID);
    if(!b){
      b=document.createElement("button");
      b.id=ID;
      b.type="button";
      b.setAttribute("aria-label","Move to top");
      b.setAttribute("title","Move to top");
      b.innerHTML='<span aria-hidden="true">&#8593;</span>';
      b.addEventListener("click",function(){
        var reduce=window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({top:0,left:0,behavior:reduce?"auto":"smooth"});
      });
      document.documentElement.appendChild(b);
    }
    if(!window.__efpCaDirectTopInstalled){
      window.__efpCaDirectTopInstalled=true;
      var queued=false;
      function schedule(){
        if(queued) return;
        queued=true;
        requestAnimationFrame(function(){queued=false;update();});
      }
      addEventListener("scroll",schedule,{passive:true});
      addEventListener("resize",schedule,{passive:true});
      addEventListener("orientationchange",schedule,{passive:true});
      addEventListener("pageshow",schedule);
      if(window.ResizeObserver){
        var ro=new ResizeObserver(schedule);
        if(document.documentElement) ro.observe(document.documentElement);
        if(document.body) ro.observe(document.body);
        window.__efpCaDirectTopRO=ro;
      }
    }
    update();
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
})();
