/* ExamFusion Prep — Current Affairs "Rapid Practice" deep-link handler (2026-09-18)
 * Reads a #rp-<section>-<qi> hash (matching each article's id) from the URL,
 * opens that section via the page's own openSection(), then scrolls to and
 * briefly highlights the exact question article.
 */
(function () {
  "use strict";

  function getTarget() {
    var hash = (window.location.hash || "").replace("#", "");
    var m = /^rp-(\d+)-(\d+)$/.exec(hash);
    if (m) return { section: parseInt(m[1], 10), q: parseInt(m[2], 10), id: hash };
    // fallback: ?section=N&q=M
    var params = new URLSearchParams(window.location.search || "");
    var section = params.get("section");
    var q = params.get("q");
    if (section !== null && q !== null) {
      return { section: parseInt(section, 10), q: parseInt(q, 10), id: "rp-" + section + "-" + q };
    }
    return null;
  }

  function focusArticle(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("efp-deep-focus");
    setTimeout(function () {
      el.classList.remove("efp-deep-focus");
    }, 2600);
  }

  function run() {
    var target = getTarget();
    if (!target || isNaN(target.section) || isNaN(target.q)) return;
    if (typeof openSection === "function") {
      try {
        openSection(target.section);
      } catch (e) {
        return;
      }
    }
    setTimeout(function () {
      focusArticle(target.id);
    }, 150);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    setTimeout(run, 0);
  }
  window.addEventListener("hashchange", run);
})();
