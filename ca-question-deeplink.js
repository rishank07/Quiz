/* ExamFusion Prep — Current Affairs exact-question deep links + shared bookmarks.
 * Normal Current Affairs question cards and one-liners use the same efp_bookmarks
 * store as the rest of ExamFusion Prep, so All Bookmarks and Backup & Restore
 * automatically stay in sync.
 */
(function () {
  "use strict";

  var BOOKMARK_KEY = "efp_bookmarks";
  var STYLE_ID = "efp-ca-bookmark-style";

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
      "@media(max-width:768px){.oneliner-item>.efp-ca-bookmark-btn{align-self:flex-end;margin:2px 0 0 auto}}";
    document.head.appendChild(style);
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
    syncButtons();
    if (targetId()) setTimeout(run, 0);
  });
})();