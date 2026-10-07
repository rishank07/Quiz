/* ExamFusion Prep — site-wide Home navigation */
(function () {
  "use strict";

  var BUTTON_ID = "efp-home-button";
  var STYLE_ID = "efp-home-button-style";
  var BACK_BUTTON_ID = "efp-app-back-button";
  var CRUX_BACK_CLASS = "efp-crux-back-fallback";
  var MATHS_FIT_STYLE_ID = "efp-maths-speed-booster-fit";
  var CA_RAPID_ENHANCER_ID = "efp-ca-rapid-search-enhancer";
  var MOVE_TOP_ID = "efp-move-top-button";
  var MOVE_TOP_STYLE_ID = "efp-move-top-style";
  var MOVE_TOP_SHOW_AFTER = 420;
  var MOVE_TOP_MIN_SCROLL_RANGE = 300;

  function normalizedPath(pathname) {
    var path = pathname || "/";
    try { path = decodeURIComponent(path); } catch (_) {}
    path = path.replace(/\/{2,}/g, "/");
    if (path.length > 1) path = path.replace(/\/$/, "");
    return path;
  }

  function isMainHomePage() {
    var path = normalizedPath(window.location.pathname).toLowerCase();
    return path === "/" || path === "/index.html";
  }

  function isMindMapsSubjectDashboard() {
    return normalizedPath(window.location.pathname).toLowerCase() === "/mind maps/subjectname.html";
  }

  function isMindMapsPage() {
    var path = normalizedPath(window.location.pathname).toLowerCase();
    return path === "/mind maps" || path.indexOf("/mind maps/") === 0;
  }

  function isOriginalPracticePage() {
    return normalizedPath(window.location.pathname).toLowerCase().indexOf("/original practice/") === 0;
  }

  function isOriginalPracticeIndex() {
    var path = normalizedPath(window.location.pathname).toLowerCase();
    return path === "/original practice" || path === "/original practice/index.html";
  }

  function isCruxTricksPage() {
    var path = normalizedPath(window.location.pathname).toLowerCase();
    return path === "/crux-tricks" || path.indexOf("/crux-tricks/") === 0;
  }

  function isCruxTricksRoot() {
    var path = normalizedPath(window.location.pathname).toLowerCase();
    return path === "/crux-tricks" || path === "/crux-tricks/index.html";
  }

  function isMathsSpeedBoosterPage() {
    return normalizedPath(window.location.pathname).toLowerCase() === "/maths speed booster/math-speed-booster.html";
  }

  function isCurrentAffairsRapidPracticePage() {
    var path = normalizedPath(window.location.pathname).toLowerCase();
    return path === "/current affairs/topic names/rapid practice.html" ||
      path.indexOf("/current affairs/topic names/rapid practice/") === 0;
  }

  function ensureCurrentAffairsRapidEnhancer() {
    if (!isCurrentAffairsRapidPracticePage() || !document.head || document.getElementById(CA_RAPID_ENHANCER_ID)) return;
    var script = document.createElement("script");
    script.id = CA_RAPID_ENHANCER_ID;
    script.src = "/Current%20Affairs/Topic%20Names/rapid-search-enhancer.js?v=20261004searchaudit1";
    script.async = false;
    document.head.appendChild(script);
  }

  function ensureMathsSpeedBoosterFitStyles() {
    if (!isMathsSpeedBoosterPage() || !document.head || document.getElementById(MATHS_FIT_STYLE_ID)) return;
    var link = document.createElement("link");
    link.id = MATHS_FIT_STYLE_ID;
    link.rel = "stylesheet";
    link.href = "/Maths%20Speed%20Booster/math-speed-booster-fit.css?v=20260906fit1";
    document.head.appendChild(link);
  }

  function removeLegacyBackToTop() {
    /* Shared Move to Top owns this job wherever home-nav is present.
       Remove old page-specific arrows to avoid duplicate/overlapping controls. */
    var buttons = document.querySelectorAll(".back-to-top");
    for (var i = 0; i < buttons.length; i++) buttons[i].remove();
  }

  function removeLegacyOriginalPracticeHome() {
    if (!isOriginalPracticePage()) return;

    /* Inner Original Practice pages dynamically add a legacy topbar containing
       Original Practice Home / ExamFusion Home. The shared global Back + Home
       controls replace that navigation completely, so remove the whole bar. */
    var topbars = document.querySelectorAll(".efp-op-topbar");
    for (var i = 0; i < topbars.length; i++) topbars[i].remove();

    /* The Original Practice landing page has its older standalone ← Home link. */
    var links = document.querySelectorAll(".topnav > a[href='../index.html']");
    for (var j = 0; j < links.length; j++) links[j].remove();
  }

  function watchLegacyOriginalPracticeHome() {
    if (!isOriginalPracticePage() || !document.documentElement) return;
    if (window.__efpOriginalPracticeHomeCleanupObserver) {
      removeLegacyOriginalPracticeHome();
      return;
    }
    removeLegacyOriginalPracticeHome();
    var observer = new MutationObserver(function () {
      removeLegacyOriginalPracticeHome();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.__efpOriginalPracticeHomeCleanupObserver = observer;
  }

  function removeLegacyCruxNavigation() {
    if (!isCruxTricksPage()) return;

    /* Crux landing page had its own ← Home control. The global Home button now
       owns that job, so keep the header brand only. */
    var homeLinks = document.querySelectorAll(
      ".topbar > a.home-btn[href='../index.html'], .topbar > a.home-btn[href='/index.html'], .topbar > a.home-btn[href='/']"
    );
    for (var i = 0; i < homeLinks.length; i++) homeLinks[i].remove();

    /* Viewer and My Pages had separate header Back buttons. Replace only those
       top-level controls; hierarchy buttons inside the Crux SPA (Sources,
       Subjects, Parts, etc.) deliberately remain untouched. */
    var oldBackButtons = document.querySelectorAll(
      ".reader-head > #backBtn, header.top > #backBtn"
    );
    for (var j = 0; j < oldBackButtons.length; j++) oldBackButtons[j].remove();
  }

  function watchLegacyCruxNavigation() {
    if (!isCruxTricksPage() || !document.documentElement) return;
    if (window.__efpCruxNavCleanupObserver) {
      removeLegacyCruxNavigation();
      return;
    }
    removeLegacyCruxNavigation();
    var observer = new MutationObserver(function () {
      removeLegacyCruxNavigation();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.__efpCruxNavCleanupObserver = observer;
  }

  function hasSameOriginReferrer() {
    if (!document.referrer) return false;
    try {
      return new URL(document.referrer).origin === window.location.origin;
    } catch (_) {
      return false;
    }
  }

  function hasExpectedCruxViewerReferrer() {
    if (!document.referrer) return false;
    try {
      var referrer = new URL(document.referrer, window.location.href);
      if (referrer.origin !== window.location.origin) return false;
      var path = normalizedPath(referrer.pathname).toLowerCase();
      var source = new URLSearchParams(window.location.search).get("from");
      if (source === "crux-index") {
        return path === "/crux-tricks" || path === "/crux-tricks/index.html";
      }
      if (source === "crux-page") {
        return path === "/crux-tricks/my-pages.html";
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  function navigateCruxBack() {
    var source = new URLSearchParams(window.location.search).get("from");
    var hasCruxMarker = isCruxTricksPage() &&
      (source === "crux-index" || source === "crux-page");
    var canUseHistory = hasCruxMarker
      ? hasExpectedCruxViewerReferrer()
      : hasSameOriginReferrer();
    if (window.history.length > 1 && canUseHistory) {
      window.history.back();
      return;
    }
    window.location.assign(isCruxTricksRoot() ? "/" : "/Crux-Tricks/index.html");
  }

  function navigateDefaultBack() {
    /* The Practice index exits to site Home. Inner pages retain their
       hierarchy; back-nav.js handles their in-page steps first. */
    if (isOriginalPracticePage()) {
      if (isOriginalPracticeIndex() && window.EFP_APP_SESSION) window.EFP_APP_SESSION.markHome();
      window.location.assign(isOriginalPracticeIndex() ? "/" : "/Original%20Practice/index.html");
      return;
    }

    if (window.history.length > 1 && hasSameOriginReferrer()) {
      window.history.back();
      return;
    }
    /* back-nav.js captures this click first and uses the generated logical
       parent map for direct/external opens. Home is only a last-resort fallback. */
    window.location.assign("/");
  }

  function installCruxBackButton() {
    if (!isCruxTricksPage() || !document.documentElement || !document.head) return;
    if (document.getElementById(BACK_BUTTON_ID)) return;

    document.documentElement.classList.add(CRUX_BACK_CLASS);
    var button = document.createElement("button");
    button.id = BACK_BUTTON_ID;
    button.type = "button";
    button.setAttribute("aria-label", "Go back to the previous page");
    button.setAttribute("aria-keyshortcuts", "Alt+ArrowLeft");
    button.setAttribute("title", "Back");
    button.innerHTML = "<span class=\"efp-back-icon\" aria-hidden=\"true\">&#8592;</span>" +
      "<span class=\"efp-back-label\">Back</span>";
    button.addEventListener("click", navigateCruxBack);
    document.documentElement.appendChild(button);
  }

  function installOriginalPracticeDirectBackCapture() {
    if (window.__efpOriginalPracticeDirectBackCaptureInstalled) return;
    window.__efpOriginalPracticeDirectBackCaptureInstalled = true;

    /* Only the Practice index exits directly to site Home. Inner Practice
       screens need their Quiz -> Chapters -> All Subjects Back hierarchy. */
    document.addEventListener("click", function (event) {
      if (!isOriginalPracticeIndex() || !event.target || !event.target.closest) return;
      var button = event.target.closest("#" + BACK_BUTTON_ID);
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
      if (window.EFP_APP_SESSION) window.EFP_APP_SESSION.markHome();
      window.location.assign("/");
    }, true);
  }

  installOriginalPracticeDirectBackCapture();

  function installDefaultBackButton() {
    if (!document.documentElement || !document.head || isMainHomePage()) return;
    if (document.getElementById(BACK_BUTTON_ID)) return;
    if (isCruxTricksPage()) {
      installCruxBackButton();
      return;
    }

    /* Reuse the same global Back styling on ordinary pages that do not load a
       legacy Back provider (for example the Current Affairs Rapid Practice hub). */
    document.documentElement.classList.add(CRUX_BACK_CLASS);
    var button = document.createElement("button");
    button.id = BACK_BUTTON_ID;
    button.type = "button";
    button.setAttribute("aria-label", "Go back to the previous page");
    button.setAttribute("aria-keyshortcuts", "Alt+ArrowLeft");
    button.setAttribute("title", "Back");
    button.innerHTML = "<span class=\"efp-back-icon\" aria-hidden=\"true\">&#8592;</span>" +
      "<span class=\"efp-back-label\">Back</span>";
    button.addEventListener("click", navigateDefaultBack);
    document.documentElement.appendChild(button);
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      "#" + BUTTON_ID + "{" +
      "position:fixed!important;top:max(12px,env(safe-area-inset-top))!important;" +
      "right:max(12px,env(safe-area-inset-right))!important;bottom:auto!important;left:auto!important;" +
      "z-index:2147483647!important;height:46px;min-height:46px;min-width:104px;padding:0 18px;box-sizing:border-box;" +
      "display:flex;align-items:center;justify-content:center;gap:8px;" +
      "border:1px solid rgba(246,217,138,.68);border-radius:999px;text-decoration:none!important;" +
      "background:linear-gradient(135deg,rgba(12,18,32,.98),rgba(27,38,59,.97));" +
      "-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);" +
      "color:#fff!important;font:700 15px/1 system-ui,-apple-system,'Segoe UI',sans-serif!important;" +
      "box-shadow:0 10px 28px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.1);" +
      "cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;" +
      "transition:background .18s ease,border-color .18s ease,box-shadow .18s ease,transform .18s ease;" +
      "}" +
      "#" + BUTTON_ID + " .efp-home-icon{color:#f6d98a;font-size:19px;line-height:1;}" +
      "#" + BUTTON_ID + ":hover{background:linear-gradient(135deg,#1d2a43,#293a59);border-color:#ffe7a6;box-shadow:0 12px 32px rgba(0,0,0,.46);transform:translateY(-1px);}" +
      "#" + BUTTON_ID + ":focus-visible{outline:3px solid #ffd866;outline-offset:3px;}" +
      "#" + BUTTON_ID + ":active{transform:translateY(0);}" +

      /* Crux pages pre-date black-mode.js, so home-nav supplies the same global
         Back appearance there without importing the theme controller. */
      "html." + CRUX_BACK_CLASS + " #" + BACK_BUTTON_ID + "{" +
      "position:fixed!important;top:max(12px,env(safe-area-inset-top))!important;" +
      "left:max(12px,env(safe-area-inset-left))!important;right:auto!important;bottom:auto!important;" +
      "z-index:2147483647!important;width:auto;min-width:96px;height:46px;min-height:46px;padding:0 17px;" +
      "border:1px solid rgba(246,217,138,.62);border-radius:999px;" +
      "background:linear-gradient(135deg,rgba(12,18,32,.98),rgba(27,38,59,.96));" +
      "-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);" +
      "color:#fff;font:700 15px/1.2 system-ui,-apple-system,'Segoe UI',sans-serif;" +
      "box-shadow:0 10px 28px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.1);cursor:pointer;" +
      "display:flex;align-items:center;justify-content:center;gap:8px;" +
      "transition:background .18s ease,border-color .18s ease,box-shadow .18s ease,transform .18s ease;" +
      "-webkit-tap-highlight-color:transparent;touch-action:manipulation;" +
      "}" +
      "html." + CRUX_BACK_CLASS + " #" + BACK_BUTTON_ID + " .efp-back-icon{color:#f6d98a;font-size:19px;line-height:1;}" +
      "html." + CRUX_BACK_CLASS + " #" + BACK_BUTTON_ID + ":hover{background:linear-gradient(135deg,#1d2a43,#293a59);border-color:#ffe7a6;box-shadow:0 12px 32px rgba(0,0,0,.46);transform:translateY(-1px);}" +
      "html." + CRUX_BACK_CLASS + " #" + BACK_BUTTON_ID + ":focus-visible{outline:3px solid #ffd866;outline-offset:3px;}" +
      "html." + CRUX_BACK_CLASS + " #" + BACK_BUTTON_ID + ":active{transform:translateY(0);}" +

      /* Desktop: force both global controls into the upper corners, including
         legacy pages that black-mode.js previously classified as bottom-docked. */
      "@media(min-width:1200px){" +
      "html #" + BACK_BUTTON_ID + ",html.efp-back-bottom #" + BACK_BUTTON_ID + "{" +
      "top:max(12px,env(safe-area-inset-top))!important;" +
      "left:max(12px,env(safe-area-inset-left))!important;right:auto!important;bottom:auto!important;" +
      "}" +
      "}" +

      /* Mind Maps desktop: keep the header clear and use equal-size labeled
         Back/Home buttons at the bottom corners. */
      "@media(min-width:1200px){" +
      "html.efp-mindmaps-page #" + BUTTON_ID + ",html.efp-mindmaps-page #" + BACK_BUTTON_ID + "{" +
      "top:auto!important;bottom:max(16px,env(safe-area-inset-bottom))!important;" +
      "width:108px!important;min-width:108px!important;height:44px!important;min-height:44px!important;" +
      "padding:0 14px!important;border-radius:999px!important;gap:8px!important;" +
      "box-shadow:0 6px 18px rgba(0,0,0,.28)!important;" +
      "}" +
      "html.efp-mindmaps-page #" + BUTTON_ID + "{left:auto!important;right:max(18px,env(safe-area-inset-right))!important;}" +
      "html.efp-mindmaps-page #" + BACK_BUTTON_ID + "{left:max(18px,env(safe-area-inset-left))!important;right:auto!important;}" +
      "html.efp-mindmaps-page #" + BUTTON_ID + " .efp-home-label,html.efp-mindmaps-page #" + BACK_BUTTON_ID + " .efp-back-label{display:inline!important;}" +
      "html.efp-mindmaps-page #" + BUTTON_ID + " .efp-home-icon,html.efp-mindmaps-page #" + BACK_BUTTON_ID + " .efp-back-icon{font-size:18px!important;}" +
      "}" +

      /* Mobile/tablet: compact lower-corner controls. Dark mode stays almost
         transparent; light mode gets the stronger dark filled treatment below. */
      "@media(max-width:1199px){" +
      "#" + BUTTON_ID + "{" +
      "top:auto!important;left:auto!important;" +
      "right:max(10px,env(safe-area-inset-right))!important;" +
      "bottom:max(10px,env(safe-area-inset-bottom))!important;" +
      "width:44px!important;min-width:44px!important;height:44px!important;min-height:44px!important;" +
      "padding:0!important;border-radius:50%!important;gap:0!important;" +
      "background:rgba(8,14,24,.025)!important;" +
      "border-color:rgba(246,217,138,.58)!important;" +
      "box-shadow:none!important;-webkit-backdrop-filter:blur(6px)!important;backdrop-filter:blur(6px)!important;" +
      "}" +
      "#" + BUTTON_ID + ":hover,#" + BUTTON_ID + ":active{" +
      "background:rgba(8,14,24,.08)!important;box-shadow:none!important;transform:none!important;" +
      "}" +
      "#" + BUTTON_ID + " .efp-home-label{display:none!important;}" +
      "#" + BUTTON_ID + " .efp-home-icon{font-size:20px!important;}" +
      "html." + CRUX_BACK_CLASS + " #" + BACK_BUTTON_ID + ",html #" + BACK_BUTTON_ID + "{" +
      "top:auto!important;right:auto!important;" +
      "bottom:max(10px,env(safe-area-inset-bottom))!important;left:max(10px,env(safe-area-inset-left))!important;" +
      "width:44px!important;min-width:44px!important;height:44px!important;min-height:44px!important;padding:0!important;" +
      "border-radius:50%!important;gap:0!important;" +
      "background:rgba(8,14,24,.025)!important;" +
      "border-color:rgba(246,217,138,.58)!important;" +
      "box-shadow:none!important;-webkit-backdrop-filter:blur(6px)!important;backdrop-filter:blur(6px)!important;" +
      "}" +
      "html." + CRUX_BACK_CLASS + " #" + BACK_BUTTON_ID + " .efp-back-label,html #" + BACK_BUTTON_ID + " .efp-back-label{display:none!important;}" +
      "html." + CRUX_BACK_CLASS + " #" + BACK_BUTTON_ID + " .efp-back-icon,html #" + BACK_BUTTON_ID + " .efp-back-icon{font-size:20px!important;}" +
      "html." + CRUX_BACK_CLASS + " #" + BACK_BUTTON_ID + ":hover,html." + CRUX_BACK_CLASS + " #" + BACK_BUTTON_ID + ":active,html #" + BACK_BUTTON_ID + ":hover,html #" + BACK_BUTTON_ID + ":active{" +
      "background:rgba(8,14,24,.08)!important;box-shadow:none!important;transform:none!important;" +
      "}" +
      "}" +

      /* Light mode needs stronger separation from white/pastel page content. */
      "html:not(.dark):not(.efp-black):not(.efp-black-invert) #" + BUTTON_ID + "," +
      "html:not(.dark):not(.efp-black):not(.efp-black-invert) #" + BACK_BUTTON_ID + "{" +
      "background:linear-gradient(135deg,rgba(10,19,35,.96),rgba(26,43,70,.94))!important;" +
      "border-color:rgba(196,146,38,.92)!important;" +
      "color:#fff!important;" +
      "box-shadow:0 6px 18px rgba(15,23,42,.24),0 2px 6px rgba(15,23,42,.18),inset 0 1px 0 rgba(255,255,255,.14)!important;" +
      "-webkit-backdrop-filter:blur(10px)!important;backdrop-filter:blur(10px)!important;" +
      "}" +
      "html:not(.dark):not(.efp-black):not(.efp-black-invert) #" + BUTTON_ID + " .efp-home-icon," +
      "html:not(.dark):not(.efp-black):not(.efp-black-invert) #" + BACK_BUTTON_ID + " .efp-back-icon{" +
      "color:#ffd86b!important;text-shadow:0 1px 3px rgba(0,0,0,.35);" +
      "}" +
      "html:not(.dark):not(.efp-black):not(.efp-black-invert) #" + BUTTON_ID + ":hover," +
      "html:not(.dark):not(.efp-black):not(.efp-black-invert) #" + BUTTON_ID + ":active," +
      "html:not(.dark):not(.efp-black):not(.efp-black-invert) #" + BACK_BUTTON_ID + ":hover," +
      "html:not(.dark):not(.efp-black):not(.efp-black-invert) #" + BACK_BUTTON_ID + ":active{" +
      "background:linear-gradient(135deg,#13233d,#2b4772)!important;" +
      "border-color:#e8b84e!important;" +
      "box-shadow:0 8px 22px rgba(15,23,42,.28),0 3px 8px rgba(15,23,42,.20),inset 0 1px 0 rgba(255,255,255,.16)!important;" +
      "}" +

      "@media(prefers-reduced-motion:reduce){#" + BUTTON_ID + ",#" + BACK_BUTTON_ID + "{transition:none!important;}}" +
      "@media(print){#" + BUTTON_ID + ",#" + BACK_BUTTON_ID + "{display:none!important;}}";
    document.head.appendChild(style);
  }

  function isMoveTopExcludedPage() {
    var path = normalizedPath(window.location.pathname).toLowerCase();

    /* Current Affairs has its own dedicated v3 move-to-top control. */
    if (path.indexOf("/current affairs/") === 0) return true;

    /* Random Mixed Practice owns a special horizontal/session navigation UI. */
    if (path === "/original practice/mixed_practice.html") return true;

    /* PDF readers have their own zoom/reader chrome; do not add page scrolling UI. */
    if (/\/viewer\.html$/.test(path)) return true;
    if (document.querySelector(
      'embed[type="application/pdf"],object[type="application/pdf"],iframe[src*=".pdf"],iframe[src*=".PDF"]'
    )) return true;

    return false;
  }

  function injectMoveTopStyle() {
    if (!document.head || document.getElementById(MOVE_TOP_STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = MOVE_TOP_STYLE_ID;
    style.textContent =
      "#" + MOVE_TOP_ID + "{" +
      "position:fixed!important;right:max(12px,env(safe-area-inset-right))!important;" +
      "bottom:var(--efp-move-top-bottom,max(14px,env(safe-area-inset-bottom)))!important;" +
      "z-index:2147483600!important;width:44px;height:44px;min-width:44px;min-height:44px;padding:0;" +
      "display:flex;align-items:center;justify-content:center;" +
      "border:1px solid rgba(246,217,138,.62);border-radius:50%;" +
      "background:linear-gradient(145deg,#0a1220,#19273e);" +
      "color:#f6d98a;font:800 22px/1 system-ui,-apple-system,'Segoe UI',sans-serif;" +
      "box-shadow:0 7px 22px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.09);" +
      
      "cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;" +
      "opacity:0;visibility:hidden;pointer-events:none;transform:translateY(9px) scale(.96);" +
      "transition:opacity .18s ease,visibility .18s ease,transform .18s ease,background .18s ease,border-color .18s ease;" +
      "}" +
      "#" + MOVE_TOP_ID + ".efp-move-top-visible{" +
      "opacity:1;visibility:visible;pointer-events:auto;transform:translateY(0) scale(1);" +
      "}" +
      "#" + MOVE_TOP_ID + ":hover{background:linear-gradient(145deg,#172740,#263d60);border-color:#ffe6a0;}" +
      "#" + MOVE_TOP_ID + ":active{transform:translateY(1px) scale(.97);}" +
      "#" + MOVE_TOP_ID + ":focus-visible{outline:3px solid #ffd866;outline-offset:3px;}" +
      "html:not(.dark):not(.efp-black):not(.efp-black-invert) #" + MOVE_TOP_ID + "{" +
      "background:linear-gradient(145deg,#10233c,#263d50);" +
      "border-color:rgba(196,146,38,.9);color:#ffd86b;" +
      "box-shadow:0 7px 20px rgba(15,23,42,.24),inset 0 1px 0 rgba(255,255,255,.13);" +
      "}" +
      "@media(max-width:639px){#" + MOVE_TOP_ID + "{width:42px;height:42px;min-width:42px;min-height:42px;font-size:21px;}}" +
      "@media(prefers-reduced-motion:reduce){#" + MOVE_TOP_ID + "{transition:none!important;}}" +
      "@media(print){#" + MOVE_TOP_ID + "{display:none!important;}}";
    document.head.appendChild(style);
  }

  function getDocumentScrollRange() {
    var root = document.scrollingElement || document.documentElement;
    if (!root) return 0;
    return Math.max(0, root.scrollHeight - window.innerHeight);
  }

  /* Keep floating arrows clear of the visible section navigation row. */
  function moveTopSafeBottom(button, bottom) {
    if (!button || window.innerWidth >= 1200) return bottom;
    var arrow = button.getBoundingClientRect();
    var height = arrow.height || 44;
    var controls = document.querySelectorAll(
      ".bottom button,.pagination button,.quiz-navigation button,.nav-buttons button," +
      ".efp-bb-section-nav button,[onclick*='moveSection'],[onclick*='nextSection'],[onclick*='prevSection']"
    );
    var rects = [];
    for (var i = 0; i < controls.length; i++) {
      var rect = controls[i].getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight &&
          rect.right > arrow.left - 10 && rect.left < arrow.right + 10) rects.push(rect);
    }
    /* Recheck after each lift in case a second navigation row sits above it. */
    for (var pass = 0; pass <= rects.length; pass++) {
      var before = bottom;
      for (var j = 0; j < rects.length; j++) {
        var top = window.innerHeight - bottom - height;
        var lower = window.innerHeight - bottom;
        if (lower > rects[j].top - 10 && top < rects[j].bottom + 10) {
          bottom = Math.max(bottom, Math.ceil(window.innerHeight - rects[j].top + 12));
        }
      }
      if (bottom === before) break;
    }
    return bottom;
  }

  window.EFP_MOVE_TOP_SAFE_BOTTOM = moveTopSafeBottom;

  function positionMoveTopAboveHome(button) {
    if (!button) return;
    var home = document.getElementById(BUTTON_ID);
    var variable = "--efp-move-top-bottom";

    if (!home) {
      button.style.setProperty(variable, moveTopSafeBottom(button, 14) + "px");
      return;
    }

    var rect = home.getBoundingClientRect();
    var computed = window.getComputedStyle ? window.getComputedStyle(home) : null;
    var visible = rect.width > 0 && rect.height > 0 &&
      (!computed || (computed.display !== "none" && computed.visibility !== "hidden" && Number(computed.opacity || 1) > 0));

    /* Only stack above Home when Home is actually docked in the lower-right.
       Desktop top-right Home therefore leaves Move to Top at its normal corner. */
    if (visible && rect.top > window.innerHeight * 0.45 && rect.left > window.innerWidth * 0.45) {
      var gap = window.innerWidth <= 639 ? 12 : 14;
      var bottom = Math.max(14, Math.ceil(window.innerHeight - rect.top + gap));
      button.style.setProperty(variable, moveTopSafeBottom(button, bottom) + "px");
    } else {
      button.style.setProperty(variable, moveTopSafeBottom(button, 14) + "px");
    }
  }

  function updateMoveTopButton() {
    var button = document.getElementById(MOVE_TOP_ID);
    if (!button) return;

    if (isMoveTopExcludedPage()) {
      button.classList.remove("efp-move-top-visible");
      button.tabIndex = -1;
      button.setAttribute("aria-hidden", "true");
      return;
    }

    var root = document.scrollingElement || document.documentElement;
    var scrollTop = root ? root.scrollTop : (window.pageYOffset || 0);
    var range = getDocumentScrollRange();

    /* Adaptive threshold: on medium-length pages (including accordion/dropdown
       pages) the control should still become useful before the user reaches
       the very bottom; very long pages wait a little longer. */
    var showAfter = Math.min(
      MOVE_TOP_SHOW_AFTER,
      Math.max(180, Math.round(range * 0.32))
    );
    var show = range >= MOVE_TOP_MIN_SCROLL_RANGE && scrollTop >= showAfter;

    positionMoveTopAboveHome(button);
    button.classList.toggle("efp-move-top-visible", show);
    button.tabIndex = show ? 0 : -1;
    button.setAttribute("aria-hidden", show ? "false" : "true");
  }

  function installMoveTopButton() {
    if (!document.documentElement || !document.head || isMoveTopExcludedPage()) return;

    injectMoveTopStyle();

    var button = document.getElementById(MOVE_TOP_ID);
    if (!button) {
      button = document.createElement("button");
      button.id = MOVE_TOP_ID;
      button.type = "button";
      button.tabIndex = -1;
      button.setAttribute("aria-hidden", "true");
      button.setAttribute("aria-label", "Move to top");
      button.setAttribute("title", "Move to top");
      button.innerHTML = "<span aria-hidden=\"true\">&#8593;</span>";
      button.addEventListener("click", function () {
        var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, left: 0, behavior: reduce ? "auto" : "smooth" });
      });
      document.documentElement.appendChild(button);
    }

    if (!window.__efpMoveTopListenersInstalled) {
      window.__efpMoveTopListenersInstalled = true;
      var queued = false;
      var scheduleUpdate = function () {
        if (queued) return;
        queued = true;
        window.requestAnimationFrame(function () {
          queued = false;
          updateMoveTopButton();
        });
      };

      window.addEventListener("scroll", scheduleUpdate, { passive: true });
      window.addEventListener("resize", scheduleUpdate, { passive: true });
      window.addEventListener("orientationchange", scheduleUpdate, { passive: true });
      window.addEventListener("pageshow", scheduleUpdate);

      if (window.ResizeObserver) {
        var ro = new ResizeObserver(scheduleUpdate);
        if (document.documentElement) ro.observe(document.documentElement);
        if (document.body) ro.observe(document.body);
        window.__efpMoveTopResizeObserver = ro;
      }
    }

    updateMoveTopButton();
  }

  function installHomeButton() {
    if (!document.documentElement || !document.head || isMainHomePage()) return;

    if (isMindMapsPage()) document.documentElement.classList.add("efp-mindmaps-page");

    ensureCurrentAffairsRapidEnhancer();
    ensureMathsSpeedBoosterFitStyles();
    removeLegacyBackToTop();
    watchLegacyOriginalPracticeHome();
    watchLegacyCruxNavigation();
    injectStyle();
    installDefaultBackButton();

    if (document.getElementById(BUTTON_ID)) return;

    var link = document.createElement("a");
    link.id = BUTTON_ID;
    link.href = "/";
    link.setAttribute("aria-label", "Go to ExamFusion Prep Home");
    link.setAttribute("title", "ExamFusion Prep Home");
    link.innerHTML = "<span class=\"efp-home-icon\" aria-hidden=\"true\">&#8962;</span>" +
      "<span class=\"efp-home-label\">Home</span>";

    /* Keep the fixed control outside BODY. Some light pages apply a filter to
       BODY in Black Mode, which would otherwise make position:fixed scroll. */
    document.documentElement.appendChild(link);
  }

  function installSharedPageControls() {
    installHomeButton();
    installMoveTopButton();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installSharedPageControls, { once: true });
  } else {
    installSharedPageControls();
  }

  window.addEventListener("pageshow", installSharedPageControls);

  if (window.MutationObserver && document.documentElement) {
    var observer = new MutationObserver(function () {
      if (!document.getElementById(BUTTON_ID)) installHomeButton();
      if (!document.getElementById(MOVE_TOP_ID)) installMoveTopButton();
      else updateMoveTopButton();
      if (!isMainHomePage() && !document.getElementById(BACK_BUTTON_ID)) installDefaultBackButton();
      ensureCurrentAffairsRapidEnhancer();
      removeLegacyBackToTop();
      removeLegacyOriginalPracticeHome();
      removeLegacyCruxNavigation();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();

/* EFP_APP_SESSION_LOADER — installed-app resume */
(function () {
  "use strict";
  if (typeof document === "undefined" || document.getElementById("efp-app-session-script")) return;
  var script = document.createElement("script");
  script.id = "efp-app-session-script";
  script.src = "/app-session.js?v=20261007accordion1";
  script.async = false;
  (document.head || document.documentElement).appendChild(script);
})();
