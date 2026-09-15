#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const file = 'Static_GK_Complete_Practice.html';
const html = read('Original Practice/' + file);
const extract = s => s.match(/<script id="master-data"[^>]*>([\s\S]*?)<\/script>/)[1];
// The first integrated version is compared to the uploaded source commit.
const original = execFileSync('git', ['show', '4c49cbdeecb58a71c934ec33d993ad4cdf1edf8b:Original Practice/' + file], {cwd:root,maxBuffer:20e6,encoding:'utf8'});
assert.equal(extract(html), extract(original), 'Question/answer/option/explanation data changed');
const master = JSON.parse(extract(html));
const chapters = Object.entries(master['Static GK']);
const qs = chapters.flatMap(([, ss]) => ss.flatMap(s => s.questions));
assert.equal(chapters.length, 20); assert.equal(qs.length, 2642);
qs.forEach((q, i) => {assert(q.o.some(o => o.en === q.a.en), 'Missing correct option ' + i);assert(q.exp.en && q.exp.hi, 'Missing explanation ' + i)});
const counts = JSON.parse(read('Original Practice/question-counts.json'));
assert.equal(counts.subjects.staticgk.questions, qs.length);
assert.equal(counts.total_questions, Object.values(counts.subjects).reduce((n,s) => n + s.questions,0));
assert.equal(counts.total_chapters, Object.values(counts.subjects).reduce((n,s) => n + s.chapters,0));
for (const f of [file.replace(/^/, 'Original Practice/'), 'Original Practice/Mixed_Practice.html', 'Original Practice/index.html', 'index.html']) {
  for (const match of read(f).matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    if (/type="application\/(?:ld\+)?json"/.test(match[1] || '')) continue;
    new vm.Script(match[2], {filename:f});
  }
}
const indexContext = {window:{}};
vm.runInNewContext(read('Original Practice/original-practice-index.js'), indexContext);
const rows = indexContext.window.EFP_ORIGINAL_PRACTICE_INDEX.filter(r => r.url.includes(file));
assert.equal(rows.filter(r => r.leaf).length, 20);
rows.filter(r => r.leaf).forEach(r => {const u=new URL(r.url,'https://examfusionprep.com/Original%20Practice/');assert.equal(u.searchParams.get('subject'),'Static GK');assert(master['Static GK'][u.searchParams.get('chapter')])});
const context = {window:{},postMessage:m => messages.push(m)};
context.self = context;
context.window = context;
const messages=[];
context.importScripts = f => vm.runInNewContext(read(path.basename(f.split('?')[0])),context);
vm.runInNewContext(read('search-worker.js'), context);
context.self.onmessage({data:{type:'init',options:{indexUrl:'search-snippets-static-gk-original-practice.js',globalName:'EF_STATIC_GK_ORIGINAL_PRACTICE_SNIPPET_INDEX',mode:'snippet',limit:24,sectionPrefix:'./Original%20Practice/'}}});
assert.equal(messages.at(-1).type,'ready');
const snippets = context.window.EF_STATIC_GK_ORIGINAL_PRACTICE_SNIPPET_INDEX;
assert.equal(snippets.length,280);assert.equal(snippets.reduce((n,s)=>n+s.x.length,0),2642);
for (const query of ['first President of India', 'Rajendra Prasad', '26 January 1950', 'पहले राष्ट्रपति', 'World Heritage']) {
  context.self.onmessage({data:{type:'search',id:1,query}});
  assert.equal(messages.at(-1).type,'result');
  assert(messages.at(-1).results.length, 'No full-text hits for ' + query);
}
console.log('PASS: source data unchanged; 2,642 answers valid; 20 chapter deep links; 280 full-text sections; Hindi/English search; metadata and JS syntax.');
