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
      "box-shadow:0 0 0 6px rgba(245,166,35,.16)!important;transition:outline-color .25s ease,box-shadow .25s ease}" +
      ".efp-rp-score-badges{display:none}" +
      /* On phones, keep only the score row sticky.  The legacy quiz pages put
       * the score, bookmark controls and section pills inside one sticky
       * toolbar, which consumes too much of the viewport while answering.
       * display:contents lets the score row use the page as its sticky
       * container while the remaining controls scroll away normally, matching
       * the compact Original Practice score-card behaviour. */
      "@media(max-width:650px){" +
      ".toolbar{position:static!important;top:auto!important;z-index:auto!important;display:contents!important;" +
      "padding:0!important;margin:0!important;background:transparent!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}" +
      ".toolbar>.barcard,.toolbar>.bar{display:contents!important}" +
      ".toolbar>.barcard>.row:first-child,.toolbar>.bar>.row:first-child{" +
      "position:sticky;top:8px;z-index:130;margin:10px 0 8px!important;padding:7px 8px;gap:4px;" +
      "display:flex!important;align-items:center!important;justify-content:space-between!important;flex-wrap:nowrap!important;" +
      "background:rgba(255,255,255,.96);border:1px solid rgba(184,134,63,.22);border-radius:12px;" +
      "box-shadow:0 3px 14px rgba(26,31,46,.10);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}" +
      ".toolbar>.barcard>.row:first-child #scoreTxt,.toolbar>.bar>.row:first-child #scoreTxt{display:none!important}" +
      ".toolbar>.barcard>.row:first-child .pct,.toolbar>.bar>.row:first-child .pct{display:none!important}" +
      ".efp-rp-score-badges{display:flex!important;align-items:center;gap:3px;min-width:0;flex:0 1 auto}" +
      ".toolbar>.barcard>.row:first-child .progress,.toolbar>.bar>.row:first-child .progress{" +
      "display:block!important;flex:1 1 46px;min-width:28px;max-width:72px;height:8px;margin:0!important;border-radius:999px;overflow:hidden}" +
      ".efp-rp-score-badge{display:inline-flex;align-items:center;white-space:nowrap;padding:5px 6px;border-radius:6px;" +
      "font:700 11px/1.15 Arial,sans-serif}" +
      "@media(max-width:370px){.efp-rp-score-badge{padding:5px 5px;font-size:10px}" +
      ".toolbar>.barcard>.row:first-child .progress,.toolbar>.bar>.row:first-child .progress{min-width:24px;max-width:52px}}" +
      ".efp-rp-score-total{background:#f3f4f6;color:#374151}" +
      ".efp-rp-score-correct{background:#d1fae5;color:#047857}" +
      ".efp-rp-score-wrong{background:#fee2e2;color:#b91c1c}" +
      ".toolbar>.barcard>.row:first-child .btn,.toolbar>.bar>.row:first-child .btn{" +
      "flex:0 0 auto;padding:5px 7px;font-size:10px;border-radius:8px}" +
      ".toolbar>.barcard>.row:nth-child(2),.toolbar>.bar>.row:nth-child(2){margin-top:0!important;padding:10px 10px 4px;" +
      "background:var(--card,#fff);border:1px solid var(--line,#d9d5cc);border-bottom:0;border-radius:14px 14px 0 0}" +
      ".toolbar>.barcard>.section-nav,.toolbar>.bar>.section-nav{padding:8px 10px 10px;background:var(--card,#fff);" +
      "border:1px solid var(--line,#d9d5cc);border-top:0;border-radius:0 0 14px 14px}" +
      "body.dark .toolbar>.barcard>.row:first-child,body.dark .toolbar>.bar>.row:first-child{" +
      "background:rgba(24,34,49,.96);border-color:#314052;box-shadow:none}" +
      "body.dark .efp-rp-score-total{background:#263445;color:#e5e7eb}" +
      "body.dark .efp-rp-score-correct{background:#123d32;color:#8be0bd}" +
      "body.dark .efp-rp-score-wrong{background:#4a2229;color:#ffacb6}" +
      "body.dark .toolbar>.barcard>.row:nth-child(2),body.dark .toolbar>.bar>.row:nth-child(2)," +
      "body.dark .toolbar>.barcard>.section-nav,body.dark .toolbar>.bar>.section-nav{" +
      "background:#182231;border-color:#314052}" +
      "}";
    document.head.appendChild(prepaintStyle);
  }


  function installOriginalPracticeScoreLook() {
    var rows = document.querySelectorAll(
      ".toolbar > .barcard > .row:first-child, .toolbar > .bar > .row:first-child"
    );
    rows.forEach(function (row) {
      var score = row.querySelector("#scoreTxt");
      if (!score || score.__efpOriginalPracticeScore) return;
      score.__efpOriginalPracticeScore = true;

      var badges = document.createElement("div");
      badges.className = "efp-rp-score-badges";
      badges.setAttribute("aria-hidden", "true");
      badges.innerHTML =
        '<span class="efp-rp-score-badge efp-rp-score-total">Total: 0/0</span>' +
        '<span class="efp-rp-score-badge efp-rp-score-correct">Correct: 0</span>' +
        '<span class="efp-rp-score-badge efp-rp-score-wrong">Wrong: 0</span>';
      row.insertBefore(badges, score);

      var totalBadge = badges.querySelector(".efp-rp-score-total");
      var correctBadge = badges.querySelector(".efp-rp-score-correct");
      var wrongBadge = badges.querySelector(".efp-rp-score-wrong");

      function syncBadges() {
        var value = (score.textContent || "").replace(/\s+/g, " ").trim();
        var attemptedMatch = value.match(/(\d+)\s*\/\s*(\d+)\s*attempted/i);
        var correctMatch = value.match(/(\d+)\s*correct/i);
        var wrongMatch = value.match(/(\d+)\s*wrong/i);
        var attempted = attemptedMatch ? attemptedMatch[1] : "0";
        var total = attemptedMatch ? attemptedMatch[2] : "0";
        var correct = correctMatch ? correctMatch[1] : "0";
        var wrong = wrongMatch ? wrongMatch[1] : "0";

        totalBadge.textContent = "Total: " + attempted + "/" + total;
        correctBadge.textContent = "Correct: " + correct;
        wrongBadge.textContent = "Wrong: " + wrong;
      }

      syncBadges();
      new MutationObserver(syncBadges).observe(score, {
        childList: true,
        characterData: true,
        subtree: true
      });
    });
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
    document.addEventListener("DOMContentLoaded", function () {
      installOriginalPracticeScoreLook();
      run();
    }, { once: true });
  } else {
    installOriginalPracticeScoreLook();
    setTimeout(run, 0);
  }
  window.addEventListener("hashchange", run);
  window.addEventListener("pageshow", function () {
    installOriginalPracticeScoreLook();
    if (getTarget()) setTimeout(run, 0);
  });
})();
