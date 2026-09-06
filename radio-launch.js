/* ExamFusion Prep — Retro Radio launcher.
   Normal browsers keep Study + Radio in two reusable tabs.
   Installed Android app stays simple: Retro Radio opens normally inside the
   app with no Chrome redirect, intent handoff or background-study routing. */
(function () {
  "use strict";

  var STUDY_WINDOW = "efpExamFusionStudy";
  var RADIO_WINDOW = "efpRetroRadio";
  var APP_SESSION_KEY = "efp_android_app_session";

  function isInstalledAndroid() {
    var isAndroid = /Android/i.test(navigator.userAgent || "");
    if (!isAndroid) return false;

    var standalone = false;
    try { standalone = window.matchMedia("(display-mode: standalone)").matches; } catch (_) {}

    var twa = /^android-app:\/\//i.test(document.referrer || "");
    var launchMarker = false;
    try {
      var source = new URLSearchParams(window.location.search).get("source") || "";
      launchMarker = source === "windows-pwa" || source === "android-app" || source === "pwa" || source === "android-pwa" || source === "app";
    } catch (_) {}

    var remembered = false;
    try { remembered = sessionStorage.getItem(APP_SESSION_KEY) === "1"; } catch (_) {}

    var installed = standalone || twa || launchMarker || remembered;
    if (installed) {
      try { sessionStorage.setItem(APP_SESSION_KEY, "1"); } catch (_) {}
    }
    return installed;
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

    if (isInstalledAndroid()) {
      /* Hard same-window path for the packaged Android app. Do not let any
         homepage onclick, target handling or browser-tab logic touch Radio. */
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      try { window.location.assign(anchor.href); }
      catch (_) { window.location.href = anchor.href; }
      return;
    }

    /* Normal browser behavior stays unchanged. */
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
