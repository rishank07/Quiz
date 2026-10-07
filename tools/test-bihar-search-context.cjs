const {JSDOM,VirtualConsole}=require(process.env.EFP_TEST_JSDOM||'jsdom');
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),delay=ms=>new Promise(r=>setTimeout(r,ms));
async function page(file,query,id,param='efsearch'){
 const dom=new JSDOM(read('Bihar Special/Topic Names/'+file),{url:'https://examfusionprep.com/Bihar%20Special/Topic%20Names/'+encodeURIComponent(file)+'?'+param+'='+encodeURIComponent(query)+'#'+id,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});
 const w=dom.window,scrolls=[];w.scrollTo=()=>{};w.scrollBy=()=>{const dock=w.document.querySelector("html>.efp-search-context");if(dock)scrolls.push(dock)};
 w.HTMLElement.prototype.getClientRects=function(){for(let n=this;n;n=n.parentElement){if(n.hidden||n.style.display==='none'||n.classList.contains('data-list')&&!n.closest('.state-section.open'))return [];}return [{width:100,height:40}];};
 w.HTMLElement.prototype.scrollIntoView=function(){scrolls.push(this)};
 Object.defineProperty(w.HTMLElement.prototype,'innerText',{get(){return this.textContent},set(v){this.textContent=v}});
 w.localStorage.setItem('efp_bookmarks',JSON.stringify({['/Bihar%20Special/Topic%20Names/'+encodeURIComponent(file)+'#'+id]:true}));
 const initial=w.localStorage.getItem('efp_bookmarks');
 const run=s=>vm.runInContext(s,dom.getInternalVMContext());
 Array.from(w.document.scripts).forEach(s=>{if(!s.src&&!/json/i.test(s.type))run(s.textContent)});
 run(read('search-logic.js'));run(read('bihar-topic-bookmarks.js'));run(read('bihar-search-handoff.js'));run(read('search-context.js'));
 for(let i=0;i<40&&!w.document.querySelector('.efp-search-context');i++)await delay(25);return {dom,w,scrolls,initial};
}
(async()=>{
 const hub=read('Bihar Special/Bihar Special.html'),source=hub.match(/    function bsResultHref\(match, query\) \{[\s\S]*?\n    \}/)[0];
 const context={};vm.createContext(context);vm.runInContext(source,context);
 assert.equal(context.bsResultHref({file:'./Topic Names/ANCIENT HISTORY OF BIHAR.html',text:'29. EN: Kesariya Stupa'},'Stupa'),'./Topic Names/ANCIENT HISTORY OF BIHAR.html?efsearch=Stupa#bihar-fact-29');
 assert(context.bsResultHref({file:'./Topic Names/Current Affairs for BPSC Pre 72.html',text:'EN: 18. Test'},'test').endsWith('#bihar-ca-18'));
 assert(context.bsResultHref({file:'./Topic Names/Bihar Objective GK - 60 Sets.html',text:'Set 2, Q 3 Test'},'test').endsWith('#s2-3'));
 for(const query of ['Stupa','स्तूप']){
  const p=await page('ANCIENT HISTORY OF BIHAR.html',query,'bihar-fact-29');
  const d=p.w.document,cards=Array.from(d.querySelectorAll('#content .cd')).filter(n=>n.style.display!=='none'),count=cards.length;
  assert(count>1);const button=d.querySelector('.efp-context-next');assert(button);assert.equal(button.textContent,`1/${count} ↓`);
  assert.equal(d.getElementById(p.w.location.hash.slice(1)).id,'bihar-fact-29');assert(d.querySelector('#bihar-fact-29 mark.efp-context-match'));
  assert.equal(p.scrolls.at(-1).className,'efp-search-context');
  assert(d.querySelectorAll('#content .sh[style*="none"]').length>0);
  for(let i=0;i<count;i++){d.querySelector('.efp-context-next').click();await delay(25);assert.equal(d.querySelector('.efp-context-next').textContent,`${(i+1)%count+1}/${count} ↓`);}
  assert.equal(d.getElementById(p.w.location.hash.slice(1)).id,'bihar-fact-29');
  assert.equal(p.w.localStorage.getItem('efp_bookmarks'),p.initial);
  d.querySelector('.efp-context-dismiss').click();await delay(30);assert.equal(d.querySelectorAll('.efp-search-context,mark.efp-context-match').length,0);
  d.querySelector('.ef-bihar-search-clear').click();assert.equal(d.querySelectorAll('#content .cd[style*="none"]').length,0);assert.equal(d.querySelectorAll('#content .sh[style*="none"]').length,0);
  p.dom.window.close();console.log('PASS actual Ancient Bihar '+query+' highlights, headings, exact target, '+count+' unique facts, navigation wrap, clear and bookmarks');
 }
 const p=await page('Current Affairs for BPSC Pre 72.html','Jeevika','bihar-ca-1','efSearchQuery');
 const d=p.w.document;assert(d.querySelector('#bihar-ca-1 mark'));assert.equal(d.getElementById(p.w.location.hash.slice(1)).id,'bihar-ca-1');assert(d.querySelector('.efp-context-next').textContent.includes('/'));assert.equal(p.w.localStorage.getItem('efp_bookmarks'),p.initial);p.dom.window.close();
 console.log('PASS Bihar current affairs list entries and direct query handoff; hub fact/current-affairs/60-set routes');
})().catch(e=>{console.error(e);process.exit(1)});
