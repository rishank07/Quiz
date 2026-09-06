/* ExamFusion Prep — site-wide Home navigation */
(function () {
  "use strict";

  var BUTTON_ID = "efp-home-button";
  var STYLE_ID = "efp-home-button-style";
  var BACK_BUTTON_ID = "efp-app-back-button";

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

      /* Desktop: force both global controls into the upper corners, including
         legacy pages that black-mode.js previously classified as bottom-docked. */
      "@media(min-width:1200px){" +
      "html #" + BACK_BUTTON_ID + ",html.efp-back-bottom #" + BACK_BUTTON_ID + "{" +
      "top:max(12px,env(safe-area-inset-top))!important;" +
      "left:max(12px,env(safe-area-inset-left))!important;right:auto!important;bottom:auto!important;" +
      "}" +
      "}" +

      /* Mobile/tablet: keep the familiar lower-corner controls but make them
         transparent so they do not cover quiz/content underneath. */
      "@media(max-width:1199px){" +
      "#" + BUTTON_ID + "{" +
      "top:auto!important;left:auto!important;" +
      "right:max(12px,env(safe-area-inset-right))!important;" +
      "bottom:max(12px,env(safe-area-inset-bottom))!important;" +
      "width:50px!important;min-width:50px!important;height:50px!important;min-height:50px!important;" +
      "padding:0!important;border-radius:50%!important;gap:0!important;" +
      "background:rgba(8,14,24,.10)!important;" +
      "border-color:rgba(246,217,138,.50)!important;" +
      "box-shadow:none!important;-webkit-backdrop-filter:blur(9px)!important;backdrop-filter:blur(9px)!important;" +
      "}" +
      "#" + BUTTON_ID + ":hover,#" + BUTTON_ID + ":active{" +
      "background:rgba(8,14,24,.16)!important;box-shadow:none!important;transform:none!important;" +
      "}" +
      "#" + BUTTON_ID + " .efp-home-label{display:none!important;}" +
      "#" + BUTTON_ID + " .efp-home-icon{font-size:22px!important;}" +
      "html #" + BACK_BUTTON_ID + "{" +
      "background:rgba(8,14,24,.10)!important;" +
      "border-color:rgba(246,217,138,.50)!important;" +
      "box-shadow:none!important;-webkit-backdrop-filter:blur(9px)!important;backdrop-filter:blur(9px)!important;" +
      "}" +
      "html #" + BACK_BUTTON_ID + ":hover,html #" + BACK_BUTTON_ID + ":active{" +
      "background:rgba(8,14,24,.16)!important;box-shadow:none!important;transform:none!important;" +
      "}" +
      "}" +
      "@media(prefers-reduced-motion:reduce){#" + BUTTON_ID + "{transition:none!important;}}" +
      "@media(print){#" + BUTTON_ID + "{display:none!important;}}";
    document.head.appendChild(style);
  }

  function installHomeButton() {
    if (!document.documentElement || !document.head || isMainHomePage()) return;

    removeLegacyBackToTop();
    watchLegacyOriginalPracticeHome();
    injectStyle();

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
})();
