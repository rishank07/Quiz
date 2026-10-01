const fs = require('node:fs');
const cp = require('node:child_process');
const file = 'Original Practice/History_Complete_Practice.html';
const tag = '<script id="master-data" type="application/json">';
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const commit = process.argv.includes('--commit');
const selected = process.argv.find(x => /^--chapter=\d+$/.test(x));
const chapterNumber = selected ? Number(selected.split('=')[1]) : null;
const plans = fs.readdirSync('audits/ancient-history').filter(x => /^chapter-\d+\.json$/.test(x)).sort();
for (const planFile of plans) {
  const plan = JSON.parse(fs.readFileSync('audits/ancient-history/'+planFile,'utf8'));
  if (chapterNumber && plan.chapter !== chapterNumber) continue;
  const src = fs.readFileSync(file,'utf8');
  const s = src.indexOf(tag), e = src.indexOf('</script>',s+tag.length);
  if(s<0 || e<0) throw Error('Master data missing');
  const before = JSON.parse(src.slice(s+tag.length,e));
  const data = structuredClone(before);
  const chapter = data['Ancient History'][plan.chapter_key];
  if(!chapter || chapter.reduce((n,s)=>n+s.questions.length,0)!==plan.reviewed_questions) throw Error('Chapter count mismatch');
  for(const edit of plan.edits){
    const section=chapter[edit.section-1], q=section?.questions[edit.question-1];
    if(same(q,edit.after)) continue;
    if(!same(q,edit.before)) throw Error('Concurrent content change: '+plan.chapter+' S'+edit.section+'Q'+edit.question);
    section.questions[edit.question-1]=edit.after;
  }
  let total=0;
  for(const [name,sections] of Object.entries(data['Ancient History'])){
    for(const [i,section] of sections.entries()){
      const old=before['Ancient History'][name][i];
      if(section.questions.length!==old.questions.length) throw Error('Section count changed');
      for(const q of section.questions){
        total++;
        for(const field of ['q','a','exp']) for(const lang of ['en','hi']) if(!q[field]?.[lang]?.trim()) throw Error('Empty bilingual field');
        if(q.o.length!==4 || q.o.filter(o=>same(o,q.a)).length!==1) throw Error('Invalid answer/options: '+q.q.en);
        for(const lang of ['en','hi']){
          if(q.o.some(o=>!o[lang]?.trim())) throw Error('Empty option');
          if(new Set(q.o.map(o=>o[lang].trim().toLowerCase())).size!==4) throw Error('Duplicate option: '+q.q.en);
        }
      }
    }
  }
  if(total!==2216) throw Error('Ancient History count changed: '+total);
  for(const subject of Object.keys(before)) if(subject!=='Ancient History' && !same(before[subject],data[subject])) throw Error('Unrelated subject changed');
  for(const name of Object.keys(before['Ancient History'])) if(name!==plan.chapter_key && !same(before['Ancient History'][name],data['Ancient History'][name])) throw Error('Unrelated chapter changed');
  if(same(before,data)){ console.log('Chapter '+plan.chapter+': verified; already applied ('+plan.edits.length+' corrections)');continue; }
  fs.writeFileSync(file,src.slice(0,s+tag.length)+'\n'+JSON.stringify(data)+'\n'+src.slice(e));
  console.log('Chapter '+plan.chapter+': applied '+plan.edits.length+' corrections; '+plan.reviewed_questions+' questions, total '+total);
  if(commit){
    cp.execFileSync('git',['add','--',file],{stdio:'inherit'});
    cp.execFileSync('git',['commit','-m','Audit Ancient History Chapter '+plan.chapter+': bilingual factual and option corrections'],{stdio:'inherit'});
    cp.execFileSync('git',['push','origin','HEAD:master'],{stdio:'inherit'});
  }
}
