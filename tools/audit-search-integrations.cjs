// Read-only scan of every HTML page and all checked-in search destinations.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.name==='.git'?[]:e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)])}
const files=walk(root),html=files.filter(f=>f.endsWith('.html')),searchPages=[],missing=[],syntax=[];let scripts=0,routes=0,groups=0;
for(const file of html){const text=fs.readFileSync(file,'utf8').replace(/<!--[\s\S]*?-->/g,'');if(/<input[^>]*(?:type=["']search|id=["'][^"']*[Ss]earch)/.test(text)){searchPages.push(path.relative(root,file));assert(text.includes('back-nav.js'),'Missing shared navigation/search integration: '+file)}
 for(const m of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(/\bsrc\s*=|\btype\s*=\s*["'](?:application\/|text\/template|module)/i.test(m[1])||!m[2].trim())continue;scripts++;try{new vm.Script(m[2],{filename:path.relative(root,file)})}catch(e){syntax.push({file:path.relative(root,file),error:e.message})}}
}
const logic={};vm.createContext(logic);vm.runInContext(fs.readFileSync(path.join(root,'search-logic.js'),'utf8'),logic);const manifest={};manifest.window=manifest;vm.createContext(manifest);vm.runInContext(fs.readFileSync(path.join(root,'Crux-Tricks/crux-manifest.js'),'utf8'),manifest);const cruxRouter=logic.efCreateCruxSearchRouter(manifest.EF_CRUX_DOCS);
for(const file of files.filter(f=>/(?:^|\/)(?:search-index-main|search-snippets-[^/]+)\.js$/.test(f))){const c={};c.window=c;vm.createContext(c);try{vm.runInContext(fs.readFileSync(file,'utf8'),c)}catch(e){if(!file.endsWith('search-snippets-polity-original-practice.js'))throw e}
 for(const arr of Object.values(c).filter(Array.isArray))for(const record of arr){groups++;let f=record.f||record.file||record.url;if(!f)continue;let u=new URL(f,'https://examfusionprep.com/'),p=decodeURIComponent(u.pathname);if(file.includes('blackbook')&&p.startsWith('/Files/'))p='/Books/BlackBook'+p;
 if(file.includes('/Crux-Tricks/')){
  // Legacy Crux paths are deliberately resolved through the current manifest.
  const hit=cruxRouter.route(record);p=new URL(hit.f,'https://examfusionprep.com').pathname;
 }
 routes++;if(!fs.existsSync(path.join(root,p)))missing.push({index:path.relative(root,file),f});
 }
}
console.log(JSON.stringify({htmlPages:html.length,embeddedSearchPages:searchPages.length,inlineScripts: scripts,indexGroups:groups,indexedDestinations:routes,missing:missing.slice(0,20),syntax},null,2));assert.equal(missing.length,0,'Broken indexed destinations');assert.equal(syntax.length,0,'Invalid inline JavaScript');
