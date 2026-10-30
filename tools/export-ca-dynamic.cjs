// Freeze the existing generated question order before changing explanations.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const ref=process.argv.includes('--ref')?process.argv[process.argv.indexOf('--ref')+1]:null;
const read=relative=>ref?require('node:child_process').execFileSync('git',['show',ref+':'+relative],{cwd:root,encoding:'utf8',maxBuffer:20*1024*1024}):fs.readFileSync(path.join(root,relative),'utf8');
const out={};
for(const file of fs.readdirSync(path.join(root,'Current Affairs/Topic Names/Rapid Practice/2026/Topic Wise'))){
 if(!file.endsWith('.html'))continue;
 const html=read('Current Affairs/Topic Names/Rapid Practice/2026/Topic Wise/'+file);
 if(/id=["']master-data/.test(html))continue;
 const ctx={window:{},localStorage:{getItem(){return null}},document:{getElementById(id){const m=html.match(new RegExp('<script[^>]*id=["\x27]'+id+'["\x27][^>]*>([\\s\\S]*?)</script>'));return {textContent:m?m[1]:''}}}};
 vm.createContext(ctx);vm.runInContext(read('Current Affairs/Topic Names/search-index.js'),ctx);
 vm.runInContext(read('Current Affairs/Topic Names/brics-search-index.js'),ctx);
 vm.runInContext('window.CA_SEARCH_INDEX=window.CA_SEARCH_INDEX.concat(window.CA_BRICS_SEARCH_INDEX||[])',ctx);
 for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){
  if(/application\/json|ld\+json/.test(m[1]))continue;
  if(/RAPID_CONFIG|function boot/.test(m[2]))vm.runInContext(m[2].replace(/boot\(\);?\s*$/,''),ctx);
 }
 if(!html.includes('function boot'))vm.runInContext(read('Current Affairs/Topic Names/Rapid Practice/2026/Topic Wise/rapid-runtime.js').replace(/boot\(\);?\s*$/,''),ctx);
 vm.runInContext('applyDark=()=>{};renderQuestions=()=>{};boot();',ctx);
 out[file]=vm.runInContext('JSON.parse(JSON.stringify(SECTIONS))',ctx);
}
process.stdout.write(JSON.stringify(out));
