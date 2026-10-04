// EFP_TEST_JSDOM=/path/to/jsdom node tools/test-app-search-resume.cjs
const {JSDOM,VirtualConsole}=require(process.env.EFP_TEST_JSDOM||'jsdom');
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),delay=ms=>new Promise(r=>setTimeout(r,ms));
const SESSION='efp_app_session_v1',PENDING='efp_app_resume_pending_v1',TRIP='efp_search_return_v1:test';
const trip={token:'test',source:'https://examfusionprep.com/?source=windows-pwa',inputs:[{id:'searchBox',value:'Pakistan'}],filters:[],results:[{index:0,html:'<a href="/practice.html">Saved match</a>',view:{hidden:false,className:null,style:null},scroll:0}],presentation:[]};
function create(html,url,local={},session={},installed=true){
 const dom=new JSDOM(html,{url:'https://examfusionprep.com'+url,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole()}),w=dom.window,scrolls=[];
 const style=w.document.createElement('style');style.textContent='.hidden{display:none}'+read('search-context.css');w.document.head.appendChild(style);
 w.HTMLElement.prototype.getClientRects=function(){for(let el=this;el;el=el.parentElement)if(!el.classList.contains('efp-context-revealed')&&w.getComputedStyle(el).display==='none')return [];return [{width:100,height:40}]};
 w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollBy=()=>{};w.scrollTo=(a,b)=>{scrolls.push(typeof a==='object'?a.top:b)};
 w.matchMedia=q=>({matches:installed&&q==='(display-mode: standalone)',addEventListener(){}});w.confirm=()=>true;w.alert=()=>{};
 Object.entries(local).forEach(([k,v])=>w.localStorage.setItem(k,v));Object.entries(session).forEach(([k,v])=>w.sessionStorage.setItem(k,v));
 const run=s=>vm.runInContext(s,dom.getInternalVMContext());
 return {dom,w,run,scrolls,local:()=>Object.fromEntries(Object.keys(w.localStorage).map(k=>[k,w.localStorage.getItem(k)]))};
}
const economics=read('Original Practice/Economics_Complete_Practice.html'),source=JSON.parse(economics.match(/<script[^>]+id=["']master-data["'][^>]*>([\s\S]*?)<\/script>/)[1]),subject=Object.keys(source)[0];
const question={q:{en:'Which organisation?',hi:'कौन सा संगठन?'},a:{en:'A',hi:'अ'},o:[{en:'A',hi:'अ'},{en:'B',hi:'ब'},{en:'C',hi:'स'},{en:'D',hi:'द'}],exp:{en:'Pakistan is mentioned in the explanation.',hi:'पाकिस्तान से जुड़ा तथ्य।'}};
const fixture={[subject]:{'01. First':[{title:{en:'Fixture',hi:'अभ्यास'},questions:[question,question]}]}};
const html=economics.replace(/(<script[^>]+id=["']master-data["'][^>]*>)[\s\S]*?(<\/script>)/,'$1'+JSON.stringify(fixture)+'$2');
const url='/Original%20Practice/Economics_Complete_Practice.html?'+new URLSearchParams({subject,chapter:'01. First',section:'1',q:'1',efSearchReturn:'test'});
async function practice(local={},session={[TRIP]:JSON.stringify(trip)},installed=true,late=false){
 const p=create(html,session[PENDING]?JSON.parse(session[PENDING]).url:url,local,session,installed);
 p.w.document.querySelectorAll('script').forEach(s=>{if(!s.src&&!/json/i.test(s.type))p.run(s.textContent)});
 p.run(read('search-logic.js'));p.run('efCreateSearchWorker=function(){return {search:function(){return Promise.resolve([])}}}');p.run(read('Original Practice/original-practice.js'));
 if(!late)p.run(read('app-session.js'));
 p.run(read('search-context.js'));await delay(80);
 if(late){p.run(read('app-session.js'));await delay(80)}
 return p;
}
(async()=>{
 const first=await practice();first.w.document.querySelector('.efp-context-next').click();await delay(70);first.w.document.querySelector('.efp-context-explanation').click();await delay(60);
 Object.defineProperty(first.w,'scrollY',{value:735});first.w.EFP_APP_SESSION.save();
 const saved=JSON.parse(first.w.localStorage.getItem(SESSION)),local=first.local();
 assert(saved.searchState.view.revealed.length);assert.equal(saved.searchState.trip.token,'test');assert.equal(first.run('state.score.attempted'),0);
 first.dom.window.close();
 // Fresh sessionStorage, as after a full Android/Windows process recreation.
 for(const late of [false,true]){
  const resumed=await practice(local,{[PENDING]:JSON.stringify(saved)},true,late);await delay(760);
  assert(resumed.w.sessionStorage.getItem(TRIP));assert.equal(resumed.w.document.querySelector('.efp-context-next').textContent,'2/2 ↓');
  assert.equal(resumed.w.document.querySelector('#exp-1 mark').textContent,'Pakistan');assert(resumed.w.document.querySelector('#exp-1').getClientRects().length);
  assert.equal(resumed.run('state.score.attempted'),0);assert.equal(resumed.w.document.querySelectorAll('.option-btn.answered').length,0);assert.equal(resumed.scrolls.at(-1),735);
  resumed.w.document.querySelector('.efp-context-dismiss').click();await delay(40);resumed.w.EFP_APP_SESSION.save();
  const cleared=JSON.parse(resumed.w.localStorage.getItem(SESSION));assert(cleared.searchState.view.dismissed);assert.equal(cleared.searchState.view.revealed.length,0);
  const again=await practice(resumed.local(),{[PENDING]:JSON.stringify(cleared)},true,late);await delay(120);
  assert.equal(again.w.document.querySelectorAll('.efp-search-context,mark.efp-context-match,.efp-context-revealed').length,0);
  assert.equal(again.run('state.score.attempted'),0);again.dom.window.close();resumed.dom.window.close();
 }
 console.log('PASS real Original Practice cold reload: selected result, explanation highlight, reading position and zero attempts; dismissed context stays cleared with early/late app scripts');
 const interacting=await practice(local,{[PENDING]:JSON.stringify(saved)});
 interacting.w.dispatchEvent(new interacting.w.Event('pointerdown'));const scrollCount=interacting.scrolls.length;await delay(740);
 assert.equal(interacting.scrolls.length,scrollCount,'Resume timers must not override the learner after interaction');interacting.dom.window.close();
 const browser=await practice(local,{},false);assert.equal(browser.w.document.querySelectorAll('.efp-search-context').length,0);assert.equal(browser.w.sessionStorage.getItem(TRIP),null);browser.dom.window.close();
 console.log('PASS ordinary browser ignores the installed-app search snapshot');
 // Mindmap result ordinal can identify two matches in the very same panel.
 const mapHtml='<main><section class="panel active" id="facts"><article class="card" id="first">Pakistan first</article><article class="card" id="second">Pakistan second</article><article class="card" id="third">Pakistan third</article></section></main>';
 async function map(local={},session={[TRIP]:JSON.stringify(trip)}){const p=create(mapHtml,'/Mind%20Maps/sample.html?efSearchReturn=test#facts',local,session);p.run(read('app-session.js'));p.run(read('mindmap-deeplink.js'));await delay(90);return p}
 const mapFirst=await map();mapFirst.w.document.querySelector('.efp-mm-next').click();mapFirst.w.document.querySelector('.efp-mm-next').click();mapFirst.w.EFP_APP_SESSION.save();
 const mapSaved=JSON.parse(mapFirst.w.localStorage.getItem(SESSION)),mapResumed=await map(mapFirst.local(),{[PENDING]:JSON.stringify(mapSaved)});
 assert.equal(mapResumed.w.document.querySelector('.efp-mm-next').textContent,'3/3 ↓');assert(mapResumed.w.document.querySelector('#third .efp-mm-current-match'));
 mapResumed.w.document.querySelector('.efp-mm-dismiss').click();mapResumed.w.EFP_APP_SESSION.save();const mapCleared=JSON.parse(mapResumed.w.localStorage.getItem(SESSION));
 const mapAgain=await map(mapResumed.local(),{[PENDING]:JSON.stringify(mapCleared)});assert.equal(mapAgain.w.document.querySelectorAll('.efp-mindmap-search-context,mark').length,0);
 [mapFirst,mapResumed,mapAgain].forEach(p=>p.dom.window.close());
 console.log('PASS mindmap cold reload: third result in same panel retained; cleared highlight remains dismissed');
})().catch(e=>{console.error(e);process.exit(1)});
