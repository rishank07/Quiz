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
    if (!/Android/i.test(ua) || (!packageReferrer && !launchMarker())) return;
    try { sessionStorage.setItem(ANDROID_APP_CONTEXT_KEY, "1"); } catch (_) {}
  }

  rememberAndroidAppContext();

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

  // Warn only after the learner has actually interacted with a quiz.
  // Browsers ignore custom beforeunload text, so refresh / device Back uses
  // the native leave-page dialog while in-page Back/Home controls get our
  // explicit ExamFusion message.
  function installQuizProgressWarning() {
    var dirty = false;
    var allowNavigation = false;
    var MODAL_ID = "efp-quiz-exit-modal";
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
      if (hasVisibleQuizSurface()) dirty = true;
    }

    function disarm() {
      dirty = false;
      allowNavigation = false;
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
            '<h2 id="' + MODAL_ID + '-title">Leave this quiz?</h2>' +
            '<p id="' + MODAL_ID + '-desc">Your current quiz progress may be lost if you refresh, go back, or leave this page before finishing.</p>' +
            '<div class="efp-qw-note">Stay on this page to continue the quiz from your current position.</div>' +
          '</div>' +
          '<div class="efp-qw-actions">' +
            '<button type="button" class="efp-qw-leave">Leave Quiz</button>' +
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
    // hierarchy: Quiz -> Chapters -> All Subjects -> Practice index -> site Home.
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
        showExitModal(function () {
          approveOneNavigation();
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
      event.returnValue = "";
      return "";
    });

    window.addEventListener("pageshow", function () {
      allowNavigation = false;
    });

    window.EFP_QUIZ_PROGRESS_WARNING = {
      arm: arm,
      disarm: disarm,
      isArmed: function () { return dirty; }
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

  if (maybeResumeFreshLaunch()) return;

  installHistoryTracking();
  installQuizProgressWarning();
  installLifecycleTracking();
  installStaticQuizTracking();
  restorePendingScroll();
  writeSession();

  window.EFP_APP_SESSION = {
    save: writeSession,
    markHome: markIntentionalHome
  };
})();
