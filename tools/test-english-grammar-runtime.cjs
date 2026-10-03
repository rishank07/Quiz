// EFP_TEST_JSDOM=/path/to/jsdom EFP_ENGLISH_BASELINE=/path/to/before.json node tools/test-english-grammar-runtime.cjs
const {JSDOM}=require(process.env.EFP_TEST_JSDOM || 'jsdom');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
function make(file,storage={},mixed=false){
 const dom=new JSDOM(read(file),{url:'https://examfusionprep.com/'+file.replaceAll(' ','%20'),runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,ctx=dom.getInternalVMContext();
 w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>true;w.alert=()=>{};
 Object.entries(storage).forEach(([k,v])=>w.localStorage.setItem(k,v));
 w.fetch=async url=>({ok:true,text:async()=>read('Original Practice/'+String(url).replace(/^\.\//,'').split('?')[0])});
 const run=code=>vm.runInContext(code,ctx);
 Array.from(w.document.scripts).forEach(s=>{
  if(s.src||/json/.test(s.type))return;
  let code=s.textContent;
  if(mixed&&code.includes('function normalizeEnglishQuestion'))code=code.replace(/\}\)\(\);\s*$/,'window.__grammarTest={buildPool:buildPool,normalize:normalizeEnglishQuestion,stable:stableQuestionId};})();');
  run(code);
 });
 if(!mixed){run(read('black-mode.js'));run(read('search-logic.js'));run(read('Original Practice/english-practice.js'));}
 return {dom,w,run};
}
const storage=w=>Object.fromEntries(Array.from({length:w.localStorage.length},(_,i)=>{const k=w.localStorage.key(i);return[k,w.localStorage.getItem(k)]}));
(async()=>{
 let p=make('Original Practice/English_Grammar_Complete_Practice.html');
 p.run("goToQuiz('01. Basics');switchSection(2)");
 assert.equal(p.w.document.querySelector('#q-0 .sentence-box').textContent.trim(),'She plays football.');
 assert.equal(p.w.document.querySelectorAll('#q-0 .sentence-box .target').length,0);
 assert(p.w.document.querySelector('#exp-0').classList.contains('hidden'));
 p.run("selectOption(0,MASTER['01. Basics'][2].questions[0].answer)");
 assert.equal(p.w.document.querySelectorAll('#opts-0 .correct').length,1);
 assert(!p.w.document.querySelector('#exp-0').classList.contains('hidden'));
 assert.equal(p.run("chapterStats('01. Basics').correct"),1);
 assert(p.w.document.querySelectorAll('#exp-0 .grammar-explanation b').length>0);
 assert(!p.w.document.querySelector('#exp-0').textContent.includes('<b>'));
 assert(p.run("explanationMarkup('<b>safe</b><img src=x onerror=alert(1)>')").includes('&lt;img'));
 p.run('switchSection(3);switchSection(2)');assert.equal(p.run('JSON.stringify(state.shuffleMap)').includes('q45'),true);
 p.w.document.querySelector('#q-0 .efp-op-star').click();
 const bookmark=storage(p.w).efp_bookmarks;assert(bookmark);
 let saved=storage(p.w);p.dom.window.close();
 p=make('Original Practice/English_Grammar_Complete_Practice.html',saved);
 p.run("goToQuiz('01. Basics');switchSection(2)");
 assert.equal(p.w.document.querySelectorAll('#opts-0 .correct').length,1);
 assert(p.w.document.querySelector('#q-0 .efp-op-star').classList.contains('is-bookmarked'));
 assert.equal(p.w.localStorage.getItem('efp_bookmarks'),bookmark);
 p.run("goToQuiz('05. Pronouns');state.currentSection=MASTER['05. Pronouns'].findIndex(s=>s.questions.some(q=>q.id==='q80'));render()");
 assert(p.w.document.querySelector('#questions-container').textContent.includes('Myself is'));
 p.w.localStorage.setItem('efp_black_mode','on');saved=storage(p.w);p.dom.window.close();
 p=make('Original Practice/English_Grammar_Complete_Practice.html',saved);
 p.run("goToQuiz('01. Basics');switchSection(2)");
 assert.equal(p.w.document.querySelectorAll('#opts-0 .correct').length,1);
 assert.equal(p.w.localStorage.getItem('efp_black_mode'),'on');
 p.dom.window.close();
 p=make('Original Practice/Mixed_Practice.html',{},true);
 const pool=await p.w.__grammarTest.buildPool('english');assert.equal(pool.length,2354);
 if(process.env.EFP_ENGLISH_BASELINE){
  const baseline=JSON.parse(fs.readFileSync(process.env.EFP_ENGLISH_BASELINE,'utf8'));
  const ids=Object.values(baseline).flatMap(secs=>secs.flatMap(s=>s.questions.map(q=>p.w.__grammarTest.stable('english','English Grammar',p.w.__grammarTest.normalize(q)))));
  assert.deepEqual(Array.from(pool,q=>q.id),ids);
 }
 assert(pool.some(q=>q.chapter==='01. Basics'&&q.q.q.en.includes('She plays football.')));
 p.dom.window.close();
 console.log('PASS DOM runtime: hidden answers, selective English markup, correct score, section navigation, restored attempts/bookmarks, dark-mode loading and all 2,354 legacy Mixed Practice IDs.');
})().catch(e=>{console.error(e);process.exit(1)});
