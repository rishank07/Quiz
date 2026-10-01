const fs = require('node:fs');
const cp = require('node:child_process');
const crypto = require('node:crypto');

const ROOT = '.';
const HISTORY = 'Original Practice/History_Complete_Practice.html';
const SNIPPETS = 'search-snippets-original-practice.js';
const HOME = 'index.html';
const OP_INDEX = 'Original Practice/index.html';
const OP_RUNTIME = 'Original Practice/original-practice.js';
const MIXED = 'Original Practice/Mixed_Practice.html';
const SITEMAP = 'sitemap.xml';
const SW = 'service-worker.js';
const LASTMOD = '2026-10-01';
const commit = process.argv.includes('--commit');

const read = p => fs.readFileSync(p, 'utf8');
const writeIfChanged = (p, next, changed) => {
  const prev = read(p);
  if (prev === next) return;
  fs.writeFileSync(p, next);
  changed.push(p);
};

function bilingual(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  const en = v.en || '';
  const hi = v.hi || '';
  return hi && hi !== en ? en + ' / ' + hi : (en || hi);
}

function qtext(q, i) {
  const qen = q.q?.en || '', qhi = q.q?.hi || '';
  const aen = q.a?.en || '', ahi = q.a?.hi || '';
  const een = q.exp?.en || '', ehi = q.exp?.hi || '';
  // Preserve the legacy two-marker convention already used by this shared index.
  const marker = String.fromCharCode(0xE000 + i);
  const parts = [marker + marker + qen];
  if (qhi !== qen) parts.push(qhi);
  parts.push('Answer: ' + aen);
  if (ahi !== aen) parts.push('उत्तर: ' + ahi);
  parts.push('Explanation: ' + een);
  if (ehi !== een) parts.push('व्याख्या: ' + ehi);
  return parts.filter(Boolean).join(' ');
}

function parseMaster() {
  const src = read(HISTORY);
  const tag = '<script id="master-data" type="application/json">';
  const s = src.indexOf(tag);
  const e = src.indexOf('</script>', s + tag.length);
  if (s < 0 || e < 0) throw new Error('History master-data not found');
  return {src, data: JSON.parse(src.slice(s + tag.length, e))};
}

function expectedModernRecords(data) {
  const modern = data['Modern History'];
  if (!modern) throw new Error('Modern History master group missing');
  const chapters = Object.keys(modern);
  if (chapters.length !== 13) throw new Error('Modern History chapter count changed: ' + chapters.length);
  const out = [];
  let questions = 0;
  for (const chapter of chapters) {
    const sections = modern[chapter];
    for (let si = 0; si < sections.length; si++) {
      const sec = sections[si];
      const params = new URLSearchParams({subject: 'Modern History', chapter});
      out.push({
        f: './Original%20Practice/History_Complete_Practice.html?' + params.toString() + '&section=' + (si + 1),
        t: bilingual(sec.title),
        b: 'Original Practice / History / Modern History / ' + chapter,
        x: sec.questions.map(qtext)
      });
      questions += sec.questions.length;
    }
  }
  if (questions !== 1744) throw new Error('Modern History question count changed: ' + questions);
  if (out.length !== 294) throw new Error('Modern History section-group count changed: ' + out.length);
  return {records: out, questions};
}

function rebuildSharedSnippet(records, changed) {
  const src = read(SNIPPETS);
  const marker = 'window.EF_ORIGINAL_PRACTICE_SNIPPET_INDEX = ';
  const s = src.indexOf(marker);
  const e = src.lastIndexOf(';');
  if (s < 0 || e < 0) throw new Error('Shared Original Practice snippet marker missing');
  const arr = JSON.parse(src.slice(s + marker.length, e));
  const expected = new Map(records.map(r => [r.f, r]));
  const modernNow = arr.filter(r => String(r.b || '').startsWith('Original Practice / History / Modern History / '));
  if (modernNow.length !== records.length) throw new Error('Existing Modern History snippet group count mismatch: ' + modernNow.length);
  let replaced = 0;
  const next = arr.map(r => {
    const v = expected.get(r.f);
    if (!v) return r;
    replaced++;
    return v;
  });
  if (replaced !== records.length) throw new Error('Modern History snippet route mismatch: replaced ' + replaced + ' of ' + records.length);
  const nextText = src.slice(0, s + marker.length) + JSON.stringify(next) + src.slice(e);
  writeIfChanged(SNIPPETS, nextText, changed);
}

