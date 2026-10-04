// EFP_TEST_JSDOM=/path/to/jsdom node tools/test-search-spelling-context.cjs
const {JSDOM,VirtualConsole}=require(process.env.EFP_TEST_JSDOM||'jsdom');
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
  const file='Original Practice/Static_GK_Complete_Practice.html';
  for(const query of ['Bharatanatyam','  BHARTNATYAM  ','Bharat','भरतनाट्यम']){
    const params=new URLSearchParams({subject:'Static GK',chapter:'18. Art and Culture',section:'6',q:'4',efSearchQuery:query});
    const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
    const dom=new JSDOM(read(file),{url:'https://examfusionprep.com/'+encodeURI(file)+'?'+params,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window,scrolls=[];
    w.HTMLElement.prototype.getClientRects=function(){for(let el=this;el;el=el.parentElement)if(!el.classList.contains('efp-context-revealed')&&w.getComputedStyle(el).display==='none')return [];return [{width:100,height:40}]};
    w.HTMLElement.prototype.scrollIntoView=function(){scrolls.push(this)};w.scrollTo=()=>{};w.scrollBy=()=>{};w.matchMedia=()=>({matches:false});
    const run=s=>vm.runInContext(s,dom.getInternalVMContext());
    Array.from(w.document.scripts).forEach(s=>{if(!s.src&&!/json/i.test(s.type))run(s.textContent)});
    run(read('search-logic.js'));run('efCreateSearchWorker=function(){return {search:function(){return Promise.resolve([])}}}');
    run(read('Original Practice/original-practice.js'));run(read('search-context.js'));await delay(180);
    const bar=w.document.querySelector('.efp-search-context');assert(bar,query+': shared search control must be present');
    assert.equal(bar.nextElementSibling.id,'q-3');assert.equal(scrolls.at(-1),bar);
    assert(w.document.querySelector('#q-3 mark.efp-context-match'),query+': mark the actual matched word');
    assert.equal(w.document.querySelectorAll('.option-btn mark,.explanation.hidden mark').length,0,'No answer preview on entry');
    assert.equal(w.document.querySelectorAll('.efp-search-context').length,1);
    const answers=run('JSON.stringify(state.answerMap)'),score=run('JSON.stringify(state.score)'),history=w.history.length;
    bar.querySelector('.efp-context-next').click();await delay(70);
    assert.equal(run('JSON.stringify(state.answerMap)'),answers);assert.equal(run('JSON.stringify(state.score)'),score);assert.equal(w.history.length,history);
    w.document.querySelector('.efp-context-dismiss').click();await delay(30);
    assert.equal(w.document.querySelectorAll('.efp-search-context,mark.efp-context-match').length,0);assert.deepEqual(errors,[]);w.close();
  }
  console.log('PASS actual Bharatanatyam Q4: exact, mobile typo/case/space, partial and Hindi queries; yellow control and real-word highlights; no option reveal, attempts or history changes');
})().catch(e=>{console.error(e);process.exitCode=1});
