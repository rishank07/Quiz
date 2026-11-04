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
      "position:sticky;top:0;z-index:130;margin:0 0 8px!important;padding:7px 8px;gap:4px;" +
      "display:flex!important;align-items:center!important;justify-content:space-between!important;flex-wrap:nowrap!important;" +
      "background:var(--card,#fff);border:1px solid var(--efp-scorebar-border,#b8863f);border-radius:0;" +
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
      "background:#182231;border-color:#d1a65f;box-shadow:none}" +
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

  function searchDrivenNavigationActive() {
    if (document.querySelector(".efp-search-context")) return true;
    try {
      var params = new URLSearchParams(window.location.search || "");
      if (params.get("efSearchReturn") || params.get("efSearchQuery")) return true;
    } catch (_) {}
    return /^#rp-\d+-\d+$/.test(window.location.hash || "");
  }

  function installSearchSafeOpenSection() {
    var original = window.openSection;
    if (typeof original !== "function" || original.__efpSearchSafeOpenSection) return;

    function patchedOpenSection() {
      if (!searchDrivenNavigationActive()) return original.apply(this, arguments);

      // Legacy Rapid Practice pages call window.scrollTo({top:310,behavior:'smooth'})
      // at the end of openSection(). During search/deep-link navigation that
      // smooth scroll races the result focuser and drags the viewport away from
      // the yellow search context. Suppress only that synchronous legacy scroll;
      // search-context / focusArticle owns the final centered position.
      var nativeScrollTo = window.scrollTo;
      var replaced = false;
      try {
        window.scrollTo = function () {};
        replaced = window.scrollTo !== nativeScrollTo;
        return original.apply(this, arguments);
      } finally {
        if (replaced) {
          try { window.scrollTo = nativeScrollTo; } catch (_) {}
        }
      }
    }

    patchedOpenSection.__efpSearchSafeOpenSection = true;
    patchedOpenSection.__efpOriginalOpenSection = original;
    window.openSection = patchedOpenSection;
  }

  function focusArticle(el) {
    if (window.EFP_SEARCH_CONTEXT && window.EFP_SEARCH_CONTEXT.isDismissed(el)) return;
    if (!(window.EFP_SEARCH_CONTEXT && window.EFP_SEARCH_CONTEXT.focusTarget && window.EFP_SEARCH_CONTEXT.focusTarget(el))) {
      try {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      } catch (_) {
        el.scrollIntoView();
      }
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

    installSearchSafeOpenSection();
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
      installSearchSafeOpenSection();
      run();
    }, { once: true });
  } else {
    installOriginalPracticeScoreLook();
    installLogicalSectionRanges();
    installDesktopBookmarkScrollBehavior();
    installSearchSafeOpenSection();
    setTimeout(run, 0);
  }
  window.addEventListener("hashchange", run);
  window.addEventListener("pageshow", function () {
    installOriginalPracticeScoreLook();
    installLogicalSectionRanges();
    installDesktopBookmarkScrollBehavior();
    installSearchSafeOpenSection();
    if (getTarget()) setTimeout(run, 0);
  });
})();
/* EFP_CA_RELATABLE_OPTIONS_BEGIN
 * Repair only generated CA distractors. Authored main MCQs, correct answer
 * slots, section IDs and legacy answered cards retain their original options.
 * Kept in the existing shared asset so cached quiz HTML needs no migration.
 */
