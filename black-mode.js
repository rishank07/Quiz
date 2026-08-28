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
  var SCREEN_FIT_CLASS = "efp-screen-fit";
  var CENTERED_SHELL_CLASS = "efp-centered-shell";
  var TABLE_SCROLL_CLASS = "efp-table-scroll";
  var VIEWPORT_GUARD_CLASS = "efp-viewport-guard";
  var responsiveListenerInstalled = false;
  var responsiveFrame = 0;
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
      /* Shared screen-fit layer. It only removes overflow constraints; it does
         not replace each page's desktop max-width, so compact laptop layouts
         remain compact while phone/tablet layouts can shrink safely. */
      "html." + SCREEN_FIT_CLASS + "{" +
      "width:100%;min-width:0;max-width:100%;" +
      "-webkit-text-size-adjust:100%;text-size-adjust:100%;" +
      "}" +
      "html." + SCREEN_FIT_CLASS + " body{min-width:0;max-width:100%;}" +
      "html." + SCREEN_FIT_CLASS + " body>*:not(script):not(style)," +
      "html." + SCREEN_FIT_CLASS + " .container," +
      "html." + SCREEN_FIT_CLASS + " .main-wrapper," +
      "html." + SCREEN_FIT_CLASS + " .quiz-container," +
      "html." + SCREEN_FIT_CLASS + " .tab-panel," +
      "html." + SCREEN_FIT_CLASS + " .card," +
      "html." + SCREEN_FIT_CLASS + " .card-body," +
      "html." + SCREEN_FIT_CLASS + " .question-box," +
      "html." + SCREEN_FIT_CLASS + " .options," +
      "html." + SCREEN_FIT_CLASS + " .option-label," +
      "html." + SCREEN_FIT_CLASS + " .opt-text," +
      "html." + SCREEN_FIT_CLASS + " .menu," +
      "html." + SCREEN_FIT_CLASS + " .menu>li," +
      "html." + SCREEN_FIT_CLASS + " .menu a{min-width:0;}" +
      "html." + SCREEN_FIT_CLASS + " img," +
      "html." + SCREEN_FIT_CLASS + " video{max-width:100%;height:auto;}" +
      "html." + SCREEN_FIT_CLASS + " svg," +
      "html." + SCREEN_FIT_CLASS + " canvas," +
      "html." + SCREEN_FIT_CLASS + " iframe," +
      "html." + SCREEN_FIT_CLASS + " input," +
      "html." + SCREEN_FIT_CLASS + " select," +
      "html." + SCREEN_FIT_CLASS + " textarea{max-width:100%;}" +
      "html." + SCREEN_FIT_CLASS + " pre{" +
      "max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;" +
      "}" +
      "html." + SCREEN_FIT_CLASS + " h1," +
      "html." + SCREEN_FIT_CLASS + " h2," +
      "html." + SCREEN_FIT_CLASS + " h3," +
      "html." + SCREEN_FIT_CLASS + " .q-text-en," +
      "html." + SCREEN_FIT_CLASS + " .q-text-hi," +
      "html." + SCREEN_FIT_CLASS + " .option-label," +
      "html." + SCREEN_FIT_CLASS + " .menu a{overflow-wrap:anywhere;}" +
      "html." + SCREEN_FIT_CLASS + " ." + TABLE_SCROLL_CLASS + "{" +
      "display:block;width:100%;max-width:100%;overflow-x:auto;" +
      "-webkit-overflow-scrolling:touch;overscroll-behavior-inline:contain;" +
      "}" +
      "html." + SCREEN_FIT_CLASS + " ." + VIEWPORT_GUARD_CLASS + "{" +
      "max-width:100%!important;min-width:0!important;" +
      "}" +
      /* Menu/selection pages use a vertically centred flex shell. On a short
         phone that can push the top of a long menu off-screen, so narrow
         screens start at the top and keep a small safe gutter. */
      "@media(max-width:1024px){" +
      "html." + CENTERED_SHELL_CLASS + " body{" +
      "align-items:flex-start!important;" +
      "padding:max(18px,env(safe-area-inset-top)) " +
      "max(14px,env(safe-area-inset-right)) " +
      "max(18px,env(safe-area-inset-bottom)) " +
      "max(14px,env(safe-area-inset-left))!important;" +
      "}" +
      "html." + CENTERED_SHELL_CLASS + " body>.container{width:100%;min-width:0;}" +
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
      "-webkit-tap-highlight-color:transparent;touch-action:manipulation;" +
      "}" +
      "html.efp-black-invert body #" + BACK_BUTTON_ID + "{" +
      "filter:invert(1) hue-rotate(180deg)!important;" +
      "}" +
      "#" + BACK_BUTTON_ID + ":hover{background:#20283a;border-color:#fff;transform:translateY(-1px);}" +
      "#" + BACK_BUTTON_ID + ":focus-visible{outline:3px solid #ffd866;outline-offset:3px;}" +
      "#" + BACK_BUTTON_ID + ":active{transform:translateY(0);}" +
      /* On phones the old top-left pill covered page headers and the YouTube
         banner. Use a compact, thumb-friendly bottom control instead. */
      "@media(max-width:700px){" +
      "#" + BACK_BUTTON_ID + "{" +
      "top:auto;bottom:max(14px,env(safe-area-inset-bottom));" +
      "left:max(14px,env(safe-area-inset-left));" +
      "width:48px;min-width:48px;height:48px;min-height:48px;padding:0;" +
      "border-radius:50%;font-size:21px;line-height:1;gap:0;" +
      "}" +
      "#" + BACK_BUTTON_ID + " .efp-back-label{display:none;}" +
      "html." + SCREEN_FIT_CLASS + " body>.container{min-width:0!important;max-width:100%!important;}" +
      "html." + CENTERED_SHELL_CLASS + " body>.container{" +
      "padding:clamp(18px,6vw,28px)!important;border-radius:min(20px,5vw);" +
      "}" +
      "html." + CENTERED_SHELL_CLASS + " body>.container h1{" +
      "font-size:clamp(1.45rem,7vw,2rem);" +
      "}" +
      "html." + SCREEN_FIT_CLASS + " .main-wrapper{" +
      "max-width:100%;padding-left:12px!important;padding-right:12px!important;" +
      "}" +
      "html." + SCREEN_FIT_CLASS + " .main-wrapper>.container{" +
      "width:100%;max-width:100%;padding-left:18px!important;padding-right:18px!important;" +
      "}" +
      "}" +
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
    if (!document.body || isHomePage()) return;
    document.documentElement.classList.add("efp-has-app-back");
    if (document.getElementById(BACK_BUTTON_ID)) return;

    var button = document.createElement("button");
    button.id = BACK_BUTTON_ID;
    button.type = "button";
    button.setAttribute("aria-label", "Go back to the previous page");
    button.setAttribute("title", "Back");
    button.innerHTML = "<span class=\"efp-back-icon\" aria-hidden=\"true\">&#8592;</span>" +
      "<span class=\"efp-back-label\">Back</span>";
    button.addEventListener("click", navigateBack);
    document.body.appendChild(button);
  }

  function firstContentElement() {
    if (!document.body) return null;
    for (var i = 0; i < document.body.children.length; i++) {
      var element = document.body.children[i];
      var tagName = element.tagName.toLowerCase();
      if (tagName !== "script" && tagName !== "style" && element.id !== BACK_BUTTON_ID) {
        return element;
      }
    }
    return null;
  }

  function markCenteredShell() {
    if (!document.body) return;
    var first = firstContentElement();
    var bodyStyle = getComputedStyle(document.body);
    var isCentredLayout = bodyStyle.display === "flex" || bodyStyle.display === "grid";
    var hasPrimaryContainer = first && first.classList.contains("container");
    document.documentElement.classList.toggle(
      CENTERED_SHELL_CLASS,
      Boolean(isCentredLayout && hasPrimaryContainer)
    );
  }

  function elementScrollsHorizontally(element) {
    if (!element) return false;
    var overflowX = getComputedStyle(element).overflowX;
    return overflowX === "auto" || overflowX === "scroll";
  }

  function wrapBareTables() {
    if (!document.body) return;
    var tables = document.querySelectorAll("table");
    for (var i = 0; i < tables.length; i++) {
      var table = tables[i];
      var parent = table.parentElement;
      if (!parent || parent.classList.contains(TABLE_SCROLL_CLASS)) continue;
      if (table.closest(".table-wrap,.tbl-wrap,.table-container,.table-responsive,.responsive-table,.overflow-x-auto")) {
        continue;
      }
      if (elementScrollsHorizontally(table) || elementScrollsHorizontally(parent)) continue;

      var wrapper = document.createElement("div");
      wrapper.className = TABLE_SCROLL_CLASS;
      wrapper.setAttribute("role", "region");
      wrapper.setAttribute("aria-label", "Scrollable data table");
      parent.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }
  }

  function updateTableAccessibility() {
    var wrappers = document.querySelectorAll("." + TABLE_SCROLL_CLASS);
    for (var i = 0; i < wrappers.length; i++) {
      var wrapper = wrappers[i];
      if (wrapper.scrollWidth > wrapper.clientWidth + 1) {
        wrapper.setAttribute("tabindex", "0");
      } else {
        wrapper.removeAttribute("tabindex");
      }
    }
  }

  function guardViewportShells() {
    if (!document.body) return;
    var viewportWidth = document.documentElement.clientWidth;
    if (!viewportWidth) return;
    var shells = document.querySelectorAll(
      "body>.container,body>.main-wrapper,body>#app,body>main," +
      ".main-wrapper>.container,.tab-panel"
    );
    for (var i = 0; i < shells.length; i++) {
      shells[i].classList.remove(VIEWPORT_GUARD_CLASS);
    }
    for (var j = 0; j < shells.length; j++) {
      var shell = shells[j];
      var rect = shell.getBoundingClientRect();
      var parentWidth = shell.parentElement
        ? shell.parentElement.getBoundingClientRect().width
        : viewportWidth;
      var availableWidth = Math.min(viewportWidth, parentWidth || viewportWidth);
      if (rect.width > availableWidth + 1) shell.classList.add(VIEWPORT_GUARD_CLASS);
    }
    updateTableAccessibility();
  }

  function queueResponsiveCheck() {
    if (responsiveFrame) window.cancelAnimationFrame(responsiveFrame);
    responsiveFrame = window.requestAnimationFrame(function () {
      responsiveFrame = 0;
      markCenteredShell();
      wrapBareTables();
      guardViewportShells();
    });
  }

  function installResponsiveFit() {
    if (!document.body) return;
    markCenteredShell();
    wrapBareTables();
    queueResponsiveCheck();
    if (!responsiveListenerInstalled) {
      window.addEventListener("resize", queueResponsiveCheck, { passive: true });
      window.addEventListener("orientationchange", queueResponsiveCheck, { passive: true });
      responsiveListenerInstalled = true;
    }
  }

  function installPageEnhancements() {
    installResponsiveFit();
    installBackNavigation();
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

  document.documentElement.classList.add(SCREEN_FIT_CLASS);
  injectStyle();

  var wantsOn = localStorage.getItem(STORAGE_KEY) === "on";
  if (wantsOn) {
    // Hide render briefly to avoid a flash of the un-adjusted theme
    // while we wait for <body> to exist so we can detect it.
    document.documentElement.style.visibility = "hidden";
  }
  syncFromStorage();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installPageEnhancements, { once: true });
  } else {
    installPageEnhancements();
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
    installPageEnhancements();
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
