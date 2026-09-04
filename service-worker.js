// v13 Android-safe Crux PDF.js renderer + versioned app-shell offline fallback 20260905
const CACHE_VERSION = "efp-pwa-2026-09-05-v13-crux-pdfjs";
// Large full-text indexes and PDFs are intentionally runtime-cached only after first use.
const APP_SHELL = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.webmanifest",
  "/privacy-policy.html",
  "/support.html",
  "/backup-restore.html",
  "/favicon.png",
  "/pwa-icons/icon-192.png",
  "/pwa-icons/icon-512.png",
  "/pwa-icons/maskable-icon-512.png",
  "/black-mode.js",
  "/search-logic.js",
  "/search-worker.js",
  "/search-index-main.js",
  "/homepage-fulltext-search.js",
  "/Original%20Practice/index.html",
  "/Original%20Practice/original-practice.css",
  "/Original%20Practice/original-practice.js",
  "/Original%20Practice/original-practice-index.js",
  "/Crux-Tricks/index.html",
  "/Crux-Tricks/viewer.html",
  "/Crux-Tricks/crux-manifest.js",
  "/Crux-Tricks/crux-tricks.css",
  "/Crux-Tricks/crux-tricks.js",
  "/Crux-Tricks/viewer.css",
  "/Crux-Tricks/viewer.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith("efp-pwa-") && key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

async function matchCachedRequest(request) {
  // App-shell files are pre-cached without cache-busting query strings while
  // pages commonly request them as file.js?v=... . ignoreSearch makes the
  // pre-cached shell usable on the very first offline launch after install.
  return (await caches.match(request)) || caches.match(request, { ignoreSearch: true });
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await matchCachedRequest(request);
    return cached || caches.match("/offline.html");
  }
}

async function staleWhileRevalidate(event, allowOpaque) {
  const request = event.request;
  const cache = await caches.open(CACHE_VERSION);
  const cached = await matchCachedRequest(request);
  const fresh = fetch(request)
    .then((response) => {
      const cacheable = (response.ok && (response.type === "basic" || response.type === "cors")) || (allowOpaque && response.type === "opaque");
      if (cacheable) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(fresh);
    return cached;
  }

  const response = await fresh;
  if (response) return response;

  // Do not serve offline.html as JavaScript/CSS/image bytes. A clean 503 lets
  // the browser fail that optional asset normally instead of producing a
  // misleading syntax/MIME error. Navigations are handled by networkFirst().
  return new Response("", { status: 503, statusText: "Offline" });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    // Cache the PDF.js runtime after its first successful use so the installed
    // PWA does not need to redownload the renderer every time.
    if (url.origin === "https://cdn.jsdelivr.net" && url.pathname.includes("/pdfjs-dist@3.11.174/")) {
      event.respondWith(staleWhileRevalidate(event, true));
    }
    return;
  }

  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(event, false));
});
