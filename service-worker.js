// v9 Crux/Tricks bookmarked-pages UI cache bump 20260904
const CACHE_VERSION = "efp-pwa-2026-09-04-v9-crux-page-bookmarks";
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

async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request, { ignoreSearch: true });
    return cached || caches.match("/offline.html");
  }
}

async function staleWhileRevalidate(event) {
  const request = event.request;
  const cache = await caches.open(CACHE_VERSION);
  const cached = await caches.match(request);
  const fresh = fetch(request)
    .then((response) => {
      if (response.ok && response.type === "basic") {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(fresh);
    return cached;
  }

  return (await fresh) || caches.match("/offline.html");
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(event));
});