(function () {
  'use strict';
  var REVISION = '20261104-context1';
  var normalCache=new Map(),identityCache=new Map();
  var normalize = function (s) { s=String(s||'');if(normalCache.has(s))return normalCache.get(s);var n=s.toLowerCase().normalize('NFKC').replace(/&(?:amp;)?/g,' and ').replace(/[^a-z0-9\u0900-\u097f]+/g,' ').trim();normalCache.set(s,n);return n; };
  var dictionaries = {
    country: 'India|भारत;France|फ्रांस;Germany|जर्मनी;Japan|जापान;China|चीन;Australia|ऑस्ट्रेलिया;Canada|कनाडा;Brazil|ब्राजील;Russia|रूस;United States|संयुक्त राज्य अमेरिका;United Kingdom|यूनाइटेड किंगडम;South Africa|दक्षिण अफ्रीका;Nepal|नेपाल;Bhutan|भूटान;Bangladesh|बांग्लादेश;Sri Lanka|श्रीलंका;Pakistan|पाकिस्तान;Indonesia|इंडोनेशिया;Malaysia|मलेशिया;Singapore|सिंगापुर;Thailand|थाईलैंड;Vietnam|वियतनाम;South Korea|दक्षिण कोरिया;Italy|इटली;Spain|स्पेन;Portugal|पुर्तगाल;Netherlands|नीदरलैंड;Switzerland|स्विट्जरलैंड;Sweden|स्वीडन;Norway|नॉर्वे;Finland|फिनलैंड;Denmark|डेनमार्क;Iceland|आइसलैंड;Mexico|मेक्सिको;Argentina|अर्जेंटीना;Egypt|मिस्र;Kenya|केन्या;Nigeria|नाइजीरिया;Iran|ईरान;Israel|इजराइल;United Arab Emirates|संयुक्त अरब अमीरात;Saudi Arabia|सऊदी अरब;Qatar|कतर;New Zealand|न्यूजीलैंड;Kazakhstan|कजाकिस्तान;Uzbekistan|उज्बेकिस्तान;Philippines|फिलीपींस;Maldives|मालदीव;Mauritius|मॉरीशस;Chile|चिली;Peru|पेरू;Turkey|तुर्किये;Greece|ग्रीस;Poland|पोलैंड;Ukraine|यूक्रेन;Belgium|बेल्जियम;Austria|ऑस्ट्रिया;Hungary|हंगरी;Estonia|एस्टोनिया;Luxembourg|लक्जमबर्ग;Ethiopia|इथियोपिया;Zambia|जाम्बिया;Zimbabwe|जिम्बाब्वे;Afghanistan|अफगानिस्तान;Myanmar|म्यांमार;Cambodia|कंबोडिया',
    state: 'Bihar|बिहार;Uttar Pradesh|उत्तर प्रदेश;Madhya Pradesh|मध्य प्रदेश;Rajasthan|राजस्थान;Gujarat|गुजरात;Maharashtra|महाराष्ट्र;Tamil Nadu|तमिलनाडु;Kerala|केरल;Karnataka|कर्नाटक;Andhra Pradesh|आंध्र प्रदेश;Telangana|तेलंगाना;Odisha|ओडिशा;West Bengal|पश्चिम बंगाल;Assam|असम;Jharkhand|झारखंड;Chhattisgarh|छत्तीसगढ़;Punjab|पंजाब;Haryana|हरियाणा;Uttarakhand|उत्तराखंड;Himachal Pradesh|हिमाचल प्रदेश;Sikkim|सिक्किम;Goa|गोवा;Tripura|त्रिपुरा;Manipur|मणिपुर;Meghalaya|मेघालय;Mizoram|मिजोरम;Nagaland|नागालैंड;Arunachal Pradesh|अरुणाचल प्रदेश',
    city: 'New Delhi|नई दिल्ली;Mumbai|मुंबई;Chennai|चेन्नई;Kolkata|कोलकाता;Bengaluru|बेंगलुरु;Hyderabad|हैदराबाद;Patna|पटना;Lucknow|लखनऊ;Jaipur|जयपुर;Bhopal|भोपाल;Ahmedabad|अहमदाबाद;Gandhinagar|गांधीनगर;Kochi|कोच्चि;Thiruvananthapuram|तिरुवनंतपुरम;Bhubaneswar|भुवनेश्वर;Pune|पुणे;Varanasi|वाराणसी;Ranchi|रांची;Raipur|रायपुर;Guwahati|गुवाहाटी;Paris|पेरिस;London|लंदन;Tokyo|टोक्यो;Beijing|बीजिंग;Washington|वाशिंगटन;New York|न्यूयॉर्क;Geneva|जिनेवा;Vienna|वियना;Rome|रोम;Berlin|बर्लिन;Brussels|ब्रसेल्स;Dhaka|ढाका;Kathmandu|काठमांडू;Colombo|कोलंबो;Dubai|दुबई;Doha|दोहा;Riyadh|रियाद;Jakarta|जकार्ता;Bangkok|बैंकॉक;Seoul|सियोल;Canberra|कैनबरा;Ottawa|ओटावा;Moscow|मॉस्को',
    organization: 'DRDO|डीआरडीओ;ISRO|इसरो;NASA|नासा;CSIR|सीएसआईआर;ICAR|आईसीएआर;RBI|आरबीआई;SEBI|सेबी;NITI Aayog|नीति आयोग;UNESCO|यूनेस्को;UNICEF|यूनिसेफ;UNDP|यूएनडीपी;WHO|डब्ल्यूएचओ;WTO|डब्ल्यूटीओ;IMF|आईएमएफ;World Bank|विश्व बैंक;UNEP|यूएनईपी;FAO|एफएओ;ILO|आईएलओ;International Olympic Committee|अंतरराष्ट्रीय ओलंपिक समिति',
    sport: 'Cricket|क्रिकेट;Football|फुटबॉल;Hockey|हॉकी;Badminton|बैडमिंटन;Tennis|टेनिस;Table Tennis|टेबल टेनिस;Wrestling|कुश्ती;Boxing|मुक्केबाजी;Shooting|निशानेबाजी;Archery|तीरंदाजी;Squash|स्क्वैश;Chess|शतरंज;Athletics|एथलेटिक्स;Swimming|तैराकी;Weightlifting|भारोत्तोलन',
    currency: 'Rupee|रुपया;Dollar|डॉलर;Euro|यूरो;Yen|येन;Yuan|युआन;Pound|पाउंड;Riyal|रियाल;Ruble|रूबल;Taka|टका;Baht|बाह्त;Ringgit|रिंगित;Won|वॉन',
    status: 'Least Concern|कम चिंताजनक;Near Threatened|संकट के निकट;Vulnerable|असुरक्षित;Endangered|संकटग्रस्त;Critically Endangered|गंभीर रूप से संकटग्रस्त;Extinct in the Wild|वन्य अवस्था में विलुप्त;Extinct|विलुप्त',
    language: 'Hindi|हिंदी;English|अंग्रेजी;Sanskrit|संस्कृत;Tamil|तमिल;Telugu|तेलुगु;Kannada|कन्नड़;Malayalam|मलयालम;Bengali|बांग्ला;Marathi|मराठी;Gujarati|गुजराती;Odia|ओड़िया;Assamese|असमिया;Punjabi|पंजाबी;Urdu|उर्दू;Maithili|मैथिली',
    continent: 'Asia|एशिया;Africa|अफ्रीका;Europe|यूरोप;North America|उत्तरी अमेरिका;South America|दक्षिणी अमेरिका;Australia|ऑस्ट्रेलिया;Antarctica|अंटार्कटिका'
  };
  Object.assign(dictionaries, {
    river:'Ganga|गंगा;Yamuna|यमुना;Brahmaputra|ब्रह्मपुत्र;Godavari|गोदावरी;Krishna|कृष्णा;Narmada|नर्मदा;Tapti|ताप्ती;Kaveri|कावेरी;Betwa|बेतवा;Gandak|गंडक;Kosi|कोसी;Mahanadi|महानदी;Indus|सिंधु',
    force:'Indian Army|भारतीय सेना;Indian Navy|भारतीय नौसेना;Indian Air Force|भारतीय वायु सेना;Indian Coast Guard|भारतीय तटरक्षक बल;BSF|बीएसएफ;CRPF|सीआरपीएफ;CISF|सीआईएसएफ;ITBP|आईटीबीपी;SSB|एसएसबी;Assam Rifles|असम राइफल्स',
    party:'Bharatiya Janata Party|भारतीय जनता पार्टी;Indian National Congress|भारतीय राष्ट्रीय कांग्रेस;Aam Aadmi Party|आम आदमी पार्टी;Samajwadi Party|समाजवादी पार्टी;Bahujan Samaj Party|बहुजन समाज पार्टी;Trinamool Congress|तृणमूल कांग्रेस;DMK|द्रमुक;AIADMK|अन्नाद्रमुक;BJP|भाजपा',
    company:'Walmart|वॉलमार्ट;Amazon|अमेज़न;Reliance Retail|रिलायंस रिटेल;Alibaba|अलीबाबा;Microsoft|माइक्रोसॉफ्ट;Google|गूगल;Apple|ऐपल;Tata Group|टाटा समूह',
    medal:'Gold|स्वर्ण;Silver|रजत;Bronze|कांस्य;No medal|कोई पदक नहीं',
    exerciseType:'Bilateral Army Exercise|द्विपक्षीय सैन्य अभ्यास;Bilateral Naval Exercise|द्विपक्षीय नौसैनिक अभ्यास;Bilateral Air Force Exercise|द्विपक्षीय वायु सेना अभ्यास;Multilateral Naval Exercise|बहुपक्षीय नौसैनिक अभ्यास;Tri-Service Exercise|त्रि-सेवा अभ्यास',
    role:'Chairman|अध्यक्ष;Managing Director|प्रबंध निदेशक;Chief Executive Officer|मुख्य कार्यकारी अधिकारी;Vice Chairman|उपाध्यक्ष;President|अध्यक्ष;Secretary|सचिव;Governor|राज्यपाल',
    appointment:'Appointed|नियुक्त;Reappointed|पुनर्नियुक्त;Resigned|इस्तीफा दिया;Retired|सेवानिवृत्त;Transferred|स्थानांतरित',
    event:'National Science Day|राष्ट्रीय विज्ञान दिवस;National Space Day|राष्ट्रीय अंतरिक्ष दिवस;World Environment Day|विश्व पर्यावरण दिवस;International Yoga Day|अंतरराष्ट्रीय योग दिवस;Hiroshima Day|हिरोशिमा दिवस;Nagasaki Day|नागासाकी दिवस',
    telescope:'James Webb Space Telescope|जेम्स वेब अंतरिक्ष दूरबीन;Hubble Space Telescope|हबल अंतरिक्ष दूरबीन;AstroSat|एस्ट्रोसैट;Chandra X-ray Observatory|चंद्रा एक्स-रे वेधशाला;Spitzer Space Telescope|स्पिट्जर अंतरिक्ष दूरबीन',
    body:'Brain|मस्तिष्क;Heart|हृदय;Liver|यकृत;Kidney|गुर्दा;Lungs|फेफड़े;Pancreas|अग्न्याशय;Brainstem|मस्तिष्क स्तंभ',
    pathogen:'Virus|वायरस;Bacterium|जीवाणु;Bacteria|जीवाणु;Fungus|कवक;Protozoan|प्रोटोजोआ;Plasmodium|प्लाज्मोडियम',
    disease:'Malaria|मलेरिया;Dengue|डेंगू;Tuberculosis|क्षय रोग;Cholera|हैजा;Typhoid|टाइफाइड;Hepatitis|हेपेटाइटिस;Leprosy|कुष्ठ रोग',
    term:'Inflation|मुद्रास्फीति;Deflation|अपस्फीति;Unemployment|बेरोजगारी;Fiscal deficit|राजकोषीय घाटा;Trade deficit|व्यापार घाटा;Economic growth|आर्थिक वृद्धि',
    ministry:'Ministry of Home Affairs|गृह मंत्रालय;Ministry of Defence|रक्षा मंत्रालय;Ministry of Finance|वित्त मंत्रालय;Ministry of External Affairs|विदेश मंत्रालय;Ministry of Education|शिक्षा मंत्रालय;Ministry of Agriculture and Farmers Welfare|कृषि एवं किसान कल्याण मंत्रालय;Ministry of Environment, Forest and Climate Change|पर्यावरण, वन एवं जलवायु परिवर्तन मंत्रालय;Ministry of Health and Family Welfare|स्वास्थ्य एवं परिवार कल्याण मंत्रालय',
    person:'Narendra Modi|नरेंद्र मोदी;Amit Shah|अमित शाह;Rajnath Singh|राजनाथ सिंह;Nirmala Sitharaman|निर्मला सीतारमण;S. Jaishankar|एस. जयशंकर;Piyush Goyal|पीयूष गोयल;Droupadi Murmu|द्रौपदी मुर्मू',
    'person:bowler':'Jasprit Bumrah|जसप्रीत बुमराह;Rashid Khan|राशिद खान;Mohammed Shami|मोहम्मद शमी;Yuzvendra Chahal|युजवेंद्र चहल;Ravichandran Ashwin|रविचंद्रन अश्विन',
    'person:judge':'D. Y. Chandrachud|डी. वाई. चंद्रचूड़;Sanjiv Khanna|संजीव खन्ना;B. R. Gavai|बी. आर. गवई;Surya Kant|सूर्यकांत',
    'person:military':'Bipin Rawat|बिपिन रावत;Manoj Pande|मनोज पांडे;Upendra Dwivedi|उपेंद्र द्विवेदी;Anil Chauhan|अनिल चौहान',
    'person:pageant':'Harnaaz Sandhu|हरनाज़ संधू;Manushi Chhillar|मानुषी छिल्लर;Sini Shetty|सिनी शेट्टी;Suman Rao|सुमन राव',
    'person:cricket':'Virat Kohli|विराट कोहली;Rohit Sharma|रोहित शर्मा;Jasprit Bumrah|जसप्रीत बुमराह;Rashid Khan|राशिद खान;Ravindra Jadeja|रवींद्र जडेजा',
    'person:badminton':'P. V. Sindhu|पी. वी. सिंधु;Saina Nehwal|साइना नेहवाल;Lakshya Sen|लक्ष्य सेन;Kidambi Srikanth|किदांबी श्रीकांत;Viktor Axelsen|विक्टर एक्सेलसन',
    'person:tennis':'Jannik Sinner|यानिक सिनर;Carlos Alcaraz|कार्लोस अल्काराज़;Novak Djokovic|नोवाक जोकोविच;Daniil Medvedev|डेनियल मेदवेदेव;Alexander Zverev|अलेक्जेंडर ज़्वेरेव',
    'person:racing':'Lando Norris|लैंडो नॉरिस;Max Verstappen|मैक्स वेरस्टैपेन;Lewis Hamilton|लुईस हैमिल्टन;Charles Leclerc|चार्ल्स लेक्लर्क',
    'person:film':'Amitabh Bachchan|अमिताभ बच्चन;Shah Rukh Khan|शाहरुख खान;Aamir Khan|आमिर खान;Rajinikanth|रजनीकांत;S. S. Rajamouli|एस. एस. राजामौली;A. R. Rahman|ए. आर. रहमान',
    'person:sport':'Neeraj Chopra|नीरज चोपड़ा;Virat Kohli|विराट कोहली;P. V. Sindhu|पी. वी. सिंधु;Mirabai Chanu|मीराबाई चानू;Manu Bhaker|मनु भाकर;Nikhat Zareen|निखत जरीन',
    'person:author':'Amitav Ghosh|अमिताव घोष;Vikram Seth|विक्रम सेठ;Arundhati Roy|अरुंधति रॉय;Geetanjali Shree|गीतांजलि श्री;Jhumpa Lahiri|झुम्पा लाहिड़ी'
  });
  Object.keys(dictionaries).forEach(function (key) {
    dictionaries[key] = dictionaries[key].split(';').map(function (row) { var v = row.split('|'); return {en:v[0], hi:v[1]}; });
  });
  var aliases = {usa:'united states',us:'united states',uk:'united kingdom',uae:'united arab emirates',bharat:'india',holland:'netherlands',turkiye:'turkey',delhi:'new delhi',bangalore:'bengaluru',orissa:'odisha',burma:'myanmar',peking:'beijing'};
  function identity(s) {
    if(identityCache.has(s))return identityCache.get(s);
    var n = normalize(s).replace(/^(?:shri|smt|mr|mrs|ms|dr|justice|professor|prof|sir) /, '').replace(/\b(?:the|government|govt)\b/g,'').replace(/ +/g,' ').trim();
    n=aliases[n]||n;identityCache.set(s,n);return n;
  }
  function same(a, b) {
    var x=identity(a.en).replace(/\b(?:established|founded|formation|formed|year|in)\b/g,'').replace(/ +/g,' ').trim(),y=identity(b.en).replace(/\b(?:established|founded|formation|formed|year|in)\b/g,'').replace(/ +/g,' ').trim(),hx=normalize(a.hi),hy=normalize(b.hi);
    return x===y || (hx && hx===hy) || (Math.min(x.length,y.length)>=4 && (' '+x+' ').indexOf(' '+y+' ')>=0) || (Math.min(x.length,y.length)>=4 && (' '+y+' ').indexOf(' '+x+' ')>=0);
  }
  function label(q) {
    var m=q.q.en.match(/(?:gives|for)\s+[“"'](.+)[”"']\s*\?\s*$/i);
    if(m)return normalize(m[1]);
    var exp=q.exp&&q.exp.en;if(Array.isArray(exp))exp=exp.join(' ');
    m=String(exp||'').match(/^([^:—]{2,90})\s*[:—]/);
    return m?normalize(m[1]):'';
  }
  function group(l) {
    if(/^(?:aim|objective|purpose|goal|focus)(?:s)?$/.test(l))return 'purpose';
    if(/^(?:theme|motto|slogan)(?: \d{4})?$/.test(l))return 'theme';
    if(/^(?:hq|headquarter|headquarters|head office|based in)$/.test(l))return 'headquarters';
    if(/^(?:established|founded|formed|formation|establishment|founded in|established in|instituted in)$/.test(l))return 'establishment';
    if(/^(?:location|venue|held in|held at|held|held |host city|host venue|location venue)$/.test(l))return 'venue';
    if(/^(?:members|member countries|membership)$/.test(l))return 'membership';
    return l;
  }
  var months=/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/i;
  var exactKinds=new Map();Object.keys(dictionaries).forEach(function(k){dictionaries[k].forEach(function(p){if(!exactKinds.has(identity(p.en)))exactKinds.set(identity(p.en),k);});});
  function exactKind(a) {return exactKinds.get(identity(a.en))||'';}
  function kind(q,l) {
    var a=q.a.en, n=normalize(a), words=n.split(' ').length, hint=l&&!/^(?:answer|fact|verified fact|related fact|key fact)$/.test(l)?l:q.q.en;
    var namedPerson=words<=9&&!/\b(?:appointed|reappointed|newly|released|launched|first|highest|medals|received|formed|established|organised|organized|to|for|by|of|is|are|was|were|has|have|will|won)\b/i.test(a);
    if(months.test(a)&&/\d/.test(a))return 'date';
    if(/^\s*\d{4}\s*[.।]?\s*$/.test(a)&&+n>=1500&&+n<=2100)return 'year';
    if(/[₹$€£]|\brupees?|\bcrore|\blakh|\bbillion|\bmillion/i.test(a)&&/\d/.test(a))return 'money';
    if(/\d/.test(a)&&/%|percent|per cent/i.test(a))return 'percent';
    if(/^\d+(?:st|nd|rd|th)\b/.test(a)&&words<=3)return 'rank';
    if(/^\s*[\d,.]+\s*(?:[a-z²³/%–-]+\s*)?[.।]?\s*$/i.test(a))return 'number:'+normalize(a.replace(/[\d,.]+/g,''));
    var exact=exactKind(q.a);if(exact){if(exact==='person')return 'person:leader';if(exact==='organization'){if(/DRDO|ISRO|NASA|CSIR|ICAR/i.test(a))return 'organization:research';if(/RBI|SEBI|IMF|Bank/i.test(a))return 'organization:finance';}return exact;}
    if(/^(?:prime minister|president|union minister|chief minister|dr[. ]|justice|shri )/i.test(a)&&words<=12)return 'person:official';
    if(/^ministry$|^mo |ministry of/i.test(hint)||/^Mo(?: |\.)/i.test(a))return 'ministry';
    if(/political party|^party$/.test(hint))return 'party';
    if(/\briver\b/i.test(a)&&words<=15)return 'river';
    if(/\bINS [A-Z]/.test(a))return 'warship';
    if(/bilateral|multilateral|tri.service/i.test(a)&&/exercise/i.test(a))return 'exerciseType';
    if(/^(?:chairman|president|director|secretary|governor|managing director|ceo) of /i.test(a))return 'role';
    if(/flag.*bearer|first.*medal/i.test(hint)&&namedPerson)return 'person:sport';
    if(/telescope|observatory/i.test(hint+' '+a))return 'telescope';
    if(/\b(?:army|navy|air force|coast guard)\b/i.test(a)&&words<=10)return 'force';
    if(/flag bearer|flagbearer|gold medal|first medal|most runs|most wickets|best player/i.test(hint)&&namedPerson)return 'person:sport';
    if(/^(?:inaugurated|presented|launched|unveiled|conferred) by$/i.test(hint)&&namedPerson&&!/council|organization|organisation|department|bank|board|cabinet|government/i.test(a))return 'person:official';
    if(/\b(?:actor|actress|singer|cinematographer|screenplay writer)\b/i.test(hint)&&namedPerson)return 'person:film';
    for(var placeType of ['city','state','country']){if(dictionaries[placeType].some(function(p){return new RegExp('^'+p.en+'(?:[,\\(]|[ ]+[,\\(])','i').test(a);})&&words<=12)return placeType;}

    if(/\btheme|\bmotto|\bslogan/i.test(hint))return 'theme';
    if(/\baim|\bobjective|\bpurpose|\bgoal|\bfunction|\bmandate|\bfocus|\breason|\bsignificance|\bbenefit|\buses|\bused to|\bmeasures|\bassesses/i.test(hint)||/^(?:to (?:provide|promote|improve|enhance|support|protect|ensure)|aimed at|will provide)/i.test(a))return 'purpose';
    if(/\b(?:film|movie|documentary)\b/i.test(hint)&&!/actor|actress|director|singer|cinematograph|who/i.test(hint)&&words<=15)return 'film';
    if(/(?:which|name.*) book|book title|^book$|^title of (?:the )?book/i.test(hint))return 'book';
    if(/\b(?:company|companies|retailer|firm|startup)\b/i.test(hint)&&words<=10)return 'company';
    if(/\bscientific name|\bbinomial/i.test(hint))return 'species';
    if(/team|club|franchise/i.test(hint)&&words<=8)return 'team';
    if(namedPerson&&/who|player|captain|coach|defeated|runner|singles|doubles|bearer|most runs|most wickets|best actor|best actress|director|singer|author|scientist|chief|governor|chairman|president|minister|secretary|appointed|replaced/i.test(hint)){
      var context=hint+' '+q.q.en;
      if(/miss universe|miss world|beauty pageant/i.test(context))return 'person:pageant';
      if(/chief justice|judge|high court|supreme court/i.test(context))return 'person:judge';
      if(/chief|commander|general|marshal|admiral|director/i.test(hint)&&/army|naval|navy|air force|defence|defense|military/i.test(context))return 'person:military';
      if(/actor|actress|singer|film|movie|playback/i.test(context)&&!/which (?:film|movie)/i.test(hint))return 'person:film';
      if(/bowler|wickets/i.test(context))return 'person:bowler';
      if(/cricket|bowler|batsman|batter|wickets|runs|ipl|ranji|bcci|test championship|t20/i.test(context))return 'person:cricket';
      if(/badminton|bwf|thomas cup|uber cup/i.test(context))return 'person:badminton';
      if(/tennis|wimbledon|australian open|french open|us open|roland garros/i.test(context))return 'person:tennis';
      if(/formula|grand prix|f1|racing/i.test(context))return 'person:racing';
    }
    if(/\bwho (?:inaugurated|launched|unveiled|addressed|announced)|\bwho has (?:inaugurated|launched)|participated from|inaugurated by|launched by/i.test(hint)&&namedPerson)return 'person:official';
    if(/prime minister|chief minister|president|minister|head of government|leader/i.test(hint)&&namedPerson)return 'person:leader';
    if(/minister|president|chair(?:man|person)|director|governor|secretary|commissioner|chief|appointed|succeeded|replaced|\bceo\b|\bcji\b/i.test(hint)&&namedPerson)return 'person:official';
    if(/\bwho\b|\bperson|\bfounder|\bauthor|\bwriter|\bpoet|\bscientist|\bsinger|\bactor|\bactress|\bdirector|\bwinner|\bplayer|\bcoach|\bcaptain|most runs|most wickets|defeated|runner|singles|doubles/i.test(hint)&&namedPerson&&!/\d|\b(?:ministry|organisation|organization|institute|council|university|bank|government|department)\b/i.test(a)) {
      if(/actor|actress|singer|film|cinema|playback|screenplay/i.test(hint+' '+q.q.en))return 'person:film';
      if(/player|coach|captain|runs|wickets|defeated|runner|singles|doubles|cricket|tennis|badminton|championship|athlete/i.test(hint+' '+q.q.en))return 'person:sport';
      if(/author|writer|poet|book/i.test(hint+' '+q.q.en))return 'person:author';
      return 'person';
    }
    if(/biotechnology|research (?:centre|center|institute|council)|laboratory|science (?:institute|council)/i.test(a)&&words<=18&&!/is|was|provid/i.test(a))return 'organization:research';
    if(/monetary authority|payments|bank|stock exchange/i.test(a)&&words<=12&&!/accounts|provid|to |for /i.test(a))return 'organization:finance';
    if(/\b(?:ministry|department)\b/i.test(a)&&words<=20)return 'ministry';
    if(/\b(?:institute|organisation|organization|council|university|bank|association|commission|foundation|agency|board|authority|network|corporation|fund|centre|center|cabinet|committee)\b/i.test(a)&&words<=18&&!/\b(?:is|are|was|were|has|have|providing|accounts|provides|promote|support|run by|aim|to|former|staff|member|launched|developed)\b/i.test(a))return 'organization';
    if(/headquarter|capital|\bhq\b|host city|held in|final match|held at/i.test(hint)&&words<=12)return 'city';
    if(/\bcountr(?:y|ies)\b|^nationality$/i.test(hint)&&words<=12)return 'country';
    if(/\bstate\b/i.test(hint)&&words<=6)return 'state';
    if(/\bvenue|\blocation|^held |^host$|^at$/i.test(hint)&&words<=18)return 'place';
    return '';
  }
  function tokens(s) {return normalize(s).split(' ').filter(function (t) {return t.length>2&&!/^(?:the|and|which|what|where|when|who|for|has|have|was|were|been|with|regarding|correct|correctly|fact|gives|following|this|that|2025|2026)$/.test(t);});}
  function overlap(a,b) {var bs=new Set(b);return a.filter(function(t){return bs.has(t);}).length/Math.max(1,Math.min(a.length,b.length));}
  function numericVariants(a) {
    var hits=Array.from(a.en.matchAll(/\d[\d,]*(?:\.\d+)?/g));
    // Change the amount rather than a financial year's date, when present.
    hits.sort(function(x,y){return ((+x[0]>=1900&&+x[0]<=2100)?1:0)-((+y[0]>=1900&&+y[0]<=2100)?1:0);});
    for(var h of hits){
      if(!a.hi.includes(h[0]))continue;
      var value=Number(h[0].replace(/,/g,''));if(!Number.isFinite(value))continue;
      var isDate=months.test(a.en),isYear=value>=1500&&value<=2100&&/^\d{4}$/.test(h[0]);
      var step=isYear?1:value===0?1:value<10?1:value<100?5:Math.pow(10,Math.max(0,Math.floor(Math.log10(value))-1));
      if(h[0].includes('.'))step=Math.pow(10,-h[0].split('.')[1].length);
      var out=[];
      for(var delta of [-1,1,2,-2,3,-3,4]){
        var nv=+(value+delta*step).toFixed(8);
        if(nv<=0||(isDate&&!isYear&&(nv<1||nv>28))||(/%|percent/i.test(a.en)&&nv>100))continue;
        var replacement=h[0].includes(',')?nv.toLocaleString('en-IN'):String(nv);
        var numberPattern=new RegExp('(?<![0-9])'+h[0].replace(/\./g,'\\.')+'(?![0-9])','g');
        var en=a.en.replace(numberPattern,replacement);
        // Repair ordinal endings as well as their number.
        function ordinals(s){return s.replace(/\b(\d+)(?:st|nd|rd|th)\b/g,function(_,v){var n=+v;return v+(n%100>=11&&n%100<=13?'th':({1:'st',2:'nd',3:'rd'}[n%10]||'th'));});}
        out.push({en:ordinals(en),hi:ordinals(a.hi.replace(numberPattern,replacement))});
      }
      if(out.length>=3)return out;
    }
    return [];
  }
  function subject(q,l) {
    var s=normalize(q.q.en+' '+l+' '+q.a.en),rules={
      defence:/defence|defense|military|naval|navy|army|missile|air force|ins |warship|fighter|exercise|weapon|drdo|submarine|patrol/,
      space:/space|rocket|lunar|moon|satellite|isro|nasa|telescope|astronaut|chandrayaan|gaganyaan|mars|landing/,
      health:/disease|health|medical|virus|bacteria|hepatitis|aids|dengue|malaria|tuberculosis|leprosy|cancer|mosquito|vaccine|hospital|pensioner/,
      environment:/environment|wildlife|ramsar|wetland|forest|species|biodiversity|climate|emission|rhino|tiger|lion|park|sanctuary|sustainable|conservation|plant|solar|renewable/,
      economy:/economy|economic|finance|budget|gdp|fiscal|tax|rbi|repo|bank|sebi|inflation|trade|stock|currency|export|income|investment|insurance|monetary/,
      sport:/sport|medal|cricket|football|hockey|tennis|badminton|athlete|athletics|squash|boxing|wrestling|olympic|paralympic|championship|tournament|world cup|chess|runs|wickets/,
      film:/film|cinema|movie|actor|actress|oscar|grammy|music|singer|documentary|playback|song/,
      literature:/book|author|novel|literature|writer|poet|poetry|jnanpith|literary|translated/,
      law:/constitution|article|supreme court|high court|chief justice|judicial|bill|act |legislation|parliament|legal|amendment|cabinet|law|dpsp|tribunal|insolvency/,
      schemes:/scheme|yojana|beneficiar|mission|welfare|literacy|launched|rural|agriculture|farmer|education|skill|scholarship|pension|employment|women|child/,
      science:/science|technology|supercomputer|quantum|ai |artificial intelligence|genome|robot|semiconductor|hydrogen|chemical|element|engine|fuel|nuclear|research|chip/,
      culture:/festival|temple|heritage|buddhis|pilgrimage|culture|tribal|dance|museum|monument|ancient|history|civilisation|civilization/,
      observance:/ day|anniversary|birthday|celebrated|observed|theme|independence|republic|tiranga/,
      geography:/river|lake|mountain|ocean|sea |island|geography|earthquake|volcano|flood|plate|capital|district|city|state|country/,
      appointments:/appoint|ceo|chairman|president|governor|minister|secretary|director|resigned|retired|commissioner/,
      awards:/award|honour|honor|prize|padma|nobel|winner/
    };
    var best='',score=0;Object.keys(rules).forEach(function(k){var hits=s.match(new RegExp(rules[k].source,'g'))||[];if(hits.length>score){best=k;score=hits.length;}});return best;
  }
  function compile(sections) {
    var rows=[],pool=[],plans=new Map(),report={questions:0,authored:0,generated:0,repaired:0,alreadyRelated:0,unresolved:[]};
    sections.forEach(function(s,si){s.questions.forEach(function(q,qi){
      var l=label(q),k=kind(q,l),main=/\bmain (?:mcq|current affairs)/i.test(s.title.en);
      var r={q:q,id:si+'-'+qi,label:group(l),kind:k,main:main,subject:subject(q,l),tokens:tokens(q.q.en+' '+l),answerTokens:tokens(q.a.en)};
      rows.push(r);report.questions++;
      if(main)report.authored++;
      pool.push({o:q.a,row:r});
      // Correct source answers supply candidates. Old generated distractors
      // must never be reclassified as facts (e.g. a politician as a cricketer).
    });});
    rows.forEach(function(r){
      if(r.main)return;report.generated++;
      var q=r.q,ci=q.o.findIndex(function(o){return o.en===q.a.en;});if(ci<0)return;
      var candidates=[];
      var forbidden=rows.filter(function(x){return x!==r&&q.exp_ref&&x.q.exp_ref===q.exp_ref;}).map(function(x){return x.q.a;});
      function add(o,score){if(o&&o.en&&o.hi)candidates.push({o:o,score:score});}
      var relevant=pool.filter(function(p){
        if(p.row===r)return false;
        if(r.kind==='date')return p.row.kind==='date'&&/\b\d{4}\b/.test(p.o.en)===/\b\d{4}\b/.test(q.a.en);
        if(r.kind)return p.row.kind===r.kind||(r.kind==='place'&&/^(?:city|state|country|place)$/.test(p.row.kind));
        return r.label&&r.label.length>=3&&!/^(?:fact|related fact|key fact|detail|other|note|answer|why in news)$/.test(r.label)&&p.row.label===r.label&&(!r.subject||p.row.subject===r.subject);
      });
      relevant.map(function(p){
        var score=(r.label&&r.label===p.row.label?12:0)+overlap(r.tokens,p.row.tokens)*8+overlap(r.answerTokens,p.row.answerTokens)*3;
        // An answer in a long sentence needs similarly phrased distractors.
        var ratio=p.o.en.split(/\s+/).length/Math.max(1,q.a.en.split(/\s+/).length);
        if(ratio<.4||ratio>2.5)score-=8;
        return {o:p.o,score:score};
      }).sort(function(a,b){return b.score-a.score;}).forEach(function(p){add(p.o,p.score);});
      // Numeric alternatives keep the language, unit and sentence. Never
      // fill missing choices from a random cross-category answer pool.
      var variants=numericVariants(q.a);
      variants.forEach(function(o){add(o,30);});
      if(r.kind==='person:leader'||r.kind==='person:official')dictionaries.person.forEach(function(o){add(o,1);});
      if(r.kind==='place')dictionaries.city.forEach(function(o){add(o,1);});
      if(r.kind.indexOf('organization:')===0)dictionaries.organization.filter(function(o){return kind({q:{en:''},a:o},'')===r.kind;}).forEach(function(o){add(o,2);});
      if(dictionaries[r.kind])dictionaries[r.kind].forEach(function(o){add(o,2);});
      candidates.sort(function(a,b){return b.score-a.score;});
      var chosen=[];for(var candidate of candidates){if([q.a].concat(chosen,forbidden).some(function(x){return same(x,candidate.o);}))continue;chosen.push({en:candidate.o.en,hi:candidate.o.hi});if(chosen.length===q.o.length-1)break;}
      if(chosen.length!==q.o.length-1){report.unresolved.push({id:r.id,label:r.label,kind:r.kind,q:q.q.en,a:q.a.en});return;}
      var ix=0,options=q.o.map(function(o,i){return i===ci?o:chosen[ix++];});
      // Keep an already coherent authored-looking set rather than replacing it
      // simply because another compatible candidate happens to score higher.
      var coherent=/^(?:date|year|rank|money|percent|number:|country$|state$|city$|sport$|language$|status$)/.test(r.kind)&&q.o.every(function(o,i){return i===ci||(!same(o,q.a)&&kind({q:{en:''},a:o},'')===r.kind);})&&q.o.every(function(o,i){return !q.o.slice(0,i).some(function(p){return same(o,p);});});
      if(coherent||JSON.stringify(options)===JSON.stringify(q.o)){report.alreadyRelated++;return;}
      plans.set(r.id,{q:q,options:options});report.repaired++;
    });
    return {report:report,plans:plans,apply:function(state){
      plans.forEach(function(p,id){
        // Old submitted answers remain reviewable exactly as submitted. New
        // attempts carry the option revision in the existing progress record.
        if(state&&state.answers&&state.answers[id]!==undefined&&(!state.caOptionRevision||state.caOptionRevision[id]!==REVISION))return;
        p.q.o=p.options;
      });
    }};
  }
  var api={compile:compile,kind:kind,label:label,same:same,revision:REVISION};
  window.EFP_CA_OPTIONS=api;
  function install(){
    if(api.installed)return;
    var sections;try{sections=typeof SECTIONS!=='undefined'?SECTIONS:null;}catch(_){return;}
    if(!Array.isArray(sections)||typeof window.renderQuestions!=='function')return;
    var engine=compile(sections);api.installed=true;api.report=engine.report;
    var originalRender=window.renderQuestions,originalPick=window.pick;
    window.renderQuestions=function(){try{engine.apply(typeof saved!=='undefined'?saved:null);}catch(_){}return originalRender.apply(this,arguments);};
    if(typeof originalPick==='function')window.pick=function(qi,oi){
      var id=String(current)+'-'+qi;
      if(engine.plans.has(id)&&saved.answers[id]===undefined){saved.caOptionRevision=saved.caOptionRevision||{};saved.caOptionRevision[id]=REVISION;}
      return originalPick.apply(this,arguments);
    };
    window.renderQuestions();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
/* EFP_CA_RELATABLE_OPTIONS_END */
