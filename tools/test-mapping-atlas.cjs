const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'Mapping/index.html'),'utf8');
class El{
 constructor(id=''){this.id=id;this.children=[];this.attrs={};this.dataset={};this.style={};this.hidden=false;this.value='';this.textContent='';this.innerHTML='';this.events={};this.classes=new Set();this.classList={toggle:(k,on)=>{if(on===undefined)on=!this.classes.has(k);if(on)this.classes.add(k);else this.classes.delete(k);},contains:k=>this.classes.has(k)};}
 setAttribute(k,v){this.attrs[k]=String(v);if(k==='class')this.classes=new Set(String(v).split(' '));}
 getAttribute(k){return this.attrs[k]??null;}removeAttribute(k){delete this.attrs[k];}append(...xs){this.children.push(...xs);}replaceChildren(...xs){this.children=xs;}
 addEventListener(k,fn){(this.events[k]??=[]).push(fn);}querySelectorAll(){return [];}getBoundingClientRect(){return {x:0,y:0,width:globalWidth,height:globalHeight};}
 focus(){}scrollIntoView(){}showModal(){this.open=true;}close(){this.open=false;}
}
let globalWidth=1400,globalHeight=760;
const nodes=new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],new El(m[1])]));
const $=id=>{assert(nodes.has(id),'Missing element '+id);return nodes.get(id);};$('sessionSize').value='20';
const regionNodes=['India','World','Bihar','UP'].map(v=>{const e=new El();e.dataset.region=v;return e;});
const modeNodes=['learn','locate','practice','pyq','mistakes'].map(v=>{const e=new El();e.dataset.mode=v;return e;});
$('modeTabs').querySelectorAll=()=>modeNodes;
const events={},data=new Map(),loc={hash:'',protocol:'http:'};
const ctx={window:null,document:{getElementById:$,createElementNS:()=>new El(),createElement:()=>new El(),documentElement:new El(),body:new El(),querySelectorAll:s=>s.includes('region')?regionNodes:s.includes('mode')?modeNodes:[],addEventListener:(k,fn)=>{(events[k]??=[]).push(fn)}},localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},location:loc,history:{pushState:(_a,_b,v)=>loc.hash=v,replaceState:(_a,_b,v)=>loc.hash=v},navigator:{},innerWidth:1400,URLSearchParams,URL,Blob,MouseEvent:class{},setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:()=>1,cancelAnimationFrame(){},confirm:()=>true,ResizeObserver:class{observe(){}},console};
ctx.window=ctx;ctx.addEventListener=(k,fn)=>{(events[k]??=[]).push(fn)};vm.createContext(ctx);
for(const name of ['data.js','states.js','rivers.js'])vm.runInContext(fs.readFileSync(path.join(root,'Mapping/assets',name),'utf8'),ctx);
const app=fs.readFileSync(path.join(root,'Mapping/assets/app.js'),'utf8');
new vm.Script(app);
vm.runInContext(app.replace(/\}\)\(\);\s*$/,'window.__test={state,getSession:()=>session,getQuestion:activeQ,refresh,beginSession,answer,next,previous,readHash,renderMap,setDefaultView,filteredFeatures,setView,getSaved:()=>saved};})();'),ctx);
const t=ctx.__test,D=ctx.MAPPING_DATA,S=ctx.MAPPING_STATES;
assert.equal(D.features.length,346);assert.equal(D.questions.length,527);assert.equal(S.length,36);
const byState=new Map(S.map(s=>[s.id,s]));
for(const s of S)for(const n of s.neighbors)assert.notEqual(s.color,byState.get(n).color,s.name+' adjacent state colour');
assert(t.state.names,'Names enabled on first visit');assert.equal($('countryLayer').children.length,1,'India view excludes neighbouring countries');
assert.equal($('stateLayer').children.length,37,'All states plus national outline');
const labels=$('markerLayer').children.filter(e=>e.attrs.class?.startsWith('feature-label'));
assert(labels.length>=30,'River learning view labels '+labels.length);
t.state.names=false;t.renderMap();assert.equal($('markerLayer').children.filter(e=>e.attrs.class?.startsWith('feature-label')).length,0,'Hide names hides selected labels too');t.state.names=true;t.renderMap();
const widths=[];
for(const [w,h]of [[1400,760],[390,560],[320,530],[844,330]]){
 globalWidth=w;globalHeight=h;ctx.innerWidth=w;t.renderMap();
 const count=$('markerLayer').children.filter(e=>e.attrs.class?.startsWith('feature-label')).length;
 assert(count>=20,'Labels remain useful at '+w+': '+count);
 widths.push({width:w,height:h,labels:count});
}
t.beginSession('locate','ganga');assert(t.getSession().items.length);assert.equal($('riverLayer').children.length,0,'Unanswered locate hides river courses');
assert.equal($('stateLabelLayer').children.length,0,'Unanswered locate hides state labels');
assert($('markerLayer').children.every(e=>!e.attrs['aria-label']||/^Choose marker \d+$/.test(e.attrs['aria-label'])),'Accessible markers must not leak answer names');
assert.equal($('namesToggle').disabled,true);
t.answer(t.getSession().items[0].answer);assert.equal(t.getSaved().answers['locate-ganga'].correct,true);assert.equal(t.getSession().correct,1);t.answer(0);assert.equal(t.getSession().correct,1,'Double submit ignored');
t.next();assert.equal(t.getSession().complete,true);assert(!t.getQuestion(),'Completed sessions have no active question');t.previous();assert.equal(t.getSession().index,0);assert.equal(t.getSession().correct,1,'Back preserves score');
const questionSnapshot=JSON.stringify(D.questions),featureSnapshot=JSON.stringify(D.features);
t.state.mode='learn';t.state.search='a name that does not exist';t.refresh();assert.equal(t.filteredFeatures().length,0);assert.equal($('markerLayer').children.length,0);
loc.hash='#region=World&topic=worldphysical&mode=learn&country=XYZ';t.readHash();t.setDefaultView();t.refresh();assert.equal(t.state.country,'');assert($('countryLayer').children.length>100);
loc.hash='#region=India&topic=rivers&country=USA&continent=Europe';t.readHash();t.setDefaultView();t.refresh();assert.equal(t.state.country,'');assert.equal(t.state.continent,'');assert.equal($('countryLayer').children.length,1);
loc.hash='#region=Bihar&topic=all&mode=learn';t.readHash();t.setDefaultView();t.refresh();assert(t.filteredFeatures().every(f=>f.region==='India'));assert(t.filteredFeatures().some(f=>f.id==='patna'));
loc.hash='#region=UP&topic=all&mode=learn';t.readHash();t.setDefaultView();t.refresh();assert(t.filteredFeatures().some(f=>f.id==='lucknow'));
assert.equal(JSON.stringify(D.questions),questionSnapshot);assert.equal(JSON.stringify(D.features),featureSnapshot);assert.equal(t.getSaved().answers['locate-ganga'].correct,true);
assert(html.includes('https://examfusionprep.com/Mapping/'));for(const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))JSON.parse(m[1]);
for(const id of ['map','namesToggle','stateNamesToggle','focusPlace','fullMap','closeMap','labelStatus'])assert(nodes.has(id));
module.exports={passed:true,locations:D.features.length,questions:D.questions.length,states:S.length,viewports:widths,checks:['adjacent colours','learning labels','answer leakage','double submit','saved progress','previous question','empty search','invalid hash','world view','Bihar/UP filters','metadata']};

if(require.main===module)console.log('PASS: mapping atlas',module.exports);
