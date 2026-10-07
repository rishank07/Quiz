// EFP_TEST_JSDOM=/path/to/jsdom node tools/test-rapid-search-entry.cjs
// Actual Current Affairs renderer; geometry and scroll calls are simulated.
const {JSDOM,VirtualConsole}=require(process.env.EFP_TEST_JSDOM||'jsdom');
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const file='Current Affairs/Topic Names/Rapid Practice/2026/Topic Wise/Summits_and_Conferences_2026_Current_Affairs_Rapid_Practice.html';
async function page(early){
  const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM(read(file),{url:'https://examfusionprep.com/'+encodeURI(file)+'?efSearchQuery=modi#rp-1-0',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window,scrolls=[];
  w.HTMLElement.prototype.getClientRects=function(){for(let el=this;el;el=el.parentElement)if(w.getComputedStyle(el).display==='none')return [];return [{width:100,height:40}]};
  w.HTMLElement.prototype.scrollIntoView=function(){scrolls.push(this)};w.scrollTo=()=>{};w.scrollBy=()=>{const dock=w.document.querySelector("html>.efp-search-context");if(dock)scrolls.push(dock)};w.matchMedia=()=>({matches:false});
  const run=s=>vm.runInContext(s,dom.getInternalVMContext());
  Array.from(w.document.scripts).forEach(s=>{if(!s.src&&!/json/i.test(s.type))run(s.textContent)});
  if(early){
    run(read('search-context.js'));await delay(60);
    assert.equal(w.document.querySelectorAll('.efp-search-context,mark.efp-context-match').length,0,'Wait for requested Q31 instead of decorating saved section 1');
    assert.equal(scrolls.length,0);
  }
  run('openSection(1)');if(!early)run(read('search-context.js'));await delay(80);
  return {dom,w,run,scrolls,errors};
}
(async()=>{
  for(const early of [true,false]){
    const p=await page(early),doc=p.w.document;
    assert.equal(doc.querySelector('.efp-context-location').textContent,'Section 2 · Q31');
    assert.equal(doc.querySelector('.efp-context-next').textContent,'3/35 ↓');
    assert.equal(p.w.document.getElementById(p.w.location.hash.slice(1)).id,'rp-1-0');
    const style=doc.querySelector('link[href*="search-context-dock-v3.css"]'),count=p.scrolls.length;
    style.dispatchEvent(new p.w.Event('load'));await delay(30);
    assert(p.scrolls.length>count,'Late CSS recenters the inline control');
    const answers=p.run('JSON.stringify(saved.answers)'),bookmarks=p.run('JSON.stringify(saved.bookmarks)'),length=p.w.history.length;
    for(let i=0;i<35;i++){
      doc.querySelector('.efp-context-next').click();await delay(40);
      const bar=doc.querySelector('.efp-search-context');assert(bar&&bar.isConnected);
      assert.equal(doc.querySelectorAll('.efp-search-context').length,1);
      assert.equal(bar.querySelector('.efp-context-next').textContent,((i+3)%35+1)+'/35 ↓');
      assert.equal(p.scrolls.at(-1),bar);
    }
    assert.equal(doc.querySelector('.efp-context-location').textContent,'Section 2 · Q31');
    assert.equal(p.run('JSON.stringify(saved.answers)'),answers);assert.equal(p.run('JSON.stringify(saved.bookmarks)'),bookmarks);
    assert.equal(p.run('stats().attempted'),0);assert.equal(p.w.history.length,length);
    assert.deepEqual(p.errors,[]);doc.querySelector('.efp-context-dismiss').click();await delay(30);
    assert.equal(doc.querySelectorAll('.efp-search-context,mark.efp-context-match').length,0);p.dom.window.close();
  }
  const touched=await page(false);touched.w.dispatchEvent(new touched.w.Event('pointerdown'));const before=touched.scrolls.length;
  touched.w.document.querySelector('link[href*="search-context-dock-v3.css"]').dispatchEvent(new touched.w.Event('load'));await delay(30);
  assert.equal(touched.scrolls.length,before,'Delayed styles cannot override learner interaction');touched.dom.window.close();
  console.log('PASS actual Modi/Q31: early/late runtime, late CSS, 35-result wraparound, one visible inline control, no attempts/bookmark/history changes, dismissal and no scroll after interaction');
})().catch(e=>{console.error(e);process.exitCode=1});
