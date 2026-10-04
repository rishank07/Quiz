// Integration test: actual page/scripts, blocked legacy navigation and late CSS.
// EFP_TEST_JSDOM=/path/to/jsdom node tools/test-awards-search-bootstrap.cjs
const {JSDOM,ResourceLoader,VirtualConsole}=require(process.env.EFP_TEST_JSDOM||'jsdom');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),delay=ms=>new Promise(r=>setTimeout(r,ms));
const file='Current Affairs/Topic Names/Rapid Practice/2026/Topic Wise/Awards_2026_Current_Affairs_Rapid_Practice.html';
class Local extends ResourceLoader {
  constructor(blockNav){super();this.blockNav=blockNav}
  fetch(url){
    const u=new URL(url),local=path.join(root,decodeURIComponent(u.pathname));
    if(u.pathname==='/search-context.css')return null; // Dispatch its delayed load below.
    if(u.origin!=='https://examfusionprep.com'||!fs.existsSync(local)||!fs.statSync(local).isFile())return null;
    if(this.blockNav&&/\/(?:back-nav|home-nav)\.js$/.test(u.pathname))return null;
    return Promise.resolve(fs.readFileSync(local));
  }
}
(async()=>{
  const pages=fs.readdirSync(path.join(root,'Current Affairs/Topic Names/Rapid Practice'),{recursive:true})
    .filter(f=>f.endsWith('.html')).map(f=>path.join(root,'Current Affairs/Topic Names/Rapid Practice',f))
    .filter(f=>fs.readFileSync(f,'utf8').includes('rapid-practice-deeplink.js'));
  assert.equal(pages.length,40);
  for(const f of pages){const text=fs.readFileSync(f,'utf8');assert.equal((text.match(/id="efp-shared-search-context"/g)||[]).length,1,f);assert(text.includes('search-context.js?v=20261004rapidcontext1'),f)}
  for(const blockNav of [true,false]){
    const errors=[],scrolls=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
    const dom=new JSDOM(fs.readFileSync(path.join(root,file),'utf8'),{
      url:'https://examfusionprep.com/'+encodeURI(file)+'?efSearchQuery=award#rp-2-0',
      runScripts:'dangerously',resources:new Local(blockNav),pretendToBeVisual:true,virtualConsole:vc,
      beforeParse(w){
        w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});
        w.fetch=async()=>({ok:true,json:async()=>({})});w.scrollTo=()=>{};w.scrollBy=()=>{};
        w.HTMLElement.prototype.getClientRects=function(){for(let e=this;e;e=e.parentElement)if(w.getComputedStyle(e).display==='none')return [];return [{width:100,height:40}]};
        w.HTMLElement.prototype.scrollIntoView=function(){scrolls.push(this)};
      }
    });
    const w=dom.window,d=w.document,run=s=>require('vm').runInContext(s,dom.getInternalVMContext());
    for(let i=0;i<80&&!d.querySelector('.efp-search-context');i++)await delay(25);
    await delay(100);
    const bar=d.querySelector('.efp-search-context');assert(bar,'Awards must bootstrap controls even without navigation');
    assert.equal(bar.nextElementSibling.id,'rp-2-0');assert.equal(bar.querySelector('.efp-context-location').textContent,'Section 3 · Q61');
    assert.equal(scrolls.at(-1),bar);assert(d.querySelector('#rp-2-0 mark.efp-context-match'));
    assert.equal(d.querySelectorAll('.efp-search-context').length,1);
    const before=run('JSON.stringify({answers:saved.answers,bookmarks:saved.bookmarks})'),history=w.history.length;
    const count=scrolls.length;d.querySelector('link[href*="search-context.css"]').dispatchEvent(new w.Event('load'));await delay(30);
    assert(scrolls.length>count,'Late CSS recenters entry');
    for(let i=0;i<25;i++){d.querySelector('.efp-context-next').click();await delay(35);assert.equal(d.querySelectorAll('.efp-search-context').length,1);assert.equal(scrolls.at(-1),d.querySelector('.efp-search-context'))}
    assert.equal(run('JSON.stringify({answers:saved.answers,bookmarks:saved.bookmarks})'),before);assert.equal(run('stats().total'),350);assert.equal(run('stats().attempted'),0);assert.equal(w.history.length,history);
    d.querySelector('.efp-context-dismiss').click();await delay(30);assert.equal(d.querySelectorAll('.efp-search-context,mark.efp-context-match').length,0);
    assert.deepEqual(errors,[]);dom.window.close();
  }
  console.log('PASS 40 direct loaders; actual Awards Q61 with navigation blocked/available, late CSS, 25 next results across sections, dismissal, 350 questions and unchanged answers/bookmarks/history');
})().catch(e=>{console.error(e);process.exitCode=1});
