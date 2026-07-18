/* ==========================================================
   Exam Fusion Prep — Mind Maps Hindi/English translate toggle
   Include this on every Mind Maps page (except English Grammar)
   via: <script src="PATH/TO/translate.js"></script> in <head>.

   NOTE: Requires http:// or https:// (the live site). Does NOT
   work when opening files directly from disk (file:///...).

   Uses Google's free "Website Translate Element" widget (no API
   key) driven through its internal <select class="goog-te-combo">.
   The white Google banner is suppressed via CSS (old + new class
   names, including the current obfuscated VIpgJd-* one) plus a
   MutationObserver fallback that removes any top-of-page
   Google-injected iframe/banner even if class names change again.
   ========================================================== */
(function () {
  var COOKIE_NAME = "googtrans";
  var TARGET_LANG = "hi";
  var STYLE_ID = "efp-translate-style";

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      "#google_translate_element{position:fixed;left:-9999px;top:0;height:1px;width:1px;overflow:hidden;}" +
      /* old banner class names */
      ".goog-te-banner-frame, iframe.goog-te-banner-frame, .goog-te-ftab, .goog-te-balloon-frame," +
      /* current (2023+) obfuscated banner iframe + its wrapper */
      "iframe.VIpgJd-ZVi9od-ORHb-OEVmcd, .VIpgJd-ZVi9od-ORHb-OEVmcd," +
      "body > .skiptranslate > iframe.skiptranslate, body > .skiptranslate:not(#google_translate_element)" +
      "{display:none!important;visibility:hidden!important;height:0!important;width:0!important;" +
      "opacity:0!important;pointer-events:none!important;}" +
      "html, html body, body{top:0!important;position:static!important;margin-top:0!important;}" +
      ".goog-text-highlight{background:none!important;box-shadow:none!important;}" +
      ".goog-tooltip, .goog-tooltip:hover{display:none!important;}" +
      ".goog-te-gadget{height:0;overflow:hidden;}";
    document.head.appendChild(style);
  }

  /* JS fallback: kill any Google-injected banner even if Google
     renames its classes again. Runs for a while after load and
     after each toggle. */
  function nukeBanner() {
    document.body && (document.body.style.top = "0px");
    document.documentElement.style.top = "0px";
    var frames = document.querySelectorAll("body > iframe, body > .skiptranslate");
    frames.forEach(function (el) {
      if (el.id === "google_translate_element") return;
      var src = (el.tagName === "IFRAME" ? (el.getAttribute("src") || "") : "");
      var isGoogleFrame =
        el.classList.contains("skiptranslate") ||
        el.classList.contains("goog-te-banner-frame") ||
        /VIpgJd/.test(el.className || "") ||
        /translate\.goog|translate\.google/.test(src);
      if (isGoogleFrame) {
        el.style.setProperty("display", "none", "important");
        el.style.setProperty("visibility", "hidden", "important");
        el.style.setProperty("height", "0", "important");
      }
    });
  }

  function startBannerWatch() {
    nukeBanner();
    var obs = new MutationObserver(function () { nukeBanner(); });
    obs.observe(document.body, { childList: true });
    /* also poll briefly — Google re-applies body offset asynchronously */
    var t = 0;
    var iv = setInterval(function () {
      nukeBanner();
      if (++t > 40) clearInterval(iv); /* ~20s then stop polling; observer stays */
    }, 500);
  }

  function getCookie(name) {
    var m = document.cookie.match("(?:^|; )" + name + "=([^;]*)");
    return m ? decodeURIComponent(m[1]) : null;
  }

  function setCookie(name, value) {
    var host = window.location.hostname;
    var base = name + "=" + value + ";path=/;";
    document.cookie = base;
    if (host) {
      document.cookie = base + "domain=" + host + ";";
      var parts = host.split(".");
      if (parts.length > 2) {
        document.cookie = base + "domain=." + parts.slice(-2).join(".") + ";";
      }
    }
  }

  function wantsHindi() {
    var v = getCookie(COOKIE_NAME);
    return !!v && v.indexOf("/" + TARGET_LANG) !== -1;
  }

  function getCombo() {
    return document.querySelector("select.goog-te-combo");
  }

  function applyLang(lang, cb) {
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      var combo = getCombo();
      if (combo) {
        clearInterval(timer);
        if (combo.value !== lang) {
          combo.value = lang;
          combo.dispatchEvent(new Event("change"));
        }
        nukeBanner();
        if (cb) cb(true);
      } else if (tries > 100) {
        clearInterval(timer);
        if (cb) cb(false);
      }
    }, 200);
  }

  function ensureWidgetContainer() {
    if (document.getElementById("google_translate_element")) return;
    var div = document.createElement("div");
    div.id = "google_translate_element";
    document.body.appendChild(div);
  }

  function loadGoogleScript() {
    if (window.__efpGoogTranslateLoading) return;
    window.__efpGoogTranslateLoading = true;
    window.googleTranslateElementInit = function () {
      new google.translate.TranslateElement(
        { pageLanguage: "en", includedLanguages: "hi,en", autoDisplay: false },
        "google_translate_element"
      );
    };
    var s = document.createElement("script");
    s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    document.head.appendChild(s);
  }

  function notify(hindiOn) {
    document.dispatchEvent(new CustomEvent("efp-translate-state", { detail: { hindi: hindiOn } }));
  }

  function initWhenBodyReady() {
    ensureWidgetContainer();
    loadGoogleScript();
    startBannerWatch();
    if (wantsHindi()) {
      applyLang(TARGET_LANG, function (ok) { notify(ok); });
    } else {
      notify(false);
    }
  }

  window.toggleHindiTranslate = function () {
    var turningOn = !wantsHindi();
    if (turningOn) {
      setCookie(COOKIE_NAME, "/en/" + TARGET_LANG);
      applyLang(TARGET_LANG, function (ok) { notify(ok); });
    } else {
      setCookie(COOKIE_NAME, "/" + TARGET_LANG + "/en");
      applyLang("en", function (ok) { notify(false); });
    }
    nukeBanner();
  };

  injectStyle();

  if (document.body) {
    initWhenBodyReady();
  } else {
    document.addEventListener("DOMContentLoaded", initWhenBodyReady);
  }

  window.efpIsHindiOn = wantsHindi;
})();
