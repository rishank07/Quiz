// Verify actual CA catalog, immutable reading MCQs, corrected drills and saved attempts.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),catalog=JSON.parse(fs.readFileSync(path.join(root,'tools/data/ca-curated-options-20261104.json')));
const asset=fs.readFileSync(path.join(root,'rapid-practice-deeplink.js'),'utf8'),source='/* EFP_CA_RELATABLE_OPTIONS_BEGIN'+asset.split('/* EFP_CA_RELATABLE_OPTIONS_BEGIN')[1];
const context={window:{},document:{readyState:'loading',addEventListener(){}}};vm.runInNewContext(source,context);const api=context.window.EFP_CA_OPTIONS;
const sections=d=>Array.isArray(d)?d:Object.values(d).flatMap(sections),clone=d=>JSON.parse(JSON.stringify(d));
const totals={quizzes:0,questions:0,authored:0,generated:0,repaired:0,alreadyRelated:0,curated:0,manualReview:0,reframed:0};let fixture,legacyFixture;
for(const [file,overrides] of Object.entries(catalog)){
 const html=fs.readFileSync(path.join(root,file),'utf8'),data=JSON.parse(html.match(/<script[^>]*id=["']master-data["'][^>]*>([\s\S]*?)<\/script>/i)[1]);
 const embedded=Array.from(html.matchAll(/<script type="application\/json" id="efp-ca-curated-options">([\s\S]*?)<\/script>/g));
 assert.equal(embedded.length,1,'one direct-delivery catalog');assert.deepEqual(JSON.parse(embedded[0][1]),overrides,'direct source receives current options');
 assert(html.includes('rapid-practice-deeplink.js?v=20261104curated3'),'direct visits bypass old runtime cache');
 const original=sections(data),current=clone(original),engine=api.compile(current,overrides);engine.apply({answers:{}});
 const again=clone(original);api.compile(again,overrides).apply({answers:{}});assert.deepEqual(current,again,'determinism');
 for(let si=0;si<current.length;si++){
  assert.equal(current[si].questions.length,original[si].questions.length);
  for(let qi=0;qi<current[si].questions.length;qi++){
   const q=current[si].questions[qi],before=original[si].questions[qi],id=si+'-'+qi,explicit=overrides[id],ci=before.o.findIndex(o=>o.en===before.a.en);
   const expectedA=explicit?.a||before.a,expectedQ=explicit?.q||before.q;
   assert.deepEqual(q.a,expectedA,'answer '+file+' '+id);assert.deepEqual(q.q,expectedQ,'question '+file+' '+id);
   assert.equal(q.o.findIndex(o=>o.en===q.a.en),ci,'correct slot');assert.equal(q.o.length,before.o.length);assert.deepEqual({...q,q:null,a:null,o:null},{...before,q:null,a:null,o:null},'explanations/refs/IDs unchanged');
   if(/\bmain (?:mcq|current affairs)/i.test(current[si].title.en))assert.deepEqual(q,before,'authored reading MCQ');
   if(explicit){assert.equal(q.o.length,4);assert.equal(engine.plans.get(id).revision,api.curatedRevision);totals.reframed+=explicit.q||explicit.a?1:0;fixture??={original:clone(original),si,qi,overrides};}
   if(JSON.stringify(q.o)!==JSON.stringify(before.o))q.o.forEach((o,i)=>{assert(o.en&&o.hi,'bilingual');assert(!q.o.slice(0,i).some(p=>api.same(p,o)),'equivalent choices '+file+' '+id+' '+o.en);});
   if(engine.plans.has(id)&&!explicit)legacyFixture??={original:clone(original),si,qi};
  }
 }
 // First-pass saved attempts that now receive explicit options must retain
 // the exact first-pass layout, including when that card was previously coherent.
 const firstPass=clone(original),firstEngine=api.compile(firstPass);firstEngine.apply({answers:{}});
 const upgraded=clone(original),upgradeEngine=api.compile(upgraded,overrides),oldAnswers={},oldRevisions={};
 for(const id of Object.keys(overrides)){oldAnswers[id]=0;oldRevisions[id]=api.revision;}
 upgradeEngine.apply({answers:oldAnswers,caOptionRevision:oldRevisions});
 for(const id of Object.keys(overrides)){const [si,qi]=id.split('-').map(Number);assert.deepEqual(upgraded[si].questions[qi],firstPass[si].questions[qi],'preserve first-pass submitted layout '+file+' '+id);}
 const legacy=clone(original),legacyEngine=api.compile(legacy,overrides),answers={};legacyEngine.plans.forEach((_,id)=>answers[id]=0);
 const state={answers,bookmarks:{'0-0':true},section:0,dark:false},snapshot=clone(state);legacyEngine.apply(state);assert.deepEqual(legacy,original,'legacy submitted cards retain original options');assert.deepEqual(state,snapshot,'saved progress unchanged');
 state.answers={};legacyEngine.apply(state);assert.deepEqual(legacy,current,'reset enables fixed options');
 for(const k of ['questions','authored','generated','repaired','alreadyRelated','curated'])totals[k]+=engine.report[k];totals.manualReview+=engine.report.unresolved.length;totals.quizzes++;
}
assert.equal(totals.quizzes,44);assert.equal(totals.questions,9606);assert.equal(totals.curated,2388);assert.equal(totals.manualReview,0);
// Editorial regressions: substitutions must not invent campuses, alter the
// country within an organisation's name or move one rail route to other states.
for(const overrides of Object.values(catalog))for(const e of Object.values(overrides)){
 for(const o of e.choices)assert(!/\b(?:IIT New Delhi|IIT Mumbai|IIT Chennai|IIM New Delhi|IIM Chennai|Geological Survey of (?:France|Germany|Japan)|both Houses of (?:Union Cabinet|Supreme Court|Election Commission)|Jind[–-]Sonipat [Rr]oute \((?:Bihar|Uttar Pradesh|Madhya Pradesh)\)|HIV.*(?:Bacterium|Fungus|Protozoan))\b/i.test(o.en),'malformed named entity: '+o.en);
 if(/^Smriti Mandhana/.test(e.source.a.en))assert(e.choices.every(o=>!/Sindhu|Nehwal|Mirza/.test(o.en)),'women cricketers need cricket distractors');
 if(/^IIM Ahmedabad/.test(e.source.a.en))assert.deepEqual(e.choices.map(o=>o.en),['IIM Bangalore','IIM Calcutta','IIM Lucknow']);
}
// First-pass attempts retain their existing context1 option layout.
const old=clone(legacyFixture.original),oldEngine=api.compile(old),oldId=legacyFixture.si+'-'+legacyFixture.qi;oldEngine.apply({answers:{[oldId]:0},caOptionRevision:{[oldId]:api.revision}});assert.deepEqual(old[legacyFixture.si].questions[legacyFixture.qi].o,oldEngine.plans.get(oldId).options);
// DOM installation, pick, save, reload and backwards navigation for curated2.
let ready;const app={window:{},document:{readyState:'loading',addEventListener(n,fn){if(n==='DOMContentLoaded')ready=fn;},getElementById(id){return id==='efp-ca-curated-options'?{textContent:JSON.stringify(fixture.overrides)}:null;}}};vm.createContext(app);
app.fixture=fixture.original;vm.runInContext('var SECTIONS=fixture;var current=0;var saved={answers:{},bookmarks:{},section:0,dark:false};var saves=0;window.renderQuestions=function(){};window.pick=function(qi,oi){var id=current+"-"+qi;if(saved.answers[id]!==undefined)return;saved.answers[id]=oi;saves++;};',app);vm.runInContext(source,app);ready();vm.runInContext('current='+fixture.si,app);app.window.pick(fixture.qi,0);
const state=clone(vm.runInContext('saved',app)),id=fixture.si+'-'+fixture.qi;assert.equal(state.caOptionRevision[id],api.curatedRevision);assert.equal(vm.runInContext('saves',app),1);
const reload=clone(fixture.original);api.compile(reload,fixture.overrides).apply(state);assert.deepEqual(reload[fixture.si].questions[fixture.qi],clone(app.fixture[fixture.si].questions[fixture.qi]));
const stale=clone(fixture.original);stale[fixture.si].questions[fixture.qi].a.en+=' changed';assert.throws(()=>api.compile(stale,fixture.overrides),/Stale CA options/);
if(process.argv.includes('--record'))fs.writeFileSync(path.join(root,'audits/current-affairs/relatable-options-20261104.json'),JSON.stringify({revision:api.curatedRevision,counts:totals,manualReview:{},delivery:'Per-quiz inline data; no extra network request; source master-data retained'},null,2)+'\n');
console.log('PASS '+JSON.stringify(totals));
