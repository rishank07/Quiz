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
  var BACK_BUTTON_ID = "efp-app-back-button";
  var scriptUrl = document.currentScript && document.currentScript.src
    ? new URL(document.currentScript.src, window.location.href)
    : new URL("/black-mode.js", window.location.origin);
  var siteRootUrl = new URL("./", scriptUrl);
  var homeUrl = new URL("index.html", siteRootUrl).href;

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
      /* Path B: page is light-themed -> invert BODY, not the root HTML.
         Keeping the root itself genuinely black prevents the transient white
         compositor/overscroll strip some mobile browsers show while scrolling. */
      "html.efp-black-invert {" +
      "background:#000 !important;" +
      "background-image:none !important;" +
      "min-height:100%;" +
      "overscroll-behavior-y:none;" +
      "}" +
      "html.efp-black-invert body {" +
      "background-color:#fff !important;" +
      "min-height:100vh;" +
      "filter: invert(1) hue-rotate(180deg) !important;" +
      "overscroll-behavior-y:none;" +
      "}" +
      "html.efp-black-invert body img," +
      "html.efp-black-invert body video," +
      "html.efp-black-invert body svg," +
      "html.efp-black-invert body iframe," +
      "html.efp-black-invert body canvas {" +
      "filter: invert(1) hue-rotate(180deg) !important;" +
      "}" +
      /* A visible in-app Back control is required because the packaged PWA
         window does not provide normal browser navigation controls. */
      "#" + BACK_BUTTON_ID + "{" +
      "position:fixed;top:max(12px,env(safe-area-inset-top));left:max(12px,env(safe-area-inset-left));" +
      "z-index:2147483647;min-width:92px;min-height:44px;padding:10px 16px;" +
      "border:1px solid rgba(255,255,255,.42);border-radius:999px;" +
      "background:rgba(12,16,26,.94);color:#fff;font:700 15px/1.2 system-ui,-apple-system,'Segoe UI',sans-serif;" +
      "box-shadow:0 8px 24px rgba(0,0,0,.38);cursor:pointer;" +
      "display:flex;align-items:center;justify-content:center;gap:7px;" +
      "-webkit-tap-highlight-color:transparent;" +
      "}" +
      "#" + BACK_BUTTON_ID + ":hover{background:#20283a;border-color:#fff;transform:translateY(-1px);}" +
      "#" + BACK_BUTTON_ID + ":focus-visible{outline:3px solid #ffd866;outline-offset:3px;}" +
      "#" + BACK_BUTTON_ID + ":active{transform:translateY(0);}" +
      "@media(max-width:640px){#" + BACK_BUTTON_ID + "{min-width:82px;min-height:44px;padding:9px 13px;font-size:14px;}}" +
      "@media(print){#" + BACK_BUTTON_ID + "{display:none!important;}" +
      "}";
    document.head.appendChild(style);
  }

  function normalizePath(pathname) {
    var decoded;
    try {
      decoded = decodeURIComponent(pathname);
    } catch (e) {
      decoded = pathname;
    }
    return decoded.replace(/\/{2,}/g, "/").replace(/\/$/, "");
  }

  function isHomePage() {
    var currentPath = normalizePath(window.location.pathname);
    var rootPath = normalizePath(siteRootUrl.pathname);
    var indexPath = normalizePath(new URL("index.html", siteRootUrl).pathname);
    return currentPath === rootPath || currentPath === indexPath;
  }

  function hasSameOriginReferrer() {
    if (!document.referrer) return false;
    try {
      return new URL(document.referrer).origin === window.location.origin;
    } catch (e) {
      return false;
    }
  }

  function navigateBack() {
    if (window.history.length > 1 && hasSameOriginReferrer()) {
      window.history.back();
      return;
    }
    window.location.assign(homeUrl);
  }

  function installBackNavigation() {
    if (!document.body || isHomePage() || document.getElementById(BACK_BUTTON_ID)) return;

    var button = document.createElement("button");
    button.id = BACK_BUTTON_ID;
    button.type = "button";
    button.setAttribute("aria-label", "Go back to the previous page");
    button.setAttribute("title", "Back");
    button.innerHTML = "<span aria-hidden=\"true\">&#8592;</span><span>Back</span>";
    button.addEventListener("click", navigateBack);
    document.body.appendChild(button);
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

  function notify(on) {
    document.dispatchEvent(new CustomEvent("efp-black-mode-changed", { detail: { on: on } }));
  }

  // Re-reads localStorage and (re)applies the correct state. Safe to call
  // any number of times — used on initial load, on browser back/forward
  // (including bfcache restores), and when another tab changes the setting.
  function syncFromStorage() {
    var isOn = localStorage.getItem(STORAGE_KEY) === "on";
    if (isOn) {
      if (document.body) applyOnAfterBodyReady();
      else document.addEventListener("DOMContentLoaded", function () {
        applyOnAfterBodyReady();
        notify(true);
      });
    } else {
      applyOff();
    }
    if (document.body || !isOn) notify(isOn);
  }

  injectStyle();

  var wantsOn = localStorage.getItem(STORAGE_KEY) === "on";
  if (wantsOn) {
    // Hide render briefly to avoid a flash of the un-adjusted theme
    // while we wait for <body> to exist so we can detect it.
    document.documentElement.style.visibility = "hidden";
  }
  syncFromStorage();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installBackNavigation, { once: true });
  } else {
    installBackNavigation();
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
    notify(turningOn);
    return turningOn;
  };

  // Keep multiple open tabs/pages in sync with each other.
  window.addEventListener("storage", function (e) {
    if (e.key !== STORAGE_KEY) return;
    syncFromStorage();
  });

  // Browser back/forward (including pages restored straight from bfcache,
  // where scripts don't re-run at all) — always re-check and re-apply,
  // and re-sync any UI (like the toggle button label) listening for it.
  window.addEventListener("pageshow", function () {
    syncFromStorage();
    installBackNavigation();
  });

  // Support common keyboard and mouse Back controls in the packaged app too.
  window.addEventListener("keydown", function (event) {
    if (isHomePage()) return;
    if ((event.altKey && event.key === "ArrowLeft") || event.key === "BrowserBack") {
      event.preventDefault();
      navigateBack();
    }
  });
})();
