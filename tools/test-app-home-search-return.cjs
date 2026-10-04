// Run with node tools/test-app-home-search-return.cjs. No dependencies needed.
// Execute the actual session/search scripts across separate page contexts;
// DOM/layout and navigation are simulated, installed-app launch signals are real inputs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(process.env.EFP_TEST_APP_SESSION || path.join(root, 'app-session.js'), 'utf8');
const back = fs.readFileSync(process.env.EFP_TEST_BACK_NAV || path.join(root, 'back-nav.js'), 'utf8')
  .split('/* ExamFusion Prep — logical Back fallback')[0];
const SESSION = 'efp_app_session_v1', PENDING = 'efp_app_resume_pending_v1';
function storage(values = {}) {
  const s = { ...values };
  Object.defineProperties(s, {
    getItem: { value: k => s[k] ?? null },
    setItem: { value: (k, v) => { s[k] = String(v); } },
    removeItem: { value: k => { delete s[k]; } }
  });
  return s;
}
function target() {
  const listeners = {};
  return {
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    removeEventListener(type, fn) { listeners[type] = (listeners[type] || []).filter(x => x !== fn); },
    dispatchEvent(e) {
      for (const fn of [...(listeners[e.type] || [])]) { fn(e); if (e.stopped) break; }
      return !e.defaultPrevented;
    }
  };
}
function event(type, properties = {}) {
  return Object.assign({ type, button: 0,
    preventDefault() { this.defaultPrevented = true; },
    stopPropagation() {}, stopImmediatePropagation() { this.stopped = true; }
  }, properties);
}
function node(id, tagName = 'DIV') {
  const attrs = {}, n = Object.assign(target(), {
    id, tagName, value: '', hidden: false, scrollTop: 0, innerHTML: '', children: [],
    classList: { add() {}, remove() {}, contains() { return false; } },
    getAttribute: k => attrs[k] ?? null, setAttribute: (k,v) => { attrs[k] = v; },
    removeAttribute: k => { delete attrs[k]; }, hasAttribute: k => k in attrs,
    querySelector: () => null, querySelectorAll: () => [],
    getBoundingClientRect: () => ({ top: 120 }),
    closest(selector) {
      if (tagName === 'A' && selector === 'a[href]') return n;
      if (id === 'efp-app-back-button' && selector.includes('#efp-app-back-button')) return n;
      return null;
    }
  });
  return n;
}
function page(url, surface, session = storage(), local = storage()) {
  const w = target(), timers = [], input = node('searchBox', 'INPUT');
  const results = node('results'), button = node('efp-app-back-button', 'BUTTON');
  const body = node('', 'BODY'), head = node('', 'HEAD'); head.appendChild = () => {};
  const elements = { searchBox: input, results, 'efp-app-back-button': button };
  const document = Object.assign(target(), {
    readyState: 'complete', visibilityState: 'visible', referrer: surface.referrer || '',
    body, head, documentElement: node('', 'HTML'),
    getElementById: id => elements[id] || null, createElement: tag => node('', tag.toUpperCase()),
    querySelector: () => null,
    querySelectorAll(selector) {
      if (selector.includes('input[type="search"]')) return [input];
      if (selector.includes('#results')) return [results];
      if (selector.startsWith('[id],')) return [input, results];
      return [];
    }
  });
  const location = new URL(url, 'https://examfusionprep.com');
  location.assign = u => { w.navigation = new URL(u, location).href; w.navigationKind = 'assign'; };
  location.replace = u => { w.navigation = new URL(u, location).href; w.navigationKind = 'replace'; };
  const history = { state: null, scrollRestoration: 'auto',
    replaceState(s, title, u) { this.state = s; if (u) location.href = new URL(u, location).href; },
    pushState(s, title, u) { this.replaceState(s, title, u); }, back() {}
  };
  Object.assign(w, { window: w, document, location, history,
    sessionStorage: session, localStorage: local, URL, URLSearchParams, console,
    navigator: { userAgent: surface.ua || 'Windows', standalone: false },
    performance: { getEntriesByType: () => [{ type: 'navigate' }] },
    matchMedia: () => ({ matches: !!surface.standalone }), scrollY: 0, scrollTo() {},
    setTimeout: fn => { timers.push(fn); return timers.length; }, clearTimeout() {},
    requestAnimationFrame: fn => { timers.push(fn); },
    CustomEvent: function(type, props) { return event(type, props); },
    PopStateEvent: function(type, props) { return event(type, props); },
    Event: function(type) { return event(type); }
  });
  const ctx = vm.createContext(w);
  const run = code => vm.runInContext(code, ctx);
  const flush = () => { for (let i = 0; timers.length && i < 50; i++) timers.shift()(); };
  const click = n => { const e = event('click', { target: n }); w.dispatchEvent(e); if (!e.stopped) document.dispatchEvent(e); };
  return { w, input, results, button, session, local, run, flush, click };
}
function trip(homeUrl, surface) {
  const source = page(homeUrl, surface); source.run(app); source.run(back); source.flush();
  source.input.value = 'ancient history'; source.results.innerHTML = '<a>Ancient match</a>';
  const link = node('', 'A'); link.href = 'https://examfusionprep.com/Crux-Tricks/viewer.html?id=sample';
  source.click(link);
  assert(new URL(link.href).searchParams.get('efSearchReturn'));
  return { source, url: link.href };
}
const surfaces = [
  ['Windows app', '/?source=windows-pwa', { standalone: true }],
  ['Android TWA', '/?source=windows-pwa', { ua: 'Android', referrer: 'android-app://com.examfusionprep.app/' }],
  ['Android standalone', '/index.html', { ua: 'Android', standalone: true }],
  ['Browser', '/', {}]
];
for (const [name, home, surface] of surfaces) {
  for (const action of ['button', 'system']) {
    const t = trip(home, surface), p = page(t.url, surface, t.source.session, t.source.local);
    p.run(app); p.run(back); p.flush();
    assert.equal(JSON.parse(p.local.getItem(SESSION)).url, new URL(t.url).pathname + new URL(t.url).search);
    if (action === 'button') p.click(p.button);
    else p.w.dispatchEvent(event('popstate', { state: { efpSearchReturnGuard: 'base' } }));
    assert.equal(new URL(p.w.navigation).pathname, new URL(home, p.w.location).pathname);
    p.w.dispatchEvent(event('pagehide')); p.w.dispatchEvent(event('beforeunload'));
    assert.equal(JSON.parse(p.local.getItem(SESSION)).url, '/', 'unload must not save the leaf after Home return');
    const returned = page(p.w.navigation, surface, p.session, p.local);
    let searches = 0; returned.input.addEventListener('input', () => searches++);
    returned.run(app); returned.run(back); returned.flush();
    assert(!returned.w.navigation, 'Home must not auto-resume the content page');
    assert(returned.w.EFP_APP_SESSION);
    assert.equal(returned.input.value, 'ancient history');
    assert.equal(returned.results.innerHTML, '<a>Ancient match</a>');
    assert.equal(searches, 0); assert(!returned.w.location.search.includes('efSearchRestore'));
  }
  console.log('PASS', name, 'visible/system Back: Home, query/results restored, no resume loop');
}
// A cached old leaf may still omit markHome. The early Home guard must work
// before back-nav has loaded, even with stale session/pending resume records.
for (const [name, home, surface] of surfaces.slice(0, 3)) {
  const stale = JSON.stringify({ url: '/Crux-Tricks/viewer.html?id=sample', ts: Date.now(), scrollY: 900 });
  const local = storage({ [SESSION]: stale }), session = storage({ [PENDING]: stale });
  const url = new URL(home, 'https://examfusionprep.com'); url.searchParams.set('efSearchRestore', 'old-trip');
  const returned = page(url.href, surface, session, local); returned.run(app); returned.flush();
  assert(!returned.w.navigation); assert.equal(JSON.parse(local.getItem(SESSION)).url, '/');
  assert.equal(session.getItem(PENDING), null);
  console.log('PASS', name, 'cached old leaf return clears stale resume before shared Back loads');
  const launchLocal = storage({ [SESSION]: stale });
  const launch = page(home, surface, storage(), launchLocal); launch.run(app);
  assert.equal(new URL(launch.w.navigation).pathname, '/Crux-Tricks/viewer.html');
  assert.equal(launch.w.navigationKind, 'assign');
  console.log('PASS', name, 'ordinary app launch still resumes');
}
// Internal search must keep its existing destination and session behavior.
// A process kill loses all sessionStorage. Only local app resume data survives.
for (const [name, home, surface] of surfaces.slice(0, 3)) {
  for (const ageDays of [0, 2, 30, 730]) {
  for (const dismissed of [false, true]) {
    const t = trip(home, surface), leaf = page(t.url, surface, t.source.session, t.source.local);
    const homeRows = {query:'ancient history',html:'<li data-deepresult="1"><a href="/practice.html">Ancient match</a></li>',filter:'practice',pages:2,scrollTop:65};
    leaf.session.setItem('efp_home_search_results_v1',JSON.stringify(homeRows));
    const token = new URL(t.url).searchParams.get('efSearchReturn');
    const view = { kind:'html', token, selection:'q3', revealed:dismissed?[]:['q3'], dismissed };
    leaf.run(app); leaf.run(back); leaf.flush();
    leaf.w.EFP_SEARCH_CONTEXT = { snapshot: () => view };
    leaf.w.scrollY = 735; leaf.w.dispatchEvent(event('pagehide'));
    const saved = JSON.parse(leaf.local.getItem(SESSION));
    assert.equal(saved.searchState.trip.token, token);assert.deepEqual(saved.searchState.view, view);
    assert.deepEqual(saved.searchState.homeResults,homeRows);
    saved.ts = Date.now() - ageDays * 24 * 60 * 60 * 1000;
    leaf.local.setItem(SESSION, JSON.stringify(saved));
    const fresh = storage(), launch = page(home, surface, fresh, leaf.local);launch.run(app);
    assert.equal(launch.w.navigation, leaf.w.location.href, name + ': ' + ageDays + '-day-old session must resume');
    assert(fresh.getItem('efp_search_return_v1:'+token), 'Cold launch must rehydrate the original search snapshot');
    assert.deepEqual(JSON.parse(fresh.getItem('efp_home_search_results_v1')),homeRows,'Homepage cards/filter/limit must survive empty sessionStorage');
    const resumed = page(launch.w.navigation, surface, fresh, leaf.local);resumed.run(app);resumed.run(back);resumed.flush();
    assert.deepEqual(JSON.parse(JSON.stringify(resumed.w.EFP_APP_SESSION.getSearchState('html'))), view);
    resumed.click(resumed.button);
    const returned = page(resumed.w.navigation, surface, fresh, leaf.local);returned.run(app);returned.run(back);returned.flush();
    assert.equal(returned.input.value,'ancient history');assert.equal(returned.results.innerHTML,'<a>Ancient match</a>');assert(!returned.w.navigation);
  }
  }
  console.log('PASS',name,'cold process relaunch at 0/2/30/730 days: search trip/view/dismissal restored and Back returns original results');
}
// Removing expiry must preserve the existing destination/record guards.
for (const [name, home, surface] of surfaces.slice(0, 3)) {
  for (const saved of [
    {url:'https://example.com/quiz.html',ts:Date.now()-730*86400000},
    {url:'/',ts:Date.now()-730*86400000},
    {url:'/quiz.html',ts:'broken timestamp'}
  ]) {
    const launch=page(home,surface,storage(),storage({[SESSION]:JSON.stringify(saved)}));
    launch.run(app);assert(!launch.w.navigation,name+': invalid/Home destination must not resume');
  }
}
console.log('PASS no-expiry resume still rejects external URLs, Home destinations and malformed records');
const browserTrip=trip('/',{}),browserLeaf=page(browserTrip.url,{},browserTrip.source.session,browserTrip.source.local);
browserLeaf.w.EFP_SEARCH_CONTEXT={snapshot:()=>({kind:'html',dismissed:false})};browserLeaf.run(app);browserLeaf.flush();
assert.equal(JSON.parse(browserLeaf.local.getItem(SESSION)).searchState,null,'Ordinary browsers must not persist app search context');
const browserLaunch=page('/',{},storage(),browserLeaf.local);browserLaunch.run(app);assert(!browserLaunch.w.navigation);
console.log('PASS ordinary browser: no durable app search state or cold-launch resume');
const internal = trip('/Mind%20Maps/SubjectName.html', {});
const child = page(internal.url, {}, internal.source.session, internal.source.local);
child.run(app); child.run(back); child.flush(); child.click(child.button);
child.w.dispatchEvent(event('pagehide'));
assert.equal(new URL(child.w.navigation).pathname, '/Mind%20Maps/SubjectName.html');
assert.equal(new URL(JSON.parse(child.local.getItem(SESSION)).url, child.w.location).pathname, '/Crux-Tricks/viewer.html');
console.log('PASS internal search return destination/session unchanged');
