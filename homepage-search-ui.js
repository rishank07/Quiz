/* ExamFusion Prep — smart homepage search presentation.
 *
 * Keeps the existing search indexes/workers and deep-link routing intact while
 * adding balanced filters, streaming status, cross-source de-duplication,
 * compact result limits, spelling suggestions and lightweight GA events.
 */
(function () {
  "use strict";

  var box = document.getElementById("searchBox");
  var menuList = document.getElementById("menuList");
  var noResults = document.getElementById("noResults");
  var searchWrap = document.querySelector(".search-wrap");
  if (!box || !menuList || !noResults || !searchWrap) return;

  var CATEGORY_ORDER = ["all", "practice", "pyq", "current", "crux", "books", "mindmaps"];
  var CATEGORY_META = {
    all: { label: "All", icon: "fa-border-all" },
    practice: { label: "Practice", icon: "fa-pen-to-square" },
    pyq: { label: "PYQ", icon: "fa-file-circle-question" },
    current: { label: "Current Affairs", icon: "fa-newspaper" },
    crux: { label: "Crux / PDF", icon: "fa-lightbulb" },
    books: { label: "Books", icon: "fa-book-open" },
    mindmaps: { label: "Mind Maps", icon: "fa-sitemap" }
  };

  var tools = document.createElement("section");
  tools.id = "efSearchTools";
  tools.className = "ef-search-tools";
  tools.hidden = true;
  tools.setAttribute("aria-label", "Search controls");
  tools.innerHTML =
    '<div class="ef-search-state" role="status" aria-live="polite">' +
      '<span class="ef-search-spinner" aria-hidden="true"></span>' +
      '<span id="efSearchStatus">Search all study hubs</span>' +
    '</div>' +
    '<div class="ef-search-filters" role="tablist" aria-label="Filter search results"></div>';
  searchWrap.insertAdjacentElement("afterend", tools);

  var filterBar = tools.querySelector(".ef-search-filters");
  var statusText = tools.querySelector("#efSearchStatus");
  CATEGORY_ORDER.forEach(function (category) {
    var meta = CATEGORY_META[category];
    var button = document.createElement("button");
    button.type = "button";
    button.className = "ef-search-filter";
    button.setAttribute("role", "tab");
    button.setAttribute("data-search-filter", category);
    button.setAttribute("aria-selected", category === "all" ? "true" : "false");
    button.innerHTML = '<i class="fa-solid ' + meta.icon + '" aria-hidden="true"></i>' +
      '<span>' + meta.label + '</span><small data-filter-count>0</small>';
    filterBar.appendChild(button);
  });

  var moreButton = document.createElement("button");
  moreButton.type = "button";
  moreButton.id = "efSearchMore";
  moreButton.className = "ef-search-more";
  moreButton.hidden = true;
  moreButton.innerHTML = '<span>Show more results</span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';
  menuList.insertAdjacentElement("afterend", moreButton);

  var activeFilter = "all";
  var extraPages = 0;
  var isSearching = false;
  var currentQuery = "";
  var completionTimer = null;
  var analyticsTimer = null;
  var lastAnalyticsQuery = "";
  var scheduled = false;

  function normalized(value) {
    if (typeof efNormalizeSearchText === "function") return efNormalizeSearchText(value);
    return String(value == null ? "" : value).toLowerCase().replace(/\s+/g, " ").trim();
  }

  function escapeHtml(value) {
    if (typeof efEscapeHtml === "function") return efEscapeHtml(value);
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  function inferCategory(li) {
    if (li.dataset.searchCategory) return li.dataset.searchCategory;
    var anchor = li.querySelector("a[href]");
    var href = anchor ? (anchor.getAttribute("href") || "").toLowerCase() : "";
    try { href = decodeURIComponent(href); } catch (_) {}
    var text = (li.textContent || "").toLowerCase();
    var joined = href + " " + text;
    var category = "";
    if (joined.indexOf("original practice") !== -1 || joined.indexOf("original%20practice") !== -1) category = "practice";
    else if (/\bpyq\b|previous year|previous%20year/.test(joined)) category = "pyq";
    else if (joined.indexOf("current affairs") !== -1 || joined.indexOf("current%20affairs") !== -1) category = "current";
    else if (joined.indexOf("crux-tricks") !== -1 || joined.indexOf("crux &") !== -1 || joined.indexOf("memory tricks") !== -1) category = "crux";
    else if (joined.indexOf("mind maps") !== -1 || joined.indexOf("mind%20maps") !== -1) category = "mindmaps";
    else if (/\/books\/|ghatna|lucent|pinnacle|blackbook|bihar special|maths speed booster/.test(joined)) category = "books";
    else category = li.hasAttribute("data-deepresult") ? "books" : "misc";
    li.dataset.searchCategory = category;
    return category;
  }

  function resultKey(li) {
    var anchor = li.querySelector("a[href]");
    if (!anchor) return "";
    try {
      var url = new URL(anchor.href, document.baseURI);
      url.searchParams.delete("from");
      return url.pathname.replace(/\/+$/, "") + url.search + url.hash;
    } catch (_) {
      return anchor.getAttribute("href") || "";
    }
  }

  function decorateResult(li) {
    if (li.querySelector(".group-title")) {
      li.classList.add("ef-search-source-header");
      return;
    }
    var anchor = li.querySelector("a[href]");
    if (!anchor) return;
    var category = inferCategory(li);
    li.classList.add("ef-search-result-item");
    if (li.dataset.searchDecorated === "1") return;
    li.dataset.searchDecorated = "1";
    var linkText = li.querySelector(".link-text");
    if (!linkText) return;
    var badge = document.createElement("span");
    badge.className = "ef-search-type-badge ef-search-type-" + category;
    badge.textContent = CATEGORY_META[category].label;
    linkText.insertBefore(badge, linkText.firstChild);
  }

  function allResultItems() {
    var rows = Array.prototype.slice.call(menuList.querySelectorAll("li[data-deepresult]"));
    rows.forEach(decorateResult);
    return rows.filter(function (li) {
      return li.classList.contains("ef-search-result-item");
    });
  }

  function baseResultItems() {
    var rows = Array.prototype.slice.call(menuList.children);
    return rows.filter(function (li) {
      if (li.hasAttribute("data-deepresult") || li.hasAttribute("data-group-head") || li.classList.contains("hidden")) return false;
      if (!li.querySelector("a[href]")) return false;
      li.classList.add("ef-search-base-result");
      inferCategory(li);
      return true;
    });
  }

  function countByCategory(items, baseItems) {
    var counts = { all: 0, practice: 0, pyq: 0, current: 0, crux: 0, books: 0, mindmaps: 0 };
    items.concat(baseItems || []).forEach(function (li) {
      if (li.classList.contains("ef-search-duplicate")) return;
      var category = inferCategory(li);
      counts.all++;
      if (counts[category] != null) counts[category]++;
    });
    return counts;
  }

  function applyDeduplication(items, baseItems) {
    var seen = {};
    (baseItems || []).forEach(function (li) {
      var key = resultKey(li);
      if (key) seen[key] = true;
    });
    items.forEach(function (li) {
      li.classList.remove("ef-search-duplicate");
      var key = resultKey(li);
      if (!key) return;
      if (seen[key]) li.classList.add("ef-search-duplicate");
      else seen[key] = true;
    });
  }

  function applyBaseFilter(baseItems) {
    baseItems.forEach(function (li) {
      var category = inferCategory(li);
      var matches = activeFilter === "all" || category === activeFilter;
      li.classList.toggle("ef-search-base-filtered", !matches);
    });
  }

  function updateFilterButtons(counts) {
    filterBar.querySelectorAll("[data-search-filter]").forEach(function (button) {
      var category = button.dataset.searchFilter;
      var countHolder = button.querySelector("[data-filter-count]");
      if (countHolder) countHolder.textContent = counts[category] || 0;
      button.setAttribute("aria-selected", category === activeFilter ? "true" : "false");
      button.disabled = category !== "all" && !counts[category];
    });
  }

  function applyFilterAndLimit(items, counts) {
    var categorySeen = {};
    var hiddenByLimit = 0;
    var perCategoryLimit = 4 + extraPages * 4;
    var singleLimit = 12 + extraPages * 10;

    items.forEach(function (li) {
      var category = inferCategory(li);
      var categoryMatches = activeFilter === "all" || activeFilter === category;
      var duplicate = li.classList.contains("ef-search-duplicate");
      li.classList.toggle("ef-search-filtered", !categoryMatches || duplicate);
      li.classList.remove("ef-search-overflow");
      if (!categoryMatches || duplicate) return;

      categorySeen[category] = (categorySeen[category] || 0) + 1;
      var beyondLimit = activeFilter === "all"
        ? categorySeen[category] > perCategoryLimit
        : categorySeen[category] > singleLimit;
      if (beyondLimit) {
        li.classList.add("ef-search-overflow");
        hiddenByLimit++;
      }
    });

    moreButton.hidden = hiddenByLimit === 0;
    if (hiddenByLimit) {
      moreButton.querySelector("span").textContent = "Show " + hiddenByLimit + " more result" + (hiddenByLimit === 1 ? "" : "s");
    }
    return hiddenByLimit;
  }

  function visibleResultCount() {
    return menuList.querySelectorAll("li.ef-search-result-item:not(.ef-search-filtered):not(.ef-search-overflow)").length;
  }

  function totalResultCount() {
    var deepCount = menuList.querySelectorAll("li.ef-search-result-item:not(.ef-search-duplicate)").length;
    return deepCount + baseResultItems().length;
  }

  function setStatus(count) {
    if (!currentQuery) return;
    if (isSearching) {
      statusText.textContent = count
        ? count + " matches found · searching remaining hubs…"
        : "Searching questions, PDFs and study hubs…";
    } else {
      statusText.textContent = count
        ? count + " relevant result" + (count === 1 ? "" : "s") + " found"
        : "No matching result found";
    }
  }

  function closestSpellingSuggestion(query) {
    if (typeof SEARCH_INDEX === "undefined" || typeof efBoundedEditDistance !== "function") return "";
    var queryTerms = normalized(query).split(" ").filter(Boolean);
    if (!queryTerms.length) return "";
    var vocabulary = {};
    for (var i = 0; i < SEARCH_INDEX.length; i++) {
      var record = SEARCH_INDEX[i];
      var text = normalized((record.title || "") + " " + (record.hi || "") + " " + (record.breadcrumb || ""));
      text.split(" ").forEach(function (word) {
        if (word.length >= 4 && word.length <= 24) vocabulary[word] = (vocabulary[word] || 0) + 1;
      });
    }

    var changed = false;
    var corrected = queryTerms.map(function (term) {
      if (vocabulary[term] || term.length < 4) return term;
      var best = term;
      var bestDistance = 3;
      var bestFrequency = 0;
      Object.keys(vocabulary).forEach(function (candidate) {
        if (candidate.charAt(0) !== term.charAt(0) || Math.abs(candidate.length - term.length) > 2) return;
        var distance = efBoundedEditDistance(term, candidate, 2);
        if (distance < bestDistance || (distance === bestDistance && vocabulary[candidate] > bestFrequency)) {
          best = candidate;
          bestDistance = distance;
          bestFrequency = vocabulary[candidate];
        }
      });
      if (best !== term && bestDistance <= 2) changed = true;
      return best;
    });
    return changed ? corrected.join(" ") : "";
  }

  function setQuery(value) {
    box.value = value;
    box.focus();
    box.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function renderNoResults() {
    var suggestion = closestSpellingSuggestion(currentQuery);
    var terms = normalized(currentQuery).split(" ").filter(Boolean);
    var suggestions = [];
    if (suggestion && suggestion !== normalized(currentQuery)) suggestions.push(suggestion);
    if (terms.length > 1) {
      terms.slice(0, 2).forEach(function (term) {
        if (term.length > 2 && suggestions.indexOf(term) === -1) suggestions.push(term);
      });
    }
    var chips = suggestions.slice(0, 3).map(function (value) {
      return '<button type="button" data-search-suggestion="' + escapeHtml(value) + '">' + escapeHtml(value) + '</button>';
    }).join("");
    noResults.innerHTML =
      '<i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>' +
      '<strong>कुछ नहीं मिला / No result found</strong>' +
      '<span>Spelling check करें या छोटा keyword try करें।</span>' +
      (chips ? '<div class="ef-search-suggestions"><small>Try:</small>' + chips + '</div>' : "");
    noResults.classList.add("show");
  }

  function restoreNoResults() {
    noResults.innerHTML = "कुछ नहीं मिला। कोई अलग chapter, topic या subject नाम try करें।";
    noResults.classList.remove("show");
  }

  function reconcile() {
    scheduled = false;
    if (!currentQuery || currentQuery.length < 2) return;
    var items = allResultItems();
    var baseItems = baseResultItems();
    applyDeduplication(items, baseItems);
    var counts = countByCategory(items, baseItems);
    updateFilterButtons(counts);
    applyBaseFilter(baseItems);
    applyFilterAndLimit(items, counts);
    setStatus(counts.all);
    if (!isSearching) {
      if (counts.all === 0) renderNoResults();
      else noResults.classList.remove("show");
    }
  }

  function scheduleReconcile() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(reconcile);
  }

  function sendSearchAnalytics(query, count) {
    clearTimeout(analyticsTimer);
    analyticsTimer = setTimeout(function () {
      if (query !== currentQuery || query === lastAnalyticsQuery || typeof window.gtag !== "function") return;
      lastAnalyticsQuery = query;
      window.gtag("event", "search", { search_term: query, result_count: count });
    }, 500);
  }

  function finishSearch(query) {
    if (query !== currentQuery) return;
    isSearching = false;
    tools.classList.remove("is-searching");
    menuList.classList.remove("ef-search-loading");
    clearTimeout(completionTimer);
    scheduleReconcile();
    setTimeout(function () {
      if (query !== currentQuery) return;
      var count = totalResultCount();
      setStatus(count);
      if (!count) renderNoResults();
      sendSearchAnalytics(query, count);
    }, 80);
  }

  box.addEventListener("input", function () {
    var query = box.value.trim();
    currentQuery = query;
    activeFilter = "all";
    extraPages = 0;
    clearTimeout(completionTimer);
    clearTimeout(analyticsTimer);
    if (query.length < 2) {
      isSearching = false;
      tools.hidden = true;
      tools.classList.remove("is-searching");
      moreButton.hidden = true;
      menuList.classList.remove("ef-smart-search-active", "ef-search-loading");
      restoreNoResults();
      return;
    }
    isSearching = true;
    tools.hidden = false;
    tools.classList.add("is-searching");
    menuList.classList.add("ef-smart-search-active", "ef-search-loading");
    statusText.textContent = "Searching questions, PDFs and study hubs…";
    noResults.classList.remove("show");
    updateFilterButtons({ all: 0, practice: 0, pyq: 0, current: 0, crux: 0, books: 0, mindmaps: 0 });
    completionTimer = setTimeout(function () { finishSearch(query); }, query.length < 3 ? 3500 : 20000);
    scheduleReconcile();
  });

  filterBar.addEventListener("click", function (event) {
    var button = event.target.closest("[data-search-filter]");
    if (!button || button.disabled) return;
    activeFilter = button.dataset.searchFilter;
    extraPages = 0;
    scheduleReconcile();
    menuList.scrollTop = 0;
  });

  moreButton.addEventListener("click", function () {
    extraPages++;
    scheduleReconcile();
  });

  noResults.addEventListener("click", function (event) {
    var button = event.target.closest("[data-search-suggestion]");
    if (button) setQuery(button.dataset.searchSuggestion || "");
  });

  menuList.addEventListener("click", function (event) {
    var row = event.target.closest("li.ef-search-result-item, li.ef-search-base-result");
    if (!row || typeof window.gtag !== "function") return;
    var anchor = row.querySelector("a[href]");
    window.gtag("event", "search_result_click", {
      search_term: currentQuery,
      search_category: inferCategory(row),
      link_url: anchor ? anchor.pathname : ""
    });
  });

  window.addEventListener("efp-search-state", function (event) {
    var detail = event.detail || {};
    if (!detail.query || detail.query !== currentQuery) return;
    if (detail.phase === "core-done" && currentQuery.length < 3) finishSearch(currentQuery);
    if (detail.phase === "fulltext-done") finishSearch(currentQuery);
  });

  var observer = new MutationObserver(scheduleReconcile);
  observer.observe(menuList, { childList: true, subtree: true });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && document.activeElement === box && box.value) setQuery("");
  });

  window.addEventListener("pageshow", function () {
    if (!box.value.trim()) {
      tools.hidden = true;
      moreButton.hidden = true;
      menuList.classList.remove("ef-smart-search-active", "ef-search-loading");
    }
  });
})();