function bumpSearchConsumers(historySrc, changed) {
  const baseSnippetRe = /search-snippets-original-practice\.js\?v=[^"'\s)]+/g;
  for (const p of [HOME, OP_INDEX, OP_RUNTIME]) {
    const src = read(p);
    const next = src.replace(baseSnippetRe, 'search-snippets-original-practice.js?v=' + VERSION);
    if (next === src && !src.includes('search-snippets-original-practice.js?v=' + VERSION)) {
      throw new Error('Base Original Practice snippet consumer not found in ' + p);
    }
    writeIfChanged(p, next, changed);
  }

  let historyNext = historySrc.replace(/\.\/original-practice\.js\?v=[^"']+/g, './original-practice.js?v=' + VERSION);
  if (historyNext === historySrc && !historySrc.includes('./original-practice.js?v=' + VERSION)) {
    throw new Error('History runtime script reference not found');
  }
  writeIfChanged(HISTORY, historyNext, changed);

  const mixed = read(MIXED);
  const mixedNext = mixed.replace(/fetch\('\.\/'\+filename(?:\+\(fileKey==='history'\?'\?v=[^']+':''\))?,\{cache:'force-cache'\}\)/, "fetch('./'+filename+(fileKey==='history'?'?v=" + VERSION + "':''),{cache:'force-cache'})");
  if (mixedNext === mixed && !mixed.includes("fileKey==='history'?'?v=" + VERSION)) {
    throw new Error('Mixed Practice History data loader not found');
  }
  writeIfChanged(MIXED, mixedNext, changed);

  const sw = read(SW);
  let swNext = sw.replace(/const CACHE_VERSION = "efp-pwa-[^"]+";/, 'const CACHE_VERSION = "efp-pwa-' + VERSION + '";');
  swNext = swNext.replace(/\/Original%20Practice\/original-practice\.js\?v=[^"']+/g, '/Original%20Practice/original-practice.js?v=' + VERSION);
  writeIfChanged(SW, swNext, changed);
}

function refreshSitemap(changed) {
  const src = read(SITEMAP);
  const next = src.replace(/<url>[\s\S]*?<\/url>/g, block => {
    const m = block.match(/<loc>([^<]+)<\/loc>/);
    if (!m) return block;
    const loc = m[1].replace(/&amp;/g, '&');
    const isHistoryMain = loc === 'https://examfusionprep.com/Original%20Practice/History_Complete_Practice.html';
    const isModern = loc.startsWith('https://examfusionprep.com/Original%20Practice/History_Complete_Practice.html?') && loc.includes('subject=Modern+History');
    if (!isHistoryMain && !isModern) return block;
    return block.replace(/<lastmod>[^<]*<\/lastmod>/, '<lastmod>' + LASTMOD + '</lastmod>');
  });
  writeIfChanged(SITEMAP, next, changed);
}

const {src: historySrc, data} = parseMaster();
const digest = crypto.createHash('sha256').update(JSON.stringify(data['Modern History'])).digest('hex').slice(0, 12);
const VERSION = '20261001modern13-' + digest;
const {records, questions} = expectedModernRecords(data);
const changed = [];
rebuildSharedSnippet(records, changed);
bumpSearchConsumers(historySrc, changed);
refreshSitemap(changed);

if (!changed.length) {
  console.log('Modern History search/index sync already current: 13 chapters, ' + questions + ' questions, ' + records.length + ' section groups.');
  process.exit(0);
}

console.log('Synced Modern History search/index: ' + changed.join(', '));
console.log('Coverage: 13 chapters, ' + questions + ' questions, ' + records.length + ' section groups.');

if (commit) {
  cp.execFileSync('git', ['add', '--', ...changed], {stdio: 'inherit'});
  cp.execFileSync('git', ['commit', '-m', 'Sync Modern History Original Practice search indexes'], {stdio: 'inherit'});
  cp.execFileSync('git', ['push', 'origin', 'HEAD:master'], {stdio: 'inherit'});
}
