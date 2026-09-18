/* ExamFusion Prep — Bihar Objective GK "60 Sets" deep-link handler (2026-09-19)
 * Capture #sN-Q before the legacy page bootstrap can replace it with #set-1.
 */
(function () {
  "use strict";
  var initialDeepHash = (window.location.hash || "").replace(/^#/, "");

  function focusQuestion(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("efp-deep-focus");
    setTimeout(function () { el.classList.remove("efp-deep-focus"); }, 2600);
  }

  function run(forcedHash) {
    var hash = String(forcedHash || (window.location.hash || "").replace(/^#/, ""));
    var m = /^s(\d+)-(\d+)$/.exec(hash);
    if (!m) return;
    var setNo = m[1];
    var qId = "s" + m[1] + "-" + m[2];

    if (typeof showSet === "function") {
      try { showSet(setNo); } catch (e) { return; }
    }
    try { history.replaceState(null, "", "#" + qId); } catch (e) {}
    setTimeout(function () { focusQuestion(qId); }, 120);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      run(initialDeepHash);
      initialDeepHash = "";
    });
  } else {
    run(initialDeepHash);
    initialDeepHash = "";
  }

  window.addEventListener("hashchange", function () { run(""); });
})();
