/* ExamFusion Prep — site-wide Home navigation */
(function () {
  "use strict";

  var BUTTON_ID = "efp-home-button";
  var STYLE_ID = "efp-home-button-style";
  var BACK_BUTTON_ID = "efp-app-back-button";
  var CRUX_BACK_CLASS = "efp-crux-back-fallback";
  var MATHS_FIT_STYLE_ID = "efp-maths-speed-booster-fit";

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

  function isOriginalPracticePage() {
    return normalizedPath(window.location.pathname).toLowerCase().indexOf("/original practice/") === 0;
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

  function ensureMathsSpeedBoosterFitStyles() {
    if (!isMathsSpeedBoosterPage() || !document.head || document.getElementById(MATHS_FIT_STYLE_ID)) return;
    var link = document.createElement("link");
    link.id = MATHS_FIT_STYLE_ID;
    link.rel = "stylesheet";
    link.href = "/Maths%20Speed%20Booster/math-speed-booster-fit.css?v=20260906fit1";
    document.head.appendChild(link);
  }

  function removeLegacyBackToTop() {
    if (!isMindMapsSubjectDashboard()) return;
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

  function navigateCruxBack() {
    if (window.history.length > 1 && hasSameOriginReferrer()) {
      window.history.back();
      return;
    }
    window.location.assign(isCruxTricksRoot() ? "/" : "/Crux-Tricks/index.html");
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

  function installHomeButton() {
    if (!document.documentElement || !document.head || isMainHomePage()) return;

    ensureMathsSpeedBoosterFitStyles();
    removeLegacyBackToTop();
    watchLegacyOriginalPracticeHome();
    watchLegacyCruxNavigation();
    injectStyle();
    installCruxBackButton();

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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installHomeButton, { once: true });
  } else {
    installHomeButton();
  }

  window.addEventListener("pageshow", installHomeButton);

  if (window.MutationObserver && document.documentElement) {
    var observer = new MutationObserver(function () {
      if (!document.getElementById(BUTTON_ID)) installHomeButton();
      if (isCruxTricksPage() && !document.getElementById(BACK_BUTTON_ID)) installCruxBackButton();
      removeLegacyBackToTop();
      removeLegacyOriginalPracticeHome();
      removeLegacyCruxNavigation();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();