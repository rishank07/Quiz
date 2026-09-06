/* ExamFusion Prep — logical Back fallback for direct/external links. */
(function () {
  "use strict";

  var BACK_BUTTON_ID = "efp-app-back-button";
  var CHAIN_KEY = "efp_logical_back_expected_path";
  var CRUX_RESTORE_KEY = "efp_crux_back_restore_state";

  function normalizePath(pathname) {
    var path = pathname || "/";
    try { path = decodeURIComponent(path); } catch (_) {}
    path = path.replace(/\/{2,}/g, "/");
    if (path.length > 1) path = path.replace(/\/$/, "");
    return path || "/";
  }

  function isCruxTricksRoot() {
    var path = normalizePath(window.location.pathname).toLowerCase();
    return path === "/crux-tricks" || path === "/crux-tricks/index.html";
  }

  function isCruxViewer() {
    return normalizePath(window.location.pathname).toLowerCase() === "/crux-tricks/viewer.html";
  }

  function consumeBackEvent(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
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
     Material -> Source -> Subject -> Part -> Chapter. Browser history cannot
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

    if (isVisibleByHiddenFlag("source")) {
      consumeBackEvent(event);
      return clickCruxControl("backMaterial");
    }

    return false;
  }

  function hasSameOriginReferrer() {
    if (!document.referrer) return false;
    try {
      return new URL(document.referrer, window.location.href).origin === window.location.origin;
    } catch (_) {
      return false;
    }
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

  function rememberCruxViewerState(parentUrl) {
    if (!isCruxViewer()) return;
    if (normalizePath(parentUrl.pathname).toLowerCase() !== "/crux-tricks/index.html") return;

    var id = new URLSearchParams(window.location.search).get("id");
    var docs = Array.isArray(window.EF_CRUX_DOCS) ? window.EF_CRUX_DOCS : [];
    var doc = docs.find(function (item) { return item && item.id === id; });
    if (!doc) return;

    var state = {
      kind: doc.kind || "",
      source: doc.source || "",
      subject: doc.subject || "",
      branch: doc.branch || ""
    };

    try { sessionStorage.setItem(CRUX_RESTORE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function readCruxRestoreState() {
    try {
      var raw = sessionStorage.getItem(CRUX_RESTORE_KEY);
      if (!raw) return null;
      sessionStorage.removeItem(CRUX_RESTORE_KEY);
      var state = JSON.parse(raw);
      return state && typeof state === "object" ? state : null;
    } catch (_) {
      return null;
    }
  }

  function clickButtonByText(selector, wanted) {
    var buttons = document.querySelectorAll(selector);
    var needle = String(wanted || "").trim().toLowerCase();
    if (!needle) return false;

    for (var i = 0; i < buttons.length; i++) {
      var text = String(buttons[i].textContent || "").trim().toLowerCase();
      if (text.indexOf(needle) !== -1) {
        buttons[i].click();
        return true;
      }
    }
    return false;
  }

  /* A direct shared PDF URL uses one generic viewer.html plus ?id=... . Restore
     the matching in-page Crux hierarchy after the logical Back lands on index:
     Material -> Source -> Subject -> Part -> Chapter list. */
  function restoreCruxIndexState() {
    if (!isCruxTricksRoot()) return;

    var state = readCruxRestoreState();
    if (!state || !state.kind || !state.source || !state.subject) return;

    var material = document.querySelector('[data-material="' + state.kind + '"]');
    if (!material) return;
    material.click();

    if (!clickButtonByText("#sourceChoices .choice", state.source)) return;
    if (!clickButtonByText("#subjectChoices .subject", state.subject)) return;

    if (state.branch) {
      clickButtonByText("#partChoices .part", state.branch);
    }

    try { window.scrollTo(0, 0); } catch (_) {}
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

  /* Capture before black-mode.js/home-nav.js own button listener.
     - Crux SPA: climb its visible in-page hierarchy first.
     - Normal internal navigation: preserve real browser history.
     - Direct/external open: climb the generated logical hierarchy.
     - Once a logical climb starts: keep climbing parent-by-parent. */
  document.addEventListener("click", function (event) {
    var target = event.target && event.target.closest
      ? event.target.closest("#" + BACK_BUTTON_ID)
      : null;
    if (!target) return;

    if (useCruxInternalBack(event)) {
      return;
    }

    if (isContinuingLogicalChain()) {
      useLogicalParent(event);
      return;
    }

    if (window.history.length > 1 && hasSameOriginReferrer()) {
      return;
    }

    useLogicalParent(event);
  }, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", restoreCruxIndexState, { once: true });
  } else {
    restoreCruxIndexState();
  }
})();
