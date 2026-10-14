// EFP_TEST_JSDOM=/path/to/jsdom node tools/test-pdf-page-cache.cjs
// Exercise real reader navigation with delayed, cancellable page painting.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const {JSDOM}=require(process.env.EFP_TEST_JSDOM||'jsdom');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(test,message){for(let i=0;i<150;i++){if(test())return;await delay(10)}assert.fail(message)}
function createReader({mobile=false,lowMemory=false,idle=false,landscape=false}={}){
 const dom=new JSDOM(read('Crux-Tricks/viewer.html'),{url:'https://examfusionprep.com/Crux-Tricks/viewer.html?id=ct0467&efpWorkPreview=1',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document,run=code=>vm.runInContext(code,dom.getInternalVMContext());
 w.innerWidth=mobile?390:1440;w.innerHeight=mobile?844:900;
 w.devicePixelRatio=mobile?3:1;
 if(lowMemory)Object.defineProperty(w.navigator,'deviceMemory',{value:2});
 w.matchMedia=q=>({matches:q.includes('portrait')?w.innerHeight>=w.innerWidth:q.includes('landscape')?w.innerWidth>w.innerHeight:mobile,addEventListener(){},addListener(){}});
 if(idle)w.requestIdleCallback=callback=>w.setTimeout(callback,5);
 const stage=d.getElementById('pdfStage');
 Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return mobile?w.innerWidth:1200}});
 Object.defineProperty(w.HTMLElement.prototype,'clientHeight',{get(){return mobile?w.innerHeight-38:700}});
 Object.defineProperty(w.HTMLElement.prototype,'offsetTop',{get(){return this.classList.contains('efp-cont-page')?(Number(this.dataset.page)-1)*((parseFloat(this.style.height)||520)+9):0}});
 w.HTMLElement.prototype.getBoundingClientRect=function(){const h=this===stage?stage.clientHeight:parseFloat(this.style.height)||0,top=this===stage?38:this.classList.contains('efp-cont-page')?38+this.offsetTop-stage.scrollTop:0;return {top,bottom:top+h,left:0,right:this.clientWidth,width:this.clientWidth,height:h}};
 const scrolls=[];
 w.HTMLElement.prototype.scrollTo=function(o){this.scrollTop=o.top||0;this.scrollLeft=o.left||0;scrolls.push({...o,page:Number(d.getElementById('pageInput').value)})};
 w.HTMLElement.prototype.scrollBy=function(){};w.scrollTo=()=>{};
 d.elementFromPoint=()=>d.querySelector('.efp-cont-page[data-page="'+d.getElementById('pageInput').value+'"]');
 w.IntersectionObserver=class{observe(){}disconnect(){}};
 w.HTMLCanvasElement.prototype.getContext=function(){return {canvas:this,drawImage(){},measureText(s){return {width:s.length*5}}}};
 const counts={},finished={},canvases=[],errors=[];let active=0,maxActive=0;
 w.console.error=e=>errors.push(e);
 w.pdfjsLib={GlobalWorkerOptions:{},getDocument(){return {promise:Promise.resolve({numPages:40,getPage(n){return delay(n===20?120:0).then(()=>({getViewport({scale}){return {width:(landscape?800:600)*scale,height:(landscape?600:800)*scale,scale,transform:[scale,0,0,scale,0,0]}},getTextContent(){return Promise.resolve({items:[],styles:{}})},render({canvasContext}){
   counts[n]=(counts[n]||0)+1;active++;maxActive=Math.max(maxActive,active);canvases.push(canvasContext.canvas);
   let complete=false,reject,timer;
   const promise=new Promise((resolve,r)=>{reject=r;timer=w.setTimeout(()=>{complete=true;active--;finished[n]=(finished[n]||0)+1;resolve()},n===9?150:20)});
   return {promise,cancel(){if(complete)return;complete=true;active--;w.clearTimeout(timer);const e=new Error('cancelled');e.name='RenderingCancelledException';reject(e)}};
 } }))}})}}};
 const append=d.head.appendChild.bind(d.head);
 d.head.appendChild=node=>{const result=append(node);if(node.tagName==='SCRIPT'&&node.src.includes('/pages/'))w.setTimeout(()=>{w.EF_CRUX_DOC_ID='ct0467';w.EF_CRUX_DOC_PAGES=Array.from({length:40},(_,i)=>'page '+(i+1));node.onload()},0);return result};
 w.EF_CRUX_DOCS=[{id:'ct0467',kind:'tricks',subject:'Maths',pages:40,pdf:'maths.pdf',title:'Arithmetic Maths',source:'ExamFusion Original'}];
 run(read('search-logic.js'));run(read('Crux-Tricks/pdf-search.js'));run(read('Crux-Tricks/viewer-v2.js'));
 const current=()=>mobile?d.querySelector('.efp-cont-page[data-page="'+d.getElementById('pageInput').value+'"] canvas'):d.getElementById('pdfCanvas');
 const jump=n=>{const input=d.getElementById('pageInput');input.value=String(n);input.dispatchEvent(new w.Event('change'))};
 return {dom,w,d,stage,counts,finished,canvases,errors,scrolls,current,jump,get maxActive(){return maxActive}};
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
(async()=>{await checkDesktop();await checkMobile();await checkMobile({idle:true,lowMemory:true});await checkMobile({landscape:true})})().catch(e=>{console.error(e);process.exit(1)});
