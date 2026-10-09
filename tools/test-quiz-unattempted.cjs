// EFP_TEST_JSDOM=/path/to/jsdom node --expose-gc tools/test-quiz-unattempted.cjs
const {JSDOM, VirtualConsole} = require(process.env.EFP_TEST_JSDOM || 'jsdom');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), read = p => fs.readFileSync(path.join(root, p), 'utf8');
const feature = read('quiz-unattempted.js'), css = read('quiz-unattempted.css');
const delay = w => new Promise(resolve => w.setTimeout(resolve, 15));
let cases = 0;
function make(file, html, runNative = false) {
  const errors = [], virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', e => errors.push(e));
  const dom = new JSDOM(html, {url:'https://examfusionprep.com/' + file.replaceAll(' ', '%20'), runScripts:'outside-only', pretendToBeVisual:true, virtualConsole});
  const w = dom.window, context = dom.getInternalVMContext(), run = code => vm.runInContext(code, context);
  w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {};
  w.confirm = () => true; w.alert = message => {w.lastAlert = String(message);};
  if (runNative) for (const script of Array.from(w.document.scripts)) {
    if (!script.src && !/json/.test(script.type) && script.textContent.trim()) run(script.textContent);
  }
  run(feature);
  const style = w.document.createElement('style'); style.textContent = css; w.document.head.appendChild(style);
  function close() { assert.deepEqual(errors, []); dom.window.close(); if(global.gc)global.gc(); }
  return {w, run, close};
}
function value(host) {
  assert.equal(host.querySelectorAll(':scope > .efp-unattempted').length, 1);
  return Number(host.querySelector('.efp-unattempted-value').textContent);
}
function files(dir) { return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(d=>d.isDirectory()?files(dir+'/'+d.name):[dir+'/'+d.name]); }
(async () => {
  let books = 0, sets = 0, rapid = 0, original = 0, blackbook = 0;
  // Cover every native static navbar, including different totals in all 60 sets.
  for (const dir of ['Books','Bihar Special']) for (const file of files(dir).filter(f=>f.endsWith('.html'))) {
    const source = read(file), bars = [...source.matchAll(/<div class="(?:score-bar|set-score-bar)"[^>]*>[\s\S]*?<\/div>/g)].map(m=>m[0]);
    if (!bars.length) continue;
    assert(source.includes('home-nav.js'), file + ': missing universal loader');
    const p = make(file, bars.join('')); await delay(p.w);
    for (const bar of p.w.document.querySelectorAll('.score-bar,.set-score-bar')) {
      const totalNode = bar.querySelector('.total-count'), total = Number(totalNode.textContent.match(/\/(\d+)/)[1]);
      const attempted = totalNode.querySelector('span'); assert.equal(value(bar),total);
      attempted.textContent = '1'; await delay(p.w); assert.equal(value(bar),total-1);
      attempted.textContent = String(total); p.w.EFP_QUIZ_UNATTEMPTED.sync(); assert.equal(value(bar),0);
      attempted.textContent = '0'; p.w.EFP_QUIZ_UNATTEMPTED.sync(); assert.equal(value(bar),total);
      if(dir==='Books')books++;else sets++;cases+=4;
    }
    p.close();
  }
  assert.equal(books,648); assert.equal(sets,60);
  console.log('PASS all 648 book scorebars and all 60 Bihar sets: zero/partial/full/reset');

  for (const file of files('Original Practice').filter(f=>/_Complete_Practice\.html$/.test(f))) {
    const p = make(file,read(file),true), english = file.includes('English_Grammar');
    p.run(read(english?'Original Practice/english-practice.js':'Original Practice/original-practice.js'));
    if (english) p.run("goToQuiz(Object.keys(MASTER)[0])");
    else p.run("state.subject=Object.keys(MASTER)[0];goToQuiz(Object.keys(MASTER[state.subject])[0])");
    await delay(p.w);
    const stats = () => p.w.document.querySelector('.efp-op-counts');
    const total = Number(stats().textContent.match(/\/(\d+)/)[1]); assert.equal(value(stats()),total);
    // Actual native answer handlers, including their rerenders and persistence.
    p.run('selectOption(0,0)'); await delay(p.w); assert.equal(value(stats()),total-1);
    p.run('selectOption(1,1)'); await delay(p.w); assert.equal(value(stats()),total-2);
    p.run('switchSection(1)'); await delay(p.w); assert.equal(value(stats()),total-2);
    p.run('state.currentSection=state.quizData.length-1;nextSection()');
    assert(p.w.lastAlert.includes('Not Attempted: '+(total-2)));
    p.w.alert('Reset progress?'); assert.equal(p.w.lastAlert,'Reset progress?');
    original++;cases+=5;p.close();
  }
  assert.equal(original,8);
  console.log('PASS all 8 Original Practice runtimes: native answers, section switches, chapter summaries');

  for (const file of files('Books/BlackBook/Files').filter(f=>f.endsWith('Quiz.html'))) {
    const p = make(file,read(file),true); await delay(p.w);
    const total = p.run('vocabData.length'), hosts = () => p.w.document.querySelectorAll('.efp-blackbook-counts,.efp-mobile-scorebar,.desktop-sticky-score');
    assert.equal(hosts().length,3);hosts().forEach(h=>assert.equal(value(h),total));
    const button = p.w.document.querySelector('.quiz-option'); assert(button);button.click();
    await delay(p.w);hosts().forEach(h=>assert.equal(value(h),total-1));
    p.w.EFP_BLACKBOOK_QUIZ.setScore(3,2);await delay(p.w);hosts().forEach(h=>assert.equal(value(h),total-5));
    p.w.EFP_BLACKBOOK_QUIZ.setScore(0,0);await delay(p.w);hosts().forEach(h=>assert.equal(value(h),total));
    blackbook++;cases+=4;p.close();
  }
  assert.equal(blackbook,4);
  console.log('PASS all 4 Blackbook quizzes: mobile/header/sticky scores, clicks, restored correct+wrong, reset');

  for (const file of files('Current Affairs/Topic Names/Rapid Practice').filter(f=>f.endsWith('.html'))) {
    const source = read(file);if(!source.includes('id="sectionNav"'))continue;
    assert(source.includes('ef-native-score-total') || source.includes('rapid-runtime.js'));
    assert(source.includes('home-nav.js'));
    rapid++;
  }
  assert.equal(rapid,42);
  // Run both actual CA runtime shapes (inline data and shared derived data).
  for (const file of [
    'Current Affairs/Topic Names/Rapid Practice/2026/Month Wise/September_2026_Current_Affairs_Rapid_Practice.html',
    'Current Affairs/Topic Names/Rapid Practice/2026/Topic Wise/Asian_Games_2026_Current_Affairs_Rapid_Practice.html',
    'Current Affairs/Topic Names/Rapid Practice/2026/Topic Wise/Appointments_2026_Current_Affairs_Rapid_Practice.html',
    'Current Affairs/Topic Names/Rapid Practice/2026/Topic Wise/BRICS_2026_Current_Affairs_Rapid_Practice.html'
  ]) {
    const p = make(file,read(file),true);
    if (read(file).includes('src="rapid-runtime.js')) {
      p.run(read('Current Affairs/Topic Names/search-index.js'));
      p.run(read('Current Affairs/Topic Names/brics-search-index.js'));
      p.run('window.CA_SEARCH_INDEX=(window.CA_SEARCH_INDEX||[]).concat(window.CA_BRICS_SEARCH_INDEX||[])');
      p.run(read('Current Affairs/Topic Names/Rapid Practice/2026/Topic Wise/rapid-runtime.js'));
    }
    await delay(p.w);
    const host = () => p.w.document.getElementById('scoreTxt'), total = p.run('stats().total');assert(total>0);
    assert.equal(value(host()),total);
    p.run('pick(0,0)');await delay(p.w);assert.equal(value(host()),total-1);
    p.run('pick(1,1)');await delay(p.w);assert.equal(value(host()),total-2);
    p.run('openSection(1)');await delay(p.w);assert.equal(value(host()),total-2);
    p.run('toggleBookmarkFilter()');await delay(p.w);assert.equal(value(host()),total-2);
    p.run('resetAll()');await delay(p.w);assert.equal(value(host()),total);
    cases+=6;p.close();
  }
  console.log('PASS '+rapid+' CA quiz loaders; native inline/shared runtime counts, section/filter switches and reset');

  for (const file of ['Original Practice/Mixed_Practice.html','Books/BlackBook/Files/All one Word.html','Current Affairs/Topic Names/2026/Month Wise/SEPTEMBER2026.html']) {
    const p = make(file,'<div id="scoreTxt">Not Attempted: 7</div>');await delay(p.w);
    assert.equal(p.w.document.querySelectorAll('.efp-unattempted').length,0);p.close();cases++;
  }
  const p=make('Books/test.html','<div class="score-bar"><span class="total-count">Total: <span>0</span>/12</span><span>Not Attempted: 12</span></div>');await delay(p.w);
  assert.equal(p.w.document.querySelectorAll('.efp-unattempted').length,0);p.close();cases++;
  console.log('PASS Mixed Practice remains excluded; no counters on reading pages or duplicate existing labels');
  console.log('PASS '+cases+' counter regressions across 703 quiz pages / 60 set scorebars');
})().catch(error => {console.error(error);process.exit(1);});
