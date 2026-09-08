/* ExamFusion Prep — installed-app session */
(function () {
  "use strict";

  var SESSION_KEY = "efp_app_session_v1";
  var PENDING_KEY = "efp_app_resume_pending_v1";
  var MAX_RESUME_AGE = 24 * 60 * 60 * 1000;

  // Original Practice answers are intentionally attempt-only. Remove data
  // written by the retired cross-refresh answer persistence feature.
  try { localStorage.removeItem("efp_quiz_answer_state_v1"); } catch (_) {}

  function safeParse(raw, fallback) {
    try {
      var value = JSON.parse(raw);
      return value == null ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  function normalizedPath(pathname) {
    var path = pathname || "/";
    try { path = decodeURIComponent(path); } catch (_) {}
    path = path.replace(/\/{2,}/g, "/");
    if (path.length > 1) path = path.replace(/\/$/, "");
    return path;
  }

  function isHomePath(pathname) {
    var path = normalizedPath(pathname).toLowerCase();
    return path === "/" || path === "/index.html";
  }

  function launchMarker() {
    if (!isHomePath(location.pathname)) return false;
    var source = "";
    try { source = new URLSearchParams(location.search).get("source") || ""; } catch (_) {}
    return /^(?:windows-pwa|pwa|android-pwa|app)$/i.test(source);
  }

  function relativeUrl() {
    return location.pathname + location.search + location.hash;
  }

  function sameOriginRelative(value) {
    try {
      var url = new URL(String(value || ""), location.origin);
      if (url.origin !== location.origin) return "";
      return url.pathname + url.search + url.hash;
    } catch (_) {
      return "";
    }
  }

  function serializableHistoryState() {
    try {
      if (history.state == null) return null;
      return JSON.parse(JSON.stringify(history.state));
    } catch (_) {
      return null;
    }
  }

  function writeSession(urlOverride) {
    try {
      if (launchMarker()) return;
      var url = sameOriginRelative(urlOverride || relativeUrl());
      if (!url) return;
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        url: url,
        ts: Date.now(),
        scrollY: Math.max(0, Math.round(window.scrollY || 0)),
        historyState: serializableHistoryState()
      }));
    } catch (_) {}
  }

  function markIntentionalHome() {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        url: "/",
        ts: Date.now(),
        scrollY: 0,
        historyState: null
      }));
    } catch (_) {}
  }

  function readSession() {
    var data = safeParse(localStorage.getItem(SESSION_KEY), null);
    if (!data || typeof data !== "object") return null;
    var url = sameOriginRelative(data.url);
    if (!url || isHomePath(new URL(url, location.origin).pathname)) return null;
    if (!Number.isFinite(Number(data.ts)) || Date.now() - Number(data.ts) > MAX_RESUME_AGE) return null;
    data.url = url;
    return data;
  }

  function maybeResumeFreshLaunch() {
    if (!launchMarker()) return false;
    var saved = readSession();
    if (!saved) return false;
    try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(saved)); } catch (_) {}
    location.replace(saved.url);
    return true;
  }

  function pendingForThisPage() {
    var data = safeParse(sessionStorage.getItem(PENDING_KEY), null);
    if (!data || typeof data !== "object") return null;
    var expected = sameOriginRelative(data.url);
    if (!expected) return null;
    var current = relativeUrl();
    var expectedUrl = new URL(expected, location.origin);
    var currentUrl = new URL(current, location.origin);
    if (expectedUrl.pathname !== currentUrl.pathname) return null;
    return data;
  }

  function restorePendingScroll() {
    var data = pendingForThisPage();
    if (!data) return;
    var target = Math.max(0, Number(data.scrollY) || 0);
    var tries = 0;
    function attempt() {
      tries += 1;
      try { window.scrollTo(0, target); } catch (_) {}
      if (tries < 12 && Math.abs((window.scrollY || 0) - target) > 8) {
        setTimeout(attempt, Math.min(500, 60 * tries));
      } else {
        try { sessionStorage.removeItem(PENDING_KEY); } catch (_) {}
      }
    }
    if (document.readyState === "complete") setTimeout(attempt, 0);
    else window.addEventListener("load", function () { setTimeout(attempt, 0); }, { once: true });
  }

  function installHistoryTracking() {
    ["pushState", "replaceState"].forEach(function (name) {
      var original = history[name];
      if (typeof original !== "function" || original.__efpSessionWrapped) return;
      function wrapped() {
        var out = original.apply(history, arguments);
        setTimeout(function () { writeSession(); }, 0);
        return out;
      }
      wrapped.__efpSessionWrapped = true;
      try { history[name] = wrapped; } catch (_) {}
    });
    window.addEventListener("popstate", function () { setTimeout(function () { writeSession(); }, 0); });
    window.addEventListener("hashchange", function () { setTimeout(function () { writeSession(); }, 0); });
  }

  function installLifecycleTracking() {
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") writeSession();
    });
    window.addEventListener("pagehide", function () { writeSession(); });
    window.addEventListener("beforeunload", function () { writeSession(); });
    window.addEventListener("pageshow", function () { writeSession(); });

    document.addEventListener("click", function (event) {
      var target = event.target && event.target.closest ? event.target.closest("#efp-home-button") : null;
      if (target) markIntentionalHome();
    }, true);
  }

  if (maybeResumeFreshLaunch()) return;

  installHistoryTracking();
  installLifecycleTracking();
  restorePendingScroll();
  writeSession();

  window.EFP_APP_SESSION = {
    save: writeSession,
    markHome: markIntentionalHome
  };
})();
