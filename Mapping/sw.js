/* Scoped offline cache for the interactive atlas. */
const VERSION='efp-map-atlas-20261105-4';
const ASSETS=['./','assets/style.css?v=20261105atlas1','assets/atlas.css?v=20261105atlas4','assets/data.js?v=20261105atlas1','assets/states.js?v=20261105atlas1','assets/rivers.js?v=20261105atlas1','assets/app.js?v=20261105atlas4'];
self.addEventListener('install',e=>{e.waitUntil((async()=>{const cache=await caches.open(VERSION);await cache.addAll(ASSETS.map(p=>new Request(new URL(p,self.registration.scope),{cache:'reload'})));await self.skipWaiting();})());});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('efp-map-atlas-')&&key!==VERSION)await caches.delete(key);await self.clients.claim();})());});
self.addEventListener('fetch',e=>{
 const req=e.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin)return;
 if(req.mode==='navigate'&&url.pathname.startsWith('/Mapping/')){
  e.respondWith((async()=>{const cache=await caches.open(VERSION);try{const res=await fetch(req,{cache:'no-cache'});if(!res.ok)throw Error('Network unavailable');await cache.put(new URL('./',self.registration.scope),res.clone());return res;}catch{const cached=await cache.match(new URL('./',self.registration.scope));return cached||new Response('Reconnect once to load the atlas.',{status:503,headers:{'Content-Type':'text/plain'}});}})());return;
 }
 if(url.pathname.startsWith('/Mapping/assets/')){
  e.respondWith((async()=>{const cache=await caches.open(VERSION);const cached=await cache.match(req);if(cached)return cached;const res=await fetch(req);if(res.ok)await cache.put(req,res.clone());return res;})());return;
 }
 if(['/back-parent-map.js','/back-nav.js','/home-nav.js'].includes(url.pathname)){
  e.respondWith((async()=>{const cache=await caches.open(VERSION);try{const res=await fetch(req);if(res.ok)await cache.put(req,res.clone());return res;}catch{return (await cache.match(req))||new Response('',{status:200,headers:{'Content-Type':'text/javascript'}});}})());
 }
});
