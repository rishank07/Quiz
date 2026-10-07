// EFP_TEST_JSDOM=/path/to/jsdom node tools/test-html-search-groups.cjs
const {JSDOM,VirtualConsole}=require(process.env.EFP_TEST_JSDOM||'jsdom');
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),vm=require('vm');
const root=path.resolve(__dirname,'..'),delay=ms=>new Promise(r=>setTimeout(r,ms));
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
function setup(html,url){
 const dom=new JSDOM(html,{url:'https://examfusionprep.com'+url,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});
 const w=dom.window,scrolled=[];
 w.HTMLElement.prototype.getClientRects=function(){return this.closest('[hidden],.hidden')?[]:[{width:100,height:40}]};
 w.HTMLElement.prototype.scrollIntoView=function(){scrolled.push(this)};
 w.scrollTo=()=>{};w.scrollBy=()=>{const dock=w.document.querySelector("html>.efp-search-context");if(dock)scrolled.push(dock)};
 w.sessionStorage.setItem('efp_search_return_v1:test',JSON.stringify({token:'test',source:'https://examfusionprep.com/',inputs:[{id:'searchBox',value:'BRICS'}]}));
 w.localStorage.setItem('attempt','{"q6":1,"bookmark":true}');
 return {dom,w,scrolled,storage:JSON.stringify(w.localStorage),session:JSON.stringify(w.sessionStorage)};
}
async function quiz(html,hash){const p=setup(html,'/Books/sample.html?efSearchReturn=test#'+hash);p.w.eval(read('search-context.js'));await delay(50);return p}
async function mindmap(html){const p=setup(html,'/Mind%20Maps/sample.html?efSearchReturn=test#facts');p.w.eval(read('mindmap-deeplink.js'));await delay(70);return p}
function scrollTarget(p){const node=p.scrolled.at(-1);return node.classList.contains('efp-search-context')?p.w.document.getElementById(p.w.location.hash.slice(1))||p.w.document.querySelector('mark.efp-context-current'):node}
function preserve(p){assert.equal(JSON.stringify(p.w.localStorage),p.storage);assert.equal(JSON.stringify(p.w.sessionStorage),p.session)}
(async()=>{
 // Same bilingual question, repeated term, split markup, answers and hidden text.
 for(const [id,cls] of [['q6','question-box'],['q-5','question-card'],['rp-0-5','qcard'],['bbq-6','question-box'],['s1-6','question-box']]){
  const p=await quiz(`<main><article class="${cls}" id="${id}"><h2>Summary of <b>BRICS</b>? BRICS?</h2><p>ब्रिक्स (BRICS) का सारांश?</p><div class="options">BRICS answer</div><div class="explanation">BRICS explanation</div><p hidden>BRICS</p></article></main>`,id);
  const b=p.w.document.querySelector('.efp-context-next');assert.equal(b.textContent,'1/1');assert(b.disabled);assert.equal(p.w.document.querySelectorAll('mark').length,4);
  assert.equal(p.w.document.querySelectorAll('.options mark,[hidden] mark').length,0);
  assert.equal(p.w.document.querySelectorAll('.explanation mark').length,1);
  const entryScrolls=p.scrolled.length;b.click();assert.equal(b.textContent,'1/1');assert.equal(p.scrolled.length,entryScrolls);
  p.w.dispatchEvent(new p.w.PageTransitionEvent('pageshow',{persisted:true}));await delay(30);assert.equal(p.w.document.querySelectorAll('.efp-search-context').length,1);assert.equal(b.textContent,'1/1');
  preserve(p);p.w.document.querySelector('.efp-context-dismiss').click();await delay(30);assert.equal(p.w.document.querySelectorAll('mark,.efp-search-context').length,0);preserve(p);p.dom.window.close();
 }
 console.log('PASS bilingual/repeated text counts once across five quiz templates; visible explanation matches and saved state preserved');
 for(const make of [quiz,mindmap]){
  const p=await make('<section class="panel active" id="facts"><article class="card" id="first"><p>BRICS</p><p>BRICS हिंदी</p></article><article class="card" id="second"><p>BRICS members</p><p>BRICS सदस्य</p></article><article class="card" hidden><p>BRICS invisible</p></article></section>','facts');
  const b=p.w.document.querySelector('.efp-context-next,.efp-mm-next');assert.equal(b.textContent,'1/2 ↓');assert(!b.disabled);
  b.click();assert.equal(b.textContent,'2/2 ↓');assert.equal(scrollTarget(p).closest('.card').id,'second');
  b.click();assert.equal(b.textContent,'1/2 ↓');assert.equal(scrollTarget(p).closest('.card').id,'first');
  assert.equal(p.w.document.querySelectorAll('mark').length,4);preserve(p);p.dom.window.close();
 }
 const row=await mindmap('<section class="panel active" id="facts"><table><tr id="one"><td>BRICS BRICS</td><td>BRICS हिंदी</td></tr><tr id="two"><td>BRICS next</td><td>BRICS अगला</td></tr></table></section>');
 const next=row.w.document.querySelector('.efp-mm-next');assert.equal(next.textContent,'1/2 ↓');next.click();assert.equal(scrollTarget(row).closest('tr').id,'two');preserve(row);row.dom.window.close();
 const single=await mindmap('<section class="panel active" id="facts"><div class="card"><p>BRICS</p><p>BRICS हिंदी</p></div></section>');
 assert.equal(single.w.document.querySelector('.efp-mm-next').textContent,'1/1');assert(single.w.document.querySelector('.efp-mm-next').disabled);single.dom.window.close();
 console.log('PASS HTML/mindmap unique cards, bilingual table rows, single-result disabling, hidden-result exclusion and wraparound');
 // Sibling questions across the document, initially entered at the second hit.
 const siblings=await quiz('<main><article id="q1" class="question-box"><p>BRICS BRICS हिंदी</p></article><article id="q2" class="question-box"><p>Unrelated</p></article><article id="q3" class="question-box"><p>BRICS BRICS हिंदी</p></article><article id="q4" class="question-box"><p>BRICS next</p></article></main>','q3');
 const siblingNext=siblings.w.document.querySelector('.efp-context-next');assert.equal(siblingNext.textContent,'2/3 ↓');
 siblingNext.click();assert.equal(siblingNext.textContent,'3/3 ↓');assert.equal(scrollTarget(siblings).closest('article').id,'q4');
 siblingNext.click();assert.equal(siblingNext.textContent,'1/3 ↓');assert.equal(scrollTarget(siblings).closest('article').id,'q1');
 await delay(40);assert.equal(siblings.w.document.querySelector('.efp-context-next').textContent,'1/3 ↓');preserve(siblings);siblings.dom.window.close();
 // All tabs count, including matches in panels not currently visible.
 const tabs=setup('<style>.panel{display:none}.panel.active{display:block}</style><nav><button data-tab="first">First</button><button data-tab="second">Second</button></nav><section class="panel active" id="first"><div class="card"><p>BRICS BRICS हिंदी</p></div></section><section class="panel" id="second"><div class="card"><p>BRICS next</p></div></section>','/Mind%20Maps/sample.html?efSearchReturn=test#first');
 const baseRects=tabs.w.HTMLElement.prototype.getClientRects;tabs.w.HTMLElement.prototype.getClientRects=function(){return this.closest('.panel:not(.active)')?[]:baseRects.call(this)};
 tabs.w.document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>{tabs.w.document.querySelectorAll('.panel').forEach(panel=>panel.classList.toggle('active',panel.id===b.dataset.tab))}));
 tabs.w.eval(read('mindmap-deeplink.js'));await delay(70);const tabNext=tabs.w.document.querySelector('.efp-mm-next');assert.equal(tabNext.textContent,'1/2 ↓');
 tabNext.click();assert.equal(tabNext.textContent,'2/2 ↓');assert(tabs.w.document.getElementById('second').classList.contains('active'));assert.equal(scrollTarget(tabs).closest('section').id,'second');
 tabNext.click();assert.equal(tabNext.textContent,'1/2 ↓');assert(tabs.w.document.getElementById('first').classList.contains('active'));assert.equal(tabs.w.location.hash,'#first');preserve(tabs);tabs.dom.window.close();
 console.log('PASS page-wide sibling questions and navigation across hidden mindmap panels');
 // Real Economics source: 17 BRICS questions including option-only matches across four sections.
 const html=read('Original Practice/Economics_Complete_Practice.html');
 const data=JSON.parse(html.match(/<script[^>]+id=["']master-data["'][^>]*>([\s\S]*?)<\/script>/)[1]);
 const subject=Object.keys(data)[0],chapter=Object.keys(data[subject]).find(name=>name.startsWith('16.'));
 const params=new URLSearchParams({subject,chapter,section:'8',q:'6',efSearchReturn:'test'});
 const econ=setup(html,'/Original%20Practice/Economics_Complete_Practice.html?'+params);
 const run=source=>vm.runInContext(source,econ.dom.getInternalVMContext());econ.w.matchMedia=()=>({matches:false});econ.w.alert=()=>{};econ.w.confirm=()=>true;
 econ.w.document.querySelectorAll('script').forEach(s=>{if(!s.src&&!/json/i.test(s.type))run(s.textContent)});
 run(read('search-logic.js'));run('efCreateSearchWorker=function(){return {search:function(){return Promise.resolve([])}}}');run(read('Original Practice/original-practice.js'));run(read('search-context.js'));await delay(160);
 assert.equal(econ.w.document.querySelector('.efp-context-next').textContent,'16/17 ↓');
 run('selectOption(5,0)');await delay(40);const attemptBefore=run('JSON.stringify({answers:state.answerMap,score:state.score,orders:state.shuffleMap})');
 for(let i=0;i<17;i++){econ.w.document.querySelector('.efp-context-next').click();await delay(45);assert(econ.w.document.querySelector('.efp-context-next').textContent.endsWith('/17 ↓'));}
 assert.equal(econ.w.document.querySelector('.efp-context-next').textContent,'16/17 ↓');assert.equal(run('state.currentSection'),7);
 const before=JSON.parse(attemptBefore),after=JSON.parse(run('JSON.stringify({answers:state.answerMap,score:state.score,orders:state.shuffleMap})'));
 assert.deepEqual(after.answers,before.answers);assert.deepEqual(after.score,before.score);Object.entries(before.orders).forEach(([key,order])=>assert.deepEqual(after.orders[key],order));
 assert(econ.w.document.querySelector('#opts-5 .answered'));assert.equal(econ.w.document.querySelectorAll('.options mark,.option-btn mark,[id^="exp-"].hidden mark').length,0);
 assert.equal(JSON.stringify(econ.w.sessionStorage),econ.session);assert.equal(JSON.parse(econ.w.localStorage.getItem('attempt')).bookmark,true);
 econ.w.document.querySelector('.efp-context-dismiss').click();await delay(40);assert.equal(econ.w.document.querySelectorAll('.efp-search-context,mark.efp-context-match').length,0);econ.dom.window.close();
 console.log('PASS real Economics: 17 results across sections, selected hit index, wraparound, answers/options/order and search-return preservation');
 // Native Original Practice adapters must retain attempts across chapters too.
 async function practiceFixture(english){
  const q=english?{id:'fixture-q',prompt:'BRICS question',sentence:'BRICS हिंदी',options:['A','B','C','D'],answer:0,explanation:'A'}:{q:{en:'BRICS question',hi:'BRICS हिंदी'},a:{en:'A',hi:'अ'},o:[{en:'A',hi:'अ'},{en:'B',hi:'ब'},{en:'C',hi:'स'},{en:'D',hi:'द'}],exp:{en:'A',hi:'अ'}};
  const section={title:english?'Fixture':{en:'Fixture',hi:'अभ्यास'},questions:[q]};
  const firstSection={...section,questions:[q,{...q,id:'fixture-second'}]};
  const fixture=english?{'01. First':[firstSection],'02. Second':[section]}:{[subject]:{'01. First':[firstSection],'02. Second':[section]}};
  const source=read('Original Practice/'+(english?'English_Grammar_Complete_Practice.html':'Economics_Complete_Practice.html'));
  const fixtureHtml=source.replace(/(<script[^>]+id=["']master-data["'][^>]*>)[\s\S]*?(<\/script>)/,'$1'+JSON.stringify(fixture)+'$2');
  const p=setup(fixtureHtml,'/Original%20Practice/'+(english?'English_Grammar_Complete_Practice.html':'Economics_Complete_Practice.html')+'?'+new URLSearchParams({subject,chapter:'01. First',section:'1',q:'2',efSearchReturn:'test'}));
  const exec=s=>vm.runInContext(s,p.dom.getInternalVMContext());p.w.matchMedia=()=>({matches:false});p.w.alert=()=>{};p.w.confirm=()=>true;
  p.w.document.querySelectorAll('script').forEach(s=>{if(!s.src&&!/json/i.test(s.type))exec(s.textContent)});exec(read('search-logic.js'));exec('efCreateSearchWorker=function(){return {search:function(){return Promise.resolve([])}}}');exec(read('Original Practice/'+(english?'english-practice.js':'original-practice.js')));exec(read('search-context.js'));await delay(140);
  assert.equal(p.w.document.querySelector('.efp-context-next').textContent,'2/3 ↓');exec('selectOption(0,0)');await delay(40);
  const answers=exec(english?'JSON.stringify(chapterAnswers(state.chapterName))':'JSON.stringify(state.answerMap)'),order=exec('JSON.stringify(state.shuffleMap)');
  p.w.history.replaceState({...p.w.history.state,efpQuizQuitGuard:true},'',p.w.location.href);const length=p.w.history.length;
  p.w.document.querySelector('.efp-context-next').click();await delay(70);assert.equal(exec('state.chapterName'),'02. Second');assert.equal(p.w.document.querySelector('.efp-context-next').textContent,'3/3 ↓');
  p.w.document.querySelector('.efp-context-next').click();await delay(70);assert.equal(exec('state.chapterName'),'01. First');assert.equal(p.w.document.querySelector('.efp-context-next').textContent,'1/3 ↓');
  assert.equal(exec(english?'JSON.stringify(chapterAnswers(state.chapterName))':'JSON.stringify(state.answerMap)'),answers);const restoredOrders=JSON.parse(exec('JSON.stringify(state.shuffleMap)')),oldOrders=JSON.parse(order);if(english)assert.deepEqual(restoredOrders,oldOrders);else assert.deepEqual(restoredOrders['0-0'],oldOrders['0-0']);assert.equal(p.w.history.length,length);assert(p.w.history.state.efpQuizQuitGuard);assert.equal(JSON.stringify(p.w.sessionStorage),p.session);p.dom.window.close();
 }
 await practiceFixture(false);await practiceFixture(true);
 console.log('PASS native GS/English chapter switches preserve answers, shuffled options, search-return and single Back guard');
 // Shared lazy providers: sections/letters do not yet exist in the DOM.
 for(const kind of ['rapid','blackbook']){
  const p=setup('<main id="quiz-container"></main>','/practice.html?efSearchReturn=test#'+(kind==='rapid'?'rp-0-0':'bbq-1'));
  const exec=s=>vm.runInContext(s,p.dom.getInternalVMContext());
  exec(kind==='rapid'?`const SECTIONS=[{questions:[{q:{en:'BRICS',hi:'BRICS हिंदी'}}]},{questions:[{q:{en:'BRICS next',hi:'BRICS अगला'}}]}];let current=0;const answers={0:1};function openSection(i){current=i;document.querySelector('main').innerHTML='<article class="qcard" id="rp-'+i+'-0"><p>'+SECTIONS[i].questions[0].q.en+'</p><p>'+SECTIONS[i].questions[0].q.hi+'</p></article>'}openSection(0);`:`const vocabData=[{sn:1,word:'Alpha',meaning:'BRICS'},{sn:2,word:'Beta',meaning:'BRICS next'}];let activeLetter='A';const answers={1:1};function showSection(letter){activeLetter=letter;const q=vocabData.find(q=>q.word[0]===letter);document.querySelector('main').innerHTML='<article id="bbq-'+q.sn+'"><h2>'+q.word+'</h2><p>'+q.meaning+'</p></article>'}showSection('A');`);
  exec(read('search-context.js'));await delay(60);assert.equal(p.w.document.querySelector('.efp-context-next').textContent,'1/2 ↓');
  p.w.document.querySelector('.efp-context-next').click();await delay(60);assert.equal(p.w.document.querySelector('.efp-context-next').textContent,'2/2 ↓');assert.equal(scrollTarget(p).closest('article').id,kind==='rapid'?'rp-1-0':'bbq-2');
  assert.equal(exec('JSON.stringify(answers)'),kind==='rapid'?'{"0":1}':'{"1":1}');preserve(p);p.dom.window.close();
 }
 // A hidden Bihar set is counted and opened through its native set switcher.
 const sets=setup('<main><section id="set-1"><article id="s1-1" class="question-box"><p>BRICS</p></article></section><section id="set-2" hidden><article id="s2-1" class="question-box"><p>BRICS next</p></article></section></main>','/bihar.html?efSearchReturn=test#s1-1');
 sets.w.showSet=n=>sets.w.document.querySelectorAll('section').forEach(section=>section.hidden=section.id!=='set-'+n);
 sets.w.eval(read('search-context.js'));await delay(60);assert.equal(sets.w.document.querySelector('.efp-context-next').textContent,'1/2 ↓');sets.w.document.querySelector('.efp-context-next').click();await delay(60);assert.equal(sets.w.document.querySelector('.efp-context-next').textContent,'2/2 ↓');assert(!sets.w.document.getElementById('set-2').hidden);assert.equal(scrollTarget(sets).closest('article').id,'s2-1');preserve(sets);sets.dom.window.close();
 const many=await mindmap('<section class="panel active" id="facts">'+Array.from({length:215},(_,i)=>'<div class="card"><p>BRICS '+i+'</p></div>').join('')+'</section>');await delay(180);assert.equal(many.w.document.querySelector('.efp-mm-next').textContent,'1/215 ↓');many.dom.window.close();
 console.log('PASS lazy Rapid/Blackbook results, hidden Bihar sets and more than 200 mindmap matches');
})().catch(e=>{console.error(e);process.exit(1)});
