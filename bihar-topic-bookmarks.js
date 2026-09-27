/* ExamFusion Prep — Bihar Special per-fact bookmarks + Bookmarked filter. */
(function () {
  "use strict";

  var STORAGE_KEY = "efp_bookmarks";
  var filterActive = false;
  var entries = [];
  var mode = "facts";
  var searchInput = null;

  function readBookmarks() {
    try {
      var value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch (_) {
      return {};
    }
  }

  function writeBookmarks(value) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch (_) {}
  }

  function keyFor(entry) {
    return location.pathname + "#" + entry.id;
  }

  function factNumber(entry, fallback) {
    var textNode = entry.querySelector(".en, .en-txt, .hi, .hi-txt");
    var text = textNode ? textNode.textContent : entry.textContent;
    var match = String(text || "").match(/(?:EN\s*:\s*)?(\d+)\s*\./i);
    return match ? match[1] : String(fallback);
  }

  function collectEntries() {
    var cards = Array.prototype.slice.call(document.querySelectorAll("#content .cd"));
    if (cards.length) {
      mode = "facts";
      entries = cards;
    } else {
      mode = "current-affairs";
      entries = Array.prototype.slice.call(
        document.querySelectorAll("#content .state-section .data-list li")
      ).filter(function (item) {
        return !!item.querySelector(".en-txt, .hi-txt") && item.textContent.trim().length > 0;
      });
    }

    var used = {};
    entries.forEach(function (entry, index) {
      var prefix = mode === "current-affairs" ? "bihar-ca-" : "bihar-fact-";
      var base = prefix + factNumber(entry, index + 1);
      var id = base;
      var duplicate = 2;
      while (used[id] || (document.getElementById(id) && document.getElementById(id) !== entry)) {
        id = base + "-" + duplicate++;
      }
      used[id] = true;
      entry.id = id;
      entry.classList.add("efp-bihar-bookmark-entry");
    });
  }

  function injectStyle() {
    if (document.getElementById("efp-bihar-bookmark-style")) return;
    var style = document.createElement("style");
    style.id = "efp-bihar-bookmark-style";
    style.textContent =
      ".efp-bihar-bookmark-entry{position:relative;padding-right:52px!important;scroll-margin-top:86px}" +
      ".efp-bihar-bookmark-star{position:absolute;top:9px;right:11px;z-index:2;width:36px;height:36px;" +
      "display:inline-flex;align-items:center;justify-content:center;border:0;background:transparent;color:#8b95a5;" +
      "font:700 27px/1 system-ui,-apple-system,Segoe UI,sans-serif;cursor:pointer;border-radius:50%;padding:0;" +
      "transition:transform .15s ease,color .15s ease,background .15s ease;-webkit-tap-highlight-color:transparent}" +
      ".efp-bihar-bookmark-star:hover,.efp-bihar-bookmark-star:focus-visible{transform:scale(1.12);background:rgba(245,179,1,.12);outline:none}" +
      ".efp-bihar-bookmark-star.is-bookmarked{color:#f5b301}" +
      ".efp-bihar-bookmark-filter-wrap{display:flex;justify-content:center;margin:-18px 0 18px}" +
      ".toolbar+.efp-bihar-bookmark-filter-wrap{margin:0 0 18px}" +
      ".efp-bihar-bookmark-filter{border:1px solid rgba(128,128,128,.42);background:rgba(128,128,128,.12);" +
      "color:inherit;padding:8px 18px;border-radius:22px;font:700 .86rem/1.2 system-ui,-apple-system,Segoe UI,sans-serif;" +
      "cursor:pointer;transition:.2s ease;-webkit-tap-highlight-color:transparent}" +
      ".efp-bihar-bookmark-filter:hover{border-color:rgba(245,179,1,.7);background:rgba(245,179,1,.12)}" +
      ".efp-bihar-bookmark-filter.active{color:#171717;background:#f5b301;border-color:#f5b301}" +
      ".efp-bihar-bookmark-empty{display:none;text-align:center;margin:10px 0 22px;padding:20px 12px;opacity:.76;font-weight:600}" +
      ".efp-bihar-bookmark-focus{animation:efpBiharBookmarkFocus 1.8s ease}" +
      "@keyframes efpBiharBookmarkFocus{0%,100%{box-shadow:inherit}30%{box-shadow:0 0 0 4px rgba(245,179,1,.7),0 8px 24px rgba(245,179,1,.22)}}" +
      "@media(max-width:520px){.efp-bihar-bookmark-entry{padding-right:47px!important}.efp-bihar-bookmark-star{right:7px;top:7px;width:34px;height:34px;font-size:25px}}";
    document.head.appendChild(style);
  }

  function setStarState(star, active) {
    star.textContent = active ? "★" : "☆";
    star.classList.toggle("is-bookmarked", active);
    star.setAttribute("aria-pressed", active ? "true" : "false");
    star.setAttribute("aria-label", active ? "Remove this Bihar fact from bookmarks" : "Bookmark this Bihar fact");
    star.title = active ? "Remove bookmark" : "Bookmark this fact";
  }

  function syncStars(bookmarks) {
    bookmarks = bookmarks || readBookmarks();
    entries.forEach(function (entry) {
      var star = entry.querySelector(".efp-bihar-bookmark-star");
      if (star) setStarState(star, !!bookmarks[keyFor(entry)]);
    });
  }

  function updateCount(bookmarks) {
    bookmarks = bookmarks || readBookmarks();
    var count = entries.reduce(function (total, entry) {
      return total + (bookmarks[keyFor(entry)] ? 1 : 0);
    }, 0);
    var countNode = document.getElementById("efpBiharBookmarkCount");
    if (countNode) countNode.textContent = count;
    return count;
  }

  function toggleBookmark(entry) {
    var bookmarks = readBookmarks();
    var key = keyFor(entry);
    if (bookmarks[key]) delete bookmarks[key];
    else bookmarks[key] = true;
    writeBookmarks(bookmarks);
    syncStars(bookmarks);
    updateCount(bookmarks);
    if (filterActive) applyFilter(bookmarks);
  }

  function injectStars() {
    var bookmarks = readBookmarks();
    entries.forEach(function (entry) {
      if (entry.querySelector(".efp-bihar-bookmark-star")) return;
      var star = document.createElement("button");
      star.type = "button";
      star.className = "efp-bihar-bookmark-star";
      setStarState(star, !!bookmarks[keyFor(entry)]);
      star.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        toggleBookmark(entry);
      });
      entry.appendChild(star);
    });
  }

  function searchMatches(entry) {
    var query = searchInput ? searchInput.value.toLowerCase().trim() : "";
    if (!query) return true;
    if (mode === "current-affairs") {
      var section = entry.closest(".state-section");
      var title = section && section.querySelector(".title-text");
      if (title && title.textContent.toLowerCase().indexOf(query) !== -1) return true;
    }
    return entry.textContent.toLowerCase().indexOf(query) !== -1;
  }

  function updateStaticHeadings() {
    var headings = document.querySelectorAll("#content .sh");
    headings.forEach(function (heading) {
      var sibling = heading.nextElementSibling;
      var visible = false;
      while (sibling && !sibling.classList.contains("sh")) {
        if (sibling.classList.contains("efp-bihar-bookmark-entry") && sibling.style.display !== "none") {
          visible = true;
          break;
        }
        sibling = sibling.nextElementSibling;
      }
      heading.style.display = visible ? "" : "none";
    });
  }

  function updateCurrentAffairsSections() {
    document.querySelectorAll("#content .state-section").forEach(function (section) {
      var visible = Array.prototype.some.call(
        section.querySelectorAll(".efp-bihar-bookmark-entry"),
        function (entry) { return entry.style.display !== "none"; }
      );
      section.style.display = visible ? "" : "none";
      if (visible) section.classList.add("open");
      else section.classList.remove("open");
    });
  }

  function applyFilter(bookmarks) {
    bookmarks = bookmarks || readBookmarks();
    var anyVisible = false;
    entries.forEach(function (entry) {
      var visible = !filterActive || (!!bookmarks[keyFor(entry)] && searchMatches(entry));
      entry.style.display = visible ? "" : "none";
      if (visible) anyVisible = true;
    });

    if (filterActive) {
      if (mode === "current-affairs") updateCurrentAffairsSections();
      else updateStaticHeadings();
    }

    var normalEmpty = document.getElementById("noResults");
    if (normalEmpty && filterActive) normalEmpty.style.display = "none";
    var empty = document.getElementById("efpBiharBookmarkEmpty");
    if (empty) empty.style.display = filterActive && !anyVisible ? "block" : "none";
  }

  function restoreNormalFilter() {
    document.querySelectorAll("#content .sh").forEach(function (heading) {
      heading.style.display = "";
    });
    entries.forEach(function (entry) { entry.style.display = ""; });
    if (typeof window.filterCards === "function") window.filterCards();
  }

  function injectFilter() {
    if (!searchInput || document.getElementById("efpBiharBookmarkFilter")) return;
    var wrap = document.createElement("div");
    wrap.className = "efp-bihar-bookmark-filter-wrap";
    wrap.innerHTML =
      '<button type="button" id="efpBiharBookmarkFilter" class="efp-bihar-bookmark-filter" aria-pressed="false">' +
      '⭐ Bookmarked (<span id="efpBiharBookmarkCount">0</span>)</button>';

    var toolbar = document.querySelector(".toolbar");
    if (toolbar) toolbar.insertAdjacentElement("afterend", wrap);
    else searchInput.insertAdjacentElement("afterend", wrap);

    var empty = document.createElement("div");
    empty.id = "efpBiharBookmarkEmpty";
    empty.className = "efp-bihar-bookmark-empty";
    empty.textContent = "No bookmarked Bihar facts on this page yet — tap ☆ to save one.";
    wrap.insertAdjacentElement("afterend", empty);

    document.getElementById("efpBiharBookmarkFilter").addEventListener("click", function () {
      filterActive = !filterActive;
      this.classList.toggle("active", filterActive);
      this.setAttribute("aria-pressed", filterActive ? "true" : "false");
      if (filterActive) applyFilter();
      else restoreNormalFilter();
    });
  }

  function openHashTarget() {
    var token = location.hash ? decodeURIComponent(location.hash.slice(1)) : "";
    if (!/^bihar-(?:fact|ca)-\d+(?:-\d+)?$/.test(token)) return;
    var target = document.getElementById(token);
    if (!target) return;
    var section = target.closest(".state-section");
    if (section) {
      section.style.display = "";
      section.classList.add("open");
    }
    target.style.display = "";
    requestAnimationFrame(function () {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("efp-bihar-bookmark-focus");
      setTimeout(function () { target.classList.remove("efp-bihar-bookmark-focus"); }, 1900);
    });
  }

  function refreshFromStorage() {
    var bookmarks = readBookmarks();
    syncStars(bookmarks);
    updateCount(bookmarks);
    if (filterActive) applyFilter(bookmarks);
  }

  function init() {
    searchInput = document.getElementById("searchInput");
    collectEntries();
    if (!entries.length || !searchInput) return;
    injectStyle();
    injectStars();
    injectFilter();
    updateCount();
    searchInput.addEventListener("input", function () {
      if (filterActive) setTimeout(function () { applyFilter(); }, 0);
    });
    searchInput.addEventListener("keyup", function () {
      if (filterActive) setTimeout(function () { applyFilter(); }, 0);
    });
    window.addEventListener("storage", refreshFromStorage);
    window.addEventListener("pageshow", refreshFromStorage);
    window.addEventListener("hashchange", openHashTarget);
    openHashTarget();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
