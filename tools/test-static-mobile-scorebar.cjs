// EFP_TEST_JSDOM=/path/to/jsdom node tools/test-static-mobile-scorebar.cjs
// Check the actual native markup/cascade, without pretending to render geometry.
const {JSDOM} = require(process.env.EFP_TEST_JSDOM || 'jsdom');
const fs = require('node:fs'), vm = require('node:vm'), cp = require('node:child_process');
const assert = require('node:assert/strict');
const read = p => fs.readFileSync(p,'utf8');
const css = read('quiz-unattempted.css');
const oldCss = cp.execFileSync('git',['show','HEAD:quiz-unattempted.css'],{encoding:'utf8'});
const fixtures = [
  ['Books/Ghatnachakra Purvalokan/Economics/ChapterNames/1. Nature of Indian Economy.html','Books/Ghatnachakra Purvalokan/Economics/ChapterNames/styles.css'],
  ["Books/Lucent's Objective/Ecology/Ecology and Environment.html","Books/Lucent's Objective/Ecology/styles.css"],
  ['Books/Pinnacle GS/PinnacleParts/SSC/Static Gk/ChapterNames/Festivals.html','Books/Pinnacle GS/PinnacleParts/SSC/Static Gk/ChapterNames/styles.css'],
  ['Bihar Special/Topic Names/Bihar Objective GK - 60 Sets.html',null]
];
function matched(condition,width,coarse) {
  return condition.split(',').some(part =>
    [...part.matchAll(/(min|max)-width:\s*(\d+)px/g)].every(m=>m[1]==='max'?width<=+m[2]:width>=+m[2]) &&
    (!/pointer:\s*coarse|hover:\s*none/.test(part)||coarse));
}
function flatten(css,width,coarse) {
  const temp = new JSDOM('<style>'+css+'</style>');
  const visit = rules => Array.from(rules,r=>r.type===4?(matched(r.conditionText,width,coarse)?visit(r.cssRules):''):r.cssText).join('\n');
  const text = visit(temp.window.document.styleSheets[0].cssRules);temp.window.close();return text;
}
const fields = ['display','gridTemplateColumns','gap','padding','borderRadius','fontSize','gridRow','gridColumn','width','height'];
function snapshot(w,bar) {
  return [bar,bar.querySelector('.score-item'),bar.querySelector('.efp-quiz-reset-btn')].filter(Boolean).map(el=>{
    const s=w.getComputedStyle(el);return Object.fromEntries(fields.map(k=>[k,s[k]]));
  });
}
function page(file,nativeCss,newCss,width,coarse,theme) {
  const source=read(file),markup=source.match(/<div class="(?:score-bar|set-score-bar)"[^>]*>[\s\S]*?<\/div>/)[0];
  const dom=new JSDOM('<html class="'+theme+'"><head><style>'+flatten(nativeCss+'\n'+newCss,width,coarse)+'</style></head><body>'+markup+'</body></html>',{url:'https://examfusionprep.com/'+file.replaceAll(' ','%20'),runScripts:'outside-only'});
  const w=dom.window,bar=w.document.querySelector('.score-bar,.set-score-bar');
  if(!file.startsWith('Bihar')) {
    const button=w.document.createElement('button');button.className='efp-quiz-reset-btn';button.type='button';button.textContent='↻ Reset';button.setAttribute('aria-label','Reset quiz progress');bar.appendChild(button);
  }
  vm.runInContext(read('quiz-unattempted.js'),dom.getInternalVMContext());
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));w.EFP_QUIZ_UNATTEMPTED.sync();
  return {dom,w,bar};
}
let checks=0;
for(const [file,stylePath] of fixtures) {
  const source=read(file);
  const native=((stylePath?read(stylePath)+'\n':'')+[...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n')).replace(/@import[^;]+;/g,'') +
    '\n.efp-quiz-reset-btn{border:1px solid #ecc;background:#fff;color:#b42318;border-radius:999px;padding:6px 10px;font:800 11px/1.1 Arial,sans-serif}';
  for(const theme of ['','efp-black','efp-black-invert']) {
    for(const width of [768,1024,1440,1920]) {
      const a=page(file,native,oldCss,width,false,theme),b=page(file,native,css,width,false,theme);
      assert.deepEqual(snapshot(a.w,a.bar),snapshot(b.w,b.bar),file+' desktop '+width);checks++;
      a.dom.window.close();b.dom.window.close();
    }
    for(const [width,coarse] of [[320,false],[360,false],[393,false],[430,false],[700,false],[844,true],[932,true],[1024,true]]) {
      const p=page(file,native,css,width,coarse,theme),style=p.w.getComputedStyle(p.bar);
      assert.equal(style.display,'grid');assert.equal(style.padding,'8px 10px');
      const reset=p.bar.querySelector('.efp-quiz-reset-btn');
      if(reset) {
        const s=p.w.getComputedStyle(reset);assert.equal(s.gridColumn,'3');assert.equal(s.gridRow,'1 / span 2');
        assert.equal(s.fontSize,'0px');assert.equal(s.width,'34px');assert.equal(s.height,'34px');
        assert.equal(reset.getAttribute('aria-label'),'Reset quiz progress');assert(reset.textContent.includes('Reset'));
        assert.match(style.gridTemplateColumns,/34px$/);
      } else {
        assert.equal(style.gridTemplateColumns,'repeat(2, minmax(0, 1fr))');
        assert.equal(p.w.getComputedStyle(p.bar.querySelector('.current-set-badge')).fontSize,'10px');
      }
      const attempted=p.bar.querySelector('[id^="totalAttempted"]');
      const total=Number(p.bar.querySelector('.total-count').textContent.match(/\/(\d+)/)[1]);
      attempted.textContent='2';p.w.EFP_QUIZ_UNATTEMPTED.sync();
      assert.equal(Number(p.bar.querySelector('.efp-unattempted-value').textContent),total-2);
      assert.equal(p.bar.querySelectorAll('.efp-unattempted').length,1);
      checks++;p.dom.window.close();
    }
  }
}
console.log('PASS '+checks+' mobile portrait/landscape, theme, counter and unchanged-desktop CSS checks across all four families');
