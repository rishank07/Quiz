// Deterministic lifecycle regressions using the actual shared runtime.
// Layout/clock stubs let us reproduce sleeping/throttled renderers without
// depending on wall-clock delays or OS power management.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const source = fs.readFileSync(process.env.EFP_CONTINUITY_SOURCE || path.join(__dirname, '../quiz-continuity.js'), 'utf8');
function fixture(kind, options = {}) {
  let time = 0, serial = 0, observer, available = options.available !== false;
  const timers = new Map(), data = new Map(), listeners = new Map();
  function listen(host, name, fn) { const key = host + ':' + name; if (!listeners.has(key)) listeners.set(key, []); listeners.get(key).push(fn); }
  function emit(host, name, detail = {}) { for (const fn of listeners.get(host + ':' + name) || []) fn({isTrusted:false, ...detail}); }
  function tick(ms) { const end = time + ms; let count = 0; while (true) { let entry; for (const item of timers) if (item[1].at <= end && (!entry || item[1].at < entry[1].at)) entry = item;
    if (!entry) break; if (++count > 20000) throw Error('Timer loop'); timers.delete(entry[0]); time = entry[1].at; entry[1].fn(); } time = end; }
  const isOp = kind.startsWith('op-');
  const pathname = isOp ? '/Original Practice/' + (kind === 'op-English_Grammar' ? 'English_Grammar' : kind.slice(3)) + '_Complete_Practice.html' :
    kind === 'vocab' || kind === 'blackbook' ? '/Books/BlackBook/Files/Test.html' : kind === 'mindmap' ? '/Mind Maps/Polity/ChapterNames/test.html' :
    kind === 'reader' || kind === 'accordion' ? '/Current Affairs/Topic Names/test.html' : kind === 'mixed' ? '/Original Practice/Mixed_Practice.html' : '/Books/test.html';
  const loc = {pathname, search:options.search || '', hash:options.hash || '', href:'https://example.test' + pathname + (options.search || '') + (options.hash || '')};
  const w = {scrollY:0, innerHeight:options.height || 768, addEventListener:(n,f)=>listen('w',n,f), scrollTo(a,b){this.scrollY = typeof a === 'number' ? b : a.top;}};
  function node(id, index) { return {
    id, textContent:'Stable question ' + index, dataset:{}, parentElement:null,
    getClientRects(){return index === 4 && !available ? [] : [this.getBoundingClientRect()];},
    getBoundingClientRect(){const top = 180 + index * 260 - w.scrollY; return {top, bottom:top + 230, height:230};},
    hasAttribute(n){return n === 'data-efp-bb-sn' && kind === 'vocab';}, getAttribute(n){return n === 'data-efp-bb-sn' ? String(index) : null;},
    matches(s){return kind === 'accordion' && s === '.data-list > li';},
    closest(s){return s === '.state-section[id]' && kind === 'accordion' ? section : null;},
    contains(n){return n === this;}, querySelector(s){return s.includes('opts-') ? null : {textContent:this.textContent};}, querySelectorAll(){return [];}
  }; }
  const first = node('q-0',0), target = node('q-4',4);
  const section = {...node('facts',0), classList:{contains:()=>true,toggle(){}}};
  if (kind === 'accordion') { first.id=target.id=''; const parent = {children:[first, target]}; first.parentElement = target.parentElement = parent; }
  if (kind === 'vocab') { first.id='bbt-0'; target.id='bbt-4'; }
  const cards = () => available ? [first,target] : [first];
  const container = {...node('questions-container',0), querySelectorAll:cards};
  const panel = {...container, id:'governor'};
  const alphabet = {dataset:{letter:'A'}};
  const setTab = {dataset:{set:'1'}};
  const mixed = {...node('quizView',0), querySelector:()=>target};
  let pdfReady = available, restoredPdf = null;
  const d = {hidden:!!options.hidden, visibilityState:options.hidden?'hidden':'visible', readyState:'complete', body:node('body',0), documentElement:node('html',0),
    head:{appendChild(){}}, createElement:()=>node('style',0), addEventListener:(n,f)=>listen('d',n,f),
    getElementById(id){if (id === 'efp-section-completion-style') return {}; if (id === 'questions-container' || id === 'questions') return container;
      if (id === 'sectionNav' && kind === 'rapid') return container; if (id === 'section-A' && kind === 'blackbook') return container;
      if (id === 'set-1' && kind === 'sets') return container; if (id === 'quizView' && kind === 'mixed') return mixed;
      if (id === 'questionEn' && kind === 'mixed') return {textContent:target.textContent}; return null;},
    querySelector(s){if (s.startsWith('#alphabet-container button') && kind === 'blackbook') return alphabet;
      if (s === '.set-tab.active[data-set]' && kind === 'sets') return setTab;
      if (s.startsWith('.tab-content.active') && kind === 'mindmap') return panel; return null;},
    querySelectorAll(s){if (s === '.question-box[id]' && kind === 'static') return cards();
      if (s.startsWith('tbody tr') && kind === 'vocab') return cards();
      if (s === '#content .state-section[id]' && kind === 'accordion') return [section];
      if (s.startsWith('#content .state-section.open') && kind === 'accordion') return cards();
      if (s.startsWith('.question-card,.qcard') && kind === 'reader') return cards();
      return [];}
  };
  const context = {window:w, document:d, location:loc, URL, URLSearchParams, Number, Array, Object, String, Math, JSON, Promise,
    innerHeight:w.innerHeight, performance:{getEntriesByType:()=>[{name:loc.href}]},
    localStorage:{getItem:k=>data.get(k) || null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},
    setTimeout:(fn,ms=0)=>{const id=++serial;timers.set(id,{fn,at:time+ms});return id;},clearTimeout:id=>timers.delete(id),
    MutationObserver:class{constructor(fn){observer=fn;}observe(){}}, getComputedStyle:()=>({position:'static',overflowY:'visible'})};
  w.performance=context.performance; w.MutationObserver=context.MutationObserver; w.getComputedStyle=context.getComputedStyle;
  if (isOp) {context.state={screen:options.chapters?'chapters':'quiz',subject:kind.slice(3),chapterName:'Nouns',currentSection:0,quizData:[{questions:[{id:'1',options:[]},{id:'2',options:[]}]}]}; context.saved={answers:{Nouns:{}}}; context.switchSection=i=>{context.state.currentSection=i;};}
  if (kind === 'rapid') {context.SECTIONS=[{questions:[]}];context.saved={answers:{}};context.current=0;context.openSection=()=>{};}
  if (kind === 'blackbook') {const a={...first,parentElement:first},b={...target,parentElement:target}; container.querySelectorAll=()=>available?[a,b]:[a];}
  if (kind === 'sets') w.showSet=()=>{};
  if (kind === 'mindmap') panel.querySelectorAll=cards;
  if (kind === 'vocab') context.vocabData=[{sn:0,word:first.textContent},{sn:4,word:target.textContent}];
  if (kind === 'pdf') w.EFP_READING_PAGE={snapshot:()=>({id:'doc',ready:pdfReady,page:1}),restore:(record,valid)=>{if(valid())restoredPdf=record;return Promise.resolve();}};
  const keyName = isOp?'op|'+kind.slice(3)+'|Nouns':({vocab:'blackbook-vocab',sets:'bihar-sets',mindmap:'mindmap',reader:'topic',accordion:'topic-accordion',mixed:'mixed|'+target.textContent,pdf:'pdf|doc'}[kind] || kind);
  const recordKind=isOp?'op':({mindmap:'reader',reader:'reader'}[kind] || kind);
  const key='efp_reading_position_v1:'+encodeURIComponent(pathname)+':'+encodeURIComponent(keyName);
  const record={kind:recordKind,section:kind==='blackbook'?'A':kind==='sets'?'1':kind==='mindmap'?'governor':kind==='pdf'?4:0,id:kind==='accordion'?'facts|fact|1':target.id,index:1,text:target.textContent,top:120,ts:1,pdf:{id:'doc',page:4,top:100},expanded:['facts']};
  data.set(key,JSON.stringify(record));
  vm.runInNewContext(source,context);
  return {w,d,context,target,key,data,tick,emit,mutate(){observer?.();},ready(){available=true;pdfReady=true;observer?.();emit('w','efp-pdf-layout-ready');},pdf:()=>restoredPdf,
    framed(){return kind==='pdf'?restoredPdf?.page===4:Math.abs(target.getBoundingClientRect().top-120)<1;}};
}
const kinds=['op-History','op-Polity','op-Science','op-Geography','op-Economics','op-Environment_Ecology','op-Static_GK','op-English_Grammar','rapid','blackbook','vocab','sets','static','mindmap','reader','accordion','mixed','pdf'];
let cases=0;
for (const height of [844,768]) for (const kind of kinds) {
  const f=fixture(kind,{available:false,height});f.tick(32000);
  const saved=f.data.get(f.key);f.w.scrollY=0;f.emit('d','scroll');f.tick(200);
  assert.equal(f.data.get(f.key),saved,kind+': delayed renderer must preserve checkpoint');
  f.ready();f.tick(900);assert(f.framed(),kind+': late layout must resume on first entry');cases++;
  const asleep=fixture(kind,{hidden:true,height});asleep.tick(6000);
  assert.equal(asleep.w.scrollY,0,kind+': hidden page must wait');
  asleep.d.hidden=false;asleep.d.visibilityState='visible';asleep.emit('d','resume');asleep.emit('d','visibilitychange');asleep.tick(900);
  assert(asleep.framed(),kind+': sleep/wake must resume pending checkpoint');cases++;
}
// A trusted wheel/keyboard/pointer action cancels pending automatic movement.
for(const kind of kinds){const f=fixture(kind,{available:false});f.tick(32000);f.emit('w','wheel',{isTrusted:true});f.ready();f.tick(900);assert.equal(f.w.scrollY,0,kind+': learner scroll wins');cases++;}
// Search/deep-link entry remains authoritative even with an old checkpoint.
for(const kind of kinds){const f=fixture(kind,{search:'?q=1'});f.tick(900);assert.equal(f.w.scrollY,0,kind+': explicit target wins');cases++;}
// If the observer was throttled, the first input on the chapter list must
// notice that the old quiz view has gone away before reopening that same key.
const f=fixture('op-English_Grammar');f.tick(900);f.context.state.screen='chapters';
f.emit('w','pointerdown',{isTrusted:true});f.context.state.screen='quiz';f.w.scrollY=0;f.mutate();f.tick(900);
assert(f.framed(),'First reopen after throttled chapter-list observation');cases++;
// Reset releases a deferred restore and removes its durable checkpoint.
const reset=fixture('op-English_Grammar',{available:false});reset.tick(32000);reset.w.EFP_QUIZ_CONTINUITY.clear();reset.ready();reset.tick(900);
assert(!reset.data.has(reset.key),'Reset clears checkpoint');assert.equal(reset.w.scrollY,0,'Reset cannot be undone by late layout');cases++;
// A foreground save callback beating the observer must resolve entry first.
const early=fixture('op-English_Grammar',{chapters:true});early.context.state.screen='quiz';
const prior=early.data.get(early.key);early.w.EFP_QUIZ_CONTINUITY.save();
assert.equal(early.data.get(early.key),prior,'Early callback cannot overwrite unread checkpoint');early.tick(900);assert(early.framed());cases++;
// Suspend an in-flight restore, then wake after arbitrarily long sleep.
const freeze=fixture('op-English_Grammar');freeze.tick(50);freeze.d.hidden=true;freeze.d.visibilityState='hidden';freeze.emit('d','freeze');freeze.tick(86400000);
assert.equal(freeze.w.scrollY,0);freeze.d.hidden=false;freeze.d.visibilityState='visible';freeze.emit('d','resume');freeze.tick(900);assert(freeze.framed());cases++;
// Reordered/replaced content with the same ID must never restore the wrong card.
const changed=fixture('op-English_Grammar');changed.target.textContent='Replaced question';changed.tick(900);assert.equal(changed.w.scrollY,0);cases++;
// BFCache restores the same page after pagehide cancelled its pending work.
const cached=fixture('op-English_Grammar');cached.tick(50);cached.emit('w','pagehide');cached.tick(1000);cached.emit('w','pageshow',{persisted:true});cached.tick(900);assert(cached.framed());cases++;
console.log('PASS '+cases+' shared continuity lifecycle cases across '+kinds.length+' page families, phone/desktop heights, late rendering, sleep/wake, first reopen, user input, search and reset.');
