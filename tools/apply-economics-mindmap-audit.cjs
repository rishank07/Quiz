// Source-only factual corrections; preserve all untouched HTML bytes and panel IDs.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {JSDOM}=require(process.env.EFP_TEST_JSDOM||'jsdom');
const root=path.resolve(__dirname,'..');
const sourcePath=path.join(root,'Original Practice/Economics_Complete_Practice.html');
const source=fs.readFileSync(sourcePath,'utf8');
const master=JSON.parse(source.match(/<script id="master-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
const chapters=Object.values(master)[0], keys=Object.keys(chapters);
const plan=JSON.parse(fs.readFileSync(path.join(root,'audits/economics-mindmaps/corrections.json'),'utf8'));
if(crypto.createHash('sha256').update(source).digest('hex')!==plan.source_sha256)throw Error('OP source changed; review the audit again');
const normalize=s=>s.replace(/\s+/g,' ').trim();
const escape=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const check=process.argv.includes('--check');
let total=0;
for(const chapter of plan.chapters){
 const file=path.join(root,chapter.file);let raw=fs.readFileSync(file,'utf8');
 if(sha(raw)===chapter.updated_sha256){console.log('Chapter '+chapter.number+': verified; already applied');continue;}
 if(check)throw Error('Chapter '+chapter.number+': reviewed content does not match');
 if(sha(raw)!==chapter.base_sha256)throw Error('Chapter '+chapter.number+': concurrent content change; re-review before applying');
 for(const edit of chapter.edits){
  for(const ref of edit.refs){const m=ref.match(/^S(\d+)Q(\d+)$/);if(!m||!chapters[keys[chapter.number-1]][+m[1]-1]?.questions[+m[2]-1])throw Error('Bad source reference '+ref);}
  const before=edit.before,after=edit.html?edit.after:escape(edit.after);
  if(raw.includes(before)){const count=raw.split(before).length-1;if(edit.count!==count)throw Error(chapter.number+': occurrence count '+count+' != '+edit.count+' for '+before);raw=raw.split(before).join(after);}
  else {
   const dom=new JSDOM(raw,{includeNodeLocations:true});
   let targets=[...dom.window.document.body.querySelectorAll('*')].filter(n=>!['SCRIPT','STYLE'].includes(n.tagName)&&normalize(n.textContent)===normalize(before));
   targets=targets.filter(n=>!targets.some(child=>child!==n&&n.contains(child)));
   if(targets.length!==edit.count)throw Error(chapter.number+': no exact target '+before+' ('+targets.length+')');
   const ranges=targets.map(n=>dom.nodeLocation(n)).map(n=>[n.startTag.endOffset,n.endTag.startOffset]).sort((a,b)=>b[0]-a[0]);
   for(const [a,b]of ranges)raw=raw.slice(0,a)+after+raw.slice(b);
   dom.window.close();
  }
  total++;
 }
 const bodyStart=raw.indexOf('<body>');
 raw=raw.slice(0,bodyStart)+raw.slice(bodyStart).replace(/^[ \t]+$/gm,'');
 if(sha(raw)!==chapter.updated_sha256)throw Error('Chapter '+chapter.number+': unexpected output; file not written');
 fs.writeFileSync(file,raw);
 console.log('Chapter '+chapter.number+': '+chapter.edits.length+' corrections');
}
console.log(total+' source-backed correction rules applied.');
