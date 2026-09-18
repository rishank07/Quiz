/* ExamFusion Prep — Current Affairs "Topic Names" deep-link handler (2026-09-18)
 * Reads a #qN hash (or ?q=N fallback) on load, scrolls to that question and
 * highlights it briefly so search results land exactly on the matched question.
 */
(function () {
  "use strict";

  function getTargetId() {
    var hash = (window.location.hash || "").replace("#", "");
    if (hash) return hash;
    var params = new URLSearchParams(window.location.search || "");
    var q = params.get("q");
    if (q) return "q" + q.replace(/^q/i, "");
    return null;
  }

  function focusTarget() {
    var id = getTargetId();
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    setTimeout(function () {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("efp-deep-focus");
      setTimeout(function () {
        el.classList.remove("efp-deep-focus");
      }, 2600);
    }, 60);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", focusTarget);
  } else {
    focusTarget();
  }
  window.addEventListener("hashchange", focusTarget);
})();
