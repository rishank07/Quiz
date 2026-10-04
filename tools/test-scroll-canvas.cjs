// Usage: EFP_TEST_JSDOM=/path/to/jsdom node tools/test-scroll-canvas.cjs
const {JSDOM,VirtualConsole}=require(process.env.EFP_TEST_JSDOM || 'jsdom');
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..');process.chdir(root);const code=fs.readFileSync('black-mode.js','utf8');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function check(html,{only=true,on=false,canvas}={}){
 const dom=new JSDOM(html,{url:'https://examfusionprep.com/test.html',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});
 const w=dom.window;w.matchMedia=()=>({matches:false,addEventListener(){}});w.scrollTo=()=>{};
 if(on)w.localStorage.setItem('efp_black_mode','on');
 const originalBackCount=w.document.querySelectorAll('#efp-app-back-button').length;const before=JSON.stringify(w.localStorage);const script=w.document.createElement('script');script.src='/black-mode.js';if(only)script.setAttribute('data-efp-scroll-only','');
 w.document.head.appendChild(script);Object.defineProperty(w.document,'currentScript',{value:script,configurable:true});
 vm.runInContext(code,dom.getInternalVMContext());await sleep(40);
 assert(w.document.documentElement.classList.contains('efp-scroll-stable'));
 if(canvas)assert.equal(w.document.documentElement.style.getPropertyValue('--efp-scroll-canvas'),canvas);
 assert.equal(JSON.stringify(w.localStorage),before,'guard must preserve saved data');
 if(only){assert.equal(w.toggleBlackMode,undefined);assert.equal(w.document.querySelectorAll('#efp-app-back-button').length,originalBackCount);assert(!w.document.documentElement.classList.contains('efp-black-invert'));}
 const stable=w.document.documentElement.className;await sleep(60);assert.equal(w.document.documentElement.className,stable,'theme observer must settle');
 w.dispatchEvent(new w.PageTransitionEvent('pageshow',{persisted:true}));await sleep(30);assert(w.document.documentElement.classList.contains('efp-scroll-stable'));
 return {dom,w};
}
(async()=>{
 for(const [body,rootBg,canvas] of [['rgb(15,32,39)','transparent','rgb(15,32,39)'],['rgb(255,255,255)','transparent','rgb(255,255,255)'],['transparent','rgb(11,18,27)','rgb(11,18,27)']]){
  const p=await check(`<html><head><style>html{background-color:${rootBg}}body{background-color:${body};color:white}</style></head><body><main>Content</main></body></html>`,{canvas});p.dom.window.close();
 }
 const native=await check('<html><head><style>body{background-color:white;color:black}body.dark{background-color:rgb(11,18,27);color:white}</style></head><body>PDF</body></html>');native.w.document.body.classList.add('dark');await sleep(40);assert.equal(native.w.document.documentElement.style.getPropertyValue('--efp-scroll-canvas'),'rgb(11,18,27)');native.dom.window.close();
 for(const light of [false,true]){const p=await check(`<html><head><style>body{background-color:${light?'white':'rgb(15,32,39)'};color:${light?'black':'white'}}</style></head><body><main>Text</main></body></html>`,{only:false,on:true});assert(p.w.document.documentElement.classList.contains(light?'efp-black-invert':'efp-black'));assert.equal(p.w.document.documentElement.style.getPropertyValue('--efp-scroll-canvas'),light?'rgb(255,255,255)':'rgb(15,32,39)');p.w.toggleBlackMode();assert(!p.w.document.documentElement.classList.contains('efp-black-invert'));p.dom.window.close();}
 const samples=['index.html','Mind Maps/SubjectName.html','Original Practice/index.html','Original Practice/Environment_Ecology_Complete_Practice.html','Crux-Tricks/viewer.html','PYQ/viewer.html','Current Affairs/Topic Names/Rapid Practice/2026/Topic Wise/Awards_2026_Current_Affairs_Rapid_Practice.html','Books/BlackBook/BlackBook.html'];
 for(const f of samples){const html=fs.readFileSync(f,'utf8');const only=/data-efp-scroll-only/.test(html);const p=await check(html,{only});p.dom.window.close();console.log('PASS canvas/theme',f);}
 let coverage=0;const cp=require('child_process');for(const f of cp.execFileSync('git',['ls-tree','-r','--name-only','HEAD'],{encoding:'utf8'}).trim().split('\n').filter(f=>f.endsWith('.html'))){const s=fs.readFileSync(f,'utf8');if(/<head\b/i.test(s)){assert(/black-mode\.js/.test(s),f+' must include shared guard');coverage++;}}
 console.log('PASS opaque dark/light/transparent canvases, native dark updates, Black Mode round trip, BFCache and guard-only isolation');console.log('PASS shared layer coverage:',coverage,'HTML pages');
})().catch(e=>{console.error(e);process.exit(1)});
