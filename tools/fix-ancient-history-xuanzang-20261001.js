const fs=require('fs');
const file='Original Practice/History_Complete_Practice.html';
const src=fs.readFileSync(file,'utf8');
const startTag='<script id="master-data" type="application/json">';
const endTag='</script>';
const start=src.indexOf(startTag), end=src.indexOf(endTag,start+startTag.length);
if(start<0||end<0) throw new Error('master-data not found');
const data=JSON.parse(src.slice(start+startTag.length,end).trim());
const anc=data['Ancient History'];

function getQ(prefix,n){
  const f=Object.entries(anc).find(([k])=>k.startsWith(prefix));
  if(!f) throw new Error('chapter missing '+prefix);
  let i=0;
  for(const sec of f[1]) for(const q of sec.questions||[]){ i++; if(i===n) return q; }
  throw new Error('question missing '+prefix+' #'+n);
}
function replaceAnswer(q,en,hi){
  const oldEn=q.a.en, oldHi=q.a.hi;
  const opt=q.o.find(o=>o.en===oldEn||o.hi===oldHi);
  if(!opt) throw new Error('old option missing for '+q.q.en);
  q.a={en,hi}; opt.en=en; opt.hi=hi;
}
const en='630 CE (he left China in 629 CE)';
const hi='630 ईस्वी (उन्होंने 629 ईस्वी में चीन से यात्रा शुरू की)';
for(const [p,n] of [['1. Sources of Ancient History',77],['11. Post Gupta Empire',23]]){
  const q=getQ(p,n);
  replaceAnswer(q,en,hi);
  q.exp={
    en:"Xuanzang left Chang'an in 629 CE and reached India in 630 CE. He then travelled and studied across the Indian subcontinent for many years before returning to China in 645 CE.",
    hi:"ह्वेनसांग/जुआनज़ांग ने 629 ईस्वी में चांगआन से यात्रा शुरू की और 630 ईस्वी में भारत पहुँचे। इसके बाद उन्होंने कई वर्षों तक भारतीय उपमहाद्वीप में यात्रा और अध्ययन किया तथा 645 ईस्वी में चीन लौटे।"
  };
}
let total=0;
for(const [,secs] of Object.entries(anc)) for(const sec of secs) for(const q of sec.questions||[]){
 total++;
 if((q.o||[]).length!==4) throw new Error('not four options: '+q.q.en);
 if(!q.o.some(o=>o.en===q.a.en&&o.hi===q.a.hi)) throw new Error('answer missing: '+q.q.en);
 if(!q.q?.en||!q.q?.hi||!q.exp?.en||!q.exp?.hi) throw new Error('empty field');
 const opts=q.o.map(o=>o.en.trim().toLowerCase());
 if(new Set(opts).size!==opts.length) throw new Error('duplicate options: '+q.q.en);
}
if(total!==2216) throw new Error('count '+total);
if(getQ('1. Sources of Ancient History',77).a.en!==getQ('11. Post Gupta Empire',23).a.en) throw new Error('Xuanzang answers not synchronized');

const json=JSON.stringify(data);
const out=src.slice(0,start)+startTag+'\n'+json+'\n'+endTag+src.slice(end+endTag.length);
fs.writeFileSync(file,out,'utf8');
console.log('Standardized Xuanzang arrival to India; validated '+total+' questions.');
