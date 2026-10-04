const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..'),ctx={};ctx.window=ctx;vm.createContext(ctx);
for(const file of ['search-logic.js','Crux-Tricks/pdf-search.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
function selected(items,query,mode){const result=ctx.EFP_PDF_TEXT_SEARCH.ranges(items,query,mode);return {kind:result.kind,words:Object.entries(result.ranges).flatMap(([i,ranges])=>ranges.map(r=>items[i].str.slice(Math.round(r.start*items[i].str.length),Math.round(r.end*items[i].str.length))))}}
const items=rows=>rows.map(str=>({str}));
assert.deepEqual(selected(items(['filler WINGS—of FIRE filler']),'Wings of Fire').words,['WINGS—of FIRE']);
assert.deepEqual(selected(items(['Author’s ﬂower २०२६ भारत\u200dवर्ष filler']),'authors flower 2026 भारतवर्ष').words,['Author’s ﬂower २०२६ भारत\u200dवर्ष']);
assert.deepEqual(selected(items(['filler Rashtrapati filler राष्ट्रपति filler']),'rashtrapati').words,['Rashtrapati']);
assert.deepEqual(selected(items(['filler राष्ट्रपति filler']),'rashtrapati').words,['राष्ट्रपति']);
let words=['one','two','three','four','five','six','seven','eight','nine','ten','eleven'];
assert.deepEqual(selected(items(words),words.join(' ')).words,words,'Long phrase must cross more than eight PDF spans');
let split=['T','r','a','i','n','e','d'].map((str,i)=>({str,width:5,transform:[1,0,0,10,i*5,100]}));
assert.deepEqual(selected(split,'trained').words,['T','r','a','i','n','e','d'],'Contiguous character fragments must join');
assert.deepEqual(selected(items(['Pakistan-born filler','filler trained to dance filler']),'train to pakistan').words,['Pakistan','train','to']);
assert.equal(selected(items(['Pakistan-born filler','filler trained to dance filler']),'train to pakistan').kind,'words');
assert.deepEqual(selected(items(['fire filler wings']),'wings fire').words,['fire','wings'],'Reordered words must not paint connecting text');
assert.deepEqual(selected(items(['filler multi plication filler']),'multiplication','compact').words,['multi plication']);
assert.deepEqual(selected(items(['filler Gandhi filler']),'Gandih','typo').words,['Gandhi']);
assert.deepEqual(selected(items(['unrelated paragraph']),'BRICS').words,[]);
assert.deepEqual(selected([],'BRICS').words,[],'Scans without native text must not invent coordinates');
// Optional integration against the original binary, using the site's PDF.js version.
if(process.env.EFP_TEST_PDFJS)(async()=>{
 const pdfjs=require(process.env.EFP_TEST_PDFJS),{execFileSync}=require('child_process');
 const bytes=execFileSync('git',['show','HEAD:Crux-Tricks/pdfs/Books CRUX/Pinnacle/SSC/Static GK/02_Arts_Personality_Mindmap.pdf'],{cwd:root,maxBuffer:10*1024*1024});
 const doc=await pdfjs.getDocument({data:new Uint8Array(bytes),disableFontFace:true,verbosity:0}).promise;
 const tc=await(await doc.getPage(2)).getTextContent();const result=selected(tc.items,'train to pakistan');
 assert.equal(result.kind,'words');assert(result.words.includes('Pakistan'));assert(result.words.includes('train'));assert(result.words.includes('to'));
 assert(result.words.every(w=>['Pakistan','train','to'].includes(w)),'Real PDF must highlight only matching terms');
 await doc.destroy();console.log('PASS original Arts PDF: 221 text spans, precise word ranges');
})().catch(e=>{console.error(e);process.exitCode=1});
console.log('PASS precise PDF ranges: punctuation, Unicode, Hindi digits, aliases, long/split/reordered phrases, compact and typo matches');
