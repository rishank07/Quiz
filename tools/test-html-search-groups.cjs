// EFP_TEST_JSDOM=/path/to/jsdom node tools/test-html-search-groups.cjs
const {JSDOM,VirtualConsole}=require(process.env.EFP_TEST_JSDOM||'jsdom');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),delay=ms=>new Promise(r=>setTimeout(r,ms));
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
function setup(html,url){
 const dom=new JSDOM(html,{url:'https://examfusionprep.com'+url,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});
 const w=dom.window,scrolled=[];
 w.HTMLElement.prototype.getClientRects=function(){return this.closest('[hidden],.hidden')?[]:[{width:100,height:40}]};
 w.HTMLElement.prototype.scrollIntoView=function(){scrolled.push(this)};
 w.scrollTo=()=>{};w.scrollBy=()=>{};
 w.sessionStorage.setItem('efp_search_return_v1:test',JSON.stringify({token:'test',source:'https://examfusionprep.com/',inputs:[{id:'searchBox',value:'BRICS'}]}));
 w.localStorage.setItem('attempt','{"q6":1,"bookmark":true}');
 return {dom,w,scrolled,storage:JSON.stringify(w.localStorage),session:JSON.stringify(w.sessionStorage)};
}
async function quiz(html,hash){const p=setup(html,'/Books/sample.html?efSearchReturn=test#'+hash);p.w.eval(read('search-context.js'));await delay(50);return p}
async function mindmap(html){const p=setup(html,'/Mind%20Maps/sample.html?efSearchReturn=test#facts');p.w.eval(read('mindmap-deeplink.js'));await delay(70);return p}
function preserve(p){assert.equal(JSON.stringify(p.w.localStorage),p.storage);assert.equal(JSON.stringify(p.w.sessionStorage),p.session)}
(async()=>{
 // Same bilingual question, repeated term, split markup, answers and hidden text.
 for(const [id,cls] of [['q6','question-box'],['q-5','question-card'],['rp-0-5','qcard'],['bbq-6','question-box'],['s1-6','question-box']]){
  const p=await quiz(`<main><article class="${cls}" id="${id}"><h2>Summary of <b>BRICS</b>? BRICS?</h2><p>ब्रिक्स (BRICS) का सारांश?</p><div class="options">BRICS answer</div><div class="explanation">BRICS explanation</div><p hidden>BRICS</p></article></main>`,id);
  const b=p.w.document.querySelector('.efp-context-next');assert.equal(b.textContent,'1/1');assert(b.disabled);assert.equal(p.w.document.querySelectorAll('mark').length,3);
  assert.equal(p.w.document.querySelectorAll('.options mark,.explanation mark,[hidden] mark').length,0);
  b.click();assert.equal(b.textContent,'1/1');assert.equal(p.scrolled.length,0);
  p.w.dispatchEvent(new p.w.PageTransitionEvent('pageshow',{persisted:true}));await delay(30);assert.equal(p.w.document.querySelectorAll('.efp-search-context').length,1);assert.equal(b.textContent,'1/1');
  preserve(p);p.w.document.querySelector('.efp-context-dismiss').click();await delay(30);assert.equal(p.w.document.querySelectorAll('mark,.efp-search-context').length,0);preserve(p);p.dom.window.close();
 }
 console.log('PASS bilingual/repeated text counts once across five quiz templates; answers, explanations and saved state preserved');
 for(const make of [quiz,mindmap]){
  const p=await make('<section class="panel active" id="facts"><article class="card" id="first"><p>BRICS</p><p>BRICS हिंदी</p></article><article class="card" id="second"><p>BRICS members</p><p>BRICS सदस्य</p></article><article class="card" hidden><p>BRICS invisible</p></article></section>','facts');
  const b=p.w.document.querySelector('.efp-context-next,.efp-mm-next');assert.equal(b.textContent,'1/2 ↓');assert(!b.disabled);
  b.click();assert.equal(b.textContent,'2/2 ↓');assert.equal(p.scrolled.at(-1).closest('.card').id,'second');
  b.click();assert.equal(b.textContent,'1/2 ↓');assert.equal(p.scrolled.at(-1).closest('.card').id,'first');
  assert.equal(p.w.document.querySelectorAll('mark').length,4);preserve(p);p.dom.window.close();
 }
 const row=await mindmap('<section class="panel active" id="facts"><table><tr id="one"><td>BRICS BRICS</td><td>BRICS हिंदी</td></tr><tr id="two"><td>BRICS next</td><td>BRICS अगला</td></tr></table></section>');
 const next=row.w.document.querySelector('.efp-mm-next');assert.equal(next.textContent,'1/2 ↓');next.click();assert.equal(row.scrolled.at(-1).closest('tr').id,'two');preserve(row);row.dom.window.close();
 const single=await mindmap('<section class="panel active" id="facts"><div class="card"><p>BRICS</p><p>BRICS हिंदी</p></div></section>');
 assert.equal(single.w.document.querySelector('.efp-mm-next').textContent,'1/1');assert(single.w.document.querySelector('.efp-mm-next').disabled);single.dom.window.close();
 console.log('PASS HTML/mindmap unique cards, bilingual table rows, single-result disabling, hidden-result exclusion and wraparound');
})().catch(e=>{console.error(e);process.exit(1)});
