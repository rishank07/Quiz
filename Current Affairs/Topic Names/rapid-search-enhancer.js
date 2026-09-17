/* ExamFusion Prep — Current Affairs Rapid Practice search UX */
(function () {
  "use strict";

  var HUB_PATH = "/current affairs/topic names/rapid practice.html";
  var INNER_PREFIX = "/current affairs/topic names/rapid practice/";
  var SEARCH_LOGIC_SRC = "/search-logic.js?v=20260918ca2";
  var CA_INDEX_SRC = "/Current%20Affairs/Topic%20Names/search-index.js?v=20260918ca2";
  var LOCAL_HIDE_STYLE_ID = "efp-ca-rapid-local-search-hide";
  var debounceTimer = 0;

  var SOURCE_ALIASES = {
    "appointments": ["appointment2026"],
    "billsacts": ["billsact2026"],
    "booksauthors": ["books2026"],
    "unionbudget202627": ["budget202627"],
    "economicsurvey202526": ["economicsurvey2026"],
    "daysthemes": ["daystheme2026"],
    "militaryexercises": ["exercises2026"],
    "filmawards": ["filmsawards2026"],
    "sciencetechnology": ["sciencetech2026"],
    "stateschemes": ["statescheme2026"],
    "gitags": ["gitag2026"],
    "summitsconferences": ["summits2026"]
  };

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
        old.addEventListener("load", resolve, { once: true });
        old.addEventListener("error", reject, { once: true });
        return;
      }
      var script = document.createElement("script");
      script.id = id;
      script.src = src;
      script.async = true;
      script.onload = resolve;
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
    return text
      .replace(/\b(current|affairs|rapid|practice|proper|bilingual|quiz|topic|wise|month|html)\b/g, " ")
      .replace(/\s+/g, "")
      .replace(/and/g, "");
  }

  function fileKey(value) {
    var raw = String(value || "").replace(/\\/g, "/");
    var base = raw.split("/").pop() || raw;
    return compact(base);
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
    var titleKey = compact(name ? name.textContent : card.textContent);
    var hrefKey = fileKey(card.getAttribute("href") || "");
    var keys = [titleKey, hrefKey];

    Object.keys(SOURCE_ALIASES).forEach(function (needle) {
      if (titleKey.indexOf(needle) !== -1) keys = keys.concat(SOURCE_ALIASES[needle]);
    });

    return keys.filter(Boolean).filter(function (key, index, arr) {
      return arr.indexOf(key) === index;
    });
  }

  function fileMatchesCard(sourceKey, keys) {
    if (!sourceKey) return false;
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (!key || key.length < 4) continue;
      if (sourceKey.indexOf(key) !== -1 || key.indexOf(sourceKey) !== -1) return true;
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
        fields: ["f", "t", "x"],
        limit: Math.min(Math.max(window.CA_SEARCH_INDEX.length, 1000), 12000),
        fuzzy: true,
        compact: true
      });
    }

    var matchedFiles = [];
    var fileSeen = {};
    for (var r = 0; r < records.length; r++) {
      var key = fileKey(records[r].f || "");
      if (key && !fileSeen[key]) {
        fileSeen[key] = true;
        matchedFiles.push(key);
      }
    }

    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var categoryOkay = activeFilter === "all" || cardBucket(card) === activeFilter;
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
      filters[i].addEventListener("click", function () {
        setTimeout(scheduleHubSearch, 0);
      });
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
      /* The original month/topic search remains available if full-text loading fails. */
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
