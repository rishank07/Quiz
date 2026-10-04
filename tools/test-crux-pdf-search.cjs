// EFP_TEST_JSDOM=/path/to/jsdom node tools/test-crux-pdf-search.cjs
// Uses actual PDF page indexes and viewer code; PDF painting is stubbed.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const {JSDOM}=require(process.env.EFP_TEST_JSDOM||'jsdom');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function pageData(id){const w={};vm.runInNewContext(read('Crux-Tricks/pages/'+id+'.js'),{window:w});return Array.from(w.EF_CRUX_DOC_PAGES)}
async function viewer({id='ct0577',mobile=false,indexFailure=false,invalidIndex=false,pdfDelay=0,query='Wings of Fire',fragmented=false,noNativeText=false,resumeVisible,lateResume=false}={}){
 const text=pageData(id),resume=typeof resumeVisible==='boolean';
 const matching=text.map((s,i)=>s.toLowerCase().includes('wings of fire')?i+1:0).filter(Boolean),resumePage=matching[1]||matching[0];
 const resumeState={kind:'pdf',id,query,visible:resumeVisible,page:resumePage,stageOffset:175,stageLeft:0};
 const dom=new JSDOM(read('Crux-Tricks/viewer.html'),{url:'https://examfusionprep.com/Crux-Tricks/viewer.html?id='+id+(resume?'&page='+resumePage+'&search=Wings+of+Fire':''),runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,run=code=>vm.runInContext(code,dom.getInternalVMContext());
 w.innerWidth=mobile?390:1440;w.innerHeight=mobile?844:900;
 w.matchMedia=q=>({matches:mobile&&!q.includes('landscape'),addEventListener(){},addListener(){}});
 w.HTMLElement.prototype.scrollTo=function(o){this.scrollTop=o.top||0;this.scrollLeft=o.left||0};
 w.HTMLElement.prototype.scrollBy=function(){};w.HTMLElement.prototype.scrollIntoView=function(){};w.scrollTo=()=>{};
 w.document.elementFromPoint=()=>w.document.querySelector('.efp-cont-page[data-page="'+w.document.getElementById('pageInput').value+'"]');
 Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return mobile?390:1200}});
 Object.defineProperty(w.HTMLElement.prototype,'clientHeight',{get(){return mobile?700:800}});
 w.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){},clearRect(){},save(){},restore(){},setTransform(){},fillRect(){},measureText(str){return {width:str.length*5}}});
 w.IntersectionObserver=class{observe(){}unobserve(){}disconnect(){}};
 let extractions=0;
 w.pdfjsLib={GlobalWorkerOptions:{},Util:{transform:(a,b)=>b},getDocument(){return {promise:delay(pdfDelay).then(()=>({numPages:text.length,getPage(n){return Promise.resolve({getViewport({scale}){return {width:600*scale,height:800*scale,scale,transform:[scale,0,0,scale,0,0]}},render(){return {promise:Promise.resolve(),cancel(){}}},getTextContent(){extractions++;return Promise.resolve({items:noNativeText?[]:fragmented?text[n-1].split(/(\s+)/).filter(Boolean).map((str,i)=>({str,transform:[1,0,0,10,(i%50)*10,10+Math.floor(i/50)*15],width:str.length*5,height:10})): [{str:text[n-1],transform:[1,0,0,1,0,10],width:10,height:10}],styles:{}})}})}}))}}};
 const append=w.document.head.appendChild.bind(w.document.head);
 w.document.head.appendChild=node=>{const result=append(node);if(node.tagName==='SCRIPT'&&node.src.includes('/pages/'))w.setTimeout(()=>{if(indexFailure)node.onerror();else{run(read('Crux-Tricks/pages/'+id+'.js'));if(invalidIndex)w.EF_CRUX_DOC_ID='ct0001';node.onload()}},0);return result};
 const installResume=()=>{w.EFP_APP_SESSION={getSearchState:kind=>kind==='pdf'?resumeState:null};w.dispatchEvent(new w.CustomEvent('efp-app-search-resume'))};
 if(resume&&!lateResume)installResume();
 run(read('search-logic.js'));run(read('Crux-Tricks/pdf-search.js'));run(read('search-context.js'));run(read('Crux-Tricks/crux-manifest.js'));run(read('Crux-Tricks/viewer-v2.js'));
 // Run the actual mobile search bridge/mirror from the viewer shell.
 const bridge=Array.from(w.document.scripts).find(s=>!s.src&&s.textContent.includes('mirrorHits'));
 if(mobile)run(bridge.textContent);
 const input=w.document.getElementById(mobile?'mobileSearchInput':'docSearch');
 if(resume&&lateResume){await delay(80);installResume()}
 if(!resume){input.value=query;input.dispatchEvent(new w.Event('input',{bubbles:true}))}
 for(let i=0;i<100&&!w.document.querySelector('#docHits button');i++)await delay(20);
 assert(!w.document.getElementById('docSearch').disabled,'Search must remain enabled');
 const hits=Array.from(w.document.querySelectorAll('#docHits button'));
 const expected=hits.map(b=>Number(b.textContent.match(/Page (\d+)/)[1]));
 if(query==='Wings of Fire')assert.deepEqual(expected.slice().sort((a,b)=>a-b),text.map((s,i)=>s.toLowerCase().includes('wings of fire')?i+1:0).filter(Boolean));
 if(query==='train to pakistan')assert(expected.includes(2),'Global Arts page must also be a reader match');
 assert(expected.length,'Real Books and Authors text must contain the query');
 if(resume){
  for(let i=0;i<100&&(w.document.getElementById('pdfLoading').hidden===false||(resumeVisible&&!w.document.querySelector('.efp-search-mark')));i++)await delay(20);
  await delay(80);
  assert.equal(w.document.getElementById('docSearch').value,query);assert.equal(w.document.getElementById('pageInput').value,String(resumePage));
  assert.equal(w.EFP_PDF_SEARCH_CONTEXT.getState().visible,resumeVisible);
  assert.equal(w.document.querySelectorAll('.efp-pdf-search-context').length,resumeVisible?1:0);
  assert.equal(!!w.document.querySelector('.efp-search-mark'),resumeVisible);
  assert.equal(w.document.getElementById('pdfStage').scrollTop,175,'Restore position inside the PDF scroll container');
  const snapshot=w.EFP_PDF_SEARCH_CONTEXT.snapshot();assert.equal(snapshot.query,query);assert.equal(snapshot.visible,resumeVisible);assert.equal(snapshot.page,resumePage);
  if(resumeVisible)assert(w.document.querySelector('.efp-context-location').textContent.includes((expected.indexOf(resumePage)+1)+'/'+expected.length));
  dom.window.close();console.log('PASS PDF app cold resume',mobile?'mobile':'desktop',resumeVisible?'selected hit + highlight':'dismissed highlight',lateResume?'late app script':'early app script');return;
 }
 if(mobile){await delay(10);assert.equal(w.document.querySelectorAll('#mobileSearchHits button').length,hits.length);w.document.querySelector('#mobileSearchHits button').click()}
 else hits[0].click();
 await delay(30);assert.equal(Number(w.document.getElementById('pageInput').value),expected[0]);
 assert.equal(w.document.querySelectorAll('.efp-pdf-search-context').length,1,'PDF search context must open');
 assert(w.document.querySelector('.efp-context-location').textContent.includes('Page '+expected[0]));
 if(noNativeText){assert.equal(w.document.querySelectorAll('.efp-search-mark').length,0);assert(w.document.querySelector('.efp-context-location').textContent.includes('scanned page'))}
 else assert(w.document.querySelectorAll('.efp-search-mark').length,'Native PDF word highlights must remain');
 if(query==='train to pakistan')assert(w.document.querySelector('.efp-context-location').textContent.includes('word matches'),'Scattered/partial words must not be labelled an exact phrase');
 await delay(1450);
 w.document.getElementById('pdfStage').dispatchEvent(new w.Event('pointerdown'));
 w.document.getElementById('pdfStage').dispatchEvent(new w.WheelEvent('wheel'));
 w.document.getElementById('pdfStage').dispatchEvent(new w.Event('scroll'));
 await delay(20);if(!noNativeText)assert(w.document.querySelectorAll('.efp-search-mark').length,'Reading/scrolling must retain yellow marks until dismissed');
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
(async()=>{globalSearch();await viewer();await viewer({mobile:true});await viewer({indexFailure:true});await viewer({mobile:true,indexFailure:true,pdfDelay:100});await viewer({invalidIndex:true});await viewer({id:'ct0568',mobile:true,query:'train to pakistan',fragmented:true});await viewer({query:'Fire Wings',fragmented:true});await viewer({mobile:true,noNativeText:true});for(const mobile of [false,true])for(const resumeVisible of [false,true])await viewer({mobile,resumeVisible,query:'Fire Wings',lateResume:!resumeVisible,pdfDelay:200});})().catch(e=>{console.error(e);process.exit(1)});
