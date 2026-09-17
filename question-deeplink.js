// ExamFusion Prep — question-box hash highlight (added 2026-09-18)
// The browser already scrolls to #qN natively since q-boxes have that id.
// This only adds a temporary highlight so the exact matched question is
// obvious, and re-applies it if the hash changes without a full reload.
(function () {
  "use strict";
  function highlightHash() {
    var id = (location.hash || "").replace(/^#/, "");
    if (!/^q\d+$/.test(id)) return;
    var box = document.getElementById(id);
    if (!box || !box.classList || !box.classList.contains("question-box")) return;
    setTimeout(function () {
      try { box.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) { box.scrollIntoView(); }
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
