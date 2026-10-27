// No network or browser dependencies. Exercise real range delivery and the
// service-worker route for immutable PDF bytes, including failures and offline.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
async function rangeChecks(){
 const bytes=Uint8Array.from({length:189},(_,i)=>i),calls=new Map();let active=0,peak=0;
 const asset={length:bytes.length,chunkSize:8,parts:Array.from({length:24},(_,i)=>'part-'+i)};
 const context={URL,Map,Set,Uint8Array,AbortController,navigator:{deviceMemory:4},location:{href:'https://example.test/',origin:'https://example.test'},EFP_CF_PDFS:{'/book.pdf':asset},
  fetch:async(url,{signal})=>{const i=Number(url.split('-')[1]);calls.set(i,(calls.get(i)||0)+1);active++;peak=Math.max(peak,active);
   try{await new Promise((resolve,reject)=>{const timer=setTimeout(resolve,10);signal.addEventListener('abort',()=>{clearTimeout(timer);reject(new Error('aborted'))},{once:true})});return new Response(bytes.slice(i*8,(i+1)*8))}finally{active--}}
 };
 vm.createContext(context);vm.runInContext(read('cloudflare/pdf-assets.js'),context);
 const source=context.EFP_CF_PDF.reader(asset);
 const [a,b]=await Promise.all([source.range(3,52),source.range(8,24)]);
 assert.deepEqual(Array.from(a),Array.from(bytes.slice(3,52)));assert.deepEqual(Array.from(b),Array.from(bytes.slice(8,24)));
 assert.equal(calls.get(1),1,'Overlapping reads share the same in-flight part');assert(peak>1&&peak<=4,'One range uses bounded parallel downloads');
 const fetched=Array.from(calls.values()).reduce((a,b)=>a+b,0);
 await source.range(3,52);assert.equal(Array.from(calls.values()).reduce((a,b)=>a+b,0),fetched,'Warm parts stay in memory');
 await source.range(180,bytes.length);assert.equal(calls.get(23),1,'Short final part is valid');
 const cancelled=context.EFP_CF_PDF.reader(asset),pending=cancelled.range(0,8);cancelled.stop();await assert.rejects(pending,/aborted/);await assert.rejects(cancelled.range(0,8),/cancelled/);
 asset.viewer={...asset,length:200,parts:asset.parts.concat('part-24')};let config;
 const lib={PDFDataRangeTransport:class{constructor(length){this.length=length}},getDocument:options=>{config=options;return {promise:Promise.resolve({}),destroy:()=>Promise.resolve()}}};
 await context.EFP_CF_PDF.getDocument(lib,{url:'/book.pdf',password:'keep'}).promise;
 assert.equal(config.length,200);assert.equal(config.rangeChunkSize,8);assert.equal(config.password,'keep');
 source.stop();console.log('PASS exact ranges, shared downloads, bounded concurrency, warm cache, cancellation and compact viewer selection');
}
async function workerChecks(){
 const stored=new Map(),handlers={},pending=[];let fetched=0,offline=false,status=200;
 const cache={async match(request){const r=stored.get(request.url);return r&&r.clone()},async put(request,response){stored.set(request.url,new Response(await response.arrayBuffer(),{headers:response.headers}))}};
 const context={console,URL,Request,Response,Headers,Map,Set,Date,setTimeout,clearTimeout,
  caches:{open:async()=>cache,match:request=>cache.match(request)},
  fetch:async()=>{fetched++;if(offline)throw Error('offline');return new Response(Uint8Array.of(1,2,3,4),{status})},
  self:{location:{origin:'https://example.test'},addEventListener:(name,fn)=>handlers[name]=fn}};
 vm.createContext(context);vm.runInContext(read('service-worker.js'),context);
 async function get(hash='a'.repeat(24),part='0000'){
  let promise;handlers.fetch({request:new Request('https://example.test/_cf-assets/'+hash+'/part-'+part+'.bin'),respondWith:p=>promise=p,waitUntil:p=>pending.push(p)});
  const response=await promise,bytes=Array.from(new Uint8Array(await response.arrayBuffer()));await Promise.all(pending.splice(0));return {status:response.status,bytes};
 }
 assert.deepEqual((await get()).bytes,[1,2,3,4]);assert.equal(fetched,1);
 assert.deepEqual((await get()).bytes,[1,2,3,4]);assert.equal(fetched,1,'Reading a cached hash must not start a background download');
 offline=true;assert.deepEqual((await get()).bytes,[1,2,3,4]);assert.equal(fetched,1);
 assert.equal((await get('b'.repeat(24))).status,503);assert.equal(stored.size,1,'Offline failures must not poison the cache');
 offline=false;status=503;assert.equal((await get('b'.repeat(24))).status,503);assert.equal(stored.size,1);
 status=200;assert.equal((await get('b'.repeat(24))).status,200);assert.equal(stored.size,2,'A changed hash receives its own bytes');
 console.log('PASS immutable PDF parts: first-use storage, zero warm/background fetches, offline reuse, changed hashes and failure recovery');
}
(async()=>{await rangeChecks();await workerChecks()})().catch(e=>{console.error(e);process.exitCode=1});
