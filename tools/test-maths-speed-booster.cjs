const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, '../Maths Speed Booster/math-speed-booster.js'), 'utf8');

class Element {
  constructor() {
    this.style = {setProperty() {}};
    this.children = [];
    this.listeners = {};
    this.textContent = '';
    this.dataset = {};
    this.className = '';
    this.classList = {
      add: (...xs) => { this.className = [...new Set([...this.className.split(' '), ...xs])].join(' '); },
      remove: (...xs) => { this.className = this.className.split(' ').filter(x => !xs.includes(x)).join(' '); },
      contains: x => this.className.split(' ').includes(x),
      toggle: (x, force) => force ? this.classList.add(x) : this.classList.remove(x)
    };
  }
  set innerHTML(x) { this._html = x; this.children = []; }
  get innerHTML() { return this._html || ''; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  emit(type, e = {}) { for (const fn of this.listeners[type] || []) fn(e); }
  appendChild(x) { this.children.push(x); }
  querySelectorAll(s) { return this.children.filter(x => x.classList.contains(s.slice(1))); }
  getBoundingClientRect() { return {}; }
}
function boot() {
  const els = new Map();
  const get = id => { if (!els.has(id)) els.set(id, new Element()); return els.get(id); };
  const doc = new Element();
  doc.getElementById = get;
  doc.createElement = () => new Element();
  doc.querySelectorAll = s => s === '.screen' ? [get('screen-home'), get('screen-practice')] : [];
  const storage = new Map([['msb_sound', '0']]);
  let now = 100000, nextId = 1, seed = 12345;
  const jobs = new Map();
  const math = Object.create(Math);
  math.random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);
  const context = {
    document: doc,
    window: {addEventListener: (...args) => doc.addEventListener(...args), localStorage: {getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v)}},
    Math: math, Date: {now: () => now},
    setInterval: (fn, ms) => { const id = nextId++; jobs.set(id, {fn, ms, interval: true}); return id; },
    setTimeout: (fn, ms) => { const id = nextId++; jobs.set(id, {fn, ms, interval: false}); return id; },
    clearInterval: id => jobs.delete(id), clearTimeout: id => jobs.delete(id)
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(code.replace(/\}\)\(\);\s*$/, `globalThis.api = {
    current, TYPES, genQuestion, genOptions, genBatch, levelRange, patternKey, preparePracticeScreen, loadQuestion, finishQuestion, showResult, resetSession, goHome, handleKey, submitTyped,
    getSession: () => session, setSession: x => session = x
  }; })();`), context);
  return {api: context.api, get, doc, jobs, storage, resetSeed: n => seed = n, advance: n => now += n};
}
function start(env, settings = {}) {
  Object.assign(env.api.current, settings);
  env.api.preparePracticeScreen();
  env.get('screen-practice').classList.add('active');
  env.get('startBtn').emit('click');
}
function firstQuestion(env) {
  const id = env.api.getSession().cdId;
  const fn = env.jobs.get(id).fn;
  for (let n = 0; n < 3; n++) { env.advance(1000); fn(); }
}

