// EFP_PLAYWRIGHT=/path/to/playwright EFP_CHROMIUM=/path/to/chromium node this-file
const pw=require(process.env.EFP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),server=http.createServer((req,res)=>{let name;try{name=decodeURIComponent(new URL(req.url,'http://local').pathname)}catch(_){res.writeHead(400);return res.end()}
 const file=path.join(root,name==='/'?'index.html':name);if(!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);return res.end()}
 res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json'}[path.extname(file)]||'application/octet-stream'));fs.createReadStream(file).pipe(res)});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(p){await p.waitForFunction(()=>!!window.EFP_QUIZ_CONTINUITY)}
async function record(p,selector){await p.locator(selector).scrollIntoViewIfNeeded();await p.evaluate(sel=>{const c=document.querySelector(sel);window.scrollTo({top:window.scrollY+c.getBoundingClientRect().top-110,behavior:'instant'})},selector);await p.waitForTimeout(350);await p.evaluate(()=>window.EFP_QUIZ_CONTINUITY.save())}
async function framed(p,selector){await p.waitForFunction(sel=>{const n=document.querySelector(sel),r=n?.getBoundingClientRect();return r&&r.top>=0&&r.top<innerHeight*.6},selector);await p.waitForTimeout(500);const box=await p.locator(selector).boundingBox();assert(box.y>=0&&box.y<await p.evaluate(()=>innerHeight*.6),'Restored question must remain in view: '+selector+' '+box.y)}
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,browser=await pw.chromium.launch({executablePath:process.env.EFP_CHROMIUM,headless:true,args:['--no-sandbox']});let cases=0;
 try{for(const viewport of [{width:390,height:844},{width:1366,height:768}]){
  const context=await browser.newContext({viewport,...(viewport.width<500?{isMobile:true,hasTouch:true,userAgent:"Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/153.0.0.0 Mobile Safari/537.36"}:{})});await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  for(const subject of ['History','Polity','Science','Geography','Economics','Environment_Ecology','Static_GK','English_Grammar']){
   const english=subject==='English_Grammar',file='/Original Practice/'+subject+'_Complete_Practice.html';await p.goto(origin+file);await ready(p);
   await p.evaluate(en=>{if(en)goToQuiz(Object.keys(MASTER)[0]);else{goToChapters(Object.keys(MASTER)[0]);goToQuiz(Object.keys(MASTER[state.subject])[0])}switchSection(state.quizData.findIndex(s=>s.questions.length>=6))},english);
   await p.locator('#opts-4 button').first().click();await record(p,'#q-4');
   const target=await p.evaluate(()=>({subject:state.subject,chapter:state.chapterName,section:state.currentSection}));
   await p.locator('#app button[onclick^="goToChapters"],#app button[onclick="goChapters()"]').click();
   const quit=p.locator('.efp-qw-leave');if(await quit.isVisible())await quit.click();
   await p.waitForFunction(()=>state.screen==='chapters');await p.evaluate(chapter=>goToQuiz(chapter),target.chapter);await framed(p,'#q-4');
   await p.reload();await ready(p);await framed(p,'#q-4');
   assert.equal(await p.evaluate(en=>en?chapterStats(state.chapterName).attempted:state.score.attempted,english),1,'Saved answers survive reopening');
   // Explicit question/bookmark entry wins over the saved Q5 reading position.
   const params=new URLSearchParams({chapter:target.chapter,section:String(target.section+1),q:'1'});if(target.subject)params.set('subject',target.subject);
   await p.goto(origin+file+'?'+params);await ready(p);await p.waitForTimeout(800);const first=await p.locator('#q-0').boundingBox();assert(first.y<viewport.height,'Explicit Q1 remains the target');
   await p.locator('.efp-op-reset-attempt').click();await p.waitForTimeout(300);assert.equal(await p.evaluate(en=>en?chapterStats(state.chapterName).attempted:state.score.attempted,english),0);cases++;
  }
  const rapid='/Current Affairs/Topic Names/Rapid Practice/2026/Topic Wise/Awards_2026_Current_Affairs_Rapid_Practice.html';await p.goto(origin+rapid);await ready(p);
  await p.locator('#sectionNav .pill').nth(1).click();await p.locator('#rp-1-4 .opt').first().click();await record(p,'#rp-1-4');await p.goto(origin+'/support.html');await p.goto(origin+rapid);await ready(p);await framed(p,'#rp-1-4');assert.equal(await p.evaluate(()=>stats().attempted),1);
  await p.evaluate(()=>resetAll());await p.waitForTimeout(400);const positions=await p.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('efp_reading_position_v1:')&&k.includes('Awards')).map(k=>JSON.parse(localStorage.getItem(k))));assert.equal(positions.length,0,'Confirmed reset clears the saved reading position');assert.equal(await p.evaluate(()=>scrollY),0,'Reset returns to the beginning');cases++;
  const bb='/Books/BlackBook/Files/Spelling Correction Quiz.html';await p.goto(origin+bb);await ready(p);await p.locator('#alphabet-container button[data-letter="B"]').click();await p.waitForFunction(()=>document.querySelectorAll('#questions-B [id^=opts-]').length===groupedData.B.length);await p.waitForTimeout(500);await p.locator('#questions-B [id^=opts-]').nth(4).locator('button').first().click();const id=await p.locator('#questions-B [id^=opts-]').nth(4).getAttribute('id');const selector='#'+id;
  await record(p,selector);await p.reload();await ready(p);await framed(p,selector);assert.equal(await p.locator(selector+' button:disabled').count(),4);cases++;
  const book="/Books/Lucent's Objective/Economics/ChapterNames/Nature of Indian Economy.html";await p.goto(origin+book);await ready(p);await record(p,'#q5');await p.goto(origin+'/support.html');await p.goto(origin+book);await ready(p);await framed(p,'#q5');cases++;
  const bihar='/Bihar Special/Topic Names/Bihar Objective GK - 60 Sets.html';await p.goto(origin+bihar);await ready(p);await p.evaluate(()=>showSet('2'));await p.locator('#s2-5').waitFor();await record(p,'#s2-5');await p.goto(origin+'/support.html');await p.goto(origin+bihar);await ready(p);await framed(p,'#s2-5');assert.equal(await p.evaluate(()=>currentSetNo()),2);cases++;
  const mind='/Mind Maps/Polity/ChapterNames/13_state_executive_mindmap.html';await p.goto(origin+mind);await ready(p);await p.locator('.tab[onclick*="governor"]').click();await record(p,'#governor .card:nth-child(2)');await p.goto(origin+'/support.html');await p.goto(origin+mind);await ready(p);await framed(p,'#governor .card:nth-child(2)');cases++;
  // The delayed settle must yield immediately when the learner starts scrolling.
  await p.reload();await ready(p);await p.mouse.wheel(0,400);await p.waitForTimeout(150);const y=await p.evaluate(()=>scrollY);await p.waitForTimeout(600);assert.equal(await p.evaluate(()=>scrollY),y);cases++;
  assert.deepEqual(errors,[]);await context.close();console.log('PASS '+viewport.width+'px: eight OP banks quit/reopen/reload, explicit question priority, Rapid, lazy Blackbook, static book, Bihar set, mindmap tab, user-scroll cancellation');
 }
 console.log('PASS '+cases+' reading continuation cases');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
