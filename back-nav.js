/* ExamFusion Prep — logical Back fallback for direct/external links. */
(function () {
  "use strict";

  var BACK_BUTTON_ID = "efp-app-back-button";
  var CHAIN_KEY = "efp_logical_back_expected_path";

  function normalizePath(pathname) {
    var path = pathname || "/";
    try { path = decodeURIComponent(path); } catch (_) {}
    path = path.replace(/\/{2,}/g, "/");
    if (path.length > 1) path = path.replace(/\/$/, "");
    return path || "/";
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

  function isContinuingLogicalChain() {
    var expected = expectedLogicalPath();
    return Boolean(expected && expected === normalizePath(window.location.pathname));
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

  function useLogicalParent(event) {
    var parentUrl = logicalParentUrl();
    if (!parentUrl) return false;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    rememberLogicalDestination(parentUrl);

    /* Replace instead of assign so a direct-link Back chain does not create
       child -> parent -> child browser-history loops. */
    window.location.replace(parentUrl.href);
    return true;
  }

  /* Capture before black-mode.js/home-nav.js own button listener.
     - Normal internal navigation: preserve real browser history.
     - Direct/external open: climb the generated logical hierarchy.
     - Once a logical climb starts: keep climbing parent-by-parent. */
  document.addEventListener("click", function (event) {
    var target = event.target && event.target.closest
      ? event.target.closest("#" + BACK_BUTTON_ID)
      : null;
    if (!target) return;

    if (isContinuingLogicalChain()) {
      useLogicalParent(event);
      return;
    }

    if (window.history.length > 1 && hasSameOriginReferrer()) {
      return;
    }

    useLogicalParent(event);
  }, true);
})();
