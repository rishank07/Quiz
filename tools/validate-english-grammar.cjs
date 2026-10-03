const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const source = read('Original Practice/English_Grammar_Complete_Practice.html');
const data = JSON.parse(source.match(/<script id="master-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const chapters = Object.keys(data);
const counts = [135,173,46,307,162,214,180,223,225,138,111,80,123,43,123,71];
const get = (chapter, id) => data[chapters[chapter - 1]].flatMap(s => s.questions).find(q => q.id === 'q' + id);
const answer = (chapter, id) => { const q = get(chapter, id); return q.options[q.answer]; };
let total = 0;
chapters.forEach((chapter, i) => {
  const questions = data[chapter].flatMap(s => s.questions);
  assert.equal(questions.length, counts[i]);
  assert.equal(new Set(questions.map(q => q.id)).size, counts[i]);
  questions.forEach(q => {
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4, chapter + '/' + q.id);
    assert(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4);
    assert(!q.options.some(o => /^Option \d|timeing/.test(o)));
    assert(!/ban kar|meaning chahiye/.test(q.englishExplanation));
    assert(!/<script|onerror=|onclick=/.test(q.englishExplanation));
  });
  total += questions.length;
});
assert.equal(total, 2354);
// Identification tasks must not point to the answer before the attempt.
for (const [chapter, ids] of [[1,[45,46,47,50,53,56,58,59,60,66,67,68,69,70,71,72,73,74,75,76,77,127]],[5,[67,69]],[2,[145]]]) {
  ids.forEach(id => assert(!get(chapter,id).sentence.includes('class="target"') && !get(chapter,id).sentence.includes("class='target'"), chapter+'/'+id));
}
for (const [chapter, ids] of [[2,[58,59]],[6,[146,147,148,149]],[12,[1,2,3,4,5,6,7,8,9,54,55]]]) {
  ids.forEach(id => assert(get(chapter,id).sentence.includes('>___</span>'), chapter+'/'+id));
}
assert.equal(answer(1,45), 'football');
assert.equal(answer(5,80), 'I am');
assert(get(5,80).sentence.includes('>Myself is</span>'));
assert(get(7,132).sentence.includes('his parents regretted <span class="target">his</span>'));
assert.equal(answer(7,132),'their');
assert(get(9,163).sentence.includes('had seen him'));
for (const [id,prep] of [[98,'on'],[99,'at'],[100,'in']]) {
  assert(get(13,id).sentence.includes(prep+' <span'));
  assert.equal(answer(13,id),'no article');
}
assert.equal(answer(4,18),'village after village');
assert.equal(answer(4,70),'sets of letters used by writing systems');
assert.equal(answer(6,79),'Adjective used as an object complement');
for(const id of [95,96,99]) assert(answer(15,id).includes('was allowed to'));
for(const id of [141,142,143,144]) assert(get(2,id).sentence.includes('>been '));
// Compile each executable inline script and the shared runtime.
for(const filename of ['Original Practice/English_Grammar_Complete_Practice.html','Original Practice/Mixed_Practice.html','index.html','Original Practice/index.html']) {
  const html = read(filename);
  for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if(!/\bsrc=|application\//i.test(match[1]) && match[2].trim()) new vm.Script(match[2],{filename});
  }
}
new vm.Script(read('Original Practice/english-practice.js'));
new vm.Script(read('service-worker.js'));
const context = {window:{}};
vm.runInNewContext(read('search-snippets-english-original-practice.js'), context);
const snippets=context.window.EF_ENGLISH_ORIGINAL_PRACTICE_SNIPPET_INDEX;
assert.equal(snippets.length,192);
assert.equal(snippets.reduce((n,r)=>n+r.x.length,0),2354);
assert(!snippets.some(r=>r.x.some(t=>t.includes('<b>'))));
console.log('PASS: 2,354 questions, IDs/counts, unique options, answer leakage, source corrections, explanations, JavaScript syntax and 192 search sections.');
