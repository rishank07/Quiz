// EFP_TEST_JSDOM=/path/to/jsdom node tools/test-mindmap-partial-search.cjs
const {JSDOM,VirtualConsole}=require(process.env.EFP_TEST_JSDOM||'jsdom');
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),delay=ms=>new Promise(r=>setTimeout(r,ms));
const file='Mind Maps/History/Ancient History/ChapterNames/11_post_gupta_empire_mindmap.html';
async function page(query,key,logic=true,resume=null){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(read(file),{url:'https://examfusionprep.com/'+encodeURI(file)+'?efSearchQuery='+encodeURIComponent(query)+'&efSearchReturn=partial-test#'+key,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window,d=w.document,scrolls=[];
 w.HTMLElement.prototype.getClientRects=function(){for(let el=this;el;el=el.parentElement)if(el.hidden||el.classList.contains('hidden')||el.classList.contains('tab-content')&&!el.classList.contains('active'))return [];return [{width:100,height:40}]};
 w.HTMLElement.prototype.scrollIntoView=function(){scrolls.push(this)};w.scrollTo=()=>{};w.scrollBy=()=>{};
 const run=s=>vm.runInContext(s,dom.getInternalVMContext());
 const original=Array.from(d.querySelectorAll('.tab-content')).map(e=>e.textContent);
 Array.from(d.scripts).forEach(s=>{if(!s.src&&!/json/i.test(s.type))run(s.textContent)});
 d.querySelectorAll('.tab-btn[onclick]').forEach(b=>b.addEventListener('click',()=>run(b.getAttribute('onclick'))));
 if(logic)run(read('search-logic.js'));
 if(resume)w.EFP_APP_SESSION={getSearchState:()=>resume,restoreSearchScroll:()=>w.__restored=true};
 run(read('mindmap-deeplink.js'));await delay(150);for(let i=0;i<50&&d.querySelector('.efp-mm-next')&&!d.querySelector('.efp-mm-next').textContent.includes('/');i++)await delay(20);return {dom,w,d,scrolls,original,errors};
}
(async()=>{
 for(const [query,key,logic] of [['Nand','recall',true],['nAnD','harsha',true],['Nand','recall',false],['Nagannda','recall',true]]){
  const p=await page(query,key,logic),d=p.d,bar=d.querySelector('.efp-mindmap-search-context'),next=d.querySelector('.efp-mm-next');
  assert(bar);assert(next,'Matching partial/typo words must have result navigation');
  const count=Number(next.textContent.split('/')[1].match(/\d+/)[0]);assert(count>=2);
  const words=Array.from(d.querySelectorAll('mark.efp-mindmap-match')).map(e=>e.textContent);assert(words.includes('Nagananda'));
  if(query.toLowerCase()==='nand')assert(words.includes('Nandivardhana'));
  if(key==='recall')assert(d.querySelector('#tab-recall .recall-qa mark.efp-mm-current-match'),'Exact recall fact owns the focus');
  assert(p.scrolls.at(-1).matches('.efp-mm-current-match'));
  const initial=next.textContent;for(let i=0;i<count;i++){next.click();await delay(15);assert.equal(d.querySelectorAll('.efp-mindmap-search-context').length,1);assert(d.querySelector('.tab-content.active .efp-mm-current-match'));}
  assert.equal(next.textContent,initial);assert.deepEqual(p.errors,[]);
  if(logic&&query==='Nand'){
   const snapshot=p.w.EFP_MINDMAP_SEARCH_CONTEXT.snapshot(),resumed=await page(query,p.w.location.hash.slice(1),true,snapshot);
   assert.equal(resumed.d.querySelector('.efp-mm-next').textContent,initial);assert.equal(resumed.scrolls.length,0);assert(resumed.w.__restored);resumed.dom.window.close();
  }
  d.querySelector('.efp-mm-dismiss').click();assert.equal(d.querySelectorAll('.efp-mindmap-search-context,mark.efp-mindmap-match').length,0);assert.deepEqual(Array.from(d.querySelectorAll('.tab-content')).map(e=>e.textContent),p.original);p.dom.window.close();
  console.log('PASS actual Post-Gupta '+query+' #'+key+(logic?'':' without search helper')+': '+count+' reading units, partial/typo highlights, wraparound, clear and original text');
 }
 const none=await page('zzxyqnonexistent','recall');assert.equal(none.d.querySelectorAll('mark.efp-mindmap-match,.efp-mm-next').length,0);assert(none.d.querySelector('.efp-mindmap-search-context').textContent.includes('No matching text'));none.dom.window.close();
 console.log('PASS explicit empty-match feedback and app reading-position resume');
})().catch(e=>{console.error(e);process.exitCode=1});
