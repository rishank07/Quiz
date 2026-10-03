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
      "#scoreTxt.ef-native-score{min-width:0!important;max-width:100%!important}" +
      ".ef-native-score-chip{min-width:0;box-sizing:border-box}" +
      /* Opaque sticky surfaces avoid repeated backdrop repaints on WebViews. */
      ".toolbar{background:var(--bg,#f6f2e9)!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}" +
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
      "background:var(--card,#fff);border:1px solid rgba(184,134,63,.22);border-radius:12px;" +
      "box-shadow:0 3px 14px rgba(26,31,46,.10);-webkit-backdrop-filter:none!important;backdrop-filter:none!important}" +
      ".toolbar>.barcard>.row:first-child .pct,.toolbar>.bar>.row:first-child .pct{display:none!important}" +
      ".efp-rp-score-badges{display:none!important}" +
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
      ".toolbar>.barcard>.row:first-child.efp-rp-native-score-row,.toolbar>.bar>.row:first-child.efp-rp-native-score-row{" +
      "display:grid!important;grid-template-columns:minmax(42px,1fr) auto auto!important;align-items:center!important;" +
      "justify-content:stretch!important;column-gap:5px!important;row-gap:5px!important;flex-wrap:initial!important}" +
      ".toolbar>.barcard>.row:first-child.efp-rp-native-score-row #scoreTxt.ef-native-score," +
      ".toolbar>.bar>.row:first-child.efp-rp-native-score-row #scoreTxt.ef-native-score{" +
      "grid-column:1/-1!important;display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;" +
      "gap:5px!important;width:100%!important;max-width:none!important;flex:none!important;margin:0!important}" +
      ".efp-rp-native-score-row .ef-native-score-chip{width:100%!important;min-width:0!important;padding:6px 3px!important;" +
      "font-size:10.5px!important;line-height:1.1!important;overflow:hidden;text-overflow:ellipsis}" +
      ".efp-rp-native-score-row .ef-native-score-chip strong{font-size:12px!important}" +
      ".toolbar>.barcard>.row:first-child.efp-rp-native-score-row .progress," +
      ".toolbar>.bar>.row:first-child.efp-rp-native-score-row .progress{" +
      "grid-column:1/2!important;min-width:36px!important;max-width:none!important;width:100%!important}" +
      ".efp-rp-native-score-row .pct{display:none!important}" +
      ".efp-rp-native-score-row .btn{min-width:0!important;white-space:nowrap!important}" +
      "@media(max-width:370px){.efp-rp-native-score-row .ef-native-score-chip{padding:5px 2px!important;font-size:9.5px!important}" +
      ".efp-rp-native-score-row .ef-native-score-chip strong{font-size:11px!important}}" +
      ".toolbar>.barcard>.row:nth-child(2),.toolbar>.bar>.row:nth-child(2){margin-top:0!important;padding:10px 10px 4px;" +
      "background:var(--card,#fff);border:1px solid var(--line,#d9d5cc);border-bottom:0;border-radius:14px 14px 0 0}" +
      ".toolbar>.barcard>.section-nav,.toolbar>.bar>.section-nav{padding:8px 10px 10px;background:var(--card,#fff);" +
      "border:1px solid var(--line,#d9d5cc);border-top:0;border-radius:0 0 14px 14px}" +
      "body.dark .toolbar>.barcard>.row:first-child,body.dark .toolbar>.bar>.row:first-child{" +
      "background:#182231;border-color:#314052;box-shadow:none}" +
      "body.dark .efp-rp-score-total{background:#263445;color:#e5e7eb}" +
      "body.dark .efp-rp-score-correct{background:#123d32;color:#8be0bd}" +
      "body.dark .efp-rp-score-wrong{background:#4a2229;color:#ffacb6}" +
      "body.dark .toolbar>.barcard>.row:nth-child(2),body.dark .toolbar>.bar>.row:nth-child(2)," +
      "body.dark .toolbar>.barcard>.section-nav,body.dark .toolbar>.bar>.section-nav{" +
      "background:#182231;border-color:#314052}" +
      "}";
    document.head.appendChild(prepaintStyle);
  }


  function installDesktopBookmarkScrollBehavior() {
    var toolbar = document.querySelector(".toolbar");
    var bookmark = document.getElementById("bookmarkFilter");
    if (!toolbar || !bookmark || toolbar.__efpDesktopBookmarkScroll) return;
    toolbar.__efpDesktopBookmarkScroll = true;

    var row = bookmark.closest ? bookmark.closest(".row") : bookmark.parentElement;
    if (!row) row = bookmark;
    var naturalTop = 0;
    var expandedHeight = 0;
    var hidden = false;
    var ticking = false;
    // Measure an in-flow marker, never the offsetTop of a sticky element.
    // Keep the removed bookmark row's space outside the sticky surface so
    // scroll anchoring cannot move the heading and retrigger this transition.
    var marker = document.createElement("div");
    var spacer = document.createElement("div");
    marker.setAttribute("aria-hidden", "true");
    spacer.setAttribute("aria-hidden", "true");
    marker.style.cssText = "height:0;margin:0;padding:0;border:0;";
    spacer.style.cssText = "height:0;margin:0;padding:0;border:0;overflow-anchor:none;";
    toolbar.parentNode.insertBefore(marker, toolbar);
    toolbar.parentNode.insertBefore(spacer, toolbar.nextSibling);

    function measure() {
      row.style.removeProperty("display");
      spacer.style.height = "0px";
      hidden = false;
      expandedHeight = toolbar.getBoundingClientRect().height;
      naturalTop = marker.getBoundingClientRect().top + (window.pageYOffset || 0) +
        (parseFloat(getComputedStyle(toolbar).marginTop) || 0);
      apply();
    }

    function apply() {
      ticking = false;
      var desktop = window.innerWidth > 650;
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      var stuck = desktop && y >= Math.max(0, naturalTop - 1);

      if (stuck === hidden) return;
      hidden = stuck;
      if (stuck) {
        row.style.setProperty("display", "none", "important");
        spacer.style.height = Math.max(0, expandedHeight - toolbar.getBoundingClientRect().height) + "px";
      } else {
        row.style.removeProperty("display");
        spacer.style.height = "0px";
      }
    }

    function sync() {
      if (ticking) return;
      ticking = true;
      (window.requestAnimationFrame || function (fn) { return setTimeout(fn, 16); })(apply);
    }

    measure();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    window.addEventListener("load", measure, { once: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  }

  function installOriginalPracticeScoreLook() {
    var rows = document.querySelectorAll(
      ".toolbar > .barcard > .row:first-child, .toolbar > .bar > .row:first-child"
    );
    rows.forEach(function (row) {
      var score = row.querySelector("#scoreTxt");
      if (!score) return;

      function isNativeScore() {
        return score.dataset.efNativeScore === "1" || score.classList.contains("ef-native-score");
      }

      function adoptNativeScore() {
        if (!isNativeScore()) return false;
        var staleBadges = row.querySelector(".efp-rp-score-badges");
        if (staleBadges) staleBadges.remove();
        row.classList.add("efp-rp-native-score-row");
        score.__efpOriginalPracticeScore = true;
        score.setAttribute("aria-live", "polite");
        return true;
      }

      // Native Current Affairs score UI always wins. Check this before the
      // legacy-install guard so a late runtime conversion cannot leave stale
      // badges or the old nowrap layout behind.
      if (adoptNativeScore()) return;
      if (score.__efpOriginalPracticeScore) return;
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
        if (adoptNativeScore()) return;
        var value = (score.textContent || "").replace(/\s+/g, " ").trim();
        var attemptedMatch = value.match(/(\d+)\s*\/\s*(\d+)\s*attempted/i);
        var correctMatch = value.match(/(\d+)\s*correct/i);
        var wrongMatch = value.match(/(\d+)\s*wrong/i);
        var attempted = attemptedMatch ? attemptedMatch[1] : "0";
        var total = attemptedMatch ? attemptedMatch[2] : "0";
        var correct = correctMatch ? correctMatch[1] : "0";
        var wrong = wrongMatch ? wrongMatch[1] : "0";

        if (!badges.isConnected) return;
        totalBadge.textContent = "Total: " + attempted + "/" + total;
        correctBadge.textContent = "Correct: " + correct;
        wrongBadge.textContent = "Wrong: " + wrong;
      }

      syncBadges();
      new MutationObserver(syncBadges).observe(score, {
        childList: true,
        characterData: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "data-ef-native-score"]
      });
    });
  }

  function rapidSections() {
    try {
      if (typeof SECTIONS !== "undefined" && Array.isArray(SECTIONS)) return SECTIONS;
    } catch (_) {}
    return [];
  }

  function activeSectionIndex() {
    try {
      if (typeof current !== "undefined" && Number.isFinite(Number(current))) {
        return Math.max(0, Number(current));
      }
    } catch (_) {}

    var active = document.querySelector("#sectionNav .pill.active");
    if (active && active.parentNode) {
      var pills = Array.prototype.slice.call(active.parentNode.querySelectorAll(".pill"));
      var index = pills.indexOf(active);
      if (index >= 0) return index;
    }

    var secNo = document.getElementById("secNo");
    var match = secNo && (secNo.textContent || "").match(/Section\s+(\d+)/i);
    return match ? Math.max(0, parseInt(match[1], 10) - 1) : 0;
  }

  function sectionRange(sections, index) {
    var start = 1;
    for (var i = 0; i < index; i += 1) {
      start += sections[i] && Array.isArray(sections[i].questions) ? sections[i].questions.length : 0;
    }
    var count = sections[index] && Array.isArray(sections[index].questions)
      ? sections[index].questions.length
      : 0;
    return { start: start, end: Math.max(start, start + count - 1), count: count };
  }

  function cleanSectionTitle(value, hindi) {
    var text = String(value || "").replace(/\s+/g, " ").trim();
    text = text.replace(/^\s*(?:Part|भाग)\s+\d+[A-Za-z]?\s*:\s*/i, "");
    text = text.replace(/\s*(?::|[-–—]|·)?\s*(?:Facts|तथ्य)\s*\d+\s*[-–—]\s*\d+\s*$/i, "");
    text = text.replace(/\s*Q\s*\d+\s*[-–—]\s*Q?\s*\d+\s*$/i, "");
    text = text.replace(/^(Explanation(?: Fact)? Drill|स्पष्टीकरण अभ्यास)\s+\d+$/i, "$1");
    text = text.replace(/\s*[:·–—-]\s*$/, "").trim();
    return text || (hindi ? "प्रश्न" : "Questions");
  }

  function installLogicalSectionRanges() {
    var head = document.querySelector(".sec-head");
    var nav = document.getElementById("sectionNav");
    if (!head || !nav || head.__efpLogicalRanges) return;
    head.__efpLogicalRanges = true;

    function syncRanges() {
      var sections = rapidSections();
      if (!sections.length) return;
      var index = Math.min(activeSectionIndex(), sections.length - 1);
      var section = sections[index] || {};
      var range = sectionRange(sections, index);
      if (!range.count) return;

      var title = section.title || {};
      var rangeText = "Q" + range.start + "–Q" + range.end;
      var en = cleanSectionTitle(title.en, false) + " · " + rangeText;
      var hi = cleanSectionTitle(title.hi || title.en, true) + " · " + rangeText;
      var meta = "Section " + (index + 1) + " of " + sections.length +
        " · " + rangeText + " · " + range.count + " questions";
      var secNo = document.getElementById("secNo");
      var secTitle = document.getElementById("secTitle");
      var secTitleHi = document.getElementById("secTitleHi");

      if (secNo && secNo.textContent !== meta) secNo.textContent = meta;
      if (secTitle && secTitle.textContent !== en) secTitle.textContent = en;
      if (secTitleHi && secTitleHi.textContent !== hi) secTitleHi.textContent = hi;

      nav.querySelectorAll(".pill").forEach(function (pill, pillIndex) {
        if (!sections[pillIndex]) return;
        var pillRange = sectionRange(sections, pillIndex);
        var pillRangeText = "Q" + pillRange.start + "–Q" + pillRange.end;
        var pillTitle = cleanSectionTitle((sections[pillIndex].title || {}).en, false) +
          " · " + pillRangeText + " · " + pillRange.count + " questions";
        pill.title = pillTitle;
        pill.setAttribute("aria-label", "Section " + (pillIndex + 1) + ": " + pillTitle);
      });
    }

    syncRanges();
    new MutationObserver(syncRanges).observe(head, {
      childList: true,
      characterData: true,
      subtree: true
    });
    new MutationObserver(syncRanges).observe(nav, { childList: true, subtree: true });
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
    if (window.EFP_SEARCH_CONTEXT && window.EFP_SEARCH_CONTEXT.isDismissed(el)) return;
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
      installLogicalSectionRanges();
      installDesktopBookmarkScrollBehavior();
      run();
    }, { once: true });
  } else {
    installOriginalPracticeScoreLook();
    installLogicalSectionRanges();
    installDesktopBookmarkScrollBehavior();
    setTimeout(run, 0);
  }
  window.addEventListener("hashchange", run);
  window.addEventListener("pageshow", function () {
    installOriginalPracticeScoreLook();
    installLogicalSectionRanges();
    installDesktopBookmarkScrollBehavior();
    if (getTarget()) setTimeout(run, 0);
  });
})();
