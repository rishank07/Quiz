/* ==========================================================
   Exam Fusion Prep — Chapter-visited tracking + per-page progress
   Include on any chapter-LISTING page (the page with the actual
   clickable chapter links, e.g. "ChapterName.html", "Topic Names.html",
   "Bihar Special.html"):
     <script src="PATH/TO/progress.js"></script>

   Storage: localStorage, one key PER BOOK (auto-detected from the
   page's own URL path) so Ghatnachakra/Lucent's/Pinnacle/Current
   Affairs/Bihar Special/BlackBook each track their own progress
   independently, with zero per-file configuration needed.
   ========================================================== */
(function () {
  var STYLE_ID = "efp-progress-style";

  function detectBookKey() {
    var path = decodeURIComponent(location.pathname);
    if (path.indexOf("Ghatnachakra Purvalokan") !== -1) return "ghatnachakra";
    if (path.indexOf("Lucent's Objective") !== -1 || path.indexOf("Lucent&#39;s Objective") !== -1) return "lucent";
    if (path.indexOf("Pinnacle GS") !== -1) return "pinnacle";
    if (path.indexOf("Bihar Special") !== -1) return "biharspecial";
    if (path.indexOf("Current Affairs") !== -1) return "currentaffairs";
    if (path.indexOf("BlackBook") !== -1) return "blackbook";
    return "efp";
  }

  var BOOK_KEY = detectBookKey();
  var STORAGE_KEY = "efp_visited_" + BOOK_KEY;

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      ".menu a.visited-link, .nested-links a.visited-link {" +
      " opacity: 0.6; }" +
      ".menu a.visited-link::after, .nested-links a.visited-link::after {" +
      " content: ' \\2713'; font-weight: 700; }" +
      ".efp-progress-wrap {" +
      " background: rgba(128,128,128,0.12); border: 1px solid rgba(128,128,128,0.3);" +
      " border-radius: 12px; padding: 10px 16px; margin: 14px 0 20px; }" +
      ".efp-progress-header {" +
      " display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 6px; }" +
      ".efp-progress-text {" +
      " font-size: 0.85em; font-weight: 700; }" +
      ".efp-reset-btn {" +
      " background: rgba(128,128,128,0.15); border: 1px solid rgba(128,128,128,0.35);" +
      " color: inherit; font-size: 0.75em; font-weight: 600; padding: 4px 10px;" +
      " border-radius: 14px; cursor: pointer; font-family: inherit; white-space: nowrap; }" +
      ".efp-reset-btn:hover { background: rgba(220,53,69,0.18); border-color: rgba(220,53,69,0.5); }" +
      ".efp-progress-track {" +
      " background: rgba(128,128,128,0.25); border-radius: 20px; height: 8px; overflow: hidden; }" +
      ".efp-progress-fill {" +
      " background: linear-gradient(90deg,#ff6a00,#ee0979); height: 100%; width: 0%;" +
      " transition: width .4s ease; border-radius: 20px; }";
    document.head.appendChild(style);
  }

  function getVisited() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveVisited(arr) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch (e) {}
  }

  function chapterLinks() {
    var all = document.querySelectorAll(".menu a[href], .nested-links a[href]");
    var real = [];
    for (var i = 0; i < all.length; i++) {
      var a = all[i];
      if (a.classList.contains("disabled")) continue;
      var href = a.getAttribute("href") || "";
      if (href.indexOf("javascript:") === 0) continue;
      real.push(a);
    }
    return real;
  }

  function markVisited(href) {
    var visited = getVisited();
    if (visited.indexOf(href) === -1) {
      visited.push(href);
      saveVisited(visited);
    }
  }

  function applyVisitedClasses() {
    var visited = getVisited();
    chapterLinks().forEach(function (a) {
      var href = a.getAttribute("href");
      if (href && visited.indexOf(href) !== -1) {
        a.classList.add("visited-link");
      }
    });
  }

  function renderProgressBar() {
    var links = chapterLinks();
    if (!links.length) return;
    var visited = getVisited();
    var done = 0;
    links.forEach(function (a) {
      var href = a.getAttribute("href");
      if (href && visited.indexOf(href) !== -1) done++;
    });
    var total = links.length;
    var pct = total ? Math.round((done / total) * 100) : 0;

    var wrap = document.getElementById("efpProgressWrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "efpProgressWrap";
      wrap.className = "efp-progress-wrap";
      wrap.innerHTML =
        '<div class="efp-progress-header">' +
        '<div class="efp-progress-text" id="efpProgressText"></div>' +
        '<button type="button" class="efp-reset-btn" id="efpResetBtn">\u21bb Reset</button>' +
        '</div>' +
        '<div class="efp-progress-track"><div class="efp-progress-fill" id="efpProgressFill"></div></div>';
      var menu = document.querySelector(".accordion, .menu, .nested-links");
      if (menu && menu.parentNode) {
        menu.parentNode.insertBefore(wrap, menu);
      } else {
        return;
      }
      document.getElementById("efpResetBtn").addEventListener("click", resetProgress);
    }
    document.getElementById("efpProgressText").textContent =
      "\u2705 " + done + " / " + total + " Chapters (" + pct + "%)";
    document.getElementById("efpProgressFill").style.width = pct + "%";
  }

  function resetProgress() {
    if (!confirm("Reset your progress for this section? This can't be undone.")) return;
    saveVisited([]);
    chapterLinks().forEach(function (a) { a.classList.remove("visited-link"); });
    renderProgressBar();
  }

  function update() {
    applyVisitedClasses();
    renderProgressBar();
  }

  function hookLinks() {
    chapterLinks().forEach(function (a) {
      if (a.dataset.efpHooked) return;
      a.dataset.efpHooked = "1";
      a.addEventListener("click", function () {
        var href = a.getAttribute("href");
        if (href) markVisited(href);
        a.classList.add("visited-link");
      });
    });
  }

  function init() {
    injectStyle();
    hookLinks();
    update();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("pageshow", update);
})();
