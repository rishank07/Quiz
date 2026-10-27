// EFP_TEST_JSDOM=/path/to/jsdom node tools/test-blackbook-quiz-controls.cjs
// Run each native quiz with the real bookmark, score and session scripts.
const {JSDOM, VirtualConsole} = require(process.env.EFP_TEST_JSDOM || 'jsdom');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pause = () => new Promise(resolve => setTimeout(resolve, 80));
const folder = 'Books/BlackBook/Files/';
const files = fs.readdirSync(path.join(root, folder)).filter(file => file.endsWith('Quiz.html'));

// jsdom does not render geometry. Check the actual responsive cascade that
// caused unequal cells: the bookmark script used !important grid centering,
// and native number spans had a different line height from the added spans.
function checkMobileCascade(w) {
  const native = read('Books/BlackBook/blackbook-tailwind.css') +
    [...w.document.querySelectorAll('style')].map(style => style.textContent).join('\n');
  // jsdom cannot resolve selector specificity correctly when an earlier
  // !important declaration competes with a later one. Inspect priorities
  // directly and use the normal native -> injected -> shared load order here.
  assert(read('quiz-unattempted.css').includes('align-items: stretch !important'));
  assert(!w.document.getElementById('efp-blackbook-quiz-bookmark-style').textContent.includes('align-items:center!important;transform:none'));
  for (const width of [320, 393, 639]) {
    const source = native + read('quiz-unattempted.css');
    const rules = new JSDOM('<style>' + source + '</style>');
    function flatten(list) {
      return [...list].map(rule => {
        if (rule.type !== 4) return rule.cssText;
        const matches = rule.conditionText.split(',').some(part =>
          [...part.matchAll(/(min|max)-width:\s*(\d+)px/g)].every(match =>
            match[1] === 'max' ? width <= +match[2] : width >= +match[2]));
        return matches ? flatten(rule.cssRules) : '';
      }).join('\n');
    }
    const css = flatten(rules.window.document.styleSheets[0].cssRules);
    const fixture = new JSDOM('<style>' + css + '</style>' + w.document.querySelector('.efp-mobile-scorebar').outerHTML);
    const fw = fixture.window, bar = fw.document.querySelector('.efp-mobile-scorebar');
    const style = fw.getComputedStyle(bar);
    assert.equal(style.alignItems, 'stretch');
    assert.equal(style.gridTemplateColumns, 'repeat(2, minmax(0, 1fr))');
    assert.equal(style.gridTemplateRows, 'repeat(2, minmax(36px, 1fr)) 12px');
    for (const cell of [...bar.children].filter(el => !el.classList.contains('efp-quiz-progress'))) {
      const cellStyle = fw.getComputedStyle(cell);
      assert.equal(cellStyle.alignSelf, 'stretch');
      assert.equal(cellStyle.justifySelf, 'stretch');
      assert.equal(cellStyle.minHeight, '36px');
      assert.equal(cellStyle.boxSizing, 'border-box');
      assert.equal(cellStyle.margin, '0px');
      assert.equal(fw.getComputedStyle(cell.lastElementChild).lineHeight, '1.25');
    }
    fixture.window.close(); rules.window.close();
  }
}

