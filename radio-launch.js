/* ExamFusion Prep — Retro Radio launcher.
   Normal browsers keep Study + Radio in two reusable tabs.
   Installed Android app deliberately sends Radio to Chrome so audio can keep
   playing while ExamFusion stays available as the study app. */
(function () {
  "use strict";

  var STUDY_WINDOW = "efpExamFusionStudy";
  var RADIO_WINDOW = "efpRetroRadio";
  var CHROME_PACKAGE = "com.android.chrome";

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
      window.name = STUDY_WINDOW;
      try { sessionStorage.setItem("efp_radio_study_bound", "1"); } catch (_) {}
      return window.name === STUDY_WINDOW;
    } catch (_) {
      return false;
    }
  }

  function safeCurrentStudyUrl() {
    try {
      var url = new URL(window.location.href);
      if (url.origin === window.location.origin && !/\/music\.html$/i.test(url.pathname)) return url.href;
    } catch (_) {}
    return window.location.origin + "/";
  }

  function buildAndroidRadioUrl(href) {
    var url = new URL(href, window.location.href);
    url.searchParams.set("from", "android-app");
    url.searchParams.set("return", safeCurrentStudyUrl());
    return url.href;
  }

  function buildChromeIntent(httpsUrl) {
    var url = new URL(httpsUrl);
    var scheme = url.protocol.replace(":", "") || "https";
    var data = url.host + url.pathname + url.search + url.hash;
    return "intent://" + data +
      "#Intent;scheme=" + scheme +
      ";package=" + CHROME_PACKAGE +
      ";S.browser_fallback_url=" + encodeURIComponent(url.href) +
      ";end";
  }

  function openRadioOutsideAndroidApp(anchor) {
    var radioUrl = buildAndroidRadioUrl(anchor.href);
    try {
      window.location.href = buildChromeIntent(radioUrl);
    } catch (_) {
      try { window.open(radioUrl, "_blank", "noopener"); }
      catch (_) { window.location.href = radioUrl; }
    }
  }

  document.addEventListener("click", function (event) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

    var anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;
    if (!isRadioLink(anchor)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (isInstalledAndroid()) {
      openRadioOutsideAndroidApp(anchor);
      return;
    }

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

    /* Popup blocking fallback for normal desktop/mobile browsers. */
    window.location.href = anchor.href;
  }, true);
})();
