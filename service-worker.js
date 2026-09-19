// v85 smooth mobile PDF scrolling 20260918
const CACHE_VERSION = "efp-pwa-2026-09-20-v92-crux-back-stable";
const OWNER_DEBUG_SCRIPT = '<script src="/owner-debug.js?v=20260911owner1"></script>';
const OWNER_STATE_CACHE = "efp-owner-settings-v1";
const OWNER_STATE_REQUEST = "/__efp_owner_debug_state__";
let ownerDebugState = null;

// Large full-text indexes and PDFs are intentionally runtime-cached only after first use.
const APP_SHELL = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.webmanifest",
  "/privacy-policy.html",
  "/support.html",
  "/backup-restore.html",
  "/music.html",
  "/radio-launch.js",
  "/chess.html",
  "/favicon.png",
  "/pwa-icons/icon-192.png",
  "/pwa-icons/icon-512.png",
  "/pwa-icons/maskable-icon-512.png",
  "/black-mode.js",
  "/owner-debug.js",
  "/home-nav.js?v=20260917mindmapbottom2",
  "/app-session.js?v=20260908answerreset2",
  "/back-parent-map.js",
  "/back-nav.js?v=20260920pdfsearchback3",
  "/search-logic.js",
  "/search-worker.js",
  "/search-index-main.js",
  "/homepage-fulltext-search.js",
  "/Maths%20Speed%20Booster/math-speed-booster.html",
  "/Maths%20Speed%20Booster/math-speed-booster-fit.css",
  "/Original%20Practice/index.html",
  "/Original%20Practice/all-chapters.html",
  "/Original%20Practice/original-practice.css",
  "/Original%20Practice/original-practice.js?v=20260915staticgk1",
  "/Original%20Practice/english-practice.js?v=20260913english1",
  "/Original%20Practice/original-practice-index.js",
  "/Crux-Tricks/index.html",
  "/Crux-Tricks/all-topics.html",
  "/Crux-Tricks/viewer.html",
  "/Crux-Tricks/my-pages.html",
  "/Crux-Tricks/crux-manifest.js",
  "/Crux-Tricks/crux-search-route.js",
  "/Crux-Tricks/crux-restore-flash.js?v=20260920noflash1",
  "/Crux-Tricks/crux-tricks.css",
  "/Crux-Tricks/crux-tricks.js?v=20260919searchhighlight2",
  "/Crux-Tricks/viewer.css",
  "/Crux-Tricks/viewer-v2.js?v=20260920renderheal2",
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

async function getOwnerDebugState() {
  if (ownerDebugState !== null) return ownerDebugState;
  try {
    const cache = await caches.open(OWNER_STATE_CACHE);
    const response = await cache.match(OWNER_STATE_REQUEST);
    ownerDebugState = !!response && (await response.text()) === "on";
  } catch (_) {
    ownerDebugState = false;
  }
  return ownerDebugState;
}

async function setOwnerDebugState(enabled) {
  ownerDebugState = !!enabled;
  const cache = await caches.open(OWNER_STATE_CACHE);
  if (enabled) {
    await cache.put(OWNER_STATE_REQUEST, new Response("on", {
      headers: { "content-type": "text/plain" }
    }));
  } else {
    await cache.delete(OWNER_STATE_REQUEST);
  }
}

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "EFP_OWNER_DEBUG_SET") return;
  event.waitUntil(
    setOwnerDebugState(!!data.enabled)
      .then(() => {
        if (event.ports && event.ports[0]) event.ports[0].postMessage({ ok: true });
      })
      .catch(() => {
        if (event.ports && event.ports[0]) event.ports[0].postMessage({ ok: false });
      })
  );
});

async function matchCachedRequest(request) {
  // App-shell files are pre-cached without cache-busting query strings while
  // pages commonly request them as file.js?v=... . ignoreSearch makes the
  // pre-cached shell usable on the very first offline launch after install.
  return (await caches.match(request)) || caches.match(request, { ignoreSearch: true });
}

function isHomeUrl(url) {
  return url.pathname === "/" || url.pathname === "/index.html";
}

async function shouldInjectOwnerDebug(url) {
  if (isHomeUrl(url)) return true;
  return getOwnerDebugState();
}

