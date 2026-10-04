// EFP_TEST_JSDOM=/path/to/jsdom node tools/test-current-affairs-back.cjs
// Run the actual hub and shared scripts in page order, including the early
// progress.js listener. Only document navigation and layout are simulated.
const { JSDOM, VirtualConsole } = require(process.env.EFP_TEST_JSDOM || 'jsdom');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
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
function page(file, url, surface, local = {}, session = {}, referrer = '') {
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
(async () => {
  for (const [name, surface] of surfaces) {
    for (const action of ['button', 'system']) {
    // Quiz Quit replaces the leaf with its hub, which is now the last session.
    const hubUrl = '/Current%20Affairs/Topic%20Names.html';
    const hub = page('Current Affairs/Topic Names.html', hubUrl, surface, {
      [SESSION]: JSON.stringify({ url: hubUrl, ts: Date.now(), scrollY: 900 })
    }, {}, 'https://examfusionprep.com/Current%20Affairs/Topic%20Names/2026/Topic%20Wise/BRICS2026.html');
    await settle();
    const back = hub.w.document.getElementById('efp-app-back-button');
    assert(back, 'the actual hub must create its visible Back button');
    if (action === 'button') back.click(); else hub.w.history.back();
    await settle();
    assert(hub.w.__navigation, name + ': Back must leave the hub');
    assert(['/index.html', '/'].includes(new URL(hub.w.__navigation).pathname));
    hub.w.dispatchEvent(new hub.w.Event('pagehide'));
    if (surface.installed) {
      assert.equal(JSON.parse(hub.w.localStorage.getItem(SESSION)).url, '/',
        name + ': deliberate Home return must survive pagehide');
    }
    const home = page('index.html', new URL(hub.w.__navigation).pathname, surface,
      hub.local(), hub.session(), 'https://examfusionprep.com' + hubUrl);
    await settle();
    assert(!home.w.__navigation, name + ': Home must not auto-resume the hub');
    console.log('PASS', name, action, 'Current Affairs Back -> Home, no resume loop');
    }
  }
  const fixtures = [
    ['Current Affairs quiz', 'Current Affairs/Topic Names/Rapid Practice/2025/Month Wise/June_2025_Current_Affairs_Rapid_Practice.html', '.qcard .opt'],
    ['Blackbook quiz', 'Books/BlackBook/Files/Idioms and Phrases Quiz.html', '.quiz-option']
  ];
  for (const [name, surface] of surfaces) {
    for (const [label, file, selector] of fixtures) {
      for (const action of ['button', 'system']) {
        const url = '/' + file.split('/').map(encodeURIComponent).join('/');
        const quiz = page(file, url, surface);
        await settle();
        const option = quiz.w.document.querySelector(selector);
        assert(option, label + ': actual question choices must render');
        option.click();
        const warning = quiz.w.EFP_QUIZ_PROGRESS_WARNING;
        assert(warning.isArmed(), label + ': answering must arm Quit');
        const leave = () => action === 'button'
          ? quiz.w.document.getElementById('efp-app-back-button').click()
          : quiz.w.history.back();
        leave();
        await until(() => quiz.w.document.querySelector('#efp-quiz-exit-modal.show'));
        quiz.w.document.querySelector('.efp-qw-stay').click();
        assert(!quiz.w.__navigation, 'Stay must keep the quiz');
        leave();
        await until(() => quiz.w.document.querySelector('#efp-quiz-exit-modal.show'));
        quiz.w.document.querySelector('.efp-qw-leave').click();
        await until(() => quiz.w.__navigation);
        const parent = quiz.w.EFP_BACK_PARENT_MAP['/' + file];
        assert.equal(decodeURIComponent(new URL(quiz.w.__navigation).pathname), parent);
        // Cold replacement after Quit: continue through the parent on the
        // next system Back, even though the original hub also exists behind it.
        const hub = page(parent.slice(1), new URL(quiz.w.__navigation).pathname,
          surface, quiz.local(), quiz.session(), 'https://examfusionprep.com' + url);
        await settle(); hub.w.history.back();
        await until(() => hub.w.__navigation);
        assert.equal(decodeURIComponent(new URL(hub.w.__navigation).pathname),
          hub.w.EFP_BACK_PARENT_MAP[parent]);
        console.log('PASS', name, label, action, 'Stay/Quit -> exact parent -> next Back');
        quiz.w.close(); hub.w.close();
      }
    }
  }
  for (const [name, surface] of surfaces) {
    for (const [label, file, selector] of fixtures) {
      const url = '/' + file.split('/').map(encodeURIComponent).join('/');
      const original = page(file, url, surface);
      await settle();
      original.w.document.querySelector(selector).click();
      await settle();
      assert(original.w.EFP_QUIZ_PROGRESS_WARNING.isArmed());
      const local = original.local();
      if (label === 'Blackbook quiz') assert(Object.keys(JSON.parse(local.efp_quiz_progress_v2)['/' + file].answers).length > 0, 'Blackbook answer must actually save');
      const originalSession = original.session();
      original.w.close();
      // Older app versions persisted dirty flags; a cold auto-resume must
      // restore the attempt without reviving that previous visit's warning.
      local.efp_app_quiz_warning_v1 = JSON.stringify({ url, ts: Date.now() });
      for (const action of ['button', 'system', 'new-answer', 'bfcache']) {
        const reopened = page(file, url, surface, local, {
          ...originalSession,
          efp_app_resume_pending_v1: JSON.stringify({ url, ts: Date.now() })
        });
        await until(() => reopened.w.document.querySelector(selector + ':disabled'));
        await settle();
        const warning = reopened.w.EFP_QUIZ_PROGRESS_WARNING;
        assert(reopened.w.document.querySelector(selector + ':disabled'), label + ': saved answer must restore');
        assert(!warning.isArmed(), name + ': saved ticks must not arm Quit');
        assert.equal(reopened.w.localStorage.getItem('efp_app_quiz_warning_v1'), null);
        reopened.w.document.querySelector(selector + ':disabled').click();
        reopened.w.dispatchEvent(new reopened.w.Event('scroll'));
        assert(!warning.isArmed(), 'repeated saved ticks and scrolling must stay clean');
        if (action === 'new-answer' || action === 'bfcache') {
          reopened.w.document.querySelector(selector + ':not(:disabled)').click();
          assert(warning.isArmed(), 'a new answer after restore must arm Quit');
          if (action === 'bfcache') {
            reopened.w.dispatchEvent(new reopened.w.PageTransitionEvent('pageshow', { persisted: true }));
            assert(!warning.isArmed(), 'returning through BFCache begins a clean visit');
          } else {
            reopened.w.document.getElementById('efp-app-back-button').click();
            await until(() => reopened.w.document.querySelector('#efp-quiz-exit-modal.show'));
            reopened.w.document.querySelector('.efp-qw-stay').click();
            assert(warning.isArmed(), 'Stay keeps the current visit protected');
            reopened.w.close();
            continue;
          }
        }
        if (action === 'system') reopened.w.history.back();
        else reopened.w.document.getElementById('efp-app-back-button').click();
        await until(() => reopened.w.__navigation);
        assert(!reopened.w.document.querySelector('#efp-quiz-exit-modal.show'));
        assert.equal(decodeURIComponent(new URL(reopened.w.__navigation).pathname), reopened.w.EFP_BACK_PARENT_MAP['/' + file]);
        reopened.w.close();
      }
      console.log('PASS', name, label, 'saved ticks, cold resume, BFCache, unchanged Back, new-answer warning');
    }
  }
  for (const [name, surface] of surfaces) {
    const file = "Books/Lucent's Objective/Economics/ChapterNames/Money.html";
    const url = '/' + file.split('/').map(encodeURIComponent).join('/');
    const original = page(file, url, surface);
    await settle();
    original.w.document.querySelector('.options input[type=radio]').click();
    assert(original.w.EFP_QUIZ_PROGRESS_WARNING.isArmed(), 'a radio change must arm Quit');
    await settle();
    const reopened = page(file, url, surface, original.local(), original.session());
    await settle();
    const radio = reopened.w.document.querySelector('.options input:checked');
    assert(radio, 'unchecked saved selection must restore');
    assert(!reopened.w.EFP_QUIZ_PROGRESS_WARNING.isArmed());
    radio.click();
    assert(!reopened.w.EFP_QUIZ_PROGRESS_WARNING.isArmed(), 'clicking the same selected radio does not change an answer');
    radio.closest('.options').querySelector('input:not(:checked)').click();
    assert(reopened.w.EFP_QUIZ_PROGRESS_WARNING.isArmed(), 'changing a saved radio answer must arm Quit');
    reopened.w.EFP_QUIZ_PROGRESS_WARNING.disarm();
    reopened.w.document.querySelector('.check-btn').click();
    await settle();
    const checked = page(file, url, surface, reopened.local(), reopened.session());
    await settle();
    assert(checked.w.document.querySelector('.question-box.answered'));
    assert(!checked.w.EFP_QUIZ_PROGRESS_WARNING.isArmed(), 'restoring checked static answers must remain clean');
    original.w.close(); reopened.w.close(); checked.w.close();
    console.log('PASS', name, 'static radio: restore, same tick, changed tick, checked-answer restore');
  }
  for (const [name, surface] of surfaces) {
    for (const [file, open] of [
      ['Original Practice/English_Grammar_Complete_Practice.html', "goToQuiz('01. Basics')"],
      ['Original Practice/Static_GK_Complete_Practice.html', "goToQuiz(Object.keys(MASTER['Static GK'])[0])"]
    ]) {
      const url = '/' + file.split('/').map(encodeURIComponent).join('/');
      const original = page(file, url, surface);
      original.run(open); await settle();
      original.w.document.querySelector('.option-btn').click();
      assert(original.w.EFP_QUIZ_PROGRESS_WARNING.isArmed());
      await settle();
      const reopened = page(file, url, surface, original.local(), original.session());
      reopened.run(open); await settle();
      const savedOption = reopened.w.document.querySelector('.option-btn.answered,.option-btn:disabled');
      // General Original Practice attempt restoration is installed-app only.
      if (surface.installed || file.includes('English_Grammar')) assert(savedOption, name + ': Original Practice saved ticks must restore');
      assert(!reopened.w.EFP_QUIZ_PROGRESS_WARNING.isArmed());
      if (savedOption) savedOption.click();
      assert(!reopened.w.EFP_QUIZ_PROGRESS_WARNING.isArmed(), 'old disabled/answered buttons stay clean');
      reopened.w.document.querySelector('.option-btn:not(.answered):not(:disabled)').click();
      assert(reopened.w.EFP_QUIZ_PROGRESS_WARNING.isArmed(), 'a fresh Original Practice answer arms Quit');
      original.w.close(); reopened.w.close();
      console.log('PASS', name, file, 'saved ticks and new-answer warning');
    }
  }
})().finally(() => pages.forEach(dom => dom.window.close())).catch(error => {
  console.error(error); process.exitCode = 1;
});
