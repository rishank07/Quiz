// Serve the real pages; external requests (including Analytics/GTM) are blocked before navigation.
const pw=require(process.env.EFP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{let name;try{name=decodeURIComponent(new URL(req.url,'http://local').pathname)}catch(_){res.writeHead(400);return res.end()}
 const file=path.join(root,name==='/'?'index.html':name);if(!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);return res.end()}
 res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json'}[path.extname(file)]||'application/octet-stream'));fs.createReadStream(file).pipe(res)});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,browser=await pw.chromium.launch({executablePath:process.env.EFP_CHROMIUM,headless:true,args:['--no-sandbox']});let cases=0;
 try{
  for(const viewport of [{width:390,height:844},{width:1366,height:768}]){
   const context=await browser.newContext({viewport});await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
   const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
   for(const subject of ['History','Polity','Science','Geography','Economics','Environment_Ecology','Static_GK','English_Grammar']){
    const english=subject==='English_Grammar';await p.goto(origin+'/Original Practice/'+subject+'_Complete_Practice.html');await p.waitForFunction(()=>!!window.EFP_QUIZ_CONTINUITY);
    await p.evaluate(english=>{if(english)goToQuiz(Object.keys(MASTER)[0]);else{goToChapters(Object.keys(MASTER)[0]);goToQuiz(Object.keys(MASTER[state.subject])[0])}switchSection(1)},english);
    await p.waitForTimeout(80);assert.equal(await p.locator('.section-pill').first().textContent(),'1','Jumping ahead cannot complete a skipped section');
    await p.evaluate(english=>{switchSection(0);const qs=state.quizData[0].questions;qs.slice(0,-1).forEach((q,qi)=>{if(english)saved.answers[state.chapterName][q.id]=q.answer;else{state.answerMap['0-'+qi]={selectedOrigIdx:currentAnswerIndex(q)}}});window.EFP_QUIZ_CONTINUITY.syncCompletion()},english);
    assert.equal(await p.locator('.section-pill').first().textContent(),'1','Partial attempts cannot complete a section');
    await p.evaluate(english=>{const qi=state.quizData[0].questions.length-1,q=state.quizData[0].questions[qi];selectOption(qi,english?q.answer:state.shuffleMap['0-'+qi].indexOf(currentAnswerIndex(q)))},english);
    await p.waitForFunction(()=>document.querySelector('.section-pill').textContent==='✓');assert.equal(await p.locator('.section-pill').first().getAttribute('data-ef-attempted'),await p.locator('.section-pill').first().getAttribute('data-ef-total'));
    await p.reload();await p.waitForFunction(()=>document.querySelector('.section-pill')?.textContent==='✓');
    p.once('dialog',d=>d.accept());await p.locator('.efp-op-reset-attempt').click();await p.waitForFunction(()=>document.querySelector('.section-pill')?.textContent==='1');cases++;
   }
   await p.goto(origin+'/Current Affairs/Topic Names/Rapid Practice/2026/Topic Wise/Awards_2026_Current_Affairs_Rapid_Practice.html');await p.waitForFunction(()=>!!window.EFP_QUIZ_CONTINUITY);
   await p.evaluate(()=>{saved.answers={};const qs=SECTIONS[0].questions;qs.slice(0,-1).forEach((q,qi)=>saved.answers['0-'+qi]=correctIndex(q));renderQuestions()});await p.waitForTimeout(60);assert.equal(await p.locator('#sectionNav .pill').first().textContent(),'1');
   await p.evaluate(()=>{const qi=SECTIONS[0].questions.length-1;pick(qi,correctIndex(SECTIONS[0].questions[qi]))});await p.waitForFunction(()=>document.querySelector('#sectionNav .pill').textContent==='✓');cases++;
   await p.goto(origin+'/Books/BlackBook/Files/Spelling Correction Quiz.html');await p.waitForFunction(()=>window.EFP_QUIZ_CONTINUITY&&document.querySelector('#alphabet-container button[data-letter]'));
   const letter=await p.evaluate(()=>Object.keys(groupedData).find(l=>groupedData[l].length>1&&groupedData[l].length<10));assert(letter);
   await p.locator('#alphabet-container button[data-letter="'+letter+'"]').click();await p.waitForFunction(l=>document.querySelectorAll('#section-'+l+' .quiz-option').length===groupedData[l].length*4,letter);
   await p.evaluate(l=>{const a={};groupedData[l].slice(0,-1).forEach(q=>a['opts-'+q.sn]={value:'saved',correct:false});localStorage.setItem('efp_quiz_progress_v2',JSON.stringify({[decodeURIComponent(location.pathname)]:{kind:'dynamic-book',answers:a}}));window.EFP_QUIZ_CONTINUITY.syncCompletion()},letter);assert.equal(await p.locator('#alphabet-container button[data-letter="'+letter+'"]').textContent(),letter);
   await p.locator('#section-'+letter+' [id^=opts-]').last().locator('.quiz-option').first().click();await p.waitForFunction(l=>document.querySelector('#alphabet-container button[data-letter="'+l+'"]').textContent==='✓',letter);cases++;
   assert.deepEqual(errors,[]);await context.close();console.log('PASS '+viewport.width+'px: all eight Original Practice banks, Rapid Practice and lazy Blackbook completion; skip/partial/full/reset/reload');
  }
  console.log('PASS '+cases+' quiz completion cases');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
