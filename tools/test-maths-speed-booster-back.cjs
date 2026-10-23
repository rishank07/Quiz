// Real Booster, app-session, shared Back controls and History API; no network.
const {JSDOM, VirtualConsole} = require(process.env.EFP_TEST_JSDOM || 'jsdom');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..'), read = p => fs.readFileSync(path.join(root,p),'utf8');
const pause = () => new Promise(resolve => setTimeout(resolve,40));
const pages = [];
function page(surface='Browser', {search=false, earlySession=false}={}) {
  const vc = new VirtualConsole(), errors=[];
  vc.on('jsdomError',e=>{if(!/navigation|scrollTo/.test(e.message))errors.push(e.message);});
  const url='https://examfusionprep.com/Maths%20Speed%20Booster/math-speed-booster.html'+(search?'?efSearchReturn=mathtrip':'');
  const dom=new JSDOM(read('Maths Speed Booster/math-speed-booster.html'),{url,referrer:'https://examfusionprep.com/music.html',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
  pages.push(dom);
  const w=dom.window,d=w.document;
  w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.matchMedia=q=>({matches:/display-mode/.test(q)&&surface!=='Browser',addEventListener(){},addListener(){}});
  Object.defineProperty(w.navigator,'userAgent',{value:surface.includes('Android')?'Android':'Windows'});
  if(surface==='Android TWA')Object.defineProperty(d,'referrer',{value:'android-app://com.examfusionprep.app'});
  w.HTMLElement.prototype.getClientRects=function(){
    for(let n=this;n&&n.nodeType===1;n=n.parentElement){if(n.hidden||w.getComputedStyle(n).display==='none')return [];}
    return [{width:100,height:100}];
  };
  const intervals=new Map();let id=1;
  w.setInterval=(fn,ms)=>{const token=id++;intervals.set(token,{fn,ms});return token;};
  w.clearInterval=token=>intervals.delete(token);
  w.localStorage.setItem('msb_sound','0');
  if(surface==='Resumed')w.sessionStorage.setItem('efp_app_resume_pending_v1',JSON.stringify({url}));
  if(search)w.sessionStorage.setItem('efp_search_return_v1:mathtrip',JSON.stringify({token:'mathtrip',source:'https://examfusionprep.com/?source=windows-pwa',inputs:[],filters:[]}));
  w.history.replaceState({efpQuizQuitGuard:true,efpHomeSearchGuard:true,phase:'top'},'',url);
  w.__navigate=destination=>{w.__navigation=new URL(destination,w.location).href;};
  const run=code=>vm.runInContext(code.replace(/(?:window\.)?location\.(assign|replace)\(/g,'window.__navigate('),dom.getInternalVMContext());
  if(earlySession)run(read('app-session.js'));
  run(read('Maths Speed Booster/math-speed-booster.js').replace(/\}\)\(\);\s*$/, 'window.__msb = {getSession:()=>session, showResult:showResult}; })();'));
  if(!earlySession)run(read('app-session.js'));
  run(read('home-nav.js'));run(read('back-parent-map.js'));run(read('back-nav.js'));
  // Scripts loaded from head never fetch resources in this test environment.
  d.dispatchEvent(new w.Event('DOMContentLoaded'));w.dispatchEvent(new w.Event('load'));
  function topic(){[...d.querySelectorAll('.p-card')].find(b=>b.querySelector('.nm').textContent==='Addition').click();}
  function stage(name){
    if(name==='menu')return;
    topic();if(name==='settings')return;
    d.querySelector('#setBtn').click();if(name==='ready')return;
    d.querySelector('#startBtn').click();if(name==='countdown')return;
    const cd=intervals.get(w.__msb.getSession().cdId);for(let n=0;n<3;n++)cd.fn();
    d.querySelector('#keypad [data-k="1"]').click();
    if(name==='question')return;
    d.querySelector('#keypad [data-k="submit"]').click();
    if(name==='result'){const s=w.__msb.getSession();w.clearTimeout(s.advanceId);w.__msb.showResult();}
  }
  async function back(control){
    if(control==='system'){w.history.back();await pause();}
    else d.querySelector(control==='global'?'#efp-app-back-button':'#backBtn').click();
  }
  return {dom,w,d,run,stage,back,errors};
}
(async()=>{
 let count=0;
 for(const surface of ['Browser','Android TWA','Android standalone','Windows','Resumed'])
 for(const control of ['global','system','local'])
 for(const name of ['settings','ready','countdown','question','feedback','result']){
   const e=page(surface,{earlySession:surface==='Android TWA'});e.stage(name);
   const saved=e.w.localStorage.getItem('msb_best_v2');
   assert(!e.w.EFP_QUIZ_PROGRESS_WARNING,'Booster must never install a quiz quit guard');
   await e.back(control);
   assert(!e.w.__navigation,surface+' '+control+' '+name+' must stay in Booster first');
   assert(e.d.getElementById('screen-home').classList.contains('active'));
   assert(!e.d.getElementById('settingsOverlay').classList.contains('active'));
   assert(!e.d.getElementById('resultOverlay').classList.contains('active'));
   assert.equal(e.w.__msb.getSession(),null,'Back cancels the active session/countdown');
   assert(!e.d.querySelector('#efp-quiz-exit-modal.show'));
   assert.equal(e.w.localStorage.getItem('msb_best_v2'),saved);
   assert.equal(e.w.history.state.efpQuizQuitGuard,undefined);
   assert.equal(e.w.history.state.efpHomeSearchGuard,undefined);
   assert.equal(e.w.history.state.phase,'top');
   await e.back(control==='local'?'global':control);
   assert.equal(new URL(e.w.__navigation).pathname,'/index.html');
   assert.equal(e.errors.length,0,e.errors.join('\n'));e.dom.window.close();count++;
 }
 console.log('PASS',count,'Booster button/system Back flows: settings/ready/countdown/question/feedback/result -> Booster menu -> Home, no quit prompt');
 for(const control of ['global','system']){
   const e=page('Browser',{search:true});e.stage('question');await e.back(control);
   assert(!e.w.__navigation,'internal Back must not skip the Booster menu for a search trip');
   await e.back(control);const url=new URL(e.w.__navigation);
   assert.equal(url.pathname,'/');assert.equal(url.searchParams.get('efSearchRestore'),'mathtrip');e.dom.window.close();
 }
 console.log('PASS saved search restored only after leaving the Booster menu');
 const e=page('Resumed'),depth=e.w.history.length;
 for(let i=0;i<10;i++){
   e.stage('question');await e.back('system');
   e.w.dispatchEvent(new e.w.Event('pageshow'));e.d.dispatchEvent(new e.w.Event('visibilitychange'));e.d.dispatchEvent(new e.w.Event('resume'));
   await pause();assert.equal(e.w.history.length,depth,'repeated practice/Back/resume must not stack history guards');
 }
 e.dom.window.close();console.log('PASS repeated practice, resume and Back keep a bounded history');
 // Other quiz pages retain their ordinary confirmation behavior.
 const other=new JSDOM('<head></head><body><div class="question-card"><div class="options"><button class="option-btn">Answer</button></div></div><button id="efp-app-back-button">Back</button></body>',{url:'https://examfusionprep.com/Books/test.html',runScripts:'outside-only',pretendToBeVisual:true});pages.push(other);
 const w=other.window;w.matchMedia=()=>({matches:false});w.HTMLElement.prototype.getClientRects=()=>[{width:100,height:100}];
 vm.runInContext(read('app-session.js'),other.getInternalVMContext());
 w.document.querySelector('.option-btn').click();assert(w.EFP_QUIZ_PROGRESS_WARNING.isArmed());
 w.EFP_QUIZ_PROGRESS_WARNING.confirmLeave(()=>{});assert(w.document.querySelector('#efp-quiz-exit-modal.show'));
 other.window.close();console.log('PASS other quizzes retain their quit warning');
})().finally(()=>pages.forEach(dom=>dom.window.close())).catch(e=>{console.error(e);process.exitCode=1;});
