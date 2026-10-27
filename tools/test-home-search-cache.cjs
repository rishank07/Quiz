// Actual homepage pipelines/UI with deterministic worker responses. Verify the
// three-query rendered cache, cancellation, complete-only reuse and late titles.
const {JSDOM,VirtualConsole}=require(process.env.EFP_TEST_JSDOM||'jsdom');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check){for(let i=0;i<250;i++){if(check())return;await pause(15)}assert(check(),'Search did not settle');}
(async()=>{
 const dom=new JSDOM(read('index.html'),{url:'https://examfusionprep.com/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});
 const w=dom.window;w.scrollTo=()=>{};
 const stats={created:0,alive:0,max:0,restored:0};
 w.Worker=class{
  constructor(){stats.created++;stats.alive++;stats.max=Math.max(stats.max,stats.alive);}
  postMessage(message){
   if(message.type==='init'){this.options=message.options;w.setTimeout(()=>{if(!this.dead)this.onmessage({data:{type:'ready'}})},2);return;}
   const query=message.query,source=this.options.indexUrl,op=source.includes('original-practice'),crux=source.includes('/Crux-Tricks/');
   const route=op?'/Original%20Practice/History_Complete_Practice.html?subject=Ancient&chapter=Chapter&section=1':crux?'/Crux-Tricks/viewer.html?id=ct0001':'/Mind%20Maps/'+encodeURIComponent(source.split('/').pop())+'.html#fact';
   const text=(op?'\ue000\ue000':crux?'\ue000':'')+query+' matching fact';
   w.setTimeout(()=>{if(!this.dead)this.onmessage({data:{type:'result',id:message.id,results:query.startsWith('nohit')?[]:[{f:route,t:'Result',b:op?'Original Practice':crux?'Crux':'Mind Maps',x:text,score:10}]}})},15);
  }
  terminate(){if(!this.dead){this.dead=true;stats.alive--;}}
 };
 w.eval(read('search-logic.js'));
 // Deliver the title index after book matches have streamed in.
 const append=w.document.head.appendChild.bind(w.document.head);
 w.document.head.appendChild=node=>{
  if(node.src&&node.src.includes('search-index-main.js')){
   w.setTimeout(()=>{w.SEARCH_INDEX=[{title:'Nitish topic',url:'/Mind%20Maps/title.html',section:'Mind Maps',breadcrumb:'Topic'}];node.onload()},900);return node;
  }
  return append(node);
 };
 const script=Array.from(w.document.scripts).find(node=>!node.src&&node.textContent.includes('function rerankCruxTricksHits'));
 w.eval(script.textContent);w.eval(read('homepage-search-ui.js'));w.eval(read('homepage-fulltext-search.js'));
 const box=w.document.getElementById('searchBox');
 box.addEventListener('input',event=>{if(event.detail?.efpRestoredSearch)stats.restored++;});
 function type(query,detail){box.value=query;box.dispatchEvent(detail?new w.CustomEvent('input',{bubbles:true,detail}):new w.Event('input',{bubbles:true}));}
 const routes=()=>Array.from(w.document.querySelectorAll('li.ef-search-result-item:not(.ef-search-duplicate) a'),a=>{
  const url=new URL(a.href);url.searchParams.delete('efSearchQuery');return url.pathname+url.search+url.hash;
 }).sort();
 async function search(query){type(query);await until(()=>!w.document.getElementById('efSearchTools').classList.contains('is-searching'));}
 type('Nitish');
 await until(()=>w.document.querySelector('[data-bookfullitem]'));
 const streamed=w.document.querySelectorAll('[data-bookfullitem]').length;
 await until(()=>!w.document.getElementById('efSearchTools').classList.contains('is-searching'));
 assert(w.document.querySelectorAll('[data-bookfullitem]').length>=streamed,'Late titles must keep streamed book results');
 assert(w.document.querySelector('li[data-deepresult] a').href.includes('/title.html'),'Late title results retain their original priority');
 const first=routes();assert(first.length>=9);assert.equal(stats.max,1);assert.equal(stats.alive,0);
 await search('Photosynthesis');
 const before=stats.created;
 await search('  NITISH  ');
 assert.equal(stats.created,before,'Recent query must not create any worker');assert.equal(stats.alive,0);assert.deepEqual(routes(),first);
 assert(stats.restored);assert(Array.from(w.document.querySelectorAll('li[data-deepresult] a')).every(a=>new URL(a.href).searchParams.get('efSearchQuery')==='NITISH'));
 assert.equal(JSON.parse(w.sessionStorage.getItem('efp_home_search_results_v1')).complete,true);
 type('Obsolete');await until(()=>stats.alive===1);await search('Nitish');await pause(150);
 assert.equal(stats.alive,0);assert.deepEqual(routes(),first,'Old pending results cannot overwrite a cached query');
 // A completed empty search can be reused; an unfinished search cannot.
 await search('nohit-empty');await search('Another');
 const emptyBefore=stats.created;await search('nohit-empty');assert.equal(stats.created,emptyBefore);assert.equal(routes().length,0);
 assert(w.document.getElementById('noResults').classList.contains('show'));
 // Three completed queries is a hard bound, even with very small snapshots.
 await search('First');await search('Second');await search('Third');await search('Fourth');
 const evictedBefore=stats.created;await search('First');assert(stats.created>evictedBefore,'Evicted queries must run the normal bounded pipeline');
 assert.equal(stats.max,1);assert.equal(stats.alive,0);
 dom.window.close();
 console.log('PASS recent-query instant reuse, exact routes/query handoff, pending cancellation, completed-empty cache, three-query bound, one worker and late-title preservation');
})().catch(error=>{console.error(error);process.exitCode=1});
