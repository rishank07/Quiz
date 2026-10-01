const fs=require('node:fs'),cp=require('node:child_process');
const file='Original Practice/Polity_Complete_Practice.html',tag='<script id="master-data" type="application/json">',dir='audits/polity';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),commit=process.argv.includes('--commit');
const selected=process.argv.find(x=>/^--chapter=/.test(x));
for(const name of fs.readdirSync(dir).filter(n=>/^chapter-\d+\.json$/.test(n)&&(!selected||Number(n.match(/\d+/)[0])===Number(selected.split('=')[1]))).sort()){
 const plan=JSON.parse(fs.readFileSync(dir+'/'+name,'utf8'));
 const src=fs.readFileSync(file,'utf8'),s=src.indexOf(tag)+tag.length,e=src.indexOf('</script>',s);
 if(s<tag.length||e<0)throw Error('Master data missing');
 const before=JSON.parse(src.slice(s,e)),data=structuredClone(before),chapter=data['Indian Polity'][plan.chapter_key];
 if(!chapter||chapter.reduce((n,x)=>n+x.questions.length,0)!==plan.reviewed_questions)throw Error('Chapter count mismatch');
 for(const edit of plan.edits){const q=chapter[edit.section-1]?.questions[edit.question-1];if(same(q,edit.after))continue;if(!same(q,edit.before))throw Error('Concurrent content change: '+name+' S'+edit.section+'Q'+edit.question);chapter[edit.section-1].questions[edit.question-1]=edit.after;}
 for(const sec of chapter)for(const q of sec.questions){
  for(const f of ['q','a','exp'])for(const l of ['en','hi'])if(!q[f]?.[l]?.trim())throw Error('Empty field');
  if(q.o.length!==4||q.o.filter(o=>same(o,q.a)).length!==1)throw Error('Answer mismatch: '+q.q.en);
  for(const l of ['en','hi'])if(q.o.some(o=>!o[l]?.trim())||new Set(q.o.map(o=>o[l].trim().toLowerCase())).size!==4)throw Error('Invalid options: '+q.q.en);
 }
 if(Object.keys(data['Indian Polity']).length!==22||Object.values(data['Indian Polity']).reduce((n,ss)=>n+ss.reduce((v,s)=>v+s.questions.length,0),0)!==4052)throw Error('Total count changed');
 for(const key of Object.keys(before['Indian Polity']))if(key!==plan.chapter_key&&!same(before['Indian Polity'][key],data['Indian Polity'][key]))throw Error('Other chapter changed');
 if(!same(before,data))fs.writeFileSync(file,src.slice(0,s)+'\n'+JSON.stringify(data)+'\n'+src.slice(e));
 console.log(name+': '+plan.reviewed_questions+' checked, '+plan.edits.length+' revised; validated');
 if(commit){cp.execFileSync('git',['add','--',file,dir+'/'+name],{stdio:'inherit'});cp.execFileSync('git',['commit','-m','Audit Original Practice Polity Chapter '+plan.chapter+': facts and bilingual corrections'],{stdio:'inherit'});cp.execFileSync('git',['push','origin','HEAD:master'],{stdio:'inherit'});}
}