let batches = 0, checked = 0;
function validate(q, level, digits) {
  const n = q.text.match(/\d+(?:\.\d+)?/g).map(Number);
  let expected, primary = n[0];
  switch(q.type) {
    case 'addition': expected = n.reduce((a,b)=>a+b,0); assert.equal(n.length, level === 'expert' ? 3 : 2); break;
    case 'subtraction': expected = n[0]-n[1]; if(level !== 'expert') assert(expected>=0); break;
    case 'multiplication': expected = n[0]*n[1]; break;
    case 'division': expected = n[0]/n[1]; assert(Number.isInteger(expected)); break;
    case 'percentage': expected = Number((BigInt(Math.round(n[0]*10))*BigInt(n[1])).toString()) / 1000; primary=n[1]; break;
    case 'square': expected = Number(BigInt(n[0])**2n); break;
    case 'cube': expected = Number(BigInt(n[0])**3n); break;
    case 'exponent': expected = Number(BigInt(n[0])**BigInt(n[1])); break;
    case 'sqrt': expected = Math.round(Math.sqrt(n[0])); assert.equal(BigInt(expected)**2n,BigInt(n[0])); primary=expected; break;
    case 'cbrt': expected = Math.round(Math.cbrt(n[0])); assert.equal(BigInt(expected)**3n,BigInt(n[0])); primary=expected; break;
    default: assert.fail(q.type);
  }
  assert.equal(q.answer, expected, q.text);
  assert(Number.isFinite(q.answer) && Math.abs(q.answer)<=Number.MAX_SAFE_INTEGER);
  assert(primary>=10**(digits-1) && primary<10**digits, q.text+' digit contract');
  const bands = {2:[[10,36],[37,67],[68,99]],3:[[100,369],[370,684],[685,999]],4:[[1000,3699],[3700,6849],[6850,9999]]};
  const band = bands[digits][['beginner','intermediate','expert'].indexOf(level)];
  assert(primary>=band[0] && primary<=band[1], q.text+' level band');
  if(q.type==='multiplication'||q.type==='division') {
    const ranges=q.type==='multiplication'?[[2,9],[11,25],[26,99]]:[[2,9],[6,15],[11,25]];
    const range=ranges[['beginner','intermediate','expert'].indexOf(level)];
    assert(n[1]>=range[0]&&n[1]<=range[1]);
  }
  if(q.type==='exponent') assert(level==='beginner'?n[1]===2:level==='intermediate'?n[1]>=2&&n[1]<=3:n[1]>=3&&n[1]<=4);
  if(q.type==='addition'||q.type==='subtraction') for(const num of n) assert(num>=10**(digits-1)&&num<10**digits);
  if(q.options) {
    assert.equal(q.options.length,4); assert.equal(new Set(q.options).size,4); assert(q.options.includes(q.answer));
    for(const opt of q.options) assert(Number.isFinite(opt) && Math.abs(opt)<=Number.MAX_SAFE_INTEGER);
  }
  checked++;
}
{
 const e=boot();
 for(const level of ['beginner','intermediate','expert']) for(const digits of [2,3,4]) for(const type of e.api.TYPES)
 for(const count of [5,10,15,20]) for(const inputType of ['keyboard','mcq']) for(let seed=1;seed<=10;seed++) {
   e.resetSeed(seed*337); Object.assign(e.api.current,{level,digits,type,count,inputType});
   const batch=e.api.genBatch(); assert.equal(batch.length,count); assert.equal(new Set(batch.map(q=>q.id)).size,count);
   batch.forEach(q=>validate(q,level,digits)); batches++;
 }
 for(const digits of [2,3,4]) {
   const bands=[0,1,2].map(l=>e.api.levelRange(digits,l));
   assert(bands[0][1]<bands[1][0] && bands[1][1]<bands[2][0]);
 }
 for(const key of ['division','square','sqrt','cube','cbrt','exponent']) {
   function seq(digits){ e.resetSeed(42); Object.assign(e.api.current,{digits}); return JSON.stringify(Array.from({length:20},()=>e.api.genQuestion(key))); }
   assert.notEqual(seq(2),seq(4));
 }
 console.log('PASS',batches,'batches /',checked,'questions: exact arithmetic, unique IDs/options, digits, safe integers and increasing level bands');
}
{
 const e=boot();start(e);
 e.doc.emit('keydown',{key:'Enter',preventDefault(){}}); e.doc.emit('keydown',{key:'1',preventDefault(){}});
 assert.equal(e.api.getSession().skipped,0); assert.equal(e.api.getSession().currentAnswer,'');
 firstQuestion(e); const s=e.api.getSession(); const correct=s.questions[0].answer;
 e.advance(1250); for(const k of String(correct)) e.api.handleKey(k); e.api.submitTyped(); e.api.submitTyped();
 assert.equal(s.correct,1); assert.equal(s.review.length,1); assert.equal(s.review[0].time,1.25);
 console.log('PASS countdown input blocked, exact typed answers, millisecond timings and duplicate-submit guard');
}
{
 for(const marks of [1,2,3]) for(const neg of [0,0.25,0.33,0.5]) {
  const e=boot();start(e,{marks,neg});firstQuestion(e);const s=e.api.getSession();
  e.api.finishQuestion(s.questions[0].answer+1,false);assert.equal(s.marks,neg===0?0:-neg);
 }
 const e=boot();start(e);firstQuestion(e);const s=e.api.getSession();s.questions[0]={text:'10 + 10 = ?',answer:20};
 e.api.finishQuestion(20.009,false);assert.equal(s.wrong,1);
 const p=boot();start(p);firstQuestion(p);p.api.getSession().questions[0]={text:'12.5% of 103 = ?',answer:12.875};
 for(const k of '12.875')p.api.handleKey(k);p.api.submitTyped();assert.equal(p.api.getSession().correct,1);
 console.log('PASS all marking combinations, exact decimal grading, no tolerance false positives');
}
{
 for(const mode of ['tick','submit','visibilitychange','pageshow']) {
  const e=boot();start(e,{time:10});firstQuestion(e);const s=e.api.getSession();e.advance(30000);
  if(mode==='tick')e.jobs.get(s.timerId).fn();
  else if(mode==='submit')e.api.finishQuestion(s.questions[0].answer,false);
  else e.doc.emit(mode);
  assert.equal(s.correct,0);assert.equal(s.skipped,1);assert.equal(s.review[0].time,10);
 }
 const e=boot();start(e);firstQuestion(e);const s=e.api.getSession();e.api.finishQuestion(null,false);
 const stale=e.jobs.get(s.advanceId).fn;e.api.goHome();start(e);stale();assert.equal(e.api.getSession().index,0);
 console.log('PASS delayed timer/submission, hidden/restore deadline and stale-session cancellation');
}
{
 const e=boot(); e.storage.set('msb_best',JSON.stringify({addition:{pct:100,marks:'5'}}));
 function result(level,seconds,inputType='keyboard') {
  Object.assign(e.api.current,{level,count:5,inputType});
  e.api.setSession({phase:'feedback',marks:5,correct:5,wrong:0,skipped:0,bestStreak:5,review:Array.from({length:5},()=>({text:'1 + 1 = ?',answer:2,given:2,status:'ok',time:seconds}))});
  e.api.showResult();
 }
 result('beginner',5); result('beginner',2); assert(e.get('newBest').classList.contains('show'));
 result('expert',2);result('expert',2,'mcq');
 const best=JSON.parse(e.storage.get('msb_best_v2'));assert.equal(Object.keys(best).length,3);
 assert.equal(best['addition|beginner|2|20|keyboard|5|1|0'].correctAvg,2);
 assert.equal(JSON.parse(e.storage.get('msb_best')).addition.pct,100);
 console.log('PASS comparable pattern records, speed tie-breaks and preserved legacy records');
}
{
 const e=boot();start(e,{count:5});firstQuestion(e);
 for(let i=0;i<5;i++) {
   const s=e.api.getSession();e.advance(500);e.api.finishQuestion(s.questions[s.index].answer,false);e.jobs.get(s.advanceId).fn();
 }
 assert.equal(e.api.getSession().phase,'result');assert.equal(e.get('rCorrect').textContent,5);
 e.get('retryBtn').emit('click');assert.equal(e.api.getSession(),null);assert.equal(e.get('startWrap').style.display,'block');
 console.log('PASS full batch, results and retry lifecycle');
}
