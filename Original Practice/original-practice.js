(function(){
"use strict";
var PAGE_FILE=decodeURIComponent((location.pathname.split("/").pop()||"").toLowerCase());
var CONFIGS={
 "history_complete_practice.html":{slug:"history",label:"History"},
 "polity_complete_practice.html":{slug:"polity",label:"Polity"},
 "science_complete_practice.html":{slug:"science",label:"Science"},
 "geography_complete_practice.html":{slug:"geography",label:"Geography"},
 "economics_complete_practice.html":{slug:"economics",label:"Economics"},
 "environment_ecology_complete_practice.html":{slug:"ecology",label:"Environment & Ecology"},
 "static_gk_complete_practice.html":{slug:"staticgk",label:"Static GK"}
};
var CFG=CONFIGS[PAGE_FILE]||{slug:"practice",label:"Practice"};
var PROGRESS_KEY="efp_visited_originalpractice_"+CFG.slug;
var BOOKMARK_KEY="efp_bookmarks";
var ATTEMPT_PREFIX="efp_original_practice_attempt_v2:";
var LEGACY_APP_ATTEMPT_KEY="efp_app_original_practice_attempt_v1";
var bookmarkOnly=false;
var pendingDeepQuestion=null;

// All Original Practice pages use the same site-wide dark-mode preference as
// ExamFusion Home. The Complete Practice HTML files are very large, so
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


function ensureGlobalOriginalPracticeNavigation(){
 try{
  var defs=[
   {needle:"/home-nav.js",src:"/home-nav.js?v=20260909mobilecompact1"},
   {needle:"/back-parent-map.js",src:"/back-parent-map.js?v=20260915staticgk1"},
   {needle:"/back-nav.js",src:"/back-nav.js?v=20261001opnav1"}
  ];
  function alreadyLoaded(needle){
   var scripts=document.scripts||[];
   for(var i=0;i<scripts.length;i++)if((scripts[i].src||"").indexOf(needle)>=0)return true;
   return false;
  }
  for(var i=0;i<defs.length;i++){
   if(alreadyLoaded(defs[i].needle))continue;
   var s=document.createElement("script");
   s.src=defs[i].src;
   s.async=false;
   (document.head||document.documentElement).appendChild(s);
  }
 }catch(e){}
}
ensureGlobalOriginalPracticeNavigation();


// Keep every chapter attempt until the learner explicitly resets it. Answers,
// score, option order and last section now survive refresh, Back and reopening
// on browsers as well as installed Android/Windows apps.
if(!state.answerMap) state.answerMap={};
function clearLegacyPersistedAnswers(){try{localStorage.removeItem("efp_quiz_answer_state_v1")}catch(e){}}
clearLegacyPersistedAnswers();
function attemptStorageKey(){
 return ATTEMPT_PREFIX+encodeURIComponent(CFG.slug)+":"+encodeURIComponent(String(state.subject||""))+":"+encodeURIComponent(String(state.chapterName||""));
}
function attemptSignature(){
 return (state.quizData||[]).map(function(sec){
  var qs=sec.questions||[];
  var first=qs[0]&&qs[0].q&&qs[0].q.en||"",last=qs[qs.length-1]&&qs[qs.length-1].q&&qs[qs.length-1].q.en||"";
  return qs.length+":"+first.slice(0,72)+":"+last.slice(0,72);
 }).join("|");
}
function saveAppAttempt(){
 if(state.screen!=="quiz"||!state.quizData)return;
 var answers={},orders={};
 Object.keys(state.answerMap||{}).forEach(function(key){
  var selected=Number(state.answerMap[key]&&state.answerMap[key].selectedOrigIdx);
  var order=state.shuffleMap&&state.shuffleMap[key];
  if(!Number.isInteger(selected)||!Array.isArray(order))return;
  answers[key]=selected;orders[key]=order.slice();
 });
 try{localStorage.setItem(attemptStorageKey(),JSON.stringify({
  path:location.pathname,subject:state.subject,chapter:state.chapterName,
  signature:attemptSignature(),answers:answers,orders:orders,section:Math.max(0,Number(state.currentSection)||0),
  ts:Date.now()
 }));localStorage.removeItem(LEGACY_APP_ATTEMPT_KEY)}catch(e){}
}
function restoreAppAttempt(preserveSection){
 if(state.screen!=="quiz"||!state.quizData)return false;
 try{
  var key=attemptStorageKey(),saved=JSON.parse(localStorage.getItem(key)||"null");
  if(!saved||saved.path!==location.pathname||saved.subject!==state.subject||
     saved.chapter!==state.chapterName||saved.signature!==attemptSignature()){
   if(saved)try{localStorage.removeItem(key)}catch(_){}
   return false;
  }
  var answers={},orders={},score={correct:0,wrong:0,attempted:0};
  Object.keys(saved.answers||{}).forEach(function(answerKey){
   var pair=/^(\d+)-(\d+)$/.exec(answerKey);
   if(!pair)return;
   var sec=state.quizData[Number(pair[1])];
   var q=sec&&sec.questions[Number(pair[2])];
   var order=saved.orders&&saved.orders[answerKey];
   var selected=Number(saved.answers[answerKey]);
   if(!q||!Array.isArray(order)||order.length!==q.o.length||
      order.some(function(value,i){return !Number.isInteger(value)||value<0||value>=q.o.length||order.indexOf(value)!==i})||
      !Number.isInteger(selected)||selected<0||selected>=q.o.length)return;
   answers[answerKey]={selectedOrigIdx:selected};orders[answerKey]=order.slice();
   score.attempted++;
   if(selected===currentAnswerIndex(q))score.correct++;else score.wrong++;
  });
  state.answerMap=answers;state.shuffleMap=orders;state.score=score;
  if(!preserveSection&&Number.isFinite(Number(saved.section))){
   state.currentSection=Math.max(0,Math.min(state.quizData.length-1,Math.floor(Number(saved.section))));
  }
  return true;
 }catch(e){return false}
}
function clearCurrentSavedAttempt(){
 try{if(state.subject&&state.chapterName)localStorage.removeItem(attemptStorageKey())}catch(e){}
}
function clearTransientAttempt(){
 state.answerMap={};
 state.shuffleMap={};
 state.score={correct:0,wrong:0,attempted:0};
 clearLegacyPersistedAnswers();
}
window.addEventListener("pageshow",function(event){
 clearLegacyPersistedAnswers();
 if(event.persisted&&state.screen==="quiz"){
  restoreAppAttempt(true);
  render();
 }
});
document.addEventListener("visibilitychange",function(){if(document.visibilityState==="hidden")saveAppAttempt()});
document.addEventListener("freeze",saveAppAttempt);
window.addEventListener("pagehide",saveAppAttempt);
window.addEventListener("beforeunload",saveAppAttempt);
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
var OP_HISTORY_KEY="efpOriginalPracticeNav";
var opHistoryRestoring=false;
function opHistoryEntry(mode,hasParent){
 return {
  efpOriginalPracticeNav:true,
  screen:mode,
  hasParent:!!hasParent,
  subject:mode==="home"?"":String(state.subject||""),
  chapter:mode==="quiz"?String(state.chapterName||""):"",
  section:mode==="quiz"?Math.max(0,Number(state.currentSection)||0):0
 };
}
function opHasManagedParent(){
 try{return !!(history.state&&history.state[OP_HISTORY_KEY]===true&&history.state.hasParent)}catch(e){return false}
}
function opRunAfterQuizGuardRelease(action){
 var warning=window.EFP_QUIZ_PROGRESS_WARNING;
 if(!opHistoryRestoring&&state.screen==="quiz"&&warning&&typeof warning.releaseBackGuard==="function"){
  var release=function(){warning.releaseBackGuard(action)};
  if(typeof warning.isArmed==="function"&&warning.isArmed()&&typeof warning.confirmLeave==="function"){
   warning.confirmLeave(release);
   return;
  }
  release();
  return;
 }
 action();
}
function opBackToParent(fallback){
 opRunAfterQuizGuardRelease(function(){
  if(opHasManagedParent()){
   try{history.back();return}catch(e){}
  }
  fallback();
 });
}
function syncUrl(mode,push){
 try{
  var u=new URL(location.href),searchReturn=u.searchParams.get("efSearchReturn"),searchRestore=u.searchParams.get("efSearchRestore");u.search="";
  if(searchReturn)u.searchParams.set("efSearchReturn",searchReturn);
  if(searchRestore)u.searchParams.set("efSearchRestore",searchRestore);
  if(mode!=="home"&&state.subject)u.searchParams.set("subject",state.subject);
  if(mode==="quiz"&&state.chapterName){u.searchParams.set("chapter",state.chapterName);u.searchParams.set("section",String((state.currentSection||0)+1))}
  var previous=history.state,hasParent=push?true:!!(previous&&previous[OP_HISTORY_KEY]===true&&previous.hasParent);
  var entry=opHistoryEntry(mode,hasParent);
  if(previous&&previous.efpSearchReturnToken)entry.efpSearchReturnToken=previous.efpSearchReturnToken;
  if(previous&&previous.efpSearchSnapshot&&!push)entry.efpSearchSnapshot=previous.efpSearchSnapshot;
  // Section changes rewrite the current quiz URL. Preserve the shared
  // synthetic system-Back guard on that same entry; dropping it here makes
  // the next answered question push another guard and stacks duplicate Back
  // steps across sections. Reset intentionally releases the guard first, so
  // its replaceState stays guard-free.
  if(!push&&previous&&previous.efpQuizQuitGuard===true)entry.efpQuizQuitGuard=true;
  if(push)history.pushState(entry,"",u.pathname+u.search+u.hash);
  else history.replaceState(entry,"",u.pathname+u.search+u.hash);
 }catch(e){}
}
function restoreOriginalPracticeHistory(entry){
 if(!entry||entry[OP_HISTORY_KEY]!==true)return;
 opHistoryRestoring=true;
 try{
  clearTransientAttempt();
  if(entry.screen==="home"){
   if(typeof baseGoHome==="function")baseGoHome();
  }else if(entry.screen==="chapters"){
   if(typeof baseGoToChapters==="function")baseGoToChapters(entry.subject);
  }else if(entry.screen==="quiz"&&entry.subject&&entry.chapter){
   if(typeof baseGoToChapters==="function")baseGoToChapters(entry.subject);
   if(typeof baseGoToQuiz==="function")baseGoToQuiz(entry.chapter);
   restoreAppAttempt(true);
   if(Number.isInteger(Number(entry.section))&&Number(entry.section)>0&&typeof baseSwitchSection==="function")baseSwitchSection(Number(entry.section));
  }
  try{window.scrollTo(0,0)}catch(_){}
 }catch(e){}finally{opHistoryRestoring=false}
}
window.addEventListener("popstate",function(event){
 if(event.state&&event.state[OP_HISTORY_KEY]===true)restoreOriginalPracticeHistory(event.state);
});

function efpSeoCountQuestions(subject,chapter){
 var total=0,sections=MASTER&&MASTER[subject]&&MASTER[subject][chapter];
 (sections||[]).forEach(function(section){total+=(section&&section.questions&&section.questions.length)||0});
 return total;
}
function efpSeoPlainChapter(chapter){
 return enName(chapter).replace(/^\s*\d+(?:\.[ivx]+(?:\.[a-z])?)?\.?\s*/i,"").trim();
}
function efpSeoSetMeta(selector,attr,value){
 var node=document.head.querySelector(selector);
 if(!node){node=document.createElement("meta");if(selector.indexOf('property=')>=0)node.setAttribute("property",attr);else node.setAttribute("name",attr);document.head.appendChild(node)}
 node.setAttribute("content",value);
}
function efpApplySeoMeta(){
 try{
  var chapter=state.screen==="quiz"&&state.chapterName?state.chapterName:"";
  var subject=state.subject||CFG.label;
  var canonical=new URL(location.href);canonical.hash="";canonical.search="";
  var title,desc;
  if(chapter){
   canonical.searchParams.set("subject",subject);canonical.searchParams.set("chapter",chapter);
   var clean=efpSeoPlainChapter(chapter),count=efpSeoCountQuestions(subject,chapter);
   title=clean+" MCQ Practice | ExamFusion Prep";
   desc="Practice "+clean+(count?" with "+count+" questions":"")+" in ExamFusion Prep Original Practice. Bilingual competitive-exam questions with answers and explanations.";
  }else if(state.screen==="chapters"&&state.subject){
   canonical.searchParams.set("subject",state.subject);
   title=state.subject+" Practice Questions | ExamFusion Prep";
   desc="Practice "+state.subject+" chapter-wise questions in ExamFusion Prep Original Practice with bilingual explanations, bookmarks and progress tracking.";
  }else{
   title=CFG.label+" Original Practice | ExamFusion Prep";
   desc="Practice chapter-wise "+CFG.label+" questions in ExamFusion Prep Original Practice for SSC, Railway, UPSC and BPSC.";
  }
  document.title=title;
  efpSeoSetMeta('meta[name="description"]',"description",desc);
  efpSeoSetMeta('meta[name="robots"]',"robots","index,follow");
  efpSeoSetMeta('meta[property="og:title"]',"og:title",title);
  efpSeoSetMeta('meta[property="og:description"]',"og:description",desc);
  efpSeoSetMeta('meta[property="og:url"]',"og:url",canonical.href);
  var link=document.head.querySelector('link[rel="canonical"]');if(!link){link=document.createElement("link");link.rel="canonical";document.head.appendChild(link)}link.href=canonical.href;
 }catch(e){}
}

function addTopbar(){var app=document.getElementById("app");if(!app||app.querySelector(".efp-op-topbar"))return;var bar=document.createElement("div");bar.className="efp-op-topbar";bar.innerHTML='<a href="./index.html">Original Practice Home</a><a href="../index.html">ExamFusion Home</a><button type="button" id="efpOpDark" hidden aria-hidden="true" tabindex="-1">Dark Mode: <span>OFF</span></button>';app.insertBefore(bar,app.firstChild);var btn=bar.querySelector("#efpOpDark");function sync(){var on=false;try{on=localStorage.getItem("efp_black_mode")==="on"}catch(e){}btn.querySelector("span").textContent=on?"ON":"OFF"}sync();document.addEventListener("efp-black-mode-changed",sync)}
var opFullSearchClient=null;
function getOpFullSearchClient(){
 if(opFullSearchClient)return opFullSearchClient;
 if(typeof efCreateSearchWorker!=="function")return null;
 var specialIndex=CFG.slug==="economics"?{file:"../search-snippets-economics-original-practice.js?v=20260908econ1",global:"EF_ECONOMICS_ORIGINAL_PRACTICE_SNIPPET_INDEX"}:CFG.slug==="ecology"?{file:"../search-snippets-ecology-original-practice.js?v=20260912ecology1",global:"EF_ECOLOGY_ORIGINAL_PRACTICE_SNIPPET_INDEX"}:CFG.slug==="staticgk"?{file:"../search-snippets-static-gk-original-practice.js?v=20260915staticgk1",global:"EF_STATIC_GK_ORIGINAL_PRACTICE_SNIPPET_INDEX"}:{file:"../search-snippets-original-practice.js?v=20261001modern13-bd340e6e4b4f",global:"EF_ORIGINAL_PRACTICE_SNIPPET_INDEX"};
 opFullSearchClient=efCreateSearchWorker({
  workerUrl:new URL("../search-worker.js?v=20260904v8",document.baseURI).href,
  logicUrl:new URL("../search-logic.js?v=20260904v8",document.baseURI).href,
  indexUrl:new URL(specialIndex.file,document.baseURI).href,
  mode:"snippet",
  globalName:specialIndex.global,
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
 results.addEventListener("click",function(event){var b=event.target.closest("button[data-search-chapter]");if(!b||b.__efpSearchLive)return;var open=function(){state.subject=b.dataset.searchSubject;goToQuiz(b.dataset.searchChapter)};if(window.EFP_SEARCH_RETURN)window.EFP_SEARCH_RETURN.openInPage(open);else open()});
 input.addEventListener("input",function(){
  var rawQ=input.value.trim(),q=norm(rawQ),my=++seq;clearTimeout(timer);results.innerHTML="";if(q.length<2)return;
  var terms=q.split(" "),hits=records.filter(function(r){var hay=norm(r.subject+" "+r.en+" "+r.hi);return terms.every(function(t){return hay.indexOf(t)>=0})}).slice(0,12);
  if(hits.length){var h=document.createElement("div");h.className="efp-op-search-heading";h.textContent="Chapters / अध्याय";results.appendChild(h)}
  hits.forEach(function(r){var b=document.createElement("button");b.type="button";b.className="efp-op-search-result";b.dataset.searchSubject=r.subject;b.dataset.searchChapter=r.chapter;b.__efpSearchLive=true;b.innerHTML="<strong>"+escapeHtml(r.en)+(r.hi?" / "+escapeHtml(r.hi):"")+"</strong><small>"+escapeHtml(r.subject)+"</small>";b.addEventListener("click",function(){var open=function(){state.subject=r.subject;goToQuiz(r.chapter)};if(window.EFP_SEARCH_RETURN)window.EFP_SEARCH_RETURN.openInPage(open);else open()});results.appendChild(b)});
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
function updateBookmarkBar(){var bar=document.querySelector(".efp-op-bookmarkbar");if(!bar)return;var meta=bar.querySelector(".efp-op-bookmark-meta");if(meta)meta.textContent="⭐ "+pageBookmarkCount()+" saved on this subject page";var btn=bar.querySelector(".efp-op-bookmark-filter");if(btn){btn.classList.toggle("active",bookmarkOnly);btn.textContent=bookmarkOnly?"Show all questions":"Bookmarked only"}}
function applyBookmarkFilter(){var b=getBookmarks(),cards=document.querySelectorAll("#questions-container > [id^='q-']"),shown=0;cards.forEach(function(card){var qi=Number((card.id||"").replace("q-","")),yes=!!b[qKey(qi)];var star=card.querySelector(".efp-op-star");if(star){star.textContent=yes?"★":"☆";star.classList.toggle("is-bookmarked",yes);star.setAttribute("aria-label",yes?"Remove bookmark":"Bookmark this question")}var hide=bookmarkOnly&&!yes;card.classList.toggle("efp-op-bookmark-hidden",hide);if(!hide)shown++});var empty=document.querySelector(".efp-op-empty");if(empty)empty.classList.toggle("show",bookmarkOnly&&shown===0)}
function resetCurrentQuiz(){
 if(!state.subject||!state.chapterName)return;
 if(!confirm("Reset progress for this chapter? Your bookmarks will stay saved."))return;
 clearCurrentSavedAttempt();clearTransientAttempt();state.currentSection=0;bookmarkOnly=false;
 var finishReset=function(){
  clearTransientAttempt();state.currentSection=0;bookmarkOnly=false;
  syncUrl("quiz",false);render();window.scrollTo({top:0,behavior:"smooth"});
 };
 var warning=window.EFP_QUIZ_PROGRESS_WARNING;
 if(warning&&typeof warning.releaseBackGuard==="function"){warning.releaseBackGuard(finishReset);return}
 if(warning&&typeof warning.disarm==="function")warning.disarm();
 finishReset();
}

var EFP_STANDALONE_FIRST_PROMPTS={
 economics:{
  "01. Demand, Supply and Market - मांग, आपूर्ति एवं बाज़ार":{en:"What topics form the core of demand, supply and market analysis in microeconomics?",hi:"व्यष्टि अर्थशास्त्र में मांग, आपूर्ति और बाजार विश्लेषण के मुख्य विषय कौन-से हैं?"}
 },
 geography:{
  "1. India Location Borders & Standard Time":{en:"Which map-based facts are essential for understanding India's location, borders and standard time?",hi:"भारत की अवस्थिति, सीमाओं और मानक समय को समझने के लिए कौन-से मानचित्र-आधारित तथ्य आवश्यक हैं?"},
  "2. Geological Structure of India":{en:"Which concepts are central to understanding the geological structure of India?",hi:"भारत की भूगर्भिक संरचना को समझने के लिए कौन-सी अवधारणाएँ प्रमुख हैं?"},
  "3. Physical Divisions of India":{en:"Which six major physical divisions form India's physiographic framework?",hi:"भारत के भौतिक स्वरूप के छह प्रमुख विभाग कौन-से हैं?"},
  "4. Rivers of India":{en:"Which major drainage systems and river patterns are essential to Indian geography?",hi:"भारतीय भूगोल में कौन-सी प्रमुख जल-निकासी प्रणालियाँ और नदी-पैटर्न महत्वपूर्ण हैं?"},
  "5. Lakes & Waterfalls of India":{en:"Which topics are central to the study of India's lakes and waterfalls?",hi:"भारत की झीलों और जलप्रपातों के अध्ययन के प्रमुख विषय कौन-से हैं?"},
  "10. Agriculture & Animal Husbandry":{en:"Which combination best describes the common exam pattern for Indian agriculture?",hi:"भारतीय कृषि से जुड़े प्रश्नों का सामान्य परीक्षा-पैटर्न किस संयोजन पर आधारित है?"},
  "11. Mineral Resources":{en:"Which areas are most important for exam preparation on India's mineral resources?",hi:"भारत के खनिज संसाधनों से जुड़े परीक्षा प्रश्नों के लिए कौन-से क्षेत्र सबसे महत्वपूर्ण हैं?"},
  "12. Energy Resources":{en:"Which areas are most important for exam preparation on India's energy resources?",hi:"भारत के ऊर्जा संसाधनों से जुड़े परीक्षा प्रश्नों के लिए कौन-से क्षेत्र सबसे महत्वपूर्ण हैं?"},
  "13. Industries":{en:"What patterns do exam questions on Indian industries mostly follow?",hi:"भारतीय उद्योगों से जुड़े परीक्षा प्रश्न अधिकतर किन पैटर्न का पालन करते हैं?"},
  "14. Transport & Communication":{en:"What do exam questions on India's transport and communication mostly revolve around?",hi:"भारत के परिवहन और संचार से जुड़े परीक्षा प्रश्न अधिकतर किन तथ्यों के इर्द-गिर्द घूमते हैं?"},
  "15. Population & Urbanization":{en:"Which facts are most important for exam questions on India's population and urbanization?",hi:"भारत की जनसंख्या और शहरीकरण से जुड़े परीक्षा प्रश्नों में किस प्रकार के तथ्य सबसे महत्वपूर्ण हैं?"},
  "16. Races & Tribes of India":{en:"Which two main areas are essential for studying races and tribes of India?",hi:"भारत की नस्लों और जनजातियों के अध्ययन के लिए कौन-से दो मुख्य क्षेत्र आवश्यक हैं?"},
  "17. States & Union Territories of India":{en:"What are the key exam-relevant facts about India's states and Union Territories?",hi:"भारत के राज्यों और केंद्र शासित प्रदेशों से जुड़े प्रमुख परीक्षा-उपयोगी तथ्य कौन-से हैं?"},
  "1. Geography: An Introduction":{en:"Which foundational topics are central to an introduction to geography?",hi:"भूगोल के परिचय में कौन-से आधारभूत विषय प्रमुख हैं?"},
  "2. Universe":{en:"Which topics are central to the study of the universe in geography?",hi:"भूगोल में ब्रह्मांड के अध्ययन के प्रमुख विषय कौन-से हैं?"},
  "14. Rivers, Lakes & Waterfalls":{en:"Which topics are most important for studying the world's rivers, lakes and waterfalls?",hi:"विश्व की नदियों, झीलों और जलप्रपातों के अध्ययन के सबसे महत्वपूर्ण विषय कौन-से हैं?"},
  "22. Soils & Natural Vegetation":{en:"Which sequence best summarizes the key topics in soils and natural vegetation?",hi:"मिट्टी और प्राकृतिक वनस्पति के प्रमुख विषयों को कौन-सा क्रम सबसे अच्छी तरह संक्षेपित करता है?"},
  "23. Agriculture & Animal Husbandry":{en:"Which areas form the core of world agriculture and animal husbandry?",hi:"विश्व कृषि और पशुपालन के मुख्य अध्ययन-क्षेत्र कौन-से हैं?"},
  "24. Minerals & Energy Resources":{en:"Which areas form the core of world minerals and energy resources?",hi:"विश्व के खनिज और ऊर्जा संसाधनों के मुख्य अध्ययन-क्षेत्र कौन-से हैं?"},
  "25. Major Industries of the World":{en:"Which areas form the core of the world's major industries?",hi:"विश्व के प्रमुख उद्योगों के मुख्य अध्ययन-क्षेत्र कौन-से हैं?"},
  "26. Transport":{en:"Which modes and systems form the core of world transport?",hi:"विश्व परिवहन के मुख्य साधन और प्रणालियाँ कौन-सी हैं?"},
  "27. Population & Urbanization":{en:"Which areas form the core of world population and urbanization?",hi:"विश्व जनसंख्या और शहरीकरण के मुख्य अध्ययन-क्षेत्र कौन-से हैं?"},
  "28. Human Races, Tribes & Languages":{en:"Which areas are covered under human races, tribes and languages in world geography?",hi:"विश्व भूगोल में मानव नस्लों, जनजातियों और भाषाओं के अंतर्गत कौन-से प्रमुख क्षेत्र आते हैं?"}
 }
};
function applyStandaloneFirstQuestionPrompt(){
 if(state.screen!=="quiz"||state.currentSection!==0)return;
 var bySubject=EFP_STANDALONE_FIRST_PROMPTS[CFG.slug],prompt=bySubject&&bySubject[state.chapterName];
 if(!prompt)return;
 var card=document.getElementById("q-0");if(!card)return;
 var paras=card.querySelectorAll(":scope > p");
 if(paras[0])paras[0].textContent="1. "+prompt.en;
 if(paras[1])paras[1].textContent=prompt.hi;
}

function enhanceQuiz(){var cont=document.getElementById("questions-container");if(!cont)return;applyStandaloneFirstQuestionPrompt();var bar=document.createElement("div");bar.className="efp-op-bookmarkbar";bar.innerHTML='<span class="efp-op-bookmark-meta"></span><span class="efp-op-bookmark-actions"><button class="efp-op-bookmark-filter" type="button"></button><button class="efp-op-reset-attempt" type="button">↻ Reset Quiz</button></span>';bar.querySelector(".efp-op-bookmark-filter").addEventListener("click",function(){bookmarkOnly=!bookmarkOnly;applyBookmarkFilter();updateBookmarkBar()});bar.querySelector(".efp-op-reset-attempt").addEventListener("click",resetCurrentQuiz);cont.parentNode.insertBefore(bar,cont);var cards=cont.querySelectorAll(":scope > [id^='q-']");cards.forEach(function(card){card.classList.add("efp-op-qcard");var qi=Number((card.id||"").replace("q-",""));var star=document.createElement("button");star.type="button";star.className="efp-op-star";star.addEventListener("click",function(e){e.stopPropagation();toggleBookmark(qi,star)});card.appendChild(star)});var empty=document.createElement("div");empty.className="efp-op-empty";empty.textContent="No bookmarked questions in this section / इस सेक्शन में कोई बुकमार्क प्रश्न नहीं है।";cont.insertAdjacentElement("afterend",empty);restoreAnsweredSection();applyBookmarkFilter();updateBookmarkBar()}
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
 saveAppAttempt();
 track("original_practice_answer",{practice:CFG.label,subject:state.subject,chapter:state.chapterName,section:state.currentSection+1,question:qi+1,correct:selectedOrigIdx===currentAnswerIndex(state.quizData[state.currentSection].questions[qi])});
};
var baseRender=render;render=function(){baseRender();enhance();efpApplySeoMeta();if(state.screen==="quiz"&&pendingDeepQuestion!==null){var qi=pendingDeepQuestion;pendingDeepQuestion=null;setTimeout(function(){var card=document.getElementById("q-"+qi);if(!card)return;card.classList.add("efp-op-deep-focus");try{card.scrollIntoView({behavior:"smooth",block:"center"})}catch(e){card.scrollIntoView()}setTimeout(function(){card.classList.remove("efp-op-deep-focus")},2200)},80)}};
var baseSwitchSection=switchSection;switchSection=function(i){pendingDeepQuestion=null;baseSwitchSection(i);syncUrl("quiz",false);saveAppAttempt()};
var basePrevSection=prevSection;prevSection=function(){pendingDeepQuestion=null;basePrevSection();if(state.screen==="quiz"){syncUrl("quiz",false);saveAppAttempt()}};
var baseNextSection=nextSection;nextSection=function(){pendingDeepQuestion=null;baseNextSection();if(state.screen==="quiz"){syncUrl("quiz",false);saveAppAttempt()}};
var baseGoHome=goHome;goHome=function(){
 if(!opHistoryRestoring&&state.screen==="chapters"&&opHasManagedParent()){clearTransientAttempt();history.back();return}
 clearTransientAttempt();baseGoHome();syncUrl("home",false)
};
var baseGoToChapters=goToChapters;goToChapters=function(subject){
 if(!opHistoryRestoring&&state.screen==="quiz"){
  var targetSubject=subject||state.subject;
  opBackToParent(function(){clearTransientAttempt();baseGoToChapters(targetSubject);syncUrl("chapters",false)});
  return;
 }
 var from=state.screen;clearTransientAttempt();baseGoToChapters(subject);syncUrl("chapters",!opHistoryRestoring&&from==="home");track("original_practice_subject_open",{practice:CFG.label,subject:subject})
};
var baseGoToQuiz=goToQuiz;goToQuiz=function(chapterName){
 var from=state.screen;clearTransientAttempt();markVisited(state.subject,chapterName);baseGoToQuiz(chapterName);restoreAppAttempt(false);render();syncUrl("quiz",!opHistoryRestoring&&from!=="quiz");track("original_practice_chapter_open",{practice:CFG.label,subject:state.subject,chapter:chapterName})
};
function applyDeepLink(){try{var p=new URLSearchParams(location.search),s=p.get("subject"),c=p.get("chapter"),sec=Number(p.get("section")||1),q=Number(p.get("q")||0);if(s&&MASTER[s]){state.subject=s;if(c&&MASTER[s][c]){markVisited(s,c);state.screen="quiz";state.chapterName=c;state.quizData=MASTER[s][c];if(!Number.isFinite(sec)||sec<1)sec=1;state.currentSection=Math.min(state.quizData.length-1,Math.max(0,Math.floor(sec)-1));state.score={correct:0,wrong:0,attempted:0};state.shuffleMap={};state.answerMap={};if(Number.isFinite(q)&&q>=1&&state.quizData[state.currentSection]&&q<=state.quizData[state.currentSection].questions.length)pendingDeepQuestion=Math.floor(q)-1}else{state.screen="chapters";state.chapterName=null;state.quizData=null}}}catch(e){}}
applyDeepLink();restoreAppAttempt(true);syncUrl(state.screen||"home",false);render();
})();
