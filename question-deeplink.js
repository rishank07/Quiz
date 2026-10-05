// ExamFusion Prep — question-box hash highlight (added 2026-09-18)
// The browser already scrolls to #qN natively since q-boxes have that id.
// This only adds a temporary highlight so the exact matched question is
// obvious, and re-applies it if the hash changes without a full reload.
(function () {
  "use strict";

  // Search-result pages must not depend on back-nav.js winning a cache/load
  // race. Carrying efSearchQuery in the result URL lets this tiny helper make
  // the latest shared search context available directly on desktop browsers,
  // Windows PWA and mobile alike. back-nav.js recognises the same element IDs,
  // so it will not inject duplicate copies later.
  function ensureSearchContext() {
    var hasSearchEntry = false;
    try {
      var params = new URL(location.href).searchParams;
      hasSearchEntry = !!(params.get("efSearchQuery") || params.get("efSearchReturn"));
    } catch (_) {}
    if (!hasSearchEntry) return;

    if (typeof window.efTextMatches !== "function" &&
        !document.querySelector('script[src*="search-logic.js"]')) {
      var logic = document.createElement("script");
      logic.id = "efp-shared-search-logic";
      logic.src = "/search-logic.js?v=20261005desktop1";
      logic.async = false;
      document.head.appendChild(logic);
    }

    if (!window.EFP_SEARCH_CONTEXT && !document.getElementById("efp-shared-search-context")) {
      var context = document.createElement("script");
      context.id = "efp-shared-search-context";
      context.src = "/search-context.js?v=20261005rootdock2";
      context.async = false;
      document.head.appendChild(context);
    }
  }

  ensureSearchContext();

  function highlightHash() {
    var id = (location.hash || "").replace(/^#/, "");
    if (!/^q\d+$/.test(id)) return;
    var box = document.getElementById(id);
    if (!box || !box.classList || !box.classList.contains("question-box")) return;
    setTimeout(function () {
      if (window.EFP_SEARCH_CONTEXT && window.EFP_SEARCH_CONTEXT.isDismissed(box)) return;
      if (!(window.EFP_SEARCH_CONTEXT && window.EFP_SEARCH_CONTEXT.focusTarget && window.EFP_SEARCH_CONTEXT.focusTarget(box))) {
        try { box.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) { box.scrollIntoView(); }
      }
      box.classList.add("efp-deep-focus");
      setTimeout(function () { box.classList.remove("efp-deep-focus"); }, 2200);
    }, 60);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", highlightHash);
  } else {
    highlightHash();
  }
  window.addEventListener("hashchange", highlightHash);
})();
