/* ExamFusion Prep — Bihar Special global -> local search handoff + clear button (2026-09-19) */
(function () {
  "use strict";

  var clearButton = null;

  function syncClearButton() {
    var input = document.getElementById("searchInput");
    if (!input || !clearButton) return;
    clearButton.classList.toggle("show", input.value.length > 0);
  }

  function runLocalFilter(input) {
    try {
      if (typeof window.filterCards === "function") {
        window.filterCards();
      } else {
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("keyup", { bubbles: true }));
      }
    } catch (e) {}
  }

  function installSearchClear() {
    var input = document.getElementById("searchInput");
    if (!input || input.parentElement && input.parentElement.classList.contains("ef-bihar-search-wrap")) return;

    var style = document.createElement("style");
    style.textContent =
      ".ef-bihar-search-wrap{position:relative;width:100%;}" +
      ".ef-bihar-search-wrap>#searchInput{margin:0!important;padding-right:48px!important;}" +
      ".ef-bihar-search-clear{position:absolute;right:10px;top:50%;transform:translateY(-50%);" +
      "width:30px;height:30px;border-radius:50%;border:1px solid rgba(127,127,127,.28);" +
      "background:rgba(127,127,127,.12);color:#8b8b8b;font:600 21px/1 Arial,sans-serif;" +
      "display:none;align-items:center;justify-content:center;padding:0 0 2px;cursor:pointer;" +
      "z-index:2;-webkit-tap-highlight-color:transparent;transition:.18s ease;}" +
      ".ef-bihar-search-clear.show{display:flex;}" +
      ".ef-bihar-search-clear:hover,.ef-bihar-search-clear:focus-visible{color:#ff512f;" +
      "border-color:rgba(255,81,47,.55);background:rgba(255,81,47,.12);outline:none;}";
    document.head.appendChild(style);

    var computed = window.getComputedStyle(input);
    var wrap = document.createElement("div");
    wrap.className = "ef-bihar-search-wrap";
    wrap.style.marginTop = computed.marginTop;
    wrap.style.marginRight = computed.marginRight;
    wrap.style.marginBottom = computed.marginBottom;
    wrap.style.marginLeft = computed.marginLeft;

    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "ef-bihar-search-clear";
    clearButton.setAttribute("aria-label", "Clear search");
    clearButton.setAttribute("title", "Clear search");
    clearButton.textContent = "\u00d7";
    wrap.appendChild(clearButton);

    input.addEventListener("input", syncClearButton);
    input.addEventListener("keyup", syncClearButton);

    clearButton.addEventListener("click", function () {
      input.value = "";
      syncClearButton();
      runLocalFilter(input);

      try {
        var url = new URL(window.location.href);
        if (url.searchParams.has("efsearch")) {
          url.searchParams.delete("efsearch");
          history.replaceState(null, "", url.pathname + (url.search ? url.search : "") + url.hash);
        }
      } catch (e) {}

      input.focus();
    });

    syncClearButton();
  }

  function applySearchHandoff() {
    var query = "";
    try { query = new URLSearchParams(window.location.search).get("efsearch") || ""; } catch (e) {}
    query = query.trim();
    if (!query) return;

    var input = document.getElementById("searchInput");
    if (!input) return;
    input.value = query;
    syncClearButton();
    runLocalFilter(input);

    setTimeout(function () {
      var cards = document.querySelectorAll(".cd");
      for (var i = 0; i < cards.length; i++) {
        if (window.getComputedStyle(cards[i]).display !== "none") {
          cards[i].scrollIntoView({ behavior: "smooth", block: "center" });
          break;
        }
      }
    }, 40);
  }

  function init() {
    installSearchClear();
    applySearchHandoff();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
