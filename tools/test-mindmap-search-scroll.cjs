// EFP_TEST_JSDOM=/path/to/jsdom node tools/test-mindmap-search-scroll.cjs
// Native wheel/touch scrolling must also be verified in Chromium.
const {JSDOM, VirtualConsole} = require(process.env.EFP_TEST_JSDOM || 'jsdom');
const fs = require('fs'), path = require('path'), vm = require('vm');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function test(resume) {
  const file = 'Mind Maps/Geography/World Geography/ChapterNames/16_air_pressure_winds_mindmap.html';
  const dom = new JSDOM(read(file), {
    url: 'https://examfusionprep.com/' + encodeURI(file) + '?efSearchQuery=Chinook&efSearchReturn=scroll-test#local',
    runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: new VirtualConsole()
  });
  const w = dom.window, doc = w.document, scrolled = [];
  const run = source => vm.runInContext(source, dom.getInternalVMContext());
  w.HTMLElement.prototype.getClientRects = function () {
    for (let el = this; el; el = el.parentElement) {
      if (el.classList.contains('tab-content') && !el.classList.contains('active')) return [];
    }
    return [{width: 100, height: 40}];
  };
  w.HTMLElement.prototype.scrollIntoView = function () { scrolled.push(this); };
  w.scrollTo = () => {}; w.scrollBy = () => {};
  let restored = 0;
  if (resume) w.EFP_APP_SESSION = {
    getSearchState: () => ({token: 'scroll-test', index: 1, panel: 'local', dismissed: false}),
    restoreSearchScroll: () => restored++
  };
  const originalText = Array.from(doc.querySelectorAll('.tab-content')).map(el => el.textContent);
  Array.from(doc.scripts).filter(s => !s.src && !/json/i.test(s.type)).forEach(s => run(s.textContent));
  // outside-only does not compile HTML onclick attributes. Run the actual
  // template handler when its tab control is clicked, as the browser does.
  doc.querySelectorAll('.tab-nav button[onclick]').forEach(button => {
    button.addEventListener('click', () => run(button.getAttribute('onclick')));
  });
  const style = doc.createElement('style'); style.textContent = read('mindmap-reader.css'); doc.head.append(style);
  run(read('mindmap-deeplink.js'));
  await delay(100);
  assert.equal(w.getComputedStyle(doc.body).overflowX, 'clip', 'Body must not create a second scroll container');
  assert.equal(w.getComputedStyle(doc.body).overflowY, 'visible');
  assert.equal(doc.querySelector('.efp-mm-next').textContent, resume ? '2/3 ↓' : '1/3 ↓');
  if (resume) { assert.equal(restored, 1); assert.equal(scrolled.length, 0); }
  const expected = resume ? [['3/3 ↓', 'jetstream', 1], ['1/3 ↓', 'local', 1], ['2/3 ↓', 'local', 2]]
    : [['2/3 ↓', 'local', 2], ['3/3 ↓', 'jetstream', 1], ['1/3 ↓', 'local', 1]];
  for (const [label, panel, count] of expected) {
    doc.querySelector('.efp-mm-next').click(); await delay(20);
    assert.equal(doc.querySelector('.efp-mm-next').textContent, label);
    assert.equal(doc.querySelectorAll('.efp-mindmap-search-context').length, 1);
    assert.equal(doc.querySelector('.tab-content.active').id, panel);
    assert.equal(w.location.hash, '#' + panel);
    assert.equal(doc.querySelectorAll('.efp-mm-current-match').length, count);
    assert(scrolled.at(-1).closest('#' + panel));
  }
  doc.querySelector('.efp-mm-dismiss').click();
  w.dispatchEvent(new w.PageTransitionEvent('pageshow', {persisted: true})); await delay(20);
  assert.equal(doc.querySelectorAll('.efp-mindmap-search-context,mark.efp-mindmap-match').length, 0);
  assert.deepEqual(Array.from(doc.querySelectorAll('.tab-content')).map(el => el.textContent), originalText);
  dom.window.close();
}
(async () => {
  await test(false); await test(true);
  console.log('PASS real Chinook page: 1→2→3→1 match navigation, tab switching, app resume, dismissal, unchanged content and body scroll CSS');
})().catch(error => { console.error(error); process.exitCode = 1; });
