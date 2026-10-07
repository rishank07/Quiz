// Cross-device shared search contracts, including blocked workers and cold index retry.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const {JSDOM}=require(process.env.EFP_TEST_JSDOM||'jsdom');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function page(url='/hub.html',ua='Android'){
 const d=new JSDOM('<input type="search" id="searchBox">',{url:'https://examfusionprep.com'+url,runScripts:'outside-only'}),w=d.window;
 Object.defineProperty(w.navigator,'userAgent',{value:ua});w.Worker=class{constructor(){throw Error('Worker blocked')}};
 const run=s=>vm.runInContext(s,d.getInternalVMContext());run(read('search-logic.js'));
 const files={},loads=[],failures=new Set();
 const append=w.document.head.appendChild.bind(w.document.head);
 w.document.head.appendChild=function(node){
  const result=append(node);if(node.tagName==='SCRIPT'){
   const file=new URL(node.src).pathname;loads.push(file);setTimeout(()=>{
    if(failures.has(file)){node.onerror();return}
    if(!files[file]){node.onerror();return}
    run(files[file]);node.onload();
   },1);
  }return result;
 };
 return {d,w,run,files,loads,failures};
}
function fixture(text,anchor='q1'){return JSON.stringify([{f:'/leaf.html',t:'Topic',b:'Book',x:['\u0001'+anchor+'\u0002'+text]}])}
(async()=>{
 for(const ua of ['Android','Windows','iPhone','Firefox']){
  const p=page('/hub.html',ua);p.files['/one.js']='window.INDEX='+fixture('BRICS');
  const client=p.w.efCreateSearchWorker({workerUrl:'/worker',indexUrl:'/one.js',globalName:'INDEX',mode:'snippet'});
  assert.equal((await client.search('BRICS'))[0].f,'/leaf.html#q1');client.terminate();
  assert.equal((await client.search('brics'))[0].f,'/leaf.html#q1');assert.equal(p.loads.length,1,'Successful repeat uses result cache');p.d.window.close();
 }
 console.log('PASS blocked-worker recovery and cached results on Android/Windows/iPhone/Firefox policies');
 const p=page('/');p.files['/a.js']='window.EF_SNIPPET_INDEX='+fixture('alpha');p.files['/b.js']='window.EF_SNIPPET_INDEX='+fixture('beta');
 const [a,b]=await Promise.all([p.w.efLoadSearchIndexScript('/a.js','EF_SNIPPET_INDEX'),p.w.efLoadSearchIndexScript('/b.js','EF_SNIPPET_INDEX')]);
 assert(a[0].x[0].includes('alpha'));assert(b[0].x[0].includes('beta'));assert((await p.w.efLoadSearchIndexScript('/a.js','EF_SNIPPET_INDEX'))[0].x[0].includes('alpha'));
 p.files['/retry.js']='window.RETRY='+fixture('Recovered');p.failures.add('/retry.js');await assert.rejects(p.w.efLoadSearchIndexScript('/retry.js','RETRY'));p.failures.delete('/retry.js');assert((await p.w.efLoadSearchIndexScript('/retry.js','RETRY'))[0].x[0].includes('Recovered'));
 console.log('PASS concurrent same-global corpora isolation and failed-index retry');
 assert.deepEqual(Array.from(p.w.efSearchTerms('constructor')),['constructor']);assert(p.w.efTextMatches('constructor','a constructor'));assert(!p.w.efTextMatches('constructor','unrelated'));
 for(const [text,q] of [['mark marker','mark'],['current affairs current','current affairs'],['<img src=x onerror=alert(1)> mark','mark']]){
  const box=p.w.document.createElement('div');box.innerHTML=p.w.efSnippetWithHighlight(text,q);assert.equal(box.querySelectorAll('mark mark,img,script').length,0);assert.equal(box.textContent,text);assert(box.querySelector('mark'));
 }
 console.log('PASS prototype-name queries and safe single-pass overlapping/HTML snippet highlights');
 const huge=[{f:'/huge',t:'Topic',x:Array.from({length:25000},(_,i)=>'\u0001q'+i+'\u0002BRICS question '+i)}];let beats=0;const timer=setInterval(()=>beats++,1);const hits=await p.w.efFallbackSnippetSearchAsync('BRICS',huge,{limit:40});clearInterval(timer);assert.equal(hits.length,40);assert(beats>2,'One huge group must yield between snippets');
 let cancelled=false;const work=p.w.efFallbackSnippetSearchAsync('unknown',huge,{cancelled:()=>cancelled});cancelled=true;assert.equal((await work).length,0);
 console.log('PASS yielding within one large snippet group, bounded results and stale scan cancellation');
 p.files['/black.js']='window.BLACK=[{f:"/word#1",t:"Abandon",x:"give up",b:"BlackBook"}]';
 const black=p.w.efCreateSearchWorker({indexUrl:'/black.js',globalName:'BLACK',mode:'records',fields:['t','x','b']});assert.equal((await black.search('give up'))[0].f,'/word#1');
 let count=0;p.w.Worker=class{constructor(){count++}postMessage(m){setTimeout(()=>this.onmessage({data:m.type==='init'?{type:'ready'}:{type:'result',id:m.id,results:[]}}),0)}terminate(){}};
 const empty=p.w.efCreateSearchWorker({workerUrl:'/worker',indexUrl:'/never.js',globalName:'NEVER',mode:'snippet'});assert.equal((await empty.search('no-match')).length,0);empty.terminate();assert.equal((await empty.search('no-match')).length,0);assert.equal(count,1);assert(!p.loads.includes('/never.js'));
 console.log('PASS BlackBook record-mode fallback and genuine zero results never download another index');
 const manifest=read('Crux-Tricks/crux-manifest.js');
 p.w.fetch=async()=>({ok:true,text:async()=>manifest});
 p.files['/crux.js']=read('Crux-Tricks/search-snippets-maths-ocr.js');
 const crux=p.w.efCreateSearchWorker({indexUrl:'/crux.js',globalName:'EF_CRUX_TRICKS_SNIPPET_INDEX',mode:'snippet',strictOcr:true,limit:40});
 const pdfHits=await crux.search('mean');assert(pdfHits.length);assert(pdfHits.every(h=>/^\/Crux-Tricks\/(viewer\.html\?id=ct|index\.html)/.test(h.f)));
 assert(!p.w.EF_CRUX_DOCS,'Fallback routing must not overwrite a filtered live Crux app manifest');
 console.log('PASS no-worker OCR/PDF fallback uses current viewer routes without mutating app manifest');
 p.d.window.close();
})().catch(e=>{console.error(e);process.exitCode=1});
