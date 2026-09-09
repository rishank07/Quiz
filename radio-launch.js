/* ExamFusion Prep — Retro Radio launcher.
   Normal browsers (desktop/mobile) and the Windows app keep the existing
   Study + Radio tab behavior. Only the native Android WebView app, identified
   by its custom ExamFusionPrepAndroid/ user-agent token, uses simple in-app
   Radio navigation. */
(function () {
  "use strict";

  var STUDY_WINDOW = "efpExamFusionStudy";
  var RADIO_WINDOW = "efpRetroRadio";

  function isExamFusionAndroidApp() {
    return /ExamFusionPrepAndroid\//i.test(navigator.userAgent || "");
  }

  function isRadioLink(anchor) {
    if (!anchor || !anchor.href) return false;
    try {
      var url = new URL(anchor.href, window.location.href);
      return url.origin === window.location.origin && /\/music\.html$/i.test(url.pathname);
    } catch (_) { return false; }
  }

  function bindCurrentTabAsStudy() {
    try {
      window.name = STUDY_WINDOW;
      try { sessionStorage.setItem("efp_radio_study_bound", "1"); } catch (_) {}
      return window.name === STUDY_WINDOW;
    } catch (_) { return false; }
  }

  /* Home-page Current Affairs count. Keep it compact so the bilingual menu
     remains readable on phones; the exact total is shown inside the hub. */
  function installCurrentAffairsPracticeCount() {
    var path = (window.location.pathname || "/").replace(/\/{2,}/g, "/");
    if (!(path === "/" || /\/index\.html$/i.test(path))) return;

    var link = document.querySelector('a[href="./Current Affairs/Topic Names.html"], a[href$="/Current%20Affairs/Topic%20Names.html"]');
    if (!link || link.querySelector(".efp-ca-home-count")) return;

    var badge = document.createElement("span");
    badge.className = "efp-ca-home-count";
    badge.textContent = "8.5K+ Qs";
    badge.title = "8,567 Current Affairs practice questions";
    badge.setAttribute("aria-label", "8,500 plus Current Affairs practice questions");
    badge.style.cssText = "display:inline-flex;align-items:center;justify-content:center;margin-left:auto;margin-right:8px;padding:4px 8px;border-radius:999px;white-space:nowrap;font-size:10px;font-weight:800;line-height:1;letter-spacing:.25px;color:#171006;background:linear-gradient(135deg,#ffeec0,#d9b75f);border:1px solid rgba(255,238,192,.75);box-shadow:0 3px 10px rgba(217,183,95,.18);flex:0 0 auto";

    var chevron = link.querySelector(".chevron-icon");
    if (chevron) link.insertBefore(badge, chevron);
    else link.appendChild(badge);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installCurrentAffairsPracticeCount);
  } else {
    installCurrentAffairsPracticeCount();
  }
  window.addEventListener("pageshow", installCurrentAffairsPracticeCount);

  document.addEventListener("click", function (event) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

    var anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;
    if (!isRadioLink(anchor)) return;

    if (isExamFusionAndroidApp()) {
      /* Android APK only: force the Radio into this same WebView. Blocking all
         other click handlers here prevents window.open/Chrome handoff. */
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      try { window.location.assign(anchor.href); }
      catch (_) { window.location.href = anchor.href; }
      return;
    }

    /* Normal mobile/desktop browsers and Windows app: unchanged behavior. */
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    bindCurrentTabAsStudy();

    var player = null;
    try { player = window.open("", RADIO_WINDOW); } catch (_) {}
    if (player) {
      var alreadyRadio = false;
      try {
        alreadyRadio = player.location.origin === window.location.origin &&
          /\/music\.html$/i.test(player.location.pathname);
      } catch (_) {}
      if (!alreadyRadio) {
        try { player.location.href = anchor.href; } catch (_) {}
      }
      try { player.focus(); } catch (_) {}
      return;
    }

    window.location.href = anchor.href;
  }, true);
})();
