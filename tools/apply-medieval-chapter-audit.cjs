const fs=require('node:fs'),cp=require('node:child_process');
const file='Original Practice/History_Complete_Practice.html',tag='<script id="master-data" type="application/json">';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const commit=process.argv.includes('--commit');
const dir='audits/medieval-history';
for(const name of fs.readdirSync(dir).filter(n=>/^chapter-\d+\.json$/.test(n)).sort()){
 const plan=JSON.parse(fs.readFileSync(dir+'/'+name,'utf8'));
 const src=fs.readFileSync(file,'utf8'),s=src.indexOf(tag)+tag.length,e=src.indexOf('</script>',s);
 if(s<tag.length||e<0)throw Error('Master data missing');
 const before=JSON.parse(src.slice(s,e)),data=structuredClone(before),chapter=data['Medieval History'][plan.chapter_key];
 if(!chapter||chapter.reduce((n,x)=>n+x.questions.length,0)!==plan.reviewed_questions)throw Error('Chapter count mismatch');
 for(const edit of plan.edits){
  const sec=chapter[edit.section-1],q=sec?.questions[edit.question-1];
  if(same(q,edit.after))continue;
  if(!same(q,edit.before)&&!(edit.previous_after||[]).some(v=>same(q,v)))throw Error('Concurrent content change: '+name+' S'+edit.section+'Q'+edit.question);
  sec.questions[edit.question-1]=edit.after;
 }
 for(const sec of chapter)for(const q of sec.questions){
  for(const f of ['q','a','exp'])for(const l of ['en','hi'])if(!q[f]?.[l]?.trim())throw Error('Empty field');
  if(q.o.length!==4||q.o.filter(o=>same(o,q.a)).length!==1)throw Error('Answer mismatch: '+q.q.en);
  for(const l of ['en','hi'])if(q.o.some(o=>!o[l]?.trim())||new Set(q.o.map(o=>o[l].trim().toLowerCase())).size!==4)throw Error('Invalid options: '+q.q.en);
 }
 if(Object.values(data['Medieval History']).reduce((n,ss)=>n+ss.reduce((v,s)=>v+s.questions.length,0),0)!==1480)throw Error('Total count changed');
 for(const subject of Object.keys(before))if(subject!=='Medieval History'&&!same(before[subject],data[subject]))throw Error('Other subject changed');
 for(const key of Object.keys(before['Medieval History']))if(key!==plan.chapter_key&&!same(before['Medieval History'][key],data['Medieval History'][key]))throw Error('Other chapter changed');
 if(same(before,data)){console.log(name+': already applied; verified');continue;}
 fs.writeFileSync(file,src.slice(0,s)+'\n'+JSON.stringify(data)+'\n'+src.slice(e));
 console.log(name+': '+plan.reviewed_questions+' reviewed, '+plan.edits.length+' corrected');
 if(commit){cp.execFileSync('git',['add','--',file],{stdio:'inherit'});cp.execFileSync('git',['commit','-m','Audit Medieval History Chapter '+plan.chapter+': bilingual factual and option corrections'],{stdio:'inherit'});cp.execFileSync('git',['push','origin','HEAD:master'],{stdio:'inherit'});}
}
