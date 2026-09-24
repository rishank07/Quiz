/* ExamFusion Prep — transient "Open in app" browser banner. */
(function () {
  "use strict";

  var SCRIPT_ID = "efp-open-app-script";
  var BANNER_ID = "efp-open-app-banner";
  var DISMISS_KEY = "efp_open_app_banner_seen_v1";
  var OPEN_MARKER = "efp_open_app";
  var ANDROID_PACKAGE = "com.examfusionprep.app";
  var STORE_PRODUCT_ID = "9PK831XFH004";
  var ua = navigator.userAgent || "";
  var isAndroid = /Android/i.test(ua);
  var isWindows = /Windows NT/i.test(ua);
  var isNativeAndroid = /ExamFusionPrepAndroid\//i.test(ua);
  var isStandalone = false;

  try {
    isStandalone = !!(
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      window.navigator.standalone === true
    );
  } catch (_) {}

  function cleanOpenMarker() {
    try {
      var url = new URL(window.location.href);
      if (!url.searchParams.has(OPEN_MARKER)) return false;
      url.searchParams.delete(OPEN_MARKER);
      history.replaceState(history.state, "", url.pathname + (url.search ? url.search : "") + url.hash);
      return true;
    } catch (_) {
      return false;
    }
  }

  var cameFromOpenAttempt = cleanOpenMarker();

  // Android native WebView is already the real Play app. On Windows, standalone
  // display mode is the installed Store PWA, so never advertise opening itself.
  if ((isAndroid && isNativeAndroid) || (isWindows && isStandalone)) return;
  if (!isAndroid && !isWindows) return;
  if (cameFromOpenAttempt) return;

  try {
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    sessionStorage.setItem(DISMISS_KEY, "1");
  } catch (_) {}

  function exactHttpsUrl() {
    var url = new URL(window.location.href);
    url.searchParams.delete(OPEN_MARKER);
    return url;
  }

  function openAndroidApp() {
    var url = exactHttpsUrl();
    var pathAndQuery = url.pathname + url.search;
    var intentUrl =
      "intent://" + url.host + pathAndQuery +
      "#Intent;scheme=https;package=" + ANDROID_PACKAGE +
      ";S.browser_fallback_url=" + encodeURIComponent(url.href) +
      ";end";
    window.location.href = intentUrl;
  }

  function openWindowsApp() {
    // Windows/Edge navigation capture can hand this exact in-scope HTTPS URL
    // to the installed Microsoft Store PWA. If link handling is disabled, the
    // safe fallback is simply the same page in a browser tab.
    var url = exactHttpsUrl();
    url.searchParams.set(OPEN_MARKER, "1");

    var link = document.createElement("a");
    link.href = url.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function install() {
    if (!document.body || document.getElementById(BANNER_ID)) return;

    var style = document.createElement("style");
    style.id = BANNER_ID + "-style";
    style.textContent =
      "#" + BANNER_ID + "{" +
      "position:fixed;z-index:2147483646;top:max(8px,env(safe-area-inset-top));left:50%;" +
      "transform:translate(-50%,-14px);width:min(520px,calc(100vw - 24px));" +
      "display:flex;align-items:center;gap:10px;padding:9px 10px 9px 13px;" +
      "border:1px solid rgba(246,217,138,.45);border-radius:16px;" +
      "background:rgba(9,14,25,.96);color:#fff;" +
      "box-shadow:0 12px 36px rgba(0,0,0,.42);backdrop-filter:blur(14px);" +
      "-webkit-backdrop-filter:blur(14px);font-family:system-ui,-apple-system,'Segoe UI',sans-serif;" +
      "opacity:0;transition:opacity .2s ease,transform .2s ease;" +
      "box-sizing:border-box;color-scheme:dark;" +
      "}" +
      "#" + BANNER_ID + ".show{opacity:1;transform:translate(-50%,0)}" +
      "#" + BANNER_ID + ".hide{opacity:0;transform:translate(-50%,-14px);pointer-events:none}" +
      "#" + BANNER_ID + " .efp-open-copy{min-width:0;flex:1}" +
      "#" + BANNER_ID + " .efp-open-title{display:block;font-size:13px;font-weight:800;line-height:1.2}" +
      "#" + BANNER_ID + " .efp-open-sub{display:block;margin-top:2px;font-size:10.5px;line-height:1.25;color:rgba(255,255,255,.64)}" +
      "#" + BANNER_ID + " .efp-open-action{flex:0 0 auto;min-height:36px;padding:0 12px;border:1px solid rgba(246,217,138,.58);" +
      "border-radius:11px;background:#f6d98a;color:#111827;font:800 11.5px/1.1 system-ui,-apple-system,'Segoe UI',sans-serif;" +
      "cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;" +
      "-webkit-tap-highlight-color:transparent}" +
      "#" + BANNER_ID + " .efp-open-count{flex:0 0 28px;text-align:center;font-size:10px;font-weight:800;color:#f6d98a}" +
      "#" + BANNER_ID + " .efp-open-close{flex:0 0 28px;width:28px;height:28px;border:0;border-radius:9px;" +
      "background:rgba(255,255,255,.08);color:#fff;font:700 18px/1 Arial,sans-serif;cursor:pointer}" +
      "@media(max-width:520px){" +
      "#" + BANNER_ID + "{gap:7px;padding:8px 8px 8px 11px;border-radius:14px}" +
      "#" + BANNER_ID + " .efp-open-sub{display:none}" +
      "#" + BANNER_ID + " .efp-open-title{font-size:12px}" +
      "#" + BANNER_ID + " .efp-open-action{min-height:34px;padding:0 9px;font-size:10.5px}" +
      "#" + BANNER_ID + " .efp-open-count{flex-basis:22px;font-size:9.5px}" +
      "#" + BANNER_ID + " .efp-open-close{flex-basis:26px;width:26px;height:26px}" +
      "}" +
      "@media(prefers-reduced-motion:reduce){#" + BANNER_ID + "{transition:none}}" +
      "@media print{#" + BANNER_ID + "{display:none!important}}";
    document.head.appendChild(style);

    var banner = document.createElement("div");
    banner.id = BANNER_ID;
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", "Open ExamFusion Prep app");

    var copy = document.createElement("div");
    copy.className = "efp-open-copy";

    var title = document.createElement("span");
    title.className = "efp-open-title";
    title.textContent = isAndroid ? "Continue in ExamFusion Prep Android app" : "Continue in ExamFusion Prep Windows app";

    var sub = document.createElement("span");
    sub.className = "efp-open-sub";
    sub.textContent = isAndroid
      ? "Open this exact page in the installed app."
      : "Uses Windows link handling for this exact page.";

    copy.appendChild(title);
    copy.appendChild(sub);

    var action = document.createElement("button");
    action.type = "button";
    action.className = "efp-open-action";
    action.textContent = isAndroid ? "Open in Android" : "Open in Windows";
    action.addEventListener("click", function () {
      remove(true);
      if (isAndroid) openAndroidApp();
      else openWindowsApp();
    });

    var count = document.createElement("span");
    count.className = "efp-open-count";
    count.setAttribute("aria-live", "off");
    count.textContent = "5s";

    var close = document.createElement("button");
    close.type = "button";
    close.className = "efp-open-close";
    close.setAttribute("aria-label", "Dismiss");
    close.textContent = "×";

    banner.appendChild(copy);
    banner.appendChild(action);
    banner.appendChild(count);
    banner.appendChild(close);
    document.documentElement.appendChild(banner);

    var removed = false;
    var seconds = 5;
    var tickTimer = null;
    var removeTimer = null;

    function remove(immediate) {
      if (removed) return;
      removed = true;
      if (tickTimer) window.clearInterval(tickTimer);
      if (removeTimer) window.clearTimeout(removeTimer);
      banner.classList.add("hide");
      if (immediate) {
        banner.remove();
        style.remove();
      } else {
        window.setTimeout(function () {
          banner.remove();
          style.remove();
        }, 220);
      }
    }

    close.addEventListener("click", function () { remove(false); });

    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { banner.classList.add("show"); });
    });

    tickTimer = window.setInterval(function () {
      seconds -= 1;
      if (seconds > 0) count.textContent = seconds + "s";
      else count.textContent = "0s";
    }, 1000);

    removeTimer = window.setTimeout(function () { remove(false); }, 5000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
