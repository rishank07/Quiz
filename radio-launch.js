/* ExamFusion Prep — Retro Radio launcher.
   Normal browsers keep Study + Radio in two reusable tabs.
   Installed Android app turns the user's actual Radio tap into a Chrome VIEW
   intent, so the TWA itself never navigates to music.html. */
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
    } catch (_) { return false; }
  }

  function bindCurrentTabAsStudy() {
    try {
      window.name = STUDY_WINDOW;
      try { sessionStorage.setItem("efp_radio_study_bound", "1"); } catch (_) {}
      return window.name === STUDY_WINDOW;
    } catch (_) { return false; }
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
      ";action=android.intent.action.VIEW" +
      ";category=android.intent.category.BROWSABLE" +
      ";package=" + CHROME_PACKAGE +
      ";end";
  }

  function prepareAndroidChromeClick(anchor) {
    var oldHref = anchor.getAttribute("href");
    var oldTarget = anchor.getAttribute("target");
    var oldRel = anchor.getAttribute("rel");
    var radioUrl = buildAndroidRadioUrl(anchor.href);

    anchor.setAttribute("href", buildChromeIntent(radioUrl));
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noopener noreferrer");

    window.setTimeout(function () {
      try {
        if (oldHref == null) anchor.removeAttribute("href"); else anchor.setAttribute("href", oldHref);
        if (oldTarget == null) anchor.removeAttribute("target"); else anchor.setAttribute("target", oldTarget);
        if (oldRel == null) anchor.removeAttribute("rel"); else anchor.setAttribute("rel", oldRel);
      } catch (_) {}
    }, 250);
  }

  document.addEventListener("click", function (event) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

    var anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;
    if (!isRadioLink(anchor)) return;

    if (isInstalledAndroid()) {
      /* Keep the user's click as the actual navigation gesture. We stop site
         onclick handlers, but deliberately DO NOT prevent the anchor default. */
      prepareAndroidChromeClick(anchor);
      event.stopPropagation();
      event.stopImmediatePropagation();
      return;
    }

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
