// Usage: EFP_TEST_JSDOM=/path/to/jsdom node tools/test-search-return.cjs
// Real page/quiz handlers; only navigation and layout are simulated by jsdom.
const {JSDOM,VirtualConsole}=require(process.env.EFP_TEST_JSDOM || 'jsdom');
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const root=require('path').resolve(__dirname,'..');
const read=f=>fs.existsSync(root+'/'+f)?fs.readFileSync(root+'/'+f,'utf8'):require('child_process').execFileSync('git',['show','HEAD:'+f],{cwd:root,encoding:'utf8',maxBuffer:20*1024*1024});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(test){for(let i=0;i<100;i++){if(test())return;await sleep(20)}assert(test(),'asynchronous navigation did not complete')}
const live=[];
function make(html,url,session={},local={}){
 const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/navigation|scrollTo/.test(e.message))console.error(e.message)});
 const dom=new JSDOM(html,{url:'https://examfusionprep.com'+url,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});live.push(dom);
 const w=dom.window,ctx=dom.getInternalVMContext();w.HTMLElement.prototype.getClientRects=function(){return this.hidden||this.closest("[hidden]")?[]:[{width:100,height:100}]};w.requestAnimationFrame=cb=>w.setTimeout(cb,0);w.cancelAnimationFrame=id=>w.clearTimeout(id);w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>true;w.alert=()=>{};w.matchMedia=()=>({matches:false,addEventListener(){}});w.fetch=async()=>({ok:false});
 Object.entries(session).forEach(([k,v])=>w.sessionStorage.setItem(k,v));Object.entries(local).forEach(([k,v])=>w.localStorage.setItem(k,v));
 const run=s=>vm.runInContext(s,ctx),scripts=()=>Array.from(w.document.scripts).forEach(s=>{if(!s.src&&!/json/.test(s.type))run(s.textContent)});
 const nav=()=>run(read('back-nav.js').replace('location.replace(url.href);','window.__navigation=url.href;'));
 return {w,run,scripts,nav,dom};
}
const dump=s=>Object.fromEntries(Array.from({length:s.length},(_,i)=>{let k=s.key(i);return[k,s.getItem(k)]}));
const mini=(id,link)=>`<input type="search" id="${id}"><nav><div id="results"><a href="${link}">Match</a></div></nav><a id="efp-home-button" href="/">Home</a><button id="efp-app-back-button">Back</button>`;
function trip(url='/',id='searchBox',leaf='/Crux-Tricks/viewer.html?id=sample&from=home-search'){
 const p=make(mini(id,leaf),url);p.nav();let input=p.w.document.getElementById(id);input.value='ancient history';let a=p.w.document.querySelector('#results a');a.addEventListener('click',e=>e.preventDefault());a.click();return {p,url:a.href,storage:dump(p.w.sessionStorage)};
}
function op(file,url,session={},local={}){
 const p=make(read('Original Practice/'+file),url,session,local);p.run(read('search-logic.js'));p.scripts();p.run('efCreateSearchWorker=function(){return {search:function(){return Promise.resolve([])}}}');p.run(read('Original Practice/'+(file.startsWith('English')?'english-practice.js':'original-practice.js')));p.nav();p.run(read('app-session.js'));let b=p.w.document.createElement('button');b.id='efp-app-back-button';p.w.document.body.appendChild(b);return p;
}
(async()=>{
 // All source hubs use the same result-link recording rule, including filtered cards.
 for(const [url,id] of [['/','searchBox'],['/Original%20Practice/index.html','chapterSearch'],['/Books/BlackBook/BlackBook.html','efBlackbookSearch'],['/Bihar%20Special/Bihar%20Special.html','globalSearch'],['/Mind%20Maps/SubjectName.html','searchInput'],['/Crux-Tricks/index.html','searchBox']]){
  const t=trip(url,id);assert(new URL(t.url).searchParams.get('efSearchReturn'));const leaf=make('<button id="efp-app-back-button">Back</button>',new URL(t.url).pathname+new URL(t.url).search,t.storage);leaf.nav();leaf.w.document.getElementById('efp-app-back-button').click();assert.equal(new URL(leaf.w.__navigation).pathname,new URL('https://examfusionprep.com'+url).pathname);
  const sourceUrl=new URL(leaf.w.__navigation);const ret=make(mini(id,'/leaf.html'),sourceUrl.pathname+sourceUrl.search,t.storage);ret.nav();ret.w.dispatchEvent(new ret.w.Event('load'));assert.equal(ret.w.document.getElementById(id).value,'ancient history');assert(!ret.w.location.search.includes('efSearchRestore'));
 }
 console.log('PASS six search sources: exact origin return and restored query');
 // Search -> hub -> deeper leaf must retain the original source with no query
 // in the hub. Legacy Back handlers registered first must also yield.
 const deepTrip=trip('/','searchBox','/Crux-Tricks/index.html');
 const hubUrl=new URL(deepTrip.url);
 const hub=make(mini('searchBox','/Crux-Tricks/viewer.html?id=ct0001&from=crux-index'),hubUrl.pathname+hubUrl.search,deepTrip.storage);
 hub.w.document.addEventListener('click',event=>{if(event.target.id==='efp-app-back-button'){event.stopImmediatePropagation();hub.w.__legacyBack=true}},true);
 hub.nav();const deeper=hub.w.document.querySelector('#results a');deeper.addEventListener('click',event=>event.preventDefault());deeper.click();
 assert.equal(new URL(deeper.href).searchParams.get('efSearchReturn'),hubUrl.searchParams.get('efSearchReturn'));
 hub.w.document.getElementById('efp-app-back-button').click();assert.equal(new URL(hub.w.__navigation).pathname,'/');assert(!hub.w.__legacyBack);
 // A managed pane can replace the synthetic guard. Hardware Back must still
 // leave this search trip instead of climbing the pane hierarchy.
 hub.w.__navigation='';hub.w.history.replaceState({efpCruxNav:true,level:'chapters'},'',hub.w.location.href);
 hub.w.dispatchEvent(new hub.w.PopStateEvent('popstate',{state:{efpCruxNav:true,level:'subjects'}}));
 assert.equal(new URL(hub.w.__navigation).pathname,'/');
 console.log('PASS search marker inheritance, legacy button and managed system Back');
 // A cold return restores exact results/presentation without an input event,
 // and keeps the search bar visible even after selecting a far-down result.
 const scrollSource=make(mini('globalSearch','/leaf.html'),'/Bihar%20Special/Bihar%20Special.html');scrollSource.nav();
 const si=scrollSource.w.document.getElementById('globalSearch');si.value='Maurya';
 Object.defineProperty(scrollSource.w,'scrollY',{value:900});si.getBoundingClientRect=()=>({top:-640});
 const sa=scrollSource.w.document.querySelector('#results a');sa.addEventListener('click',event=>event.preventDefault());sa.click();
 const ss=dump(scrollSource.w.sessionStorage),st=new URL(sa.href).searchParams.get('efSearchReturn');
 const cold=make(mini('globalSearch','/blank.html'),'/Bihar%20Special/Bihar%20Special.html?efSearchRestore='+st,ss);
 let reruns=0,scrolls=[];cold.w.document.getElementById('globalSearch').addEventListener('input',()=>reruns++);cold.w.scrollTo=(options)=>scrolls.push(options.top);
 cold.nav();cold.w.dispatchEvent(new cold.w.Event('load'));await sleep(30);cold.w.dispatchEvent(new cold.w.Event('pageshow'));await sleep(30);
 assert.equal(reruns,0);assert.equal(cold.w.document.getElementById('globalSearch').value,'Maurya');assert.equal(new URL(cold.w.document.querySelector('#results a').href).pathname,'/leaf.html');assert(scrolls.length&&scrolls.every(top=>top<=150));
 cold.w.document.getElementById('globalSearch').value='Gupta';cold.w.document.getElementById('globalSearch').dispatchEvent(new cold.w.Event('input',{bubbles:true}));assert.equal(reruns,1);
 console.log('PASS cold result restore: no re-search, stable visible search bar, edit resumes search');
 // Homepage's existing result snapshot must return instantly without restarting workers.
 const homeSnapshot=make(read('index.html'),'/',{
  efp_home_search_results_v1:JSON.stringify({query:'ancient',html:'<li data-deepresult="1"><a href="/leaf.html">Ancient result</a></li>',filter:'all',pages:0,scrollTop:0})
 },{efp_home_search_query_v1:'ancient'});
 homeSnapshot.run(read('search-logic.js'));homeSnapshot.scripts();homeSnapshot.nav();homeSnapshot.run(read('homepage-search-ui.js'));await sleep(30);
 assert.equal(homeSnapshot.w.document.getElementById('searchBox').value,'ancient');
 assert(homeSnapshot.w.document.querySelector('li[data-deepresult]'));
 assert(!/Searching/.test(homeSnapshot.w.document.getElementById('efSearchStatus').textContent));
 console.log('PASS actual homepage instant cached results, no new search');

 // A non-quiz browser/system Back returns to source, never PDF hierarchy.
 const t=trip();const leaf=make('<button id="efp-app-back-button">Back</button>',new URL(t.url).pathname+new URL(t.url).search,t.storage);leaf.nav();leaf.w.dispatchEvent(new leaf.w.Event('load'));await sleep(10);assert.equal(leaf.w.history.state.efpSearchReturnGuard,'top');leaf.w.history.back();await sleep(40);assert.equal(new URL(leaf.w.__navigation).pathname,'/');console.log('PASS PDF system Back source return');

 // Actual Crux bridge executes before deferred shared Back. Its URL/history
 // rewrites must preserve search markers and yield its window Back handler.
 function crux(url,storage={}){
  const c=make(read('Crux-Tricks/index.html'),url,storage);c.w.MutationObserver=class{observe(){} disconnect(){}};
  c.run(read('Crux-Tricks/crux-search-route.js'));c.run(read('Crux-Tricks/crux-manifest.js'));c.run(read('search-logic.js'));
 c.run('window.__searchCalls=0;efCreateSearchWorker=function(){return {warm:function(){return Promise.resolve()},search:function(){window.__searchCalls++;return Promise.resolve([])}}}');
  c.run(read('Crux-Tricks/crux-tricks.js'));c.scripts();c.nav();return c;
 }
 let c=crux('/Crux-Tricks/index.html');await sleep(30);
 c.w.document.querySelector('[data-material="crux"]').click();await sleep(10);
 c.w.document.querySelector('#sourceChoices .choice').click();await sleep(10);
 const level=c.w.history.state.level;
 const ci=c.w.document.getElementById('searchBox');ci.value='Maurya';
 const ca=c.w.document.createElement('a');ca.href='/Crux-Tricks/viewer.html?id=ct0001&from=crux-index';ca.textContent='Match';c.w.document.getElementById('fullTextResults').appendChild(ca);ca.addEventListener('click',e=>e.preventDefault());ca.click();
 const cstorage=dump(c.w.sessionStorage),ctoken=new URL(ca.href).searchParams.get('efSearchReturn');assert(ctoken);
 let incoming=crux('/Crux-Tricks/index.html?efSearchReturn='+ctoken,cstorage);await sleep(30);
 assert(incoming.w.EFP_SEARCH_RETURN.isActive());incoming.w.document.getElementById('searchBox').value='';
 incoming.w.document.querySelector('[data-material="crux"]').click();await sleep(10);
 incoming.w.document.getElementById('efp-app-back-button')?.remove();let cb=incoming.w.document.createElement('button');cb.id='efp-app-back-button';incoming.w.document.body.appendChild(cb);cb.click();
 assert.equal(new URL(incoming.w.__navigation).pathname,'/Crux-Tricks/index.html');
 const cu=new URL(incoming.w.__navigation);const restored=crux(cu.pathname+cu.search,cstorage);await sleep(30);
 assert.equal(restored.w.history.state.level,level);assert.equal(restored.w.document.getElementById('searchBox').value,'Maurya');
 await sleep(250);assert.equal(restored.w.__searchCalls,0);assert(restored.w.document.querySelector('#fullTextResults a'));
 console.log('PASS actual Crux managed pane, source search restoration and Back precedence');[c,incoming,restored].forEach(x=>x.dom.window.close());
 // Real Original Practice: source marker survives URL rewriting, sections and reset.
 const master=JSON.parse(read('Original Practice/Economics_Complete_Practice.html').match(/<script id="master-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
 const subject=Object.keys(master)[0],chapter=Object.keys(master[subject])[0];
 const original=trip('/Original%20Practice/index.html','chapterSearch','/Original%20Practice/Economics_Complete_Practice.html?'+new URLSearchParams({subject,chapter}));
 let url=new URL(original.url);let p=op('Economics_Complete_Practice.html',url.pathname+url.search,original.storage);await sleep(40);assert.equal(p.run('state.screen'),'quiz');assert(p.w.EFP_SEARCH_RETURN.isActive());p.w.document.querySelector('#opts-0 .option-btn').click();p.run('switchSection(1);switchSection(0)');await sleep(30);p.w.document.getElementById('efp-app-back-button').click();assert(p.w.document.getElementById('efp-quiz-exit-modal').classList.contains('show'));p.w.document.querySelector('.efp-qw-stay').click();assert(!p.w.__navigation);p.w.document.getElementById('efp-app-back-button').click();p.w.document.querySelector('.efp-qw-leave').click();await waitFor(()=>p.w.__navigation);assert.equal(new URL(p.w.__navigation).pathname,'/Original%20Practice/index.html');console.log('PASS actual answered Economics quiz: Stay/ Quit preserves search destination');
 // Unanswered native Back also uses source instead of Chapters.
 p=op('Economics_Complete_Practice.html',url.pathname+url.search,original.storage);await sleep(30);p.w.history.back();await waitFor(()=>p.w.__navigation);assert.equal(new URL(p.w.__navigation).pathname,'/Original%20Practice/index.html');console.log('PASS actual unanswered quiz system Back');
 // Search within a Complete Practice page opens a single quiz entry and returns to its search screen.
 p=op('Economics_Complete_Practice.html','/Original%20Practice/Economics_Complete_Practice.html');await sleep(30);let inp=p.w.document.querySelector('.efp-op-search input');inp.value='demand';inp.dispatchEvent(new p.w.Event('input',{bubbles:true}));await sleep(180);let result=p.w.document.querySelector('button.efp-op-search-result');assert(result);result.click();await sleep(20);assert(p.w.EFP_SEARCH_RETURN.isActive());assert.equal(p.run('state.screen'),'quiz');p.w.document.getElementById('efp-app-back-button').click();await sleep(40);url=new URL(p.w.__navigation);assert(!url.searchParams.get('chapter'));let source=op('Economics_Complete_Practice.html',url.pathname+url.search,dump(p.w.sessionStorage));source.w.dispatchEvent(new source.w.Event('load'));await sleep(170);assert.equal(source.w.document.querySelector('.efp-op-search input').value,'demand');assert(source.w.document.querySelector('button.efp-op-search-result'));console.log('PASS actual in-page Economics search/results restore');
 // English question-result buttons use the same source and retain marker after Reset.
 p=op('English_Grammar_Complete_Practice.html','/Original%20Practice/English_Grammar_Complete_Practice.html');await sleep(30);inp=p.w.document.querySelector('.efp-op-search input');inp.value='nouns';inp.dispatchEvent(new p.w.Event('input',{bubbles:true}));await sleep(130);result=p.w.document.querySelector('button.efp-op-search-result');assert(result);result.click();await sleep(30);assert.equal(p.run('state.screen'),'quiz');assert(p.w.EFP_SEARCH_RETURN.isActive());p.w.document.querySelector('.efp-op-reset-attempt').click();await sleep(40);p.w.document.getElementById('efp-app-back-button').click();await sleep(40);assert(!new URL(p.w.__navigation).searchParams.get('chapter'));console.log('PASS English in-page search + Reset + Back');
 const eu=new URL(p.w.__navigation);const er=op('English_Grammar_Complete_Practice.html',eu.pathname+eu.search,dump(p.w.sessionStorage));await sleep(170);assert(er.w.document.querySelector('button[data-search-chapter]'));er.w.document.querySelector('button[data-search-chapter]').click();await sleep(30);assert.equal(er.run('state.screen'),'quiz');console.log('PASS restored English result buttons remain usable');
 // Ordinary navigation stays in the existing hierarchy.
 p=op('Economics_Complete_Practice.html','/Original%20Practice/Economics_Complete_Practice.html');p.run('goToChapters(Object.keys(MASTER)[0]);goToQuiz(Object.keys(MASTER[state.subject])[0])');await sleep(30);assert(!p.w.EFP_SEARCH_RETURN.isActive());p.w.document.getElementById('efp-app-back-button').click();await sleep(50);assert.equal(p.run('state.screen'),'chapters');assert(!p.w.__navigation);console.log('PASS non-search quiz hierarchy');
 // Home and modified clicks must not start a search trip.
 p=trip().p;let home=p.w.document.getElementById('efp-home-button');home.addEventListener('click',e=>e.preventDefault());home.click();assert(!home.href.includes('efSearchReturn'));console.log('PASS Home excluded');
})().then(()=>{live.forEach(d=>d.window.close())}).catch(e=>{console.error(e);live.forEach(d=>d.window.close());process.exitCode=1});
