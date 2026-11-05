const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const handlers={},entries=new Map();let offline=false;
const cache={async put(key,response){entries.set(String(key.url||key),response.clone());},async match(key){return entries.get(String(key.url||key))?.clone();}};
const context={URL,Request,Response,caches:{async open(){return cache;}},self:{registration:{scope:'https://example.test/Mapping/'},location:{origin:'https://example.test'},addEventListener(type,handler){handlers[type]=handler;}},fetch:async req=>{if(offline)throw Error('Offline');return new Response(req.url.includes('/states/')?'Gujarat reading notes':'Interactive atlas');}};
vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../Mapping/sw.js'),'utf8'),context);
function navigate(relative){let response;handlers.fetch({request:{method:'GET',mode:'navigate',url:'https://example.test'+relative},respondWith(promise){response=promise;}});return response;}
(async()=>{
 assert.equal(await(await navigate('/Mapping/?v=states')).text(),'Interactive atlas');
 assert.equal(await(await navigate('/Mapping/states/gujarat/')).text(),'Gujarat reading notes');
 offline=true;
 assert.equal(await(await navigate('/Mapping/')).text(),'Interactive atlas','A reading-page visit must never overwrite the offline atlas');
 assert.equal(await(await navigate('/Mapping/index.html')).text(),'Interactive atlas');
 assert.equal(await(await navigate('/Mapping/states/gujarat/?v=1')).text(),'Gujarat reading notes');
 assert.equal((await navigate('/Mapping/states/kerala/')).status,503,'Uncached pages must not impersonate cached state notes');
 console.log('PASS: atlas and individual reading pages keep separate offline cache entries; query variants and index.html resolve correctly.');
})().catch(err=>{console.error(err);process.exitCode=1;});
