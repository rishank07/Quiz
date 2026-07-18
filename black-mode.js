/* ==========================================================
   Exam Fusion Prep — Site-wide "Black Mode" toggle
   Include this file on EVERY page (existing + future) via:
   <script src="PATH/TO/black-mode.js"></script>
   placed inside <head>.

   Why this version is different:
   Not every page on the site uses the same dark theme —
   some (e.g. certain History/Ghatnachakra chapters) are
   LIGHT themed (light background, dark text). Forcing every
   element's background to pure black everywhere broke those
   pages (dark text became unreadable on black).

   Fix: detect each page's own theme at runtime.
     - Already-dark pages  -> just flatten the outer
       page canvas (html/body) to pure black. Cards/boxes
       keep their own original background, so all existing
       text/contrast relationships stay exactly as designed.
     - Light pages -> apply a CSS invert+hue-rotate filter
       to the whole page, which turns a light theme into a
       dark one automatically (colors keep their relative
       hue), with images/video/svg re-inverted so they still
       look normal.
   ========================================================== */
(function () {
  var STORAGE_KEY = "efp_black_mode";
  var STYLE_ID = "efp-amoled-style";

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      /* Path A: page is already dark -> just make the canvas pure black */
      "html.efp-black, html.efp-black body {" +
      "background-color:#000 !important;" +
      "background-image:none !important;" +
      "}" +
      /* Path B: page is light-themed -> invert the whole page to darkify it */
      "html.efp-black-invert {" +
      "background:#fff !important;" +
      "filter: invert(1) hue-rotate(180deg) !important;" +
      "}" +
      "html.efp-black-invert img," +
      "html.efp-black-invert video," +
      "html.efp-black-invert svg," +
      "html.efp-black-invert iframe," +
      "html.efp-black-invert canvas {" +
      "filter: invert(1) hue-rotate(180deg) !important;" +
      "}";
    document.head.appendChild(style);
  }

  function parseRGBA(str) {
    var m = str && str.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    var parts = m[1].split(",").map(function (s) { return parseFloat(s); });
    var alpha = parts.length > 3 ? parts[3] : 1;
    return { r: parts[0], g: parts[1], b: parts[2], a: alpha };
  }

  // Walk down the first-child chain looking for a reasonably opaque
  // background color to judge the page's overall theme by.
  function detectIsLight() {
    var el = document.body;
    var depth = 0;
    while (el && depth < 8) {
      var c = parseRGBA(getComputedStyle(el).backgroundColor);
      if (c && c.a >= 0.5) {
        var luminance = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
        return luminance > 0.5;
      }
      el = el.firstElementChild;
      depth++;
    }
    // Couldn't find a definitive background — default to "dark"
    // since that's this site's overwhelming default theme.
    return false;
  }

  function setModeClasses(mode) {
    var html = document.documentElement;
    html.classList.remove("efp-black", "efp-black-invert");
    if (mode === "dark") html.classList.add("efp-black");
    if (mode === "light") html.classList.add("efp-black-invert");
  }

  function applyOff() {
    setModeClasses(null);
    document.documentElement.style.visibility = "";
  }

  function applyOnAfterBodyReady() {
    var isLight = detectIsLight();
    setModeClasses(isLight ? "light" : "dark");
    document.documentElement.style.visibility = "";
  }

  injectStyle();

  var wantsOn = localStorage.getItem(STORAGE_KEY) === "on";
  if (wantsOn) {
    // Hide render briefly to avoid a flash of the un-adjusted theme
    // while we wait for <body> to exist so we can detect it.
    document.documentElement.style.visibility = "hidden";
    if (document.body) {
      applyOnAfterBodyReady();
    } else {
      document.addEventListener("DOMContentLoaded", applyOnAfterBodyReady);
    }
  }

  // Public toggle function — call from any button: onclick="toggleBlackMode()"
  window.toggleBlackMode = function () {
    var turningOn = !document.documentElement.classList.contains("efp-black") &&
      !document.documentElement.classList.contains("efp-black-invert");
    localStorage.setItem(STORAGE_KEY, turningOn ? "on" : "off");
    if (turningOn) {
      applyOnAfterBodyReady();
    } else {
      applyOff();
    }
    document.dispatchEvent(new CustomEvent("efp-black-mode-changed", { detail: { on: turningOn } }));
    return turningOn;
  };

  // Keep multiple open tabs/pages in sync with each other.
  window.addEventListener("storage", function (e) {
    if (e.key !== STORAGE_KEY) return;
    if (e.newValue === "on") {
      if (document.body) applyOnAfterBodyReady();
      else document.addEventListener("DOMContentLoaded", applyOnAfterBodyReady);
    } else {
      applyOff();
    }
  });
})();
