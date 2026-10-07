// EFP_TEST_JSDOM=/path/to/jsdom node tools/test-navigation-guard.cjs
// Real shared scripts/DOM/History. Only full-document navigation is simulated.
const { JSDOM } = require(process.env.EFP_TEST_JSDOM || 'jsdom');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(file === 'back-nav.js' && process.env.EFP_TEST_BACK_NAV || path.join(root, file), 'utf8');
const pause = () => new Promise(resolve => setTimeout(resolve, 35));
const dump = storage => Object.fromEntries(Array.from({ length: storage.length }, (_, i) => {
  const key = storage.key(i); return [key, storage.getItem(key)];
}));
const pages = [];
function page(url, { local = {}, session = {}, surface = 'Browser', missingMap = false } = {}) {
  const dom = new JSDOM('<head></head><body><button id="efp-app-back-button">Back</button><a class="back-btn" href="/">Back</a><a id="efp-home-button" href="/">Home</a><input id="private-answer"><button id="option">Answer</button></body>', {
    url: new URL(url, 'https://examfusionprep.com').href,
    // Deliberately unrelated same-origin predecessor. Old code trusted it.
    referrer: 'https://examfusionprep.com/music.html', runScripts: 'outside-only', pretendToBeVisual: true
  });
  pages.push(dom);
  const w = dom.window;
  w.matchMedia = () => ({ matches: surface !== 'Browser' });
  w.scrollTo = () => {};
  Object.entries(local).forEach(([k, v]) => w.localStorage.setItem(k, v));
  Object.entries(session).forEach(([k, v]) => w.sessionStorage.setItem(k, v));
  if (surface === 'Resumed') w.sessionStorage.setItem('efp_app_resume_pending_v1', JSON.stringify({ url: w.location.href }));
  // Register legacy handlers FIRST to prove capture priority, not load order.
  w.document.addEventListener('click', event => {
    if (event.target.closest('#efp-app-back-button,.back-btn')) {
      event.stopImmediatePropagation(); w.__legacy = true; w.__navigation = '/';
    }
  }, true);
  w.addEventListener('popstate', () => { w.__legacy = true; w.__navigation = '/'; });
  w.__navigate = destination => { w.__navigation = new URL(destination, w.location).href; };
  const run = code => vm.runInContext(code.replace(/(?:window\.)?location\.(assign|replace)\(/g, 'window.__navigate('), dom.getInternalVMContext());
  if (!missingMap) run(read('back-parent-map.js'));
  run(read('back-nav.js'));
  return { w, dom, run };
}
(async () => {
  const catalog = page('/');
  const map = catalog.w.EFP_BACK_PARENT_MAP;
  let paths = Object.keys(map).filter(p => !p.startsWith('/Original Practice/') && !p.startsWith('/Crux-Tricks/'));
  // Check every declared parent graph for self references and cycles.
  for (const start of Object.keys(map)) {
    const seen = new Set(); let current = start;
    while (map[current]) {
      assert(!seen.has(current), 'parent cycle: ' + start); seen.add(current);
      current = map[current];
    }
    assert(['/index.html', '/'].includes(current), 'parent chain must reach Home: ' + start);
  }
  // Different depths and page families, including names with apostrophes,
  // spaces, Unicode, reading hubs and root pages. Sample distributed catalog.
  paths = paths.filter((p, i) => i % 47 === 0).concat([
    '/Bihar Special/Topic Names/Current Affairs for BPSC Pre 72.html',
    '/Books/BlackBook/Files/All one Word.html',
    '/Current Affairs/Topic Names/Rapid Practice.html',
    '/Current Affairs/Topic Names/Rapid Practice/2026/Topic Wise/Sports_2026_Current_Affairs_Rapid_Practice.html'
  ]);
  let count = 0;
  for (const surface of ['Browser', 'Android', 'Windows', 'Resumed']) {
    for (const url of paths) {
      for (const action of ['button', 'legacy-link', 'system']) {
        const { w, dom } = page(url, { surface });
        assert.equal(w.history.state && w.history.state.phase, 'top', url + ': system Back must have a same-document boundary');
        const expected = map[url];
        if (action === 'button') w.document.querySelector('#efp-app-back-button').click();
        else if (action === 'legacy-link') w.document.querySelector('.back-btn').click();
        else { w.history.back(); await pause(); }
        assert(w.__navigation, url + ': navigation must complete');
        assert.equal(decodeURIComponent(new URL(w.__navigation, w.location).pathname), expected);
        assert(!w.__legacy, 'legacy handler must not override parent');
        dom.window.close(); count++;
      }
    }
  }
  console.log('PASS', count, 'button/link/system Back cases across four surfaces;', Object.keys(map).length, 'parent chains');

  // Pending confirmation must stay on the page; explicit approval navigates.
  const quiz = page('/Books/BlackBook/Files/All one Word.html');
  let approved, releases = 0;
  quiz.w.EFP_QUIZ_PROGRESS_WARNING = {
    confirmLeave(action) { approved = action; },
    releaseBackGuard(action) { releases++; action(); }, isQuizVisible: () => false
  };
  quiz.w.document.querySelector('#efp-app-back-button').click();
  assert(!quiz.w.__navigation); approved(); assert.equal(releases, 1);
  assert.equal(decodeURIComponent(new URL(quiz.w.__navigation).pathname), map['/Books/BlackBook/Files/All one Word.html']);
  console.log('PASS Stay/approved Quit uses one hierarchy decision');

  // Preserve source search priority even for a stale native Back link to Home.
  const search = page('/Books/BlackBook/Files/All one Word.html?efSearchReturn=trip', { session: {
    'efp_search_return_v1:trip': JSON.stringify({ token: 'trip', source: 'https://examfusionprep.com/?source=windows-pwa', inputs: [], filters: [] })
  } });
  search.w.document.querySelector('.back-btn').click();
  assert.equal(new URL(search.w.__navigation).pathname, '/');
  assert.equal(new URL(search.w.__navigation).searchParams.get('efSearchRestore'), 'trip');
  assert(!search.w.__legacy);
  console.log('PASS native Back keeps exact search source and restore token');

  const log = page('/Bihar Special/Topic Names/Current Affairs for BPSC Pre 72.html');
  const input = log.w.document.querySelector('input'); input.value = 'SECRET INPUT';
  input.dispatchEvent(new log.w.Event('change', { bubbles: true }));
  for (let i = 0; i < 250; i++) log.w.document.querySelector('#option').click();
  const depth = log.w.history.length;
  for (let i = 0; i < 4; i++) {
    log.w.dispatchEvent(new log.w.Event('pageshow'));
    log.w.document.dispatchEvent(new log.w.Event('visibilitychange'));
    log.w.document.dispatchEvent(new log.w.Event('resume'));
  }
  assert.equal(log.w.history.length, depth, 'wake-up must not stack duplicate guards');
  log.w.document.dispatchEvent(new log.w.Event('freeze'));
  log.w.dispatchEvent(new log.w.Event('pagehide'));
  const local = dump(log.w.localStorage), session = dump(log.w.sessionStorage);
  const journal = Object.entries(local).find(([k]) => k.startsWith('efp_navigation_journal_v1:'));
  assert(journal); assert(JSON.parse(journal[1]).entries.length <= 160);
  assert(!journal[1].includes('SECRET INPUT'));
  const resumed = page(log.w.location.href, { local, session });
  assert(resumed.w.EFP_NAV_GUARD.diagnostics().some(e => e.type === 'freeze'));
  const otherTab = page('/Books/BlackBook/BlackBook.html', { local });
  assert.notEqual(otherTab.w.sessionStorage.getItem('efp_navigation_tab_v1'), session.efp_navigation_tab_v1);
  assert(!otherTab.w.EFP_NAV_GUARD.diagnostics().some(e => e.type === 'freeze'));
  console.log('PASS bounded journal, no input capture, lifecycle/reload persistence, separate tabs, no duplicate guards');

  const privateMode = page('/Books/BlackBook/Files/All one Word.html');
  privateMode.w.Storage.prototype.setItem = () => { throw Error('storage unavailable'); };
  privateMode.w.EFP_NAV_GUARD.flush();
  privateMode.w.document.querySelector('#efp-app-back-button').click();
  assert.equal(decodeURIComponent(new URL(privateMode.w.__navigation).pathname), '/Books/BlackBook/BlackBook.html');
  // Home and ordinary answer actions are never reclassified as Back.
  const home = page('/Books/BlackBook/BlackBook.html');
  home.w.document.querySelector('#efp-home-button').addEventListener('click', event => { event.preventDefault(); home.w.__home = true; });
  home.w.document.querySelector('#efp-home-button').click();
  home.w.document.querySelector('#option').click();
  assert(home.w.__home); assert(!home.w.__navigation);
  const unmapped = page('/unmapped-future-page.html');
  unmapped.w.document.querySelector('#efp-app-back-button').click();
  assert(!unmapped.w.__legacy && !unmapped.w.__navigation);
  assert(unmapped.w.EFP_NAV_GUARD.diagnostics().some(e => e.type === 'missing-parent'));
  console.log('PASS storage failure, explicit Home, ordinary actions, unmapped Back blocks blind Home fallback');
})().finally(() => pages.forEach(dom => dom.window.close())).catch(error => { console.error(error); process.exitCode = 1; });
