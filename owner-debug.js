/* ExamFusion Prep — hidden owner analytics debug mode.
   Home page: tap the copyright area 7 times to open the control. */
(function () {
  "use strict";

  var STORAGE_KEY = "efp_owner_debug_ga4";
  var GA_ID = "G-Q1WNRY8ECV";
  var GA_DISABLE_KEY = "ga-disable-" + GA_ID;
  var TAP_TARGET = 7;
  var TAP_WINDOW_MS = 5000;

  function isEnabled() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "on";
    } catch (_) {
      return false;
    }
  }

  function applyAnalyticsState(enabled) {
    window[GA_DISABLE_KEY] = !!enabled;
  }

  // On owner-controlled pages this script is injected at the very start of
  // <head>, so the GA disable flag exists before the normal GA4 config runs.
  applyAnalyticsState(isEnabled());

  function serviceWorkerTarget() {
    if (!("serviceWorker" in navigator)) return Promise.resolve(null);
    if (navigator.serviceWorker.controller) {
      return Promise.resolve(navigator.serviceWorker.controller);
    }
    return navigator.serviceWorker.ready
      .then(function (registration) { return registration.active || null; })
      .catch(function () { return null; });
  }

  function syncServiceWorker(enabled) {
    return serviceWorkerTarget().then(function (worker) {
      if (!worker) return false;
      return new Promise(function (resolve) {
        var settled = false;
        var channel = new MessageChannel();
        var timer = setTimeout(function () {
          if (!settled) {
            settled = true;
            resolve(false);
          }
        }, 1500);

        channel.port1.onmessage = function () {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(true);
        };

        try {
          worker.postMessage({
            type: "EFP_OWNER_DEBUG_SET",
            enabled: !!enabled
          }, [channel.port2]);
        } catch (_) {
          clearTimeout(timer);
          resolve(false);
        }
      });
    });
  }

  function setEnabled(enabled) {
    try {
      if (enabled) localStorage.setItem(STORAGE_KEY, "on");
      else localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
    applyAnalyticsState(enabled);
    document.dispatchEvent(new CustomEvent("efp-owner-debug-changed", {
      detail: { enabled: !!enabled }
    }));
    return syncServiceWorker(enabled);
  }

  function onHomePage() {
    var p = location.pathname.replace(/\/+$/, "");
    return p === "" || p === "/index.html";
  }

  function makeButton(label, action) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.style.cssText = "border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:11px 14px;font:800 13px/1 system-ui,-apple-system,Segoe UI,sans-serif;cursor:pointer;background:#182236;color:#fff;min-width:96px";
    b.addEventListener("click", action);
    return b;
  }

  function openPanel() {
    if (document.getElementById("efpOwnerDebugOverlay")) return;

    var overlay = document.createElement("div");
    overlay.id = "efpOwnerDebugOverlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Owner Debug Mode");
    overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:20px;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)";

    var card = document.createElement("div");
    card.style.cssText = "width:min(420px,100%);border:1px solid rgba(246,217,138,.42);border-radius:20px;padding:22px;background:#0b1220;color:#f7f2e8;box-shadow:0 24px 70px rgba(0,0,0,.55);font-family:system-ui,-apple-system,Segoe UI,sans-serif;text-align:left";

    var title = document.createElement("div");
    title.textContent = "Owner Debug Mode";
    title.style.cssText = "font-size:20px;font-weight:900;margin-bottom:8px;color:#f6d98a";

    var status = document.createElement("div");
    status.style.cssText = "font-size:14px;font-weight:800;margin-bottom:10px";

    var note = document.createElement("div");
    note.textContent = "ON hone par is browser/device se Google Analytics tracking band rahegi. Students ki tracking par koi effect nahi hoga.";
    note.style.cssText = "font-size:12px;line-height:1.55;opacity:.82;margin-bottom:18px";

    var buttons = document.createElement("div");
    buttons.style.cssText = "display:flex;gap:9px;flex-wrap:wrap";

    var onBtn = makeButton("Turn ON", function () {
      onBtn.disabled = true;
      offBtn.disabled = true;
      status.textContent = "Enabling…";
      setEnabled(true).then(function () { location.reload(); });
    });
    onBtn.style.background = "#174d34";

    var offBtn = makeButton("Turn OFF", function () {
      onBtn.disabled = true;
      offBtn.disabled = true;
      status.textContent = "Disabling…";
      setEnabled(false).then(function () { location.reload(); });
    });
    offBtn.style.background = "#5b2530";

    var closeBtn = makeButton("Close", function () {
      overlay.remove();
    });

    function refresh() {
      var enabled = isEnabled();
      status.textContent = enabled ? "Status: ON — your GA4 traffic is blocked" : "Status: OFF — normal GA4 tracking";
      status.style.color = enabled ? "#7ee2a8" : "#ffb1b1";
      onBtn.disabled = enabled;
      offBtn.disabled = !enabled;
      onBtn.style.opacity = enabled ? ".45" : "1";
      offBtn.style.opacity = enabled ? "1" : ".45";
    }

    buttons.appendChild(onBtn);
    buttons.appendChild(offBtn);
    buttons.appendChild(closeBtn);
    card.appendChild(title);
    card.appendChild(status);
    card.appendChild(note);
    card.appendChild(buttons);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    refresh();

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) overlay.remove();
    });
  }

  function findCopyrightTarget() {
    var candidates = Array.prototype.slice.call(document.querySelectorAll(
      "footer, footer *, .footer, .footer *, .footer-bottom, .footer-bottom *, [class*='copyright'], [id*='copyright']"
    ));
    var matches = candidates.filter(function (el) {
      var t = (el.textContent || "").replace(/\s+/g, " ").trim();
      return /ExamFusion\s*Prep/i.test(t) && (/All Rights Reserved/i.test(t) || /©/.test(t));
    });
    matches.sort(function (a, b) {
      return (a.textContent || "").length - (b.textContent || "").length;
    });
    return matches[0] || null;
  }

  function installHiddenTrigger() {
    if (!onHomePage()) return;
    var target = findCopyrightTarget();
    if (!target) return;

    var taps = [];
    target.style.webkitTapHighlightColor = "transparent";
    target.addEventListener("click", function () {
      var now = Date.now();
      taps = taps.filter(function (t) { return now - t <= TAP_WINDOW_MS; });
      taps.push(now);
      if (taps.length >= TAP_TARGET) {
        taps = [];
        openPanel();
      }
    });

    // Keep the service worker's private owner state aligned with this browser.
    syncServiceWorker(isEnabled());
  }

  window.EFPOwnerDebug = {
    enabled: isEnabled,
    setEnabled: setEnabled,
    open: openPanel
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installHiddenTrigger, { once: true });
  } else {
    installHiddenTrigger();
  }
})();
