/* Integration checks for the generated static site. No live traffic is sent.
 * Usage: node tools/test-cloudflare-pages.cjs
 * Optional: EFP_PDFJS_TEST_DIR points to pdf.js and pdf.worker.js v3.11.174.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const vm = require('node:vm');
const crypto = require('node:crypto');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'cloudflare-dist');
const report = JSON.parse(fs.readFileSync(path.join(out, 'cloudflare-build-report.json')));
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const read = p => fs.readFileSync(p, 'utf8');
function flattenHash(groups) {
  const hash = crypto.createHash('sha256');
  for (const group of groups) {
    const base = {...group}; delete base.x; delete base.a;
    for (let i=0; i<group.x.length; i++) hash.update(JSON.stringify([base, group.x[i], group.a?.[i] ?? null]));
  }
  return hash.digest('hex');
}
const expected = {};
for (const [source, record] of Object.entries(report.indexes)) {
  const original = {window:{}};
  vm.runInNewContext(read(path.join(root, source)), original);
  const rebuilt = {window:{}};
  for (const part of record.parts) vm.runInNewContext(read(path.join(out, part)), rebuilt);
  assert.equal(flattenHash(rebuilt.window[record.global]), flattenHash(original.window[record.global]), source);
  expected[source] = {groups: rebuilt.window[record.global].length,
    snippets: rebuilt.window[record.global].reduce((n,g)=>n+g.x.length,0)};
  console.log('PASS complete search content:', source, expected[source].snippets, 'snippets');
}
for (const [source, record] of Object.entries(report.pdfs)) {
  const hash = crypto.createHash('sha256'); let bytes=0;
  for (const part of record.parts) { const data=fs.readFileSync(path.join(out,part));hash.update(data);bytes+=data.length; }
  assert.equal(bytes, record.length);
  assert.equal(hash.digest('hex'), sha(fs.readFileSync(path.join(root, source))));
  if(record.viewer){
    const view=Buffer.concat(record.viewer.parts.map(part=>fs.readFileSync(path.join(out,part))));
    assert.equal(view.length,record.viewer.length);
    assert.equal(sha(view),record.viewer.sha256);
    assert.deepEqual(view.subarray(0,record.length),fs.readFileSync(path.join(root,source)), 'Viewer update must preserve every original byte');
    assert.ok(view.length-record.length<200000,'Page-tree metadata must stay small');
  }
  console.log('PASS byte-identical PDF:', record.filename);
}
function walk(p) { return fs.readdirSync(p,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(path.join(p,x.name)):[path.join(p,x.name)]); }
const files=walk(out);
assert.ok(files.length<=20000);
assert.ok(files.every(p=>fs.statSync(p).size<=25*1024*1024));
assert.ok(!fs.existsSync(path.join(out,'functions'))&&!fs.existsSync(path.join(out,'_worker.js')));
assert.ok(!fs.existsSync(path.join(out,'AGENTS.md'))&&!fs.existsSync(path.join(out,'tools')));
console.log('PASS Pages Free file limits and static-only output');

for (const filename of ['.well-known/assetlinks.json', 'manifest.webmanifest']) {
  const original = fs.readFileSync(path.join(root, filename));
  const deployed = fs.readFileSync(path.join(out, filename));
  assert.deepEqual(deployed, original, 'Preserve app association and manifest: ' + filename);
  JSON.parse(deployed.toString('utf8'));
}
console.log('PASS Android website association and PWA manifest preserved');

const mime={'.js':'application/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.pdf':'application/pdf','.bin':'application/octet-stream','.webmanifest':'application/manifest+json','.wasm':'application/wasm'};
const pdfDir=process.env.EFP_PDFJS_TEST_DIR;
const server=http.createServer((req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost'), decoded=decodeURIComponent(url.pathname);
    if(decoded==='/__test__'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Integration test</title>');return;}
    if(decoded.startsWith('/__pdfjs/')&&pdfDir){const p=path.join(pdfDir,path.basename(decoded));res.setHeader('Content-Type','application/javascript');fs.createReadStream(p).on('error',()=>{res.statusCode=404;res.end()}).pipe(res);return;}
    if(report.pdfs[decoded]){res.writeHead(302,{Location:'/open-original-pdf.html?file='+encodeURIComponent(decoded)});res.end();return;}
    const source=decoded.startsWith('/__source__/');
    let rel=source?decoded.slice('/__source__/'.length):decoded;
    if(!source&&rel.endsWith('.html')){res.writeHead(301,{Location:rel.endsWith('/index.html')?rel.slice(0,-10)+url.search:rel.slice(0,-5)+url.search});res.end();return;}
    const base=source?root:out;
    let filename=path.join(base,rel);
    if(!filename.startsWith(base+path.sep)&&filename!==base){res.statusCode=403;res.end();return;}
    if(fs.existsSync(filename)&&fs.statSync(filename).isDirectory())filename=path.join(filename,'index.html');
    if(!fs.existsSync(filename)&&fs.existsSync(filename+'.html'))filename+='.html';
    if(!fs.existsSync(filename)){res.statusCode=404;res.end('Not found');return;}
    res.setHeader('Content-Type',mime[path.extname(filename)]||'application/octet-stream');
    res.setHeader('Content-Length',fs.statSync(filename).size);
    fs.createReadStream(filename).pipe(res);
  }catch(e){res.statusCode=500;res.end(e.message);}
});

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const portable=process.env.EFP_CHROMIUM_MODULE?require(process.env.EFP_CHROMIUM_MODULE):null;
  const browser=await chromium.launch({headless:true,
    args:portable?portable.args:undefined,
    executablePath:portable?await portable.executablePath():process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||chromium.executablePath()});
  try {
    const context=await browser.newContext();
    // Never count assistant verification as real visitor traffic.
    await context.route(/google-analytics\.com|googletagmanager\.com/,route=>route.abort());
    if(pdfDir)await context.route(/https:\/\/.*pdfjs-dist@3\.11\.174\/build\/pdf(\.worker)?\.min\.js/,route=>route.fulfill({path:path.join(pdfDir,route.request().url().includes('pdf.worker')?'pdf.worker.js':'pdf.js'),contentType:'application/javascript'}));
    const page=await context.newPage();page.setDefaultTimeout(60000);
    for(const [source,record] of Object.entries(report.indexes)){
      const search=async(raw)=>{
        await page.goto(origin+'/__test__');
        return page.evaluate(async({source,record,raw})=>{
          const worker=new Worker('/search-worker.js');
          try{return await new Promise((resolve,reject)=>{
            const timer=setTimeout(()=>reject(new Error('Worker timeout')),60000);
            worker.onerror=e=>{clearTimeout(timer);reject(new Error(e.message));};
            worker.onmessage=e=>{const m=e.data;if(m.type==='error'){clearTimeout(timer);reject(new Error(m.message));}
              if(m.type==='ready')worker.postMessage({type:'search',id:1,query:'economy'});
              if(m.type==='result'){clearTimeout(timer);resolve(m.results);}};
            worker.postMessage({type:'init',options:{indexUrl:location.origin+(raw?'/__source__':'')+source,globalName:record.global,mode:'snippet',limit:5}});
          });}finally{worker.terminate();}
        },{source,record,raw});
      };
      const actual=await search(false),original=await search(true);
      assert.ok(original.length>0,'Nonempty reference search');assert.deepEqual(actual,original);
      console.log('PASS worker search matches original:',source);
      await page.goto(origin+'/__test__');
      await page.addScriptTag({url:origin+'/search-logic.js'});
      const fallback=await page.evaluate(async({source,record})=>{
        const rows=await efLoadSearchIndexScript(source,record.global);
        return {groups:rows.length,snippets:rows.reduce((n,g)=>n+g.x.length,0)};
      },{source,record});
      assert.deepEqual(fallback,expected[source]);
      console.log('PASS no-Worker browser fallback:',source);
    }
    if(pdfDir){
      const manifestContext={window:{}};vm.runInNewContext(read(path.join(root,'Crux-Tricks/crux-manifest.js')),manifestContext);
      const docs=manifestContext.window.EF_CRUX_DOCS;
      assert.ok(Array.isArray(docs),'Crux manifest docs');
      for(const [source,asset]of Object.entries(report.pdfs)){
        const doc=docs.find(d=>decodeURIComponent(new URL(d.pdf,origin+'/Crux-Tricks/').pathname)===source);
        assert.ok(doc,'PDF manifest ID for '+source);
        await page.goto(origin+'/__test__');
        await page.addScriptTag({url:origin+'/__pdfjs/pdf.js'});
        await page.addScriptTag({url:origin+'/cf-pdf-assets.js'});
        const results=await page.evaluate(async source=>{
          pdfjsLib.GlobalWorkerOptions.workerSrc='/__pdfjs/pdf.worker.js';
          const parts=new Set(),originalFetch=window.fetch;
          window.fetch=function(url,options){if(String(url).endsWith('.bin'))parts.add(String(url));return originalFetch.call(this,url,options)};
          const task=EFP_CF_PDF.getDocument(pdfjsLib,{url:source});
          const pdf=await task.promise, count=pdf.numPages, rendered=[],startupParts=parts.size;
          for(const number of [1,Math.ceil(count/2),count]){
            const p=await pdf.getPage(number),viewport=p.getViewport({scale:.25});
            const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
            await p.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
            rendered.push({page:number,width:canvas.width,height:canvas.height,pixels:canvas.toDataURL()});
          }
          await pdf.destroy();
          const original=await pdfjsLib.getDocument({url:'/__source__'+source}).promise;
          for(const reference of rendered){
            const p=await original.getPage(reference.page),viewport=p.getViewport({scale:.25});
            const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
            await p.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
            if(canvas.toDataURL()!==reference.pixels)throw new Error('Viewer changed original pixels on page '+reference.page);
            delete reference.pixels;
          }
          await original.destroy();window.fetch=originalFetch;return {count,rendered,startupParts};
        },source);
        assert.equal(results.count,doc.pages);
        assert.ok(results.rendered.every(p=>p.width>0&&p.height>0));
        assert.ok(results.startupParts<=5,'Opening must not download the entire scanned book: '+results.startupParts+' parts');
        console.log('PASS real PDF.js static ranges:',asset.filename,results.count,'pages');
        console.log('PASS original page pixels and bounded startup:',results.startupParts,'parts');
        await page.goto(origin+'/Crux-Tricks/viewer.html?id='+doc.id+'&page='+doc.pages);
        await page.waitForFunction(()=>document.getElementById('pdfLoading').hidden&&document.getElementById('pdfStage').querySelector('canvas')?.width>0,{},{timeout:60000});
        assert.equal(new URL(page.url()).pathname,'/Crux-Tricks/viewer.html');
        assert.equal(await page.locator('#pageInput').inputValue(),String(doc.pages));
        console.log('PASS existing reader and last-page deep link:',doc.id);
      }
      await page.goto(origin+'/__test__');
      await page.addScriptTag({url:origin+'/__pdfjs/pdf.js'});await page.addScriptTag({url:origin+'/cf-pdf-assets.js'});
      await context.route('**/_cf-assets/**/*.bin',route=>route.fulfill({status:503,body:'Unavailable'}));
      const failure=await page.evaluate(async source=>{
        pdfjsLib.GlobalWorkerOptions.workerSrc='/__pdfjs/pdf.worker.js';
        try{await EFP_CF_PDF.getDocument(pdfjsLib,{url:source}).promise;return false;}catch(e){return /download failed/.test(e.message);}
      },Object.keys(report.pdfs)[0]);
      assert.equal(failure,true);console.log('PASS PDF chunk failures reject instead of hanging');
    }else console.log('SKIP real PDF.js browser rendering; set EFP_PDFJS_TEST_DIR for full checks');
    await context.close();
    console.log('All Cloudflare preparation checks passed. A real Pages preview must still be verified before DNS changes.');
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
