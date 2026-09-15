#!/usr/bin/env node
// Rebuild Static GK's generated indexes without modifying the uploaded question bank.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, text) => fs.writeFileSync(path.join(root, file), text);
const file = 'Static_GK_Complete_Practice.html';
const version = '20260915staticgk1';
const html = read('Original Practice/' + file);
const master = JSON.parse(html.match(/<script id="master-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
const group = 'Static GK';
const chapters = Object.entries(master[group]);
const questions = chapters.reduce((n, [, sections]) => n + sections.reduce((s, sec) => s + sec.questions.length, 0), 0);
assert.equal(chapters.length, 20);
assert.equal(questions, 2642);
const hindi = ['भारत में प्रथम','भारत में सबसे बड़ा, ऊँचा और लंबा','विश्व में प्रथम','विश्व में सबसे बड़ा, ऊँचा और छोटा','प्रमुख व्यक्तियों से संबंधित स्थान','प्रसिद्ध व्यक्तियों के लोकप्रिय उपनाम','प्रमुख देशों से संबंधित तथ्य','राजधानियाँ, मुद्राएँ और भाषाएँ','लेखक और उनकी पुस्तकें','पुरस्कार','खेल जगत','भारतीय रक्षा और सुरक्षा','भारतीय परमाणु कार्यक्रम','भारत का अंतरिक्ष कार्यक्रम','अंतरराष्ट्रीय संगठन','कंप्यूटर','भारत में यूनेस्को विश्व धरोहर स्थल','कला और संस्कृति','संक्षिप्त रूप','महत्वपूर्ण दिवस'];
const chapterHi = { [group]: Object.fromEntries(chapters.map(([name], i) => [name, hindi[i]])) };
let page = html.replace(/^const CHAPTER_HI = .*;\n/m, '');
page = page.replace('const SUBJECT_META = {', 'const CHAPTER_HI = ' + JSON.stringify(chapterHi) + ';\nconst SUBJECT_META = {');
write('Original Practice/' + file, page);
const query = (chapter, section) => {
  const p = new URLSearchParams({subject: group});
  if (chapter) p.set('chapter', chapter);
  if (section != null) p.set('section', String(section + 1));
  return '?' + p;
};
function chapterRecords(prefix) {
  return [{title:'Static GK Complete Practice',hi:'सामान्य ज्ञान',url:prefix + file,section:'Original Practice',breadcrumb:'Original Practice / Static GK',leaf:false}, ...chapters.map(([chapter], i) => ({title:chapter,url:prefix + file + query(chapter),section:'Original Practice',breadcrumb:'Original Practice / Static GK',leaf:true,hi:hindi[i]}))];
}
for (const [target, global, prefix] of [
  ['search-index-main.js','SEARCH_INDEX','./Original%20Practice/'],
  ['Original Practice/original-practice-index.js','EFP_ORIGINAL_PRACTICE_INDEX','./']
]) {
  const context = {window:{}};
  vm.runInNewContext(read(target), context);
  const rows = (context[global] || context.window[global]).filter(row => !String(row.url).includes(file));
  const insertion = rows.reduce((n, row, i) => row.section === 'Original Practice' ? i + 1 : n, rows.length);
  rows.splice(insertion, 0, ...chapterRecords(prefix));
  write(target, (global === 'SEARCH_INDEX' ? 'var ' : 'window.') + global + ' = ' + JSON.stringify(rows) + ';\n');
}
const bilingual = value => typeof value === 'string' ? value : [value?.en, value?.hi].filter(Boolean).join(' ');
const snippets = chapters.flatMap(([chapter, sections]) => sections.map((sec, si) => ({
  f:'./Original%20Practice/' + file + query(chapter, si),
  t:bilingual(sec.title),
  b:'Original Practice / Static GK / Static GK / ' + chapter,
  x:sec.questions.map((q, qi) => String.fromCharCode(0xE000 + qi) + [q.q, q.a, q.exp, ...q.o].map(bilingual).join(' '))
})));
write('search-snippets-static-gk-original-practice.js', '// Static GK full-text search; lazy-loaded section records, with question deep links.\nwindow.EF_STATIC_GK_ORIGINAL_PRACTICE_SNIPPET_INDEX = ' + JSON.stringify(snippets) + ';\n');
const counts = JSON.parse(read('Original Practice/question-counts.json'));
counts.subjects.staticgk = {filename:file,label:group,hi:'सामान्य ज्ञान',slug:'staticgk',icon:'fa-bullseye',questions,chapters:chapters.length,subjects:[{name:group,questions,chapters:chapters.length}]};
counts.total_questions = Object.values(counts.subjects).reduce((n, s) => n + s.questions, 0);
counts.total_chapters = Object.values(counts.subjects).reduce((n, s) => n + s.chapters, 0);
write('Original Practice/question-counts.json', JSON.stringify(counts, null, 2) + '\n');
let index = read('Original Practice/index.html').replaceAll('43,772', counts.total_questions.toLocaleString('en-US')).replaceAll('179 chapters', counts.total_chapters + ' chapters').replaceAll('179 Chapters', counts.total_chapters + ' Chapters');
index = index.replace('Ecology and English Grammar for', 'Ecology, English Grammar and Static GK for').replace('· English Grammar</p>', '· English Grammar · Static GK</p>');
if (!index.includes('data-progress-key="efp_visited_originalpractice_staticgk"')) {
  const card = '    <a class="subject-card" href="./' + file + '" data-progress-key="efp_visited_originalpractice_staticgk" data-total-chapters="20"><div class="subject-top"><span class="subject-icon">🎯</span><span class="original-badge">ORIGINAL</span></div><h2>Static GK <span>सामान्य ज्ञान</span></h2><p>2,642 Questions · 20 Chapters</p><div class="progress-line"><span class="progress-copy">0 / 20 chapters opened</span><span>→</span></div></a>\n';
  assert(index.includes('  </section>\n  <section class="features">'));
  index = index.replace('  </section>\n  <section class="features">', card + '  </section>\n  <section class="features">');
}
index = index.replace(/original-practice-index\.js\?v=[^"']+/g, 'original-practice-index.js?v=' + version).replace(/back-parent-map\.js\?v=[^"']+/g, 'back-parent-map.js?v=' + version);
write('Original Practice/index.html', index);
let mix = read('Original Practice/Mixed_Practice.html').replace('English Grammar or specific', 'English Grammar, Static GK or specific').replace('grid-template-columns:repeat(6,minmax(0,1fr))', 'grid-template-columns:repeat(4,minmax(0,1fr))');
write('Original Practice/Mixed_Practice.html', mix);
let home = read('index.html').replaceAll('43,772', counts.total_questions.toLocaleString('en-US')).replace(/search-index-main\.js\?v=[^"']+/g, 'search-index-main.js?v=' + version);
home = home.replace(/(<script id="efLandingCountsData" type="application\/json">)(.*?)(<\/script>)/s, (_, start, json, end) => {
  const data = JSON.parse(json); data['./Original Practice/index.html'].total = counts.total_questions;
  return start + JSON.stringify(data) + end;
});
write('index.html', home);
let back = read('back-parent-map.js');
back = back.replace(/Object\.freeze\((\{.*\})\)/s, (_, json) => {const map = JSON.parse(json);map['/Original Practice/' + file] = '/Original Practice/index.html';return 'Object.freeze(' + JSON.stringify(map) + ')';});
write('back-parent-map.js', back);
let sitemap = read('sitemap.xml');
if (!sitemap.includes('/Original%20Practice/' + file)) sitemap = sitemap.replace('</urlset>', '  <url>\n    <loc>https://examfusionprep.com/Original%20Practice/' + file + '</loc>\n    <lastmod>2026-09-15</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n</urlset>');
write('sitemap.xml', sitemap);
let llms = read('llms.txt');
if (!llms.includes('- [Original Practice]')) llms = llms.replace('## Main study sections\n', '## Main study sections\n\n- [Original Practice](https://examfusionprep.com/Original%20Practice/index.html): 46,414 bilingual questions across 199 chapters, including Static GK and English Grammar, with bookmarks, chapter progress, search and Random Mixed Practice.\n');
write('llms.txt', llms);
console.log(JSON.stringify({questions,chapters:chapters.length,sections:snippets.length,totalQuestions:counts.total_questions,totalChapters:counts.total_chapters}));
