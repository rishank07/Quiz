const fs = require('node:fs');
const cp = require('node:child_process');
const crypto = require('node:crypto');

const ROOT = '.';
const POLITY = 'Original Practice/Polity_Complete_Practice.html';
const SNIPPETS = 'search-snippets-original-practice.js';
const POLITY_SNIPPETS = 'search-snippets-polity-original-practice.js';
const WORKER = 'search-worker.js';
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
  const prev = fs.existsSync(p) ? read(p) : null;
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
  const src = read(POLITY);
  const tag = '<script id="master-data" type="application/json">';
  const s = src.indexOf(tag);
  const e = src.indexOf('</script>', s + tag.length);
  if (s < 0 || e < 0) throw new Error('History master-data not found');
  return {src, data: JSON.parse(src.slice(s + tag.length, e))};
}

function expectedPolityRecords(data) {
  const polity = data['Indian Polity'];
  if (!polity) throw new Error('Indian Polity master group missing');
  const chapters = Object.keys(polity);
  if (chapters.length !== 22) throw new Error('Indian Polity chapter count changed: ' + chapters.length);
  const out = [];
  let questions = 0;
  for (const chapter of chapters) {
    const sections = polity[chapter];
    for (let si = 0; si < sections.length; si++) {
      const sec = sections[si];
      const params = new URLSearchParams({subject: 'Indian Polity', chapter});
      out.push({
        f: './Original%20Practice/Polity_Complete_Practice.html?' + params.toString() + '&section=' + (si + 1),
        t: bilingual(sec.title),
        b: 'Original Practice / Polity / Indian Polity / ' + chapter,
        x: sec.questions.map(qtext)
      });
      questions += sec.questions.length;
    }
  }
  if (questions !== 4052) throw new Error('Indian Polity question count changed: ' + questions);
  if (out.length !== 248) throw new Error('Indian Polity section-group count changed: ' + out.length);
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
  const polityNow = arr.filter(r => String(r.b || '').startsWith('Original Practice / Polity / Indian Polity / '));
  if (polityNow.length !== records.length) throw new Error('Existing Indian Polity snippet group count mismatch: ' + polityNow.length);
  let replaced = 0;
  arr.forEach(r => { if (expected.has(r.f)) replaced++; });
  if (replaced !== records.length) throw new Error('Polity snippet route mismatch');
  // Keep the large shared base intact; the worker applies this small subject update.
  const overlay = '// Generated from audited Original Practice Polity master data.\n'
    + 'window.EF_POLITY_ORIGINAL_PRACTICE_SNIPPET_INDEX = ' + JSON.stringify(records) + ';\n'
    + '(function(){var base=window.EF_ORIGINAL_PRACTICE_SNIPPET_INDEX,updates=window.EF_POLITY_ORIGINAL_PRACTICE_SNIPPET_INDEX;'
    + 'if(!Array.isArray(base))throw new Error("Original Practice base index missing");'
    + 'var byRoute={},count=0;updates.forEach(function(r){byRoute[r.f]=r});'
    + 'window.EF_ORIGINAL_PRACTICE_SNIPPET_INDEX=base.map(function(r){if(!byRoute[r.f])return r;count++;return byRoute[r.f]});'
    + 'if(count!==updates.length)throw new Error("Polity search routes changed");})();\n';
  writeIfChanged(POLITY_SNIPPETS, overlay, changed);
}

