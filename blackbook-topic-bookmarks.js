/* ExamFusion Prep — Blackbook topic bookmarks.
 * Adds a Save button to every Blackbook topic entry and stores it in the
 * shared efp_bookmarks object used by All Bookmarks and Backup & Restore.
 */
(function () {
  "use strict";

  var BOOKMARK_KEY = "efp_bookmarks";
  var STYLE_ID = "efp-blackbook-topic-bookmark-style";
  var FILTER_ID = "efp-bb-topic-filter";
  var EMPTY_ID = "efp-bb-topic-empty";
  var TOKEN_PREFIX = "bbt-";
  var observer = null;
  var focusTimer = null;
  var filterTimer = null;
  var filterActive = false;

  function safeParse(raw, fallback) {
    try {
      var value = JSON.parse(raw);
      return value == null ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  function getBookmarks() {
    var value = safeParse(localStorage.getItem(BOOKMARK_KEY), {});
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function saveBookmarks(value) {
    try { localStorage.setItem(BOOKMARK_KEY, JSON.stringify(value)); } catch (_) {}
  }

  function entryId(sn) {
    return TOKEN_PREFIX + sn;
  }

  function keyFor(sn) {
    return window.location.pathname + "#" + entryId(sn);
  }

  function savedSerials() {
    var prefix = window.location.pathname + "#" + TOKEN_PREFIX;
    var saved = {};
    var data = getBookmarks();
    Object.keys(data).forEach(function (key) {
      if (!data[key] || key.indexOf(prefix) !== 0) return;
      var sn = Number(key.slice(prefix.length));
      if (Number.isInteger(sn) && sn > 0) saved[sn] = true;
    });
    return saved;
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      ".efp-bb-topic-save{display:inline-flex;align-items:center;justify-content:center;gap:4px;" +
      "min-height:30px;border:1px solid #f2c14e;background:#fff9e8;color:#9a6a00;border-radius:10px;" +
      "padding:6px 9px;font:800 11px/1.15 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;" +
      "cursor:pointer;white-space:nowrap;box-shadow:0 1px 2px rgba(15,23,42,.06);transition:.15s ease}" +
      ".efp-bb-topic-save:hover{background:#fff3c4;border-color:#e5ad2d}" +
      ".efp-bb-topic-save:active{transform:scale(.97)}" +
      ".efp-bb-topic-save.is-bookmarked{background:#f5b301;border-color:#f5b301;color:#1f2937}" +
      "tr .efp-bb-topic-save{margin-left:8px;vertical-align:middle}" +
      ".vocab-card>.efp-bb-topic-save{width:100%;margin-top:12px}" +
      "#" + FILTER_ID + "{display:inline-flex;align-items:center;justify-content:center;gap:6px;" +
      "min-height:46px;border:1px solid #d7b451;background:#fff9e8;color:#805b00;border-radius:999px;" +
      "padding:10px 16px;font:800 13px/1.1 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;" +
      "cursor:pointer;white-space:nowrap;transition:.15s ease}" +
      "#" + FILTER_ID + ":hover{background:#fff3c4;border-color:#e5ad2d}" +
      "#" + FILTER_ID + ".is-active{background:#f5b301;border-color:#f5b301;color:#1f2937;box-shadow:0 4px 12px rgba(245,179,1,.25)}" +
      ".efp-bb-topic-filter-hidden{display:none!important}" +
      "#" + EMPTY_ID + "{display:none;margin:14px auto 0;max-width:620px;padding:14px 18px;text-align:center;" +
      "border:1px dashed #d7b451;border-radius:14px;background:#fff9e8;color:#805b00;font:700 13px/1.4 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}" +
      "#" + EMPTY_ID + ".is-visible{display:block}" +
      ".efp-bb-topic-focus{outline:3px solid #f5b301!important;outline-offset:3px;" +
      "box-shadow:0 0 0 6px rgba(245,179,1,.16)!important}" +
      "html.efp-black .efp-bb-topic-save,html.efp-black-invert .efp-bb-topic-save{" +
      "background:#2a2517;color:#f7d66c;border-color:#8c7127}" +
      "html.efp-black .efp-bb-topic-save.is-bookmarked,html.efp-black-invert .efp-bb-topic-save.is-bookmarked{" +
      "background:#f5b301;color:#17130a;border-color:#f5b301}" +
      "html.efp-black #" + FILTER_ID + ",html.efp-black-invert #" + FILTER_ID + "," +
      "html.efp-black #" + EMPTY_ID + ",html.efp-black-invert #" + EMPTY_ID + "{" +
      "background:#2a2517;color:#f7d66c;border-color:#8c7127}" +
      "html.efp-black #" + FILTER_ID + ".is-active,html.efp-black-invert #" + FILTER_ID + ".is-active{" +
      "background:#f5b301;color:#17130a;border-color:#f5b301}";
    document.head.appendChild(style);
  }

  function syncFilterControl() {
    var button = document.getElementById(FILTER_ID);
    if (!button) return;
    var count = Object.keys(savedSerials()).length;
    button.textContent = "🔖 Bookmarked (" + count + ")";
    button.classList.toggle("is-active", filterActive);
    button.setAttribute("aria-pressed", filterActive ? "true" : "false");
  }

  function clearPageSearch() {
    var input = document.getElementById("search-input");
    if (!input || !input.value) return;
    input.value = "";
    try { input.dispatchEvent(new Event("input", { bubbles: true })); } catch (_) {}
  }

  function applyFilter() {
    var saved = savedSerials();
    document.querySelectorAll('[data-efp-bb-sn]').forEach(function (entry) {
      if (entry.classList.contains("efp-bb-topic-save")) return;
      var sn = Number(entry.getAttribute("data-efp-bb-sn"));
      entry.classList.toggle("efp-bb-topic-filter-hidden", filterActive && !saved[sn]);
    });
    var empty = document.getElementById(EMPTY_ID);
    if (empty) empty.classList.toggle("is-visible", filterActive && Object.keys(saved).length === 0);
    syncFilterControl();
  }

  function scheduleFilter() {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(function () {
      filterTimer = null;
      applyFilter();
    }, 0);
  }

  function ensureFilterControl() {
    if (document.getElementById(FILTER_ID)) return;
    var input = document.getElementById("search-input");
    if (!input || !input.parentElement || !input.parentElement.parentElement) return;
    var row = input.parentElement.parentElement;
    var actions = input.parentElement.nextElementSibling;
    if (!actions) return;

    var button = document.createElement("button");
    button.type = "button";
    button.id = FILTER_ID;
    button.setAttribute("aria-label", "Show bookmarked entries on this page");
    button.addEventListener("click", function () {
      filterActive = !filterActive;
      if (filterActive) clearPageSearch();
      applyFilter();
    });
    actions.insertBefore(button, actions.firstChild);

    var empty = document.createElement("div");
    empty.id = EMPTY_ID;
    empty.textContent = "No bookmarked entries on this page yet. Tap ☆ Save on any entry first.";
    row.parentElement.insertBefore(empty, row.nextSibling);
    syncFilterControl();
  }

  function updateButton(button, active) {
    button.classList.toggle("is-bookmarked", !!active);
    button.textContent = active ? "★ Saved" : "☆ Save";
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }

  function toggle(sn, button) {
    var data = getBookmarks();
    var key = keyFor(sn);
    if (data[key]) delete data[key];
    else data[key] = true;
    saveBookmarks(data);
    syncButtons(sn);
    updateButton(button, !!data[key]);
    applyFilter();
  }

  function serialFromRow(row) {
    if (!row || row.tagName !== "TR") return 0;
    var first = row.querySelector("td");
    var value = first ? Number(String(first.textContent || "").trim()) : 0;
    return Number.isInteger(value) && value > 0 ? value : 0;
  }

  function serialFromCard(card) {
    if (!card || !card.classList || !card.classList.contains("vocab-card")) return 0;
    var match = String(card.textContent || "").match(/#\s*(\d+)/);
    var value = match ? Number(match[1]) : 0;
    return Number.isInteger(value) && value > 0 ? value : 0;
  }

  function enhanceEntry(entry, sn, bookmarks) {
    if (!entry || !sn || entry.querySelector(".efp-bb-topic-save")) return;
    entry.id = entryId(sn);
    entry.setAttribute("data-efp-bb-sn", String(sn));

    var button = document.createElement("button");
    button.type = "button";
    button.className = "efp-bb-topic-save";
    button.setAttribute("data-efp-bb-sn", String(sn));
    button.setAttribute("aria-label", "Save Blackbook entry " + sn);
    updateButton(button, !!bookmarks[keyFor(sn)]);
    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      toggle(sn, button);
    });

    if (entry.tagName === "TR") {
      var lastCell = entry.lastElementChild;
      if (lastCell && lastCell.tagName === "TD") lastCell.appendChild(button);
      else entry.appendChild(button);
    } else {
      entry.appendChild(button);
    }
  }

  function scan(root, bookmarks) {
    injectStyle();
    ensureFilterControl();
    bookmarks = bookmarks || getBookmarks();
    var scope = root && root.querySelectorAll ? root : document;
    if (scope.matches) {
      if (scope.matches("tbody tr")) enhanceEntry(scope, serialFromRow(scope), bookmarks);
      if (scope.matches("#mobile-cards > .vocab-card")) enhanceEntry(scope, serialFromCard(scope), bookmarks);
    }
    scope.querySelectorAll("tbody tr").forEach(function (row) {
      enhanceEntry(row, serialFromRow(row), bookmarks);
    });
    scope.querySelectorAll("#mobile-cards > .vocab-card").forEach(function (card) {
      enhanceEntry(card, serialFromCard(card), bookmarks);
    });
    scheduleFilter();
    focusTarget();
  }

  function syncButtons(onlySn) {
    var data = getBookmarks();
    document.querySelectorAll(".efp-bb-topic-save").forEach(function (button) {
      var sn = Number(button.getAttribute("data-efp-bb-sn"));
      if (!sn || (onlySn && sn !== Number(onlySn))) return;
      updateButton(button, !!data[keyFor(sn)]);
    });
  }

  function targetSn() {
    var match = /^#bbt-(\d+)$/.exec(window.location.hash || "");
    return match ? Number(match[1]) : 0;
  }

  function focusTarget() {
    var sn = targetSn();
    if (!sn) return;
    var el = document.getElementById(entryId(sn));
    if (!el || el.__efpBbTopicFocused) return;
    el.__efpBbTopicFocused = true;
    clearTimeout(focusTimer);
    focusTimer = setTimeout(function () {
      try { el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" }); }
      catch (_) { el.scrollIntoView(); }
      el.classList.add("efp-bb-topic-focus");
      clearTimeout(el.__efpBbTopicFocusTimer);
      el.__efpBbTopicFocusTimer = setTimeout(function () {
        el.classList.remove("efp-bb-topic-focus");
      }, 4200);
    }, 20);
  }

  function init() {
    scan(document);
    observer = new MutationObserver(function (mutations) {
      var bookmarks = getBookmarks();
      mutations.forEach(function (mutation) {
        Array.prototype.forEach.call(mutation.addedNodes || [], function (node) {
          if (node && node.nodeType === 1) scan(node, bookmarks);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.addEventListener("hashchange", focusTarget);
  window.addEventListener("pageshow", function () {
    scan(document);
    syncButtons();
  });
  window.addEventListener("storage", function (event) {
    if (!event.key || event.key === BOOKMARK_KEY) {
      syncButtons();
      applyFilter();
    }
  });
})();
