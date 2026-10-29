// EFP_TEST_JSDOM=/path/to/jsdom node tools/test-current-affairs-back.cjs
// Run the actual hub and shared scripts in page order, including the early
// progress.js listener. Only document navigation and layout are simulated.
const { JSDOM, VirtualConsole } = require(process.env.EFP_TEST_JSDOM || 'jsdom');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(file === 'back-nav.js' && process.env.EFP_TEST_BACK_NAV || path.join(root, file), 'utf8');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const pages = [];
const SESSION = 'efp_app_session_v1';
const surfaces = [
  ['Android TWA', { android: true, installed: true }],
  ['Android standalone', { android: true, standalone: true, installed: true }],
  ['Windows app', { standalone: true, installed: true }],
  ['Browser', {}]
];
const dump = storage => Object.fromEntries(Array.from({ length: storage.length }, (_, i) => {
  const key = storage.key(i); return [key, storage.getItem(key)];
}));
function page(file, url, surface, local = {}, session = {}, referrer = '', staleMap = false) {
  const vc = new VirtualConsole();
  vc.on('jsdomError', error => {
    if (!/navigation|scrollTo/.test(error.message)) throw error;
  });
  const dom = new JSDOM(read(file), {
    url: 'https://examfusionprep.com' + url, referrer: referrer || undefined,
    runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc
  });
  pages.push(dom);
  const w = dom.window;
  // Disconnect queued observers before jsdom destroys document at teardown.
  const observers = [], Observer = w.MutationObserver, close = w.close.bind(w);
  w.MutationObserver = function (...args) {
    const observer = new Observer(...args); observers.push(observer); return observer;
  };
  w.close = () => { observers.forEach(observer => observer.disconnect()); close(); };
  w.matchMedia = () => ({ matches: !!surface.standalone, addEventListener() {} });
  Object.defineProperty(w.navigator, 'userAgent', { value: surface.android ? 'Android' : 'Windows' });
  w.HTMLElement.prototype.getClientRects = function () {
    return this.hidden || this.closest('[hidden]') ? [] : [{ width: 100, height: 100 }];
  };
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.scrollTo = () => {}; w.confirm = () => true; w.alert = () => {};
  w.fetch = async () => ({ ok: false });
  Object.entries(local).forEach(([key, value]) => w.localStorage.setItem(key, value));
  Object.entries(session).forEach(([key, value]) => w.sessionStorage.setItem(key, value));
  if (surface.installed) w.sessionStorage.setItem('efp_installed_app_context_v1', '1');
  const run = code => vm.runInContext(code
    .replace(/(?:window\.)?location\.(assign|replace)\(/g, 'window.__navigate(')
    .replace(/window\.location\.href\s*=\s*([^;]+);/g, 'window.__navigate($1);'), dom.getInternalVMContext());
  w.__navigate = destination => { w.__navigation = new URL(destination, w.location).href; };
  // Simulate the service worker's injected deferred session script so home-nav
  // does not add a second copy while the hub's own scripts are executing.
  const marker = w.document.createElement('script'); marker.id = 'efp-app-session-script';
  w.document.head.appendChild(marker);
  if (file === 'index.html') {
    // Auto-resume happens in this real script before Home's other features.
    run(read('app-session.js'));
    return { w, run, local: () => dump(w.localStorage), session: () => dump(w.sessionStorage) };
  }
  for (const script of [...w.document.scripts]) {
    if (!script.src && !/json/.test(script.type)) run(script.textContent);
    else if (script.src && !script.defer && new URL(script.src).origin === w.location.origin) {
      run(read(decodeURIComponent(new URL(script.src).pathname).slice(1)));
    }
  }
  run(read('app-session.js'));
  for (const script of [...w.document.scripts]) {
    if (script.src && script.defer && new URL(script.src).origin === w.location.origin) {
      const file = decodeURIComponent(new URL(script.src).pathname).slice(1);
      // Question counts are unrelated to navigation and load a large catalog.
      if (!file.includes('book-question-counts')) run(read(file));
      if (file === 'back-parent-map.js' && staleMap) run('window.EFP_BACK_PARENT_MAP = Object.freeze({})');
    }
  }
  // outside-only executes scripts through run(), but does not compile HTML
  // onclick attributes. Compile them so answers really save, not just arm Quit.
  function bindInlineAnswers() {
    for (const node of w.document.querySelectorAll('[onclick]')) {
      if (!node.onclick) node.onclick = new w.Function('event', node.getAttribute('onclick'));
    }
  }
  bindInlineAnswers();
  const inlineObserver = new w.MutationObserver(bindInlineAnswers);
  inlineObserver.observe(w.document, { childList: true, subtree: true });
  return { w, run, local: () => dump(w.localStorage), session: () => dump(w.sessionStorage) };
}
async function settle() { await pause(40); }
async function until(test) {
  for (let i = 0; i < 50 && !test(); i++) await pause(20);
  assert(test(), 'navigation/confirmation must complete');
}

const quizFile='Current Affairs/Topic Names/Rapid Practice/2026/Topic Wise/Name_Changes_2026_Current_Affairs_Rapid_Practice.html';
const quizParent='/Current Affairs/Topic Names/Rapid Practice.html';
function target(file,surface,staleMap,local={}) {
  return page(file,'/'+file.split('/').map(encodeURIComponent).join('/'),surface,local,{},'https://examfusionprep.com/',staleMap);
}
function back(p,action) { if(action==='button')p.w.document.getElementById('efp-app-back-button').click();else p.w.history.back(); }
function expectParent(p,parent) { assert.equal(decodeURIComponent(new URL(p.w.__navigation).pathname),parent); }
(async()=>{
  let cases=0;
  for(const [name,surface] of surfaces)for(const staleMap of [false,true])for(const action of ['button','system'])for(const dirty of [false,true]){
    const p=target(quizFile,surface,staleMap);await settle();
    assert.equal(p.w.document.querySelectorAll('.qcard').length,22,'real quiz renders');
    if(dirty){p.w.document.querySelector('.opt').click();await settle();assert(p.w.EFP_QUIZ_PROGRESS_WARNING.isArmed());}
    back(p,action);
    if(dirty){
      await until(()=>p.w.document.querySelector('#efp-quiz-exit-modal.show'));
      assert(!p.w.__navigation,'do not navigate before confirmation');
      p.w.document.querySelector('.efp-qw-stay').click();assert(!p.w.__navigation);
      back(p,action);await until(()=>p.w.document.querySelector('#efp-quiz-exit-modal.show'));
      p.w.document.querySelector('.efp-qw-leave').click();
    }
    await until(()=>p.w.__navigation);expectParent(p,quizParent);
    if(dirty)assert(Object.keys(JSON.parse(p.w.localStorage.getItem('efp_ca_topic_name_changes_2026_rapid_v1')).answers).length===1,'Back preserves answers');
    p.w.close();cases++;console.log('PASS',name,staleMap?'stale map':'current map',action,dirty?'Stay/Quit':'unanswered Back');
  }
  for(const [name,surface]of surfaces)for(const staleMap of [false,true]){
    const first=target(quizFile,surface,staleMap);await settle();first.w.document.querySelector('.opt').click();await settle();
    const saved=first.local();first.w.close();
    const resumed=target(quizFile,surface,staleMap,saved);await settle();
    assert(resumed.w.document.querySelector('.opt:disabled'),'saved answer restores');
    assert(!resumed.w.EFP_QUIZ_PROGRESS_WARNING.isArmed(),'restored attempt does not arm Quit');
    back(resumed,'button');await until(()=>resumed.w.__navigation);expectParent(resumed,quizParent);resumed.w.close();cases++;
  }
  for(const file of ['Current Affairs/Topic Names/2026/Topic Wise/RENAME2026.html','Current Affairs/Topic Names/2026/Topic Wise/BRICS2026.html','Current Affairs/Topic Names/Rapid Practice.html']){
    for(const staleMap of [false,true]){
      const p=target(file,{},staleMap);await settle();back(p,'button');await until(()=>p.w.__navigation);
      expectParent(p,'/Current Affairs/Topic Names.html');p.w.close();cases++;
    }
  }
  console.log('PASS',cases,'real-page CA navigation cases, answer persistence and saved-progress resume');
})().finally(()=>pages.forEach(dom=>dom.window.close())).catch(error=>{console.error(error);process.exitCode=1});
