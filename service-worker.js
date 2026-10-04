// v209 professional Fit Width PDF zoom controls
const CACHE_VERSION = "efp-pwa-20261004opentry1";
const OWNER_DEBUG_SCRIPT = '<script src="/owner-debug.js?v=20260911owner1"></script>';
const APP_SESSION_SCRIPT = '<script defer id="efp-app-session-script" src="/app-session.js?v=20261004resumeunlimited1"></script>';
const CA_TOP_SCRIPT = '<script defer src="/ca-move-top-v3.js?v=20261001navbuttons1"></script>';
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
  "/all-bookmarks.html",
  "/music.html",
  "/radio-launch.js",
  "/chess.html",
  "/favicon.png",
  "/pwa-icons/icon-192.png",
  "/pwa-icons/icon-512.png",
  "/pwa-icons/maskable-icon-512.png",
  "/black-mode.js?v=20261004scrollcanvas1",
  "/ca-question-deeplink.js?v=20261004context1",
  "/ca-move-top-v3.js?v=20261001navbuttons1",
  "/blackbook-quiz-bookmarks.js?v=20261004context1",
  "/blackbook-topic-bookmarks.js",
  "/bihar-topic-bookmarks.js?v=20260927bihar1",
  "/owner-debug.js",
  "/home-nav.js?v=20261004searchaudit1",
  "/app-session.js?v=20261004resumeunlimited1",
  "/back-parent-map.js",
  "/back-nav.js?v=20261004searchaudit1",
  "/search-context.js?v=20261004opentry1",
  "/search-context.css?v=20261004inlinecenter1",
  "/mindmap-deeplink.js?v=20261004searchaudit1",
  "/mindmap-reader.css?v=20261004scrollfix1",
  "/progress.js?v=20261001caback1",
  "/rapid-practice-deeplink.js?v=20261004context1",
  "/pdf-mobile-rotate.js?v=20260930desktopnav1",
  "/search-logic.js",
  "/section-search-ui.js?v=20261001searchreturn2",
  "/search-worker.js?v=20261004rank1",
  "/Books/BlackBook/blackbook-tailwind.css?v=20260927systembackquit1",
  "/homepage-search-ui.js?v=20261004searchaudit1",
  "/homepage-fulltext-search.js?v=20261004searchaudit1",
  "/Maths%20Speed%20Booster/math-speed-booster.html",
  "/Maths%20Speed%20Booster/math-speed-booster-fit.css",
  "/Original%20Practice/index.html",
  "/Original%20Practice/all-chapters.html",
  "/Original%20Practice/original-practice.css",
  "/Original%20Practice/original-practice.js?v=20261004searchaudit1",
  "/Original%20Practice/english-practice.js?v=20261004opentry1",
  "/Original%20Practice/original-practice-index.js",
  "/Crux-Tricks/index.html",
  "/Crux-Tricks/all-topics.html",
  "/Crux-Tricks/viewer.html",
  "/Crux-Tricks/my-pages.html",
  "/Crux-Tricks/crux-manifest.js",
  "/Crux-Tricks/crux-search-route.js?v=20261001searchreturn2",
  "/Crux-Tricks/crux-tricks.css",
  "/Crux-Tricks/crux-tricks.js?v=20261004casefold1",
  "/Crux-Tricks/viewer.css",
  "/Crux-Tricks/pdf-search.js?v=20261004pdfmarks1",
  "/Crux-Tricks/viewer-v2.js?v=20261004searchresume1",
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
  let updated = ensureEdgeToEdgeViewport(html);
  if (!/<script\b[^>]*\bsrc\s*=\s*["'][^"']*\bblack-mode\.js(?:[?"'])/i.test(updated)) {
    updated = updated.replace(/<head(?:\s[^>]*)?>/i, (head) => head + '\n  <script defer data-efp-scroll-only src="/black-mode.js?v=20261004scrollcanvas1"></script>');
  }
  // Some quiz pages do not load the shared Home navigation script. Install
  // session tracking for every app navigation, without adding it twice.
  if (!/id=["']efp-app-session-script["']/i.test(updated)) {
    updated = updated.replace(/<head(?:\s[^>]*)?>/i, (head) => head + "\n  " + APP_SESSION_SCRIPT);
  }
  return rebuiltHtmlResponse(response, updated);
}

