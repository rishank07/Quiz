/* ExamFusion Prep — site-wide Home navigation */
(function () {
  "use strict";

  var BUTTON_ID = "efp-home-button";
  var STYLE_ID = "efp-home-button-style";

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

  function removeLegacyBackToTop() {
    if (!isMindMapsSubjectDashboard()) return;
    var buttons = document.querySelectorAll(".back-to-top");
    for (var i = 0; i < buttons.length; i++) buttons[i].remove();
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      "#" + BUTTON_ID + "{" +
      "position:fixed!important;right:max(14px,env(safe-area-inset-right))!important;" +
      "bottom:max(14px,env(safe-area-inset-bottom))!important;z-index:2147483647!important;" +
      "height:48px;min-height:48px;min-width:104px;padding:0 18px;box-sizing:border-box;" +
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
      "@media(max-width:1199px){#" + BUTTON_ID + "{width:50px!important;min-width:50px!important;height:50px!important;min-height:50px!important;padding:0!important;border-radius:50%!important;gap:0!important;}#" + BUTTON_ID + " .efp-home-label{display:none!important;}#" + BUTTON_ID + " .efp-home-icon{font-size:22px!important;}}" +
      "@media(prefers-reduced-motion:reduce){#" + BUTTON_ID + "{transition:none!important;}}" +
      "@media(print){#" + BUTTON_ID + "{display:none!important;}}";
    document.head.appendChild(style);
  }

  function installHomeButton() {
    if (!document.documentElement || !document.head || isMainHomePage()) return;

    removeLegacyBackToTop();

    if (document.getElementById(BUTTON_ID)) return;

    injectStyle();

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
