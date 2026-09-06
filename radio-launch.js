/* ExamFusion Prep — browser Retro Radio launcher.
   Browsers keep study and Radio in two reusable tabs so audio survives study navigation.
   Installed Android app stays in-app. */
(function () {
  "use strict";

  var STUDY_WINDOW = "efpExamFusionStudy";
  var RADIO_WINDOW = "efpRetroRadio";

  function isInstalledAndroid() {
    var isAndroid = /Android/i.test(navigator.userAgent || "");
    var standalone = false;
    try { standalone = window.matchMedia("(display-mode: standalone)").matches; } catch (_) {}
    var twa = /^android-app:\/\//i.test(document.referrer || "");
    return isAndroid && (standalone || twa);
  }

  function isRadioLink(anchor) {
    if (!anchor || !anchor.href) return false;
    try {
      var url = new URL(anchor.href, window.location.href);
      return url.origin === window.location.origin && /\/music\.html$/i.test(url.pathname);
    } catch (_) {
      return false;
    }
  }

  function bindCurrentTabAsStudy() {
    try {
      /* Deliberately overwrite any stale window.name here. This click is the
         moment the current ExamFusion tab becomes the reusable Study tab. */
      window.name = STUDY_WINDOW;
      try { sessionStorage.setItem("efp_radio_study_bound", "1"); } catch (_) {}
      return window.name === STUDY_WINDOW;
    } catch (_) {
      return false;
    }
  }

  document.addEventListener("click", function (event) {
    if (isInstalledAndroid()) return;
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

    var anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;
    if (!isRadioLink(anchor)) return;

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

    /* Popup blocking fallback: opening in the same tab cannot preserve music,
       but the click must still work instead of appearing dead. */
    window.location.href = anchor.href;
  }, true);
})();
