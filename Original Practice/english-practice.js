(function(){
"use strict";

var SUBJECT="English Grammar";
var CFG={slug:"english",label:"English Grammar"};
var PROGRESS_KEY="efp_visited_originalpractice_english";
var BOOKMARK_KEY="efp_bookmarks";
var bookmarkOnly=false;
var pendingDeepQuestion=null;

function ensureNavigation(){
 try{
  [
   {needle:"/home-nav.js",src:"/home-nav.js?v=20260909mobilecompact1"},
   {needle:"/back-parent-map.js",src:"/back-parent-map.js?v=20260913english1"},
   {needle:"/back-nav.js",src:"/back-nav.js?v=20260913english1"}
  ].forEach(function(def){
   var loaded=Array.prototype.some.call(document.scripts||[],function(s){return (s.src||"").indexOf(def.needle)>=0});
   if(loaded)return;
   var script=document.createElement("script");script.src=def.src;script.async=false;(document.head||document.documentElement).appendChild(script);
  });
 }catch(e){}
}
ensureNavigation();

function safeParse(value,fallback){try{var parsed=JSON.parse(value);return parsed==null?fallback:parsed}catch(e){return fallback}}
function unique(values){var seen={},out=[];(values||[]).forEach(function(value){value=String(value);if(!seen[value]){seen[value]=1;out.push(value)}});return out}
function getVisited(){return unique(safeParse(localStorage.getItem(PROGRESS_KEY),[]))}
function saveVisited(values){try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(unique(values)))}catch(e){}}
function markVisited(chapter){var values=getVisited();if(values.indexOf(chapter)<0){values.push(chapter);saveVisited(values)}}
function isVisited(chapter){return getVisited().indexOf(chapter)>=0}
function getBookmarks(){var value=safeParse(localStorage.getItem(BOOKMARK_KEY),{});return value&&typeof value==="object"&&!Array.isArray(value)?value:{}}
function saveBookmarks(value){try{localStorage.setItem(BOOKMARK_KEY,JSON.stringify(value))}catch(e){}}
function encode(value){return encodeURIComponent(String(value==null?"":value))}
function questionKey(qi){return location.pathname+"#op|english|"+encode(SUBJECT)+"|"+encode(state.chapterName)+"|"+state.currentSection+"|"+qi}
function pagePrefix(){return location.pathname+"#op|english|"}
function bookmarkCount(){var data=getBookmarks(),prefix=pagePrefix(),count=0;Object.keys(data).forEach(function(key){if(data[key]&&key.indexOf(prefix)===0)count++});return count}
function track(name,params){try{if(typeof gtag==="function")gtag("event",name,params||{})}catch(e){}}
function escapeHtml(value){return String(value==null?"":value).replace(/[&<>\"]/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]})}
function stripHtml(value){var node=document.createElement("div");node.innerHTML=String(value||"");return node.textContent||node.innerText||""}
function norm(value){return stripHtml(value).toLowerCase().replace(/[’‘`]/g,"'").replace(/[^a-z0-9\u0900-\u097f]+/g," ").replace(/\s+/g," ").trim()}
function chapterNames(){return Object.keys(MASTER)}

var QUESTION_RECORDS=null;
function questionRecords(){
 if(QUESTION_RECORDS)return QUESTION_RECORDS;
 QUESTION_RECORDS=[];
 chapterNames().forEach(function(chapter){
  (MASTER[chapter]||[]).forEach(function(section,sectionIndex){
   (section.questions||[]).forEach(function(q,qi){
    var answer=Array.isArray(q.options)&&Number.isInteger(q.answer)?q.options[q.answer]:"";
    QUESTION_RECORDS.push({chapter:chapter,section:sectionIndex,qi:qi,title:q.prompt||"Question",text:norm([q.prompt,q.sentence,(q.options||[]).join(" "),answer,q.explanation,q.englishExplanation,q.rule].join(" "))});
   });
  });
 });
 return QUESTION_RECORDS;
}

function syncUrl(mode){
 try{
  var url=new URL(location.href);url.search="";
  if(mode==="quiz"&&state.chapterName){url.searchParams.set("chapter",state.chapterName);url.searchParams.set("section",String((state.currentSection||0)+1))}
  history.replaceState(null,"",url.pathname+url.search+url.hash);
 }catch(e){}
}


function efpSeoCountQuestions(chapter){
 var total=0;(MASTER[chapter]||[]).forEach(function(section){total+=(section&&section.questions&&section.questions.length)||0});return total;
}
function efpSeoPlainChapter(chapter){return String(chapter||"").replace(/^\s*\d+(?:\.[ivx]+(?:\.[a-z])?)?\.?\s*/i,"").trim()}
function efpSeoSetMeta(selector,attr,value){
 var node=document.head.querySelector(selector);
 if(!node){node=document.createElement("meta");if(selector.indexOf('property=')>=0)node.setAttribute("property",attr);else node.setAttribute("name",attr);document.head.appendChild(node)}
 node.setAttribute("content",value);
}
function efpApplySeoMeta(){
 try{
  var chapter=state.screen==="quiz"&&state.chapterName?state.chapterName:"";
  var canonical=new URL(location.href);canonical.hash="";canonical.search="";
  var title,desc;
  if(chapter){
   canonical.searchParams.set("chapter",chapter);
   var clean=efpSeoPlainChapter(chapter),count=efpSeoCountQuestions(chapter);
   title=clean+" English Grammar Practice | ExamFusion Prep";
   desc="Practice "+clean+(count?" with "+count+" questions":"")+" in ExamFusion Prep English Grammar Original Practice, with answers and explanations.";
  }else{
   title="English Grammar Original Practice | ExamFusion Prep";
   desc="Practice chapter-wise English Grammar questions with explanations, bookmarks and progress tracking on ExamFusion Prep.";
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

function addTopbar(){
 var app=document.getElementById("app");if(!app||app.querySelector(".efp-op-topbar"))return;
 var bar=document.createElement("div");bar.className="efp-op-topbar";
 bar.innerHTML='<a href="./index.html">Original Practice Home</a><a href="../index.html">ExamFusion Home</a><button type="button" id="efpOpDark" hidden aria-hidden="true" tabindex="-1">Dark Mode: <span>OFF</span></button>';
 app.insertBefore(bar,app.firstChild);
 var button=bar.querySelector("#efpOpDark");
 function update(){var on=false;try{on=localStorage.getItem("efp_black_mode")==="on"}catch(e){}button.querySelector("span").textContent=on?"ON":"OFF"}
 update();document.addEventListener("efp-black-mode-changed",update);
}

function openQuestion(record){
 pendingDeepQuestion=record.qi;
 markVisited(record.chapter);
 state.screen="quiz";state.chapterName=record.chapter;state.quizData=MASTER[record.chapter];state.currentSection=record.section;state.shuffleMap={};saved.answers={};
 render();syncUrl("quiz");track("original_practice_search_open",{practice:CFG.label,chapter:record.chapter,section:record.section+1,question:record.qi+1});
}

function searchPanel(){
 var box=document.createElement("div");box.className="efp-op-search";
 box.innerHTML='<div class="efp-op-search-row"><span aria-hidden="true">🔎</span><input type="search" autocomplete="off" placeholder="Search chapter or question / अध्याय या प्रश्न खोजें…" aria-label="Search English Grammar chapters and questions"></div><div class="efp-op-search-results" aria-live="polite"></div>';
 var input=box.querySelector("input"),results=box.querySelector(".efp-op-search-results"),timer=null;
 input.addEventListener("input",function(){
  clearTimeout(timer);results.innerHTML="";var raw=input.value.trim(),query=norm(raw);if(query.length<2)return;
  timer=setTimeout(function(){
   var terms=query.split(" ").filter(Boolean),chapters=chapterNames().filter(function(chapter){return terms.every(function(term){return norm(chapter).indexOf(term)>=0})}).slice(0,10);
   if(chapters.length){var heading=document.createElement("div");heading.className="efp-op-search-heading";heading.textContent="Chapters / अध्याय";results.appendChild(heading)}
   chapters.forEach(function(chapter){var button=document.createElement("button");button.type="button";button.className="efp-op-search-result";button.innerHTML="<strong>"+escapeHtml(chapter.replace(/^\d+\.\s*/,""))+"</strong><small>English Grammar · "+chapterQCount(MASTER[chapter])+" questions</small>";button.onclick=function(){markVisited(chapter);goToQuiz(chapter)};results.appendChild(button)});
   var matches=questionRecords().filter(function(record){return terms.every(function(term){return record.text.indexOf(term)>=0})}).slice(0,16);
   if(matches.length){var qh=document.createElement("div");qh.className="efp-op-search-heading";qh.textContent="Question Matches / प्रश्न मिलान";results.appendChild(qh)}
   matches.forEach(function(record){var button=document.createElement("button");button.type="button";button.className="efp-op-search-result efp-op-search-question";button.innerHTML="<strong>"+escapeHtml(stripHtml(record.title))+"</strong><small>"+escapeHtml(record.chapter)+" · Section "+(record.section+1)+" · Q"+(record.qi+1)+"</small>";button.onclick=function(){openQuestion(record)};results.appendChild(button)});
   if(!chapters.length&&!matches.length)results.innerHTML='<div class="efp-op-search-none">No matching chapter or question / कोई मिलान नहीं मिला</div>';
  },100);
 });
 return box;
}

function enhanceChapters(){
 var root=document.querySelector("#app .max-w-4xl");if(!root)return;
 var header=root.querySelector(".mb-6");
 var total=chapterNames().length,done=getVisited().length,pct=total?Math.round(done*100/total):0;
 if(header){var progress=document.createElement("div");progress.className="efp-op-progress";progress.innerHTML='<div class="efp-op-progress-head"><span>Chapter progress / अध्याय प्रगति: '+done+' / '+total+'</span><button class="efp-op-progress-reset" type="button">Reset</button></div><div class="efp-op-progress-track"><div class="efp-op-progress-fill" style="width:'+pct+'%"></div></div>';progress.querySelector("button").onclick=function(){if(confirm("Reset opened-chapter progress for English Grammar?")){localStorage.removeItem(PROGRESS_KEY);render()}};header.insertAdjacentElement("afterend",progress);progress.insertAdjacentElement("afterend",searchPanel())}
 var cards=root.querySelectorAll('div[onclick^="goToQuiz"]'),names=chapterNames();
 cards.forEach(function(card,index){var chapter=names[index];if(!chapter)return;card.setAttribute("role","button");card.setAttribute("tabindex","0");card.addEventListener("keydown",function(event){if(event.key==="Enter"||event.key===" "){event.preventDefault();markVisited(chapter);goToQuiz(chapter)}});if(isVisited(chapter))card.classList.add("efp-op-visited")});
 var note=document.createElement("div");note.className="efp-op-original-note";note.textContent="यह अभ्यास सामग्री ExamFusion Prep द्वारा प्रतियोगी परीक्षाओं की तैयारी के लिए स्वतंत्र रूप से तैयार की गई है।";root.appendChild(note);
}

function updateBookmarkBar(){
 var bar=document.querySelector(".efp-op-bookmarkbar");if(!bar)return;
 var meta=bar.querySelector(".efp-op-bookmark-meta");if(meta)meta.textContent="⭐ "+bookmarkCount()+" saved on this subject page";
 var button=bar.querySelector("button");if(button){button.classList.toggle("active",bookmarkOnly);button.textContent=bookmarkOnly?"Show all questions":"Bookmarked only"}
}
function applyBookmarkFilter(){
 var data=getBookmarks(),cards=document.querySelectorAll("#questions-container > [id^='q-']"),shown=0;
 cards.forEach(function(card){var qi=Number((card.id||"").replace("q-","")),yes=!!data[questionKey(qi)],star=card.querySelector(".efp-op-star");if(star){star.textContent=yes?"★":"☆";star.classList.toggle("is-bookmarked",yes);star.setAttribute("aria-label",yes?"Remove bookmark":"Bookmark this question")}var hide=bookmarkOnly&&!yes;card.classList.toggle("efp-op-bookmark-hidden",hide);if(!hide)shown++});
 var empty=document.querySelector(".efp-op-empty");if(empty)empty.classList.toggle("show",bookmarkOnly&&shown===0);
}
function toggleBookmark(qi){var data=getBookmarks(),key=questionKey(qi);if(data[key])delete data[key];else data[key]=true;saveBookmarks(data);track("original_practice_bookmark",{subject:SUBJECT,chapter:state.chapterName,bookmarked:!!data[key]});applyBookmarkFilter();updateBookmarkBar()}
function enhanceQuiz(){
 var container=document.getElementById("questions-container");if(!container)return;
 var bar=document.createElement("div");bar.className="efp-op-bookmarkbar";bar.innerHTML='<span class="efp-op-bookmark-meta"></span><button type="button"></button>';bar.querySelector("button").onclick=function(){bookmarkOnly=!bookmarkOnly;applyBookmarkFilter();updateBookmarkBar()};container.parentNode.insertBefore(bar,container);
 container.querySelectorAll(":scope > [id^='q-']").forEach(function(card){card.classList.add("efp-op-qcard");var qi=Number((card.id||"").replace("q-","")),star=document.createElement("button");star.type="button";star.className="efp-op-star";star.onclick=function(event){event.stopPropagation();toggleBookmark(qi)};card.appendChild(star)});
 var empty=document.createElement("div");empty.className="efp-op-empty";empty.textContent="No bookmarked questions in this section / इस सेक्शन में कोई बुकमार्क प्रश्न नहीं है।";container.insertAdjacentElement("afterend",empty);applyBookmarkFilter();updateBookmarkBar();
}
function enhance(){addTopbar();if(state.screen==="quiz")enhanceQuiz();else enhanceChapters()}

var baseRender=render;
render=function(){
 baseRender();enhance();efpApplySeoMeta();
 if(state.screen==="quiz"&&pendingDeepQuestion!==null){var qi=pendingDeepQuestion;pendingDeepQuestion=null;setTimeout(function(){var card=document.getElementById("q-"+qi);if(!card)return;card.classList.add("efp-op-deep-focus");try{card.scrollIntoView({behavior:"smooth",block:"center"})}catch(e){card.scrollIntoView()}setTimeout(function(){card.classList.remove("efp-op-deep-focus")},2200)},80)}
};
var baseSelectOption=selectOption;
selectOption=function(qi,origIdx){var q=state.quizData&&state.quizData[state.currentSection]&&state.quizData[state.currentSection].questions[qi];baseSelectOption(qi,origIdx);if(q)track("original_practice_answer",{practice:CFG.label,subject:SUBJECT,chapter:state.chapterName,section:state.currentSection+1,question:qi+1,correct:origIdx===q.answer})};
var baseSwitchSection=switchSection;switchSection=function(index){pendingDeepQuestion=null;baseSwitchSection(index);syncUrl("quiz")};
var basePrevSection=prevSection;prevSection=function(){pendingDeepQuestion=null;basePrevSection();if(state.screen==="quiz")syncUrl("quiz")};
var baseNextSection=nextSection;nextSection=function(){pendingDeepQuestion=null;baseNextSection();if(state.screen==="quiz")syncUrl("quiz")};
var baseGoChapters=goChapters;goChapters=function(){pendingDeepQuestion=null;baseGoChapters();syncUrl("chapters")};
var baseGoToQuiz=goToQuiz;goToQuiz=function(chapter){pendingDeepQuestion=null;markVisited(chapter);baseGoToQuiz(chapter);syncUrl("quiz");track("original_practice_chapter_open",{practice:CFG.label,subject:SUBJECT,chapter:chapter})};

function applyDeepLink(){
 try{
  var params=new URLSearchParams(location.search),chapter=params.get("chapter"),section=Number(params.get("section")||1),question=Number(params.get("q")||0);
  if(!chapter||!MASTER[chapter])return;
  markVisited(chapter);state.screen="quiz";state.chapterName=chapter;state.quizData=MASTER[chapter];state.currentSection=Math.min(state.quizData.length-1,Math.max(0,Math.floor(section||1)-1));state.shuffleMap={};saved.answers={};
  if(Number.isFinite(question)&&question>=1&&state.quizData[state.currentSection]&&question<=state.quizData[state.currentSection].questions.length)pendingDeepQuestion=Math.floor(question)-1;
 }catch(e){}
}

window.addEventListener("pageshow",function(event){if(!event.persisted)return;saved.answers={};state.shuffleMap={};if(state.screen==="quiz")render()});
applyDeepLink();render();
})();
