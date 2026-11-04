// Shared option engine: catalog invariants and legacy/new attempt migration.
// No network or browser dependencies. Run: node tools/test-ca-relatable-options.cjs
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),asset=fs.readFileSync(path.join(root,'rapid-practice-deeplink.js'),'utf8');
const source='/* EFP_CA_RELATABLE_OPTIONS_BEGIN'+asset.split('/* EFP_CA_RELATABLE_OPTIONS_BEGIN')[1];
const context={window:{},document:{readyState:'loading',addEventListener(){}}};vm.runInNewContext(source,context);const api=context.window.EFP_CA_OPTIONS;
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):e.name.endsWith('.html')?[path.join(d,e.name)]:[]);
const sections=d=>Array.isArray(d)?d:Object.values(d).flatMap(sections);
const clone=d=>JSON.parse(JSON.stringify(d));
const files=walk(path.join(root,'Current Affairs/Topic Names/Rapid Practice'));assert.equal(files.length,44);
const totals={quizzes:0,questions:0,authored:0,generated:0,repaired:0,alreadyRelated:0,manualReview:0};let fixture;
for(const file of files){
 const html=fs.readFileSync(file,'utf8');assert(html.includes('rapid-practice-deeplink.js'),'shared delivery '+file);
 const data=JSON.parse(html.match(/<script[^>]*id=["']master-data["'][^>]*>([\s\S]*?)<\/script>/i)[1]);
 const original=sections(data),current=clone(original),engine=api.compile(current);engine.apply({answers:{}});const again=clone(original);api.compile(again).apply({answers:{}});
 assert.deepEqual(current,again,'deterministic options '+file);assert.equal(current.length,original.length);
 let changed=0;
 for(let si=0;si<current.length;si++){
  assert.equal(current[si].questions.length,original[si].questions.length);
  for(let qi=0;qi<current[si].questions.length;qi++){
   const q=current[si].questions[qi],before=original[si].questions[qi],id=si+'-'+qi;
   const ci=q.o.findIndex(o=>o.en===q.a.en),oldCi=before.o.findIndex(o=>o.en===before.a.en);
   assert.equal(ci,oldCi,'correct slot '+file+' '+id);assert.deepEqual(q.a,before.a);assert.deepEqual(q.q,before.q);
   assert.equal(q.o.length,before.o.length);assert.deepEqual({...q,o:null},{...before,o:null},'only distractors may change');
   if(/\bmain (?:mcq|current affairs)/i.test(current[si].title.en))assert.deepEqual(q.o,before.o,'authored reading MCQ');
   if(JSON.stringify(q.o)!==JSON.stringify(before.o)){
    changed++;assert.equal(q.o.length,4);assert(q.o.every(o=>o.en&&o.hi),'paired bilingual options');
    q.o.forEach((o,i)=>{if(i===ci)return;assert(!api.same(o,q.a),'alias of correct answer '+file+' '+id);assert(!q.o.slice(0,i).some(p=>api.same(p,o)),'duplicate distractor '+file+' '+id);});
    if(!fixture)fixture={original:clone(original),si,qi};
   }
  }
 }
 const legacy=clone(original),legacyEngine=api.compile(legacy),legacyAnswers={};legacyEngine.plans.forEach((_,id)=>legacyAnswers[id]=0);
 const saved={answers:legacyAnswers,bookmarks:{'0-0':true},section:0,dark:false};const snapshot=clone(saved);legacyEngine.apply(saved);
 assert.deepEqual(legacy,original,'already submitted options remain as originally seen');assert.deepEqual(saved,snapshot,'compilation does not mutate progress');
 saved.answers={};legacyEngine.apply(saved);assert.deepEqual(legacy,current,'reset enables repaired options');
 for(const k of ['questions','authored','generated','repaired','alreadyRelated'])totals[k]+=engine.report[k];totals.manualReview+=engine.report.unresolved.length;totals.quizzes++;
}
// Regression cases observed during the actual content audit.
const kind=(en,answer)=>api.kind({q:{en},a:{en:answer,hi:answer}},'');
assert.equal(kind('Who Has Taken Over As Director General Of Naval Armament (DGONA)?','Divakar Jayant'),'person:military');
assert.equal(kind('Who Became The First Bowler In History To Take 700 T20 Wickets?','Rashid Khan'),'person:bowler');
assert.equal(kind('Who Inaugurated IBM’s AI GovTech Innovation Centre In Lucknow?','Yogi Adityanath'),'person:official');
assert.equal(kind('Which company became the first retailer to reach a $1 trillion market value?','Walmart (USA)'),'company');
assert.equal(kind('Which medal did Manu Bhaker win?','Silver'),'medal');
assert(api.same({en:'Formation 1894',hi:'स्थापना 1894'},{en:'Founded 1894',hi:'1894 में स्थापित'}),'equivalent establishment facts');
assert(api.same({en:'USA',hi:'यूएसए'},{en:'United States',hi:'संयुक्त राज्य अमेरिका'}),'country alias');
// Install through the same DOMContentLoaded entry point and real handler
// wrappers; emulate save/reload without touching any user's actual storage.
let ready;const app={window:{},document:{readyState:'loading',addEventListener(name,fn){if(name==='DOMContentLoaded')ready=fn;}}};vm.createContext(app);
app.fixture=fixture.original;vm.runInContext('var SECTIONS=fixture;var current=0;var saved={answers:{},bookmarks:{},section:0,dark:false};var saves=0;var paints=0;window.renderQuestions=function(){paints++;};window.pick=function(qi,oi){var id=current+"-"+qi;if(saved.answers[id]!==undefined)return;saved.answers[id]=oi;saves++;};',app);
vm.runInContext(source,app);ready();assert(app.window.EFP_CA_OPTIONS.installed);
vm.runInContext('current='+fixture.si,app);const id=fixture.si+'-'+fixture.qi;app.window.pick(fixture.qi,0);
const state=vm.runInContext('saved',app);assert.equal(state.caOptionRevision[id],api.revision);assert.equal(state.answers[id],0);assert.equal(vm.runInContext('saves',app),1);
const afterReload=clone(fixture.original);api.compile(afterReload).apply(clone(state));assert.deepEqual(clone(afterReload[fixture.si].questions[fixture.qi].o),clone(app.fixture[fixture.si].questions[fixture.qi].o));
if(process.argv.includes('--record')){
 const report={revision:api.revision,sourceCommit:require('node:child_process').execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),counts:totals,manualReview:{}};
 for(const file of files){const h=fs.readFileSync(file,'utf8'),data=JSON.parse(h.match(/<script[^>]*id=["']master-data["'][^>]*>([\s\S]*?)<\/script>/i)[1]);const e=api.compile(sections(data));if(e.report.unresolved.length)report.manualReview[path.relative(root,file).split(path.sep).join('/')]=e.report.unresolved.map(r=>r.id);}
 fs.mkdirSync(path.join(root,'audits/current-affairs'),{recursive:true});fs.writeFileSync(path.join(root,'audits/current-affairs/relatable-options-20261104.json'),JSON.stringify(report,null,2)+'\n');
}
console.log('PASS '+JSON.stringify(totals));
