/* ExamFusion Prep — Current Affairs exact-question deep links + shared bookmarks.
 * Normal Current Affairs question cards and one-liners use the same efp_bookmarks
 * store as the rest of ExamFusion Prep, so All Bookmarks and Backup & Restore
 * automatically stay in sync.
 */
(function () {
  "use strict";

  var BOOKMARK_KEY = "efp_bookmarks";
  var STYLE_ID = "efp-ca-bookmark-style";
  var FILTER_ID = "efpCaBookmarkFilter";
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

  function keyFor(id) {
    return window.location.pathname + "#" + id;
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      ".efp-ca-bookmark-btn{display:block;margin:0 0 10px auto;border:1px solid rgba(245,179,1,.45);" +
      "background:rgba(245,179,1,.08);color:#f6c945;border-radius:999px;padding:7px 11px;" +
      "font:800 11px/1.1 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;cursor:pointer;" +
      "-webkit-tap-highlight-color:transparent;transition:transform .15s ease,background .15s ease,border-color .15s ease}" +
      ".efp-ca-bookmark-btn:hover{background:rgba(245,179,1,.16);border-color:rgba(245,179,1,.72)}" +
      ".efp-ca-bookmark-btn:active{transform:scale(.97)}" +
      ".efp-ca-bookmark-btn.is-bookmarked{background:#f5b301;color:#17130a;border-color:#f5b301}" +
      ".oneliner-item>.efp-ca-bookmark-btn{flex:0 0 auto;margin:0 0 0 auto;align-self:center}" +
      ".efp-ca-bookmark-filter-wrap{display:flex;justify-content:center;margin:18px 0 22px}" +
      ".efp-ca-bookmark-filter-btn{border:1px solid rgba(245,179,1,.45);background:rgba(15,23,42,.82);" +
      "color:inherit;border-radius:999px;padding:10px 18px;font:800 14px/1.1 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;" +
      "cursor:pointer;-webkit-tap-highlight-color:transparent;box-shadow:0 8px 24px rgba(0,0,0,.16);" +
      "transition:transform .15s ease,background .15s ease,border-color .15s ease,color .15s ease}" +
      ".efp-ca-bookmark-filter-btn:hover{border-color:rgba(245,179,1,.78);background:rgba(245,179,1,.13)}" +
      ".efp-ca-bookmark-filter-btn:active{transform:scale(.98)}" +
      ".efp-ca-bookmark-filter-btn.is-active{background:#f5b301;color:#17130a;border-color:#f5b301}" +
      ".efp-ca-bookmark-empty{display:none;margin:0 0 22px;padding:16px;border:1px dashed rgba(245,179,1,.45);" +
      "border-radius:14px;text-align:center;color:#94a3b8;font:700 14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}" +
      "@media(max-width:768px){.oneliner-item>.efp-ca-bookmark-btn{align-self:flex-end;margin:2px 0 0 auto}" +
      ".efp-ca-bookmark-filter-wrap{margin:14px 0 18px}.efp-ca-bookmark-filter-btn{padding:9px 16px;font-size:13px}}";
    document.head.appendChild(style);
  }

  function pageItems() {
    return Array.prototype.slice.call(document.querySelectorAll(".question-card[id],.oneliner-item[id]"));
  }

  function pageBookmarkCount(data) {
    return pageItems().reduce(function (count, item) {
      return count + (data[keyFor(item.id)] ? 1 : 0);
    }, 0);
  }

  function updateFilterCount() {
    var button = document.querySelector("#" + FILTER_ID + " .efp-ca-bookmark-filter-btn");
    if (!button) return;
    var count = pageBookmarkCount(getBookmarks());
    button.textContent = "⭐ Bookmarked (" + count + ")";
    button.setAttribute("aria-label", "Show bookmarked questions, " + count + " saved on this page");
  }

  function applyBookmarkFilter() {
    var data = getBookmarks();
    var visibleCount = 0;
    pageItems().forEach(function (item) {
      var show = !filterActive || !!data[keyFor(item.id)];
      item.style.display = show ? "" : "none";
      if (show && filterActive) visibleCount += 1;
    });

    var wrap = document.getElementById(FILTER_ID);
    var button = wrap && wrap.querySelector(".efp-ca-bookmark-filter-btn");
    var empty = document.getElementById("efpCaBookmarkEmpty");
    if (button) {
      button.classList.toggle("is-active", filterActive);
      button.setAttribute("aria-pressed", filterActive ? "true" : "false");
    }
    if (empty) empty.style.display = filterActive && !visibleCount ? "block" : "none";
  }

  function injectFilter() {
    if (document.getElementById(FILTER_ID)) return;
    var firstQuestion = document.querySelector(".question-card[id]");
    var firstOneLiner = document.querySelector(".oneliner-item[id]");
    var anchor = firstQuestion || (firstOneLiner && (firstOneLiner.closest(".oneliner-card") || firstOneLiner));
    if (!anchor || !anchor.parentNode) return;

    var wrap = document.createElement("div");
    wrap.id = FILTER_ID;
    wrap.className = "efp-ca-bookmark-filter-wrap";
    var button = document.createElement("button");
    button.type = "button";
    button.className = "efp-ca-bookmark-filter-btn";
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", function () {
      filterActive = !filterActive;
      applyBookmarkFilter();
    });
    wrap.appendChild(button);

    var empty = document.createElement("div");
    empty.id = "efpCaBookmarkEmpty";
    empty.className = "efp-ca-bookmark-empty";
    empty.textContent = "No saved questions on this page yet — tap Save on a question first.";

    anchor.parentNode.insertBefore(wrap, anchor);
    anchor.parentNode.insertBefore(empty, anchor);
    updateFilterCount();
  }

  function updateButton(button, active) {
    if (!button) return;
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
    updateFilterCount();
    if (filterActive) applyBookmarkFilter();
  }

  function makeButton(id) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "efp-ca-bookmark-btn";
    button.setAttribute("aria-label", "Save this Current Affairs item");
    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      toggle(id, button);
    });
    updateButton(button, !!getBookmarks()[keyFor(id)]);
    return button;
  }

  function injectBookmarks() {
    injectStyle();
    var data = getBookmarks();

    document.querySelectorAll(".question-card[id]").forEach(function (card) {
      if (card.querySelector(":scope > .efp-ca-bookmark-btn")) return;
      var id = card.id;
      var button = makeButton(id);
      updateButton(button, !!data[keyFor(id)]);
      card.insertBefore(button, card.firstChild);
    });

    document.querySelectorAll(".oneliner-item").forEach(function (item, index) {
      if (!item.id) item.id = "ca-ol-" + (index + 1);
      if (item.querySelector(":scope > .efp-ca-bookmark-btn")) return;
      var button = makeButton(item.id);
      updateButton(button, !!data[keyFor(item.id)]);
      item.appendChild(button);
    });
  }

  function syncButtons() {
    var data = getBookmarks();
    document.querySelectorAll(".efp-ca-bookmark-btn").forEach(function (button) {
      var host = button.closest(".question-card[id],.oneliner-item[id]");
      if (host) updateButton(button, !!data[keyFor(host.id)]);
    });
    updateFilterCount();
    if (filterActive) applyBookmarkFilter();
  }

  function targetId() {
    var hash = (window.location.hash || "").replace(/^#/, "");
    if (/^(?:q\d+|ca-ol-\d+)$/i.test(hash)) return hash;
    try {
      var q = new URLSearchParams(window.location.search || "").get("q");
      if (q) {
        q = String(q).replace(/^q/i, "");
        if (/^\d+$/.test(q)) return "q" + q;
      }
    } catch (_) {}
    return "";
  }

  function highlight(el) {
    if (!el) return;
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
    var id = targetId();
    if (!id) return;
    var attempt = 0;
    (function seek() {
      var el = document.getElementById(id);
      if (el) {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { highlight(el); });
        });
        return;
      }
      if (++attempt < 50) setTimeout(seek, 60);
    })();
  }

  function init() {
    injectBookmarks();
    injectFilter();
    syncButtons();
    run();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.addEventListener("hashchange", run);
  window.addEventListener("storage", function (event) {
    if (!event.key || event.key === BOOKMARK_KEY) syncButtons();
  });
  window.addEventListener("pageshow", function () {
    injectBookmarks();
    injectFilter();
    syncButtons();
    if (targetId()) setTimeout(run, 0);
  });
})();
