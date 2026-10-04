// Real-index equivalence and delayed UI results: case/spacing edits must keep
// searches alive, while a different query must still cancel obsolete results.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const {JSDOM}=require(process.env.EFP_TEST_JSDOM||'jsdom'),delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(check){for(let i=0;i<150;i++){if(check())return;await delay(20)}throw Error('Timed out waiting for search');}
function realIndexes(){
 for(const [file,strict] of [['search-snippets-crux-tricks.js',false],['search-snippets-economics-crux.js',false],['search-snippets-original-geo-economics-tricks.js',false],['search-snippets-maths-ocr.js',true]]){
  const messages=[],c={console,setTimeout,clearTimeout,postMessage:m=>messages.push(m)};c.window=c;c.self=c;vm.createContext(c);
  c.importScripts=url=>vm.runInContext(read(new URL(url,'https://examfusionprep.com').pathname.slice(1)),c);
  vm.runInContext(read('search-worker.js'),c);
  c.onmessage({data:{type:'init',options:{indexUrl:'/Crux-Tricks/'+file,globalName:'EF_CRUX_TRICKS_SNIPPET_INDEX',mode:'snippet',sectionPrefix:'./Crux-Tricks/',strictOcr:strict,limit:80}}});
  function search(query){messages.length=0;c.onmessage({data:{type:'search',id:1,query}});return JSON.stringify(messages.find(m=>m.type==='result').results);}
  for(const base of ['Pakistan','Train to Pakistan']){
   const expected=search(base);
   for(const query of [base.toLowerCase(),base.toUpperCase(),' \t'+base.split(' ').join('\t  ')+'\n',base.replace(/a/gi,'A')])assert.equal(search(query),expected,file+' changed routes/ranking for '+JSON.stringify(query));
  }
 }
 console.log('PASS four real Crux indexes: identical case/whitespace routes, counts, ranking and strict OCR');
}
function slowWorkers(w){
 const stats={created:0,queries:[],terminated:0};
 w.Worker=class{
  constructor(){stats.created++;this.dead=false;}
  postMessage(m){if(m.type==='init')w.setTimeout(()=>!this.dead&&this.onmessage({data:{type:'ready'}}),5);
   else {stats.queries.push(m.query);w.setTimeout(()=>!this.dead&&this.onmessage({data:{type:'result',id:m.id,results:[{f:'/Crux-Tricks/viewer.html?id='+(m.query==='india'?'ct0001':'ct0244'),t:m.query==='india'?'India':'Demand for Pakistan',b:'Crux & Tricks / Ghatnachakra / History',x:'\uE000 '+m.query,score:0}]}}),240);}}
  terminate(){if(!this.dead){this.dead=true;stats.terminated++;}}
 };
 return stats;
}
async function cruxUI(){
 const dom=new JSDOM(read('Crux-Tricks/index.html'),{url:'https://examfusionprep.com/Crux-Tricks/index.html',runScripts:'outside-only'}),w=dom.window;
 w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollTo=()=>{};
 w.EF_CRUX_DOCS=[{id:'ct0244',kind:'crux',title:'Demand for Pakistan',sourceTitle:'Demand for Pakistan',source:'Ghatnachakra',subject:'History',branch:'Modern History',pages:2,pdf:'pakistan.pdf',breadcrumb:'Crux & Tricks / Ghatnachakra / History'}];
 const stats=slowWorkers(w);w.eval(read('search-logic.js'));w.eval(read('Crux-Tricks/crux-tricks.js'));
 const input=w.document.getElementById('searchBox'),results=w.document.getElementById('fullTextResults');
 function type(value){input.value=value;input.dispatchEvent(new w.Event('input',{bubbles:true}));}
 type('pakistan');await until(()=>stats.queries.length===1);
 for(const value of ['Pakistan','PAKISTAN',' \tpAkIsTaN\n ']){type(value);await delay(10)}
 await until(()=>stats.queries.length===4&&results.querySelector('a')&&w.document.getElementById('searchStatus').textContent==='Full-text search across revision pages.');
 assert.equal(stats.created,4,'Case-only edits must not reload any index');assert(stats.queries.every(q=>q==='pakistan'),'Every source must receive the canonical query');
 const snapshot=results.innerHTML;type('  pakistan  ');await delay(230);assert.equal(results.innerHTML,snapshot);assert.equal(stats.created,4);
 const url=new URL(results.querySelector('a').href);assert.equal(url.searchParams.get('search'),'pakistan');assert.equal(url.searchParams.get('page'),'1');
 type('India');await until(()=>stats.queries.includes('india'));type('Pakistan');await until(()=>results.querySelector('a')&&results.querySelector('a').href.includes('ct0244')&&w.document.getElementById('searchStatus').textContent==='Full-text search across revision pages.');
 assert(!Array.from(results.querySelectorAll('a')).some(a=>a.href.includes('ct0001')),'Different queries must suppress stale rows');
 dom.window.close();console.log('PASS actual Crux UI: pending case/space edits, stable completed rows, canonical PDF deep link and stale-query cancellation');
}
async function homeUI(){
 const dom=new JSDOM('<div class="search-wrap"><input type="search" id="searchBox"></div><ul id="menuList"></ul><div id="noResults"></div>',{url:'https://examfusionprep.com/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 const stats=slowWorkers(w);w.eval(read('search-logic.js'));w.eval(read('homepage-fulltext-search.js'));w.eval(read('homepage-search-ui.js'));
 const input=w.document.getElementById('searchBox');let done=false;w.addEventListener('efp-search-state',e=>{if(e.detail.phase==='fulltext-done')done=true});
 function type(value){input.value=value;input.dispatchEvent(new w.Event('input',{bubbles:true}));}
 type('Pakistan');await until(()=>stats.queries.length===1);type(' \tpAkIsTaN \n');await until(()=>done);
 assert(w.document.querySelector('[data-bookfullitem]'));await until(()=>!/Searching/.test(w.document.getElementById('efSearchStatus').textContent));
 const link=w.document.querySelector('[data-bookfullitem] a');link.addEventListener('click',e=>e.preventDefault());link.click();
 const created=stats.created,rows=Array.from(w.document.querySelectorAll('[data-bookfullitem]'));type('PAKISTAN');await delay(450);
 assert.equal(stats.created,created,'Equivalent completed query must not create workers');assert(Array.from(w.document.querySelectorAll('[data-bookfullitem]')).every((row,i)=>row===rows[i]),'Equivalent query must preserve result nodes');
 const saved=JSON.parse(w.sessionStorage.getItem('efp_home_search_results_v1'));assert.equal(w.localStorage.getItem('efp_home_search_query_v1'),'PAKISTAN');assert(saved.html,'Case-only edits must retain the saved result snapshot');
 const restored=new JSDOM('<div class="search-wrap"><input id="searchBox"></div><ul id="menuList"></ul><div id="noResults"></div>',{url:'https://examfusionprep.com/',runScripts:'outside-only',pretendToBeVisual:true}),rw=restored.window;
 rw.localStorage.setItem('efp_home_search_query_v1','PAKISTAN');rw.sessionStorage.setItem('efp_home_search_results_v1',JSON.stringify(saved));
 const restoreStats=slowWorkers(rw);rw.eval(read('search-logic.js'));rw.eval(read('homepage-fulltext-search.js'));rw.eval(read('homepage-search-ui.js'));await delay(100);
 assert.equal(rw.document.getElementById('searchBox').value,'PAKISTAN');assert(rw.document.querySelector('[data-bookfullitem]'));assert.equal(restoreStats.created,0,'Equivalent saved spelling must restore instantly without re-searching');restored.window.close();
 dom.window.close();console.log('PASS homepage: pending normalized query finishes, case-only edits preserve results and avoid index reloads');
}
async function homeCruxUI(){
 const dom=new JSDOM(read('index.html'),{url:'https://examfusionprep.com/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.SEARCH_INDEX=[];
 const stats=slowWorkers(w);w.eval(read('search-logic.js'));
 const script=Array.from(w.document.scripts).find(s=>!s.src&&s.textContent.includes('function rerankCruxTricksHits'));w.eval(script.textContent);
 const input=w.document.getElementById('searchBox');let done=false;w.addEventListener('efp-search-state',e=>{if(e.detail.phase==='core-done')done=true});
 function type(value){input.value=value;input.dispatchEvent(new w.Event('input',{bubbles:true}));}
 type('Pakistan');await until(()=>stats.queries.length===1);type(' \tpAkIsTaN\n');await until(()=>done);
 assert(w.document.querySelector('[data-ctfullresult] a'));assert.equal(stats.created,9,'Five practice and four PDF sources must load once each');
 const rows=w.document.getElementById('menuList').innerHTML;type('pakistan');await delay(250);assert.equal(stats.created,9);assert.equal(w.document.getElementById('menuList').innerHTML,rows);
 dom.window.close();console.log('PASS actual homepage Crux pipeline: case/spacing edits retain pending PDF results and completion');
}
(async()=>{realIndexes();await cruxUI();await homeUI();await homeCruxUI()})().catch(e=>{console.error(e);process.exitCode=1});
