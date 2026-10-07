// Serve checked-in files locally; external analytics/fonts are blocked.
// EFP_PLAYWRIGHT=/path/to/playwright EFP_BROWSER=chromium|firefox node this-file
const pw=require(process.env.EFP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),kind=process.env.EFP_BROWSER||'chromium';
const server=http.createServer((req,res)=>{
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://local').pathname)}catch(_){res.writeHead(400);return res.end()}
 const file=path.join(root,pathname==='/'?'index.html':pathname);
 if(!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);return res.end()}
 res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.gz':'application/gzip','.pdf':'application/pdf'}[path.extname(file)]||'application/octet-stream'));
 fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await pw[kind].launch({headless:true,args:kind==='chromium'?['--no-sandbox']:[],env:{...process.env,MOZ_DISABLE_CONTENT_SANDBOX:'1',MOZ_DISABLE_RDD_SANDBOX:'1',MOZ_DISABLE_GMP_SANDBOX:'1'}});let cases=0;
 try{
  for(const [width,height]of (process.env.EFP_HOME_ONLY?[]:[[320,700],[390,844],[768,1024],[844,390],[1366,768]])){
   const context=await browser.newContext({viewport:{width,height}});await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
   for(const [file,q,selector]of [
    ['Books/Ghatnachakra Purvalokan/SubjectName.html','gandhi','#efScopedResults a'],
    ['Books/Lucent\'s Objective/SubjectName.html','gandhi','#efScopedResults a'],
    ['Books/Pinnacle GS/PinnacleParts.html','gandhi','#efScopedResults a'],
    ['Mind Maps/SubjectName.html','nand','#efContentResults a'],
    ['Books/BlackBook/BlackBook.html','abandon','#efBlackbookResults a']
   ]){
    const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(origin+'/'+file);
    await p.locator('input[type=search],input[id*=earch]').first().fill(q);await p.waitForFunction(sel=>document.querySelectorAll(sel).length>0,selector,{timeout:20000});assert.deepEqual(errors,[],file);
    const href=await p.locator(selector).first().getAttribute('href');assert(href);cases++;await p.close();
   }
   for(const file of [
    'Original Practice/Static_GK_Complete_Practice.html?subject=Static+GK&chapter=06.+Popular+Nicknames+of+Famous+Personalities&section=3&q=4&efSearchQuery=Nitish',
    'Mind Maps/Polity/ChapterNames/13_state_executive_mindmap.html?efSearchQuery=Nitish',
    'Bihar Special/Topic Names/ANCIENT HISTORY OF BIHAR.html?efsearch=Stupa#bihar-fact-29',
    'Current Affairs/Topic Names/Rapid Practice/2026/Topic Wise/Summits_and_Conferences_2026_Current_Affairs_Rapid_Practice.html?efSearchQuery=modi#rp-1-0'
   ]){
    const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(origin+'/'+file);await p.locator('.efp-search-context,.efp-mindmap-search-context').waitFor();
    const bar=p.locator('.efp-search-context,.efp-mindmap-search-context');assert.equal(await bar.count(),1,file);const r=await bar.boundingBox();assert(r.x>=-1&&r.x+r.width<=width+1&&r.y>=0&&r.y+r.height<height,file+' dock outside viewport');
    if(file.startsWith('Original')){const before=await p.evaluate(()=>JSON.stringify({score:state.score,answers:state.answerMap}));assert.equal(await p.locator('.option-btn mark').count(),0);await p.locator('.efp-context-explanation').click();assert((await p.locator('.option-btn mark').count())>0);assert.equal(await p.evaluate(()=>JSON.stringify({score:state.score,answers:state.answerMap})),before)}
    const next=p.locator('.efp-context-next,.efp-mm-next');if(!await next.isDisabled())await next.click();await bar.waitFor();assert.equal(await bar.count(),1);await p.evaluate(()=>window.scrollBy(0,200));assert((await bar.boundingBox()).y>=0);
    await p.locator('.efp-context-dismiss,.efp-mm-dismiss').click();assert.equal(await bar.count(),0);assert.deepEqual(errors,[],file);cases++;await p.close();
   }
   await context.close();console.log('PASS',kind,width+'x'+height,'five hubs + four exact entries, preview, next, sticky dock and dismissal');
  }
  // Actual cold/repeat homepage and a no-worker mobile full-text hub.
  const context=await browser.newContext({viewport:{width:390,height:844}});await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
  const home=await context.newPage();let homeDocuments=0;home.on('framenavigated',frame=>{if(frame===home.mainFrame())homeDocuments++});await home.goto(origin+'/');await home.locator('#searchBox').fill('Nitish');await home.waitForFunction(()=>{const t=document.getElementById('efSearchTools');return t&&!t.classList.contains('is-searching')&&document.querySelector('[data-bookfullitem]')},null,{timeout:45000});
  const routes=()=>home.locator('li.ef-search-result-item:not(.ef-search-duplicate) a').evaluateAll(es=>es.map(e=>{const u=new URL(e.href);u.searchParams.delete('efSearchQuery');return u.pathname+u.search+u.hash}).sort());
  const cold=await routes();assert(cold.length>10);assert.equal(homeDocuments,1,'First PWA installation must not reload an active cold search');await home.locator('#searchBox').fill('');await home.locator('#searchBox').fill('  nItIsH  ');await home.waitForFunction(()=>!document.getElementById('efSearchTools').classList.contains('is-searching'),null,{timeout:45000});assert.deepEqual(await routes(),cold);await home.close();cases++;
  await context.addInitScript(()=>{window.Worker=class{constructor(){throw Error('Blocked worker')}}});
  const fallback=await context.newPage();await fallback.goto(origin+'/Books/BlackBook/BlackBook.html');await fallback.locator('input[type=search],input[id*=earch]').first().fill('abandon');await fallback.locator('#efBlackbookResults a').first().waitFor({timeout:20000});cases++;await fallback.close();const noWorkerHome=await context.newPage();await noWorkerHome.addInitScript(()=>{localStorage.removeItem('efp_home_search_query_v1');sessionStorage.removeItem('efp_home_search_results_v1')});await noWorkerHome.goto(origin+'/');await noWorkerHome.locator('#searchBox').fill('Nitish');await noWorkerHome.waitForFunction(()=>{const t=document.getElementById('efSearchTools');return t&&!t.classList.contains('is-searching')&&document.querySelector('[data-bookfullitem]')},null,{timeout:60000});const recovered=await noWorkerHome.locator('li.ef-search-result-item:not(.ef-search-duplicate) a').evaluateAll(es=>es.map(e=>{const u=new URL(e.href);u.searchParams.delete('efSearchQuery');return u.pathname+u.search+u.hash}).sort());assert.deepEqual(recovered,cold,'No-worker homepage matches normal worker results');cases++;await context.close();
  console.log('PASS',kind,cases,'real-browser cases; homepage cold/repeat and mobile no-worker BlackBook recovery');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
