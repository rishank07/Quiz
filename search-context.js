/* Search decoration only: preserve answers, attempts and search-return state. */
(function () {
  "use strict";
  if (window.EFP_SEARCH_CONTEXT || /^\/Mind(?:%20| )Maps\//i.test(location.pathname)) return;
  var bar=null,target=null,marks=[],current=0,activeKey="";
  var dismissed=new Set(),scheduled=false,pdfAdapter=null,pdfObserver=null;
  var pageRecords=[],recordCache="",recordProvider=null,viewKey="",viewRoots=[],selection="",scrollNext=false,entryCache="";
  var revealed=[];
  var optionPreviews=new Set();
  var appRestored=false,resumeState=null;
  var fuzzyMatches=false;
  var dockTopValue=null;
  var explanationSelector=".explanation,.explanation-box,.explain-box,.exp-box,.exp,.explain,.q-exp,[id^='exp-']";
  var optionSelector=".option,.option-text,.option-btn,.quiz-option,.opt,.opt-en,.opt-hi,.options label,.q-options label,[id^='opts-'] label,.options [onclick],.q-options [onclick],[id^='opts-'] [onclick]";
  var style=document.createElement("link");style.rel="stylesheet";style.href="/search-context-dock.css?v=20261005dock1";document.head.appendChild(style);
  var allowEntryFocus=true;
  function resolveDockTop(){
    if(dockTopValue!==null)return dockTopValue;
    var top=6;
    try{
      document.querySelectorAll("header,nav,.topnav,.tab-nav,.sticky-nav,.efp-op-topbar,.reader-head,.shell .head,#app>.max-w-3xl>.flex.items-center.justify-between.mb-3").forEach(function(el){
        if(!el||!el.getClientRects().length)return;
        var cs=getComputedStyle(el),pos=cs.position;if(pos!=="sticky"&&pos!=="fixed")return;
        var r=el.getBoundingClientRect();if(r.height<=0||r.height>180||r.bottom<=0||r.top>140)return;
        top=Math.max(top,Math.ceil(r.bottom)+4);
      });
    }catch(_){}
    dockTopValue=top;return top;
  }
  function measureDock(){
    if(!bar||!bar.isConnected||pdfAdapter||bar.classList.contains("efp-pdf-search-context"))return;
    document.documentElement.style.setProperty("--efp-search-dock-top",resolveDockTop()+"px");
    document.documentElement.classList.add("efp-has-search-dock");
    document.documentElement.style.setProperty("--efp-search-dock-height",Math.ceil(bar.getBoundingClientRect().height)+"px");
  }
  function mountDock(){
    if(!bar||pdfAdapter)return;
    if(bar.parentElement!==document.body)document.body.appendChild(bar);
    measureDock();
  }
  function scrollTargetBelowDock(){
    if(!target||!target.isConnected||!bar||!bar.isConnected||pdfAdapter)return;
    measureDock();
    var br=bar.getBoundingClientRect(),tr=target.getBoundingClientRect();
    var desired=Math.ceil(br.bottom)+10,delta=tr.top-desired;
    if(Math.abs(delta)>1)window.scrollBy({top:delta,left:0,behavior:"instant"});
  }
  // The stylesheet and the quiz's lazy section can finish in either order.
  // Re-measure only while entry focus is still ours, never after interaction
  // or an installed-app reading-position restore.
  style.addEventListener("load",function(){
    measureDock();
    if(allowEntryFocus&&!appRestored)requestAnimationFrame(centerBar);
  },{once:true});
  function centerBar(){
    if(!bar||!bar.isConnected||pdfAdapter)return;
    mountDock();scrollTargetBelowDock();
  }
  function focusTarget(el){
    var saved=savedQuery();
    if(!saved||dismissed.has(saved.token)||pdfAdapter)return false;
    if(!bar){schedule();return true}
    if(allowEntryFocus&&!appRestored&&(target===el||target&&el&&(target.contains(el)||el.contains(target))))centerBar();
    return true;
  }
  function savedQuery(){
    try{
      var params=new URL(location.href).searchParams;
      var token=params.get("efSearchReturn")||(history.state&&history.state.efpSearchReturnToken);
      var direct=String(params.get("efSearchQuery")||(/^\/Bihar(?:%20| )Special\//i.test(location.pathname)?params.get("efsearch"):"")||"").trim().slice(0,160);
      var saved=JSON.parse(sessionStorage.getItem("efp_search_return_v1:"+token)||"null");
      if(!saved||saved.token!==token||!Array.isArray(saved.inputs)||new URL(saved.source,location.origin).origin!==location.origin)return direct?{token:token||"query:"+direct,query:direct}:null;
      var input=saved.inputs.find(function(field){return String(field.value||"").trim()});
      return input?{token:token,query:String(input.value).trim().slice(0,160)}:null;
    }catch(_){return direct?{token:token||"query:"+direct,query:direct}:null}
  }
  function clearOutline(el){if(el)el.classList.remove("efp-deep-focus","efp-op-deep-focus","efp-bb-deep-focus")}
  function clear(){
    if(bar)bar.remove();
    marks.forEach(function(mark){if(mark.isConnected)mark.replaceWith(document.createTextNode(mark.textContent))});
    clearOutline(target);bar=null;target=null;marks=[];current=0;dockTopValue=null;
    if(pdfObserver){pdfObserver.disconnect();pdfObserver=null}
    document.documentElement.classList.remove("efp-has-pdf-search-context","efp-has-search-dock");
    document.documentElement.style.removeProperty("--efp-search-head-height");
    document.documentElement.style.removeProperty("--efp-search-bar-height");
    document.documentElement.style.removeProperty("--efp-search-dock-top");
    document.documentElement.style.removeProperty("--efp-search-dock-height");
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
  function queryTerms(query){
    var ignored=/^(the|and|for|with|from|was|are|hai|hain|में|और|का|की|के|है|से)$/i;
    return [query].concat(query.split(/[^\p{L}\p{M}\p{N}]+/u).filter(function(s){return s.length>=2&&!ignored.test(s)})).filter(function(s,i,all){return s&&all.indexOf(s)===i});
  }
  function highlightTerms(root,query){
    var terms=queryTerms(query),typedTerms=terms.slice(),tokens=Array.from(new Set((root.textContent||"").match(/[\p{L}\p{M}\p{N}]+/gu)||[]));
    if(typeof efTextMatches==="function")tokens.forEach(function(word){
      if(typedTerms.some(function(term){return efTextMatches(term,word,fuzzyMatches)}))terms.push(word);
    });
    return Array.from(new Set(terms));
  }
  function markWords(root,query,explanation){
    var terms=highlightTerms(root,query);
    terms.sort(function(a,b){return b.length-a.length});
    var pattern=new RegExp("(^|[^\\p{L}\\p{M}\\p{N}])("+terms.map(function(s){return s.replace(/[.*+?^$()|[\]\\{}]/g,"\\$&")}).join("|")+")(?=$|[^\\p{L}\\p{M}\\p{N}])","giu");
    var excluded="script,style,button,a,label,input,textarea,select,svg,mark,"+
      ".options,.option,.option-text,.option-btn,.quiz-option,.opt,.opts,.opt-en,.opt-hi,"+
      ".q-options,[id^='opts-'],[onclick],header,footer,nav,.efp-search-context";
    if(!explanation)excluded+=",[hidden],.hidden,.answer,.answer-box,details,"+explanationSelector;
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
  function optionRoots(root){
    var nodes=Array.from(root.querySelectorAll(optionSelector)).filter(function(node){return node.getClientRects().length});
    return nodes.filter(function(node){return !nodes.some(function(other){return other!==node&&node.contains(other)})});
  }
  function matchingOptions(root,query){return optionRoots(root).filter(function(node){return textMatches(query,node.textContent||"")})}
  function markOptionWords(root,query){
    var terms=highlightTerms(root,query);terms.sort(function(a,b){return b.length-a.length});
    var pattern=new RegExp("(^|[^\\p{L}\\p{M}\\p{N}])("+terms.map(function(s){return s.replace(/[.*+?^$()|[\]\\{}]/g,"\\$&")}).join("|")+")(?=$|[^\\p{L}\\p{M}\\p{N}])","giu");
    var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(node){
      var parent=node.parentElement;if(!parent||parent.closest("script,style,input,textarea,select,svg,mark,.efp-search-context"))return NodeFilter.FILTER_REJECT;
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
  function explanationRoots(root){
    var nodes=Array.from(root.querySelectorAll(explanationSelector+",details"));
    nodes=nodes.filter(function(node){return !node.matches("details")||node.matches(explanationSelector)||/explanation|solution|answer|व्याख्या|स्पष्टीकरण|उत्तर/i.test((node.querySelector("summary")||{}).textContent||"")});
    return nodes.filter(function(node){return !nodes.some(function(other){return other!==node&&other.contains(node)})});
  }
  function explanationVisible(node){return !!node.getClientRects().length&&(!node.matches("details")||node.open)}
  function matchingExplanations(root,query){
    var terms=queryTerms(query);
    return explanationRoots(root).filter(function(node){var text=resultText(node);return terms.some(function(term){return textMatches(term,text)})});
  }
  function revealExplanation(node,key){
    if(explanationVisible(node))return;
    revealed=revealed.filter(function(entry){return entry.node.isConnected});
    if(!revealed.some(function(entry){return entry.node===node}))revealed.push({node:node,key:key,hidden:node.hidden,open:node.open});
    node.hidden=false;node.classList.add("efp-context-revealed");
    if(node.matches("details"))node.open=true;
  }
  function clearRevealed(){
    optionPreviews.clear();
    revealed.forEach(function(entry){
      var node=entry.node;node.classList.remove("efp-context-revealed");
      var card=node.closest(".question-box,.qcard,.question-card,.quiz-question,[data-qid],[data-efp-bb-sn]")||node.parentElement;
      var answered=card&&card.querySelector(".answered,.correct,.incorrect,.wrong,.option-btn:disabled,.opt:disabled");
      if(!answered){if(entry.hidden)node.hidden=true;if(node.matches("details"))node.open=entry.open}
    });revealed=[];
  }
  function questionLabel(el){
    var id=el.id||"";
    if(/^q-\d+$/.test(id))return "Question "+(Number(id.slice(2))+1);
    var rapid=/^rp-(\d+)-(\d+)$/.exec(id);if(rapid)return "Section "+(Number(rapid[1])+1)+" · Question "+(Number(rapid[2])+1);
    var set=/^s(\d+)-(\d+)$/.exec(id);if(set)return "Set "+set[1]+" · Question "+set[2];
    var match=/^(?:q|bbq-)(\d+)$/i.exec(id);if(match)return "Question "+match[1];
    if(/^ca-ol-/.test(id))return "One-liner "+id.split("-").pop();
    var bihar=/^bihar-(?:fact|ca)-(\d+)/.exec(id);if(bihar)return "One-liner "+bihar[1];
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
  function textMatches(query,value){
    var parts=[];function text(v){if(typeof v==="string")parts.push(v.replace(/<[^>]*>/g," "));else if(v&&typeof v==="object")Object.keys(v).forEach(function(k){text(v[k])})}text(value);
    var hay=parts.join(" ");
    if(typeof efTextMatches==="function")return efTextMatches(query,hay,fuzzyMatches);
    var terms=query.toLocaleLowerCase().split(/[^\p{L}\p{M}\p{N}]+/u).filter(Boolean);
    hay=hay.toLocaleLowerCase();return terms.length&&terms.every(function(term){return hay.indexOf(term)>=0});
  }
  function resultText(root){
    var text=[],walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(node){return node.parentElement&&!node.parentElement.closest("script,style,button,a,label,input,textarea,select,svg,nav,header,footer,.options,.option,.option-text,.opt,.opts,.q-options,[id^='opts-'],.efp-search-context")?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}}),node;
    while((node=walker.nextNode()))text.push(node.nodeValue);
    optionRoots(root).forEach(function(option){text.push(option.textContent||"")});
    return text.join(" ");
  }
  var lazyProvider=null;
  function provider(){
    if(window.EFP_HTML_SEARCH_PAGE)return window.EFP_HTML_SEARCH_PAGE;
    if(lazyProvider)return lazyProvider;
    try{
      if(typeof SECTIONS!=="undefined"&&Array.isArray(SECTIONS)&&typeof openSection==="function"){
        lazyProvider={
          viewKey:function(){var card=document.querySelector("#questions .qcard,#quiz-container .qcard");return "rapid|"+(card?card.id.split("-")[1]:"")},currentKey:function(el){return el&&el.id||""},
          ready:function(){var id=location.hash.slice(1);return !/^rp-\d+-\d+$/.test(id)||!!document.getElementById(id)},
          results:function(query,matches){var out=[],number=0;SECTIONS.forEach(function(sec,si){sec.questions.forEach(function(q,qi){number++;if(matches(query,[q.q,q.o,q.options,q.a,q.exp]))out.push({key:"rp-"+si+"-"+qi,id:"rp-"+si+"-"+qi,section:si,label:"Section "+(si+1)+" · Q"+number})})});return out},
          element:function(row){return document.getElementById(row.id)},
          open:function(row){if(typeof onlyBookmarks!=="undefined"&&onlyBookmarks&&typeof toggleBookmarkFilter==="function")toggleBookmarkFilter();openSection(row.section)}
        };return lazyProvider;
      }
      if(typeof vocabData!=="undefined"&&Array.isArray(vocabData)&&typeof showSection==="function"&&document.getElementById("quiz-container")){
        lazyProvider={
          viewKey:function(){return "blackbook|"+(typeof activeLetter!=="undefined"?activeLetter:"")},currentKey:function(el){return el&&el.id||""},
          results:function(query,matches){return vocabData.filter(function(q){return matches(query,q)}).map(function(q){return {key:"bbq-"+q.sn,id:"bbq-"+q.sn,letter:String(q.word).trim().charAt(0).toUpperCase(),label:"Question "+q.sn}})},
          element:function(row){return document.getElementById(row.id)},open:function(row){showSection(row.letter)}
        };return lazyProvider;
      }
    }catch(_){}return null;
  }
  function domRoots(el){
    var questions=Array.from(document.querySelectorAll(".question-box,.qcard,.question-card,.quiz-question,.oneliner-item,#content .cd,.efp-bihar-bookmark-entry,[data-qid],[data-efp-bb-sn],[id]"))
      .filter(function(node){return !/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(node.tagName)&&
        (node.matches(".question-box,.qcard,.question-card,.quiz-question,.oneliner-item,#content .cd,.efp-bihar-bookmark-entry,[data-qid],[data-efp-bb-sn]")||/^(?:q-?\d+|bbq-\d+|rp-\d+-\d+|s\d+-\d+|ca-ol-.+)$/.test(node.id))});
    if(questions.length){
      var owners=new Set(questions);
      return questions.filter(function(node){for(var parent=node.parentElement;parent;parent=parent.parentElement)if(owners.has(parent))return false;return node.getClientRects().length||(/^s\d+-\d+$/.test(node.id)&&typeof showSet==="function")});
    }
    var units="tr,li,.section-card,.card,.flow-box,.fact,.event,.timeline-item,.node,.branch,.item,.box,.step";
    var scope=el&&el.closest("main")||document.body;
    var roots=Array.from(scope.querySelectorAll(units)).filter(function(node){return node.getClientRects().length&&!node.closest("header,footer,nav,#results,#searchResults,.efp-search-context")&&!node.querySelector(units)});
    return roots.length?roots:el?[el]:[];
  }
  function syncQuiz(){
    if(pdfAdapter)return;var saved=savedQuery();if(!saved)return;var adapter=provider(),el=findTarget();
    if(!appRestored&&window.EFP_APP_SESSION&&window.EFP_APP_SESSION.getSearchState){
      var state=window.EFP_APP_SESSION.getSearchState("html");
      if(state&&state.token===saved.token){
        appRestored=true;resumeState=state;viewKey="";
        if(state.dismissed)dismissed.add(saved.token);
      }
    }
    if(dismissed.has(saved.token)){
      if(bar){clear();clearRevealed()}if(el)clearOutline(el);
      if(resumeState){resumeState=null;window.EFP_APP_SESSION.restoreSearchScroll()}return;
    }
    var stamp=adapter?adapter.viewKey():"dom",cache=saved.token+":"+saved.query;
    if(entryCache!==cache&&adapter&&adapter.ready&&!adapter.ready())return;
    if(adapter&&(recordCache!==cache||recordProvider!==adapter||!pageRecords.length)){
      fuzzyMatches=false;
      pageRecords=adapter.results(saved.query,textMatches);recordCache=cache;recordProvider=adapter;
      if(!pageRecords.length){fuzzyMatches=true;pageRecords=adapter.results(saved.query,textMatches)}
    }
    var roots=adapter?pageRecords.map(function(row){return adapter.element(row)}).filter(function(node){return node&&node.getClientRects().length}):domRoots(el);
    if(!roots.length){if(target&&!target.isConnected){clear();viewRoots=[]}return}
    var signature=stamp+"|"+cache+"|"+roots.map(function(node){return node.id+":"+!!node.getClientRects().length+":"+node.textContent+":"+explanationRoots(node).map(explanationVisible).join(",")}).join("\n");
    if(viewKey===signature&&bar&&bar.isConnected&&roots.length===viewRoots.length&&roots.every(function(node,i){return node===viewRoots[i]}))return;
    if(stamp!==activeKey&&!scrollNext)selection="";
    if(resumeState)selection=resumeState.selection||"";
    var firstEntry=entryCache!==cache;entryCache=cache;
    clear();viewKey=signature;viewRoots=roots;activeKey=stamp;
    if(!adapter){
      fuzzyMatches=false;var matched=roots.filter(function(node){return textMatches(saved.query,resultText(node))});
      if(!matched.length){fuzzyMatches=true;matched=roots.filter(function(node){return textMatches(saved.query,resultText(node))})}
      pageRecords=matched.map(function(node,i){return {key:node.id||"dom-"+i,id:node.id,anchor:node,label:questionLabel(node)}});
    }
    function element(row){return adapter?adapter.element(row):row.anchor}
    var selected=selection&&pageRecords.find(function(row){return row.key===selection});
    if(!selected&&(el||adapter))selected=pageRecords.find(function(row){return adapter?row.key===adapter.currentKey(el):row.anchor===el||row.anchor.contains(el)||el.contains(row.anchor)});
    if(!selected)selected=pageRecords.find(function(row){var node=element(row);return node&&node.getClientRects().length});
    target=selected&&element(selected)||el;if(!target)return;
    selection=selected&&selected.key||"";current=Math.max(0,pageRecords.indexOf(selected));
    var groups=pageRecords.map(function(row){
      var node=element(row),items=[],options=[],optionMarks=[],explanations=[],explanationMarks=[];
      if(node&&node.getClientRects().length){
        items=markWords(node,saved.query);options=matchingOptions(node,saved.query);explanations=matchingExplanations(node,saved.query);
        if(resumeState&&Array.isArray(resumeState.previewed)&&resumeState.previewed.indexOf(row.key)>=0)optionPreviews.add(cache+"|"+row.key);
        if(optionPreviews.has(cache+"|"+row.key))options.forEach(function(option){optionMarks=optionMarks.concat(markOptionWords(option,saved.query))});
        if(resumeState&&Array.isArray(resumeState.revealed)&&resumeState.revealed.indexOf(row.key)>=0)explanations.forEach(function(exp){revealExplanation(exp,row.key)});
        explanations.forEach(function(exp){if(explanationVisible(exp))explanationMarks=explanationMarks.concat(markWords(exp,saved.query,true))});
      }
      items=items.concat(optionMarks,explanationMarks);marks=marks.concat(items);
      return {record:row,anchor:node,marks:items,options:options,optionMarks:optionMarks,explanations:explanations,explanationMarks:explanationMarks};
    });
    bar=createBar(saved.query,selected?selected.label:questionLabel(target),function(){
      dismissed.add(saved.token);window.scrollTo({top:scrollY,left:scrollX,behavior:"instant"});
      var anchor=target,top=anchor.getBoundingClientRect().top;clear();clearRevealed();
      window.scrollBy({top:anchor.getBoundingClientRect().top-top,behavior:"instant"});
    });
    var explanationButton=button("Show matching option or explanation without attempting / बिना प्रयास के मिला विकल्प या व्याख्या देखें","Dekho",function(){
      var group=groups[current];if(!group||(!group.options.length&&!group.explanations.length))return;
      if(group.options.length)optionPreviews.add(cache+"|"+group.record.key);
      group.options.forEach(function(option){
        if(!option.querySelector("mark.efp-context-match")){
          var found=markOptionWords(option,saved.query);group.optionMarks=group.optionMarks.concat(found);group.marks=group.marks.concat(found);marks=marks.concat(found);
        }
      });
      group.explanations.forEach(function(exp){
        revealExplanation(exp,group.record.key);
        if(!exp.querySelector("mark.efp-context-match")){
          var found=markWords(exp,saved.query,true);group.explanationMarks=group.explanationMarks.concat(found);group.marks=group.marks.concat(found);marks=marks.concat(found);
        }
      });
      focusGroup(false);
      var destination=group.optionMarks[0]||group.options[0]||group.explanationMarks[0]||group.explanations[0];
      if(destination)destination.scrollIntoView({behavior:"instant",block:"center",inline:"nearest"});
      schedule();
    });explanationButton.className="efp-context-explanation";bar.insertBefore(explanationButton,bar.lastChild);
    var explanationStatus=document.createElement("small");explanationStatus.className="efp-context-explanation-status";bar.querySelector(".efp-context-description").appendChild(explanationStatus);
    function focusGroup(scroll){
      marks.forEach(function(mark){mark.classList.remove("efp-context-current")});
      var group=groups[current];if(!group||!group.anchor)return;
      target=group.anchor;group.marks.forEach(function(mark){mark.classList.add("efp-context-current")});
      mountDock();bar.querySelector(".efp-context-location").textContent=group.record.label;
      var hasOptions=group.options.length>0,hasExplanations=group.explanations.length>0,hasSpecial=hasOptions||hasExplanations;
      explanationButton.hidden=!hasSpecial;explanationStatus.hidden=!hasSpecial;
      explanationStatus.textContent=hasOptions&&hasExplanations?"Match option/explanation mein hai":hasOptions?"Match option mein hai":hasExplanations?"Match explanation mein hai":"";
      var optionPending=hasOptions&&!group.optionMarks.length;
      explanationButton.textContent=(optionPending||group.explanations.some(function(exp){return !explanationVisible(exp)}))?"Dekho":"Dekho ↓";
      measureDock();if(scroll)centerBar();
    }
    mountDock();
    if(groups.length){
      var next=button("Next matched question or section / अगला मिला प्रश्न या भाग",(current+1)+"/"+groups.length+(groups.length>1?" ↓":""),function(){
        if(groups.length<2)return;
        current=(current+1)%groups.length;selection=groups[current].record.key;
        var node=element(groups[current].record);
        var record=groups[current].record;
        function remember(){try{var url=new URL(location.href);if(adapter&&record.qi!==undefined){url.searchParams.set("q",String(record.qi+1));url.hash=""}else if(record.id)url.hash=record.id;history.replaceState(history.state,"",url.pathname+url.search+url.hash)}catch(_){}}
        if(adapter){scrollNext=true;viewKey="";adapter.open(record);remember();schedule();return}
        if(node&&!node.getClientRects().length&&/^s(\d+)-/.test(node.id)&&typeof showSet==="function"){
          scrollNext=true;showSet(/^s(\d+)-/.exec(node.id)[1]);remember();schedule();return;
        }
        remember();focusGroup(true);
        next.textContent=(current+1)+"/"+groups.length+" ↓";
      });next.className="efp-context-next";next.disabled=groups.length===1;bar.insertBefore(next,bar.lastChild);
      focusGroup(scrollNext||(!resumeState&&firstEntry&&allowEntryFocus));scrollNext=false;
    }else if(!resumeState&&firstEntry&&allowEntryFocus)centerBar();
    if(resumeState){resumeState=null;window.EFP_APP_SESSION.restoreSearchScroll()}
  }
  function measurePdfHeader(){
    var head=bar&&bar.parentElement;if(!head||!bar.classList.contains("efp-pdf-search-context"))return;
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
    beginEntry:function(){
      clear();clearRevealed();allowEntryFocus=true;appRestored=false;
      resumeState=null;viewKey="";entryCache="";selection="";scrollNext=false;
      schedule();
    },
    focusTarget:focusTarget,
    snapshot:function(){
      if(pdfAdapter&&pdfAdapter.snapshot)return pdfAdapter.snapshot();
      var saved=savedQuery();if(!saved||(!bar&&!dismissed.has(saved.token)))return null;
      return {kind:"html",token:saved.token,selection:selection,dismissed:dismissed.has(saved.token),
        previewed:pageRecords.filter(function(row){return optionPreviews.has(saved.token+":"+saved.query+"|"+row.key)}).map(function(row){return row.key}),
        revealed:revealed.filter(function(entry){return entry.node.isConnected}).map(function(entry){return entry.key})};
    },
    isDismissed:function(el){var saved=savedQuery();return !!(saved&&el&&dismissed.has(saved.token))},
    registerPdf:function(adapter){pdfAdapter=adapter;syncPdf()}
  };
  window.addEventListener("efp-pdf-search-context",function(){if(window.EFP_PDF_SEARCH_CONTEXT)pdfAdapter=window.EFP_PDF_SEARCH_CONTEXT;syncPdf()});
  window.addEventListener("efp-app-search-resume",function(){viewKey="";schedule()});
  window.addEventListener("hashchange",function(){viewKey="";selection="";schedule()});
  window.addEventListener("pageshow",function(){schedule();syncPdf()});
  window.addEventListener("resize",function(){dockTopValue=null;measurePdfHeader();measureDock()},{passive:true});
  ["pointerdown","touchstart","wheel","keydown"].forEach(function(name){
    window.addEventListener(name,function(){allowEntryFocus=false},{passive:true});
  });
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
    new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class","style","hidden","open"]});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
