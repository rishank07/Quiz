// Real-index coverage, shared worker/fallback ranking, bounded selection and
// repeat-query cache tests. Run with node; no browser/network dependencies.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
function worker(index,globalName,limit=40,code=read('search-worker.js')) {
 const messages=[],c={console,setTimeout,clearTimeout,URL,Map,postMessage:m=>messages.push(m)};c.self=c;c.window=c;
 vm.createContext(c);c.importScripts=url=>vm.runInContext(read(new URL(url,'https://examfusionprep.com/').pathname.slice(1)),c);
 vm.runInContext(code,c);c.onmessage({data:{type:'init',options:{mode:'snippet',indexUrl:'https://examfusionprep.com/'+index,globalName,limit,logicUrl:'https://examfusionprep.com/search-logic.js'}}});
 assert(messages.some(m=>m.type==='ready'),JSON.stringify(messages));
 return {c,search(query){messages.length=0;c.onmessage({data:{type:'search',id:1,query}});const m=messages.find(m=>m.type==='result');assert(m,JSON.stringify(messages));return Array.from(m.results)}};
}
const c={setTimeout,clearTimeout,Map};vm.createContext(c);vm.runInContext(read('search-logic.js'),c);
function score(query,body,title='Topic',breadcrumb='Book'){return c.efRelevanceScore(c.efRelevanceQuery(query),c.efNormalizeSearchText(body),c.efNormalizeSearchText(title),c.efNormalizeSearchText(breadcrumb),false,false)}
assert(score('BRICS','What is BRICS?').score < score('BRICS','Clothes use fabrics').score);
assert(score('BRICS','What is BRICS?').score < score('BRICS','BRICSomething').score);
assert(score('BRICS','BRICS fabrics BRICS').matchType==='exact');
assert(score('prime minister','Who is prime minister?').score < score('prime minister','Who is minister? Answer: A prime candidate.').score);
assert(score('राष्ट्रपति २०२६','राष्ट्रपति 2026').matchType==='exact');
assert(score('rashtrapati','राष्ट्रपति').matchType==='alias');
assert(score('long words','long other words'));
assert(!score('brics g20','brics'));
assert(score('article','article 370').score < score('article','particle physics').score);
// Compact and typo remain fallback tiers; no fuzzy matching for short numbers.
assert(c.efRelevanceScore(c.efRelevanceQuery('currentaffairs'),'current affairs','topic','',true,false));
assert(c.efRelevanceScore(c.efRelevanceQuery('presidant'),'president','topic','',false,true));
assert(!c.efRelevanceScore(c.efRelevanceQuery('2026'),'2025','topic','',false,true));
const top=c.efTopSearchHits(40);for(let i=0;i<100000;i++)top.add({f:'/q'+i,score:100000-i,sequence:i,x:'question'});
assert.equal(top.size(),40);assert.equal(top.sorted()[0].f,'/q99999');
const unique=c.efTopSearchHits(2);unique.add({f:'/same#q1',score:2,sequence:0,x:'one'});unique.add({f:'/same#q1',score:1,sequence:1,x:'better'});unique.add({f:'/same#q2',score:3,sequence:2,x:'two'});assert.equal(unique.size(),2);assert.equal(unique.sorted()[0].x,'better');
console.log('PASS exact/prefix/substring/alias/compact/typo tiers, Hindi digits, proximity, bounded 100k-hit selection');
const suites=[
 ['search-snippets-economics-original-practice.js','EF_ECONOMICS_ORIGINAL_PRACTICE_SNIPPET_INDEX',['BRICS','GDP','inflation','demand supply','२०२६','rashtrapati']],
 ['search-snippets-ghatnachakra.js','EF_SNIPPET_INDEX',['BRICS','gandhi','constitution','भारत','1857','prime minister','particle']],
 ['search-snippets-original-practice.js','EF_ORIGINAL_PRACTICE_SNIPPET_INDEX',['BRICS','Ashoka','constitution','गांधी','electron','1857']],
 ['search-snippets-mindmaps.js','EF_SNIPPET_INDEX',['BRICS','constitution','भारत','gandhi']],
 ['search-snippets-current-affairs.js','EF_SNIPPET_INDEX',['BRICS','Modi','2026','प्रधानमंत्री']]
];
function key(hit){return hit.f+'|'+hit.x;}
const beforePath=process.env.EFP_BASELINE_WORKER;
for(const [index,name,queries] of suites){
 const w=worker(index,name,100000),before=beforePath?worker(index,name,100000,fs.readFileSync(beforePath,'utf8')):null;
 for(const query of queries){
  const hits=w.search(query),keys=new Set(hits.map(key));
  // Old worker includes duplicate snippets for one unanchored page; the new
  // selector deliberately retains its strongest hit. Compare semantic routes.
  if(before){const old=before.search(query),routes=new Set(hits.map(h=>h.f+'|'+(/^[\uE000-\uF8FF]/.test(h.x)?h.x.charCodeAt(0):'')));
   const missing=old.filter(h=>!routes.has(h.f+'|'+(/^[\uE000-\uF8FF]/.test(h.x)?h.x.charCodeAt(0):'')));
   assert.equal(missing.length,0,index+' missing old routes for '+query+': '+JSON.stringify(missing.slice(0,2)));
  }
  assert(hits.every(h=>Number.isFinite(h.score)),index+' score');
 }
 console.log('PASS indexed routes preserved:',index,queries.length,'queries');
}
// Full-text fallback and worker agree on exact anchored fixtures, including
// normalization-only matches when ordinary literal results already exist.
(async()=>{
 const fixture=[{f:'/leaf.html',t:'Topic',b:'Book',x:['\u0001q1\u0002BRICS question','\u0001q2\u0002fabrics','\u0001q3\u0002Year २०२६','\u0001q4\u0002Year 2026']}];
 const w=worker('search-snippets-economics-original-practice.js','EF_ECONOMICS_ORIGINAL_PRACTICE_SNIPPET_INDEX');w.c.EF_ECONOMICS_ORIGINAL_PRACTICE_SNIPPET_INDEX=fixture;
 // Worker captured its initial array; replace its entries in place.
 const original=w.c.EF_ECONOMICS_ORIGINAL_PRACTICE_SNIPPET_INDEX;
 const t=worker('search-snippets-economics-original-practice.js','EF_ECONOMICS_ORIGINAL_PRACTICE_SNIPPET_INDEX');t.c.EF_ECONOMICS_ORIGINAL_PRACTICE_SNIPPET_INDEX.splice(0,t.c.EF_ECONOMICS_ORIGINAL_PRACTICE_SNIPPET_INDEX.length,...fixture);
 for(const q of ['BRICS','2026','rashtrapati','currentaffairs','presidant']){
  const a=t.search(q),b=await c.efFallbackSnippetSearchAsync(q,fixture,{limit:40});
  assert.deepEqual(a.map(h=>[h.f,h.score,h.matchType]),Array.from(b,h=>[h.f,h.score,h.matchType]));
 }
 let workers=0;
 c.Worker=class{constructor(){workers++}postMessage(m){if(m.type==='init')setTimeout(()=>this.onmessage({data:{type:'ready'}}),0);else setTimeout(()=>this.onmessage({data:{type:'result',id:m.id,results:[{f:'/cached#q1',x:'BRICS',score:0}]}}),0)}terminate(){}};
 const config={workerUrl:'/worker',indexUrl:'/index?v=1',globalName:'INDEX',workerOnly:true};
 const client=c.efCreateSearchWorker(config);await client.search('BRICS');client.terminate();await client.search('brics');assert.equal(workers,1);
 await c.efCreateSearchWorker({...config,indexUrl:'/index?v=2'}).search('brics');assert.equal(workers,2);
 for(let i=0;i<100;i++)c.efCachedSearchResults('item'+i,[{x:'x'.repeat(10000)}]);assert(c.efSearchResultCacheBytes<=262144);assert(c.efSearchResultCache.size<=32);
 console.log('PASS worker/fallback parity, normalized repeat cache, revision isolation and 256KiB memory cap');
})().catch(e=>{console.error(e);process.exitCode=1});
