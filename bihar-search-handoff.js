/* ExamFusion Prep — Bihar Special global -> local search handoff (2026-09-19) */
(function () {
  "use strict";
  function applySearchHandoff() {
    var query = "";
    try { query = new URLSearchParams(window.location.search).get("efsearch") || ""; } catch (e) {}
    query = query.trim();
    if (!query) return;
    var input = document.getElementById("searchInput");
    if (!input) return;
    input.value = query;
    try {
      if (typeof window.filterCards === "function") window.filterCards();
      else {
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("keyup", { bubbles: true }));
      }
    } catch (e) {}
    setTimeout(function () {
      var cards = document.querySelectorAll(".cd");
      for (var i = 0; i < cards.length; i++) {
        if (window.getComputedStyle(cards[i]).display !== "none") {
          cards[i].scrollIntoView({ behavior: "smooth", block: "center" });
          break;
        }
      }
    }, 40);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", applySearchHandoff, { once: true });
  else applySearchHandoff();
})();
