// Run with node tools/test-current-affairs-parent-fallback.cjs; no dependencies.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'back-nav.js'),'utf8');
const mapSource=fs.readFileSync(path.join(root,'back-parent-map.js'),'utf8');
const map=JSON.parse(mapSource.match(/Object\.freeze\((\{[\s\S]*?\})\)/)[1]);
const body=source.match(/  function logicalParentUrl\(\) \{([\s\S]*?)\n  \}\n\n  function buildCruxStateFromDocId/)[1];
const resolve=new Function('window','normalizePath','isMindMapsInnerPage','URL',body);
const normalize=value=>decodeURIComponent(value).replace(/\/+$/,'')||'/';
const w={location:{origin:'https://examfusionprep.com',pathname:'/'},EFP_BACK_PARENT_MAP:map};
const parent=()=>resolve(w,normalize,()=>false,URL);
let cases=0;
for(const [file,expected]of Object.entries(map)){
  if(!file.startsWith('/Current Affairs/'))continue;
  w.location.pathname=file;w.EFP_BACK_PARENT_MAP=map;
  assert.equal(decodeURIComponent(parent().pathname),expected);cases++;
  if(/^\/Current Affairs\/Topic Names\/(?:Rapid Practice\/)?\d{4}\//.test(file)){
    for(const alias of [file,file.replace(/\.html$/,'')]){
      w.location.pathname=alias;w.EFP_BACK_PARENT_MAP=undefined;
      assert.equal(decodeURIComponent(parent().pathname),expected,'missing map '+alias);cases++;
      w.EFP_BACK_PARENT_MAP=Object.freeze({});
      assert.equal(decodeURIComponent(parent().pathname),expected,'stale map '+alias);cases++;
    }
  }
}
w.location.pathname='/unmapped-future-page.html';w.EFP_BACK_PARENT_MAP={};
assert.equal(parent(),null,'unrelated unknown pages must not jump Home');
w.location.pathname='/self.html';w.EFP_BACK_PARENT_MAP={'/self.html':'/self.html'};assert.equal(parent(),null);
w.EFP_BACK_PARENT_MAP={'/self.html':'https://unrelated.invalid/'};assert.equal(parent(),null);
const marker='/* Window capture runs before legacy document/inline Back handlers.';
const handlerSource=source.slice(source.indexOf(marker),source.indexOf('  function isGenericHomeSearchGuardState'));
let handler,callback,releaseCount=0,navigated='';
w.addEventListener=(name,fn)=>{if(name==='click')handler=fn};
w.EFP_QUIZ_PROGRESS_WARNING=undefined;
const context={window:w,location:w.location,URL,logicalParentUrl:parent,isOriginalPracticePage:()=>false,isCruxViewer:()=>false,isCruxTricksRoot:()=>false,
 consumeBackEvent:event=>{event.consumed=true;},
 navigateQuizParent:()=>{navigated=parent().href;return true;}};
vm.runInNewContext(handlerSource,context);
const control={disabled:false,target:'',tagName:'BUTTON',hasAttribute:()=>false,matches:()=>false};
function click(){const event={button:0,target:{closest:()=>control}};handler(event);assert(event.consumed);return event}
w.location.pathname='/Current%20Affairs/Topic%20Names/Rapid%20Practice/2026/Topic%20Wise/Name_Changes_2026_Current_Affairs_Rapid_Practice.html';
w.EFP_BACK_PARENT_MAP={};click();
assert.equal(decodeURIComponent(new URL(navigated).pathname),'/Current Affairs/Topic Names/Rapid Practice.html');
navigated='';w.EFP_QUIZ_PROGRESS_WARNING={confirmLeave:action=>{callback=action;},releaseBackGuard:action=>{releaseCount++;action()}};
click();assert(!navigated,'Stay/pending confirmation must remain on quiz');callback();
assert.equal(releaseCount,1);assert.equal(decodeURIComponent(new URL(navigated).pathname),'/Current Affairs/Topic Names/Rapid Practice.html');
console.log('PASS',cases,'CA parent cases, extensionless routes, missing/stale maps, actual Back click, Stay/approved Quit and safe unknown/self/external rejection');
