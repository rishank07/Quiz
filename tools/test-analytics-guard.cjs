const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'analytics-guard.js'), 'utf8');
function storage(data = new Map(), blocked = false) {
  return { getItem(k) { if (blocked) throw Error('blocked'); return data.get(k) || null; },
    setItem(k,v) { if (blocked) throw Error('blocked'); data.set(k,v); },
    removeItem(k) { if (blocked) throw Error('blocked'); data.delete(k); } };
}
function run(url, options = {}) {
  const u = new URL(url), win = {}, doc = {readyState: 'loading', addEventListener() {}};
  let cookie = options.cookie || '';
  Object.defineProperty(doc, 'cookie', {get() {return cookie;}, set(value) {
    cookie = value.includes('Max-Age=0') ? '' : value.split(';')[0];
  }});
  const context = vm.createContext({window: win, document: doc, location: u, URLSearchParams,
    navigator: {webdriver: !!options.webdriver}, localStorage: storage(options.local, options.blocked),
    sessionStorage: storage(options.session, options.blocked), Promise, CustomEvent: class {}});
  vm.runInContext(code, context);
  if (options.ownerScript) vm.runInContext(fs.readFileSync(path.join(root, 'owner-debug.js'), 'utf8'), context);
  return {win, cookie};
}
const disabled = result => result.win['ga-disable-G-Q1WNRY8ECV'] === true;
for (const url of ['https://examfusionprep.com/', 'https://www.examfusionprep.com/chapter.html?efSearchQuery=Gandhi']) {
  assert.equal(disabled(run(url)), false, 'Normal production visitors must count');
  assert.equal(disabled(run(url, {blocked:true})), false, 'Storage-blocked students must count');
}
for (const url of ['http://localhost:3000/', 'http://127.0.0.1:8080/', 'https://preview.chatgpt-team.site/quiz.html',
  'https://examfusionprep.com.evil.example/', 'file:///tmp/index.html']) {
  assert(disabled(run(url, {blocked:true})), 'Preview must be excluded without storage');
}
assert(disabled(run('https://examfusionprep.com/', {webdriver:true})));
assert(disabled(run('https://examfusionprep.com/', {local:new Map([['efp_owner_debug_ga4','on']])})));
const local = new Map(), session = new Map();
const first = run('https://examfusionprep.com/?efpWorkPreview=1', {local, session, ownerScript:true});
assert(disabled(first), 'First live visit and owner OFF must stay excluded');
assert(disabled(run('https://examfusionprep.com/Books/page.html', {local, session, ownerScript:true})));
assert(disabled(run('https://examfusionprep.com/Original%20Practice/index.html', {local})), 'New tab must stay excluded');
assert(disabled(run('https://examfusionprep.com/quiz.html', {cookie:first.cookie, blocked:true})), 'Cookie fallback');
assert(disabled(run('https://examfusionprep.com/?efpWorkPreview=1', {blocked:true})), 'First mark works without storage');
assert.equal(disabled(run('https://examfusionprep.com/?efpWorkPreview=0', {local, session, cookie:first.cookie})), false);
assert.equal(disabled(run('https://examfusionprep.com/quiz.html', {local, session})), false);
assert(disabled(run('https://examfusionprep.com/?efpWorkPreview=0', {local:new Map([['efp_owner_debug_ga4','on']])})), 'Clear preview must preserve owner exclusion');
assert(disabled(run('http://localhost/?efpWorkPreview=0')), 'Clear marker must preserve automatic preview exclusion');

function htmlFiles(dir) {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.name === '.git' ? [] :
    e.isDirectory() ? htmlFiles(path.join(dir,e.name)) : e.name.endsWith('.html') ? [path.join(dir,e.name)] : []);
}
let pages = 0;
const expected = code.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map(x=>x.trim()).filter(Boolean).join(' ');
for (const file of htmlFiles(root)) {
  const html = fs.readFileSync(file,'utf8');
  if (!/googletagmanager\.com\/gtag\/js|gtag\s*\(/.test(html)) continue;
  const tags = [...html.matchAll(/<script\b[^>]*\bid=["']efp-analytics-guard["'][^>]*>([\s\S]*?)<\/script>/gi)];
  assert.equal(tags.length, 1, file + ': exactly one early guard');
  assert.equal(tags[0][1], expected, file + ': shared source is current');
  assert(tags[0].index < html.search(/googletagmanager\.com\/gtag\/js|gtag\s*\(/), file + ': guard must precede GA');
  assert(disabled(run('http://localhost/')));
  pages++;
}
console.log('PASS: live/preview, persistence, storage fallback, owner compatibility, and early guards on', pages, 'tracked pages');
