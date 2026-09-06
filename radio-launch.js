/* ExamFusion Prep — browser Retro Radio launcher.
   Desktop/mobile browsers keep study and Radio in separate tabs so audio survives
   navigation in the study tab. Installed Android app stays in-app. */
(function () {
  "use strict";

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

  document.addEventListener("click", function (event) {
    if (isInstalledAndroid()) return;
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

    var anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;
    if (!isRadioLink(anchor)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    var player = null;
    try { player = window.open(anchor.href, "efpRetroRadio"); } catch (_) {}
    if (player) {
      try { player.focus(); } catch (_) {}
      return;
    }

    // Popup blocking fallback: never leave the click dead.
    window.location.href = anchor.href;
  }, true);
})();
