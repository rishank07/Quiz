// EFP_TEST_JSDOM=/path/to/jsdom node tools/test-original-practice-search-entry.cjs
const {JSDOM,VirtualConsole}=require(process.env.EFP_TEST_JSDOM||'jsdom');
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<100;i++){if(fn())return;await delay(20)}assert(fn(),'Search did not finish');}
async function page(noStorage=false,resume=null){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(read('Original Practice/English_Grammar_Complete_Practice.html'),{url:resume?resume.url:'https://examfusionprep.com/Original%20Practice/English_Grammar_Complete_Practice.html',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window,scrolls=[];
 w.HTMLElement.prototype.getClientRects=function(){return this.closest('.hidden:not(.efp-context-revealed),[hidden]')?[]:[{width:100,height:40}]};
 w.HTMLElement.prototype.scrollIntoView=function(){scrolls.push(this)};w.scrollTo=()=>{};w.scrollBy=()=>{};w.confirm=()=>true;w.matchMedia=()=>({matches:false});
 const run=s=>vm.runInContext(s,dom.getInternalVMContext());
 Array.from(w.document.scripts).forEach(s=>{if(!s.src&&!/json/i.test(s.type))run(s.textContent)});
 run(read('search-logic.js'));run(read('Original Practice/english-practice.js'));run(read('back-nav.js'));
 if(resume)w.EFP_APP_SESSION={getSearchState:()=>resume.state,restoreSearchScroll:()=>{w.__restored=true}};
 run(read('search-context.js'));await delay(40);
 if(noStorage)w.Storage.prototype.setItem=function(){throw new Error('Storage unavailable')};
 return {dom,w,run,scrolls,errors};
}
(async()=>{
 for(const [query,qi,noStorage] of [['Noun',2,false],['Adverb',6,false],['Noun',2,true]]){
  const p=await page(noStorage),d=p.w.document,input=d.querySelector('.efp-op-search input');
  p.w.dispatchEvent(new p.w.Event('pointerdown'));input.value=query;input.dispatchEvent(new p.w.Event('input',{bubbles:true}));
  await until(()=>d.querySelector(`button[data-search-chapter="01. Basics"][data-search-question="${qi}"]`));
  p.w.dispatchEvent(new p.w.Event('pointerdown'));d.querySelector(`button[data-search-chapter="01. Basics"][data-search-question="${qi}"]`).click();
  await until(()=>d.querySelector('.efp-context-location')?.textContent.endsWith('Question '+(qi+1)));await delay(100);
  const bar=d.querySelector('.efp-search-context');assert.equal(bar.nextElementSibling.id,'q-'+qi);assert.equal(p.scrolls.at(-1),bar);
  assert.equal(new URL(p.w.location.href).searchParams.get('q'),String(qi+1));assert.equal(new URL(p.w.location.href).searchParams.get('efSearchQuery'),query);
  assert.equal(d.querySelectorAll('.efp-search-context').length,1);assert.equal(d.querySelectorAll('#opts-'+qi+' mark').length,0,'Options preview waits for Dekho');
  const answers=p.run('JSON.stringify(saved.answers)'),orders=p.run('JSON.stringify(state.shuffleMap)'),history=p.w.history.length;
  bar.querySelector('.efp-context-explanation').click();await delay(50);
  assert(d.querySelector('#opts-'+qi+' mark'),'Dekho shows matched option without answering');assert(d.querySelector('#exp-'+qi+'.efp-context-revealed'));
  assert.equal(p.run('JSON.stringify(saved.answers)'),answers);assert.equal(p.run('JSON.stringify(state.shuffleMap)'),orders);assert.equal(p.run('chapterStats(state.chapterName).attempted'),0);assert.equal(p.w.history.length,history);
  const snapshot=p.w.EFP_SEARCH_CONTEXT.snapshot();assert.equal(snapshot.previewed.length,1);
  if(query==='Noun'&&!noStorage){const resumed=await page(false,{url:p.w.location.href,state:snapshot});await until(()=>resumed.w.document.querySelector('#opts-'+qi+' mark'));assert.equal(resumed.scrolls.length,0,'Resume preserves reading scroll');assert(resumed.w.__restored);assert(resumed.w.document.querySelector('#exp-'+qi+'.efp-context-revealed'));resumed.dom.window.close();}
  d.querySelector('.efp-context-next').click();await delay(60);assert.equal(d.querySelectorAll('.efp-search-context').length,1);assert.equal(p.scrolls.at(-1),d.querySelector('.efp-search-context'));assert.equal(p.run('JSON.stringify(saved.answers)'),answers);
  p.w.dispatchEvent(new p.w.Event('wheel'));const before=p.scrolls.length;d.querySelector('link[href*="search-context.css"]').dispatchEvent(new p.w.Event('load'));await delay(30);assert.equal(p.scrolls.length,before);
  d.querySelector('.efp-context-dismiss').click();await delay(30);assert.equal(d.querySelectorAll('.efp-search-context,mark.efp-context-match').length,0);assert(d.querySelector('#q-2 .sentence-box .target'),'Original grammar emphasis preserved');
  assert.deepEqual(p.errors,[]);p.dom.window.close();console.log('PASS actual in-page '+query+' Q'+(qi+1)+(noStorage?' without session storage':'')+': exact question, centered bar after touch/typing, preview, next, dismiss, no attempts or shuffle changes');
 }
})().catch(e=>{console.error(e);process.exitCode=1});
