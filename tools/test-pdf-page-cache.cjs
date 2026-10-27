// EFP_TEST_JSDOM=/path/to/jsdom node tools/test-pdf-page-cache.cjs
// Exercise real reader navigation with delayed, cancellable page painting.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const {JSDOM}=require(process.env.EFP_TEST_JSDOM||'jsdom');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(test,message){for(let i=0;i<150;i++){if(test())return;await delay(10)}assert.fail(message)}
function createReader({mobile=false,responsive=false,lowMemory=false,idle=false,landscape=false,advance=false,pixelRatio=mobile?3:1,slowPage=9,slowMs=150}={}){
 const docId=advance?'ct0468':'ct0467';
 const dom=new JSDOM(read('Crux-Tricks/viewer.html'),{url:'https://examfusionprep.com/Crux-Tricks/viewer.html?id='+docId+'&efpWorkPreview=1',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document,run=code=>vm.runInContext(code,dom.getInternalVMContext());
 w.innerWidth=mobile?390:1440;w.innerHeight=mobile?844:900;
 w.devicePixelRatio=pixelRatio;
 if(lowMemory)Object.defineProperty(w.navigator,'deviceMemory',{value:2});
 const compact=()=>responsive?w.innerWidth<=900:mobile;
 w.matchMedia=q=>({matches:q.includes('portrait')?w.innerHeight>=w.innerWidth:q.includes('landscape')?w.innerWidth>w.innerHeight:q.includes('coarse')?mobile:compact(),addEventListener(){},addListener(){}});
 if(idle)w.requestIdleCallback=callback=>w.setTimeout(callback,5);
 const stage=d.getElementById('pdfStage');
 Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return compact()?w.innerWidth:1200}});
 Object.defineProperty(w.HTMLElement.prototype,'clientHeight',{get(){return compact()?w.innerHeight-38:700}});
 Object.defineProperty(w.HTMLElement.prototype,'offsetTop',{get(){return this.classList.contains('efp-cont-page')?(Number(this.dataset.page)-1)*((parseFloat(this.style.height)||520)+9):0}});
 w.HTMLElement.prototype.getBoundingClientRect=function(){const h=this===stage?stage.clientHeight:parseFloat(this.style.height)||0,top=this===stage?38:this.classList.contains('efp-cont-page')?38+this.offsetTop-stage.scrollTop:0;return {top,bottom:top+h,left:0,right:this.clientWidth,width:this.clientWidth,height:h}};
 const scrolls=[];
 w.HTMLElement.prototype.scrollTo=function(o){this.scrollTop=o.top||0;this.scrollLeft=o.left||0;scrolls.push({...o,page:Number(d.getElementById('pageInput').value)})};
 w.HTMLElement.prototype.scrollBy=function(){};w.scrollTo=()=>{};
 d.elementFromPoint=()=>d.querySelector('.efp-cont-page[data-page="'+d.getElementById('pageInput').value+'"]');
 w.IntersectionObserver=class{observe(){}disconnect(){}};
 w.HTMLCanvasElement.prototype.getContext=function(){return {canvas:this,drawImage(){},measureText(s){return {width:s.length*5}}}};
 const counts={},finished={},cancelled={},cleaned={},canvases=[],errors=[];let active=0,maxActive=0;
 w.console.error=e=>errors.push(e);
 w.pdfjsLib={GlobalWorkerOptions:{},getDocument(){return {promise:Promise.resolve({numPages:40,getPage(n){return delay(n===20?120:0).then(()=>({getViewport({scale}){return {width:(landscape?800:600)*scale,height:(landscape?600:800)*scale,scale,transform:[scale,0,0,scale,0,0]}},cleanup(){cleaned[n]=(cleaned[n]||0)+1;return true},getTextContent(){return Promise.resolve({items:[],styles:{}})},render({canvasContext}){
   counts[n]=(counts[n]||0)+1;active++;maxActive=Math.max(maxActive,active);canvases.push(canvasContext.canvas);
   let complete=false,reject,timer;
   const promise=new Promise((resolve,r)=>{reject=r;timer=w.setTimeout(()=>{complete=true;active--;finished[n]=(finished[n]||0)+1;resolve()},n===slowPage?slowMs:20)});
   return {promise,cancel(){if(complete)return;complete=true;active--;cancelled[n]=(cancelled[n]||0)+1;w.clearTimeout(timer);const e=new Error('cancelled');e.name='RenderingCancelledException';reject(e)}};
 } }))}})}}};
 const append=d.head.appendChild.bind(d.head);
 d.head.appendChild=node=>{const result=append(node);if(node.tagName==='SCRIPT'&&node.src.includes('/pages/'))w.setTimeout(()=>{w.EF_CRUX_DOC_ID=docId;w.EF_CRUX_DOC_PAGES=Array.from({length:40},(_,i)=>'page '+(i+1));node.onload()},0);return result};
 w.EF_CRUX_DOCS=[{id:docId,kind:'tricks',subject:'Maths',pages:40,pdf:'maths.pdf',title:advance?'Advance Maths Formula Book':'Arithmetic Maths',source:'ExamFusion Original'}];
 run(read('search-logic.js'));run(read('Crux-Tricks/pdf-search.js'));run(read('Crux-Tricks/viewer-v2.js'));
 const current=()=>d.documentElement.classList.contains('efp-continuous-mobile-pdf')?d.querySelector('.efp-cont-page[data-page="'+d.getElementById('pageInput').value+'"] canvas'):d.getElementById('pdfCanvas');
 const jump=n=>{const input=d.getElementById('pageInput');input.value=String(n);input.dispatchEvent(new w.Event('change'))};
 return {dom,w,d,stage,counts,finished,cancelled,cleaned,canvases,errors,scrolls,current,jump,get maxActive(){return maxActive}};
}
async function checkDesktopWindowResize(){
 const r=createReader({responsive:true}),{w,d}=r;
 try{
  await until(()=>r.finished[1],'Desktop must load before resizing');
  r.jump(11);await until(()=>r.current().dataset.page==='11','Open the same deep page as the reported issue');
  d.getElementById('bookmarkPage').click();
  for(let cycle=0;cycle<3;cycle++){
   w.innerWidth=800;w.innerHeight=900;w.dispatchEvent(new w.Event('resize'));
   await until(()=>d.documentElement.classList.contains('efp-continuous-mobile-pdf')&&r.current()&&r.current().width>1,'Snapped desktop window must paint the selected page');
   const shell=d.querySelector('.efp-cont-page[data-page="11"]');
   r.stage.scrollTop=shell.offsetTop+120;
   w.innerWidth=1440;w.dispatchEvent(new w.Event('resize'));
   await until(()=>!d.documentElement.classList.contains('efp-continuous-mobile-pdf')&&!r.current().hidden&&r.current().width>1,'Maximized desktop must repaint without a refresh');
   assert.equal(w.getComputedStyle(d.getElementById('efpContinuousPages')).display,'none','Hidden continuous placeholders must leave the desktop layout');
   assert.equal(d.getElementById('pageInput').value,'11','Resizing must preserve the current page');
   assert.equal(r.current().dataset.page,'11');
   assert(r.stage.scrollTop<1000,'Desktop must leave the old multi-page scroll position');
  }
  assert(w.localStorage.getItem('efp_bookmarks').includes('cruxpage:ct0467:11'));
  assert.equal(r.maxActive,1);assert.equal(r.errors.length,0);
  console.log('PASS repeated desktop snap/maximize preserves page, hides empty shells and paints without refresh');
 }finally{r.dom.window.close()}
}
async function checkDesktopArrowWarmup(){
 const r=createReader({advance:true,landscape:true,slowPage:3,slowMs:300}),{w,d}=r;
 try{
  await until(()=>r.counts[3]&&!r.finished[3],'Heavy neighbour must be rendering');
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
  assert.equal(r.current().dataset.page,'2','Keyboard arrow must show the ready page synchronously');
  assert.equal(r.cancelled[3]||0,0,'A ready-page arrow must not cancel the upcoming heavy page');
  await until(()=>r.finished[3],'Heavy neighbour must finish');
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
  assert.equal(r.current().dataset.page,'3','The next keyboard arrow reuses the warmed heavy page');
  assert.equal(r.counts[3],1,'Heavy page must render once');
  const initial=r.canvases[0];
  for(let n=4;n<=7;n++){
   r.jump(n);await until(()=>r.current().dataset.page===String(n),'Forward arrow sequence must finish');
  }
  r.jump(1);
  assert.equal(r.current(),initial,'Recently read pages within the bitmap budget must stay ready for a reverse jump');
  assert.equal(r.counts[1],1,'Reverse navigation must reuse the completed page');
  assert.equal(r.maxActive,1);assert.equal(r.errors.length,0);
  console.log('PASS desktop keyboard arrows preserve heavy-page warmup and recently read bitmaps');
 }finally{r.dom.window.close()}
}
async function checkDesktopBudget(){
 const r=createReader({advance:true,landscape:true,lowMemory:true,pixelRatio:2});
 try{
  await until(()=>r.finished[1],'Desktop must load');
  for(let n=2;n<=10;n++){
   r.jump(n);await until(()=>r.current().dataset.page===String(n),'Selected page must survive cache eviction');
  }
  await delay(600);
  const bytes=r.canvases.reduce((sum,c)=>sum+c.width*c.height*4,0);
  assert(bytes<=32*1024*1024,'Expanded desktop retention must obey the low-memory budget');
  assert.equal(r.current().dataset.page,'10');assert(r.current().width>1);
  assert.equal(r.maxActive,1);assert.equal(r.errors.length,0);
  console.log('PASS high-DPI desktop cache remains within 32 MB on low-memory devices');
 }finally{r.dom.window.close()}
}
async function checkDesktopBackgroundBudget(){
 const r=createReader({lowMemory:true,pixelRatio:2});
 try{
  await until(()=>r.finished[1],'High-DPI selected page must paint');await delay(400);
  assert.deepEqual(Object.keys(r.counts),['1'],'Do not paint neighbours that cannot fit beside the selected bitmap');
  r.jump(9);await until(()=>r.current().dataset.page==='9','A distant target must remain interactive');await delay(400);
  assert.deepEqual(Object.keys(r.counts).sort((a,b)=>a-b),['1','9'],'No unrequested high-DPI background scans');
  assert(r.cleaned[1]>0,'Evicted desktop pages must release PDF.js decoded image resources');
  assert.equal(r.maxActive,1);assert.equal(r.errors.length,0);
  console.log('PASS desktop high-DPI scans skip unaffordable background painting and keep direct jumps usable');
 }finally{r.dom.window.close()}
 const roomy=createReader();
 try{
  await until(()=>roomy.finished[3],'Two affordable upcoming pages may warm');await delay(350);
  assert.deepEqual(Object.keys(roomy.counts),['1','2','3'],'Desktop scan warmup stays limited to nearby useful pages');
  console.log('PASS normal desktop scans warm only two nearby bitmaps');
 }finally{roomy.dom.window.close()}
}
async function checkDesktop(){
 const r=createReader(),{w,d}=r;
 await until(()=>r.finished[3],'Neighbour pages must warm');
 const first=r.current(),count=r.counts[1];
 d.getElementById('next').click();
 assert.equal(r.current().dataset.page,'2','A ready Next page swaps in the click event');
 d.getElementById('prev').click();
 assert.equal(r.current(),first,'Previous reuses the same completed bitmap');
 assert.equal(r.counts[1],count,'A cached page must not be repainted');
 r.jump(9);r.jump(10);
 await until(()=>r.current().dataset.page==='10','Latest fast jump must paint');await delay(180);
 assert.equal(r.current().dataset.page,'10','An older slow paint must not replace the latest page');
 const old=r.current(),oldWidth=old.width;
 d.getElementById('zoomIn').click();assert.equal(r.current(),old,'Keep a bitmap visible during zoom');
 await until(()=>r.current()!==old,'Zoom must finish a sharp replacement');assert(r.current().width>oldWidth);
 d.getElementById('bookmarkPage').click();assert(w.localStorage.getItem('efp_bookmarks').includes('cruxpage:ct0467:10'));
 w.dispatchEvent(new w.PageTransitionEvent('pagehide'));assert(r.canvases.every(c=>c.width===1),'Navigation must release cached and in-flight bitmaps');
 const paints=Object.values(r.counts).reduce((a,b)=>a+b,0);await delay(100);
 assert.equal(Object.values(r.counts).reduce((a,b)=>a+b,0),paints,'No background painting after pagehide');
 w.dispatchEvent(new w.PageTransitionEvent('pageshow',{persisted:true}));
 await until(()=>r.current().width>1&&!r.current().hidden,'BFCache revival must repaint the selected page');
 assert.equal(d.getElementById('pageInput').value,'10');assert.equal(r.errors.length,0);assert.equal(r.maxActive,1);
 r.dom.window.close();console.log('PASS desktop cache, fast jumps, zoom, bookmarks and BFCache cleanup');
}
async function checkFocusedDesktopControls(){
 const r=createReader(),{w,d}=r;
 try{
  await until(()=>r.finished[1],'Reader must load before pointer/focus navigation');
  const search=d.getElementById('docSearch');search.value='page 9';search.dispatchEvent(new w.Event('input',{bubbles:true}));
  const hit=d.querySelector('#docHits button');assert(hit);hit.focus();hit.click();
  await until(()=>r.current().dataset.page==='9','Search result must open its page');
  hit.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
  await until(()=>r.current().dataset.page==='10','Arrow keys must work with focus left on the search result');
  assert(w.EFP_PDF_SEARCH_CONTEXT.getState().label.startsWith('Page 10'),'Search dock must follow the displayed page');
  const next=d.getElementById('next');next.focus();next.click();
  await until(()=>r.current().dataset.page==='11','Toolbar Next must work');
  next.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}));
  await until(()=>r.current().dataset.page==='10','Arrow keys must work after clicking toolbar controls');
  assert.equal(w.EFP_PDF_SEARCH_CONTEXT.snapshot().page,10);
  search.focus();const editing=new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true});search.dispatchEvent(editing);
  assert.equal(editing.defaultPrevented,false,'Editing arrows keep their native input behaviour');assert.equal(d.getElementById('pageInput').value,'10');
  const bookmark=d.getElementById('bookmarkPage');bookmark.focus();const space=new w.KeyboardEvent('keydown',{key:' ',bubbles:true,cancelable:true});bookmark.dispatchEvent(space);
  assert.equal(space.defaultPrevented,false,'Space on a control keeps native button activation');assert.equal(d.getElementById('pageInput').value,'10');
  console.log('PASS focused desktop results/buttons keep page shortcuts, input editing, native Space and synchronized search context');
 }finally{r.dom.window.close()}
}
async function checkMobile({idle=false,lowMemory=false,landscape=false}={}){
 const r=createReader({mobile:true,idle,lowMemory,landscape}),{w,d}=r;
 await until(()=>r.finished[4],'Mobile neighbours must warm');
 const paints=r.counts[2];d.getElementById('next').click();await delay(1);
 assert.equal(d.getElementById('pageInput').value,'2');assert.equal(r.counts[2],paints,'Ready mobile page must not repaint');
 assert.equal(r.scrolls.at(-1).behavior,'auto','Page buttons must skip animated scrolling');
 r.jump(20);r.jump(21);await until(()=>r.current()&&r.current().width>1,'Latest mobile target must paint');await delay(220);
 const shell=d.querySelector('.efp-cont-page[data-page="21"]');
 assert.equal(r.stage.scrollTop,Math.max(0,shell.offsetTop-4),'A delayed old jump must not scroll the viewer backwards');
 assert.equal(d.getElementById('pageInput').value,'21');assert.equal(r.maxActive,1,'Only one costly PDF paint may run at a time');
 const old=r.current(),width=old.width;d.getElementById('zoomIn').click();assert.equal(r.current(),old,'No blank canvas during mobile zoom');
 await until(()=>r.current()&&r.current()!==old,'Mobile zoom must redraw');assert(r.current().width>width);
 d.getElementById('zoomLabel').click();await until(()=>r.current()&&r.current().width<=width,'Fit mode must redraw at native resolution');
 await delay(250);
 const visibleCanvases=Array.from(d.querySelectorAll('.efp-cont-page canvas'));
 const bytes=visibleCanvases.reduce((n,c)=>n+c.width*c.height*4,0);
 assert(bytes<=(lowMemory?32:64)*1024*1024,'Keep the mobile bitmap cache within its memory budget');
 w.innerWidth=844;w.innerHeight=390;w.dispatchEvent(new w.Event('resize'));
 await delay(350);assert(r.current()&&r.current().width>1,'Rotation must keep the current page readable');
 w.dispatchEvent(new w.PageTransitionEvent('pagehide'));await delay(30);
 assert(r.canvases.every(c=>c.width===1),'Mobile navigation must release off-screen jobs too');
 w.dispatchEvent(new w.PageTransitionEvent('pageshow',{persisted:true}));await until(()=>r.current()&&r.current().width>1,'Mobile BFCache must recover');
 assert.equal(r.errors.length,0);r.dom.window.close();
 console.log('PASS mobile cache, priority, stale-jump guard, zoom, rotation, memory and BFCache',idle?'idle API':'timer fallback',lowMemory?'low memory':'default memory',landscape?'landscape PDF':'portrait PDF');
}
(async()=>{await checkDesktopWindowResize();await checkDesktopArrowWarmup();await checkDesktopBudget();await checkDesktopBackgroundBudget();await checkDesktop();await checkFocusedDesktopControls();await checkMobile();await checkMobile({idle:true,lowMemory:true});await checkMobile({landscape:true})})().catch(e=>{console.error(e);process.exit(1)});
