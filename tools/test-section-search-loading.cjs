// Usage: EFP_TEST_JSDOM=/path/to/jsdom node tools/test-section-search-loading.cjs
const {JSDOM}=require(process.env.EFP_TEST_JSDOM||'jsdom');
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function page(url='/Books/BlackBook/BlackBook.html',html='<input type="search" id="searchBox"><ul id="efBlackbookResults"></ul>'){
 const dom=new JSDOM(html,{url:'https://examfusionprep.com'+url,runScripts:'outside-only'}),w=dom.window;
 w.scrollTo=()=>{};w.requestAnimationFrame=cb=>w.setTimeout(cb,0);
 return {dom,w,run:s=>vm.runInContext(s,dom.getInternalVMContext())};
}
function workers(p){
 const counters={created:0,alive:0,max:0,queries:[],failed:false};
 p.w.Worker=class{
  constructor(){this.dead=false;++counters.created;++counters.alive;counters.max=Math.max(counters.max,counters.alive);if(counters.failed)throw Error('Blocked worker')}
  postMessage(m){if(m.type==='init')p.w.setTimeout(()=>{if(!this.dead)this.onmessage({data:{type:'ready'}})},5);
   if(m.type==='search'){counters.queries.push(m.query);p.w.setTimeout(()=>{if(!this.dead)this.onmessage({data:{type:'result',id:m.id,results:[{f:m.query}]}})},10)}}
  terminate(){if(!this.dead){this.dead=true;--counters.alive}}
 };
 return counters;
}
function client(p,index){return p.w.efCreateSearchWorker({workerUrl:'/search-worker.js',indexUrl:'/index-'+index+'.js',logicUrl:'/search-logic.js',globalName:'INDEX_'+index,mode:'snippet'})}
(async()=>{
 let p=page(),stats=workers(p);p.run(read('search-logic.js'));
 let clients=[1,2,3,4].map(i=>client(p,i));await Promise.all(clients.map(c=>c.warm()));assert.equal(stats.created,0);
 const hits=await Promise.all(clients.map(c=>c.search('history')));assert.equal(stats.max,1);assert.equal(stats.alive,0);assert(hits.every(h=>h[0].f==='history'));
 console.log('PASS four index sources: no load on focus, one worker at a time, zero retained workers');
 const a=client(p,5),b=client(p,6);const old=a.search('old'),queued=b.search('old');await delay(1);
 p.w.document.querySelector('input').dispatchEvent(new p.w.Event('input',{bubbles:true}));const latest=a.search('latest');
 assert.deepEqual(Array.from(await old),[]);assert.deepEqual(Array.from(await queued),[]);assert.equal((await latest)[0].f,'latest');assert.equal(stats.alive,0);assert(!stats.queries.includes('old'));
 assert.equal(p.w.document.querySelectorAll('script[src*="index-"]').length,0);
 console.log('PASS rapid edits cancel running/queued queries without falling back to UI-thread index parsing');
 p.dom.window.close();
 p=page();let attempted=0;p.w.Worker=class{constructor(){attempted++;throw Error('Blocked worker')}};p.run(read('search-logic.js'));assert.deepEqual(Array.from(await client(p,1).search('history')),[]);assert.equal(attempted,1);assert.equal(p.w.document.querySelectorAll('script').length,0);p.dom.window.close();
 console.log('PASS worker failure never injects a large fallback index into the page');
 p=page('/');stats=workers(p);p.run(read('search-logic.js'));clients=[client(p,1),client(p,2)];await Promise.all(clients.map(c=>c.warm()));assert.equal(stats.max,2);clients.forEach(c=>c.terminate());p.dom.window.close();console.log('PASS homepage worker policy preserved');
 p=page();const list=p.w.document.getElementById('efBlackbookResults'),input=p.w.document.querySelector('input');
 for(let i=0;i<40;i++){let li=p.w.document.createElement('li');li.innerHTML='<a href="/leaf.html?q='+i+'">Result '+i+'</a>';list.appendChild(li)}
 input.value='history';p.run(read('section-search-ui.js'));p.w.document.dispatchEvent(new p.w.Event('DOMContentLoaded'));await delay(10);
 const shown=()=>list.querySelectorAll('li:not(.efp-section-result-hidden)').length;
 assert.equal(shown(),12);let button=p.w.document.querySelector('.efp-section-search-more');assert(button&&!button.hidden);button.click();assert.equal(shown(),24);
 const streamed=p.w.document.createElement('li');streamed.innerHTML='<a href="/leaf.html?q=41">More</a>';list.appendChild(streamed);await delay(10);assert.equal(shown(),24);
 input.value='changed';input.dispatchEvent(new p.w.Event('input',{bubbles:true}));await delay(10);assert.equal(shown(),12);
 input.value='';input.dispatchEvent(new p.w.Event('input',{bubbles:true}));await delay(10);assert.equal(shown(),41);assert(button.hidden);
 p.dom.window.close();console.log('PASS 12-result batches, Show more, streaming updates and reset/clear');

 // Actual English question records must yield between normalization batches,
 // and a new query must not display results from a cancelled previous one.
 p=page('/Original%20Practice/English_Grammar_Complete_Practice.html',read('Original Practice/English_Grammar_Complete_Practice.html'));
 p.w.HTMLElement.prototype.scrollIntoView=()=>{};p.w.confirm=()=>true;p.w.alert=()=>{};
 Array.from(p.w.document.scripts).forEach(script=>{if(!script.src&&!/json/.test(script.type))p.run(script.textContent)});
 p.run(read('Original Practice/english-practice.js'));
 const englishInput=p.w.document.querySelector('.efp-op-search input');let beats=0;
 const heartbeat=p.w.setInterval(()=>beats++,5);
 englishInput.value='nouns';englishInput.dispatchEvent(new p.w.Event('input',{bubbles:true}));await delay(110);
 englishInput.value='prepositions';englishInput.dispatchEvent(new p.w.Event('input',{bubbles:true}));
 for(let i=0;i<300;i++){await delay(20);if(p.w.document.querySelector('.efp-op-search-question')&&!p.w.document.querySelector('.efp-op-search-loading'))break}
 assert(p.w.document.querySelector('.efp-op-search-question'));assert(beats>5);
 assert(p.w.document.querySelector('.efp-op-search-result strong').textContent.toLowerCase().includes('prepositions'));
 p.w.clearInterval(heartbeat);p.dom.window.close();console.log('PASS actual English: yielding first index build and stale-query suppression');
 p=page('/');p.run(read('section-search-ui.js'));assert.equal(p.w.document.querySelectorAll('style').length,0);p.dom.window.close();console.log('PASS homepage result presentation preserved');
})().catch(e=>{console.error(e);process.exitCode=1});
