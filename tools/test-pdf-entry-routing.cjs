// Exercise reader fetches, explicit raw downloads and legacy search entry.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const source='/Crux-Tricks/pdfs/Books CRUX/Area.pdf',large='/Crux-Tricks/pdfs/Large.pdf';
const smallRaw='/_cf-assets/'+ 'a'.repeat(24) +'/original.pdf';
let click;
const context={URL,URLSearchParams,Map,Set,Uint8Array,AbortController,Promise,
 location:{href:'https://example.test/Crux-Tricks/viewer.html?id=ct0001',origin:'https://example.test'},
 EFP_CF_PDFS:{[large]:{length:8,chunkSize:8,parts:['part-0'],filename:'Large.pdf'}},
 EFP_CF_PDF_ROUTES:{[source]:{reader:'/Crux-Tricks/viewer?id=ct0001',raw:smallRaw},[large]:{reader:'/Crux-Tricks/viewer?id=ct0002'}},
 document:{addEventListener:(name,handler)=>{if(name==='click')click=handler}}
};
vm.createContext(context);vm.runInContext(read('cloudflare/pdf-assets.js'),context);
const api=context.EFP_CF_PDF;
assert.equal(api.find(source),null,'Small PDFs retain native PDF.js loading');
assert.equal(api.route(encodeURI(source)+'?reload=1').raw,smallRaw);
assert.equal(api.route('https://other.test'+encodeURI(source)),null,'External files must not be hijacked');
assert.equal(api.route('/unknown.pdf'),null);
let options;
const lib={getDocument:value=>{options=value;return {promise:Promise.resolve({})}}};
api.getDocument(lib,{url:encodeURI(source),password:'keep',rangeChunkSize:65536});
assert.equal(options.url,smallRaw);assert.equal(options.password,'keep');assert.equal(options.rangeChunkSize,65536);
api.getDocument(lib,{url:'https://other.test/a.pdf'});assert.equal(options.url,'https://other.test/a.pdf');
let anchor={href:'https://example.test'+encodeURI(source)+'#page=2'};
click({target:{closest:()=>anchor}});assert.equal(anchor.href,smallRaw+'#page=2');
anchor={href:'https://example.test'+large+'#page=3',removeAttribute:name=>assert.equal(name,'download')};
click({target:{closest:()=>anchor}});
assert.equal(new URL(anchor.href,'https://example.test').searchParams.get('download'),'1');
assert.equal(new URL(anchor.href,'https://example.test').hash,'#page=3');
const runtime=read('cloudflare/open-pdf.js');
function openEntry(search){
 let redirected,reads=0;
 const nodes=new Map();
 const env={URLSearchParams,Promise,location:{search,hash:'#page=3',replace:value=>{redirected=value}},
 EFP_CF_PDF:{route:api.route,find:()=>{reads++;return null}},
 document:{getElementById:id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id)}}};
 vm.runInNewContext(runtime,env);return {redirected,reads};
}
for(const filename of [source,large]){
 const result=openEntry('?file='+encodeURIComponent(filename));
 assert.equal(result.redirected,api.route(filename).reader+'#page=3');
 assert.equal(result.reads,0,'Search entry must not download raw PDF bytes first');
}
const explicit=openEntry('?file='+encodeURIComponent(large)+'&download=1');
assert.equal(explicit.redirected,undefined);assert.equal(explicit.reads,1,'Explicit Open PDF remains available');
console.log('PASS native small-PDF loading, unchanged options, raw buttons, fragments, external URLs and legacy opener entry');
