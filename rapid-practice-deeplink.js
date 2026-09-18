/* ExamFusion Prep — Current Affairs Rapid Practice exact-question deep links.
 *
 * Search results use #rp-<section>-<question>. This file is intentionally loaded
 * synchronously in the <head> of Rapid Practice quizzes, so the legacy per-
 * section search box is hidden before first paint (no refresh-time UI flash).
 */
(function () {
  "use strict";

  var HIDE_STYLE_ID = "efp-rp-prepaint-search-hide";
  if (document.head && !document.getElementById(HIDE_STYLE_ID)) {
    var prepaintStyle = document.createElement("style");
    prepaintStyle.id = HIDE_STYLE_ID;
    prepaintStyle.textContent =
      "input#search.search{display:none!important;visibility:hidden!important}" +
      ".efp-deep-focus{outline:3px solid #f5a623!important;outline-offset:3px;border-radius:10px;" +
      "box-shadow:0 0 0 6px rgba(245,166,35,.16)!important;transition:outline-color .25s ease,box-shadow .25s ease}";
    document.head.appendChild(prepaintStyle);
  }

  function getTarget() {
    var hash = (window.location.hash || "").replace(/^#/, "");
    var m = /^rp-(\d+)-(\d+)$/.exec(hash);
    if (m) {
      return {
        section: parseInt(m[1], 10),
        q: parseInt(m[2], 10),
        id: hash
      };
    }
    try {
      var params = new URLSearchParams(window.location.search || "");
      var section = params.get("section");
      var q = params.get("q");
      if (/^\d+$/.test(String(section)) && /^\d+$/.test(String(q))) {
        return {
          section: parseInt(section, 10),
          q: parseInt(q, 10),
          id: "rp-" + section + "-" + q
        };
      }
    } catch (_) {}
    return null;
  }

  function focusArticle(el) {
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
    var target = getTarget();
    if (!target || isNaN(target.section) || isNaN(target.q)) return;

    var opened = false;
    var attempt = 0;

    (function seek() {
      if (!opened && typeof window.openSection === "function") {
        try {
          window.openSection(target.section);
          opened = true;
        } catch (_) {}
      }

      var el = document.getElementById(target.id);
      if (el) {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { focusArticle(el); });
        });
        return;
      }

      if (++attempt < 70) setTimeout(seek, 60);
    })();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    setTimeout(run, 0);
  }
  window.addEventListener("hashchange", run);
  window.addEventListener("pageshow", function () {
    if (getTarget()) setTimeout(run, 0);
  });
})();
