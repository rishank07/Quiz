/* ExamFusion Prep — installed-app session resume (Android + installed web app/PWA) */
(function () {
  "use strict";

  var SESSION_KEY = "efp_app_session_v1";
  var PENDING_KEY = "efp_app_resume_pending_v1";
  var STATIC_QUIZ_KEY = "efp_quiz_progress_v2";
  var LEGACY_STATIC_QUIZ_KEY = "efp_app_static_quiz_v1";
  var QUIZ_WARNING_KEY = "efp_app_quiz_warning_v1";
  var INSTALLED_APP_CONTEXT_KEY = "efp_installed_app_context_v1";
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

  function installedAppLaunchMarker() {
    if (!isHomePath(location.pathname)) return false;
    var source = "";
    try { source = new URLSearchParams(location.search).get("source") || ""; } catch (_) {}
    if (/^(?:windows-pwa|pwa|android-pwa|app)$/i.test(source)) return true;
    // TWA / Custom Tab launches can expose the Android package as the referrer.
    try {
      if (/^android-app:\/\/com\.examfusionprep\.app(?:\/|$)/i.test(document.referrer || "")) return true;
    } catch (_) {}
    try {
      if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
      if (navigator.standalone === true || /; wv\)/i.test(navigator.userAgent || "")) return true;
    } catch (_) {}
    return false;
  }

  function launchMarker() {
    // Auto-resume is deliberately limited to installed surfaces. Normal
    // browser visits must remain ordinary URL/search navigations.
    return installedAppLaunchMarker();
  }

  var ANDROID_APP_CONTEXT_KEY = "efp_android_app_context_v1";

  function rememberAndroidAppContext() {
    if (!isHomePath(location.pathname)) return;
    var ua = "";
    try { ua = navigator.userAgent || ""; } catch (_) {}

    var packageReferrer = false;
    try {
      packageReferrer = /^android-app:\/\/com\.examfusionprep\.app(?:\/|$)/i.test(document.referrer || "");
    } catch (_) {}

    /* The Android TWA may launch the same manifest start_url used by other
       installs. Android UA + a verified app/PWA launch marker is therefore
       the durable signal; save it before navigating to any internal page,
       where the android-app:// referrer is no longer available. */
    if (!/Android/i.test(ua) || (!packageReferrer && !installedAppLaunchMarker())) return;
    try { sessionStorage.setItem(ANDROID_APP_CONTEXT_KEY, "1"); } catch (_) {}
  }

  function rememberInstalledAppContext() {
    if (!isHomePath(location.pathname) || !installedAppLaunchMarker()) return;
    try { sessionStorage.setItem(INSTALLED_APP_CONTEXT_KEY, "1"); } catch (_) {}
  }

  function isInstalledAppContext() {
    try {
      if (sessionStorage.getItem(INSTALLED_APP_CONTEXT_KEY) === "1" ||
          sessionStorage.getItem(ANDROID_APP_CONTEXT_KEY) === "1") return true;
    } catch (_) {}
    try {
      if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
      if (navigator.standalone === true) return true;
    } catch (_) {}
    return false;
  }

  rememberAndroidAppContext();
  rememberInstalledAppContext();

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

  function maybeResumeSameDeviceLaunch() {
    if (!launchMarker()) return false;
    if (isHistoryTraversal()) { markIntentionalHome(); return false; }
    var saved = readSession();
    if (!saved) return false;
    try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(saved)); } catch (_) {}
    /* Preserve the launch Home entry underneath the restored page. Using
       replace() here erased the only real history entry after an Android
       process recreation, so system Back could appear dead on any resumed
       section (Original Practice included). assign() keeps Home behind the
       restored page; the existing back_forward guard prevents resume loops. */
    location.assign(saved.url);
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

  // Book quizzes and Bihar's 60 Sets use static radio cards. Keep one durable
  // entry per page (and per set on Bihar 60 Sets), then replay each checked
  // card through the page's own Check button so its score and feedback remain
  // the source of truth after refresh, Back, or reopening the quiz.
  function installStaticQuizTracking() {
    var path = normalizedPath(location.pathname);
    var lowerPath = path.toLowerCase();
    var isBiharSixtySets =
      lowerPath === "/bihar special/topic names/bihar objective gk - 60 sets.html";
    var supported = lowerPath.indexOf("/books/") === 0 || isBiharSixtySets;
    if (!supported) return;

    var restoring = false;
    function cards() { return document.querySelectorAll(".question-box[id] .options[data-correct]"); }
    function questionText(card) {
      var text = card.querySelector(".q-text-en, .q-text-hi");
      return text ? text.textContent.replace(/\s+/g, " ").trim().slice(0, 160) : "";
    }
    function readStore() {
      var value = safeParse(localStorage.getItem(STATIC_QUIZ_KEY), {});
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    }
    function writeStore(store) {
      try {
        if (Object.keys(store).length) localStorage.setItem(STATIC_QUIZ_KEY, JSON.stringify(store));
        else localStorage.removeItem(STATIC_QUIZ_KEY);
      } catch (_) {}
    }
    function migrateLegacy(store) {
      try {
        var legacy = safeParse(localStorage.getItem(LEGACY_STATIC_QUIZ_KEY), null);
        if (legacy && legacy.path === location.pathname && legacy.answers && !store[path]) {
          store[path] = { kind: "static", ts: Number(legacy.ts) || Date.now(), answers: legacy.answers };
          writeStore(store);
        }
        localStorage.removeItem(LEGACY_STATIC_QUIZ_KEY);
      } catch (_) {}
      return store;
    }
    function save() {
      var options = cards();
      if (!options.length) return;
      var store = migrateLegacy(readStore());
      var entry = store[path] && store[path].kind === "static"
        ? store[path] : { kind: "static", answers: {} };
      if (!entry.answers || typeof entry.answers !== "object") entry.answers = {};
      Array.prototype.forEach.call(options, function (group) {
        var card = group.closest(".question-box[id]");
        var selected = group.querySelector('input[type="radio"]:checked');
        if (!card) return;
        if (!selected) {
          delete entry.answers[card.id];
          return;
        }
        entry.answers[card.id] = {
          value: selected.value,
          checked: card.classList.contains("answered"),
          text: questionText(card)
        };
      });
      entry.ts = Date.now();
      if (Object.keys(entry.answers).length) store[path] = entry;
      else delete store[path];
      writeStore(store);
    }
    function restoreGroup(group, answer) {
      if (!group || !answer) return false;
      var card = group.closest(".question-box[id]");
      if (!card || card.classList.contains("answered") || questionText(card) !== answer.text) return false;
      var selected = Array.prototype.find.call(group.querySelectorAll('input[type="radio"]'),
        function (input) { return input.value === answer.value; });
      if (!selected) return false;
      selected.checked = true;
      if (answer.checked) {
        var button = group.querySelector(".check-btn") || card.querySelector(".check-btn");
        if (button && !button.disabled) button.click();
      }
      return true;
    }
    function restore(root) {
      if (!cards().length) return;
      var restoredAny = false;
      try {
        var store = migrateLegacy(readStore());
        var saved = store[path];
        if (!saved || saved.kind !== "static" || !saved.answers) return;
        var scope = root && root.querySelectorAll ? root : document;
        restoring = true;
        var groups = Array.prototype.slice.call(scope.querySelectorAll(".question-box[id] .options[data-correct]"));
        if (scope.matches && scope.matches(".question-box[id]")) {
          var ownGroup = scope.querySelector(".options[data-correct]");
          if (ownGroup) groups.unshift(ownGroup);
        }
        Array.prototype.forEach.call(groups, function (group) {
          var card = group.closest(".question-box[id]");
          if (card && restoreGroup(group, saved.answers[card.id])) restoredAny = true;
        });
      } catch (_) {
      } finally {
        restoring = false;
        if (restoredAny && window.EFP_QUIZ_PROGRESS_WARNING) window.EFP_QUIZ_PROGRESS_WARNING.arm();
      }
    }
    function resetDom(scope) {
      Array.prototype.forEach.call(scope.querySelectorAll(".question-box[id]"), function (card) {
        card.classList.remove("answered");
        Array.prototype.forEach.call(card.querySelectorAll('input[type="radio"]'), function (input) {
          input.checked = false;
          input.disabled = false;
        });
        Array.prototype.forEach.call(card.querySelectorAll(".option-label"), function (label) {
          label.classList.remove("correct", "wrong", "incorrect");
        });
        var explanation = card.querySelector(".explanation");
        if (explanation) explanation.style.display = "none";
        var check = card.querySelector(".check-btn");
        if (check) check.disabled = false;
      });
    }
    function clearSavedFor(scope, setno) {
      var store = readStore();
      var entry = store[path];
      if (entry && entry.answers) {
        if (setno) {
          var prefix = "s" + setno + "-";
          Object.keys(entry.answers).forEach(function (id) {
            if (id.indexOf(prefix) === 0) delete entry.answers[id];
          });
        } else {
          entry.answers = {};
        }
        if (Object.keys(entry.answers).length) {
          entry.ts = Date.now();
          store[path] = entry;
        } else {
          delete store[path];
        }
        writeStore(store);
      }
      resetDom(scope);
      if (setno) {
        try { if (typeof setScores !== "undefined") setScores[setno] = { correct: 0, wrong: 0, attempted: 0 }; } catch (_) {}
        ["totalAttempted-", "correctCount-", "wrongCount-"].forEach(function (prefix) {
          var node = document.getElementById(prefix + setno);
          if (node) node.textContent = "0";
        });
      } else {
        try {
          if (typeof correctTotal !== "undefined") correctTotal = 0;
          if (typeof wrongTotal !== "undefined") wrongTotal = 0;
          if (typeof attempted !== "undefined") attempted = 0;
        } catch (_) {}
        [["totalAttempted", "0"], ["correctCount", "0"], ["wrongCount", "0"]].forEach(function (pair) {
          var node = document.getElementById(pair[0]);
          if (node) node.textContent = pair[1];
        });
      }
      if (window.EFP_QUIZ_PROGRESS_WARNING) window.EFP_QUIZ_PROGRESS_WARNING.disarm();
    }
    function ensureStyle() {
      if (document.getElementById("efp-quiz-reset-style")) return;
      var style = document.createElement("style");
      style.id = "efp-quiz-reset-style";
      style.textContent = ".efp-quiz-reset-btn{appearance:none;border:1px solid rgba(220,38,38,.28);background:#fff;color:#b42318;border-radius:999px;padding:6px 10px;font:800 11px/1.1 Arial,sans-serif;cursor:pointer;white-space:nowrap}.efp-quiz-reset-btn:hover{background:#fff1f2;border-color:#ef4444}.efp-quiz-reset-btn:focus-visible{outline:3px solid rgba(239,68,68,.25);outline-offset:2px}html.efp-black .efp-quiz-reset-btn,html.efp-black-invert .efp-quiz-reset-btn{background:#111827;color:#fca5a5;border-color:#7f1d1d}.efp-bihar-reset-row{display:flex!important;align-items:center!important;gap:clamp(6px,1.8vw,14px)!important;flex-wrap:nowrap!important}.efp-bihar-reset-row .efp-bihar-reset-btn{margin:0!important;flex:0 0 auto!important;min-width:74px;padding:0 11px!important;font-size:12px!important;line-height:1!important;background:#fff1f2!important;color:#b42318!important;border-color:#ef4444!important;box-shadow:none!important;-webkit-tap-highlight-color:transparent!important}.efp-bihar-reset-row .efp-bihar-reset-btn:hover{background:#ffe4e6!important;color:#991b1b!important;border-color:#dc2626!important}.efp-bihar-reset-row .efp-bihar-reset-btn:active,.efp-bihar-reset-row .efp-bihar-reset-btn:focus{background:#fecdd3!important;color:#881337!important;border-color:#be123c!important}.efp-bihar-reset-row .efp-bihar-reset-btn .efp-bihar-reset-icon{margin-right:3px}html.efp-black .efp-bihar-reset-row .efp-bihar-reset-btn,html.efp-black-invert .efp-bihar-reset-row .efp-bihar-reset-btn{background:#2a1115!important;color:#fecaca!important;border-color:#ef4444!important}@media(max-width:480px){.efp-bihar-reset-row{gap:6px!important}.efp-bihar-reset-row input[type=number]{width:60px!important;min-width:0!important;max-width:60px!important;flex:0 0 60px!important}.efp-bihar-reset-row .efp-bihar-reset-btn{min-width:58px!important;padding:0 7px!important;font-size:11px!important}.efp-bihar-reset-row .efp-bihar-reset-btn .efp-bihar-reset-icon{display:none}}";
      document.head.appendChild(style);
    }
    function currentBiharSetPanel() {
      var active = document.querySelector(
        ".set-panel.active[data-set],.set-panel.current[data-set],.set-panel[aria-hidden=\"false\"][data-set]"
      );
      if (active) return active;
      var panels = document.querySelectorAll(".set-panel[data-set]");
      for (var i = 0; i < panels.length; i++) {
        var panel = panels[i];
        var style = window.getComputedStyle ? window.getComputedStyle(panel) : null;
        if ((!style || style.display !== "none") && panel.getClientRects().length) return panel;
      }
      return null;
    }
    function findBiharGoButton() {
      var buttons = document.querySelectorAll("button");
      var fallback = null;
      for (var i = 0; i < buttons.length; i++) {
        var button = buttons[i];
        if ((button.textContent || "").replace(/\s+/g, " ").trim().toLowerCase() !== "go") continue;
        if (!fallback) fallback = button;
        var rowText = button.parentElement
          ? (button.parentElement.textContent || "").replace(/\s+/g, " ").toLowerCase()
          : "";
        if (rowText.indexOf("set no") !== -1 || rowText.indexOf("सेट") !== -1) return button;
      }
      return fallback;
    }
    function addBiharResetButton() {
      var goButton = findBiharGoButton();
      if (!goButton || !goButton.parentNode) return;
      var oldButtons = document.querySelectorAll(
        ".score-bar .efp-quiz-reset-btn,.set-score-bar .efp-quiz-reset-btn"
      );
      Array.prototype.forEach.call(oldButtons, function (oldButton) {
        if (oldButton.id !== "efp-bihar-quiz-reset") oldButton.remove();
      });
      var button = document.getElementById("efp-bihar-quiz-reset");
      if (!button) {
        button = document.createElement("button");
        button.id = "efp-bihar-quiz-reset";
        button.type = "button";
        button.className = "efp-quiz-reset-btn efp-bihar-reset-btn";
        button.innerHTML =
          "<span class=\"efp-bihar-reset-icon\" aria-hidden=\"true\">↻</span><span>Reset</span>";
        button.setAttribute("aria-label", "Reset progress for the current Bihar GK set");
        button.addEventListener("click", function () {
          var setPanel = currentBiharSetPanel();
          var setno = setPanel && setPanel.getAttribute("data-set");
          if (!setno) {
            var input = goButton.parentElement &&
              goButton.parentElement.querySelector('input[type="number"]');
            var candidate = input ? parseInt(input.value, 10) : 0;
            if (candidate >= 1 && candidate <= 60) {
              setno = String(candidate);
              setPanel = document.querySelector('.set-panel[data-set="' + setno + '"]');
            }
          }
          var label = setno ? "Set " + String(setno).padStart(2, "0") : "this set";
          if (!window.confirm("Reset progress for " + label + "? Your bookmarks will stay saved.")) return;
          clearSavedFor(setPanel || document, setno);
        });
      }
      goButton.parentElement.classList.add("efp-bihar-reset-row");
      if (button.previousElementSibling !== goButton) {
        goButton.insertAdjacentElement("afterend", button);
      }
      // Match the actual Go button height instead of guessing with padding.
      // This keeps the two controls visually aligned across phone/browser/app layouts.
      var goHeight = Math.round(goButton.getBoundingClientRect().height);
      if (goHeight > 0) {
        button.style.setProperty("height", goHeight + "px", "important");
        button.style.setProperty("min-height", goHeight + "px", "important");
      }
    }
    function addResetButtons(root) {
      ensureStyle();
      if (isBiharSixtySets) {
        addBiharResetButton();
        return;
      }
      var scope = root && root.querySelectorAll ? root : document;
      Array.prototype.forEach.call(scope.querySelectorAll(".score-bar, .set-score-bar"), function (bar) {
        if (bar.querySelector(".efp-quiz-reset-btn")) return;
        var setPanel = bar.closest(".set-panel");
        var setno = setPanel && setPanel.getAttribute("data-set");
        var button = document.createElement("button");
        button.type = "button";
        button.className = "efp-quiz-reset-btn";
        button.textContent = "↻ Reset";
        button.setAttribute("aria-label", setno ? "Reset progress for Set " + setno : "Reset quiz progress");
        button.addEventListener("click", function () {
          var label = setno ? "Set " + String(setno).padStart(2, "0") : "this quiz";
          if (!window.confirm("Reset progress for " + label + "? Your bookmarks will stay saved.")) return;
          clearSavedFor(setPanel || document, setno);
        });
        bar.appendChild(button);
      });
    }
    function onReady() { restore(document); addResetButtons(document); save(); }
    if (document.readyState === "complete") setTimeout(onReady, 0);
    else window.addEventListener("load", onReady, { once: true });
    document.addEventListener("change", function (event) {
      if (event.target && event.target.matches &&
          event.target.matches('.question-box .options[data-correct] input[type="radio"]') && !restoring) save();
    });
    document.addEventListener("click", function (event) {
      if (event.target && event.target.closest && event.target.closest(".question-box .options[data-correct] .check-btn")) {
        if (!restoring) setTimeout(save, 0);
      }
    });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") save();
    });
    document.addEventListener("freeze", save);
    window.addEventListener("pagehide", save);
    if (window.MutationObserver) {
      var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          Array.prototype.forEach.call(mutation.addedNodes || [], function (node) {
            if (!node || node.nodeType !== 1) return;
            restore(node);
            addResetButtons(node.matches && node.matches(".set-panel,.set-score-bar") ? (node.parentNode || document) : node);
          });
        });
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  // BlackBook A-Z quizzes build randomized button options on window.load.
  // Store the selected option text by stable question id, then click the
  // matching option after the next render to reconstruct score and feedback.
  function installDynamicBookQuizTracking() {
    var path = normalizedPath(location.pathname);
    if (path.toLowerCase().indexOf("/books/blackbook/files/") !== 0) return;

    function readStore() {
      var value = safeParse(localStorage.getItem(STATIC_QUIZ_KEY), {});
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    }
    function writeStore(store) {
      try {
        if (Object.keys(store).length) localStorage.setItem(STATIC_QUIZ_KEY, JSON.stringify(store));
        else localStorage.removeItem(STATIC_QUIZ_KEY);
      } catch (_) {}
    }
    function selectedText(button) {
      var text = button && button.querySelector && button.querySelector(".option-text");
      return text ? text.textContent.replace(/\s+/g, " ").trim() : "";
    }
    function normalizedAnswerText(value) {
      return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
    }
    function correctTextFor(questionId) {
      var api = window.EFP_BLACKBOOK_QUIZ;
      if (api && typeof api.correctFor === "function") {
        try { return normalizedAnswerText(api.correctFor(questionId)); } catch (_) {}
      }
      var group = document.getElementById(questionId);
      var card = group && group.parentElement;
      var correct = card && card.querySelector && card.querySelector('[id^="exp-"] .text-lg.font-bold.text-blue-800');
      return normalizedAnswerText(correct && correct.textContent);
    }
    function answerWasCorrect(questionId, answer) {
      if (answer && typeof answer.correct === "boolean") return answer.correct;
      var correct = correctTextFor(questionId);
      return !!correct && normalizedAnswerText(answer && answer.value) === correct;
    }
    function syncFullScore(entry) {
      if (!entry || !entry.answers) return;
      var total = Object.keys(entry.answers).reduce(function (sum, questionId) {
        return sum + (answerWasCorrect(questionId, entry.answers[questionId]) ? 1 : 0);
      }, 0);
      var api = window.EFP_BLACKBOOK_QUIZ;
      if (api && typeof api.setScore === "function") {
        try { api.setScore(total); return; } catch (_) {}
      }
      ["total-score", "mobile-score"].forEach(function (id) {
        var node = document.getElementById(id);
        if (node) node.textContent = String(total);
      });
    }
    function saveAnswer(button) {
      var group = button && button.closest && button.closest('[id^="opts-"]');
      if (!group || !group.id) return;
      var value = selectedText(button);
      if (!value) return;
      var store = readStore();
      var entry = store[path] && store[path].kind === "dynamic-book"
        ? store[path] : { kind: "dynamic-book", answers: {} };
      entry.answers[group.id] = {
        value: value,
        correct: button.classList.contains("option-correct") && !button.classList.contains("option-incorrect")
      };
      entry.ts = Date.now();
      var active = document.querySelector("#alphabet-container button[data-letter].bg-blue-600");
      if (active) entry.section = active.getAttribute("data-letter") || "";
      store[path] = entry;
      writeStore(store);
    }
    function saveSection(button) {
      var letter = button && button.getAttribute && button.getAttribute("data-letter");
      if (!letter) return;
      var store = readStore();
      var entry = store[path] && store[path].kind === "dynamic-book"
        ? store[path] : { kind: "dynamic-book", answers: {} };
      entry.section = letter;
      entry.ts = Date.now();
      store[path] = entry;
      writeStore(store);
    }
    function restore() {
      var store = readStore();
      var entry = store[path];
      if (!entry || entry.kind !== "dynamic-book" || !entry.answers) return true;
      var ids = Object.keys(entry.answers);
      if (!document.querySelector(".quiz-option")) return false;
      var migrated = false;
      ids.forEach(function (questionId) {
        var answer = entry.answers[questionId];
        if (!answer || typeof answer.correct === "boolean") return;
        var correct = correctTextFor(questionId);
        if (!correct) return;
        answer.correct = normalizedAnswerText(answer.value) === correct;
        migrated = true;
      });
      if (migrated) {
        store[path] = entry;
        writeStore(store);
      }
      syncFullScore(entry);
      var index = 0;
      function batch() {
        var end = Math.min(ids.length, index + 35);
        for (; index < end; index += 1) {
          var group = document.getElementById(ids[index]);
          if (!group || group.querySelector(".quiz-option:disabled")) continue;
          var savedAnswer = entry.answers[ids[index]];
          var wanted = normalizedAnswerText(savedAnswer && savedAnswer.value);
          var button = Array.prototype.find.call(group.querySelectorAll(".quiz-option"), function (candidate) {
            return normalizedAnswerText(selectedText(candidate)) === wanted;
          });
          // Distractors are randomized on every render. If a previously
          // selected wrong option is absent, reuse one current wrong button
          // and restore the saved label before replaying the answer.
          if (!button && wanted && !answerWasCorrect(ids[index], savedAnswer)) {
            var correct = correctTextFor(ids[index]);
            button = Array.prototype.find.call(group.querySelectorAll(".quiz-option"), function (candidate) {
              return normalizedAnswerText(selectedText(candidate)) !== correct;
            });
            var optionText = button && button.querySelector(".option-text");
            if (optionText) optionText.textContent = wanted;
          }
          if (button) button.click();
        }
        if (index < ids.length) {
          (window.requestAnimationFrame || window.setTimeout)(batch);
          return;
        }
        var latestStore = readStore();
        var latestEntry = latestStore[path] && latestStore[path].kind === "dynamic-book"
          ? latestStore[path] : entry;
        syncFullScore(latestEntry);
        if (latestEntry.section) {
          var nav = document.querySelector('#alphabet-container button[data-letter="' + latestEntry.section + '"]');
          if (nav && !nav.classList.contains("bg-blue-600")) nav.click();
        }
      }
      batch();
      return true;
    }
    function addResetButton() {
      if (document.getElementById("efp-blackbook-reset")) return;
      var score = document.getElementById("total-score");
      if (!score) return;
      if (!document.getElementById("efp-quiz-reset-style")) {
        var style = document.createElement("style");
        style.id = "efp-quiz-reset-style";
        style.textContent = ".efp-quiz-reset-btn{appearance:none;border:1px solid rgba(220,38,38,.28);background:#fff;color:#b42318;border-radius:999px;padding:7px 11px;font:800 11px/1.1 Arial,sans-serif;cursor:pointer;white-space:nowrap}.efp-quiz-reset-btn:focus-visible{outline:3px solid rgba(255,255,255,.32);outline-offset:2px}";
        document.head.appendChild(style);
      }
      var row = score.closest("header") && score.closest("header").querySelector(".max-w-4xl > .flex");
      if (!row) return;
      var button = document.createElement("button");
      button.id = "efp-blackbook-reset";
      button.type = "button";
      button.className = "efp-quiz-reset-btn";
      button.style.background = "rgba(255,255,255,.14)";
      button.style.color = "#fff";
      button.style.borderColor = "rgba(255,255,255,.35)";
      button.textContent = "↻ Reset";
      button.addEventListener("click", function () {
        if (!window.confirm("Reset progress for this quiz? Your bookmarks will stay saved.")) return;
        var store = readStore();
        delete store[path];
        writeStore(store);
        if (window.EFP_QUIZ_PROGRESS_WARNING) window.EFP_QUIZ_PROGRESS_WARNING.disarm();
        location.reload();
      });
      row.appendChild(button);
    }
    function ready(attempt) {
      addResetButton();
      if (restore()) return;
      if (attempt < 30) setTimeout(function () { ready(attempt + 1); }, 100);
    }
    document.addEventListener("click", function (event) {
      var option = event.target && event.target.closest ? event.target.closest(".quiz-option") : null;
      if (option && !option.disabled) setTimeout(function () { saveAnswer(option); }, 0);
      var nav = event.target && event.target.closest ? event.target.closest("#alphabet-container button[data-letter]") : null;
      if (nav) setTimeout(function () { saveSection(nav); }, 0);
    }, true);
    var blackbookLazyObserver = null;
    var blackbookRestoreTimer = 0;
    if (window.MutationObserver) {
      var quizRoot = document.getElementById("quiz-container") || document.documentElement;
      blackbookLazyObserver = new MutationObserver(function (mutations) {
        var hasQuizContent = mutations.some(function (mutation) {
          return Array.prototype.some.call(mutation.addedNodes || [], function (node) {
            if (!node || node.nodeType !== 1) return false;
            if (node.matches && (node.matches('.quiz-option') || node.matches('section[id^="section-"]'))) return true;
            return !!(node.querySelector && node.querySelector('.quiz-option'));
          });
        });
        if (!hasQuizContent) return;
        clearTimeout(blackbookRestoreTimer);
        blackbookRestoreTimer = setTimeout(restore, 20);
      });
      blackbookLazyObserver.observe(quizRoot, { childList: true, subtree: true });
    }

    if (document.readyState === "complete") setTimeout(function () { ready(0); }, 0);
    else window.addEventListener("load", function () { setTimeout(function () { ready(0); }, 0); }, { once: true });
  }

  // Warn only after the learner has actually interacted with a quiz.
  // Browsers ignore custom beforeunload text, so refresh / device Back uses
  // the native leave-page dialog while in-page Back/Home controls get our
  // explicit ExamFusion message.
  function installQuizProgressWarning() {
    var dirty = false;
    var allowNavigation = false;
    var MODAL_ID = "efp-quiz-exit-modal";

    function warningPageKey(value) {
      try {
        var url = new URL(String(value || ""), location.origin);
        if (url.origin !== location.origin) return "";
        return url.pathname + url.search;
      } catch (_) {
        return "";
      }
    }

    function clearPersistedWarning() {
      if (!isInstalledAppContext() && !pendingForThisPage()) return;
      try { localStorage.removeItem(QUIZ_WARNING_KEY); } catch (_) {}
    }

    function persistWarning() {
      if (!dirty || !isInstalledAppContext()) return;
      try {
        localStorage.setItem(QUIZ_WARNING_KEY, JSON.stringify({
          url: relativeUrl(),
          ts: Date.now()
        }));
      } catch (_) {}
    }

    function restorePersistedWarning() {
      var pending = pendingForThisPage();
      if (!pending || dirty) return false;
      try {
        var saved = safeParse(localStorage.getItem(QUIZ_WARNING_KEY), null);
        if (!saved || !Number.isFinite(Number(saved.ts)) ||
            Date.now() - Number(saved.ts) > MAX_RESUME_AGE) return false;
        var savedKey = warningPageKey(saved.url);
        var pendingKey = warningPageKey(pending.url);
        var currentKey = warningPageKey(relativeUrl());
        if (!savedKey || savedKey !== pendingKey || savedKey !== currentKey) return false;
        if (!hasVisibleQuizSurface() || isClearlyFinished()) return false;
        dirty = true;
        return true;
      } catch (_) {
        return false;
      }
    }

    var QUIZ_SURFACES = [
      ".question-box",
      ".question-card",
      "#quizView",
      ".quiz-view",
      ".quiz-container",
      ".question-container",
      ".quiz-item",
      ".mcq-item",
      ".question-item",
      ".q-card",
      ".qcard",
      ".quiz-option",
      "#kbArea",
      "#mcqArea",
      ".option-btn",
      "[data-correct]"
    ].join(",");

    function isVisible(node) {
      if (!node || node.hidden) return false;
      try {
        var style = window.getComputedStyle ? window.getComputedStyle(node) : null;
        if (style && (style.display === "none" || style.visibility === "hidden")) return false;
      } catch (_) {}
      try { return !node.getClientRects || node.getClientRects().length > 0; } catch (_) { return true; }
    }

    function hasVisibleQuizSurface() {
      var nodes;
      try { nodes = document.querySelectorAll(QUIZ_SURFACES); } catch (_) { return false; }
      for (var i = 0; i < nodes.length; i += 1) {
        if (isVisible(nodes[i])) return true;
      }
      return false;
    }

    function hasAnsweredQuizSurface() {
      var selectors = [
        ".question-box.answered",
        ".option-btn.answered",
        ".quiz-option:disabled",
        ".qcard .opt:disabled",
        ".qcard button.opt:disabled",
        ".question-card button:disabled"
      ];
      try {
        var node = document.querySelector(selectors.join(","));
        return !!(node && hasVisibleQuizSurface());
      } catch (_) {
        return false;
      }
    }

    function isClearlyFinished() {
      var finishSelectors = [
        "#finishView",
        ".finish-view",
        ".finish-panel",
        "#resultScreen",
        ".result-screen",
        ".quiz-result",
        ".results-screen"
      ];
      for (var i = 0; i < finishSelectors.length; i += 1) {
        var node = document.querySelector(finishSelectors[i]);
        if (node && isVisible(node)) {
          var quizView = document.getElementById("quizView");
          if (!quizView || !isVisible(quizView)) return true;
        }
      }
      return false;
    }

    function shouldWarn() {
      return dirty && !allowNavigation && hasVisibleQuizSurface() && !isClearlyFinished();
    }

    function arm() {
      if (!hasVisibleQuizSurface()) return;
      dirty = true;
      persistWarning();
    }

    function disarm() {
      dirty = false;
      allowNavigation = false;
      clearPersistedWarning();
    }

    function isAnswerInteraction(target) {
      if (!target || !target.closest || !hasVisibleQuizSurface()) return false;
      var direct = target.closest([
        ".quiz-option",
        ".qcard .opt",
        ".option-btn",
        "#options .option",
        "#options input[name='mixedOption']",
        ".question-box .options[data-correct] label",
        ".question-box .options[data-correct] input[type='radio']",
        ".question-card .options label",
        ".question-card .options input",
        ".question-card .options li",
        ".quiz-item .options label",
        ".quiz-item .options input",
        ".quiz-item .options li",
        ".mcq-item .options label",
        ".mcq-item .options input",
        ".mcq-item .options li",
        ".question-item .options label",
        ".question-item .options input",
        ".question-item .options li",
        ".choice-btn",
        ".answer-btn",
        "[data-answer]",
        "[data-option]",
        "#kbArea button",
        "#mcqArea button"
      ].join(","));
      return !!direct;
    }

    function navigationTarget(target) {
      if (!target || !target.closest) return null;
      var control = target.closest(
        "#efp-app-back-button,#efp-home-button,.home-btn,a.back-btn,button.back-btn,[data-nav='back'],[data-nav='home']"
      );
      if (control) return control;

      var anchor = target.closest("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return null;
      var raw = anchor.getAttribute("href") || "";
      if (!raw || raw.charAt(0) === "#" || /^javascript:/i.test(raw)) return null;
      try {
        var url = new URL(anchor.href, location.href);
        if (url.origin === location.origin &&
            url.pathname === location.pathname &&
            url.search === location.search) return null;
      } catch (_) {}
      return anchor;
    }

    function approveOneNavigation() {
      allowNavigation = true;
      window.setTimeout(function () { allowNavigation = false; }, 1800);
    }

    function ensureExitModal() {
      var existing = document.getElementById(MODAL_ID);
      if (existing) return existing;

      var style = document.createElement("style");
      style.id = MODAL_ID + "-style";
      style.textContent = [
        "#" + MODAL_ID + "{position:fixed;inset:0;z-index:2147483647;display:none;align-items:center;justify-content:center;overflow:auto;padding:max(18px,env(safe-area-inset-top,0px)) max(18px,env(safe-area-inset-right,0px)) max(18px,env(safe-area-inset-bottom,0px)) max(18px,env(safe-area-inset-left,0px));background:rgba(3,7,18,.68);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}",
        "#" + MODAL_ID + ".show{display:flex}",
        "#" + MODAL_ID + " .efp-qw-card{width:min(430px,100%);max-height:calc(100vh - 36px);max-height:calc(100dvh - 36px);border-radius:20px;background:#fff;color:#172033;border:1px solid rgba(15,23,42,.10);box-shadow:0 28px 80px rgba(2,6,23,.34);overflow:auto;overscroll-behavior:contain;transform:translateY(8px) scale(.985);opacity:0;transition:transform .18s ease,opacity .18s ease}",
        "#" + MODAL_ID + ".show .efp-qw-card{transform:none;opacity:1}",
        "#" + MODAL_ID + " .efp-qw-body{padding:24px 24px 18px}",
        "#" + MODAL_ID + " .efp-qw-icon{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;margin-bottom:16px;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;font:700 22px/1 Arial,sans-serif}",
        "#" + MODAL_ID + " h2{margin:0 0 9px;font:700 20px/1.25 Arial,system-ui,sans-serif;letter-spacing:-.2px;color:#111827}",
        "#" + MODAL_ID + " p{margin:0;font:400 14px/1.6 Arial,system-ui,sans-serif;color:#64748b}",
        "#" + MODAL_ID + " .efp-qw-note{margin-top:13px;padding:11px 12px;border-radius:11px;background:#f8fafc;border:1px solid #e2e8f0;color:#475569;font-size:12.5px;line-height:1.45}",
        "#" + MODAL_ID + " .efp-qw-actions{display:flex;gap:10px;padding:16px 24px 22px;border-top:1px solid #eef2f7}",
        "#" + MODAL_ID + " button{appearance:none;-webkit-appearance:none;min-height:44px;border-radius:11px;padding:10px 16px;font:700 14px/1 Arial,system-ui,sans-serif;cursor:pointer;transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease}",
        "#" + MODAL_ID + " button:active{transform:scale(.985)}",
        "#" + MODAL_ID + " .efp-qw-stay{flex:1;background:#111827;color:#fff;border:1px solid #111827;box-shadow:0 6px 16px rgba(15,23,42,.18)}",
        "#" + MODAL_ID + " .efp-qw-leave{background:#fff;color:#b42318;border:1px solid #fecaca}",
        "#" + MODAL_ID + " button:focus-visible{outline:3px solid rgba(59,130,246,.28);outline-offset:2px}",
        "html.efp-black #" + MODAL_ID + " .efp-qw-card,html.efp-black-invert #" + MODAL_ID + " .efp-qw-card{background:#111827;color:#f8fafc;border-color:#334155}",
        "html.efp-black #" + MODAL_ID + " h2,html.efp-black-invert #" + MODAL_ID + " h2{color:#f8fafc}",
        "html.efp-black #" + MODAL_ID + " p,html.efp-black-invert #" + MODAL_ID + " p{color:#cbd5e1}",
        "html.efp-black #" + MODAL_ID + " .efp-qw-note,html.efp-black-invert #" + MODAL_ID + " .efp-qw-note{background:#0f172a;border-color:#334155;color:#cbd5e1}",
        "html.efp-black #" + MODAL_ID + " .efp-qw-actions,html.efp-black-invert #" + MODAL_ID + " .efp-qw-actions{border-top-color:#263244}",
        "html.efp-black #" + MODAL_ID + " .efp-qw-stay,html.efp-black-invert #" + MODAL_ID + " .efp-qw-stay{background:#f8fafc;color:#0f172a;border-color:#f8fafc}",
        "html.efp-black #" + MODAL_ID + " .efp-qw-leave,html.efp-black-invert #" + MODAL_ID + " .efp-qw-leave{background:#111827;color:#fca5a5;border-color:#7f1d1d}",
        "html.efp-quiz-modal-open #efp-app-back-button,html.efp-quiz-modal-open #efp-home-button{visibility:hidden!important;pointer-events:none!important}",
        "@media(max-width:520px){#" + MODAL_ID + "{align-items:center;padding:max(14px,env(safe-area-inset-top,0px)) max(14px,env(safe-area-inset-right,0px)) max(14px,env(safe-area-inset-bottom,0px)) max(14px,env(safe-area-inset-left,0px))}#" + MODAL_ID + " .efp-qw-card{width:min(430px,100%);border-radius:18px}#" + MODAL_ID + " .efp-qw-body{padding:20px 20px 15px}#" + MODAL_ID + " .efp-qw-actions{padding:13px 20px 18px;flex-direction:column}#" + MODAL_ID + " .efp-qw-leave{order:2}#" + MODAL_ID + " .efp-qw-stay{order:1;width:100%}}",
        "@media(max-height:600px){#" + MODAL_ID + "{align-items:center}#" + MODAL_ID + " .efp-qw-body{padding:16px 18px 12px}#" + MODAL_ID + " .efp-qw-icon{width:38px;height:38px;margin-bottom:10px;border-radius:12px;font-size:19px}#" + MODAL_ID + " h2{font-size:18px;margin-bottom:6px}#" + MODAL_ID + " p{font-size:13px;line-height:1.45}#" + MODAL_ID + " .efp-qw-note{margin-top:8px;padding:9px 10px}#" + MODAL_ID + " .efp-qw-actions{padding:10px 18px 14px}}",
        "@media(prefers-reduced-motion:reduce){#" + MODAL_ID + " .efp-qw-card{transition:none}}"
      ].join("");
      document.head.appendChild(style);

      var modal = document.createElement("div");
      modal.id = MODAL_ID;
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-labelledby", MODAL_ID + "-title");
      modal.setAttribute("aria-describedby", MODAL_ID + "-desc");
      modal.innerHTML =
        '<div class="efp-qw-card">' +
          '<div class="efp-qw-body">' +
            '<div class="efp-qw-icon" aria-hidden="true">!</div>' +
            '<h2 id="' + MODAL_ID + '-title">Do you really want to quit?</h2>' +
            '<p id="' + MODAL_ID + '-desc">Your quiz progress is saved automatically, so you can continue from the same place later.</p>' +
            '<div class="efp-qw-note">Choose Stay on Quiz if you want to keep practising now.</div>' +
          '</div>' +
          '<div class="efp-qw-actions">' +
            '<button type="button" class="efp-qw-leave">Quit Quiz</button>' +
            '<button type="button" class="efp-qw-stay">Stay on Quiz</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);
      return modal;
    }

    function showExitModal(onLeave) {
      var modal = ensureExitModal();
      var stay = modal.querySelector(".efp-qw-stay");
      var leave = modal.querySelector(".efp-qw-leave");
      var previousFocus = document.activeElement;
      var settled = false;

      function close() {
        modal.classList.remove("show");
        document.documentElement.classList.remove("efp-quiz-modal-open");
        document.removeEventListener("keydown", onKey, true);
        window.setTimeout(function () {
          if (previousFocus && previousFocus.focus) {
            try { previousFocus.focus({ preventScroll: true }); } catch (_) { try { previousFocus.focus(); } catch (_) {} }
          }
        }, 0);
      }

      function keepQuiz() {
        if (settled) return;
        settled = true;
        close();
      }

      function leaveQuiz() {
        if (settled) return;
        settled = true;
        close();
        disarm();
        onLeave();
      }

      function onKey(event) {
        if (event.key === "Escape") {
          event.preventDefault();
          keepQuiz();
        }
      }

      stay.onclick = keepQuiz;
      leave.onclick = leaveQuiz;
      modal.onclick = function (event) {
        if (event.target === modal) keepQuiz();
      };
      document.addEventListener("keydown", onKey, true);
      document.documentElement.classList.add("efp-quiz-modal-open");
      modal.classList.add("show");
      window.setTimeout(function () { try { stay.focus(); } catch (_) {} }, 0);
    }

    // Original Practice's document handlers otherwise send every Back straight
    // to the site Home. Handle the click before them while preserving its SPA
    // hierarchy. Mixed Practice has its own Quiz -> Set Builder step, while the
    // Complete pages use Quiz -> Chapters -> All Subjects -> Practice index.
    window.addEventListener("click", function (event) {
      var path = normalizedPath(location.pathname).toLowerCase();
      if (path !== "/original practice" && path.indexOf("/original practice/") !== 0) return;
      var back = event.target && event.target.closest
        ? event.target.closest("#efp-app-back-button") : null;
      if (!back) return;

      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();

      function leavePractice() {
        approveOneNavigation();
        if (path === "/original practice" || path === "/original practice/index.html") {
          markIntentionalHome();
          try { sessionStorage.removeItem("efp_logical_back_expected_path"); } catch (_) {}
          location.assign("/");
          return;
        }

        // Mixed Practice owns an in-page Quiz -> Set Builder hierarchy.
        // Call the page-owned exit function directly instead of replaying the
        // global Back button. Replaying the button can race with home/back
        // handlers in installed Android WebViews and occasionally jump Home.
        if (path === "/original practice/mixed_practice.html") {
          var mixedQuiz = document.getElementById("quizView");
          var mixedFinish = document.getElementById("finishView");
          var mixedVisible = !!((mixedQuiz && !mixedQuiz.hidden) || (mixedFinish && !mixedFinish.hidden));
          if (mixedVisible) {
            disarm();
            if (typeof window.EFP_MIXED_PRACTICE_EXIT_TO_SETUP === "function") {
              window.EFP_MIXED_PRACTICE_EXIT_TO_SETUP();
            } else {
              var mixedSetupButton = document.getElementById("setupBtn");
              if (mixedSetupButton) mixedSetupButton.click();
            }
            try { window.scrollTo(0, 0); } catch (_) {}
            return;
          }
        }

        try {
          if (typeof state !== "undefined" && state && state.screen) {
            if (state.screen === "quiz") {
              if (state.subject && typeof goToChapters === "function") {
                goToChapters(state.subject);
              } else if (typeof goChapters === "function") {
                goChapters();
              } else {
                throw new Error("No Original Practice quiz parent");
              }
            } else if (state.screen === "chapters" && typeof goHome === "function") {
              goHome();
            } else {
              throw new Error("Practice index is the next parent");
            }
            disarm();
            try { window.scrollTo(0, 0); } catch (_) {}
            return;
          }
        } catch (_) {}

        // Subject Home, English chapters and standalone practice pages all
        // return to the Original Practice index, without clearing app resume.
        location.assign("/Original%20Practice/index.html");
      }

      if (shouldWarn()) showExitModal(leavePractice);
      else leavePractice();
    }, true);

    document.addEventListener("click", function (event) {
      var target = event.target;
      if (!target) return;

      var navTarget = shouldWarn() ? navigationTarget(target) : null;
      if (navTarget) {
        event.preventDefault();
        event.stopPropagation();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();

        var currentPath = normalizedPath(location.pathname).toLowerCase();
        var mixedBack = currentPath === "/original practice/mixed_practice.html" &&
          navTarget.closest && navTarget.closest("#efp-app-back-button");

        showExitModal(function () {
          approveOneNavigation();

          if (mixedBack) {
            disarm();
            if (typeof window.EFP_MIXED_PRACTICE_EXIT_TO_SETUP === "function") {
              window.EFP_MIXED_PRACTICE_EXIT_TO_SETUP();
            } else {
              var mixedSetupButton = document.getElementById("setupBtn");
              if (mixedSetupButton) mixedSetupButton.click();
            }
            try { window.scrollTo(0, 0); } catch (_) {}
            return;
          }

          if (currentPath === "/original practice/mixed_practice.html" &&
              typeof window.EFP_MIXED_PRACTICE_PREPARE_NAVIGATION === "function") {
            window.EFP_MIXED_PRACTICE_PREPARE_NAVIGATION();
          }

          window.setTimeout(function () {
            try {
              if (navTarget && navTarget.isConnected && typeof navTarget.click === "function") {
                navTarget.click();
                return;
              }
              if (navTarget && navTarget.href) window.location.assign(navTarget.href);
            } catch (_) {}
          }, 0);
        });
        return;
      }

      if (isAnswerInteraction(target)) arm();
    }, true);

    document.addEventListener("change", function (event) {
      if (isAnswerInteraction(event.target)) arm();
    }, true);

    window.addEventListener("beforeunload", function (event) {
      if (!shouldWarn()) return;
      event.preventDefault();
      event.returnValue = "Do you really want to quit?";
      return "Do you really want to quit?";
    });

    window.addEventListener("pageshow", function () {
      allowNavigation = false;
      if (!dirty) restorePersistedWarning();
    });

    // Re-arm only for an installed-app auto-resume. Normal browser visits
    // never receive PENDING_KEY, so browser navigation cannot resurrect a
    // warning from an earlier app session.
    restorePersistedWarning();
    if (!dirty && document.readyState !== "complete") {
      window.addEventListener("load", function () {
        restorePersistedWarning();
        if (!dirty && hasAnsweredQuizSurface()) arm();
      }, { once: true });
    } else if (!dirty) {
      setTimeout(function () { if (!dirty && hasAnsweredQuizSurface()) arm(); }, 0);
    }

    window.EFP_QUIZ_PROGRESS_WARNING = {
      arm: arm,
      disarm: disarm,
      isArmed: function () { return dirty; },
      confirmLeave: function (onLeave) {
        if (typeof onLeave !== "function") return false;
        if (shouldWarn()) {
          showExitModal(onLeave);
          return true;
        }
        onLeave();
        return false;
      }
    };
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

  if (maybeResumeSameDeviceLaunch()) return;

  installHistoryTracking();
  installQuizProgressWarning();
  installLifecycleTracking();
  installStaticQuizTracking();
  installDynamicBookQuizTracking();
  restorePendingScroll();
  writeSession();

  window.EFP_APP_SESSION = {
    save: writeSession,
    markHome: markIntentionalHome
  };
})();
