// Real session/navigation scripts, plus the worker's Cache/Fetch boundary.
// No live site or analytics requests are made.
const {JSDOM, VirtualConsole} = require(process.env.EFP_TEST_JSDOM || 'jsdom');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const pause = ms => new Promise(r => setTimeout(r, ms));
const pages = [];
function page({overlay = false} = {}) {
  const dom = new JSDOM('<head></head><body><a id="efp-home-button" href="/">Home</a><button id="efp-app-back-button">Back</button><button id="menu" class="option-btn">Open chapter</button><article class="question-card"><button id="answer" class="option-btn">Answer</button><button id="answered" class="option-btn answered">Old answer</button></article></body>', {
    url: 'https://examfusionprep.com/Original%20Practice/History_Complete_Practice.html',
    runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: new VirtualConsole()
  });
  pages.push(dom);
  const w = dom.window;
  w.matchMedia = q => ({matches: q === '(display-mode: ' + (overlay ? 'window-controls-overlay' : 'standalone') + ')'});
  w.scrollTo = () => {};
  w.HTMLElement.prototype.getClientRects = function () {
    for (let n = this; n && n.nodeType === 1; n = n.parentElement) {
      if (n.hidden || w.getComputedStyle(n).display === 'none') return [];
    }
    return [{}];
  };
  w.__navigate = url => { w.__navigation = new URL(url, w.location).href; };
  const run = s => vm.runInContext(s.replace(/(?:window\.)?location\.(assign|replace)\(/g, 'window.__navigate('), dom.getInternalVMContext());
  run(read('app-session.js'));
  return {w, run};
}
async function sessionChecks() {
  // Menus can contain old/global option styling while a hidden/saved quiz
  // remains in the document. Only a visible question's answer may arm Quit.
  const menu = page();
  menu.w.document.querySelector('#menu').click();
  assert.equal(menu.w.EFP_QUIZ_PROGRESS_WARNING.isArmed(), false, 'menu styling must not count as an answer');
  const hidden = page();
  hidden.w.document.querySelector('.question-card').hidden = true;
  hidden.w.document.querySelector('#answer').click();
  assert.equal(hidden.w.EFP_QUIZ_PROGRESS_WARNING.isArmed(), false, 'hidden/restored questions must not arm Quit');
  const old = page(); old.w.document.querySelector('#answered').click();
  assert.equal(old.w.EFP_QUIZ_PROGRESS_WARNING.isArmed(), false, 'saved answered buttons must not arm Quit');
  for (const attempted of [false, true]) {
    const {w} = page();
    w.sessionStorage.setItem('efp_app_resume_pending_v1', 'stale');
    // Deliberately competing cached renderer: Home must be owned before it.
    w.document.addEventListener('click', e => { if (e.target.closest('#efp-home-button')) e.stopImmediatePropagation(); }, true);
    if (attempted) w.document.querySelector('#answer').click();
    w.document.querySelector('#efp-home-button').click();
    if (attempted) {
      assert(!w.__navigation);
      assert(w.document.querySelector('#efp-quiz-exit-modal.show'));
      w.document.querySelector('.efp-qw-stay').click();
      assert(!w.__navigation);
      w.document.querySelector('#efp-home-button').click();
      w.document.querySelector('.efp-qw-leave').click();
    }
    await pause(30);
    assert.equal(w.__navigation, 'https://examfusionprep.com/', 'Home must complete without waiting for a history pop');
    w.dispatchEvent(new w.Event('pagehide'));
    assert.equal(JSON.parse(w.localStorage.getItem('efp_app_session_v1')).url, '/');
    assert.equal(w.sessionStorage.getItem('efp_app_resume_pending_v1'), null);
  }
  // Window-controls-overlay is the manifest's first Windows display mode.
  const overlay = page({overlay: true});
  overlay.run('window.__installedSnapshot = EFP_APP_SESSION.getSearchState("fixture")');
  overlay.w.EFP_APP_SESSION.save();
  assert(JSON.parse(overlay.w.localStorage.getItem('efp_app_session_v1')).searchState,
    'Windows overlay mode must retain installed-app context');
  console.log('PASS menu/hidden/saved answers, Home + Stay/Quit, stale resume and Windows overlay');
}
async function workerChecks() {
  const origin = 'https://examfusionprep.com';
  const entries = new Map(), handlers = {}, timers = new Map(); let serial = 0;
  const key = r => new URL(typeof r === 'string' ? r : r.url, origin).href;
  const cache = {
    async match(r, options = {}) {
      const k = key(r), exact = entries.get(k);
      if (exact) return exact.clone();
      if (options.ignoreSearch) for (const [url, value] of entries) {
        if (url.split('?')[0] === k.split('?')[0]) return value.clone();
      }
    },
    async put(r, response) { entries.set(key(r), response.clone()); }
  };
  const ctx = vm.createContext({URL, Request, Response, Headers, console,
    caches: {open: async () => cache, match: cache.match.bind(cache)},
    self: {location: {origin}, addEventListener: (type, fn) => {handlers[type] = fn;}},
    fetch: (...args) => ctx.__fetch(...args),
    setTimeout(fn) { const id = ++serial; timers.set(id, fn); return id; },
    clearTimeout(id) {timers.delete(id);}
  });
  vm.runInContext(read('service-worker.js'), ctx);
  async function request(url, fetcher, {slow = false, navigation = false, reload = false} = {}) {
    ctx.__fetch = fetcher;
    const pending = [], event = {request: new Request(origin + url, reload ? {cache: 'reload'} : {}), waitUntil(p) {pending.push(p);}, respondWith(p) {this.response = p;}};
    if (navigation) Object.defineProperty(event.request, 'mode', {value: 'navigate'});
    handlers.fetch(event);
    for (let i = 0; i < 30; i++) await Promise.resolve();
    if (slow) {
      assert(timers.size, 'cached requests need a bounded network wait');
      for (const [id, fn] of timers) {timers.delete(id); fn();}
    }
    return {response: await event.response, pending};
  }
  entries.set(origin + '/home-nav.js?v=20261027apprecovery1', new Response('CURRENT'));
  entries.set(origin + '/home-nav.js?v=old', new Response('OLD'));
  let finish, fetched;
  const warm = await request('/home-nav.js?v=old', () => {throw Error('A warm core asset must not need a network request');});
  assert.equal(await warm.response.text(), 'CURRENT');
  assert.equal(timers.size, 0, 'normal warm loading must not wait for a fallback timer');
  const slow = await request('/home-nav.js?v=old', r => {fetched = r.url; return new Promise(resolve => {finish = resolve;});}, {slow: true, reload: true});
  assert.equal(await slow.response.text(), 'CURRENT', 'old URLs must use current revision fallback');
  assert.equal(fetched, origin + '/home-nav.js?v=20261027apprecovery1');
  finish(new Response('FRESH')); await Promise.all(slow.pending);
  assert.equal(await (await cache.match(fetched)).text(), 'FRESH', 'late revalidation must finish');
  const error = await request('/home-nav.js?v=old', async () => new Response('upstream error', {status: 503}), {reload: true});
  assert.equal(await error.response.text(), 'FRESH', 'transient 503 must retain working navigation');
  const missing = await request('/home-nav.js?v=old', async () => new Response('Removed', {status: 404}), {reload: true});
  assert.equal(missing.response.status, 404, 'a deliberate removal must not be hidden by old content');
  const searchAsset = vm.runInContext('APP_SHELL.find(asset => asset.startsWith("/search-logic.js?"))', ctx);
  entries.set(origin + searchAsset, new Response('SEARCH\n/* efp-desktop-section-search-compat-v1 */\nOLD WRAPPER'));
  const search = await request('/search-logic.js?v=old', () => new Promise(() => {}));
  assert.equal(await search.response.text(), 'SEARCH', 'slow search bootstrap must use clean cached logic');
  entries.set(origin + '/support.html', new Response('<head></head><body>Saved page</body>', {headers: {'content-type': 'text/html'}}));
  const nav = await request('/support.html', () => new Promise(resolve => {finish = resolve;}), {navigation: true});
  assert.equal(timers.size, 0, 'cached pages must open without a network fallback timer');
  assert((await nav.response.text()).includes('Saved page'), 'cached pages must open when network stalls');
  finish(new Response('<head></head><body>Fresh page</body>', {headers: {'content-type': 'text/html'}}));
  await Promise.all(nav.pending);
  assert((await (await cache.match('/support.html')).text()).includes('Fresh page'), 'late page refresh must not be overwritten by the fallback');
  // Rapid Fire fetches this HTML as data, so it must also revalidate before
  // an earlier cached question bank can win. Offline still uses the fresh copy.
  const englishPath = '/Original%20Practice/English_Grammar_Complete_Practice.html?v=20261027englishhighlights1';
  entries.set(origin + englishPath, new Response('OLD ENGLISH'));
  let englishOptions;
  const english = await request(englishPath, async (r, options) => {
    englishOptions = options;
    return new Response('<head></head><body>NEW ENGLISH</body>', {headers: {'content-type': 'text/html'}});
  });
  assert.equal(englishOptions.cache, 'no-cache');
  assert((await english.response.text()).includes('NEW ENGLISH'));
  await Promise.all(english.pending);
  const offlineEnglish = await request(englishPath, async () => {throw Error('offline');});
  assert((await offlineEnglish.response.text()).includes('NEW ENGLISH'));
  console.log('PASS worker slow network, current revision, late refresh, 503 fallback and cached page navigation');
}
(async () => {await sessionChecks(); await workerChecks();})()
  .finally(() => pages.forEach(p => p.window.close()))
  .catch(e => {console.error(e); process.exitCode = 1;});
