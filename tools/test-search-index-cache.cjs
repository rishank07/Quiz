// Exercise real service-worker compression, canonical storage keys, revision
// changes, offline reads and the plain-data path on older browsers.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..'),code=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
async function suite(compression,indexPath){
 const stored=new Map(),handlers={},pending=[];let fetched=0,lastFetchCache,offline=false,plain='window.INDEX = '+JSON.stringify(Array.from({length:2000},(_,i)=>({t:'BRICS भारत 2026',x:'Question '+i+' — repeated bilingual text'})))+';';
 const key=r=>typeof r==='string'?r:r.url;
 const cache={async match(r,options){let entry=stored.get(key(r));if(!entry&&options?.ignoreSearch){const requested=new URL(key(r));entry=Array.from(stored).find(([k])=>{const u=new URL(k);return u.origin+u.pathname===requested.origin+requested.pathname})?.[1]}return entry&&entry.clone()},async put(r,response){const bytes=await response.arrayBuffer();stored.set(key(r),new Response(bytes,{headers:response.headers}))}};
 const c={console,URL,Request,Response,Headers,Map,Date,CompressionStream:compression?CompressionStream:undefined,DecompressionStream:compression?DecompressionStream:undefined,
  caches:{open:async()=>cache,match:(r,o)=>cache.match(r,o)},fetch:async(request,options)=>{fetched++;lastFetchCache=options?.cache;if(offline)throw Error('offline');return new Response(plain,{headers:{'content-type':'application/javascript'}})},self:{location:{origin:'https://examfusionprep.com'},addEventListener:(name,fn)=>handlers[name]=fn}};
 vm.createContext(c);vm.runInContext(code,c);
 async function request(revision){let responsePromise;handlers.fetch({request:new Request('https://examfusionprep.com'+indexPath+'?v='+revision),waitUntil:p=>pending.push(p),respondWith:p=>{responsePromise=p}});assert(responsePromise,'The fetch handler must intercept the index');const response=await responsePromise;const text=await response.text();await Promise.all(pending.splice(0));return text}
 assert.equal(await request('1'),plain);assert.equal(lastFetchCache,'no-cache','Index requests must revalidate instead of using the generic stale route');assert.equal(stored.size,1);const firstFetches=fetched;
 assert.equal(await request('1'),plain);assert.equal(fetched,firstFetches,'Warm unchanged revision must avoid download');
 const saved=Array.from(stored.entries())[0];
 const agedHeaders=new Headers(saved[1].headers);agedHeaders.set('x-efp-search-cached-at',String(Date.now()-86400000));
 stored.set(saved[0],new Response(await saved[1].arrayBuffer(),{headers:agedHeaders}));
 assert.equal(await request('1'),plain);assert.equal(fetched,firstFetches,'Same revision must remain reusable after five minutes');
 plain=plain.replace('BRICS','BRICS changed');assert.equal(await request('2'),plain);assert.equal(stored.size,1,'Changed versions must replace, not duplicate a large index');
 offline=true;assert.equal(await request('3'),plain,'Offline must return original script bytes from last cache');
 const response=Array.from(stored.values())[0],size=(await response.clone().arrayBuffer()).byteLength;
 assert.equal(response.headers.get('content-type'),'application/javascript');
 if(compression){assert.equal(response.headers.get('x-efp-search-compression'),'gzip');assert(size<Buffer.byteLength(plain)*0.2)}else assert.equal(response.headers.get('x-efp-search-compression'),null);
 console.log('PASS search cache:',indexPath,compression?'gzip':'plain compatibility','one copy, revision refresh, warm reuse, lossless offline; bytes',Buffer.byteLength(plain),'→',size);
}
(async()=>{for(const indexPath of ['/search-snippets-example.js','/Bihar%20Special/Topic%20Names/search-index.js']){await suite(true,indexPath);await suite(false,indexPath)}})().catch(e=>{console.error(e);process.exitCode=1});
