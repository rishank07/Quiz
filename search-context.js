/* Search decoration only: preserve answers, attempts and search-return state. */
(function () {
  "use strict";
  if (window.EFP_SEARCH_CONTEXT || /^\/Mind(?:%20| )Maps\//i.test(location.pathname)) return;
  var bar=null,target=null,marks=[],current=0,activeKey="";
  var dismissed=new Set(),processed=new Set(),scheduled=false,pdfAdapter=null,pdfObserver=null;
  var style=document.createElement("link");style.rel="stylesheet";style.href="/search-context.css?v=20261004context1";document.head.appendChild(style);
  function savedQuery(){
    try{
      var token=new URL(location.href).searchParams.get("efSearchReturn")||(history.state&&history.state.efpSearchReturnToken);
      var saved=JSON.parse(sessionStorage.getItem("efp_search_return_v1:"+token)||"null");
      if(!saved||saved.token!==token||!Array.isArray(saved.inputs)||new URL(saved.source,location.origin).origin!==location.origin)return null;
      var input=saved.inputs.find(function(field){return String(field.value||"").trim()});
      return input?{token:token,query:String(input.value).trim().slice(0,160)}:null;
    }catch(_){return null}
  }
  function clearOutline(el){if(el)el.classList.remove("efp-deep-focus","efp-op-deep-focus","efp-bb-deep-focus")}
  function clear(){
    if(bar)bar.remove();
    marks.forEach(function(mark){if(mark.isConnected)mark.replaceWith(document.createTextNode(mark.textContent))});
    clearOutline(target);bar=null;target=null;marks=[];current=0;
    if(pdfObserver){pdfObserver.disconnect();pdfObserver=null}
    document.documentElement.classList.remove("efp-has-pdf-search-context");
    document.documentElement.style.removeProperty("--efp-search-head-height");
    document.documentElement.style.removeProperty("--efp-search-bar-height");
  }
  function button(label,text,handler){
    var el=document.createElement("button");el.type="button";el.textContent=text;el.setAttribute("aria-label",label);el.title=label;
    el.addEventListener("click",function(event){event.stopPropagation();handler()});return el;
  }
  function createBar(query,label,onDismiss){
    var el=document.createElement("div");el.className="efp-search-context";el.setAttribute("role","region");el.setAttribute("aria-label","Search result / खोज परिणाम");
    var description=document.createElement("div");description.className="efp-context-description";
    var text=document.createElement("span");text.textContent="Search: "+query;text.title=text.textContent;
    var detail=document.createElement("small");detail.className="efp-context-location";detail.textContent=label;
    description.appendChild(text);description.appendChild(detail);el.appendChild(description);
    var close=button("Clear search highlights / खोज हाइलाइट हटाएँ","×",onDismiss);close.className="efp-context-dismiss";el.appendChild(close);return el;
  }
  function markWords(root,query){
    var ignored=/^(the|and|for|with|from|was|are|hai|hain|में|और|का|की|के|है|से)$/i;
    var terms=[query].concat(query.split(/[^\p{L}\p{M}\p{N}]+/u).filter(function(s){return s.length>=2&&!ignored.test(s)})).filter(function(s,i,all){return s&&all.indexOf(s)===i});
    terms.sort(function(a,b){return b.length-a.length});
    var pattern=new RegExp("(^|[^\\p{L}\\p{M}\\p{N}])("+terms.map(function(s){return s.replace(/[.*+?^$()|[\]\\{}]/g,"\\$&")}).join("|")+")(?=$|[^\\p{L}\\p{M}\\p{N}])","giu");
    var excluded="script,style,button,a,label,input,textarea,select,svg,mark,[hidden],.hidden,"+
      ".options,.option,.option-text,.option-btn,.quiz-option,.explanation,.explanation-box,.explain-box,.exp-box,"+
      ".answer,.answer-box,.exp,.explain,.opt,.opts,.opt-en,.opt-hi,details,"+
      ".q-options,.q-exp,[id^='opts-'],[id^='exp-'],[onclick],.efp-search-context";
    var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(node){
      var parent=node.parentElement;if(!parent||parent.closest(excluded))return NodeFilter.FILTER_REJECT;
      return parent.getClientRects().length?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
    }});
    var nodes=[],node,result=[];while((node=walker.nextNode()))nodes.push(node);
    nodes.forEach(function(textNode){
      pattern.lastIndex=0;var text=textNode.nodeValue,match,offset=0,fragment=document.createDocumentFragment();
      while(result.length<200&&(match=pattern.exec(text))){
        var start=match.index+match[1].length;fragment.appendChild(document.createTextNode(text.slice(offset,start)));
        var mark=document.createElement("mark");mark.className="efp-context-match";mark.textContent=match[2];fragment.appendChild(mark);result.push(mark);offset=start+match[2].length;
      }
      if(offset){fragment.appendChild(document.createTextNode(text.slice(offset)));textNode.replaceWith(fragment)}
    });return result;
  }
  function questionLabel(el){
    var id=el.id||"";
    if(/^q-\d+$/.test(id))return "Question "+(Number(id.slice(2))+1);
    var rapid=/^rp-(\d+)-(\d+)$/.exec(id);if(rapid)return "Section "+(Number(rapid[1])+1)+" · Question "+(Number(rapid[2])+1);
    var set=/^s(\d+)-(\d+)$/.exec(id);if(set)return "Set "+set[1]+" · Question "+set[2];
    var match=/^(?:q|bbq-)(\d+)$/i.exec(id);if(match)return "Question "+match[1];
    if(/^ca-ol-/.test(id))return "One-liner "+id.split("-").pop();
    return "Matched section / खोज से खुला भाग";
  }
  function findTarget(){
    var hash;try{hash=decodeURIComponent(location.hash.slice(1))}catch(_){hash=""}
    var el=hash&&document.getElementById(hash);
    if(!el)el=document.querySelector(".efp-op-deep-focus,.efp-bb-deep-focus,.efp-deep-focus");
    if(!el){var q=new URL(location.href).searchParams.get("q");if(/^\d+$/.test(q||""))el=document.getElementById("q"+q)||document.getElementById("q-"+(Number(q)-1))}
    if(!el||/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)||!el.getClientRects().length||el.closest("#results,#searchResults,.efp-op-search-results,.efp-search-context"))return null;
    return el;
  }
  function syncQuiz(){
    if(pdfAdapter)return;var saved=savedQuery();if(!saved)return;var el=findTarget();
    if(!el){if(target&&!target.isConnected)clear();return}
    var key=saved.token+":"+el.id;if(dismissed.has(key)){clearOutline(el);return}
    if(processed.has(key)&&(!target||target===el||target.isConnected))return;
    processed.add(key);clear();activeKey=key;target=el;marks=markWords(el,saved.query);
    bar=createBar(saved.query,questionLabel(el),function(){
      dismissed.add(activeKey);window.scrollTo({top:scrollY,left:scrollX,behavior:"instant"});
      var anchor=target,top=anchor.getBoundingClientRect().top;clear();
      window.scrollBy({top:anchor.getBoundingClientRect().top-top,behavior:"instant"});
    });
    // Keep quiz card content and option event listeners independent of controls.
    el.parentNode.insertBefore(bar,el);
    if(marks.length){
      var next=button("Next search match / अगला खोज परिणाम","1/"+marks.length+" ↓",function(){
        marks[current].classList.remove("efp-context-current");current=(current+1)%marks.length;
        marks[current].classList.add("efp-context-current");marks[current].scrollIntoView({behavior:"instant",block:"center",inline:"nearest"});
        next.textContent=(current+1)+"/"+marks.length+" ↓";
      });next.className="efp-context-next";bar.insertBefore(next,bar.lastChild);marks[0].classList.add("efp-context-current");
    }
  }
  function measurePdfHeader(){
    var head=bar&&bar.parentElement;if(!head)return;
    document.documentElement.style.setProperty("--efp-search-head-height",Math.ceil(head.getBoundingClientRect().height)+"px");
    document.documentElement.style.setProperty("--efp-search-bar-height",Math.ceil(bar.getBoundingClientRect().height)+"px");
  }
  function syncPdf(){
    if(!pdfAdapter)return;var state=pdfAdapter.getState();
    if(!state||!state.visible||!state.query){if(bar)clear();return}
    var head=state.host;if(!head)return;
    if(!bar||bar.parentElement!==head){
      clear();bar=createBar(state.query,"",function(){pdfAdapter.dismiss();clear()});bar.classList.add("efp-pdf-search-context");
      if(pdfAdapter.move){
        var previous=button("Previous matching PDF page / पिछला खोज पृष्ठ","←",function(){pdfAdapter.move(-1)});
        var next=button("Next matching PDF page / अगला खोज पृष्ठ","→",function(){pdfAdapter.move(1)});
        previous.className="efp-context-prev";next.className="efp-context-next";bar.insertBefore(previous,bar.lastChild);bar.insertBefore(next,bar.lastChild);
      }
      head.appendChild(bar);document.documentElement.classList.add("efp-has-pdf-search-context");
      if(window.ResizeObserver){pdfObserver=new ResizeObserver(measurePdfHeader);pdfObserver.observe(head)}
    }
    var description=bar.querySelector(".efp-context-description span");description.textContent="Search: "+state.query;description.title=description.textContent;
    bar.querySelector(".efp-context-location").textContent=state.label;
    bar.querySelectorAll(".efp-context-prev,.efp-context-next").forEach(function(el){el.disabled=!state.total});measurePdfHeader();
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(function(){scheduled=false;syncQuiz()})}
  window.EFP_SEARCH_CONTEXT={
    refresh:schedule,
    isDismissed:function(el){var saved=savedQuery();return !!(saved&&el&&dismissed.has(saved.token+":"+el.id))},
    registerPdf:function(adapter){pdfAdapter=adapter;syncPdf()}
  };
  window.addEventListener("efp-pdf-search-context",function(){if(window.EFP_PDF_SEARCH_CONTEXT)pdfAdapter=window.EFP_PDF_SEARCH_CONTEXT;syncPdf()});
  window.addEventListener("hashchange",schedule);
  window.addEventListener("pageshow",function(){schedule();syncPdf()});
  window.addEventListener("resize",measurePdfHeader,{passive:true});
  function init(){
    if(window.EFP_PDF_SEARCH_CONTEXT){pdfAdapter=window.EFP_PDF_SEARCH_CONTEXT;syncPdf()}
    else if(document.getElementById("pdfFrame")){
      var saved=savedQuery();if(saved){var visible=true;window.EFP_SEARCH_CONTEXT.registerPdf({
        getState:function(){return{host:document.querySelector(".shell .head"),visible:visible,query:saved.query,label:"PDF result / खोज से खुली PDF"}},
        dismiss:function(){visible=false}
      })}
    }
    schedule();
    if(!savedQuery()&&!pdfAdapter&&!document.querySelector("#app,#questions-container,#quiz-container"))return;
    new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
