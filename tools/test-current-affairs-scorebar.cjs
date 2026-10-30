// Isolated Chromium component check: actual CA HTML/CSS and shared scripts,
// no production traffic or question-data edits.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=process.env.EFP_PLAYWRIGHT_PATH?require(process.env.EFP_PLAYWRIGHT_PATH):require('playwright');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const base='Current Affairs/Topic Names/Rapid Practice';
const shared=fs.readFileSync(process.env.EFP_TEST_RAPID_SCRIPT||path.join(root,'rapid-practice-deeplink.js'),'utf8');
const feature=read('quiz-unattempted.js'),css=read('quiz-unattempted.css');
const files=[];
function walk(folder){for(const e of fs.readdirSync(folder,{withFileTypes:true})){const f=path.join(folder,e.name);if(e.isDirectory())walk(f);else if(e.name.endsWith('.html'))files.push(path.relative(root,f).split(path.sep).join('/'));}}
walk(path.join(root,base));files.sort();
assert(files.length>=43,'cover the entire monthly and topic-wise catalog');
for(const f of files)assert(read(f).includes('rapid-practice-deeplink.js'),'missing shared score script: '+f);
const fixtures=new Map(files.map(f=>['/'+f,read(f).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')]));
const baseline=process.argv.includes('--baseline');
const selected=baseline?[files.find(f=>f.includes('/2025/')&&!f.includes('Name_Changes'))]:files;
const sizes=baseline?[[393,852]]:[[320,740],[393,852],[650,900],[651,900],[844,390],[1440,900]];
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.EFP_CHROME_PATH?{executablePath:process.env.EFP_CHROME_PATH}:{})});
 let cases=0;
 try{
  for(const [width,height]of sizes)for(const dark of baseline?[false]:[false,true]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:width<=844?2.75:1,isMobile:width<=844,hasTouch:width<=844,
     userAgent:width<=844?'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/141.0.0.0 Mobile Safari/537.36':undefined});
   await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.origin!=='https://efp-score-preview.invalid')return route.abort();
    if(url.pathname==='/quiz-unattempted.css')return route.fulfill({contentType:'text/css',body:css});
    const html=fixtures.get(decodeURIComponent(url.pathname));
    return html?route.fulfill({contentType:'text/html; charset=utf-8',body:html}):route.abort();
   });
   const page=await context.newPage();
   for(const file of selected){
    await page.goto('https://efp-score-preview.invalid/'+file.split('/').map(encodeURIComponent).join('/')+'?efpWorkPreview=1',{waitUntil:'load'});
    await page.evaluate(dark=>{
      document.body.classList.toggle('dark',dark);
      const score=document.getElementById('scoreTxt');if(!score)throw Error('Missing native score');
      score.classList.add('ef-native-score');
      score.innerHTML='<span class="ef-native-score-chip ef-native-score-total">Total <strong>3/999</strong></span><span class="ef-native-score-chip ef-native-score-correct">Correct <strong>2</strong></span><span class="ef-native-score-chip ef-native-score-wrong">Wrong <strong>1</strong></span>';
      const main=document.getElementById('questions');if(!main)throw Error('Missing native quiz container');main.style.minHeight='2400px';
    },dark);
    await page.addScriptTag({content:shared});
    await page.addScriptTag({content:feature});
    await page.addStyleTag({content:css});
    await page.waitForSelector('#scoreTxt .efp-unattempted-value');
    await page.evaluate(()=>window.scrollTo(0,800));await page.waitForTimeout(20);
    const state=await page.evaluate(()=>{
      const card=document.querySelector('.toolbar > .barcard,.toolbar > .bar');
      const frame=card.getBoundingClientRect().width?card:card.querySelector('.row:first-child');
      const s=getComputedStyle(frame),r=frame.getBoundingClientRect();
      const chips=[...document.querySelectorAll('#scoreTxt .ef-native-score-chip')];
      return{radius:s.borderRadius,border:s.borderColor,widths:[s.borderTopWidth,s.borderRightWidth,s.borderBottomWidth,s.borderLeftWidth],
        background:s.backgroundColor,top:Math.round(r.top),width:r.width,height:r.height,overflow:document.documentElement.scrollWidth>innerWidth,
        remaining:document.querySelector('.efp-unattempted-value').textContent,chipWidths:chips.map(e=>Math.round(e.getBoundingClientRect().width))};
    });
    const label=file+' '+width+' '+(dark?'dark':'light');
    if(baseline){assert.equal(state.radius,'12px','reproduce the visible rounded mobile row');console.log('REPRODUCED old mobile score row:',JSON.stringify(state));}
    else{
      assert.equal(state.radius,'0px',label+' corners');assert.equal(state.border,dark?'rgb(209, 166, 95)':'rgb(184, 134, 63)',label+' gold frame');
      assert.deepEqual(state.widths,['1px','1px','1px','1px'],label+' all four edges');
      assert(state.width>0&&state.height>0,label+' validate the painted frame, not display:contents');
      assert.equal(state.top,0,label+' sticky gap');assert(!state.overflow,label+' overflow');
      assert(!state.background.includes('rgba')&&!['transparent','rgba(0, 0, 0, 0)'].includes(state.background),label+' opaque surface');
      if(!dark){
        // Inspect the rendered inner edge, not just computed border styles.
        // It stays gold even when scrolling clips the outermost viewport pixel.
        const png=await page.screenshot({clip:{x:0,y:0,width,height:3},scale:'css'});
        const pixel=await page.evaluate(async data=>{
          const img=new Image();img.src=data;await img.decode();
          const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
          const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
          return [...ctx.getImageData(Math.floor(img.width/2),1,1,1).data];
        },'data:image/png;base64,'+png.toString('base64'));
        assert(pixel.slice(0,3).every((v,i)=>Math.abs(v-[184,134,63][i])<=8),label+' painted inset top edge: '+pixel);
      }
      assert.equal(state.remaining,'996',label+' remaining count');assert.equal(state.chipWidths.length,4,label+' counters');
      if(width<=650)assert(Math.max(...state.chipWidths)-Math.min(...state.chipWidths)<=1,label+' equal counter boxes');
    }
    if(width===393&&file===selected[0]){
      const frame=page.locator('.toolbar > .barcard > .row:first-child,.toolbar > .bar > .row:first-child').first();
      const png=await frame.screenshot();console.log('SCOREBAR_PREVIEW '+(baseline?'baseline':dark?'dark':'light')+' '+png.toString('base64'));
    }
    cases++;
   }
   await context.close();console.log('PASS viewport',width,height,dark?'dark':'light',selected.length,'quizzes');
  }
 }finally{await browser.close()}
 console.log('PASS',cases,'rendered Current Affairs scorebar checks across',selected.length,'monthly/topic quizzes');
})().catch(error=>{console.error(error);process.exitCode=1});
