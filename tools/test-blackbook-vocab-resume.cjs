// Real responsive vocab pages; block external traffic, including GA/GTM, before navigation.
const pw=require(process.env.EFP_PLAYWRIGHT||'playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://local').pathname),file=path.join(root,name==='/'?'index.html':name);if(!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);return res.end()}res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json'}[path.extname(file)]||'application/octet-stream'));fs.createReadStream(file).pipe(res)});
const files=['All one Word.html','Syno & Anto.html','Idioms and Phrases.html','All Spelling.html'];
async function ready(p){await p.waitForFunction(()=>window.EFP_QUIZ_CONTINUITY&&document.getElementById('bbt-1200'))}
async function framed(p,id){try{await p.waitForFunction(id=>{const r=document.getElementById(id)?.getBoundingClientRect();return r&&r.top>=0&&r.top<innerHeight*.5},id)}catch(e){console.log('Resume diagnostics',await p.evaluate(id=>({url:location.href,y:scrollY,target:document.getElementById(id)?.getBoundingClientRect().toJSON(),saved:Object.keys(localStorage).filter(k=>k.includes('blackbook-vocab')).map(k=>localStorage.getItem(k))}),id));throw e}await p.waitForTimeout(500);assert((await p.locator('#'+id).boundingBox()).y<await p.evaluate(()=>innerHeight*.5))}
async function save(p){await p.locator('#bbt-1200').scrollIntoViewIfNeeded();await p.evaluate(()=>{const n=document.getElementById('bbt-1200');let inset=12;document.querySelectorAll('header,.toolbar,.reader-head,.quiz-head,#efp-top-nav').forEach(el=>{const css=getComputedStyle(el),r=el.getBoundingClientRect();if(['sticky','fixed'].includes(css.position)&&r.top<=2&&r.bottom>0&&r.bottom<innerHeight*.55)inset=Math.max(inset,r.bottom+12)});window.scrollTo({top:scrollY+n.getBoundingClientRect().top-inset+2,behavior:'instant'})});await p.waitForTimeout(300);await p.evaluate(()=>window.EFP_QUIZ_CONTINUITY.save());return p.evaluate(()=>{const k=Object.keys(localStorage).find(k=>k.includes('blackbook-vocab'));return {key:k,value:localStorage.getItem(k)}})}
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,browser=await pw.chromium.launch({executablePath:process.env.EFP_CHROMIUM,headless:true,args:['--no-sandbox']});
try{for(const mode of (process.env.EFP_RESUME_MODES?JSON.parse(process.env.EFP_RESUME_MODES):['phone browser','desktop browser','Android app','Windows app'])){
 const mobile=mode==='phone browser'||mode==='Android app',installed=mode.endsWith('app');
 const c=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1366,height:768},...(mobile?{isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/153.0.0.0 Mobile Safari/537.36'}:{})});
 await c.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
 if(installed)await c.addInitScript(()=>{const original=matchMedia.bind(window);window.matchMedia=q=>q==='(display-mode: standalone)'?{matches:true,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}:original(q)});
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 for(const file of files){const url=origin+'/Books/BlackBook/Files/'+encodeURIComponent(file);await p.goto(url);await ready(p);const stored=await save(p);const target=JSON.parse(stored.value).id;assert(/^bbt-\d+$/.test(target));
  await p.reload();await ready(p);await framed(p,target);
  await p.goto(origin+'/support.html');await p.goto(url);await ready(p);await framed(p,target);
  // Temporary search and bookmark filters must preserve the unfiltered reading point.
  const baseline=await p.evaluate(k=>localStorage.getItem(k),stored.key);
  await p.locator('#search-input').fill('ab');await p.waitForTimeout(300);await p.evaluate(()=>window.EFP_QUIZ_CONTINUITY.save());assert.equal(await p.evaluate(k=>localStorage.getItem(k),stored.key),baseline);
  await p.goto(origin+'/support.html');await p.goto(url+'#bbt-20');await p.waitForFunction(()=>{const n=document.getElementById('bbt-20'),r=n?.getBoundingClientRect();return n?.classList.contains('efp-bb-topic-focus')&&r.bottom>0&&r.top<innerHeight});
  console.log('PASS '+mode+': '+file+' reload, leave/reopen, filtered-position protection, bookmark priority');
 }
 assert.deepEqual(errors,[]);await c.close();
}
// The same saved serial and text restore correctly in either responsive layout.
const c=await browser.newContext({viewport:{width:1366,height:768}});await c.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());const p=await c.newPage();
await p.goto(origin+'/Books/BlackBook/Files/All one Word.html');await ready(p);const saved=await save(p);const target=JSON.parse(saved.value).id;await p.goto(origin+'/support.html');await p.setViewportSize({width:390,height:844});await p.goto(origin+'/Books/BlackBook/Files/All one Word.html');await ready(p);await framed(p,target);console.log('PASS desktop row to mobile card continuation');await c.close();
}finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
