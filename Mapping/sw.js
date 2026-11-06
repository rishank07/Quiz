/* Scoped offline cache for the interactive atlas. */
const VERSION='efp-map-atlas-20261106-geography2';
const ASSETS=['./','assets/map-navigation.js?v=20261106mapnav2','assets/site-theme.js?v=20261106navtheme1','assets/style.css?v=20261105atlas1','assets/atlas.css?v=20261106geography2','assets/data.js?v=20261105atlas1','assets/states.js?v=20261105atlas1','assets/rivers.js?v=20261105atlas1','assets/state-notes.js?v=20261105states1','assets/state-study.js?v=20261106mapnav2','assets/state-study.css?v=20261105states1','assets/feature-study.js?v=20261106geography2','assets/app.js?v=20261106geography2'];
self.addEventListener('install',e=>{e.waitUntil((async()=>{const cache=await caches.open(VERSION);await cache.addAll(ASSETS.map(p=>new Request(new URL(p,self.registration.scope),{cache:'reload'})));await self.skipWaiting();})());});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('efp-map-atlas-')&&key!==VERSION)await caches.delete(key);await self.clients.claim();})());});
self.addEventListener('fetch',e=>{
 const req=e.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin)return;
 if(req.mode==='navigate'&&url.pathname.startsWith('/Mapping/')){
  e.respondWith((async()=>{const cache=await caches.open(VERSION);const key=new URL(url.pathname==='\u002fMapping/index.html'?'/Mapping/':url.pathname,self.location.origin);try{const res=await fetch(req,{cache:'no-cache'});if(!res.ok)throw Error('Network unavailable');await cache.put(key,res.clone());return res;}catch{const cached=await cache.match(key);return cached||new Response('Reconnect once to load this atlas page.',{status:503,headers:{'Content-Type':'text/plain'}});}})());return;
 }
 if(url.pathname.startsWith('/Mapping/assets/')){
  e.respondWith((async()=>{const cache=await caches.open(VERSION);const cached=await cache.match(req);if(cached)return cached;const res=await fetch(req);if(res.ok)await cache.put(req,res.clone());return res;})());return;
 }
 if(['/back-parent-map.js','/back-nav.js','/home-nav.js'].includes(url.pathname)){
  e.respondWith((async()=>{const cache=await caches.open(VERSION);try{const res=await fetch(req);if(res.ok)await cache.put(req,res.clone());return res;}catch{return (await cache.match(req))||new Response('',{status:200,headers:{'Content-Type':'text/javascript'}});}})());
 }
});

