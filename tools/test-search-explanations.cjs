// EFP_TEST_JSDOM=/path/to/jsdom node tools/test-search-explanations.cjs
const {JSDOM,VirtualConsole}=require(process.env.EFP_TEST_JSDOM||'jsdom');
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function setup(html,url='/practice.html?efSearchReturn=test#q1',query='BRICS'){
 const dom=new JSDOM(html,{url:'https://examfusionprep.com'+url,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole()}),w=dom.window,scrolled=[];
 const style=w.document.createElement('style');style.textContent='.hidden{display:none}'+read('search-context.css');w.document.head.appendChild(style);
 // jsdom does not implement stylesheet !important overriding inline display.
 w.HTMLElement.prototype.getClientRects=function(){for(let el=this;el;el=el.parentElement){if(!el.classList.contains('efp-context-revealed')&&w.getComputedStyle(el).display==='none')return []}return [{width:100,height:40}]};
 w.HTMLElement.prototype.scrollIntoView=function(){scrolled.push(this)};w.scrollTo=()=>{};w.scrollBy=()=>{};
 w.sessionStorage.setItem('efp_search_return_v1:test',JSON.stringify({token:'test',source:'https://examfusionprep.com/',inputs:[{id:'searchBox',value:query}]}));
 w.localStorage.setItem('attempt','{"q6":1,"bookmark":true}');
 const run=s=>vm.runInContext(s,dom.getInternalVMContext());
 return {dom,w,run,scrolled,storage:()=>JSON.stringify([w.localStorage,w.sessionStorage])};
}
async function load(p){p.run(read('search-logic.js'));p.run(read('search-context.js'));await delay(80);return p}
function button(p){return p.w.document.querySelector('.efp-context-explanation')}
function clear(p){p.w.document.querySelector('.efp-context-dismiss').click()}
(async()=>{
 // Reveal only the matching explanation. Native hidden state and answer handlers survive.
 for(const mode of ['hidden','inline','class','details']){
  const exp=mode==='details'?'<details><summary>Explanation</summary><p>BRICS has several members. ब्रिक्स (BRICS).</p></details>':`<div class="explanation ${mode==='class'?'hidden':''}" ${mode==='hidden'?'hidden':''} ${mode==='inline'?'style="display:none"':''}><p>BRICS has several members. ब्रिक्स (BRICS).</p></div>`;
  const p=await load(setup(`<main><article id="q1" class="question-box"><h2>Which organisation?</h2><div class="options"><button>BRICS</button></div>${exp}<div class="exp hidden">Unrelated explanation</div></article></main>`));
  const node=p.w.document.querySelector('.explanation,details'),before=p.storage();let attempts=0;
  p.w.document.querySelector('.options button').addEventListener('click',()=>attempts++);
  assert(!button(p).hidden);assert.equal(p.w.document.querySelectorAll('mark').length,0,'No answer giveaway on entry');
  assert.equal(p.w.document.querySelector('.efp-context-next').textContent,'1/1');
  button(p).click();await delay(60);
  assert(node.getClientRects().length,mode+': '+node.outerHTML);if(mode==='details')assert(node.open);
  assert.equal(node.querySelectorAll('mark').length,2);assert.equal(node.querySelector('mark').textContent,'BRICS');
  assert.equal(p.w.document.querySelectorAll('.options mark,.exp.hidden mark').length,0);
  assert.equal(p.scrolled.at(-1).tagName,'MARK');assert.equal(attempts,0);assert.equal(p.storage(),before);
  button(p).click();await delay(30);assert.equal(node.querySelectorAll('mark').length,2,'No duplicate marks');
  clear(p);await delay(30);assert.equal(node.querySelectorAll('mark').length,0);assert(!node.classList.contains('efp-context-revealed'));
  if(mode==='hidden')assert(node.hidden);if(mode==='details')assert(!node.open);else assert.equal(node.getClientRects().length,0);
  assert.equal(p.storage(),before);p.w.document.querySelector('.options button').click();assert.equal(attempts,1);p.dom.window.close();
 }
 console.log('PASS hidden attribute, inline display, hidden class and details: explicit preview, matching words, cleanup and no attempt/storage changes');
 // Native answers while previewing keep explanations open after dismissal.
 for(const mode of ['class','inline']){
  const p=await load(setup(`<main><article class="qcard" id="q1"><h2>Which organisation?</h2><div class="opts"><button class="opt">A</button></div><div class="exp ${mode==='class'?'hidden':''}" ${mode==='inline'?'style="display:none"':''}>BRICS explanation</div></article></main>`));
  const exp=p.w.document.querySelector('.exp'),option=p.w.document.querySelector('.opt');
  option.addEventListener('click',()=>{option.classList.add('correct');option.disabled=true;exp.classList.remove('hidden');exp.style.display='block'});
  button(p).click();await delay(30);option.click();await delay(30);clear(p);await delay(30);
  assert(exp.getClientRects().length);assert(option.disabled);assert(option.classList.contains('correct'));p.dom.window.close();
 }
 // Native style-only reveal is observed; visible explanations scroll directly on Next.
 const visible=await load(setup('<main><article class="question-box" id="q1"><h2>Organisation?</h2><div class="explanation" style="display:none">BRICS hidden</div></article><article class="question-box" id="q2"><h2>Members?</h2><div class="explanation">BRICS visible</div></article></main>'));
 assert.equal(visible.w.document.querySelectorAll('#q1 mark').length,0);assert.equal(visible.w.document.querySelectorAll('#q2 mark').length,1);
 visible.w.document.querySelector('#q1 .explanation').style.display='block';await delay(60);assert.equal(visible.w.document.querySelectorAll('#q1 mark').length,1);
 visible.w.document.querySelector('.efp-context-next').click();await delay(30);assert.equal(visible.scrolled.at(-1).closest('article').id,'q2');assert.equal(visible.scrolled.at(-1).tagName,'MARK');visible.dom.window.close();
 console.log('PASS normal answer selection, native style reveal and direct navigation to already-visible explanation matches');
 const entered=await load(setup('<main><article class="question-box" id="q1"><h2>Organisation?</h2><div class="explanation">BRICS already open</div></article></main>'));
 assert.equal(entered.scrolled.at(-1).tagName,'MARK');entered.dom.window.close();
 // Words spanning question/explanation remain one result; next question never auto-reveals.
 const mixed=await load(setup('<main><article class="question-card" id="q1"><h2>BRICS</h2><div class="explanation hidden">Pakistan membership</div></article><article class="question-card" id="q2"><h2>BRICS Pakistan?</h2><div class="explanation hidden">Unrelated</div></article></main>',undefined,'brics pakistan'));
 assert.equal(mixed.w.document.querySelector('.efp-context-next').textContent,'1/2 ↓');assert(!button(mixed).hidden);button(mixed).click();await delay(30);
 assert.equal(mixed.w.document.querySelector('#q1 .explanation mark').textContent,'Pakistan');mixed.w.document.querySelector('.efp-context-next').click();await delay(30);
 assert(button(mixed).hidden);assert.equal(mixed.w.document.querySelector('#q2 .explanation').getClientRects().length,0);mixed.dom.window.close();
 const hindi=await load(setup('<main><article class="question-box" id="q1"><h2>संगठन?</h2><div class="explanation hidden">पाकिस्तान से जुड़ा तथ्य</div></article></main>',undefined,'पाकिस्तान'));
 button(hindi).click();await delay(30);assert.equal(hindi.w.document.querySelector('mark').textContent,'पाकिस्तान');hindi.dom.window.close();
 console.log('PASS query across question/explanation, distinct result counting, unrelated explanations stay hidden and Hindi highlighting');
 // Run actual GS and English renderers/adapters with explanation-only results across chapters.
 for(const english of [false,true]){
  const q=english?{id:'fixture',prompt:'Which organisation?',sentence:'Choose one.',options:['A','B','C','D'],answer:0,explanation:'Pakistan is mentioned in this explanation.',englishExplanation:'Pakistan facts.',rule:'Review the relevant fact.'}:{q:{en:'Which organisation?',hi:'कौन सा संगठन?'},a:{en:'A',hi:'अ'},o:[{en:'A',hi:'अ'},{en:'B',hi:'ब'},{en:'C',hi:'स'},{en:'D',hi:'द'}],exp:{en:'Pakistan is mentioned in this explanation.',hi:'पाकिस्तान से जुड़ा तथ्य।'}};
  const section={title:english?'Fixture':{en:'Fixture',hi:'अभ्यास'},questions:[q]};
  const economics=read('Original Practice/Economics_Complete_Practice.html');
  const subject=Object.keys(JSON.parse(economics.match(/<script[^>]+id=["']master-data["'][^>]*>([\s\S]*?)<\/script>/)[1]))[0];
  const chapters={'01. First':[section],'02. Second':[section]},fixture=english?chapters:{[subject]:chapters};
  const file='Original Practice/'+(english?'English_Grammar_Complete_Practice.html':'Economics_Complete_Practice.html');
  const html=read(file).replace(/(<script[^>]+id=["']master-data["'][^>]*>)[\s\S]*?(<\/script>)/,'$1'+JSON.stringify(fixture)+'$2');
  const p=setup(html,'/'+file.replace(/ /g,'%20')+'?'+new URLSearchParams({subject,chapter:'01. First',section:'1',q:'1',efSearchReturn:'test'}),'  pAkIsTaN  ');
  p.w.matchMedia=()=>({matches:false});p.w.alert=()=>{};p.w.confirm=()=>true;
  p.w.document.querySelectorAll('script').forEach(s=>{if(!s.src&&!/json/i.test(s.type))p.run(s.textContent)});
  p.run(read('search-logic.js'));p.run('efCreateSearchWorker=function(){return {search:function(){return Promise.resolve([])}}}');
  p.run(read('Original Practice/'+(english?'english-practice.js':'original-practice.js')));p.run(read('search-context.js'));await delay(140);
  const stateBefore=p.run('JSON.stringify({score:state.score,orders:state.shuffleMap,answers:state.answerMap})'),storageBefore=p.storage();
  assert.equal(p.w.document.querySelector('.efp-context-next').textContent,'1/2 ↓');assert.equal(p.w.document.querySelectorAll('#exp-0 mark').length,0);
  button(p).click();await delay(60);assert(p.w.document.querySelector('#exp-0 mark'));assert.equal(p.scrolled.at(-1).tagName,'MARK');
  assert.equal(p.run('JSON.stringify({score:state.score,orders:state.shuffleMap,answers:state.answerMap})'),stateBefore);assert.equal(p.storage(),storageBefore);
  p.w.document.querySelector('.efp-context-next').click();await delay(100);assert.equal(p.run('state.chapterName'),'02. Second');assert.equal(p.w.document.querySelectorAll('#exp-0 mark').length,0);assert(!button(p).hidden);
  const secondState=p.run('JSON.stringify({score:state.score,orders:state.shuffleMap,answers:state.answerMap})'),secondStorage=p.storage();button(p).click();await delay(60);
  assert(p.w.document.querySelector('#exp-0 mark'));assert.equal(p.run('JSON.stringify({score:state.score,orders:state.shuffleMap,answers:state.answerMap})'),secondState);assert.equal(p.storage(),secondStorage);
  clear(p);await delay(30);assert.equal(p.w.document.querySelector('#exp-0').getClientRects().length,0);assert.equal(p.w.document.querySelectorAll('.option-btn mark').length,0);p.dom.window.close();
 }
 console.log('PASS actual GS/English renderers: case/space-insensitive explanation-only matches across lazy chapters; answers, score, shuffle and storage unchanged');
})().catch(e=>{console.error(e);process.exit(1)});
