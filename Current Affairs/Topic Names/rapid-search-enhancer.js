/* ExamFusion Prep — Current Affairs Rapid Practice search UX */
(function () {
  "use strict";

  var HUB_PATH = "/current affairs/topic names/rapid practice.html";
  var INNER_PREFIX = "/current affairs/topic names/rapid practice/";
  var SEARCH_LOGIC_SRC = "/search-logic.js?v=20260918ca1";
  var CA_INDEX_SRC = "/Current%20Affairs/Topic%20Names/search-index.js?v=20260918ca1";
  var LOCAL_HIDE_STYLE_ID = "efp-ca-rapid-local-search-hide";
  var debounceTimer = 0;

  function normalizedPath() {
    var path = window.location.pathname || "/";
    try { path = decodeURIComponent(path); } catch (_) {}
    return path.replace(/\/{2,}/g, "/").replace(/\/$/, "").toLowerCase();
  }

  function isHub() {
    return normalizedPath() === HUB_PATH;
  }

  function isInnerQuiz() {
    return normalizedPath().indexOf(INNER_PREFIX) === 0;
  }

  function hideInnerSearch() {
    if (!isInnerQuiz()) return;

    if (document.head && !document.getElementById(LOCAL_HIDE_STYLE_ID)) {
      var style = document.createElement("style");
      style.id = LOCAL_HIDE_STYLE_ID;
      style.textContent = "html.efp-ca-rapid-inner input#search.search{display:none!important}";
      document.head.appendChild(style);
    }
    document.documentElement.classList.add("efp-ca-rapid-inner");

    var input = document.getElementById("search");
    if (!input) return;
    input.value = "";
    input.hidden = true;
    input.style.display = "none";
    input.setAttribute("aria-hidden", "true");
    input.tabIndex = -1;
  }

  function loadScript(id, src, readyTest) {
    return new Promise(function (resolve, reject) {
      if (readyTest()) return resolve();
      var old = document.getElementById(id);
      if (old) {
        old.addEventListener("load", function () { resolve(); }, { once: true });
        old.addEventListener("error", reject, { once: true });
        return;
      }
      var script = document.createElement("script");
      script.id = id;
      script.src = src;
      script.async = true;
      script.onload = function () { resolve(); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function compact(value) {
    var text = String(value == null ? "" : value);
    try { text = decodeURIComponent(text); } catch (_) {}
    if (typeof window.efNormalizeSearchText === "function") {
      text = window.efNormalizeSearchText(text);
    } else {
      text = text.toLowerCase().replace(/[^a-z0-9\u0900-\u097f]+/g, " ").trim();
    }
    return text.replace(/\b(current|affairs|rapid|practice|proper|bilingual|quiz|topic|wise|month|html)\b/g, " ")
      .replace(/\s+/g, "")
      .replace(/and/g, "");
  }

  function cardBucket(card) {
    var href = "";
    try { href = decodeURIComponent(card.getAttribute("href") || "").toLowerCase(); } catch (_) {}
    if (href.indexOf("/2026/month wise/") !== -1) return "2026-month";
    if (href.indexOf("/2026/topic wise/") !== -1) return "2026-topic";
    if (href.indexOf("/2025/month wise/") !== -1) return "2025-month";
    return "";
  }

  function cardKeys(card) {
    var name = card.querySelector(".quiz-name");
    var title = name ? name.textContent : card.textContent;
    var href = card.getAttribute("href") || "";
    var base = href.split("/").pop() || "";
    var keys = [compact(title), compact(base)];

    var titleKey = keys[0];
    var aliases = {
      "drdodefence": ["drdo", "defence2026", "defense2026"],
      "daysandthemes": ["daysthemes", "importantdays", "days2026"],
      "firstinindia": ["firstindia", "firstinindia2026"],
      "summitsconferences": ["summitsconference", "summits2026"],
      "scienceandtechnology": ["sciencetechnology", "scitech2026"],
      "booksandauthors": ["booksauthors", "books2026"],
      "billsandacts": ["billsacts", "acts2026"],
      "militaryexercises": ["militaryexercise", "exercises2026"],
      "centralschemes": ["centralscheme", "schemescentral2026"],
      "stateschemes": ["statescheme", "schemesstate2026"],
      "gitags": ["gi2026", "geographicalindication"],
      "independenceday": ["independenceday2026"],
      "census2027": ["census2027"],
      "index2026": ["index2026"],
      "unionbudget202627": ["unionbudget202627", "budget202627"],
      "economicsurvey202526": ["economicsurvey202526", "survey202526"],
      "commonwealthgames2026": ["commonwealthgames2026"],
      "filmawards": ["filmawards2026"]
    };

    Object.keys(aliases).forEach(function (needle) {
      if (titleKey.indexOf(needle) !== -1) keys = keys.concat(aliases[needle]);
    });

    return keys.filter(Boolean).filter(function (key, index, arr) {
      return arr.indexOf(key) === index;
    });
  }

  function fileMatchesCard(fileCompact, keys) {
    if (!fileCompact) return false;
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (!key || key.length < 4) continue;
      if (fileCompact.indexOf(key) !== -1 || key.indexOf(fileCompact) !== -1) return true;

      var noYear = key.replace(/20\d{2,4}/g, "");
      if (noYear.length >= 7 && fileCompact.indexOf(noYear) !== -1) return true;
    }
    return false;
  }

  function setHubEmptyState() {
    var groups = document.querySelectorAll(".group");
    var anyVisible = false;
    for (var i = 0; i < groups.length; i++) {
      var cards = groups[i].querySelectorAll(".quiz-card");
      var groupVisible = false;
      for (var j = 0; j < cards.length; j++) {
        if (cards[j].style.display !== "none" && !cards[j].hidden) {
          groupVisible = true;
          anyVisible = true;
          break;
        }
      }
      groups[i].style.display = groupVisible ? "" : "none";
    }
    var empty = document.getElementById("empty");
    if (empty) empty.style.display = anyVisible ? "none" : "block";
  }

  function applyGlobalHubSearch() {
    if (!isHub()) return;
    var input = document.getElementById("search");
    if (!input) return;
    var query = input.value.trim();
    if (query.length < 2) return;

    var cards = Array.prototype.slice.call(document.querySelectorAll(".quiz-card"));
    if (!cards.length) return;
    var active = document.querySelector(".filter button.active");
    var activeFilter = active ? (active.getAttribute("data-filter") || "all") : "all";

    var records = [];
    if (Array.isArray(window.CA_SEARCH_INDEX) && typeof window.efSearchRecords === "function") {
      records = window.efSearchRecords(query, window.CA_SEARCH_INDEX, {
        fields: ["f", "x"],
        limit: Math.max(10000, window.CA_SEARCH_INDEX.length),
        fuzzy: true,
        compact: true
      });
    }

    var matchedFiles = [];
    for (var r = 0; r < records.length; r++) {
      var f = compact(records[r].f || "");
      if (f && matchedFiles.indexOf(f) === -1) matchedFiles.push(f);
    }

    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var bucket = cardBucket(card);
      var categoryOkay = activeFilter === "all" || bucket === activeFilter;
      var titleOkay = typeof window.efTextMatches === "function"
        ? window.efTextMatches(query, card.textContent, true)
        : card.textContent.toLowerCase().indexOf(query.toLowerCase()) !== -1;
      var contentOkay = false;
      if (!titleOkay && matchedFiles.length) {
        var keys = cardKeys(card);
        for (var m = 0; m < matchedFiles.length; m++) {
          if (fileMatchesCard(matchedFiles[m], keys)) {
            contentOkay = true;
            break;
          }
        }
      }
      card.style.display = categoryOkay && (titleOkay || contentOkay) ? "" : "none";
    }
    setHubEmptyState();
  }

  function scheduleHubSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applyGlobalHubSearch, 120);
  }

  function initHub() {
    if (!isHub()) return;
    var input = document.getElementById("search");
    if (!input || input.dataset.efpRapidGlobalSearch === "1") return;
    input.dataset.efpRapidGlobalSearch = "1";
    input.placeholder = "Search any month, topic or fact / माह, विषय या तथ्य खोजें";
    input.setAttribute("aria-label", "Search all Current Affairs Rapid Practice content");
    input.addEventListener("input", scheduleHubSearch);

    var filters = document.querySelectorAll(".filter button");
    for (var i = 0; i < filters.length; i++) {
      filters[i].addEventListener("click", function () { setTimeout(scheduleHubSearch, 0); });
    }

    loadScript("efp-shared-search-logic", SEARCH_LOGIC_SRC, function () {
      return typeof window.efSearchRecords === "function";
    }).then(function () {
      return loadScript("efp-ca-search-index", CA_INDEX_SRC, function () {
        return Array.isArray(window.CA_SEARCH_INDEX);
      });
    }).then(function () {
      if (input.value.trim().length >= 2) scheduleHubSearch();
    }).catch(function () {
      /* Title/month search remains fully functional if the full-text index fails. */
    });
  }

  function init() {
    if (isInnerQuiz()) {
      hideInnerSearch();
      if (window.MutationObserver && document.documentElement && !window.__efpRapidLocalSearchObserver) {
        var observer = new MutationObserver(hideInnerSearch);
        observer.observe(document.documentElement, { childList: true, subtree: true });
        window.__efpRapidLocalSearchObserver = observer;
      }
      return;
    }
    if (isHub()) initHub();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
  window.addEventListener("pageshow", init);
})();
