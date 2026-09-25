/* ExamFusion Prep — Blackbook quiz bookmarks.
 * Uses the shared efp_bookmarks object so saved Blackbook questions appear in
 * All Bookmarks and are automatically included in Backup & Restore.
 */
(function () {
  "use strict";

  var BOOKMARK_KEY = "efp_bookmarks";
  var STYLE_ID = "efp-blackbook-quiz-bookmark-style";
  var observer = null;
  var focusTimer = null;

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

  function keyFor(id) {
    return window.location.pathname + "#" + id;
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      ".efp-bb-bookmark-btn{flex:0 0 auto;border:1px solid #f2c14e;background:#fff9e8;color:#9a6a00;" +
      "border-radius:10px;padding:6px 9px;font:800 11px/1.15 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;" +
      "cursor:pointer;white-space:nowrap;box-shadow:0 1px 2px rgba(15,23,42,.06);transition:.15s ease}" +
      ".efp-bb-bookmark-btn:hover{background:#fff3c4;border-color:#e5ad2d}" +
      ".efp-bb-bookmark-btn:active{transform:scale(.97)}" +
      ".efp-bb-bookmark-btn.is-bookmarked{background:#f5b301;border-color:#f5b301;color:#1f2937}" +
      ".efp-bb-deep-focus{outline:3px solid #f5b301!important;outline-offset:3px;border-radius:16px;" +
      "box-shadow:0 0 0 6px rgba(245,179,1,.16)!important}" +
      "html.efp-black .efp-bb-bookmark-btn,html.efp-black-invert .efp-bb-bookmark-btn{" +
      "background:#2a2517;color:#f7d66c;border-color:#8c7127}" +
      "html.efp-black .efp-bb-bookmark-btn.is-bookmarked,html.efp-black-invert .efp-bb-bookmark-btn.is-bookmarked{" +
      "background:#f5b301;color:#17130a;border-color:#f5b301}";
    document.head.appendChild(style);
  }

  function updateButton(button, active) {
    button.classList.toggle("is-bookmarked", !!active);
    button.textContent = active ? "★ Saved" : "☆ Save";
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }

  function toggle(id, button) {
    var data = getBookmarks();
    var key = keyFor(id);
    if (data[key]) delete data[key];
    else data[key] = true;
    saveBookmarks(data);
    updateButton(button, !!data[key]);
  }

  function enhanceOptions(options) {
    if (!options || !/^opts-\d+$/.test(options.id || "")) return;
    var sn = (options.id || "").replace(/^opts-/, "");
    var card = options.parentElement;
    if (!card) return;

    var id = "bbq-" + sn;
    card.id = id;
    if (card.querySelector(".efp-bb-bookmark-btn")) return;

    var button = document.createElement("button");
    button.type = "button";
    button.className = "efp-bb-bookmark-btn";
    button.setAttribute("aria-label", "Save this Blackbook quiz question");
    updateButton(button, !!getBookmarks()[keyFor(id)]);
    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      toggle(id, button);
    });

    var header = card.firstElementChild;
    if (header) header.appendChild(button);
    else card.insertBefore(button, card.firstChild);
  }

  function scan(root) {
    injectStyle();
    var scope = root && root.querySelectorAll ? root : document;
    if (scope.matches && scope.matches('[id^="opts-"]')) enhanceOptions(scope);
    scope.querySelectorAll('[id^="opts-"]').forEach(enhanceOptions);
    focusTarget();
  }

  function syncButtons() {
    var data = getBookmarks();
    document.querySelectorAll(".efp-bb-bookmark-btn").forEach(function (button) {
      var card = button.closest('[id^="bbq-"]');
      if (card) updateButton(button, !!data[keyFor(card.id)]);
    });
  }

  function targetSn() {
    var m = /^#bbq-(\d+)$/.exec(window.location.hash || "");
    return m ? Number(m[1]) : 0;
  }

  function openTargetLetter() {
    var sn = targetSn();
    if (!sn) return;
    try {
      if (typeof vocabData === "undefined" || !Array.isArray(vocabData)) return;
      var item = vocabData.find(function (entry) { return Number(entry && entry.sn) === sn; });
      if (!item || !item.word) return;
      var letter = String(item.word).trim().charAt(0).toUpperCase();
      if (letter && typeof showSection === "function") showSection(letter);
    } catch (_) {}
  }

  function focusTarget() {
    var sn = targetSn();
    if (!sn) return;
    clearTimeout(focusTimer);
    focusTimer = setTimeout(function () {
      var el = document.getElementById("bbq-" + sn);
      if (!el) return;
      try { el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" }); }
      catch (_) { el.scrollIntoView(); }
      el.classList.add("efp-bb-deep-focus");
      clearTimeout(el.__efpBookmarkFocusTimer);
      el.__efpBookmarkFocusTimer = setTimeout(function () {
        el.classList.remove("efp-bb-deep-focus");
      }, 4200);
    }, 20);
  }

  function init() {
    scan(document);
    if (targetSn()) {
      openTargetLetter();
      var tries = 0;
      (function seek() {
        scan(document);
        if (document.getElementById("bbq-" + targetSn())) return;
        if (++tries < 120) setTimeout(seek, 60);
      })();
    }

    observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        Array.prototype.forEach.call(m.addedNodes || [], function (node) {
          if (node && node.nodeType === 1) scan(node);
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

  window.addEventListener("hashchange", function () {
    openTargetLetter();
    focusTarget();
  });
  window.addEventListener("pageshow", function () {
    scan(document);
    syncButtons();
    if (targetSn()) {
      openTargetLetter();
      focusTarget();
    }
  });
  window.addEventListener("storage", function (event) {
    if (!event.key || event.key === BOOKMARK_KEY) syncButtons();
  });
})();