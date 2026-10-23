const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {JSDOM} = require(process.env.EFP_TEST_JSDOM || 'jsdom');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const html = read('Maths Speed Booster/math-speed-booster.html');

function create() {
  // No resources are fetched: GA and all third-party network requests are absent.
  const dom = new JSDOM(html, {url:'http://localhost/Maths%20Speed%20Booster/math-speed-booster.html?efpWorkPreview=1', runScripts:'outside-only', pretendToBeVisual:true});
  const w = dom.window, d = w.document;
  let now = 100000, nextId = 1;
  const jobs = new Map();
  w.Date.now = () => now;
  w.setTimeout = (fn, ms = 0) => {const id=nextId++; jobs.set(id,{fn,due:now+ms});return id;};
  w.setInterval = (fn, ms) => {const id=nextId++; jobs.set(id,{fn,due:now+ms,interval:ms});return id;};
  w.clearTimeout = w.clearInterval = id => jobs.delete(id);
  function tick(ms) {
    const end=now+ms;
    for(let limit=0;limit<10000;limit++) {
      const pending=[...jobs].filter(([,j])=>j.due<=end).sort((a,b)=>a[1].due-b[1].due)[0];
      if(!pending) {now=end;return;}
      const [id,j]=pending;now=j.due;
      if(j.interval)j.due+=j.interval;else jobs.delete(id);
      j.fn();
    }
    assert.fail('Timer did not settle');
  }
  const run = code => vm.runInContext(code, dom.getInternalVMContext());
  run(d.getElementById('efp-analytics-guard').textContent);
  assert.equal(w.EFP_ANALYTICS_EXCLUDED,true);
  w.localStorage.setItem('msb_sound','0');
  run(read('Maths Speed Booster/math-speed-booster.js'));
  const click = s => {const el=d.querySelector(s);assert(el,s);el.click();};
  const key = value => d.dispatchEvent(new w.KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true}));
  const pill = (id,value) => click('#'+id+' [data-val="'+value+'"]');
  const topic = name => {const b=[...d.querySelectorAll('.p-card')].find(b=>b.querySelector('.nm').textContent===name);assert(b,name);b.click();};
  const type = value => {for(const k of String(value))key(k);key('Enter');};
  return {dom,w,d,tick,click,key,pill,topic,type};
}
function answer(text) {
 const n=text.match(/\d+(?:\.\d+)?/g).map(Number);
 if(text.includes('%'))return Number(BigInt(Math.round(n[0]*10))*BigInt(n[1]))/1000;
 if(text.includes('+'))return n.reduce((a,b)=>a+b,0);
 if(text.includes('−'))return n[0]-n[1];
 if(text.includes('×'))return n[0]*n[1];
 if(text.includes('÷'))return n[0]/n[1];
 if(text.includes('²'))return Number(BigInt(n[0])**2n);
 if(text.includes('³'))return Number(BigInt(n[0])**3n);
 if(text.includes('√'))return Math.round(Math.sqrt(n[0]));
 if(text.includes('∛'))return Math.round(Math.cbrt(n[0]));
 if(text.includes('^'))return Number(BigInt(n[0])**BigInt(n[1]));
 assert.fail(text);
}
{
 const e=create(),{d}=e;
 assert.equal(d.querySelectorAll('.p-card').length,11);
 e.topic('Addition');e.pill('countOptions',5);e.pill('marksOptions',2);e.pill('negOptions',0.25);e.click('#setBtn');
 assert(d.getElementById('startHint').textContent.includes('−0.25 for each wrong answer'));
 e.click('#startBtn');e.key('Enter');e.key('1');assert.equal(d.getElementById('qCount').textContent,'Ready');
 e.tick(3000);assert.equal(d.getElementById('qCount').textContent,'Question 1 of 5');
 e.type(answer(d.getElementById('qText').textContent)+1);assert.equal(d.getElementById('marksVal').textContent,'-0.25');
 e.tick(1900);
 for(let i=1;i<5;i++){e.tick(1250);e.type(answer(d.getElementById('qText').textContent));e.tick(900);}
 assert(d.getElementById('resultOverlay').classList.contains('active'));
 assert.equal(d.getElementById('rMarks').textContent,'7.75');
 assert.equal(d.querySelectorAll('.rev-item').length,5);assert(d.getElementById('avgTime').textContent.includes('1.25s'));
 e.click('#retryBtn');assert.equal(d.getElementById('startWrap').style.display,'block');
 e.click('#backBtn');assert(d.getElementById('screen-home').classList.contains('active'));
 e.topic('Addition');assert(d.getElementById('settingsSub').textContent.includes('Best for this pattern'));
 e.dom.window.close();console.log('PASS DOM keyboard countdown, settings, grading, review, retry, home and saved pattern');
}
{
 const e=create(),{d}=e;
 e.topic('Exponent');e.pill('countOptions',20);e.pill('levelOptions','expert');e.pill('digitOptions',4);e.pill('inputTypeOptions','mcq');
 assert.equal(d.getElementById('digitLabel').textContent,'Digits in the base number');
 e.click('#setBtn');e.click('#startBtn');e.tick(3000);
 const seen=new Set();let long=false;
 for(let i=0;i<20;i++){
  const question=d.getElementById('qText').textContent;assert(!seen.has(question));seen.add(question);
  const opts=[...d.querySelectorAll('.mcq-opt')];assert.equal(new Set(opts.map(o=>o.textContent)).size,4);
  const correct=opts.find(o=>Number(o.textContent)===answer(question));assert(correct);long ||= correct.textContent.length>=15;
  e.tick(500);correct.click();assert(correct.classList.contains('ok'));assert(opts.every(o=>o.disabled));e.tick(900);
 }
 assert(long);assert.equal(d.getElementById('rCorrect').textContent,'20');assert.equal(d.getElementById('resultPct').textContent,'100%');
 e.click('#homeBtn');e.topic('Square Root');assert.equal(d.getElementById('digitLabel').textContent,'Digits in the root answer');
 e.dom.window.close();console.log('PASS DOM 20 unique Expert 4-digit MCQs, long exact answers, disabled options and root digit guidance');
}
{
 const e=create(),{d}=e;e.topic('Addition');e.pill('timeOptions',10);e.click('#setBtn');e.click('#startBtn');e.tick(3000);e.tick(10000);
 assert(d.getElementById('feedback').textContent.includes('Time up!'));assert.equal(d.getElementById('marksVal').textContent,'0');
 e.dom.window.close();
 const src=[...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(m=>m[1]);
 const asset=src.find(s=>s.startsWith('math-speed-booster.js?'));assert(asset);
 assert(read('service-worker.js').includes('/Maths%20Speed%20Booster/'+asset));
 assert.equal((html.match(/gtag\("config"/g)||[]).length,1);
 console.log('PASS DOM timeout, versioned script/offline shell consistency and single GA initialization');
}
