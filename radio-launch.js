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
