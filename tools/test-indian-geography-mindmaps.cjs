// EFP_TEST_JSDOM=/path/to/jsdom node tools/test-indian-geography-mindmaps.cjs
// Offline integration check: all Indian Geography tabs, search snippets and deep links.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require(process.env.EFP_TEST_JSDOM||'jsdom');
const cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const plan=JSON.parse(read('audits/indian-geography-mindmaps/corrections.json'));
const selectors='.tab-content[id],.tab-panel[id]';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const ctx=vm.createContext({window:{},console});
vm.runInContext(read('search-snippets-mindmaps.js'),ctx);
ctx.EF_SNIPPET_INDEX=ctx.window.EF_SNIPPET_INDEX;
vm.runInContext(read('search-logic.js'),ctx);
(async()=>{
 let tabs=0,links=0;
 for(const chapter of plan.chapters){
  const raw=read(chapter.file),errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
  const parsed=new JSDOM(raw),pdoc=parsed.window.document;
  const before=cp.execFileSync('git',['cat-file','-p',chapter.base_blob_sha],{cwd:root,encoding:'utf8'});
  const original=new JSDOM(before),odoc=original.window.document;
  for(const selector of ['style','script']){
   assert.deepEqual([...pdoc.querySelectorAll(selector)].map(n=>n.outerHTML),[...odoc.querySelectorAll(selector)].map(n=>n.outerHTML),'Styles and scripts preserved: '+chapter.number);
  }
  assert.deepEqual([...pdoc.querySelectorAll('[id]')].map(n=>n.id).sort(),[...odoc.querySelectorAll('[id]')].map(n=>n.id).sort(),'IDs preserved: '+chapter.number);
  original.window.close();
  const ids=[...pdoc.querySelectorAll('[id]')].map(n=>n.id);assert.equal(new Set(ids).size,ids.length,'Unique IDs: '+chapter.number);
  for(const table of pdoc.querySelectorAll('table')){
   const rows=[...table.rows],columns=[...rows[0].cells].reduce((n,c)=>n+c.colSpan,0),remaining=[];
   for(const row of rows){
    let column=0;
    for(const cell of row.cells){
     while(remaining[column]>0)column++;
     for(let j=0;j<cell.colSpan;j++){assert(!remaining[column+j],'Overlapping table cells');remaining[column+j]=cell.rowSpan;}
     column+=cell.colSpan;
    }
    assert.equal(remaining.filter(n=>n>0).length,columns,'Consistent table grid: '+chapter.number+' '+row.textContent);
    for(let j=0;j<remaining.length;j++)remaining[j]=Math.max(0,(remaining[j]||0)-1);
   }
  }
  const group=ctx.EF_SNIPPET_INDEX.find(g=>decodeURIComponent(g.f).replace(/^\.\//,'')===chapter.file);assert(group,'Indexed chapter '+chapter.number);
  const snippets=group.x.filter(s=>s.startsWith('\x01'));
  assert(snippets.length>0);for(const s of snippets){const id=s.slice(1,s.indexOf('\x02'));assert(pdoc.getElementById(id),'Valid search anchor '+chapter.number+' #'+id);}
  const originalText=[...pdoc.querySelectorAll(selectors)].map(n=>n.textContent);
  const firstMatch=snippets.find(s=>s.split('\x02')[1].match(/[A-Za-z]{6,}/));
  const anchor=firstMatch.slice(1,firstMatch.indexOf('\x02'));
  const query=firstMatch.split('\x02')[1].match(/[A-Za-z]{6,}/)[0];
  const options={sectionPrefix:group.f,limit:100};ctx.q=query;ctx.opts=options;
  const hits=vm.runInContext('efSnippetSearch(q,opts)',ctx);assert(hits.length,'Search result '+chapter.number+' '+query);
  assert(hits.some(h=>decodeURIComponent(h.f).includes(chapter.file)),'Search routes to chapter');
  for(const width of [360,1366]){
   const dom=new JSDOM(raw,{url:'https://examfusionprep.com/'+encodeURI(chapter.file)+'?efpWorkPreview=1&efSearchQuery='+encodeURIComponent(query)+'&efSearchReturn=indian-geography-audit#'+anchor,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
   const w=dom.window,d=w.document,run=s=>vm.runInContext(s,dom.getInternalVMContext());
   Object.defineProperty(w,'innerWidth',{value:width});w.matchMedia=()=>({matches:width<768,addEventListener(){},removeEventListener(){}});
   w.HTMLElement.prototype.getClientRects=function(){for(let n=this;n;n=n.parentElement)if((n.classList.contains('tab-content')||n.classList.contains('tab-panel'))&&!n.classList.contains('active'))return [];return [{width:width-40,height:40}]};
   w.HTMLElement.prototype.scrollIntoView=function(){};w.scrollTo=()=>{};w.scrollBy=()=>{};
   for(const s of d.scripts)if(!s.src&&!/json/i.test(s.type))run(s.textContent);
   assert(w.EFP_ANALYTICS_EXCLUDED,'Verification traffic excluded');
   for(const b of d.querySelectorAll('[onclick*="switchTab"],[onclick^="st("]')){
    b.addEventListener('click',()=>run(b.getAttribute('onclick')));b.click();
    const action=b.getAttribute('onclick'), match=action.match(/(?:switchTab|st)\('([^']+)'/); const id=d.getElementById(match[1])?match[1]:'tab-'+match[1];
    assert(d.getElementById(id).classList.contains('active'));assert.equal(d.querySelectorAll('.tab-content.active,.tab-panel.active').length,1);tabs++;
   }
   run(read('search-logic.js'));run(read('mindmap-deeplink.js'));await pause(160);
   const bar=d.querySelector('.efp-mindmap-search-context');assert(bar,'Search context '+chapter.number);
   assert(d.querySelector('mark.efp-mindmap-match'),'Highlight '+chapter.number+' '+query);
   assert(d.querySelector('.tab-content.active mark,.tab-panel.active mark'),'Matching panel opened');
   const clear=d.querySelector('.efp-mm-dismiss');assert(clear);clear.click();
   assert.equal(d.querySelectorAll('mark.efp-mindmap-match').length,0);
   assert.deepEqual([...d.querySelectorAll(selectors)].map(n=>n.textContent),originalText,'Search does not alter corrected notes');
   assert.deepEqual(errors,[],'Runtime errors '+chapter.number);links++;dom.window.close();
  }
  parsed.window.close();
 }
 console.log('PASS: 17 chapters; '+tabs+' tab actions; '+links+' mobile/desktop search/highlight/clear flows; valid index anchors and table structure; verification GA excluded.');
})().catch(e=>{console.error(e);process.exitCode=1});
