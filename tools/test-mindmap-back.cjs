// EFP_TEST_JSDOM=/path/to/jsdom node tools/test-mindmap-back.cjs
// Run the shared scripts with real DOM events and History; intercept only
// document navigation, which jsdom does not implement.
const { JSDOM } = require(process.env.EFP_TEST_JSDOM || 'jsdom');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pause = () => new Promise(resolve => setTimeout(resolve, 35));
const hub = '/Mind Maps/SubjectName.html';
const chapters = [
  'History/Modern History/ChapterNames/european_companies_mindmap.html',
  'History/Medieval History/ChapterNames/15_delhi_sultanate_mindmap.html',
  'History/Ancient History/ChapterNames/04_vedic_age_mindmap.html',
  'Science/Physics/ChapterNames/01_physical_quantities_units_mindmap.html',
  'Polity/ChapterNames/01_constitutional_development_of_india_mindmap.html',
  'Computer/01_history_generation_of_computer_mindmap.html',
  'Vedic Maths/viral-maths-ch01-important-products.html',
  'History/Modern History/ChapterName.html'
].map(file => '/Mind Maps/' + file);

function page(url, surface, referrer, searchSource, noMap = false) {
  const dom = new JSDOM('<head></head><body><button id="efp-app-back-button"></button></body>', {
    url: new URL(url, 'https://examfusionprep.com').href,
    referrer: referrer || undefined, runScripts: 'outside-only'
  });
  const w = dom.window;
  w.matchMedia = () => ({ matches: surface !== 'Browser' });
  Object.defineProperty(w.navigator, 'userAgent', { value: surface === 'Android' ? 'Android; wv)' : 'Windows' });
  w.EFP_APP_SESSION = { markHome() { w.__markedHome = true; } };
  if (surface === 'Resumed') w.sessionStorage.setItem('efp_app_resume_pending_v1', JSON.stringify({ url: w.location.href }));
  if (searchSource) w.sessionStorage.setItem('efp_search_return_v1:test', JSON.stringify({
    token: 'test', source: new URL(searchSource, w.location.origin).href, inputs: [], filters: []
  }));
  w.__navigate = destination => { w.__destination = new URL(destination, w.location).href; };
  const run = code => vm.runInContext(code.replace(/(?:window\.)?location\.(assign|replace)\(/g, 'window.__navigate('), dom.getInternalVMContext());
  if (!noMap) run(read('back-parent-map.js'));
  // Simulate the outdated map still found in existing app caches.
  if (!noMap) w.EFP_BACK_PARENT_MAP = { ...w.EFP_BACK_PARENT_MAP, [decodeURIComponent(w.location.pathname)]: '/Mind Maps/History/Modern History/ChapterName.html' };
  run(read('back-nav.js'));
  return { dom, w, run };
}

(async () => {
  let cases = 0;
  for (const surface of ['Browser', 'Android', 'Windows', 'Resumed']) {
    for (const chapter of chapters) {
      for (const action of ['button', 'hardware']) {
        const { dom, w } = page(chapter, surface, 'https://examfusionprep.com/Mind%20Maps/History/Modern%20History/ChapterName.html');
        assert.equal(w.history.state.phase, 'top');
        if (action === 'button') w.document.getElementById('efp-app-back-button').click();
        else { w.history.back(); await pause(); }
        assert.equal(decodeURIComponent(new URL(w.__destination).pathname), hub, `${surface}: ${action}: ${chapter}`);
        assert.equal(new URL(w.__destination).searchParams.get('efMindMapReturn'), '1');
        dom.window.close(); cases++;
      }
    }
  }
  for (const action of ['button', 'hardware']) {
    for (const source of ['/index.html?source=windows-pwa', '/Mind%20Maps/SubjectName.html']) {
      const { dom, w } = page(chapters[0] + '?efSearchReturn=test', 'Android', undefined, source);
      w.dispatchEvent(new w.Event('pageshow')); await pause();
      if (action === 'button') w.document.getElementById('efp-app-back-button').click();
      else { w.history.back(); await pause(); }
      const returned = new URL(w.__destination);
      assert.equal(returned.pathname, new URL(source, w.location.origin).pathname);
      assert.equal(returned.searchParams.get('efSearchRestore'), 'test');
      if (source.startsWith('/index.html')) assert.equal(w.__markedHome, true);
      dom.window.close(); cases++;
    }
  }
  const direct = page(chapters[1], 'Browser', undefined, undefined, true);
  direct.w.document.getElementById('efp-app-back-button').click();
  assert.equal(decodeURIComponent(new URL(direct.w.__destination).pathname), hub);
  direct.dom.window.close(); cases++;

  const context = { window: {} }; vm.runInNewContext(read('back-parent-map.js'), context);
  for (const [child, parent] of Object.entries(context.window.EFP_BACK_PARENT_MAP)) {
    if (child.startsWith('/Mind Maps/') && child !== hub) assert.equal(parent, hub, child);
  }
  assert.equal(context.window.EFP_BACK_PARENT_MAP[hub], '/index.html');

  // A replacement return is a new navigation, so explicitly restore the
  // dashboard's saved accordion and remove only the one-time return marker.
  const dashboard = new JSDOM('<body><div class="card" data-acc-id="card-0"></div><div class="nested" data-acc-id="nested-0"></div></body>', {
    url: 'https://examfusionprep.com/Mind%20Maps/SubjectName.html?efMindMapReturn=1&keep=yes', runScripts: 'outside-only'
  });
  dashboard.window.sessionStorage.setItem('mmAccordionState', JSON.stringify({ 'card-0': true, 'nested-0': true }));
  dashboard.window.isBackForwardNavigationMM = () => false;
  const source = read('Mind Maps/SubjectName.html');
  const accordion = source.slice(source.indexOf('    function restoreAccordionState()'), source.indexOf('    document.querySelectorAll(".card-header")'));
  vm.runInContext(accordion, dashboard.getInternalVMContext());
  assert.equal(dashboard.window.document.querySelectorAll('.active').length, 2);
  assert.equal(dashboard.window.location.search, '?keep=yes');
  dashboard.window.close(); cases++;
  console.log(`PASS: ${cases} navigation/search/accordion cases; all Mind Map parent mappings checked.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
