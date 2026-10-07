// EFP_PLAYWRIGHT=/path/to/playwright EFP_CHROMIUM=/path/to/chromium node this-file
const pw=require(process.env.EFP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),server=http.createServer((req,res)=>{let name;try{name=decodeURIComponent(new URL(req.url,'http://local').pathname)}catch(_){res.writeHead(400);return res.end()}
 const file=path.join(root,name==='/'?'index.html':name);if(!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);return res.end()}
 res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json'}[path.extname(file)]||'application/octet-stream'));fs.createReadStream(file).pipe(res)});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(p){await p.waitForFunction(()=>!!window.EFP_QUIZ_CONTINUITY)}
async function record(p,selector){await p.locator(selector).scrollIntoViewIfNeeded();await p.evaluate(sel=>{const c=document.querySelector(sel);window.scrollTo({top:window.scrollY+c.getBoundingClientRect().top-110,behavior:'instant'})},selector);await p.waitForTimeout(350);await p.evaluate(()=>window.EFP_QUIZ_CONTINUITY.save())}
async function framed(p,selector){await p.waitForFunction(sel=>{const n=document.querySelector(sel),r=n?.getBoundingClientRect();return r&&r.top>=0&&r.top<innerHeight*.6},selector);await p.waitForTimeout(500);const box=await p.locator(selector).boundingBox();assert(box.y>=0&&box.y<await p.evaluate(()=>innerHeight*.6),'Restored question must remain in view: '+selector+' '+box.y)}
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,browser=await pw.chromium.launch({executablePath:process.env.EFP_CHROMIUM,headless:true,args:['--no-sandbox']});
 try{
  for(const viewport of [{width:390,height:844},{width:1366,height:768}]){
   const c=await browser.newContext({viewport});await c.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
   await c.addInitScript(()=>{window.pdfjsLib={GlobalWorkerOptions:{},getDocument(){return{promise:Promise.resolve({numPages:50,getPage(n){return Promise.resolve({getViewport({scale}){return{width:600*scale,height:800*scale,scale,transform:[scale,0,0,scale,0,0]}},render(){return{promise:Promise.resolve(),cancel(){}}},getTextContent(){return Promise.resolve({items:[],styles:{}})}})}})}}}});
   const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
   const pdf='/Crux-Tricks/viewer.html?id=ct0577';await p.goto(origin+pdf);await ready(p);await p.waitForFunction(()=>window.EFP_READING_PAGE?.snapshot().ready);
   await p.evaluate(()=>window.EFP_READING_PAGE.restore({id:'ct0577',page:3,top:120,left:0}));await p.waitForTimeout(500);
   await p.evaluate(()=>{const s=document.getElementById('pdfStage');s.scrollTop+=120});await p.waitForTimeout(250);await p.evaluate(()=>window.EFP_QUIZ_CONTINUITY.save());const before=await p.evaluate(()=>window.EFP_READING_PAGE.snapshot());assert.equal(before.page,3);
   await p.goto(origin+'/support.html');await p.goto(origin+pdf);await ready(p);await p.waitForFunction(()=>window.EFP_READING_PAGE?.snapshot().ready&&window.EFP_READING_PAGE.snapshot().page===3);await p.waitForTimeout(500);const after=await p.evaluate(()=>window.EFP_READING_PAGE.snapshot());assert(Math.abs(after.top-before.top)<10,'Internal PDF scroll offset restored');
   await p.goto(origin+pdf+'&page=1');await ready(p);await p.waitForTimeout(800);assert.equal(await p.locator('#pageInput').inputValue(),'1','Explicit PDF page overrides continuation');
   console.log('PASS '+viewport.width+'px PDF reader: document/page/internal scroll and explicit-page priority with deterministic PDF renderer');
   const mixed='/Original Practice/Mixed_Practice.html';await p.goto(origin+mixed);await ready(p);await p.locator('label.pool:has(input[data-pool="english"])').click();await p.locator('label.pool:has(input[data-pool="ecology"])').click();await p.locator('#questionCount').fill('20');await p.locator('#generateBtn').click();await p.waitForFunction(()=>!document.getElementById('quizView').hidden&&document.getElementById('questionEn').textContent.trim());
   for(let i=0;i<4;i++)await p.locator('#nextBtn').click();const text=await p.locator('#questionEn').textContent();await record(p,'#quizView .question-card');await p.reload();await ready(p);await p.waitForFunction(t=>document.getElementById('questionEn').textContent===t,text);await framed(p,'#quizView .question-card');assert((await p.locator('#questionNumber').textContent()).startsWith('Question 5'));
   console.log('PASS '+viewport.width+'px Mixed Practice: saved question index plus reading offset');
   assert.deepEqual(errors,[]);await c.close();
  }
  for(const [mode,ua]of [['Android TWA','Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 Chrome/153.0.0.0 Mobile Safari/537.36'],['Windows PWA',null]]){
   const c=await browser.newContext({viewport:ua?{width:390,height:844}:{width:1366,height:768},...(ua?{userAgent:ua,isMobile:true,hasTouch:true}:{})});await c.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
   await c.addInitScript(()=>{const original=window.matchMedia.bind(window);window.matchMedia=q=>q==='(display-mode: standalone)'?{matches:true,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}:original(q)});
   const p=await c.newPage();p.on('dialog',d=>d.accept());await p.goto(origin+'/Original Practice/English_Grammar_Complete_Practice.html');await ready(p);await p.evaluate(()=>goToQuiz('01. Basics'));await p.locator('#opts-4 button').first().click();await record(p,'#q-4');await p.reload();await ready(p);await framed(p,'#q-4');assert.equal(await p.evaluate(()=>chapterStats('01. Basics').attempted),1);console.log('PASS '+mode+' simulated installed surface: question resume and saved answer');await c.close();
  }
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
