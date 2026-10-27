// Candidate rejection may skip expensive work, but may never hide an accepted
// exact, compact or fuzzy match. Compare it to the unchanged scoring oracle.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const c={Map,WeakMap,setTimeout,clearTimeout};
vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(__dirname,'../search-logic.js'),'utf8'),c);
const queries=['Nitish','photosynthesis','BRICS','presidant','prime minister','rashtrapati','currentaffairs','भारत','राष्ट्रपति','2026','क़िला','क़िला'];
let checked=0,accepted=0;
for(const query of queries){
 const parsed=c.efRelevanceQuery(query),candidate=c.efSearchCandidateFilter(parsed);
 const seeds=new Set([query,'President','प्रधानमंत्री','राष्ट्रपति','करेंट अफेयर्स','क़िला','२०२६','２０２６','ﬁrst','ⓑⓡⓘⓒⓢ']);
 for(const term of parsed.terms){
  for(const alternative of c.efSearchTermAlternatives(term))seeds.add(alternative);
  for(let i=0;i<term.length;i++){
   seeds.add(term.slice(0,i)+term.slice(i+1));
   seeds.add(term.slice(0,i)+'x'+term.slice(i+1));
   seeds.add(term.slice(0,i)+'x'+term.slice(i));
   if(i+1<term.length)seeds.add(term.slice(0,i)+term[i+1]+term[i]+term.slice(i+2));
  }
 }
 const variants=[];
 for(const seed of seeds){
  variants.push(seed,seed.toUpperCase(),Array.from(seed).join("'"),Array.from(seed).join('\u200b'),Array.from(seed).join(' - '),'prefix '+seed+' suffix');
 }
 for(const raw of variants)for(const rawFields of [[raw,'Topic','Book'],['Unrelated',raw,'Book'],['Unrelated','Topic',raw]]){
  const fields=rawFields.map(c.efNormalizeSearchText),head=fields[1]+' '+fields[2];
  for(const [compact,fuzzy] of [[false,false],[true,false],[false,true]]){
   checked++;
   if(!c.efRelevanceScore(parsed,...fields,compact,fuzzy))continue;
   accepted++;
   assert(candidate(rawFields[0],head,compact,fuzzy),JSON.stringify({query,rawFields,compact,fuzzy}));
  }
 }
}
// Records mode uses the same fields as Blackbook and preserves ranked output.
const records=[{t:'Topic',x:"presi'dent and भारत",b:'Book'},{t:'President',x:'No matching body',b:'Civics'},
 {t:'Other',x:'p r e s i d e n t',b:'Book'},{t:'Other',x:'presidant',b:'Book'}];
for(const query of ['president','भारत','presidant']){
 const hits=c.efSearchRecords(query,records,{fields:['t','x','b'],limit:10});
 assert(hits.length,query);
}
console.log('PASS conservative candidate rejection:',checked,'oracle comparisons;',accepted,'accepted exact/compact/typo cases; Hindi, aliases, NFKC, digits, apostrophes and field placement');
