// EFP_TEST_JSDOM=/path/to/jsdom node tools/test-search-product-audit.cjs
// Real checked-in indexes and page renderers; layout/navigation are simulated.
const {JSDOM,VirtualConsole}=require(process.env.EFP_TEST_JSDOM||'jsdom');
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(check){for(let i=0;i<500;i++){if(check())return;await delay(20)}assert(check(),'Search did not settle');}
function page(html,url='/'){
 const dom=new JSDOM(html,{url:'https://examfusionprep.com'+url,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole()}),w=dom.window,scrolls=[];
 w.HTMLElement.prototype.getClientRects=function(){for(let el=this;el;el=el.parentElement){if(!el.classList.contains('efp-context-revealed')&&w.getComputedStyle(el).display==='none')return []}return [{width:100,height:40}]};
 w.HTMLElement.prototype.scrollIntoView=function(){scrolls.push(this)};w.scrollTo=()=>{};w.scrollBy=()=>{const dock=w.document.querySelector("html>.efp-search-context");if(dock)scrolls.push(dock)};w.confirm=()=>true;w.alert=()=>{};w.matchMedia=()=>({matches:false});
 const run=s=>vm.runInContext(s,dom.getInternalVMContext());
 return {dom,w,run,scrolls,inline:()=>Array.from(w.document.scripts).forEach(s=>{if(!s.src&&!/json/i.test(s.type))run(s.textContent)})};
}
function workers(p,{real=false,failFirst=false}={}){
 const stats={created:0,alive:0,max:0,queries:[],failed:false,errors:[]};
 p.w.Worker=class{
  constructor(){stats.created++;stats.alive++;stats.max=Math.max(stats.max,stats.alive);this.dead=false;}
  postMessage(m){
   if(m.type==='init'){
    this.options=m.options;
    p.w.setTimeout(()=>{
     if(this.dead)return;
     if(failFirst&&!stats.failed&&this.options.indexUrl.includes('mindmaps')){stats.failed=true;this.onerror();return;}
     if(!real){this.onmessage({data:{type:'ready'}});return;}
     const c={console,URL,setTimeout,clearTimeout,postMessage:msg=>{if(msg.type==='error')stats.errors.push([this.options.indexUrl,msg.message]);if(!this.dead)this.onmessage({data:msg})}};c.window=c;c.self=c;vm.createContext(c);
     c.importScripts=(...urls)=>urls.forEach(url=>vm.runInContext(read(decodeURIComponent(new URL(url,'https://examfusionprep.com').pathname).slice(1)),c));
     vm.runInContext(read('search-worker.js'),c);this.context=c;c.onmessage({data:m});
    },5);
   }else{
    stats.queries.push(m.query);
    p.w.setTimeout(()=>{if(this.dead)return;if(real)this.context.onmessage({data:m});else this.onmessage({data:{type:'result',id:m.id,results:[{f:'/Mind%20Maps/sample.html#facts',t:'Result',b:'Mind Maps',x:'Nitish Kumar',score:1}]}})},5);
   }
  }
  terminate(){if(!this.dead){this.dead=true;stats.alive--;this.context=null;}}
 };
 return stats;
}
const mini='<div class="search-wrap"><input type="search" id="searchBox"></div><ul id="menuList"></ul><div id="noResults"></div>';
function type(p,value,detail){const box=p.w.document.getElementById('searchBox');box.value=value;box.dispatchEvent(detail?new p.w.CustomEvent('input',{bubbles:true,detail}):new p.w.Event('input',{bubbles:true}));}
function phase(p,phase,query='Nitish'){p.w.dispatchEvent(new p.w.CustomEvent('efp-search-state',{detail:{phase,query}}));}
async function lifecycle(){
 const p=page(mini);p.run(read('search-logic.js'));p.w.efpWithHomeSearchWorker=fn=>Promise.resolve().then(fn);
 let slowCallback;const native=p.w.setTimeout;p.w.setTimeout=(fn,ms,...args)=>ms===20000?(slowCallback=fn,0):native(fn,ms,...args);
 p.run(read('homepage-search-ui.js'));await delay(20);type(p,'Nitish');
 slowCallback();await delay(30);assert(p.w.document.getElementById('efSearchTools').classList.contains('is-searching'));assert(p.w.document.getElementById('efSearchStatus').textContent.includes('still running'));
 phase(p,'fulltext-done');await delay(30);assert(p.w.document.getElementById('efSearchTools').classList.contains('is-searching'),'Fulltext completion cannot finish pending core indexes');
 p.w.dispatchEvent(new p.w.PageTransitionEvent('pageshow',{persisted:false}));await delay(20);assert(p.w.document.getElementById('efSearchTools').classList.contains('is-searching'));
 phase(p,'source-error');phase(p,'core-done');await delay(100);assert(!p.w.document.getElementById('efSearchTools').classList.contains('is-searching'));assert(!p.w.document.getElementById('noResults').classList.contains('show'),'A failed source is not a genuine zero result');assert(p.w.document.getElementById('efSearchStatus').textContent.includes('could not load'));
 let retries=0;p.w.document.getElementById('searchBox').addEventListener('input',e=>{if(e.detail?.efpRetrySearch)retries++});p.w.document.querySelector('#efSearchTools > button').click();assert.equal(retries,1);assert(p.w.document.getElementById('efSearchTools').classList.contains('is-searching'));
 phase(p,'core-done');phase(p,'fulltext-done');await delay(100);assert(p.w.document.getElementById('noResults').classList.contains('show'));p.dom.window.close();
 const retry=page(mini),stats=workers(retry,{failFirst:true});retry.run(read('search-logic.js'));retry.run('efLoadSearchIndexScript=function(){return Promise.reject(new Error("Index offline"))}');retry.run(read('homepage-fulltext-search.js'));retry.run(read('homepage-search-ui.js'));await delay(20);type(retry,'Nitish');await until(()=>retry.w.document.querySelector('[data-bookfullitem]')&&!retry.w.document.getElementById('efSearchTools').classList.contains('is-searching'));
 await until(()=>retry.w.document.getElementById('efSearchStatus').textContent.includes('could not load'));const before=stats.created;type(retry,'Nitish',{efpRetrySearch:true});await until(()=>!retry.w.document.getElementById('efSearchTools').classList.contains('is-searching'));await delay(100);assert.equal(stats.created,before+1,'Retry only needs to reload the failed source; successful sources reuse cached hits');assert(!retry.w.document.getElementById('efSearchStatus').textContent.includes('could not load'));assert.equal(stats.alive,0);retry.dom.window.close();
 console.log('PASS truthful slow/completion/zero-result status, two-pipeline barrier, recoverable failed-source retry and bounded worker lifetime');
}
async function interruptedSnapshot(){
 const p=page(mini);let reruns=0;p.w.efpWithHomeSearchWorker=fn=>Promise.resolve().then(fn);
 p.w.localStorage.setItem('efp_home_search_query_v1','Nitish');
 p.w.sessionStorage.setItem('efp_home_search_results_v1',JSON.stringify({query:'Nitish',html:'',complete:false}));
 p.w.document.getElementById('searchBox').addEventListener('input',e=>{if(!e.detail?.efpRestoredSearch)reruns++});
 p.run(read('homepage-search-ui.js'));p.w.dispatchEvent(new p.w.Event('load'));await delay(50);
 assert.equal(reruns,1,'Interrupted empty snapshot restarts a genuine cold search');assert(p.w.document.getElementById('efSearchTools').classList.contains('is-searching'));
 phase(p,'core-done');phase(p,'fulltext-done');await delay(60);p.w.dispatchEvent(new p.w.PageTransitionEvent('pagehide',{persisted:false}));
 assert.equal(JSON.parse(p.w.sessionStorage.getItem('efp_home_search_results_v1')).complete,true,'A valid empty search is marked complete');p.dom.window.close();
 console.log('PASS interrupted empty snapshot recovery and completed-empty snapshot distinction');
}
async function coldHome(){
 const p=page(read('index.html')),stats=workers(p,{real:true});p.run(read('search-logic.js'));p.run(read('search-index-main.js'));
 p.run(Array.from(p.w.document.scripts).find(s=>!s.src&&s.textContent.includes('function rerankCruxTricksHits')).textContent);
 p.run(read('homepage-search-ui.js'));p.run(read('homepage-fulltext-search.js'));await delay(30);
 const routes=()=>Array.from(p.w.document.querySelectorAll('li.ef-search-result-item:not(.ef-search-duplicate) a')).map(a=>{const u=new URL(a.href);u.searchParams.delete('efSearchQuery');return u.pathname+u.search+u.hash;}).sort();
 type(p,'Nitish');await until(()=>!p.w.document.getElementById('efSearchTools').classList.contains('is-searching'));const cold=routes();assert(cold.length>10,'Nitish must include all completed sources');assert.equal(stats.max,1);assert.equal(stats.alive,0);assert.deepEqual(stats.errors,[]);assert(!p.w.document.getElementById('efSearchStatus').textContent.includes('could not load'));
 const mm=Array.from(p.w.document.querySelectorAll('a')).find(a=>a.href.includes('13_state_executive_mindmap'));assert(mm);assert.equal(new URL(mm.href).hash,'#compare');assert.equal(new URL(mm.href).searchParams.get('efSearchQuery'),'Nitish');
 type(p,'');type(p,'  nItIsH  ');await until(()=>!p.w.document.getElementById('efSearchTools').classList.contains('is-searching'));assert.deepEqual(routes(),cold,'Cold and repeat completed result routes must be identical');assert.equal(stats.alive,0);
 console.log('PASS actual 18 homepage sources: cold/repeat Nitish has',cold.length,'identical unique results; exact mindmap panel and query handoff; one worker max');p.dom.window.close();
}
async function options(){
 const file='Original Practice/Static_GK_Complete_Practice.html',params=new URLSearchParams({subject:'Static GK',chapter:'06. Popular Nicknames of Famous Personalities',section:'3',q:'4',efSearchQuery:'Nitish'});
 const p=page(read(file),'/'+encodeURI(file)+'?'+params);p.inline();p.run(read('search-logic.js'));p.run('efCreateSearchWorker=function(){return {search:function(){return Promise.resolve([])}}}');p.run(read('Original Practice/original-practice.js'));p.run(read('search-context.js'));await delay(160);
 assert(p.w.document.querySelector('.efp-search-context'));assert(!p.w.document.querySelector('.efp-context-explanation').hidden);assert.equal(p.w.document.querySelectorAll('.option-btn mark').length,0,'Entry must not reveal an option');const before=p.run('JSON.stringify({score:state.score,answers:state.answerMap,shuffle:state.shuffleMap})');p.w.document.querySelector('.efp-context-explanation').click();await delay(60);assert(p.w.document.querySelector('.option-btn mark'));assert.equal(p.run('JSON.stringify({score:state.score,answers:state.answerMap,shuffle:state.shuffleMap})'),before);assert.equal(p.scrolls[0].className,'efp-search-context','Entry centers the inline yellow control');p.w.document.querySelector('.efp-context-dismiss').click();await delay(40);assert.equal(p.w.document.querySelectorAll('mark.efp-context-match,.efp-search-context').length,0);p.dom.window.close();
 const englishFile='Original Practice/English_Grammar_Complete_Practice.html';let html=read(englishFile);const fixture={'Fixture':[{title:'Section',questions:[{id:'fixture',prompt:'Choose a name',sentence:'Name?',options:['Karpoori','Nitish','A','B'],answer:0,explanation:'Karpoori is correct.'}]}]};html=html.replace(/(<script[^>]+id=["']master-data["'][^>]*>)[\s\S]*?(<\/script>)/,'$1'+JSON.stringify(fixture)+'$2');
 const e=page(html,'/'+encodeURI(englishFile)+'?chapter=Fixture&section=1&q=1&efSearchQuery=Nitish');e.inline();e.run(read('search-logic.js'));e.run(read('Original Practice/english-practice.js'));e.run(read('search-context.js'));await delay(100);assert(e.w.document.querySelector('.efp-search-context'));e.dom.window.close();
 const r=page('<main id="quiz-container"></main>','/rapid.html?efSearchQuery=Nitish#rp-0-0');r.run("const SECTIONS=[{questions:[{q:'Name?',a:'Karpoori',o:['Karpoori','Nitish'],exp:'Karpoori facts.'}]}];let current=0;function openSection(i){document.querySelector('main').innerHTML='<article id=\"rp-0-0\" class=\"qcard\"><p>Name?</p><div class=\"options\"><button>Nitish</button></div></article>'}openSection(0)");r.run(read('search-context.js'));await delay(70);assert(r.w.document.querySelector('.efp-search-context'));r.dom.window.close();
 console.log('PASS actual Static GK screenshot route, English and Rapid option-only matches; explicit preview preserves score, answers and shuffle');
}
async function mindmap(){
 const file='Mind Maps/Polity/ChapterNames/13_state_executive_mindmap.html',p=page(read(file),'/'+encodeURI(file)+'?efSearchQuery=Nitish');p.inline();p.run(read('mindmap-deeplink.js'));await delay(120);
 assert.equal(p.w.location.hash,'#compare');assert(p.w.document.querySelector('#compare.active'));assert(p.w.document.querySelector('.efp-mindmap-search-context'));assert(p.w.document.querySelector('mark.efp-mindmap-match'));p.w.document.querySelector('.efp-mm-dismiss').click();p.w.dispatchEvent(new p.w.PageTransitionEvent('pageshow',{persisted:true}));await delay(30);assert.equal(p.w.document.querySelectorAll('.efp-mindmap-search-context,mark').length,0);p.dom.window.close();
 console.log('PASS actual unanchored Polity screenshot route: resolves matching panel, query works without sessionStorage, persistent dismissal');
}
(async()=>{await lifecycle();await interruptedSnapshot();await coldHome();await options();await mindmap()})().catch(e=>{console.error(e);process.exitCode=1});
