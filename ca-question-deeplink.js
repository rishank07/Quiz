/* ExamFusion Prep — Current Affairs exact-question deep-link handler.
 * Search results use #qN anchors. Retry briefly so static and late-rendered
 * Current Affairs pages both land on the exact matched question.
 */
(function () {
  "use strict";

  function targetId() {
    var hash = (window.location.hash || "").replace(/^#/, "");
    if (/^q\d+$/i.test(hash)) return hash;
    try {
      var q = new URLSearchParams(window.location.search || "").get("q");
      if (q) {
        q = String(q).replace(/^q/i, "");
        if (/^\d+$/.test(q)) return "q" + q;
      }
    } catch (_) {}
    return "";
  }

  function highlight(el) {
    if (!el) return;
    try {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    } catch (_) {
      el.scrollIntoView();
    }
    el.classList.add("efp-deep-focus");
    clearTimeout(el.__efpDeepFocusTimer);
    el.__efpDeepFocusTimer = setTimeout(function () {
      el.classList.remove("efp-deep-focus");
    }, 4200);
  }

  function run() {
    var id = targetId();
    if (!id) return;
    var attempt = 0;
    (function seek() {
      var el = document.getElementById(id);
      if (el) {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { highlight(el); });
        });
        return;
      }
      if (++attempt < 50) setTimeout(seek, 60);
    })();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
  window.addEventListener("hashchange", run);
  window.addEventListener("pageshow", function () {
    if (targetId()) setTimeout(run, 0);
  });
})();
