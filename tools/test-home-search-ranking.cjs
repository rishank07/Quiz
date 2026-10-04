// EFP_TEST_JSDOM=/path/to/jsdom node tools/test-home-search-ranking.cjs
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {JSDOM}=require(process.env.EFP_TEST_JSDOM||'jsdom');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const dom=new JSDOM('<input id="searchBox"><ul id="menuList"></ul><div id="noResults"></div>',{url:'https://examfusionprep.com/',runScripts:'outside-only'}),w=dom.window;
 let created=0,alive=0,max=0;
 w.Worker=class {
  constructor(){created++;alive++;max=Math.max(max,alive);this.dead=false;}
  postMessage(m){
   if(m.type==='init'){this.options=m.options;w.setTimeout(()=>!this.dead&&this.onmessage({data:{type:'ready'}}),0);}
   else {const strong=this.options.indexUrl.includes('ghatnachakra'),score=strong?50:2020;w.setTimeout(()=>!this.dead&&this.onmessage({data:{type:'result',id:m.id,results:[{f:this.options.indexUrl+'#q1',t:strong?'Exact BRICS':'Fabrics',b:'Book',x:strong?'What is BRICS?':'Different fabrics',score}]}}),0);}
  }
  terminate(){if(!this.dead){this.dead=true;alive--;}}
 };
 w.eval(read('search-logic.js'));w.eval(read('homepage-fulltext-search.js'));
 const input=w.document.getElementById('searchBox');
 async function search(query){let done=false;const listener=e=>{if(e.detail.phase==='fulltext-done')done=true};w.addEventListener('efp-search-state',listener);input.value=query;input.dispatchEvent(new w.Event('input',{bubbles:true}));for(let i=0;i<80&&!done;i++)await delay(20);w.removeEventListener('efp-search-state',listener);assert(done);}
 await search('BRICS');const rows=Array.from(w.document.querySelectorAll('[data-bookfullitem]'));
 assert(rows.length>=8);assert(rows[0].textContent.includes('Exact BRICS'));assert(rows.every((row,i)=>!i||Number(rows[i-1].dataset.searchScore)<=Number(row.dataset.searchScore)));
 assert.equal(max,1);assert.equal(alive,0);const initial=created;await search('brics');assert.equal(created,initial,'Repeat query must reuse small cached results, not parse every source again');
 assert(w.document.querySelector('[data-bookfullitem] a').href.includes('#q1'),'Ranking must preserve question anchors');
 dom.window.close();console.log('PASS streamed sources rank by relevance, one worker, zero retained indexes, repeat-query reuse and exact anchors');
})().catch(e=>{console.error(e);process.exitCode=1});
