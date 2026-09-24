/* ExamFusion Prep — installed-app session */
(function () {
  "use strict";

  var SESSION_KEY = "efp_app_session_v1";
  var PENDING_KEY = "efp_app_resume_pending_v1";
  var STATIC_QUIZ_KEY = "efp_app_static_quiz_v1";
  var MAX_RESUME_AGE = 24 * 60 * 60 * 1000;
  var intentionalHome = false;

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
    if (/^(?:windows-pwa|pwa|android-pwa|app)$/i.test(source)) return true;
    // TWA / Custom Tab launches can expose the Android package as the referrer.
    // This is more specific than relying on the Chrome user-agent alone.
    try {
      if (/^android-app:\/\/com\.examfusionprep\.app(?:\/|$)/i.test(document.referrer || "")) return true;
    } catch (_) {}
    // The Android package can also open the plain root URL without a source
    // parameter. A relaunched standalone/WebView window is an app launch too.
    try {
      if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
      if (navigator.standalone === true || /; wv\)/i.test(navigator.userAgent || "")) return true;
    } catch (_) {}
    return false;
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
      if (intentionalHome || launchMarker()) return;
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
    intentionalHome = true;
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
    var data;
    try { data = safeParse(localStorage.getItem(SESSION_KEY), null); } catch (_) { return null; }
    if (!data || typeof data !== "object") return null;
    var url = sameOriginRelative(data.url);
    if (!url || isHomePath(new URL(url, location.origin).pathname)) return null;
    if (!Number.isFinite(Number(data.ts)) || Date.now() - Number(data.ts) > MAX_RESUME_AGE) return null;
    data.url = url;
    return data;
  }

  function isHistoryTraversal() {
    try {
      var entries = performance.getEntriesByType && performance.getEntriesByType("navigation");
      return !!(entries && entries[0] && entries[0].type === "back_forward");
    } catch (_) { return false; }
  }

  function maybeResumeFreshLaunch() {
    if (!launchMarker()) return false;
    if (isHistoryTraversal()) { markIntentionalHome(); return false; }
    var saved = readSession();
    if (!saved) return false;
    try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(saved)); } catch (_) {}
    location.replace(saved.url);
    return true;
  }

  function pendingForThisPage() {
    var data;
    try { data = safeParse(sessionStorage.getItem(PENDING_KEY), null); } catch (_) { return null; }
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

  // Legacy book quizzes use static radio cards and keep their scores only in
  // JavaScript variables. Replaying checked cards through their own Check
  // button reconstructs both the feedback and the score after an app restart.
  function installStaticQuizTracking() {
    var pending = pendingForThisPage();
    function cards() { return document.querySelectorAll(".question-box[id] .options[data-correct]"); }
    function questionText(card) {
      var text = card.querySelector(".q-text-en, .q-text-hi");
      return text ? text.textContent.replace(/\s+/g, " ").trim().slice(0, 160) : "";
    }
    function save() {
      var options = cards();
      if (!options.length) return;
      var answers = {};
      Array.prototype.forEach.call(options, function (group) {
        var card = group.closest(".question-box[id]");
        var selected = group.querySelector('input[type="radio"]:checked');
        if (!card || !selected) return;
        answers[card.id] = {
          value: selected.value,
          checked: card.classList.contains("answered"),
          text: questionText(card)
        };
      });
      try { localStorage.setItem(STATIC_QUIZ_KEY, JSON.stringify({
        path: location.pathname, ts: Date.now(), answers: answers
      })); } catch (_) {}
    }
    function restore() {
      if (!pending || !cards().length) return;
      try {
        var saved = safeParse(localStorage.getItem(STATIC_QUIZ_KEY), null);
        if (!saved || saved.path !== location.pathname ||
            !Number.isFinite(Number(saved.ts)) || Date.now() - Number(saved.ts) > MAX_RESUME_AGE) return;
        Object.keys(saved.answers || {}).forEach(function (id) {
          var card = document.getElementById(id);
          var answer = saved.answers[id];
          if (!card || !answer || questionText(card) !== answer.text) return;
          var group = card.querySelector(".options[data-correct]");
          if (!group) return;
          var selected = Array.prototype.find.call(group.querySelectorAll('input[type="radio"]'),
            function (input) { return input.value === answer.value; });
          if (!selected) return;
          selected.checked = true;
          if (answer.checked) {
            var button = group.querySelector(".check-btn");
            if (button && !button.disabled) button.click();
          }
        });
      } catch (_) {}
    }
    function onReady() { restore(); save(); }
    if (document.readyState === "complete") setTimeout(onReady, 0);
    else window.addEventListener("load", onReady, { once: true });
    document.addEventListener("change", function (event) {
      if (event.target && event.target.matches &&
          event.target.matches('.question-box .options[data-correct] input[type="radio"]')) save();
    });
    document.addEventListener("click", function (event) {
      if (event.target && event.target.closest && event.target.closest(".question-box .options[data-correct] .check-btn")) {
        setTimeout(save, 0);
      }
    });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") save();
    });
    document.addEventListener("freeze", save);
    window.addEventListener("pagehide", save);
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
    document.addEventListener("freeze", function () { writeSession(); });
    window.addEventListener("pagehide", function () { writeSession(); });
    window.addEventListener("beforeunload", function () { writeSession(); });
    window.addEventListener("pageshow", function (event) {
      if (event.persisted && isHomePath(location.pathname)) markIntentionalHome();
      else writeSession();
    });

    document.addEventListener("click", function (event) {
      var target = event.target && event.target.closest ? event.target.closest("a[href]") : null;
      if (!target || event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.button > 0) return;
      try {
        var url = new URL(target.href, location.href);
        if (url.origin === location.origin && isHomePath(url.pathname)) markIntentionalHome();
      } catch (_) {}
    }, true);
  }

  if (maybeResumeFreshLaunch()) return;

  installHistoryTracking();
  installLifecycleTracking();
  installStaticQuizTracking();
  restorePendingScroll();
  writeSession();

  window.EFP_APP_SESSION = {
    save: writeSession,
    markHome: markIntentionalHome
  };
})();