function rebuiltHtmlResponse(response, html) {
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  headers.delete("etag");
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Chrome 135+ on Android can render the page behind the gesture-navigation
// area, but pages must explicitly opt in with viewport-fit=cover. A large part
// of this site predates that viewport key, so normalize every HTML navigation
// centrally instead of editing hundreds of chapter files one by one.
function ensureEdgeToEdgeViewport(html) {
  const viewportPattern = /<meta\b[^>]*\bname\s*=\s*(?:"viewport"|'viewport'|viewport)[^>]*>/i;
  const match = html.match(viewportPattern);

  if (!match) {
    const headMatch = html.match(/<head(?:\s[^>]*)?>/i);
    if (!headMatch) return html;
    return html.replace(
      headMatch[0],
      headMatch[0] + '\n  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
    );
  }

  const tag = match[0];
  const contentPattern = /\bcontent\s*=\s*(["'])(.*?)\1/i;
  const contentMatch = tag.match(contentPattern);

  if (!contentMatch) {
    const nextTag = tag.replace(
      /\s*\/?>$/,
      ' content="width=device-width, initial-scale=1, viewport-fit=cover">'
    );
    return html.replace(tag, nextTag);
  }

  const nextTag = tag.replace(contentPattern, (whole, quote, content) => {
    let next = content
      .replace(/(^|,)\s*viewport-fit\s*=\s*[^,\s]+/ig, "$1")
      .replace(/^\s*,\s*|\s*,\s*$/g, "")
      .replace(/,\s*,+/g, ",")
      .trim();

    if (next && !next.endsWith(",")) next += ", ";
    next += "viewport-fit=cover";
    return `content=${quote}${next}${quote}`;
  });

  return html.replace(tag, nextTag);
}

async function injectEdgeToEdge(response) {
  if (!response || !response.ok || (response.type !== "basic" && response.type !== "default")) return response;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("text/html")) return response;

  const html = await response.text();
  return rebuiltHtmlResponse(response, ensureEdgeToEdgeViewport(html));
}

async function injectOwnerDebug(response) {
  if (!response || !response.ok || (response.type !== "basic" && response.type !== "default")) return response;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("text/html")) return response;

  const html = await response.text();
  if (html.includes("owner-debug.js")) return rebuiltHtmlResponse(response, html);

  const headMatch = html.match(/<head(?:\s[^>]*)?>/i);
  if (!headMatch) return rebuiltHtmlResponse(response, html);

  const rewritten = html.replace(headMatch[0], headMatch[0] + "\n  " + OWNER_DEBUG_SCRIPT);
  return rebuiltHtmlResponse(response, rewritten);
}

async function prepareNavigationResponse(response, injectDebug) {
  let served = await injectEdgeToEdge(response);
  if (injectDebug) served = await injectOwnerDebug(served);
  return served;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const url = new URL(request.url);
  const injectDebug = await shouldInjectOwnerDebug(url);
  try {
    const response = await fetch(request);
    const served = await prepareNavigationResponse(response, injectDebug);
    if (served && served.ok && (served.type === "basic" || served.type === "default")) {
      cache.put(request, served.clone());
    }
    return served;
  } catch (error) {
    const cached = await matchCachedRequest(request);
    if (cached) return prepareNavigationResponse(cached, injectDebug);
    const offline = await caches.match("/offline.html");
    if (!offline) return new Response("Offline", { status: 503 });
    return prepareNavigationResponse(offline, injectDebug);
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

async function freshCoreAsset(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response && response.ok && (response.type === "basic" || response.type === "cors")) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    const cached = await caches.match(request) || await caches.match(request, { ignoreSearch: true });
    return cached || new Response("", { status: 503, statusText: "Offline" });
  }
}

async function freshPyqAsset(request) {
  // PYQ is a fast-changing external-link catalog. Never let ignoreSearch return
  // an older runtime-cached catalog/app asset after a bulk import.
  try {
    return await fetch(request, { cache: "no-store" });
  } catch (_) {
    const cached = await caches.match(request);
    return cached || new Response("", { status: 503, statusText: "Offline" });
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    // Cache the PDF.js runtime after its first successful use so the installed
    // PWA does not need to redownload the renderer every time.
    if (url.origin === "https://cdn.jsdelivr.net" && (
        url.pathname.includes("/pdfjs-dist@3.11.174/") ||
        url.pathname.includes("/chess.js@1.4.0/") ||
        url.pathname.includes("/cm-chessboard@8.14.0/")
      )) {
      event.respondWith(staleWhileRevalidate(event, true));
    }
    return;
  }

  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(networkFirst(request));
    return;
  }

  // Navigation chrome and Original Practice shared assets change often;
  // never let an old app-shell copy win on a normal refresh.
  if (url.pathname === "/home-nav.js" ||
      url.pathname === "/back-nav.js" ||
      url.pathname === "/Original%20Practice/original-practice.css" ||
      url.pathname === "/Original%20Practice/original-practice.js" ||
      url.pathname === "/Original%20Practice/english-practice.js" ||
      url.pathname === "/Crux-Tricks/crux-restore-flash.js" ||
      url.pathname === "/Crux-Tricks/crux-tricks.js" ||
      url.pathname === "/Crux-Tricks/viewer-v2.js") {
    event.respondWith(freshCoreAsset(request));
    return;
  }

  if (url.pathname.startsWith("/PYQ/")) {
    event.respondWith(freshPyqAsset(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(event, false));
});
