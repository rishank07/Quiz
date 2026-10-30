// Render native score surfaces in an isolated viewport; never contact production.
// Cover light-frame painting under a simulated two-pixel browser edge occlusion.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=process.env.EFP_PLAYWRIGHT_PATH?require(process.env.EFP_PLAYWRIGHT_PATH):require('playwright');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const feature=read('quiz-unattempted.js'),css=read('quiz-unattempted.css');
function element(source,re){
 const found=re.exec(source);assert(found,'native markup: '+re);
 const start=found.index,tag=found[0].match(/^<([\w-]+)/)[1];
 const tags=new RegExp('</?'+tag+'\\b[^>]*>','gi');tags.lastIndex=start;
 let depth=0,match;while((match=tags.exec(source))){
  depth+=match[0][1]==='/'?-1:1;if(!depth)return source.slice(start,tags.lastIndex);
 }throw Error('Unbalanced '+tag);
}
function nativeCss(file){
 const source=read(file),styles=[...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(m=>m[1]);
 for(const link of source.matchAll(/<link\b[^>]*>/gi)){
  const href=link[0].match(/href=["']([^"']+)/i);
  if(!href||!/rel=["']stylesheet/i.test(link[0])||/^https?:/i.test(href[1]))continue;
  const resolved=decodeURIComponent(new URL(href[1],'https://fixture.invalid/'+file).pathname).replace(/^\//,'');
  if(fs.existsSync(path.join(root,resolved)))styles.push(read(resolved));
 }return styles.join('\n');
}
const books=[
 ['Ghatnachakra','Books/Ghatnachakra Purvalokan/Economics/ChapterNames/1. Nature of Indian Economy.html'],
 ['Lucent',"Books/Lucent's Objective/Ecology/Ecology and Environment.html"],
 ['Pinnacle','Books/Pinnacle GS/PinnacleParts/SSC/Static Gk/ChapterNames/Festivals.html']
];
const fixtures=books.map(([label,file])=>({label,file,style:nativeCss(file),
 markup:element(read(file),/<div\b[^>]*class="score-bar"/i),selector:'.score-bar'}));
{
 const file='Bihar Special/Topic Names/Bihar Objective GK - 60 Sets.html';
 fixtures.push({label:'Bihar sets',file,style:nativeCss(file),
 markup:element(read(file),/<div\b[^>]*class="set-score-bar"/i),selector:'.set-score-bar'});
}
{
 const file='Books/BlackBook/Files/Synonyms and Antonyms Quiz.html',s=read(file);
 fixtures.push({label:'Blackbook',file,style:nativeCss(file),
 mobile:element(s,/<div\b[^>]*class="efp-mobile-scorebar\b/i),
 desktop:element(s,/<div\b[^>]*class="desktop-sticky-score"/i)});
}
{
 const file='Original Practice/History_Complete_Practice.html',s=read(file);
 const bar=element(s,/<div class="flex items-center justify-between mb-3[^"]*">/i)
 .replace(/\$\{[^}]*\}/g,'0').replace('Total: 0/0','Total: 3/999');
 fixtures.push({label:'Original Practice',file,style:nativeCss(file),
 markup:'<div id="app"><div class="max-w-3xl mx-auto">'+bar+'</div></div>',
 selector:'#app > .max-w-3xl > .flex.items-center.justify-between.mb-3'});
}
{
 const file='Original Practice/Mixed_Practice.html';
 fixtures.push({label:'Mixed Practice',file,style:nativeCss(file),
 markup:'<section id="quizView">'+element(read(file),/<div class="quiz-head">/i)+'</section>',
 selector:'#quizView > .quiz-head'});
}
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.EFP_CHROME_PATH?{executablePath:process.env.EFP_CHROME_PATH}:{})});
 let cases=0;
 try{
  for(const dpr of [1,2.75])for(const width of [320,393,650,651,844,1440]){
   const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:dpr,isMobile:width<1000,hasTouch:width<1000});
   // Abort every external request, including GA/GTM, before first navigation.
   await context.route('**/*',r=>r.abort());
   const page=await context.newPage();
   // The loader must also reach dynamically rendered quiz views on index pages.
   await page.route('https://fixture.invalid/**',r=>{
    const u=new URL(r.request().url());
    if(u.pathname==='/quiz-unattempted.css')return r.fulfill({contentType:'text/css',body:css});
    return r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body></body></html>'});
   });
   await page.goto('https://fixture.invalid/Original%20Practice/index.html?efpWorkPreview=1');
   await page.addScriptTag({content:feature});await page.addScriptTag({content:feature});
   assert.equal(await page.locator('link[href*="/quiz-unattempted.css"]').count(),1,'one shared stylesheet on dynamic quiz pages');
   assert.equal(await page.evaluate(()=>!!window.EFP_QUIZ_UNATTEMPTED),false,'no counter observers on landing pages');
   await page.goto('https://fixture.invalid/Original%20Practice/index.html?efpWorkPreview=1');
   await page.evaluate(()=>{
    const link=document.createElement('link');link.id='efp-quiz-score-style';link.rel='stylesheet';
    link.href='/quiz-unattempted.css?v=abc123def456';link.setAttribute('data-efp-current-quiz-frame','');
    document.head.appendChild(link);
   });
   await page.addScriptTag({content:feature});
   assert((await page.locator('#efp-quiz-score-style').getAttribute('href')).endsWith('abc123def456'),'retain the build content version');
   for(const fixture of fixtures)for(const dark of [false,true]){
    await page.goto('https://fixture.invalid/'+fixture.file.split('/').map(encodeURIComponent).join('/')+'?efpWorkPreview=1');
    const blackbook=!!fixture.mobile;
    const selector=blackbook?(width<640?'.efp-mobile-scorebar':'.desktop-sticky-score'):fixture.selector;
    await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+fixture.style+'</style></head><body><div style="height:300px"></div>'+
      (blackbook?(width<640?fixture.mobile:fixture.desktop):fixture.markup)+'<div style="height:2000px"></div></body></html>');
    await page.evaluate(({selector,dark})=>{
     document.documentElement.classList.toggle('efp-black',dark);document.body.classList.toggle('dark',dark);
     // Isolate the painted score surface at the clipping edge; preserve native
     // padding, contents, border, responsive counter layout and theme styles.
     const frame=document.querySelector(selector);frame.id='frame-under-test';
     frame.style.setProperty('position','sticky','important');frame.style.setProperty('top','0','important');
     frame.style.setProperty('z-index','100');frame.style.setProperty('max-width','100%');
     frame.style.setProperty('box-sizing','border-box');
     document.body.style.margin='0';
     const app=frame.closest('#app');if(app){app.style.minHeight='2400px';frame.parentElement.style.minHeight='2400px';}
     const mixed=frame.closest('#quizView');if(mixed)mixed.style.minHeight='2400px';
    },{selector,dark});
    await page.addScriptTag({content:feature});
    await page.addStyleTag({content:css});
    // Reproduce a legacy page's later unlayered !important frame override.
    await page.addStyleTag({content:'#frame-under-test{border-color:#fff!important;outline:none!important}'});
    await page.evaluate(()=>document.fonts.ready);
    await page.evaluate(()=>scrollTo({top:800,behavior:'instant'}));
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const state=await page.evaluate(()=>{
     const e=document.getElementById('frame-under-test'),r=e.getBoundingClientRect(),s=getComputedStyle(e);
     return{top:r.top,left:r.left,width:r.width,height:r.height,outline:s.outlineStyle,color:s.outlineColor,offset:s.outlineOffset};
    });
    const label=[fixture.label,width,dpr,dark?'dark':'light'].join(' ');
    assert.equal(Math.round(state.top),0,label+' sticky host');
    assert(state.width>0&&state.height>0,label+' visible frame');
    if(!dark){
     assert.equal(state.outline,'solid',label+' shared frame wins late page overrides');
     const clip=await page.evaluate(()=>{
      const cover=document.createElement('div');cover.id='browser-edge-occlusion';
      cover.style.cssText='position:fixed;left:0;right:0;top:0;height:2px;background:#fff;z-index:2147483647;pointer-events:none';
      document.body.appendChild(cover);return true;
     });
     const png=await page.screenshot({clip:{x:0,y:0,width,height:5},scale:'css'});
     const pixel=await page.evaluate(async data=>{
      const img=new Image();img.src=data;await img.decode();
      const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
      const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
      return [...ctx.getImageData(Math.floor(img.width/2),2,1,1).data];
     },'data:image/png;base64,'+png.toString('base64'));
     assert(pixel.slice(0,3).every((v,i)=>Math.abs(v-[184,134,63][i])<=8),label+' gold visible below clipped edge: '+pixel);
    }else assert.equal(state.outline,'none',label+' retain native dark frame');
    cases++;
   }
   await context.close();console.log('PASS generic frames',width,'DPR',dpr,fixtures.length,'native families');
  }
 }finally{await browser.close()}
 console.log('PASS',cases,'native score-frame checks including clipped viewport edges, theme changes and late page overrides');
})().catch(error=>{console.error(error);process.exitCode=1});
