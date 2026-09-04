(function(){
"use strict";
var PAGE_FILE=decodeURIComponent((location.pathname.split("/").pop()||"").toLowerCase());
var CONFIGS={
 "history_complete_practice.html":{slug:"history",label:"History"},
 "polity_complete_practice.html":{slug:"polity",label:"Polity"},
 "science_complete_practice.html":{slug:"science",label:"Science"},
 "geography_complete_practice.html":{slug:"geography",label:"Geography"}
};
var CFG=CONFIGS[PAGE_FILE]||{slug:"practice",label:"Practice"};
var PROGRESS_KEY="efp_visited_originalpractice_"+CFG.slug;
var BOOKMARK_KEY="efp_bookmarks";
var bookmarkOnly=false;
var pendingDeepQuestion=null;

// All Original Practice pages use the same site-wide dark-mode preference as
// ExamFusion Home. The four Complete Practice HTML files are very large, so
// guarantee the shared controller here instead of duplicating theme code in
// every question bank. This also keeps future subjects automatically synced.
function ensureSharedDarkMode(){
 try{
  if(typeof window.toggleBlackMode==="function")return;
  var scripts=document.scripts||[];
  for(var i=0;i<scripts.length;i++){
   if(/(?:^|\/)black-mode\.js(?:[?#]|$)/.test(scripts[i].src||""))return;
  }
  var wantsOn=localStorage.getItem("efp_black_mode")==="on";
  if(wantsOn)document.documentElement.style.visibility="hidden";
  var s=document.createElement("script");
  s.src=new URL("../black-mode.js?v=20260905opdark1",document.baseURI).href;
  s.async=false;
  s.onerror=function(){document.documentElement.style.visibility=""};
  (document.head||document.documentElement).appendChild(s);
 }catch(e){document.documentElement.style.visibility=""}
}
ensureSharedDarkMode();

// Keeps attempted answers alive while the user moves between sections of the same chapter.
// This is deliberately session/in-memory state so a fresh chapter attempt still starts clean.
if(!state.answerMap) state.answerMap={};
function answerStateKey(sectionIndex,qi){return String(sectionIndex)+"-"+String(qi)}
function restoreAnsweredSection(){
 var secIndex=state.currentSection;
 var sec=state.quizData&&state.quizData[secIndex];
 if(!sec||!state.answerMap)return;
 sec.questions.forEach(function(q,qi){
  var saved=state.answerMap[answerStateKey(secIndex,qi)];
  if(!saved)return;
  var order=state.shuffleMap[answerStateKey(secIndex,qi)];
  if(!order)return;
  var btns=document.querySelectorAll("#opts-"+qi+" .option-btn");
  if(!btns.length)return;
  var correctOrigIdx=currentAnswerIndex(q);
  var selectedDisplayIdx=order.indexOf(saved.selectedOrigIdx);
  var correctDisplayIdx=order.indexOf(correctOrigIdx);
  btns.forEach(function(b){b.classList.add("answered");b.onclick=null});
  if(selectedDisplayIdx>=0&&btns[selectedDisplayIdx]){
   btns[selectedDisplayIdx].classList.add(saved.selectedOrigIdx===correctOrigIdx?"correct":"incorrect");
  }
  if(saved.selectedOrigIdx!==correctOrigIdx&&correctDisplayIdx>=0&&btns[correctDisplayIdx]){
   btns[correctDisplayIdx].classList.add("correct");
  }
  var exp=document.getElementById("exp-"+qi);
  if(exp)exp.classList.remove("hidden");
 });
}
function safeParse(s,f){try{var v=JSON.parse(s);return v==null?f:v}catch(e){return f}}
function unique(arr){var seen={},out=[];(arr||[]).forEach(function(x){x=String(x);if(!seen[x]){seen[x]=1;out.push(x)}});return out}
function getVisited(){return unique(safeParse(localStorage.getItem(PROGRESS_KEY),[]))}
function saveVisited(v){try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(unique(v)))}catch(e){}}
function token(subject,chapter){return subject+"||"+chapter}
function markVisited(subject,chapter){if(!subject||!chapter)return;var v=getVisited(),t=token(subject,chapter);if(v.indexOf(t)<0){v.push(t);saveVisited(v)}}
function isVisited(subject,chapter){return getVisited().indexOf(token(subject,chapter))>=0}
function getBookmarks(){var v=safeParse(localStorage.getItem(BOOKMARK_KEY),{});return v&&typeof v==="object"&&!Array.isArray(v)?v:{}}
function saveBookmarks(v){try{localStorage.setItem(BOOKMARK_KEY,JSON.stringify(v))}catch(e){}}
function enc(v){return encodeURIComponent(String(v==null?"":v))}
function qKey(qi){return location.pathname+"#op|"+CFG.slug+"|"+enc(state.subject)+"|"+enc(state.chapterName)+"|"+state.currentSection+"|"+qi}
function pagePrefix(){return location.pathname+"#op|"+CFG.slug+"|"}
function pageBookmarkCount(){var b=getBookmarks(),p=pagePrefix(),n=0;Object.keys(b).forEach(function(k){if(b[k]&&k.indexOf(p)===0)n++});return n}
function track(name,params){try{if(typeof gtag==="function")gtag("event",name,params||{})}catch(e){}}
function hiName(subject,chapter){
 try{if(typeof CHAPTER_HI!=="undefined"&&CHAPTER_HI[subject]&&CHAPTER_HI[subject][chapter])return CHAPTER_HI[subject][chapter]}catch(e){}
 var parts=String(chapter).split(" - ");if(parts.length>1&&/[\u0900-\u097f]/.test(parts[parts.length-1]))return parts[parts.length-1];return "";
}
function enName(chapter){var parts=String(chapter).split(" - ");if(parts.length>1&&/[\u0900-\u097f]/.test(parts[parts.length-1]))return parts.slice(0,-1).join(" - ");return String(chapter)}
function norm(s){return String(s||"").toLowerCase().replace(/[’‘`]/g,"'").replace(/[^a-z0-9\u0900-\u097f]+/g," ").replace(/\s+/g," ").trim()}
function allChapters(subjectOnly){var out=[];Object.keys(MASTER).forEach(function(s){if(subjectOnly&&s!==subjectOnly)return;Object.keys(MASTER[s]).forEach(function(c){out.push({subject:s,chapter:c,en:enName(c),hi:hiName(s,c)})})});return out}
function countVisited(subject){var n=0;Object.keys(MASTER[subject]||{}).forEach(function(c){if(isVisited(subject,c))n++});return n}
function syncUrl(mode){try{var u=new URL(location.href);u.search="";if(mode!=="home"&&state.subject)u.searchParams.set("subject",state.subject);if(mode==="quiz"&&state.chapterName){u.searchParams.set("chapter",state.chapterName);u.searchParams.set("section",String((state.currentSection||0)+1))}history.replaceState(null,"",u.pathname+u.search+u.hash)}catch(e){}}
function addTopbar(){var app=document.getElementById("app");if(!app||app.querySelector(".efp-op-topbar"))return;var bar=document.createElement("div");bar.className="efp-op-topbar";bar.innerHTML='<a href="./index.html">Original Practice Home</a><a href="../index.html">ExamFusion Home</a><button type="button" id="efpOpDark" hidden aria-hidden="true" tabindex="-1">Dark Mode: <span>OFF</span></button>';app.insertBefore(bar,app.firstChild);var btn=bar.querySelector("#efpOpDark");function sync(){var on=false;try{on=localStorage.getItem("efp_black_mode")==="on"}catch(e){}btn.querySelector("span").textContent=on?"ON":"OFF"}sync();document.addEventListener("efp-black-mode-changed",sync)}
var opFullSearchClient=null;
function getOpFullSearchClient(){
 if(opFullSearchClient)return opFullSearchClient;
 if(typeof efCreateSearchWorker!=="function")return null;
 opFullSearchClient=efCreateSearchWorker({
  workerUrl:new URL("../search-worker.js?v=20260904v8",document.baseURI).href,
  logicUrl:new URL("../search-logic.js?v=20260904v8",document.baseURI).href,
  indexUrl:new URL("../search-snippets-original-practice.js?v=20260904v8",document.baseURI).href,
  mode:"snippet",
  globalName:"EF_ORIGINAL_PRACTICE_SNIPPET_INDEX",
  sectionPrefix:"./Original%20Practice/",
  limit:30
 });
 return opFullSearchClient;
}
function decodeOpSearchHit(hit){var raw=String(hit&&hit.x||""),qi=-1;if(raw){var c=raw.charCodeAt(0);if(c>=0xE000&&c<=0xF8FF){qi=c-0xE000;raw=raw.slice(1).replace(/^\s+/,"")}}var rel=String(hit&&hit.f||"").replace(/^\.\//,"");var url=new URL("../"+rel,location.href).href;if(qi>=0)url+=(url.indexOf("?")<0?"?":"&")+"q="+(qi+1);return{url:url,text:raw,qi:qi}}
function opSearchSnippet(text,q){text=String(text||"");var terms=norm(q).split(" ").filter(Boolean),low=text.toLowerCase(),pos=-1;for(var i=0;i<terms.length;i++){var p=low.indexOf(terms[i]);if(p>=0&&(pos<0||p<pos))pos=p}var start=pos<0?0:Math.max(0,pos-55),end=Math.min(text.length,start+210);return(start>0?"…":"")+text.slice(start,end)+(end<text.length?"…":"")}
function searchPanel(subjectOnly){
 var box=document.createElement("div");box.className="efp-op-search";box.innerHTML='<div class="efp-op-search-row"><span aria-hidden="true">🔎</span><input type="search" autocomplete="off" placeholder="Search chapter or question / अध्याय या प्रश्न खोजें…" aria-label="Search Original Practice chapters and questions"></div><div class="efp-op-search-results" aria-live="polite"></div>';
 var input=box.querySelector("input"),results=box.querySelector(".efp-op-search-results"),records=allChapters(subjectOnly),seq=0,timer=null;
 input.addEventListener("input",function(){
  var rawQ=input.value.trim(),q=norm(rawQ),my=++seq;clearTimeout(timer);results.innerHTML="";if(q.length<2)return;
  var terms=q.split(" "),hits=records.filter(function(r){var hay=norm(r.subject+" "+r.en+" "+r.hi);return terms.every(function(t){return hay.indexOf(t)>=0})}).slice(0,12);
  if(hits.length){var h=document.createElement("div");h.className="efp-op-search-heading";h.textContent="Chapters / अध्याय";results.appendChild(h)}
  hits.forEach(function(r){var b=document.createElement("button");b.type="button";b.className="efp-op-search-result";b.innerHTML="<strong>"+escapeHtml(r.en)+(r.hi?" / "+escapeHtml(r.hi):"")+"</strong><small>"+escapeHtml(r.subject)+"</small>";b.addEventListener("click",function(){goToChapters(r.subject);goToQuiz(r.chapter)});results.appendChild(b)});
  var loading=document.createElement("div");loading.className="efp-op-search-loading";loading.textContent="Searching questions… / प्रश्न खोजे जा रहे हैं…";results.appendChild(loading);
  timer=setTimeout(function(){var client=getOpFullSearchClient();if(!client){loading.textContent="Loading full-text search… / पूर्ण खोज लोड हो रही है…";return}client.search(rawQ).then(function(full){if(my!==seq||input.value.trim()!==rawQ)return;loading.remove();full=Array.isArray(full)?full:[];full=full.filter(function(hit){return String(hit.b||"").indexOf("Original Practice / "+CFG.label+" /")===0});var seen={},rows=[];full.forEach(function(hit){var d=decodeOpSearchHit(hit);if(!d.url||seen[d.url])return;seen[d.url]=1;rows.push({hit:hit,d:d})});rows=rows.slice(0,12);if(rows.length){var h=document.createElement("div");h.className="efp-op-search-heading";h.textContent="Question Matches / प्रश्न मिलान";results.appendChild(h)}rows.forEach(function(row){var a=document.createElement("a");a.className="efp-op-search-result efp-op-search-question";a.href=row.d.url;a.innerHTML="<strong>"+escapeHtml(row.hit.t||"Question match")+"</strong><small>"+escapeHtml(row.hit.b||"Original Practice")+"</small><span>"+escapeHtml(opSearchSnippet(row.d.text,rawQ))+"</span>";results.appendChild(a)});if(!hits.length&&!rows.length){results.innerHTML='<div class="efp-op-search-none">No matching chapter or question / कोई मिलान नहीं मिला</div>'}}).catch(function(){if(my===seq){loading.remove();if(!hits.length)results.innerHTML='<div class="efp-op-search-none">Question search could not load. Please retry.</div>';opFullSearchClient=null}})},120)
 });
 return box
}
function escapeHtml(v){return String(v).replace(/[&<>\"]/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]})}
function addProgress(subject,host){if(!host)return;var total=Object.keys(MASTER[subject]||{}).length,done=countVisited(subject),pct=total?Math.round(done*100/total):0;var wrap=document.createElement("div");wrap.className="efp-op-progress";wrap.innerHTML='<div class="efp-op-progress-head"><span>Chapter progress / अध्याय प्रगति: '+done+' / '+total+'</span><button class="efp-op-progress-reset" type="button">Reset</button></div><div class="efp-op-progress-track"><div class="efp-op-progress-fill" style="width:'+pct+'%"></div></div>';wrap.querySelector("button").addEventListener("click",function(){if(confirm("Reset opened-chapter progress for "+CFG.label+"?")){localStorage.removeItem(PROGRESS_KEY);render()}});host.appendChild(wrap)}
function enhanceHome(){var root=document.querySelector("#app .max-w-5xl");if(!root)return;var header=root.querySelector(".text-center.mb-10");if(header)header.insertAdjacentElement("afterend",searchPanel(null));var cards=root.querySelectorAll('div[onclick^="goToChapters"]');var subjects=Object.keys(MASTER);cards.forEach(function(card,i){var s=subjects[i];if(!s)return;card.setAttribute("role","button");card.setAttribute("tabindex","0");card.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();goToChapters(s)}});var p=document.createElement("span");p.className="efp-op-card-progress";p.textContent=countVisited(s)+" / "+Object.keys(MASTER[s]).length+" chapters opened";var target=card.querySelector(".p-5")||card;p && target.appendChild(p)});var note=document.createElement("div");note.className="efp-op-original-note";note.textContent="यह अभ्यास सामग्री ExamFusion Prep द्वारा प्रतियोगी परीक्षाओं की तैयारी के लिए स्वतंत्र रूप से तैयार की गई है।";root.appendChild(note)}
function enhanceChapters(){var root=document.querySelector("#app .max-w-4xl");if(!root||!state.subject)return;var header=root.querySelector(".mb-6");if(header){var holder=document.createElement("div");header.insertAdjacentElement("afterend",holder);addProgress(state.subject,holder);holder.insertAdjacentElement("afterend",searchPanel(state.subject))}var cards=root.querySelectorAll('div[onclick^="goToQuiz"]'),names=Object.keys(MASTER[state.subject]||{});cards.forEach(function(card,i){var c=names[i];if(!c)return;card.setAttribute("role","button");card.setAttribute("tabindex","0");card.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();goToQuiz(c)}});if(isVisited(state.subject,c))card.classList.add("efp-op-visited")})}
function toggleBookmark(qi,button){var b=getBookmarks(),k=qKey(qi);if(b[k])delete b[k];else b[k]=true;saveBookmarks(b);track("original_practice_bookmark",{subject:state.subject,chapter:state.chapterName,bookmarked:!!b[k]});applyBookmarkFilter();updateBookmarkBar()}
function updateBookmarkBar(){var bar=document.querySelector(".efp-op-bookmarkbar");if(!bar)return;var meta=bar.querySelector(".efp-op-bookmark-meta");if(meta)meta.textContent="⭐ "+pageBookmarkCount()+" saved on this subject page";var btn=bar.querySelector("button");if(btn){btn.classList.toggle("active",bookmarkOnly);btn.textContent=bookmarkOnly?"Show all questions":"Bookmarked only"}}
function applyBookmarkFilter(){var b=getBookmarks(),cards=document.querySelectorAll("#questions-container > [id^='q-']"),shown=0;cards.forEach(function(card){var qi=Number((card.id||"").replace("q-","")),yes=!!b[qKey(qi)];var star=card.querySelector(".efp-op-star");if(star){star.textContent=yes?"★":"☆";star.classList.toggle("is-bookmarked",yes);star.setAttribute("aria-label",yes?"Remove bookmark":"Bookmark this question")}var hide=bookmarkOnly&&!yes;card.classList.toggle("efp-op-bookmark-hidden",hide);if(!hide)shown++});var empty=document.querySelector(".efp-op-empty");if(empty)empty.classList.toggle("show",bookmarkOnly&&shown===0)}
function enhanceQuiz(){var cont=document.getElementById("questions-container");if(!cont)return;var bar=document.createElement("div");bar.className="efp-op-bookmarkbar";bar.innerHTML='<span class="efp-op-bookmark-meta"></span><button type="button"></button>';bar.querySelector("button").addEventListener("click",function(){bookmarkOnly=!bookmarkOnly;applyBookmarkFilter();updateBookmarkBar()});cont.parentNode.insertBefore(bar,cont);var cards=cont.querySelectorAll(":scope > [id^='q-']");cards.forEach(function(card){card.classList.add("efp-op-qcard");var qi=Number((card.id||"").replace("q-",""));var star=document.createElement("button");star.type="button";star.className="efp-op-star";star.addEventListener("click",function(e){e.stopPropagation();toggleBookmark(qi,star)});card.appendChild(star)});var empty=document.createElement("div");empty.className="efp-op-empty";empty.textContent="No bookmarked questions in this section / इस सेक्शन में कोई बुकमार्क प्रश्न नहीं है।";cont.insertAdjacentElement("afterend",empty);restoreAnsweredSection();applyBookmarkFilter();updateBookmarkBar()}
function enhance(){addTopbar();if(state.screen==="home")enhanceHome();else if(state.screen==="chapters")enhanceChapters();else if(state.screen==="quiz")enhanceQuiz()}
var baseSelectOption=selectOption;
selectOption=function(qi,displayIdx){
 var k=answerStateKey(state.currentSection,qi);
 if(state.answerMap&&state.answerMap[k])return;
 var order=state.shuffleMap[k];
 if(!order||displayIdx<0||displayIdx>=order.length)return;
 var selectedOrigIdx=order[displayIdx];
 baseSelectOption(qi,displayIdx);
 if(!state.answerMap)state.answerMap={};
 state.answerMap[k]={selectedOrigIdx:selectedOrigIdx};
 track("original_practice_answer",{practice:CFG.label,subject:state.subject,chapter:state.chapterName,section:state.currentSection+1,question:qi+1,correct:selectedOrigIdx===currentAnswerIndex(state.quizData[state.currentSection].questions[qi])});
};
var baseRender=render;render=function(){baseRender();enhance();if(state.screen==="quiz"&&pendingDeepQuestion!==null){var qi=pendingDeepQuestion;pendingDeepQuestion=null;setTimeout(function(){var card=document.getElementById("q-"+qi);if(!card)return;card.classList.add("efp-op-deep-focus");try{card.scrollIntoView({behavior:"smooth",block:"center"})}catch(e){card.scrollIntoView()}setTimeout(function(){card.classList.remove("efp-op-deep-focus")},2200)},80)}};
var baseSwitchSection=switchSection;switchSection=function(i){pendingDeepQuestion=null;baseSwitchSection(i);syncUrl("quiz")};
var basePrevSection=prevSection;prevSection=function(){pendingDeepQuestion=null;basePrevSection();if(state.screen==="quiz")syncUrl("quiz")};
var baseNextSection=nextSection;nextSection=function(){pendingDeepQuestion=null;baseNextSection();if(state.screen==="quiz")syncUrl("quiz")};
var baseGoHome=goHome;goHome=function(){baseGoHome();syncUrl("home")};
var baseGoToChapters=goToChapters;goToChapters=function(subject){baseGoToChapters(subject);syncUrl("chapters");track("original_practice_subject_open",{practice:CFG.label,subject:subject})};
var baseGoToQuiz=goToQuiz;goToQuiz=function(chapterName){state.answerMap={};markVisited(state.subject,chapterName);baseGoToQuiz(chapterName);syncUrl("quiz");track("original_practice_chapter_open",{practice:CFG.label,subject:state.subject,chapter:chapterName})};
function applyDeepLink(){try{var p=new URLSearchParams(location.search),s=p.get("subject"),c=p.get("chapter"),sec=Number(p.get("section")||1),q=Number(p.get("q")||0);if(s&&MASTER[s]){state.subject=s;if(c&&MASTER[s][c]){markVisited(s,c);state.screen="quiz";state.chapterName=c;state.quizData=MASTER[s][c];if(!Number.isFinite(sec)||sec<1)sec=1;state.currentSection=Math.min(state.quizData.length-1,Math.max(0,Math.floor(sec)-1));state.score={correct:0,wrong:0,attempted:0};state.shuffleMap={};state.answerMap={};if(Number.isFinite(q)&&q>=1&&state.quizData[state.currentSection]&&q<=state.quizData[state.currentSection].questions.length)pendingDeepQuestion=Math.floor(q)-1}else{state.screen="chapters";state.chapterName=null;state.quizData=null}}}catch(e){}}
applyDeepLink();render();
})();