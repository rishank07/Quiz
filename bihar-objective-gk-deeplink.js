/* ExamFusion Prep — Bihar Objective GK "60 Sets" deep-link handler (2026-09-19)
 * Reads a #sN-Q hash (matching each question-box's own id) on load, opens
 * that set via the page's own showSet(), then scrolls to and highlights
 * the exact question. Runs after the page's own bootstrap script, which
 * only understands a plain #set-N hash.
 */
(function () {
  "use strict";

  function focusQuestion(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("efp-deep-focus");
    setTimeout(function () {
      el.classList.remove("efp-deep-focus");
    }, 2600);
  }

  function run() {
    var hash = (window.location.hash || "").replace("#", "");
    var m = /^s(\d+)-(\d+)$/.exec(hash);
    if (!m) return;
    var setNo = m[1];
    var qId = "s" + m[1] + "-" + m[2];
    if (typeof showSet === "function") {
      try {
        showSet(setNo);
      } catch (e) {
        return;
      }
    }
    setTimeout(function () {
      focusQuestion(qId);
    }, 120);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    setTimeout(run, 0);
  }
  window.addEventListener("hashchange", run);
})();
