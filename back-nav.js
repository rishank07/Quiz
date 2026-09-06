/* ExamFusion Prep — logical Back fallback for direct/external links. */
(function () {
  "use strict";

  var BACK_BUTTON_ID = "efp-app-back-button";

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
      return url.href;
    } catch (_) {
      return null;
    }
  }

  /* Capture before black-mode.js/home-nav.js own button listener. Internal
     navigation keeps normal history.back(); only direct/external opens use the
     generated logical parent hierarchy. */
  document.addEventListener("click", function (event) {
    var target = event.target && event.target.closest
      ? event.target.closest("#" + BACK_BUTTON_ID)
      : null;
    if (!target) return;

    if (window.history.length > 1 && hasSameOriginReferrer()) {
      return;
    }

    var parentUrl = logicalParentUrl();
    if (!parentUrl) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    window.location.assign(parentUrl);
  }, true);
})();
