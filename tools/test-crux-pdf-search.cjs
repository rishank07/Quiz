// EFP_TEST_JSDOM=/path/to/jsdom node tools/test-crux-pdf-search.cjs
// Uses actual PDF page indexes and viewer code; PDF painting is stubbed.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const {JSDOM}=require(process.env.EFP_TEST_JSDOM||'jsdom');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function pageData(id){const w={};vm.runInNewContext(read('Crux-Tricks/pages/'+id+'.js'),{window:w});return Array.from(w.EF_CRUX_DOC_PAGES)}
async function viewer({id='ct0577',mobile=false,indexFailure=false,invalidIndex=false,pdfDelay=0}={}){
 const dom=new JSDOM(read('Crux-Tricks/viewer.html'),{url:'https://examfusionprep.com/Crux-Tricks/viewer.html?id='+id,runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,run=code=>vm.runInContext(code,dom.getInternalVMContext());
 w.innerWidth=mobile?390:1440;w.innerHeight=mobile?844:900;
 w.matchMedia=q=>({matches:mobile&&!q.includes('landscape'),addEventListener(){},addListener(){}});
 w.HTMLElement.prototype.scrollTo=function(o){this.scrollTop=o.top||0;this.scrollLeft=o.left||0};
 w.HTMLElement.prototype.scrollBy=function(){};w.HTMLElement.prototype.scrollIntoView=function(){};w.scrollTo=()=>{};
 Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return mobile?390:1200}});
 Object.defineProperty(w.HTMLElement.prototype,'clientHeight',{get(){return mobile?700:800}});
 w.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){},clearRect(){},save(){},restore(){},setTransform(){},fillRect(){},measureText(){return {width:10}}});
 w.IntersectionObserver=class{observe(){}unobserve(){}disconnect(){}};
 const text=pageData(id);let extractions=0;
 w.pdfjsLib={GlobalWorkerOptions:{},Util:{transform:(a,b)=>b},getDocument(){return {promise:delay(pdfDelay).then(()=>({numPages:text.length,getPage(n){return Promise.resolve({getViewport({scale}){return {width:600*scale,height:800*scale,scale,transform:[scale,0,0,scale,0,0]}},render(){return {promise:Promise.resolve(),cancel(){}}},getTextContent(){extractions++;return Promise.resolve({items:[{str:text[n-1],transform:[1,0,0,1,0,10],width:10,height:10}],styles:{}})}})}}))}}};
 const append=w.document.head.appendChild.bind(w.document.head);
 w.document.head.appendChild=node=>{const result=append(node);if(node.tagName==='SCRIPT'&&node.src.includes('/pages/'))w.setTimeout(()=>{if(indexFailure)node.onerror();else{run(read('Crux-Tricks/pages/'+id+'.js'));if(invalidIndex)w.EF_CRUX_DOC_ID='ct0001';node.onload()}},0);return result};
 run(read('search-context.js'));run(read('Crux-Tricks/crux-manifest.js'));run(read('Crux-Tricks/viewer-v2.js'));
 // Run the actual mobile search bridge/mirror from the viewer shell.
 const bridge=Array.from(w.document.scripts).find(s=>!s.src&&s.textContent.includes('mirrorHits'));
 if(mobile)run(bridge.textContent);
 const input=w.document.getElementById(mobile?'mobileSearchInput':'docSearch');
 input.value='Wings of Fire';input.dispatchEvent(new w.Event('input',{bubbles:true}));
 for(let i=0;i<100&&!w.document.querySelector('#docHits button');i++)await delay(20);
 assert(!w.document.getElementById('docSearch').disabled,'Search must remain enabled');
 const hits=Array.from(w.document.querySelectorAll('#docHits button'));
 const expected=text.map((s,i)=>s.toLowerCase().includes('wings of fire')?i+1:0).filter(Boolean);
 assert.deepEqual(hits.map(b=>Number(b.textContent.match(/Page (\d+)/)[1])),expected);
 assert(expected.length,'Real Books and Authors text must contain the query');
 if(mobile){await delay(10);assert.equal(w.document.querySelectorAll('#mobileSearchHits button').length,hits.length);w.document.querySelector('#mobileSearchHits button').click()}
 else hits[0].click();
 await delay(30);assert.equal(Number(w.document.getElementById('pageInput').value),expected[0]);
 assert.equal(w.document.querySelectorAll('.efp-pdf-search-context').length,1,'PDF search context must open');
 assert(w.document.querySelector('.efp-context-location').textContent.includes('Page '+expected[0]));
 assert(w.document.querySelectorAll('.efp-search-mark').length,'Native PDF word highlights must remain');
 w.document.querySelector('.efp-context-next').click();await delay(30);
 assert.equal(Number(w.document.getElementById('pageInput').value),expected[1%expected.length]);
 w.document.querySelector('.efp-context-prev').click();await delay(30);
 assert.equal(Number(w.document.getElementById('pageInput').value),expected[0]);
 const pageBefore=w.document.getElementById('pageInput').value,storageBefore=JSON.stringify(w.localStorage),urlBefore=w.location.href;
 w.document.querySelector('.efp-context-dismiss').click();await delay(10);
 assert.equal(w.document.querySelectorAll('.efp-search-context,.efp-search-layer').length,0,'Dismiss must clear context and PDF highlights');
 assert.equal(w.document.getElementById('pageInput').value,pageBefore,'Dismiss must keep PDF page');
 assert.equal(w.location.href,urlBefore,'Dismiss must preserve navigation URL');
 assert.equal(JSON.stringify(w.localStorage),storageBefore,'Dismiss must preserve progress');
 w.dispatchEvent(new w.PageTransitionEvent('pageshow',{persisted:true}));await delay(10);
 assert.equal(w.document.querySelectorAll('.efp-search-context').length,0,'Dismissed PDF context must stay closed on BFCache restore');
 hits[0].click();await delay(30);assert.equal(w.document.querySelectorAll('.efp-search-context').length,1,'Deliberate new search hit must reopen context');
 if(indexFailure||invalidIndex)assert(extractions>=text.length,'Missing/wrong index must extract all PDF pages');
 dom.window.close();
 console.log('PASS viewer search/page jump',mobile?'mobile':'desktop',indexFailure?'missing index':invalidIndex?'wrong document index':'normal index',pdfDelay?'delayed PDF':'');
}
function globalSearch(){
 const messages=[],context={console,setTimeout,clearTimeout,postMessage:m=>messages.push(m)};context.window=context;context.self=context;
 vm.createContext(context);
 context.importScripts=url=>{const local=new URL(url,'https://examfusionprep.com').pathname.slice(1);vm.runInContext(read(local),context)};
 vm.runInContext(read('search-worker.js'),context);
 context.onmessage({data:{type:'init',options:{indexUrl:'/Crux-Tricks/search-snippets-crux-tricks.js',globalName:'EF_CRUX_TRICKS_SNIPPET_INDEX',mode:'snippet',sectionPrefix:'./Crux-Tricks/',limit:1000}}});
 const checks=[['ct0577','wings of fire'],['ct0477','encircle'],['ct0469','multiplication']];
 checks.forEach(([id,query],i)=>{context.onmessage({data:{type:'search',id:i+1,query}});const response=messages.find(m=>m.type==='result'&&m.id===i+1);assert(response&&response.results.length);const hit=response.results.find(h=>h.f.includes('id='+id)&&h.x&&h.x.charCodeAt(0)>=0xE000);assert(hit,'Missing global '+id);const page=hit.x.charCodeAt(0)-0xE000+1;assert(page>0&&page<=pageData(id).length,'Invalid page route');assert(pageData(id)[page-1].toLowerCase().includes(query),'Global route must reach matching PDF page')});
 console.log('PASS actual full-text worker: Books/Authors, Ecology and Maths exact page routes');
}
(async()=>{globalSearch();await viewer();await viewer({mobile:true});await viewer({indexFailure:true});await viewer({mobile:true,indexFailure:true,pdfDelay:100});await viewer({invalidIndex:true});})().catch(e=>{console.error(e);process.exit(1)});