async function injectCurrentAffairsMoveTop(response, url) {
  if (!response || !response.ok || (response.type !== "basic" && response.type !== "default")) return response;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("text/html")) return response;

  let pathname = "";
  try { pathname = decodeURIComponent(url.pathname || ""); } catch (_) { pathname = url.pathname || ""; }
  if (!pathname.startsWith("/Current Affairs/")) return response;

  let html = await response.text();
  html = html.replace(/<script\b[^>]*\bsrc=["'][^"']*\/ca-move-top(?:-v3)?\.js[^"']*["'][^>]*><\/script>\s*/ig, "");
  if (/<\/head>/i.test(html)) {
    html = html.replace(/<\/head>/i, "  " + CA_TOP_SCRIPT + "\n</head>");
  } else {
    const headMatch = html.match(/<head(?:\s[^>]*)?>/i);
    if (headMatch) html = html.replace(headMatch[0], headMatch[0] + "\n  " + CA_TOP_SCRIPT);
  }
  return rebuiltHtmlResponse(response, html);
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

async function prepareNavigationResponse(response, injectDebug, url) {
  let served = await injectEdgeToEdge(response);
  served = await injectCurrentAffairsMoveTop(served, url);
  if (injectDebug) served = await injectOwnerDebug(served);
  return served;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const url = new URL(request.url);
  const injectDebug = await shouldInjectOwnerDebug(url);
  try {
    const response = await fetch(request);
    const served = await prepareNavigationResponse(response, injectDebug, url);
    if (served && served.ok && (served.type === "basic" || served.type === "default")) {
      cache.put(request, served.clone());
    }
    return served;
  } catch (error) {
    const cached = await matchCachedRequest(request);
    if (cached) return prepareNavigationResponse(cached, injectDebug, url);
    const offline = await caches.match("/offline.html");
    if (!offline) return new Response("Offline", { status: 503 });
    return prepareNavigationResponse(offline, injectDebug, url);
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

// Store one compressed copy of each large index, regardless of the cache
// version strings used by older section shells. Content is lossless; workers
// receive the original JavaScript bytes. Unsupported browsers keep plain data.
async function readSearchIndex(response) {
  if (!response || response.headers.get("x-efp-search-compression") !== "gzip") return response;
  if (typeof DecompressionStream !== "function") return null;
  const headers = new Headers(response.headers);
  headers.delete("x-efp-search-compression");headers.delete("content-length");
  return new Response(response.body.pipeThrough(new DecompressionStream("gzip")), {status: 200, headers});
}
async function storeSearchIndex(cache, key, response, revision) {
  const headers = new Headers(response.headers);
  headers.delete("content-length");headers.delete("content-encoding");
  headers.set("x-efp-search-revision", revision);
  headers.set("x-efp-search-cached-at", String(Date.now()));
  let body = response.body;
  if (typeof CompressionStream === "function" && typeof DecompressionStream === "function") {
    body = body.pipeThrough(new CompressionStream("gzip"));
    headers.set("x-efp-search-compression", "gzip");
  }
  await cache.put(key, new Response(body, {status:200,headers}));
}
async function searchIndexAsset(event) {
  const request = event.request, url = new URL(request.url);
  const key = new Request(url.origin + url.pathname), cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(key), revision = url.search;
  // Short freshness window avoids repeated downloads/import requests while
  // typing. A changed revision bypasses it; offline still uses the last copy.
  if (cached && cached.headers.get("x-efp-search-revision") === revision &&
      Date.now() - Number(cached.headers.get("x-efp-search-cached-at")) < 300000) {
    const served = await readSearchIndex(cached);
    if (served) return served;
  }
  try {
    const response = await fetch(request, {cache:"no-cache"});
    if (response.ok && (response.type === "basic" || response.type === "cors" || response.type === "default")) {
      event.waitUntil(storeSearchIndex(cache,key,response.clone(),revision).catch(() => {}));
      return response;
    }
    const fallback = await readSearchIndex(cached);
    return fallback || response;
  } catch (_) {
    return (await readSearchIndex(cached)) || new Response("", {status:503,statusText:"Offline"});
  }
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

async function freshCurrentAffairsBookmarkAsset() {
  const currentAsset = "/ca-question-deeplink.js?v=20261004context1";
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(currentAsset, { cache: "no-store" });
    if (response && response.ok && (response.type === "basic" || response.type === "cors")) {
      await cache.put(currentAsset, response.clone());
    }
    return response;
  } catch (_) {
    const cached = await caches.match(currentAsset) || await caches.match("/ca-question-deeplink.js");
    return cached || new Response("", { status: 503, statusText: "Offline" });
  }
}

async function freshRapidPracticeAsset() {
  const currentAsset = "/rapid-practice-deeplink.js?v=20261004context1";
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(currentAsset, { cache: "no-store" });
    if (response && response.ok && (response.type === "basic" || response.type === "cors")) {
      await cache.put(currentAsset, response.clone());
    }
    return response;
  } catch (_) {
    const cached = await caches.match(currentAsset) || await caches.match("/rapid-practice-deeplink.js");
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

  if (/\/(?:search-snippets-[^/]+|search-index-main)\.js$/.test(url.pathname)) {
    event.respondWith(searchIndexAsset(event));
    return;
  }

  // Navigation chrome and Original Practice shared assets change often;
  // never let an old app-shell copy win on a normal refresh.
  if (url.pathname === "/home-nav.js" ||
      url.pathname === "/black-mode.js" ||
      url.pathname === "/ca-move-top-v3.js" ||
      url.pathname === "/ca-move-top.js" ||
      url.pathname === "/app-session.js" ||
      url.pathname === "/back-nav.js" ||
      url.pathname === "/search-context.js" ||
      url.pathname === "/search-context.css" ||
      url.pathname === "/back-parent-map.js" ||
      url.pathname === "/question-deeplink.js" ||
      url.pathname === "/rapid-practice-deeplink.js" ||
      url.pathname === "/bihar-objective-gk-deeplink.js" ||
      url.pathname === "/mindmap-deeplink.js" ||
      url.pathname === "/mindmap-reader.css" ||
      url.pathname === "/progress.js" ||
      url.pathname === "/search-logic.js" ||
      url.pathname === "/search-worker.js" ||
      url.pathname === "/section-search-ui.js" ||
      url.pathname === "/homepage-search-ui.js" ||
      url.pathname === "/homepage-fulltext-search.js" ||
      url.pathname === "/Current%20Affairs/Topic%20Names/rapid-search-enhancer.js" ||
      url.pathname === "/search-snippets-current-affairs.js" ||
      url.pathname === "/blackbook-quiz-bookmarks.js" ||
      url.pathname === "/blackbook-topic-bookmarks.js" ||
      url.pathname === "/Current%20Affairs/Topic%20Names/brics-search-index.js" ||
      url.pathname === "/Current%20Affairs/Topic%20Names/Rapid%20Practice/2026/Topic%20Wise/rapid-runtime.js" ||
      url.pathname === "/bihar-topic-bookmarks.js" ||
      url.pathname === "/pdf-mobile-rotate.js" ||
      url.pathname === "/Original%20Practice/original-practice.css" ||
      url.pathname === "/Original%20Practice/original-practice.js" ||
      url.pathname === "/Original%20Practice/english-practice.js" ||
      url.pathname === "/Crux-Tricks/crux-search-route.js" ||
      url.pathname === "/Crux-Tricks/crux-tricks.js" ||
      url.pathname === "/Crux-Tricks/search-snippets-crux-tricks.js" ||
      url.pathname.startsWith("/Crux-Tricks/pages/") ||
      url.pathname === "/Crux-Tricks/pdf-search.js" ||
      url.pathname === "/Crux-Tricks/viewer-v2.js") {
    event.respondWith(freshCoreAsset(request));
    return;
  }

  if (url.pathname === "/ca-question-deeplink.js") {
    event.respondWith(freshCurrentAffairsBookmarkAsset());
    return;
  }

  if (url.pathname === "/rapid-practice-deeplink.js") {
    event.respondWith(freshRapidPracticeAsset());
    return;
  }

  if (url.pathname.startsWith("/PYQ/")) {
    event.respondWith(freshPyqAsset(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(event, false));
});
