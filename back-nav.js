/* Search results return to the search that opened them, across every hub.
   Keep this in the shared navigation asset so cached/older content pages use
   the same rule without rewriting the question banks. */
(function () {
  "use strict";
  if (!/^\/(?:index\.html)?$/i.test(location.pathname) && !document.getElementById("efp-section-search-ui")) {
    var searchUi = document.createElement("script");
    searchUi.id = "efp-section-search-ui";
    searchUi.src = "/section-search-ui.js?v=20261001searchreturn2";
    searchUi.async = false;
    document.head.appendChild(searchUi);
  }
  var PARAM = "efSearchReturn", RESTORE = "efSearchRestore";
  var PREFIX = "efp_search_return_v1:";
  var INPUTS = 'input[type="search"], input[id*="earch"]';
  var active = null, restoring = false, restoredToken = "";
  var RESULTS = '.efp-op-search-results, #efScopedResults, #results, #searchResults, #efContentResults, #efBlackbookResults, #fullTextResults, #efp-ca-rapid-exact-results';
  // Preserve presentation only: replacing menus would discard their listeners.
  var PRESENTATION = '[id], .menu, .card, .nested, .sub-nested, .submenu a';

  function presentation(node) {
    return { hidden: node.hidden, className: node.getAttribute("class"), style: node.getAttribute("style") };
  }
  function applyPresentation(node, saved) {
    node.hidden = saved.hidden;
    ["class", "style"].forEach(function (name) {
      var value = name === "class" ? saved.className : saved.style;
      if (value == null) node.removeAttribute(name); else node.setAttribute(name, value);
    });
  }
  function nodePath(node) {
    var steps = [];
    while (node && !node.id && node !== document.body) {
      steps.unshift(Array.prototype.indexOf.call(node.parentElement.children, node));
      node = node.parentElement;
    }
    return { root: node && node.id, steps: steps };
  }
  function nodeAt(path) {
    var node = path.root ? document.getElementById(path.root) : document.body;
    path.steps.forEach(function (index) { node = node && node.children[index]; });
    return node;
  }

  function read(token) {
    try {
      var saved = JSON.parse(sessionStorage.getItem(PREFIX + token) || "null");
      if (!saved || saved.token !== token || !Array.isArray(saved.inputs) || !Array.isArray(saved.filters)) return null;
      var source = new URL(saved.source, location.origin);
      if (source.origin !== location.origin) return null;
      return saved;
    } catch (_) { return null; }
  }
  function tokenFromPage() {
    try {
      return new URL(location.href).searchParams.get(PARAM) ||
        (history.state && history.state.efpSearchReturnToken) || "";
    } catch (_) { return ""; }
  }
  active = read(tokenFromPage());

  function fields() {
    return Array.prototype.slice.call(document.querySelectorAll(INPUTS));
  }
  function snapshot() {
    var inputs = fields();
    var queryInput = inputs.find(function (input) {
      return input.value.trim() && !input.closest('[hidden]');
    });
    if (!queryInput) return null;
    var token = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
    var source = new URL(location.href);
    source.searchParams.delete(RESTORE);
    var saved = {
      token: token, source: source.href, state: history.state,
      inputs: inputs.map(function (input, i) {
        return { id: input.id, index: i, value: input.value };
      }),
      filters: Array.prototype.slice.call(document.querySelectorAll('select[id]')).map(function (select) {
        return { id: select.id, value: select.value };
      }),
      scroll: window.scrollY || 0,
      searchTop: Math.max(0, (window.scrollY || 0) + queryInput.getBoundingClientRect().top - 110),
      results: Array.prototype.map.call(document.querySelectorAll(RESULTS), function (node, index) {
        return { index: index, html: node.innerHTML, view: presentation(node), scroll: node.scrollTop };
      }),
      batches: window.EFP_SECTION_SEARCH ? window.EFP_SECTION_SEARCH.snapshot() : [],
      presentation: Array.prototype.map.call(document.querySelectorAll(PRESENTATION), function (node, index) {
        return { path: nodePath(node), tag: node.tagName, view: presentation(node) };
      }).filter(function (field) { return !/^(SCRIPT|STYLE|HTML|BODY)$/.test(field.tag); })
    };
    try {
      // Only the newest 24 trips are needed; do not fill session storage with
      // abandoned search visits. Active trips survive refresh and app resume.
      var keys = Object.keys(sessionStorage).filter(function (key) { return key.indexOf(PREFIX) === 0; }).sort();
      while (keys.length >= 24) sessionStorage.removeItem(keys.shift());
      var serialized = JSON.stringify(saved);
      for (;;) {
        try { sessionStorage.setItem(PREFIX + token, serialized); break; }
        catch (error) {
          if (!keys.length) throw error;
          sessionStorage.removeItem(keys.shift());
        }
      }
      history.replaceState(Object.assign({}, history.state, { efpSearchSnapshot: token }), "", location.href);
    } catch (_) { return null; }
    return saved;
  }
  function markCurrent(saved) {
    active = saved;
    try {
      var url = new URL(location.href);
      url.searchParams.set(PARAM, saved.token);
      history.replaceState(Object.assign({}, history.state, { efpSearchReturnToken: saved.token }), "", url.href);
    } catch (_) {}
    armGuard();
  }
  function leave() {
    if (!active) return false;
    var url = new URL(active.source);
    url.searchParams.set(RESTORE, active.token);
    // Installed-app Home retains its launch marker (for example
    // ?source=windows-pwa). Record this deliberate return before pagehide
    // can save the leaf again and make Home auto-resume that same leaf.
    if (/^\/(?:index\.html)?$/i.test(url.pathname) && window.EFP_APP_SESSION) {
      window.EFP_APP_SESSION.markHome();
    }
    location.replace(url.href);
    return true;
  }
  function isQuiz() {
    var warning = window.EFP_QUIZ_PROGRESS_WARNING;
    return !!(warning && warning.isQuizVisible && warning.isQuizVisible());
  }
  function armGuard() {
    if (!active || isQuiz()) return;
    if (history.state && history.state.efpSearchReturnGuard === "top") return;
    var base = Object.assign({}, history.state, {
      efpSearchReturnToken: active.token, efpSearchReturnGuard: "base"
    });
    var top = Object.assign({}, base, { efpSearchReturnGuard: "top" });
    try {
      history.replaceState(base, "", location.href);
      history.pushState(top, "", location.href);
    } catch (_) {}
  }
  function restore() {
    if (restoring) return;
    var token;
    try {
      token = new URL(location.href).searchParams.get(RESTORE) ||
        (history.state && history.state.efpSearchSnapshot);
    } catch (_) {}
    var saved = read(token);
    if (!saved || restoredToken === token) return;
    restoring = true;
    // Crux stores its source/subject/chapter pane in managed History state.
    // Reinstate that pane before rebuilding its search results.
    if (saved.state && saved.state.efpCruxNav) {
      history.replaceState(saved.state, "", location.href);
      window.dispatchEvent(new PopStateEvent("popstate", { state: saved.state }));
    }
    saved.filters.forEach(function (field) {
      var select = document.getElementById(field.id);
      if (select) select.value = field.value;
    });
    var inputs = fields();
    saved.inputs.forEach(function (field) {
      var input = field.id ? document.getElementById(field.id) : inputs[field.index];
      if (input) input.value = field.value;
    });
    // Let renderers restore local filter state without starting full-text work.
    window.dispatchEvent(new CustomEvent("efp-search-restored", { detail: saved }));
    (saved.presentation || []).forEach(function (field) {
      var node = nodeAt(field.path);
      if (node && node.tagName === field.tag) applyPresentation(node, field.view);
    });
    var results = document.querySelectorAll(RESULTS);
    (saved.results || []).forEach(function (field) {
      var node = results[field.index];
      if (!node) return;
      node.innerHTML = field.html;
      node.querySelectorAll('.efp-op-search-loading').forEach(function (loading) { loading.remove(); });
      applyPresentation(node, field.view);
      node.scrollTop = field.scroll || 0;
    });
    if (window.EFP_SECTION_SEARCH) window.EFP_SECTION_SEARCH.restore(saved.batches || []);
    window.dispatchEvent(new CustomEvent("efp-search-results-restored", { detail: saved }));
    try {
      var url = new URL(location.href);
      url.searchParams.delete(RESTORE);
      history.replaceState(Object.assign({}, history.state, { efpSearchSnapshot: saved.token }), "", url.href);
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
      // The search bar must remain on screen even if the selected hit was far
      // down the list. Do this after layout; never focus an input on return.
      var top = Math.min(saved.scroll || 0, saved.searchTop || 0);
      window.scrollTo({ top: top, behavior: "instant" });
      window.requestAnimationFrame(function () { window.scrollTo({ top: top, behavior: "instant" }); });
    } catch (_) {}
    restoredToken = token;
    restoring = false;
  }

  window.EFP_SEARCH_RETURN = {
    isActive: function () { return !!active; },
    isRestoring: function () { return restoring; },
    leave: leave,
    // Used by Original Practice's in-document chapter/question buttons.
    openInPage: function (action) {
      var saved = snapshot();
      action();
      if (saved) markCurrent(saved);
    }
  };

  // Window capture precedes legacy page/Home Back handlers on every hub.
  window.addEventListener("click", function (event) {
    if (!active || !event.target || !event.target.closest ||
        !event.target.closest('#efp-app-back-button, #backBtn, #backMaterial, #backExam, #backSource, #backSubjects, #backParts')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    var warning = window.EFP_QUIZ_PROGRESS_WARNING;
    if (warning && warning.isArmed && warning.isArmed()) {
      warning.confirmLeave(function () { warning.releaseBackGuard(leave); });
    } else if (warning && warning.releaseBackGuard) warning.releaseBackGuard(leave);
    else leave();
  }, true);

  document.addEventListener("click", function (event) {
    if (event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!link || link.hasAttribute("download") || link.target === "_blank") return;
    if (link.closest('.topnav, .efp-op-topbar, .viewer-toolbar, .home-btn, .back-btn') ||
        /^(efp-home-button|efp-app-back-button|.*[Bb]ack.*|.*[Cc]lear.*)$/.test(link.id)) return;
    var url;
    try { url = new URL(link.href); } catch (_) { return; }
    if (url.origin !== location.origin || !/\.(html|pdf)$|\/$/i.test(url.pathname)) return;
    // A live search can filter ordinary chapter/menu cards as well as adding
    // dedicated result rows. Both are search results while the query is open.
    // Once inside a search trip, every deeper page belongs to the original
    // search. A PDF's own find bar must not become the trip's new origin.
    var saved = /\/viewer\.html$/i.test(location.pathname) ? active : (snapshot() || active);
    if (!saved) return;
    url.searchParams.set(PARAM, saved.token);
    link.href = url.href;
    link.setAttribute("data-efp-search-trip", saved.token);
  }, true);

  document.addEventListener("input", function (event) {
    if (restoring || (event.detail && event.detail.efpRestoredSearch)) return;
    if (!event.target.matches || !event.target.matches(INPUTS)) return;
    restoredToken = "";
    // An edited query is a new search; stale link tokens must not turn a later
    // manual click into a search entry after the user clears the bar.
    document.querySelectorAll('a[data-efp-search-trip]').forEach(function (link) {
      var url = new URL(link.href); url.searchParams.delete(PARAM); link.href = url.href;
      link.removeAttribute("data-efp-search-trip");
    });
    if (history.state && history.state.efpSearchSnapshot) {
      var state = Object.assign({}, history.state); delete state.efpSearchSnapshot;
      history.replaceState(state, "", location.href);
    }
  }, true);

  window.addEventListener("popstate", function (event) {
    if (active && !restoring && !isQuiz()) {
      event.stopImmediatePropagation();
      leave();
      return;
    }
    window.setTimeout(restore, 0);
  }, true);
  window.addEventListener("pageshow", function () {
    window.setTimeout(function () { restore(); armGuard(); }, 0);
  });
  window.addEventListener("efp-crux-history-ready", function () { restore(); armGuard(); });
  if (document.readyState === "complete") window.setTimeout(function () { restore(); armGuard(); }, 0);
  else window.addEventListener("load", function () { restore(); armGuard(); }, { once: true });
})();

/* ExamFusion Prep — logical Back fallback for direct/external links. */
(function () {
  "use strict";

  var BACK_BUTTON_ID = "efp-app-back-button";
  var CHAIN_KEY = "efp_logical_back_expected_path";
  var CRUX_RESTORE_KEY = "efp_crux_back_restore_state";
  var CRUX_HOME_SEARCH_GUARD = "efpCruxHomeSearchGuard";
  var HOME_SEARCH_CHAIN_KEY = "efp_home_search_back_chain";
  var HOME_SEARCH_GUARD = "efpHomeSearchGuard";
  var APPROVED_LOGICAL_BACK_ATTRIBUTE = "data-efp-approved-logical-back";
  var APP_RESUME_PENDING_KEY = "efp_app_resume_pending_v1";
  var AUTO_RESUMED_BOUNDARY = false;
  var CRUX_RETURN_DOC_ID = "";
  try {
    CRUX_RETURN_DOC_ID = new URLSearchParams(window.location.search).get("returnPdf") || "";
  } catch (_) {}

  function normalizePath(pathname) {
    var path = pathname || "/";
    try { path = decodeURIComponent(path); } catch (_) {}
    path = path.replace(/\/{2,}/g, "/");
    if (path.length > 1) path = path.replace(/\/$/, "");
    return path || "/";
  }

  function detectAutoResumedBoundary() {
    try {
      var pending = JSON.parse(sessionStorage.getItem(APP_RESUME_PENDING_KEY) || "null");
      if (!pending || !pending.url) return false;
      var target = new URL(String(pending.url), window.location.origin);
      if (target.origin !== window.location.origin) return false;
      return normalizePath(target.pathname) === normalizePath(window.location.pathname) &&
        target.search === window.location.search;
    } catch (_) {
      return false;
    }
  }

  AUTO_RESUMED_BOUNDARY = detectAutoResumedBoundary();

  function isCruxTricksRoot() {
    var path = normalizePath(window.location.pathname).toLowerCase();
    return path === "/crux-tricks" || path === "/crux-tricks/index.html";
  }

  function isCruxViewer() {
    return normalizePath(window.location.pathname).toLowerCase() === "/crux-tricks/viewer.html";
  }

  function isCruxViewerFromCruxPage() {
    if (!isCruxViewer()) return false;
    var source = new URLSearchParams(window.location.search).get("from");
    return source === "crux-index" || source === "crux-page";
  }

  function isCruxViewerFromBookmarks() {
    return isCruxViewer() &&
      new URLSearchParams(window.location.search).get("from") === "all-bookmarks";
  }

  function bookmarkReturnUrl() {
    var url = new URL("/all-bookmarks.html", window.location.origin);
    var trail = new URLSearchParams(window.location.search).get("bookmarkTrail");
    if (trail) url.searchParams.set("folder", trail);
    return url.href;
  }

  function isOriginalPracticePage() {
    return normalizePath(window.location.pathname).toLowerCase().indexOf("/original practice/") === 0;
  }

  function isOriginalPracticeIndex() {
    var path = normalizePath(window.location.pathname).toLowerCase();
    return path === "/original practice" || path === "/original practice/index.html";
  }

  function isMixedPracticePage() {
    return normalizePath(window.location.pathname).toLowerCase() === "/original practice/mixed_practice.html";
  }

  /* Some older Complete Practice subject headers still describe the page as
     "offline practice" while newer subjects do not. Keep the actual offline/PWA
     capability intact and only remove that obsolete visible copy. Because the
     Complete Practice pages re-render in place, watch #app as well as the first
     paint so every subject stays consistent. */
  function removeOriginalPracticeOfflineLabel() {
    if (!isOriginalPracticePage()) return;

    var root = document.getElementById("app") || document.body;
    if (!root || typeof document.createTreeWalker !== "function") return;

    var showText = window.NodeFilter ? window.NodeFilter.SHOW_TEXT : 4;
    var walker = document.createTreeWalker(root, showText);
    var nodes = [];
    var node;

    while ((node = walker.nextNode())) {
      var value = String(node.nodeValue || "");
      if (!/offline\s+practice/i.test(value)) continue;

      var parentText = node.parentElement
        ? String(node.parentElement.textContent || "")
        : value;
      if (!/exam\s+preparation/i.test(parentText)) continue;

      nodes.push(node);
    }

    for (var i = 0; i < nodes.length; i++) {
      nodes[i].nodeValue = String(nodes[i].nodeValue || "")
        .replace(/\s*(?:—|–|-|·)\s*offline\s+practice\b/ig, "")
        .replace(/\boffline\s+practice\b/ig, "")
        .replace(/[ \t]{2,}/g, " ")
        .replace(/\s+$/g, "");
    }
  }

  function installOriginalPracticeCopyCleanup() {
    if (!isOriginalPracticePage()) return;

    var frame = 0;
    var requestFrame = window.requestAnimationFrame || function (callback) {
      return window.setTimeout(callback, 0);
    };

    function sync() {
      if (frame) return;
      frame = requestFrame(function () {
        frame = 0;
        removeOriginalPracticeOfflineLabel();
      });
    }

    function start() {
      removeOriginalPracticeOfflineLabel();
      var root = document.getElementById("app") || document.body;
      if (!root || typeof MutationObserver === "undefined") return;
      var observer = new MutationObserver(sync);
      observer.observe(root, { childList: true, subtree: true, characterData: true });
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
      start();
    }
  }

  function installMixedPracticeFeedbackColors() {
    if (!isMixedPracticePage()) return;
    if (document.getElementById("efp-mixed-feedback-colors")) return;

    var style = document.createElement("style");
    style.id = "efp-mixed-feedback-colors";
    style.textContent = [
      ".option.correct .option-body,.option.correct input:checked+.option-body{border-color:rgba(74,222,128,.62)!important;background:rgba(74,222,128,.09)!important;box-shadow:none!important}",
      ".option.wrong .option-body,.option.wrong input:checked+.option-body{border-color:rgba(251,113,133,.62)!important;background:rgba(251,113,133,.09)!important;box-shadow:none!important}"
    ].join("");
    document.head.appendChild(style);
  }

  /* Mixed Practice was originally designed as a dark-only page. Keep that
     design for site Dark Mode, but supply a real light palette when the Home
     preference is off. The quiz data/logic remains untouched. */
  function installMixedPracticeSiteTheme() {
    if (!isMixedPracticePage()) return;

    var STYLE_ID = "efp-mixed-site-theme";
    if (!document.getElementById(STYLE_ID)) {
      var style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = [
        "html.efp-mixed-light{--bg:#f5f7fb;--panel:#ffffff;--panel2:#f8fafc;--panel3:#f1f5f9;--gold:#9a6b17;--gold2:#76520f;--text:#172033;--muted:#64748b;--line:#d7dee9;--blue:#2563eb;--good:#15803d;--bad:#dc2626;--warn:#b7791f;background:#f5f7fb!important;color-scheme:light}",
        "html.efp-mixed-light body{background:radial-gradient(circle at 15% 5%,#eaf2ff 0,transparent 34%),linear-gradient(160deg,#f8fafc,#f3f6fb 50%,#eef2f7)!important;color:#172033!important}",
        "html.efp-mixed-light .topnav a,html.efp-mixed-light .ghost-btn{background:#fff!important;color:#24324a!important;border-color:#d7dee9!important;box-shadow:0 3px 10px rgba(15,23,42,.05)}",
        "html.efp-mixed-light .kicker{color:#8a641d!important;border-color:#d8bd7a!important;background:#fffaf0!important}",
        "html.efp-mixed-light .hero h1,html.efp-mixed-light .finish-panel h2{color:#1f2a3d!important}",
        "html.efp-mixed-light .hero p,html.efp-mixed-light .panel-sub,html.efp-mixed-light .specific-note,html.efp-mixed-light .resume-copy span,html.efp-mixed-light .fineprint{color:#64748b!important}",
        "html.efp-mixed-light .panel,html.efp-mixed-light .question-card{background:#fff!important;border-color:#d7dee9!important;box-shadow:0 14px 34px rgba(15,23,42,.08)!important}",
        "html.efp-mixed-light .panel h2,html.efp-mixed-light .pool-name,html.efp-mixed-light .resume-copy strong{color:#172033!important}",
        "html.efp-mixed-light .section-title h3,html.efp-mixed-light .pool-hi,html.efp-mixed-light .quiz-title{color:#8a641d!important}",
        "html.efp-mixed-light .pool-body{background:#fff!important;border-color:#d7dee9!important;color:#172033!important}",
        "html.efp-mixed-light .pool input:checked+.pool-body{border-color:#c59a3a!important;background:linear-gradient(145deg,#fff8e7,#eef5ff)!important;box-shadow:0 0 0 2px rgba(197,154,58,.10) inset!important}",
        "html.efp-mixed-light .pool-count{color:#64748b!important}",
        "html.efp-mixed-light .mini-actions button,html.efp-mixed-light .preset,html.efp-mixed-light .secondary-btn,html.efp-mixed-light .resume-btn,html.efp-mixed-light .bookmark-btn,html.efp-mixed-light .quiz-actions button,html.efp-mixed-light .nav-btn{background:#fff!important;color:#334155!important;border-color:#d7dee9!important}",
        "html.efp-mixed-light .preset.active{background:#e5c66f!important;border-color:#c59a3a!important;color:#2d250f!important}",
        "html.efp-mixed-light .config-box{background:#f8fafc!important;border-color:#d7dee9!important}",
        "html.efp-mixed-light .config-box label{color:#334155!important}",
        "html.efp-mixed-light .count-input{background:#fff!important;color:#172033!important;border-color:#cbd5e1!important}",
        "html.efp-mixed-light .dist-pill,html.efp-mixed-light .tag{background:#eff6ff!important;border-color:#bfdbfe!important;color:#1d4ed8!important}",
        "html.efp-mixed-light .tag.subject{background:#fff8e7!important;border-color:#e6c978!important;color:#805d16!important}",
        "html.efp-mixed-light .status{background:#f8fafc!important;color:#475569!important;border-color:#d7dee9!important}",
        "html.efp-mixed-light .status.bad{background:#fff1f2!important;color:#9f1239!important;border-color:#fecdd3!important}",
        "html.efp-mixed-light .status.good{background:#f0fdf4!important;color:#166534!important;border-color:#bbf7d0!important}",
        "html.efp-mixed-light .resume-box{background:#eff6ff!important;border-color:#bfdbfe!important}",
        "html.efp-mixed-light .quiz-head{background:rgba(255,255,255,.95)!important;border-color:#d7dee9!important;box-shadow:0 10px 26px rgba(15,23,42,.08)!important}",
        "html.efp-mixed-light .stat,html.efp-mixed-light .finish-stat{background:#f8fafc!important;border-color:#e2e8f0!important;color:#172033!important}",
        "html.efp-mixed-light .stat span,html.efp-mixed-light .finish-stat span{color:#64748b!important}",
        "html.efp-mixed-light .review-summary{background:linear-gradient(145deg,#ffffff,#f8fbff)!important;border-color:#d7dee9!important;box-shadow:0 14px 34px rgba(15,23,42,.09)!important}",
        "html.efp-mixed-light .review-summary h2{color:#1f2a3d!important}",
        "html.efp-mixed-light .review-summary p{color:#64748b!important}",
        "html.efp-mixed-light .review-stat{background:#ffffff!important;border-color:#d7dee9!important;box-shadow:0 2px 8px rgba(15,23,42,.05)!important}",
        "html.efp-mixed-light .review-stat strong{color:#172033!important}",
        "html.efp-mixed-light .review-stat span{color:#64748b!important}",
        "html.efp-mixed-light .progress-track{background:#e2e8f0!important}",
        "html.efp-mixed-light .question-number{color:#64748b!important}",
        "html.efp-mixed-light .q-en{color:#172033!important}",
        "html.efp-mixed-light .q-hi{color:#795d22!important}",
        "html.efp-mixed-light .option-body{background:#fff!important;border-color:#d7dee9!important;color:#172033!important}",
        "html.efp-mixed-light .option input:checked+.option-body{border-color:#60a5fa!important;background:#eff6ff!important}",
        "html.efp-mixed-light .option-letter{background:#eef2f7!important;color:#334155!important}",
        "html.efp-mixed-light .opt-en{color:#172033!important}",
        "html.efp-mixed-light .opt-hi{color:#795d22!important}",
        "html.efp-mixed-light .check-btn{background:#fff8e7!important;border-color:#d8bd7a!important;color:#684b12!important}",
        "html.efp-mixed-light .answer-box{background:#f8fafc!important;border-color:#d7dee9!important}",
        "html.efp-mixed-light .answer-line.good{color:#166534!important}",
        "html.efp-mixed-light .answer-line.bad{color:#b91c1c!important}",
        "html.efp-mixed-light .correct-answer{color:#334155!important}",
        "html.efp-mixed-light .explanation{color:#475569!important;border-top-color:#e2e8f0!important}",
        "html.efp-mixed-light .explanation .exp-hi{color:#795d22!important}",
        "html.efp-mixed-light .nav-btn.primary{background:#eff6ff!important;border-color:#bfdbfe!important;color:#1d4ed8!important}",
        "html.efp-mixed-light .option.correct .option-body,html.efp-mixed-light .option.correct input:checked+.option-body{border-color:#22c55e!important;background:#ecfdf3!important;color:#14532d!important;box-shadow:0 0 0 1px rgba(34,197,94,.25) inset!important}",
        "html.efp-mixed-light .option.correct .option-letter{background:#22c55e!important;color:#052e16!important}",
        "html.efp-mixed-light .option.correct .opt-en,html.efp-mixed-light .option.correct .opt-hi{color:#14532d!important}",
        "html.efp-mixed-light .option.wrong .option-body,html.efp-mixed-light .option.wrong input:checked+.option-body{border-color:#ef4444!important;background:#fff1f2!important;color:#991b1b!important;box-shadow:0 0 0 1px rgba(239,68,68,.24) inset!important}",
        "html.efp-mixed-light .option.wrong .option-letter{background:#ef4444!important;color:#fff!important}",
        "html.efp-mixed-light .option.wrong .opt-en,html.efp-mixed-light .option.wrong .opt-hi{color:#991b1b!important}",
        "html.efp-mixed-light .q-en td,html.efp-mixed-light .q-en th,html.efp-mixed-light .q-hi td,html.efp-mixed-light .q-hi th,html.efp-mixed-light .explanation td,html.efp-mixed-light .explanation th{border-color:#cbd5e1!important}"
      ].join("");
      document.head.appendChild(style);
    }

    function sync() {
      var dark = false;
      try { dark = localStorage.getItem("efp_black_mode") === "on"; } catch (_) {}
      document.documentElement.classList.toggle("efp-mixed-light", !dark);
    }

    sync();
    document.addEventListener("efp-black-mode-changed", sync);
    window.addEventListener("pageshow", sync);
    window.addEventListener("storage", function (event) {
      if (!event || event.key === "efp_black_mode") sync();
    });
  }

  /* Mixed Practice should behave like a normal exam-practice card: selecting
     an option immediately evaluates it. The existing Check Answer handler is
     reused so scoring, saved state, explanation and green/red classes stay in
     one source of truth. */
  function installMixedPracticeInstantCheck() {
    if (!isMixedPracticePage()) return;
    document.addEventListener("change", function (event) {
      var input = event.target;
      if (!input || !input.matches || !input.matches("#options input[name='mixedOption']")) return;

      setTimeout(function () {
        var button = document.getElementById("checkBtn");
        if (button && !button.disabled) button.click();
      }, 0);
    }, false);
  }

  function consumeBackEvent(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  /* All Bookmarks is an in-page folder hierarchy backed by real History
     entries. Delegate the universal Back button to that hierarchy first so
     Folder -> Parent Folder -> All Bookmarks happens before leaving the page. */
  function useBookmarkHierarchyBack(event) {
    var bridge = window.EFP_BOOKMARK_BROWSER_HISTORY;
    if (!bridge || typeof bridge.canGoBackInsideBookmarks !== "function" ||
        typeof bridge.goBackInsideBookmarks !== "function") return false;
    try {
      if (!bridge.canGoBackInsideBookmarks()) return false;
      consumeBackEvent(event);
      return bridge.goBackInsideBookmarks() !== false;
    } catch (_) {
      return false;
    }
  }

  function clickCruxControl(id) {
    var button = document.getElementById(id);
    if (!button) return false;
    button.click();
    return true;
  }

  function isVisibleByHiddenFlag(id) {
    var element = document.getElementById(id);
    return Boolean(element && !element.hidden);
  }

  /* Crux & Memory Tricks is a multi-step SPA inside one index.html:
     Material -> Source -> Exam -> Subject -> Part -> Chapter. Browser history cannot
     see those in-page layers, so the global Back button must first delegate to
     the currently visible Crux layer before using document/browser history. */
  function useCruxInternalBack(event) {
    if (!isCruxTricksRoot()) return false;

    var searchBox = document.getElementById("searchBox");
    if (searchBox && searchBox.value.trim()) {
      consumeBackEvent(event);
      searchBox.value = "";
      searchBox.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }

    if (isVisibleByHiddenFlag("chapterPane")) {
      consumeBackEvent(event);
      return clickCruxControl("backParts");
    }

    if (isVisibleByHiddenFlag("partPane")) {
      consumeBackEvent(event);
      return clickCruxControl("backSubjects");
    }

    /* Saved Pages / Favourites / Continue results live inside the Study layer.
       Clear that utility view back to Subjects before leaving the source. */
    if (isVisibleByHiddenFlag("resultsWrap")) {
      consumeBackEvent(event);
      return clickCruxControl("backSubjects");
    }

    if (isVisibleByHiddenFlag("study")) {
      consumeBackEvent(event);
      return clickCruxControl("backSource");
    }

    if (isVisibleByHiddenFlag("exam")) {
      consumeBackEvent(event);
      return clickCruxControl("backExam");
    }

    if (isVisibleByHiddenFlag("source")) {
      consumeBackEvent(event);
      return clickCruxControl("backMaterial");
    }

    return false;
  }

  function clearOriginalPracticeSearch(event) {
    var inputs = [];
    var landing = document.getElementById("chapterSearch");
    var inApp = document.querySelector(".efp-op-search input[type='search']");
    if (landing) inputs.push(landing);
    if (inApp && inApp !== landing) inputs.push(inApp);

    for (var i = 0; i < inputs.length; i++) {
      if (!String(inputs[i].value || "").trim()) continue;
      consumeBackEvent(event);
      inputs[i].value = "";
      inputs[i].dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }
    return false;
  }

  /* Original Practice Complete pages are also SPAs. Their real navigation is:
     Complete Practice Home -> Subject Chapters -> Chapter Quiz. Keep the global
     Back button inside that hierarchy first; only the Complete Practice Home is
     allowed to fall through to browser/logical parent navigation. */
  function useOriginalPracticeInternalBack(event) {
    if (!isOriginalPracticePage()) return false;

    if (clearOriginalPracticeSearch(event)) return true;

    // Mixed Practice keeps Quiz -> Set Builder inside one document. This is a
    // fallback for cases where app-session.js has not finished loading yet
    // (common on a cold Android app start). Never let global Back skip the
    // builder and fall through to Original Practice/Home.
    if (isMixedPracticePage()) {
      var mixedQuiz = document.getElementById("quizView");
      var mixedFinish = document.getElementById("finishView");
      var mixedReview = document.getElementById("reviewView");
      var mixedVisible = !!((mixedQuiz && !mixedQuiz.hidden) ||
        (mixedFinish && !mixedFinish.hidden) ||
        (mixedReview && !mixedReview.hidden));
      if (mixedVisible) {
        consumeBackEvent(event);
        if (typeof window.EFP_MIXED_PRACTICE_EXIT_TO_SETUP === "function") {
          window.EFP_MIXED_PRACTICE_EXIT_TO_SETUP();
        } else {
          var mixedSetupButton = document.getElementById("setupBtn");
          if (mixedSetupButton) mixedSetupButton.click();
        }
        try { window.scrollTo(0, 0); } catch (_) {}
        return true;
      }
    }

    try {
      if (typeof state === "undefined" || !state || !state.screen) return false;

      if (state.screen === "quiz") {
        if (state.subject && typeof goToChapters === "function") {
          consumeBackEvent(event);
          goToChapters(state.subject);
          try { window.scrollTo(0, 0); } catch (_) {}
          return true;
        }
        if (typeof goChapters === "function") {
          consumeBackEvent(event);
          goChapters();
          try { window.scrollTo(0, 0); } catch (_) {}
          return true;
        }
        if (typeof goHome === "function") {
          consumeBackEvent(event);
          goHome();
          try { window.scrollTo(0, 0); } catch (_) {}
          return true;
        }
      }

      if (state.screen === "chapters" && typeof goHome === "function") {
        consumeBackEvent(event);
        goHome();
        try { window.scrollTo(0, 0); } catch (_) {}
        return true;
      }
    } catch (_) {}

    return false;
  }

  var ANDROID_APP_CONTEXT_KEY = "efp_android_app_context_v1";

  function isInstalledAndroidAppContext() {
    try {
      if (sessionStorage.getItem(ANDROID_APP_CONTEXT_KEY) === "1") return true;
    } catch (_) {}

    var detected = false;
    try {
      detected = /^android-app:\/\/com\.examfusionprep\.app(?:\/|$)/i.test(document.referrer || "");
    } catch (_) {}
    if (!detected) {
      try {
        detected = !!(window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
      } catch (_) {}
    }
    if (!detected) {
      try {
        detected = navigator.standalone === true || /; wv\)/i.test(navigator.userAgent || "");
      } catch (_) {}
    }

    if (detected) {
      try { sessionStorage.setItem(ANDROID_APP_CONTEXT_KEY, "1"); } catch (_) {}
    }
    return detected;
  }

  function hasSameOriginReferrer() {
    if (!document.referrer) return false;
    try {
      return new URL(document.referrer, window.location.href).origin === window.location.origin;
    } catch (_) {
      return false;
    }
  }

  function hasExpectedCruxViewerReferrer() {
    if (!document.referrer) return false;
    try {
      var referrer = new URL(document.referrer, window.location.href);
      if (referrer.origin !== window.location.origin) return false;
      var path = normalizePath(referrer.pathname).toLowerCase();
      var source = new URLSearchParams(window.location.search).get("from");
      if (source === "all-bookmarks") {
        return path === "/all-bookmarks.html";
      }
      if (source === "crux-index") {
        return path === "/crux-tricks" || path === "/crux-tricks/index.html";
      }
      if (source === "crux-page") {
        return path === "/crux-tricks/my-pages.html";
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  function isHomePageUrl(url) {
    if (!url) return false;
    try {
      var parsed = new URL(url, window.location.href);
      if (parsed.origin !== window.location.origin) return false;
      var path = normalizePath(parsed.pathname).toLowerCase();
      return path === "/" || path === "/index.html";
    } catch (_) {
      return false;
    }
  }

  function hasHomeSearchMarker() {
    try {
      return new URLSearchParams(window.location.search).get("from") === "home-search";
    } catch (_) {
      return false;
    }
  }

  function hasHomeSearchChain() {
    try { return sessionStorage.getItem(HOME_SEARCH_CHAIN_KEY) === "1"; } catch (_) { return false; }
  }

  function rememberHomeSearchChain() {
    try { sessionStorage.setItem(HOME_SEARCH_CHAIN_KEY, "1"); } catch (_) {}
  }

  function clearHomeSearchChain() {
    try { sessionStorage.removeItem(HOME_SEARCH_CHAIN_KEY); } catch (_) {}
  }

  function isCruxViewerFromHomeSearch() {
    if (!isCruxViewer()) return false;
    try {
      if (history.state && history.state[CRUX_HOME_SEARCH_GUARD]) return true;
    } catch (_) {}
    try {
      if (new URLSearchParams(window.location.search).get("from") === "home-search") return true;
    } catch (_) {}
    // Referrer fallback keeps older cached homepage/search code working too.
    return isHomePageUrl(document.referrer);
  }

  function expectedLogicalPath() {
    try {
      return normalizePath(sessionStorage.getItem(CHAIN_KEY) || "");
    } catch (_) {
      return "";
    }
  }

  function clearLogicalChain() {
    try { sessionStorage.removeItem(CHAIN_KEY); } catch (_) {}
  }

  function isContinuingLogicalChain() {
    var expected = expectedLogicalPath();
    if (!expected) return false;

    if (expected === normalizePath(window.location.pathname)) {
      return true;
    }

    /* If the user navigated somewhere else, the old direct-link chain is no
       longer relevant. Clearing it prevents a stale path from hijacking Back
       later in the same tab. */
    clearLogicalChain();
    return false;
  }

  function rememberLogicalDestination(url) {
    try {
      sessionStorage.setItem(CHAIN_KEY, normalizePath(url.pathname));
    } catch (_) {}
  }

  function logicalParentUrl() {
    var map = window.EFP_BACK_PARENT_MAP;
    if (!map || typeof map !== "object") return null;

    var current = normalizePath(window.location.pathname);
    var parent = map[current];
    if (!parent) return null;

    try {
      var url = new URL(parent, window.location.origin);
      if (url.origin !== window.location.origin) return null;
      if (normalizePath(url.pathname) === current) return null;
      return url;
    } catch (_) {
      return null;
    }
  }

  function buildCruxStateFromDocId(id) {
    if (!id) return null;
    var docs = Array.isArray(window.EF_CRUX_DOCS) ? window.EF_CRUX_DOCS : [];
    var doc = docs.find(function (item) { return item && item.id === id; });
    if (!doc) return null;

    var exam = doc.exam || "";
    if (!exam && doc.source === "Pinnacle") {
      var pdf = String(doc.pdf || "");
      if (pdf.indexOf("/Pinnacle/SSC/") !== -1) exam = "SSC";
      else if (pdf.indexOf("/Pinnacle/Railway/") !== -1) exam = "Railway";
    }

    return {
      kind: doc.kind || "",
      source: doc.source || "",
      exam: exam,
      subject: doc.subject || "",
      branch: doc.branch || ""
    };
  }

  function buildCruxViewerState() {
    if (!isCruxViewer()) return null;
    var id = new URLSearchParams(window.location.search).get("id");
    return buildCruxStateFromDocId(id);
  }

  function saveCruxViewerReturnState() {
    var state = buildCruxViewerState();
    if (!state || !state.kind || !state.source || !state.subject) return false;
    try {
      sessionStorage.setItem(CRUX_RESTORE_KEY, JSON.stringify(state));
      return true;
    } catch (_) {
      return false;
    }
  }

  function navigateCruxViewerToHierarchy() {
    if (!isCruxViewer()) return false;

    if (isCruxViewerFromBookmarks()) {
      if (isHomeSearchGuardState(history.state, "top")) {
        window.history.back();
      } else if (!AUTO_RESUMED_BOUNDARY && hasExpectedCruxViewerReferrer() &&
          window.history.length > 1) {
        window.history.back();
      } else {
        window.location.replace(bookmarkReturnUrl());
      }
      return true;
    }

    /* A trusted Crux -> PDF navigation has its exact parent in the real
       history stack, including the installed app while the session is live.
       Reuse it so a replacement index cannot duplicate the hierarchy. */
    if (!AUTO_RESUMED_BOUNDARY &&
        isCruxViewerFromCruxPage() &&
        hasExpectedCruxViewerReferrer() &&
        window.history.length > 1) {
      /* Keep an exact document-derived return target until the Crux index has
         actually verified its Chapter pane. A BFCache restore can preserve a
         stale Source DOM/history entry even though the referrer is correct.
         My Pages is not the hierarchy index, so it must not leave this token. */
      var viewerSource = "";
      try { viewerSource = new URLSearchParams(window.location.search).get("from") || ""; } catch (_) {}
      if (viewerSource === "crux-index") saveCruxViewerReturnState();
      else clearCruxViewerReturnState();
      clearLogicalChain();
      clearHomeSearchChain();
      window.history.back();
      return true;
    }

    var id = "";
    try { id = new URLSearchParams(window.location.search).get("id") || ""; } catch (_) {}
    var saved = saveCruxViewerReturnState();

    /* Android app/direct URLs use a durable document-id return token. The
       index reconstructs the exact hierarchy without trusting WebView history. */
    try {
      var url = new URL("/Crux-Tricks/index.html", window.location.origin);
      if (id) url.searchParams.set("returnPdf", id);
      clearLogicalChain();
      clearHomeSearchChain();
      window.location.replace(url.href);
      return true;
    } catch (_) {
      if (saved) {
        window.location.replace("/Crux-Tricks/index.html");
        return true;
      }
      return false;
    }
  }

  window.EFP_CRUX_VIEWER_BACK = navigateCruxViewerToHierarchy;

  function rememberCruxViewerState(parentUrl) {
    if (!isCruxViewer()) return;
    if (normalizePath(parentUrl.pathname).toLowerCase() !== "/crux-tricks/index.html") return;
    saveCruxViewerReturnState();
  }

  function clearCruxViewerReturnState() {
    try { sessionStorage.removeItem(CRUX_RESTORE_KEY); } catch (_) {}
  }

  function readCruxRestoreState() {
    /* The URL token belongs to the PDF being returned from, so it is more
       authoritative than an older sessionStorage value left by a prior PDF. */
    if (CRUX_RETURN_DOC_ID) {
      var tokenState = buildCruxStateFromDocId(CRUX_RETURN_DOC_ID);
      if (tokenState) return tokenState;
    }

    try {
      var raw = sessionStorage.getItem(CRUX_RESTORE_KEY);
      if (raw) {
        var state = JSON.parse(raw);
        if (state && typeof state === "object") return state;
      }
    } catch (_) {
      clearCruxViewerReturnState();
    }

    return null;
  }

  function clickButtonByText(selector, wanted) {
    var buttons = document.querySelectorAll(selector);
    var needle = String(wanted || "").trim().toLowerCase();
    if (!needle) return false;

    for (var i = 0; i < buttons.length; i++) {
      var text = String(buttons[i].textContent || "").trim().toLowerCase();
      if (text.indexOf(needle) !== -1) {
        activateCruxControl(buttons[i]);
        return true;
      }
    }
    return false;
  }

  function activateCruxControl(button) {
    if (!button) return false;
    /* Restore clicks must update only the Crux UI. Dispatching a real click
       also wakes the browser-history bridge and creates transitions from a
       stale state while the hierarchy is still being rebuilt. */
    if (typeof button.onclick === "function") {
      button.onclick.call(button);
      return true;
    }
    button.click();
    return true;
  }

  function makeCruxHistoryState(level, depth, data) {
    return {
      efpCruxNav: true,
      level: level,
      depth: depth,
      kind: data.kind || "",
      source: data.source || "",
      exam: data.exam || "",
      subject: data.subject || "",
      branch: data.branch || "",
      utility: ""
    };
  }

  /* A homepage search opens viewer.html without first visiting the Crux SPA.
     Once the exact pane is restored, build the missing same-document history
     entries so every later visible/browser/Android Back press walks the normal
     hierarchy instead of jumping to Home. */
  function seedCruxReturnHistory(state) {
    if (!isCruxTricksRoot() || !state || !state.kind) return;

    var data = {
      kind: state.kind || "",
      source: state.source || "",
      exam: state.exam || "",
      subject: state.subject || "",
      branch: state.branch || ""
    };
    var chain = [makeCruxHistoryState("material", 0, {})];
    var depth = 1;

    chain.push(makeCruxHistoryState("source", depth++, { kind: data.kind }));
    if (data.source === "Pinnacle") {
      chain.push(makeCruxHistoryState("exam", depth++, data));
    }
    if (data.source) {
      chain.push(makeCruxHistoryState("subjects", depth++, data));
    }
    if (data.subject) {
      if (data.branch) chain.push(makeCruxHistoryState("parts", depth++, data));
      chain.push(makeCruxHistoryState("chapters", depth++, data));
    }

    var url = window.location.pathname + window.location.hash;
    try {
      history.replaceState(chain[0], "", url);
      for (var i = 1; i < chain.length; i++) history.pushState(chain[i], "", url);
    } catch (_) {}
  }

  function seedCruxReturnHistoryWhenReady(state) {
    var seed = function () { seedCruxReturnHistory(state); };
    /* The index bridge also initializes on DOMContentLoaded. A new listener
       added while that event is firing can race its initial replaceState;
       queue the direct-search chain until those listeners have finished. */
    if (window.EFP_CRUX_BROWSER_HISTORY) seed();
    else window.setTimeout(seed, 0);
  }

  function signalCruxRestoreComplete() {
    /* Keep deterministic returns hidden until the exact Chapter hierarchy has
       been applied, so Source/Subject intermediate panes never flash on screen. */
    try { document.documentElement.classList.remove("efp-crux-restoring"); } catch (_) {}
    try { window.dispatchEvent(new Event("efp-crux-restore-complete")); } catch (_) {
      try {
        var ev = document.createEvent("Event");
        ev.initEvent("efp-crux-restore-complete", true, false);
        window.dispatchEvent(ev);
      } catch (_) {}
    }
  }

  /* A direct shared PDF URL uses one generic viewer.html plus ?id=... . Restore
     the matching in-page Crux hierarchy after the logical Back lands on index:
     Material -> Source -> Subject -> Part -> Chapter list. */
  function restoreCruxIndexState() {
    if (!isCruxTricksRoot()) return;
    if (restoreCruxIndexState.running) return;

    var state = readCruxRestoreState();
    if (!state || !state.kind || !state.source || !state.subject) {
      if (!CRUX_RETURN_DOC_ID) clearCruxViewerReturnState();
      signalCruxRestoreComplete();
      return;
    }

    /* BFCache does not rerun the early index cloak bootstrap. Apply the same
       guard before validating/repairing so an intermediate Source pane cannot
       paint between pageshow handlers. */
    restoreCruxIndexState.running = true;
    var attempts = 0;
    var startedAt = Date.now();

    function finish(success) {
      restoreCruxIndexState.running = false;
      if (success) {
        clearCruxViewerReturnState();
        CRUX_RETURN_DOC_ID = "";
      }
      signalCruxRestoreComplete();
    }

    function apply() {
      attempts++;
      var bridge = window.EFP_CRUX_BROWSER_HISTORY;

      if (bridge) {
        /* A normal Back/BFCache return is usually already exact. Validate it
           without rewriting history; repair only a stale/missing hierarchy. */
        if (typeof bridge.matchesExternalHierarchy === "function" &&
            bridge.matchesExternalHierarchy(state)) {
          finish(true);
          return;
        }

        try { document.documentElement.classList.add("efp-crux-restoring"); } catch (_) {}
        if (typeof bridge.restoreExternalHierarchy === "function" &&
            bridge.restoreExternalHierarchy(state)) {
          finish(true);
          return;
        }
      }

      try { document.documentElement.classList.add("efp-crux-restoring"); } catch (_) {}
      if (attempts < 80 && Date.now() - startedAt < 5000) {
        window.setTimeout(apply, 50);
        return;
      }

      /* Do not destroy a still-usable cached pane on a failed repair. Keep the
         token so a later pageshow can retry when the WebView is fully awake. */
      finish(false);
    }

    apply();
  }

  function useLogicalParent(event) {
    var parentUrl = logicalParentUrl();
    if (!parentUrl) return false;

    consumeBackEvent(event);
    rememberCruxViewerState(parentUrl);
    rememberLogicalDestination(parentUrl);

    /* Replace instead of assign so a direct-link Back chain does not create
       child -> parent -> child browser-history loops. */
    window.location.replace(parentUrl.href);
    return true;
  }

  /* Quiz confirmation must choose the visible site's parent, not the previous
     browser entry. After an app resume that entry may be the launch Home, and
     quiz/history guards can add more same-URL entries in front of it. Both the
     universal button and Android/system Back call this after confirmation. */
  function navigateQuizParent() {
    if (window.EFP_SEARCH_RETURN && window.EFP_SEARCH_RETURN.leave()) return true;
    var event = {
      preventDefault: function () {},
      stopPropagation: function () {},
      stopImmediatePropagation: function () {}
    };
    if (useBookmarkHierarchyBack(event) || useCruxInternalBack(event) ||
        useOriginalPracticeInternalBack(event)) return true;

    if (isCruxViewer()) {
      if (!navigateCruxViewerToHierarchy()) window.location.replace("/Crux-Tricks/index.html");
      return true;
    }
    if (isOriginalPracticePage()) {
      if (isOriginalPracticeIndex()) {
        if (window.EFP_APP_SESSION) window.EFP_APP_SESSION.markHome();
        window.location.replace("/");
      } else {
        window.location.replace("/Original%20Practice/index.html");
      }
      return true;
    }
    return useLogicalParent(event);
  }

  window.EFP_BACK_NAV = { navigateQuizParent: navigateQuizParent };

  function isGenericHomeSearchGuardState(state, phase) {
    return !!(state && state[HOME_SEARCH_GUARD] === true &&
      (!phase || state.phase === phase));
  }

  function copyHistoryState(state) {
    var copy = {};
    if (!state || typeof state !== "object") return copy;
    for (var key in state) {
      if (Object.prototype.hasOwnProperty.call(state, key)) copy[key] = state[key];
    }
    return copy;
  }

  function armGenericHomeSearchGuard() {
    if (isCruxViewer()) return false;
    if (isGenericHomeSearchGuardState(history.state, "top")) return true;

    var url = window.location.pathname + window.location.search + window.location.hash;
    var base = copyHistoryState(history.state);
    var top = copyHistoryState(history.state);
    // A quiz may already have armed its Quit guard before this home-search
    // hierarchy guard is installed (notably after app resume). The base is
    // where Back lands: it must be distinguishable from the protected top so
    // app-session can show Quit instead of letting the hierarchy popstate
    // handler jump straight to Home/a parent without confirmation.
    delete base.efpQuizQuitGuard;
    base[HOME_SEARCH_GUARD] = true;
    base.phase = "base";
    top[HOME_SEARCH_GUARD] = true;
    top.phase = "top";

    try {
      history.replaceState(base, "", url);
      history.pushState(top, "", url);
      return true;
    } catch (_) {
      return false;
    }
  }

  /* Homepage search can open any leaf directly: a quiz, book topic, Current
     Affairs page or Mind Map. Add a guard at every non-root page in that
     logical chain. Browser/Android Back reaches the guard, loads the mapped
     parent, then that parent installs the next guard. This recreates the same
     hierarchy the user would have traversed manually. */
  function installGenericHomeSearchHistoryGuard() {
    if (window.EFP_SEARCH_RETURN && window.EFP_SEARCH_RETURN.isActive()) return;
    /* Original Practice already owns a complete in-document history stack.
       Adding this generic guard there creates a second same-URL Back layer and
       makes Quiz/Chapters exits depend on which synthetic guard is on top. */
    if (isCruxViewer() || isOriginalPracticePage()) return;

    var parentUrl = logicalParentUrl();
    if (!parentUrl) return;

    var current = normalizePath(window.location.pathname);
    var expected = expectedLogicalPath();
    var resumedBoundary = AUTO_RESUMED_BOUNDARY && !isMixedPracticePage() && !isCruxTricksRoot();
    var initial = hasHomeSearchMarker() || isHomePageUrl(document.referrer) || resumedBoundary;
    var continuing = hasHomeSearchChain() && expected === current;

    if (!initial && !continuing) {
      if (hasHomeSearchChain() && expected && expected !== current) {
        clearHomeSearchChain();
        clearLogicalChain();
      }
      return;
    }

    /* The section root already has the real Home entry immediately behind it.
       Let the ordinary Back handler use that entry instead of adding a second
       synthetic Home step. */
    if (isHomePageUrl(parentUrl.href)) {
      clearHomeSearchChain();
      if (continuing) clearLogicalChain();
      return;
    }

    rememberHomeSearchChain();
    armGenericHomeSearchGuard();
  }

  function isHomeSearchGuardState(state, phase) {
    return !!(state && state[CRUX_HOME_SEARCH_GUARD] === true &&
      (!phase || state.phase === phase));
  }

  /* Homepage search opens the shared viewer directly, so the browser's real
     previous entry is Home. Add one same-document guard entry: Android/system
     Back first reaches the guarded viewer entry, whose popstate handler then
     replaces it with the PDF's exact Crux hierarchy. The visible Back button
     uses this same path. */
  function installCruxHomeSearchHistoryGuard() {
    if (window.EFP_SEARCH_RETURN && window.EFP_SEARCH_RETURN.isActive()) return;
    /* Normal Crux -> PDF navigation already has a correct managed Chapter
       entry behind the viewer. Do not overwrite that history in Android.
       A guard is needed only for direct/home-search opens that have no trusted
       Crux parent in the real history stack. */
    if (!isCruxViewer()) return;
    if (isCruxViewerFromBookmarks()) {
      if (!AUTO_RESUMED_BOUNDARY && hasExpectedCruxViewerReferrer() &&
          window.history.length > 1) return;
    } else if (!AUTO_RESUMED_BOUNDARY && !isCruxViewerFromHomeSearch() && hasExpectedCruxViewerReferrer()) return;

    var current = history.state;
    if (isHomeSearchGuardState(current, "top")) return;

    var url = window.location.pathname + window.location.search + window.location.hash;
    try {
      history.replaceState({ efpCruxHomeSearchGuard: true, phase: "base" }, "", url);
      history.pushState({ efpCruxHomeSearchGuard: true, phase: "top" }, "", url);
    } catch (_) {}
  }

  window.addEventListener("popstate", function (event) {
    if (isCruxViewer() && isHomeSearchGuardState(event.state, "base")) {
      if (!navigateCruxViewerToHierarchy()) {
        window.location.replace("/Crux-Tricks/index.html");
      }
      return;
    }

    if (!isGenericHomeSearchGuardState(event.state, "base")) return;

    /* Older cached sessions may still contain one legacy generic guard on
       an Original Practice page. Consume it once through the SPA hierarchy,
       but never recreate that competing guard. */
    if (useOriginalPracticeInternalBack(event)) return;

    var parentUrl = logicalParentUrl();
    if (!parentUrl) {
      clearHomeSearchChain();
      window.location.replace("/");
      return;
    }

    rememberHomeSearchChain();
    rememberLogicalDestination(parentUrl);
    window.location.replace(parentUrl.href);
  });

  document.addEventListener("click", function (event) {
    if (!isCruxViewer() || !event.target || !event.target.closest) return;
    var home = event.target.closest("#efp-home-button, .home-btn[href='../index.html'], .home-btn[href='/'], .home-btn[href='/index.html']");
    if (home) clearCruxViewerReturnState();
  }, true);

  /* Capture before black-mode.js/home-nav.js own button listener.
     - Crux SPA: climb its visible in-page hierarchy first.
     - Original Practice SPA: Quiz -> Chapters -> Complete Practice Home first.
     - Normal internal navigation: preserve real browser history.
     - Direct/external open: climb the generated logical hierarchy.
     - Once a logical climb starts: keep climbing parent-by-parent. */
  document.addEventListener("click", function (event) {
    var target = event.target && event.target.closest
      ? event.target.closest("#" + BACK_BUTTON_ID)
      : null;
    if (!target) return;
    if (window.EFP_SEARCH_RETURN && window.EFP_SEARCH_RETURN.isActive()) {
      consumeBackEvent(event);
      var searchWarning = window.EFP_QUIZ_PROGRESS_WARNING;
      var returnToSearch = function () { window.EFP_SEARCH_RETURN.leave(); };
      if (searchWarning && searchWarning.isArmed && searchWarning.isArmed()) {
        searchWarning.confirmLeave(function () { searchWarning.releaseBackGuard(returnToSearch); });
      } else if (searchWarning && searchWarning.releaseBackGuard) {
        searchWarning.releaseBackGuard(returnToSearch);
      } else returnToSearch();
      return;
    }
    var approvedLogicalBack = target.getAttribute(APPROVED_LOGICAL_BACK_ATTRIBUTE) === "1";
    if (approvedLogicalBack) target.removeAttribute(APPROVED_LOGICAL_BACK_ATTRIBUTE);

    if (useBookmarkHierarchyBack(event)) {
      return;
    }

    if (useCruxInternalBack(event)) {
      return;
    }

    /* Crux root/material is the section landing screen. When it was opened
       directly (shared link, new tab, installed app, external referrer), there
       may be no useful browser-history entry at all. Its logical parent is
       always ExamFusion Home, so own this final Crux step explicitly instead
       of depending on referrer/history heuristics. Deeper Crux panes are
       already handled above by useCruxInternalBack(). */
    if (isCruxTricksRoot()) {
      consumeBackEvent(event);
      clearLogicalChain();
      clearHomeSearchChain();
      if (window.EFP_APP_SESSION) window.EFP_APP_SESSION.markHome();
      window.location.assign("/");
      return;
    }

    /* Follow the Practice page's own hierarchy before leaving its section. */
    if (isOriginalPracticePage()) {
      if (useOriginalPracticeInternalBack(event)) return;
      consumeBackEvent(event);
      try { sessionStorage.removeItem("efp_logical_back_expected_path"); } catch (_) {}
      if (isOriginalPracticeIndex()) {
        if (window.EFP_APP_SESSION) window.EFP_APP_SESSION.markHome();
        window.location.assign("/");
      } else {
        window.location.assign("/Original%20Practice/index.html");
      }
      return;
    }

    if (isCruxViewer()) {
      consumeBackEvent(event);
      if (!navigateCruxViewerToHierarchy()) {
        window.location.replace("/Crux-Tricks/index.html");
      }
      return;
    }

    /* The visible Back button on an unanswered quiz must use the same parent
       as Quit Quiz. A same-origin referrer can be the recreated app Home. */
    var quizWarning = window.EFP_QUIZ_PROGRESS_WARNING;
    if (quizWarning && typeof quizWarning.isQuizVisible === "function" &&
        quizWarning.isQuizVisible() && useLogicalParent(event)) return;

    /* Quiz Quit replays the shared Back click after releasing its synthetic
       history guard. On an idle/resumed Android or browser session, the entry
       behind that guard may have been rebuilt as Home. The explicit marker
       tells this one approved replay to follow the generated site hierarchy;
       ordinary live Back clicks can still preserve genuine browser history. */
    if (approvedLogicalBack && useLogicalParent(event)) {
      return;
    }

    /* A mapped section root has Home as its logical parent. The visible Back
       button must honor that mapping directly instead of trusting Android/TWA
       referrer history, which can point at a recreated or stale app entry. */
    var visibleParentUrl = logicalParentUrl();
    if (visibleParentUrl && isHomePageUrl(visibleParentUrl.href)) {
      consumeBackEvent(event);
      clearLogicalChain();
      clearHomeSearchChain();
      if (window.EFP_APP_SESSION) window.EFP_APP_SESSION.markHome();
      window.location.assign("/");
      return;
    }

    if (isGenericHomeSearchGuardState(history.state, "top")) {
      consumeBackEvent(event);
      window.history.back();
      return;
    }

    /* Android PDF viewers always own one same-document guard entry. Walking
       to its base invokes the popstate restore above, which cannot skip the
       Chapter pane even if the WebView's older index history is incomplete. */
    if (isCruxViewer() && isHomeSearchGuardState(history.state, "top")) {
      consumeBackEvent(event);
      window.history.back();
      return;
    }

    /* `from=crux-index` is part of the shareable viewer URL, so it cannot by
       itself prove that the current history entry was opened from the Crux
       SPA. Only reuse browser history when the actual referrer matches the
       marked internal Crux page. A direct/shared URL must use the reconstructed
       logical parent; otherwise history.back() can leave ExamFusion entirely. */
    if (isCruxViewerFromCruxPage()) {
      if (window.history.length > 1 && hasExpectedCruxViewerReferrer()) {
        consumeBackEvent(event);
        window.history.back();
      } else {
        useLogicalParent(event);
      }
      return;
    }

    if (isContinuingLogicalChain()) {
      useLogicalParent(event);
      return;
    }

    // Homepage full-text PDF results are content deep-links. Their generic Back
    // belongs to the PDF's Crux source hierarchy, not to the landing page. Use
    // the same history guard as Android/system Back when it is available.
    if (isCruxViewerFromHomeSearch()) {
      if (isHomeSearchGuardState(history.state, "top")) {
        consumeBackEvent(event);
        window.history.back();
        return;
      }
      useLogicalParent(event);
      return;
    }

    /* An installed-app auto-resume is a recreated history boundary: the
       same-origin referrer is the launch Home entry, not the page the learner
       actually came from. Prefer the generated logical parent so Back cannot
       jump Home after the app has been idle or Android recreated the process. */
    if (AUTO_RESUMED_BOUNDARY && useLogicalParent(event)) {
      return;
    }

    if (window.history.length > 1 && hasSameOriginReferrer()) {
      return;
    }

    useLogicalParent(event);
  }, true);

  isInstalledAndroidAppContext();
  installOriginalPracticeCopyCleanup();
  installMixedPracticeFeedbackColors();
  installMixedPracticeSiteTheme();
  installMixedPracticeInstantCheck();
installCruxHomeSearchHistoryGuard();
  installGenericHomeSearchHistoryGuard();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", restoreCruxIndexState, { once: true });
  } else {
    restoreCruxIndexState();
  }

  /* BFCache restores do not replay DOMContentLoaded. Validate the durable PDF
     return target whenever the cached Crux page becomes active again. */
  window.addEventListener("pageshow", function (event) {
    if (!isCruxTricksRoot()) return;
    var pending = false;
    try { pending = !!sessionStorage.getItem(CRUX_RESTORE_KEY); } catch (_) {}
    if (event.persisted || pending || CRUX_RETURN_DOC_ID) restoreCruxIndexState();
  });

})();
