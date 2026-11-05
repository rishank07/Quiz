const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),context={window:{}};
for(const name of ['data','states','state-notes','state-study'])vm.runInNewContext(fs.readFileSync(path.join(root,'Mapping/assets/'+name+'.js'),'utf8'),context);
const D=context.window.MAPPING_DATA,N=context.window.MAPPING_STATE_NOTES,U=context.window.MappingStateStudy;
assert.equal(N.profiles.length,36);assert.equal(N.profiles.filter(p=>!p.ut).length,28);assert.equal(N.profiles.filter(p=>p.ut).length,8);
assert.equal(new Set(N.profiles.map(p=>p.id)).size,36);assert.equal(N.categories.length,8);assert.equal(N.profiles.reduce((sum,p)=>sum+p.ramsar.length,0),103);
assert.equal(D.questions.length,527);assert.equal(new Set(D.questions.map(q=>q.id)).size,527);
assert.equal(new Set(D.features.map(f=>f.id)).size,D.features.length);
const featureIds=new Set(D.features.map(f=>f.id)),sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
const searchContext={};vm.runInNewContext(fs.readFileSync(path.join(root,'search-index-main.js'),'utf8'),searchContext);
let notes=0,mapLinks=0;
for(const p of N.profiles){
 assert(p.name&&p.hi&&p.capital&&p.capitalHi);assert.equal(U.resolveRegion(p.name),p.id);
 assert(context.window.MAPPING_STATES.some(s=>s.name===p.name),p.name+' has map geometry');
 assert(U.memberships.get(p.id).has(p.capitalId),p.name+' includes capital connection');
 for(const c of N.categories.filter(c=>c.id!=='ramsar')){
  assert(p.sections[c.id]?.length,p.name+' / '+c.id);
  for(const r of p.sections[c.id]){for(const key of ['name','hi','fact','factHi'])assert.equal(typeof r[key],'string',p.name+' / '+key);assert(/[\u0900-\u097f]/.test(r.factHi));}
 }
 const count=Object.values(p.sections).flat().length+p.ramsar.length;notes+=count;
 const html=U.profileHtml(p),staticFile=path.join(root,'Mapping/states',U.slug(p),'index.html'),staticHtml=fs.readFileSync(staticFile,'utf8');
 assert.equal((html.match(/class="state-note-section"/g)||[]).length,8);
 assert.equal((staticHtml.match(/class="state-note-row"/g)||[]).length,count);
 assert(!/undefined|\[object Object\]/.test(html));
 for(const match of html.matchAll(/data-note-place="([^"]+)"/g)){mapLinks++;assert(featureIds.has(match[1]));assert(U.memberships.get(p.id).has(match[1]));}
 const url='https://examfusionprep.com/Mapping/states/'+U.slug(p)+'/';
 assert(staticHtml.includes('<link rel="canonical" href="'+url+'">'));assert(sitemap.includes('<loc>'+url+'</loc>'));
 assert(searchContext.SEARCH_INDEX.some(e=>e.url==='./Mapping/states/'+U.slug(p)+'/'));
 for(const json of staticHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))JSON.parse(json[1]);
 assert(!/<mark>[^<]*[.!?] ?<\/mark>/.test(staticHtml),'No whole-sentence highlighting');
}
const index=fs.readFileSync(path.join(root,'Mapping/index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'Mapping/sw.js'),'utf8');
for(const file of ['state-notes.js','state-study.js','state-study.css'])assert(index.includes(file+'?v=20261105states1')&&sw.includes(file+'?v=20261105states1'));
assert(index.indexOf('state-study.js')<index.indexOf('assets/app.js'));
assert(!index.includes('javascript:'));
assert.equal(notes,667);assert(mapLinks>50);
console.log('PASS: 28 states + 8 UTs, '+notes+' bilingual entries, 103 dated Ramsar sites, '+mapLinks+' valid map links, 37 static pages, sitemap/search and 527 preserved questions.');
