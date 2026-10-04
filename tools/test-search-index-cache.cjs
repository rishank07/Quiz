// Exercise real service-worker compression, canonical storage keys, revision
// changes, offline reads and the plain-data path on older browsers.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..'),code=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
async function suite(compression){
 const stored=new Map(),handlers={},pending=[];let fetched=0,offline=false,plain='window.INDEX = '+JSON.stringify(Array.from({length:2000},(_,i)=>({t:'BRICS भारत 2026',x:'Question '+i+' — repeated bilingual text'})))+';';
 const key=r=>typeof r==='string'?r:r.url;
 const cache={async match(r){const entry=stored.get(key(r));return entry&&entry.clone()},async put(r,response){const bytes=await response.arrayBuffer();stored.set(key(r),new Response(bytes,{headers:response.headers}))}};
 const c={console,URL,Request,Response,Headers,Map,Date,CompressionStream:compression?CompressionStream:undefined,DecompressionStream:compression?DecompressionStream:undefined,
  caches:{open:async()=>cache},fetch:async()=>{fetched++;if(offline)throw Error('offline');return new Response(plain,{headers:{'content-type':'application/javascript'}})},self:{location:{origin:'https://examfusionprep.com'},addEventListener:(name,fn)=>handlers[name]=fn}};
 vm.createContext(c);vm.runInContext(code,c);
 async function request(revision){const response=await c.searchIndexAsset({request:new Request('https://examfusionprep.com/search-snippets-example.js?v='+revision),waitUntil:p=>pending.push(p)});const text=await response.text();await Promise.all(pending.splice(0));return text}
 assert.equal(await request('1'),plain);assert.equal(stored.size,1);const firstFetches=fetched;
 assert.equal(await request('1'),plain);assert.equal(fetched,firstFetches,'Warm unchanged revision must avoid download');
 plain=plain.replace('BRICS','BRICS changed');assert.equal(await request('2'),plain);assert.equal(stored.size,1,'Changed versions must replace, not duplicate a large index');
 offline=true;assert.equal(await request('3'),plain,'Offline must return original script bytes from last cache');
 const response=Array.from(stored.values())[0],size=(await response.clone().arrayBuffer()).byteLength;
 assert.equal(response.headers.get('content-type'),'application/javascript');
 if(compression){assert.equal(response.headers.get('x-efp-search-compression'),'gzip');assert(size<Buffer.byteLength(plain)*0.2)}else assert.equal(response.headers.get('x-efp-search-compression'),null);
 console.log('PASS search cache:',compression?'gzip':'plain compatibility','one copy, revision refresh, warm reuse, lossless offline; bytes',Buffer.byteLength(plain),'→',size);
}
(async()=>{await suite(true);await suite(false)})().catch(e=>{console.error(e);process.exitCode=1});