function page(file, installed) {
  const errors = [], console = new VirtualConsole();
  console.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM(read(folder + file), {
    url: 'https://examfusionprep.com/' + folder + encodeURIComponent(file) + '?efpWorkPreview=1',
    runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: console
  });
  const w = dom.window;
  w.scrollTo = () => {};
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.HTMLElement.prototype.getClientRects = function () {
    return this.closest('[hidden],.hidden') ? [] : [{}];
  };
  w.matchMedia = query => ({matches: installed && query.includes('display-mode: standalone')});
  w.__navigations = [];
  w.__navigate = url => w.__navigations.push(url);
  const run = source => vm.runInContext(source.replace(/(?:window\.)?location\.(assign|replace)\(/g,
    'window.__navigate('), dom.getInternalVMContext());
  for (const script of [...w.document.scripts]) if (!script.src && script.textContent.trim()) run(script.textContent);
  // Keep each complete vocabData bank for totals and answer lookup. Two real
  // questions per rendered letter exercise the controls without building
  // thousands of unrelated distractor buttons in jsdom on every test visit.
  run('Object.keys(groupedData).forEach(letter => { groupedData[letter] = groupedData[letter].slice(0, 2); })');
  run(read('blackbook-quiz-bookmarks.js'));
  run(read('app-session.js'));
  run(read('quiz-unattempted.js'));
  return {dom, w, run, errors};
}

(async () => {
  assert.equal(files.length, 4);
  let cases = 0;
  for (const file of files) for (const installed of [false, true]) {
    const {dom, w, run, errors} = page(file, installed);
    await pause();
    if (!installed) checkMobileCascade(w);
    const nav = w.document.getElementById('efp-bb-section-nav');
    const enabled = [...w.document.querySelectorAll('#alphabet-container button:not(:disabled)')];
    assert.equal(nav.lastElementChild.textContent, 'Next →');
    nav.lastElementChild.click();
    await pause();
    assert(enabled[1].classList.contains('bg-blue-600'), 'Next selects the next available letter');
    nav.firstElementChild.click();
    await pause();
    assert(enabled[0].classList.contains('bg-blue-600'), 'Previous restores the first letter');
    // Persist an actual answer and bookmark before moving to the last tab.
    const answer = w.document.querySelector('section:not(.hidden) .quiz-option');
    const groupId = answer.closest('[id^="opts-"]').id;
    answer.click();
    w.document.querySelector('section:not(.hidden) .efp-bb-bookmark-btn').click();
    await pause();
    const savedBookmark = w.localStorage.getItem('efp_bookmarks');
    assert(savedBookmark);
    enabled.at(-1).click();
    await pause();
    assert.equal(nav.lastElementChild.textContent, 'Finish');
    const progress = JSON.parse(w.localStorage.getItem('efp_quiz_progress_v2'));
    const entry = progress['/' + folder + file];
    assert(entry.answers[groupId], 'The real answer handler saves progress');
    assert.equal(entry.section, enabled.at(-1).dataset.letter);
    const savedAnswers = JSON.stringify(entry.answers), savedSection = entry.section;
    const beforeUrl = w.location.href;
    const beforeHistory = JSON.stringify(w.history.state), beforeLength = w.history.length;
    let backs = 0;
    const back = w.history.back.bind(w.history);
    w.history.back = () => { backs++; back(); };
    // Finish may summarize an incomplete or fully attempted bank. It must
    // never release the same-document Back guard or navigate to the hub.
    for (const [correct, wrong] of [[0, 0], [3, 2], [run('vocabData.length'), 0]]) {
      w.EFP_BLACKBOOK_QUIZ.setScore(correct, wrong);
      nav.lastElementChild.click();
      await pause();
      const summary = w.document.getElementById('efp-bb-quiz-summary');
      const total = run('vocabData.length'), attempted = Math.min(total, correct + wrong);
      assert(summary && !summary.hidden);
      assert.equal(summary.querySelector('[data-stat="total"]').textContent, attempted + '/' + total);
      assert.equal(summary.querySelector('[data-stat="correct"]').textContent, String(correct));
      assert.equal(summary.querySelector('[data-stat="wrong"]').textContent, String(wrong));
      assert.equal(summary.querySelector('[data-stat="remaining"]').textContent, String(total - attempted));
      assert.equal(w.document.activeElement, summary, 'Keyboard focus reaches the summary');
      assert.equal(w.location.href, beforeUrl);
      assert.deepEqual(w.__navigations, []);
      assert.equal(backs, 0, 'Finish must not traverse Back history');
      assert.equal(w.history.length, beforeLength);
      assert.equal(JSON.stringify(w.history.state), beforeHistory);
      const retained = JSON.parse(w.localStorage.getItem('efp_quiz_progress_v2'))['/' + folder + file];
      assert.equal(JSON.stringify(retained.answers), savedAnswers);
      assert.equal(retained.section, savedSection);
      assert.equal(w.localStorage.getItem('efp_bookmarks'), savedBookmark);
      summary.querySelector('button').click();
      assert(summary.hidden);
      assert(enabled.at(-1).classList.contains('bg-blue-600'), 'Review keeps the last letter selected');
      cases++;
    }
    nav.lastElementChild.click();
    enabled[0].click();
    assert(w.document.getElementById('efp-bb-quiz-summary').hidden, 'A-Z navigation dismisses the summary');
    assert.equal(w.document.querySelectorAll('#efp-bb-quiz-summary').length, 1);
    assert.deepEqual(errors, []);
    dom.window.close();
  }
  console.log('PASS 12 mobile cascade checks, plus ' + cases + ' Blackbook Finish/review cases across all four quizzes in browser and installed-app contexts; answers, bookmarks and Back history preserved');
})().catch(error => {console.error(error); process.exitCode = 1;});
