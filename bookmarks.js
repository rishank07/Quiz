/* ==========================================================
   Exam Fusion Prep — Per-question bookmark (⭐) + filter
   Include on every quiz page that has .question-box elements:
   <script src="PATH/TO/bookmarks.js"></script>

   Storage: localStorage, one shared JSON object keyed by
   "<page path>#<question-box id>" so it works across
   Ghatnachakra / Lucent's / Pinnacle without collisions,
   and persists on this device only (no server/account needed).
   ========================================================== */
(function () {
  var STORAGE_KEY = "efp_bookmarks";
  var STYLE_ID = "efp-bookmark-style";
  var filterActive = false;

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      ".bookmark-star{display:inline-block;margin-left:10px;font-size:22px;line-height:32px;" +
      "vertical-align:middle;color:rgba(128,128,128,0.6);cursor:pointer;user-select:none;" +
      "transition:transform .15s ease,color .15s ease;}" +
      ".bookmark-star:hover{transform:scale(1.18);}" +
      ".bookmark-star.is-bookmarked{color:#f5b301;}" +
      ".bookmark-filter-wrap{display:flex;justify-content:center;margin:10px 0 16px;}" +
      ".bookmark-filter-btn{background:rgba(128,128,128,0.15);border:1px solid rgba(128,128,128,0.4);" +
      "color:inherit;padding:8px 18px;border-radius:20px;font-size:0.85em;font-weight:700;" +
      "cursor:pointer;font-family:inherit;transition:.2s ease;}" +
      ".bookmark-filter-btn:hover{background:rgba(245,179,1,0.15);border-color:rgba(245,179,1,0.5);}" +
      ".bookmark-filter-btn.active{background:#f5b301;color:#1a1a1a;border-color:#f5b301;}" +
      ".bookmark-empty-msg{text-align:center;opacity:.7;padding:30px 10px;font-size:0.95em;display:none;}";
    document.head.appendChild(style);
  }

  function getBookmarks() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
    catch (e) { return {}; }
  }
  function saveBookmarks(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
  }
  function keyFor(qid) { return location.pathname + "#" + qid; }
  function isBookmarked(qid) { return !!getBookmarks()[keyFor(qid)]; }

  function toggleBookmark(qid, starEl) {
    var data = getBookmarks();
    var key = keyFor(qid);
    if (data[key]) delete data[key];
    else data[key] = true;
    saveBookmarks(data);
    var active = !!data[key];
    if (starEl) {
      starEl.textContent = active ? "\u2605" : "\u2606";
      starEl.classList.toggle("is-bookmarked", active);
    }
    updateBookmarkCount();
    if (filterActive) applyFilter();
  }

  function updateBookmarkCount() {
    var data = getBookmarks();
    var prefix = location.pathname + "#";
    var count = 0;
    Object.keys(data).forEach(function (k) {
      if (data[k] && k.indexOf(prefix) === 0) count++;
    });
    var countEl = document.getElementById("bookmarkCount");
    if (countEl) countEl.textContent = count;
    return count;
  }

  function injectStars() {
    var boxes = document.querySelectorAll(".question-box[id]");
    boxes.forEach(function (box) {
      var qid = box.id;
      var numEl = box.querySelector(".q-number");
      if (!numEl || box.querySelector(".bookmark-star")) return;
      var star = document.createElement("span");
      star.className = "bookmark-star";
      star.setAttribute("role", "button");
      star.setAttribute("title", "Bookmark this question");
      var active = isBookmarked(qid);
      star.textContent = active ? "\u2605" : "\u2606";
      if (active) star.classList.add("is-bookmarked");
      star.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleBookmark(qid, star);
      });
      numEl.insertAdjacentElement("afterend", star);
    });
  }

  function applyFilter() {
    var boxes = document.querySelectorAll(".question-box[id]");
    var anyVisible = false;
    boxes.forEach(function (box) {
      if (!filterActive) {
        box.style.display = "";
        anyVisible = true;
      } else {
        var show = isBookmarked(box.id);
        box.style.display = show ? "" : "none";
        if (show) anyVisible = true;
      }
    });
    var emptyMsg = document.getElementById("bookmarkEmptyMsg");
    if (emptyMsg) emptyMsg.style.display = filterActive && !anyVisible ? "block" : "none";
  }

  function toggleFilterMode() {
    filterActive = !filterActive;
    var btn = document.getElementById("bookmarkFilterBtn");
    if (btn) btn.classList.toggle("active", filterActive);
    applyFilter();
  }

  function injectFilterToggle() {
    var scoreBar = document.getElementById("scoreBar");
    if (!scoreBar || document.getElementById("bookmarkFilterBtn")) return;
    var wrap = document.createElement("div");
    wrap.className = "bookmark-filter-wrap";
    wrap.innerHTML =
      '<button type="button" id="bookmarkFilterBtn" class="bookmark-filter-btn">' +
      "\u2b50 Bookmarked (<span id=\"bookmarkCount\">0</span>)</button>";
    scoreBar.insertAdjacentElement("afterend", wrap);

    var emptyMsg = document.createElement("div");
    emptyMsg.id = "bookmarkEmptyMsg";
    emptyMsg.className = "bookmark-empty-msg";
    emptyMsg.textContent = "No bookmarked questions on this page yet — tap the ☆ next to a question number to save it here.";
    wrap.insertAdjacentElement("afterend", emptyMsg);

    document.getElementById("bookmarkFilterBtn").addEventListener("click", toggleFilterMode);
  }

  function init() {
    injectStyle();
    injectStars();
    injectFilterToggle();
    updateBookmarkCount();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