function bumpSearchConsumers(politySrc, changed) {
  const baseSnippetRe = /search-snippets-original-practice\.js\?v=[^"'\s)]+/g;
  for (const p of [HOME, OP_INDEX, OP_RUNTIME]) {
    const src = read(p);
    const next = src.replace(baseSnippetRe, 'search-snippets-original-practice.js?v=' + VERSION);
    if (next === src && !src.includes('search-snippets-original-practice.js?v=' + VERSION)) {
      throw new Error('Base Original Practice snippet consumer not found in ' + p);
    }
    writeIfChanged(p, next, changed);
  }

  let polityNext = politySrc.replace(/\.\/original-practice\.js\?v=[^"']+/g, './original-practice.js?v=' + VERSION);
  if (polityNext === politySrc && !politySrc.includes('./original-practice.js?v=' + VERSION)) {
    throw new Error('History runtime script reference not found');
  }
  writeIfChanged(POLITY, polityNext, changed);

  const mixed = read(MIXED);
  // Version Polity's filename independently so History's existing version remains intact.
  const filenameRe = /var filename=FILES\[fileKey\](?:\+\(fileKey==='polity'\?'\?v=[^']+':''\))?;/;
  const mixedNext = mixed.replace(filenameRe, "var filename=FILES[fileKey]+(fileKey==='polity'?'?v=" + VERSION + "':'');");
  if (mixedNext === mixed && !mixed.includes("fileKey==='polity'?'?v=" + VERSION)) {
    throw new Error('Mixed Practice Polity data loader not found');
  }
  writeIfChanged(MIXED, mixedNext, changed);

  const worker = read(WORKER);
  const overlayRe = /    \/\/ Polity audit overlay\n[\s\S]*?    \/\/ End Polity audit overlay\n/;
  const overlayLoader = '    // Polity audit overlay\n'
    + '    if (config.globalName === "EF_ORIGINAL_PRACTICE_SNIPPET_INDEX") {\n'
    + '      importScripts(new URL("./search-snippets-polity-original-practice.js?v=' + VERSION + '", config.indexUrl).href);\n'
    + '    }\n    // End Polity audit overlay\n';
  let workerNext;
  if (overlayRe.test(worker)) workerNext = worker.replace(overlayRe, overlayLoader);
  else {
    const point = '    importScripts(config.indexUrl);\n';
    if (!worker.includes(point)) throw new Error('Search worker initialization point missing');
    workerNext = worker.replace(point, point + overlayLoader);
  }
  writeIfChanged(WORKER, workerNext, changed);
  for (const p of [HOME, OP_INDEX, OP_RUNTIME]) {
    writeIfChanged(p, read(p).replace(/search-worker\.js\?v=[^"'\s)]+/g, 'search-worker.js?v=' + VERSION), changed);
  }

  const sw = read(SW);
  let swNext = sw.replace(/const CACHE_VERSION = "efp-pwa-[^"]+";/, 'const CACHE_VERSION = "efp-pwa-' + VERSION + '";');
  swNext = swNext.replace(/\/search-worker\.js(?:\?v=[^"']+)?/g, '/search-worker.js?v=' + VERSION);
  swNext = swNext.replace(/\/Original%20Practice\/original-practice\.js\?v=[^"']+/g, '/Original%20Practice/original-practice.js?v=' + VERSION);
  writeIfChanged(SW, swNext, changed);
}

function refreshSitemap(changed) {
  const src = read(SITEMAP);
  const next = src.replace(/<url>[\s\S]*?<\/url>/g, block => {
    const m = block.match(/<loc>([^<]+)<\/loc>/);
    if (!m) return block;
    const loc = m[1].replace(/&amp;/g, '&');
    const isPolityMain = loc === 'https://examfusionprep.com/Original%20Practice/Polity_Complete_Practice.html';
    const isPolity = loc.startsWith('https://examfusionprep.com/Original%20Practice/Polity_Complete_Practice.html?') && loc.includes('subject=Indian+Polity');
    if (!isPolityMain && !isPolity) return block;
    return block.replace(/<lastmod>[^<]*<\/lastmod>/, '<lastmod>' + LASTMOD + '</lastmod>');
  });
  writeIfChanged(SITEMAP, next, changed);
}

const {src: politySrc, data} = parseMaster();
const digest = crypto.createHash('sha256').update(JSON.stringify(data['Indian Polity'])).digest('hex').slice(0, 12);
const VERSION = '20261001polity22-' + digest;
const {records, questions} = expectedPolityRecords(data);
const changed = [];
rebuildSharedSnippet(records, changed);
bumpSearchConsumers(politySrc, changed);
refreshSitemap(changed);

if (!changed.length) {
  console.log('Polity search/index sync already current: 22 chapters, ' + questions + ' questions, ' + records.length + ' section groups.');
  process.exit(0);
}

console.log('Synced Polity search/index: ' + changed.join(', '));
console.log('Coverage: 22 chapters, ' + questions + ' questions, ' + records.length + ' section groups.');

if (commit) {
  cp.execFileSync('git', ['add', '--', ...changed], {stdio: 'inherit'});
  cp.execFileSync('git', ['commit', '-m', 'Sync Polity Original Practice search indexes'], {stdio: 'inherit'});
  cp.execFileSync('git', ['push', 'origin', 'HEAD:master'], {stdio: 'inherit'});
}
