(function () {
  "use strict";

  var CLASS_NAME = "efp-crux-restoring";

  function clearRestoreGuard() {
    if (!document.documentElement.classList.contains(CLASS_NAME)) return;
    requestAnimationFrame(function () {
      document.documentElement.classList.remove(CLASS_NAME);
    });
  }

  /* crux-search-route.js registers its DOMContentLoaded/popstate restoration
     handlers before this file. Therefore these callbacks run after the target
     Crux state has been reconstructed, and only then allow it to paint. */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", clearRestoreGuard, { once: true });
  } else {
    clearRestoreGuard();
  }

  window.addEventListener("popstate", function (event) {
    var state = event.state;
    if (state && state.efpCruxNav === true) clearRestoreGuard();
  });
})();
