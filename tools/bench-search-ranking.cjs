// EFP_BASELINE_WORKER=/path/to/original-worker.js node tools/bench-search-ranking.cjs
// Reports scan time only (not network or index parsing), with actual indexes.
const fs=require('fs'),vm=require('vm'),path=require('path'),zlib=require('zlib');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
function engine(code,index,name){const c={console,setTimeout,clearTimeout,Map,URL},messages=[];c.self=c;c.window=c;c.postMessage=m=>messages.push(m);vm.createContext(c);c.importScripts=u=>vm.runInContext(read(new URL(u,'https://examfusionprep.com/').pathname.slice(1)),c);vm.runInContext(code,c);c.onmessage({data:{type:'init',options:{indexUrl:'https://examfusionprep.com/'+index,logicUrl:'https://examfusionprep.com/search-logic.js',globalName:name,mode:'snippet',limit:40}}});if(!messages.some(m=>m.type==='ready'))throw Error(JSON.stringify(messages));return q=>{const start=performance.now();c.onmessage({data:{type:'search',id:1,query:q}});return performance.now()-start}}
const baseline=process.env.EFP_BASELINE_WORKER&&fs.readFileSync(process.env.EFP_BASELINE_WORKER,'utf8'),current=read('search-worker.js');
let raw=0,packed=0;
for(const f of fs.readdirSync(root).filter(f=>/^search-(?:snippets-|index-main)/.test(f)&&f.endsWith('.js'))){const b=fs.readFileSync(path.join(root,f));raw+=b.length;packed+=zlib.gzipSync(b).length;}
console.log(JSON.stringify({scope:'root search indexes',plainBytes:raw,gzipBytes:packed,reductionPercent:+((1-packed/raw)*100).toFixed(1)}));
for(const [index,name] of [['search-snippets-ghatnachakra.js','EF_SNIPPET_INDEX'],['search-snippets-original-practice.js','EF_ORIGINAL_PRACTICE_SNIPPET_INDEX']]){
 const old=baseline&&engine(baseline,index,name),now=engine(current,index,name);
 for(const query of ['BRICS','constitution','भारत','question']){
  const times=f=>{const t=[];for(let i=0;i<3;i++)t.push(f(query));return +t.sort((a,b)=>a-b)[1].toFixed(1)};
  console.log(JSON.stringify({index,query,beforeMs:old&&times(old),afterMs:times(now)}));
 }
}
