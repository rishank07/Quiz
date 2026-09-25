(function(){
  'use strict';

  var buttons = document.querySelectorAll('[data-efp-pdf-rotate]');
  if (!buttons.length) return;

  var root = document.documentElement;
  var forcedFullscreen = false;
  var manualLandscape = false;
  var busy = false;

  var style = document.createElement('style');
  style.id = 'efp-pdf-mobile-rotate-style';
  style.textContent =
    'html.efp-manual-pdf-rotate,html.efp-manual-pdf-rotate body{overflow:hidden!important;width:100%!important;height:100%!important}' +
    'html.efp-manual-pdf-rotate body{position:fixed!important;top:0!important;left:0!important;width:100vh!important;height:100vw!important;max-width:none!important;max-height:none!important;transform:rotate(90deg) translateY(-100%)!important;transform-origin:top left!important}' +
    '.efp-pdf-rotate-fallback-toast{position:fixed;left:50%;bottom:max(76px,calc(12px + env(safe-area-inset-bottom)));transform:translateX(-50%) translateY(12px);z-index:9999;opacity:0;pointer-events:none;background:rgba(15,23,42,.94);color:#fff;border-radius:999px;padding:8px 12px;font:800 11px/1.25 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.28);transition:opacity .18s ease,transform .18s ease}' +
    '.efp-pdf-rotate-fallback-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}';
  document.head.appendChild(style);

  function actualLandscape(){
    try {
      return !!(window.matchMedia && window.matchMedia('(orientation: landscape)').matches);
    } catch (_) {
      return window.innerWidth > window.innerHeight;
    }
  }

  function shownLandscape(){
    return manualLandscape || actualLandscape();
  }

  function syncButton(){
    var land = shownLandscape();
    Array.prototype.forEach.call(buttons, function(btn){
      var label = land ? 'Rotate PDF to portrait' : 'Rotate PDF to landscape';
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
      btn.classList.toggle('is-landscape', land);
    });
  }

  var toastTimer = 0;
  function showToast(message){
    var existing = document.getElementById('toast');
    if (existing) {
      existing.textContent = message;
      existing.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function(){ existing.classList.remove('show'); }, 1500);
      return;
    }

    var el = document.getElementById('efpPdfRotateToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'efpPdfRotateToast';
      el.className = 'efp-pdf-rotate-fallback-toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ el.classList.remove('show'); }, 1500);
  }

  function orientationApiAvailable(){
    return !!(window.screen && screen.orientation && typeof screen.orientation.lock === 'function');
  }

  function lockOrientation(target){
    if (!orientationApiAvailable()) return Promise.reject(new Error('orientation-lock-unavailable'));
    try {
      return Promise.resolve(screen.orientation.lock(target));
    } catch (err) {
      return Promise.reject(err);
    }
  }

  function dispatchResize(){
    window.setTimeout(function(){
      try { window.dispatchEvent(new Event('resize')); } catch (_) {}
    }, 60);
  }

  function setManualLandscape(on){
    manualLandscape = !!on;
    root.classList.toggle('efp-manual-pdf-rotate', manualLandscape);
    dispatchResize();
    syncButton();
  }

  async function leaveOwnedFullscreen(){
    if (!forcedFullscreen) return;
    forcedFullscreen = false;
    if (document.fullscreenElement && document.exitFullscreen) {
      try { await document.exitFullscreen(); } catch (_) {}
    }
  }

  async function rotate(){
    if (busy) return;
    busy = true;

    var goLandscape = manualLandscape ? false : !actualLandscape();
    var target = goLandscape ? 'landscape' : 'portrait';

    if (manualLandscape) {
      setManualLandscape(false);
      showToast('Portrait view');
      busy = false;
      return;
    }

    try {
      await lockOrientation(target);
      syncButton();
      window.setTimeout(syncButton, 250);
      showToast(goLandscape ? 'Landscape view' : 'Portrait view');
      if (!goLandscape) await leaveOwnedFullscreen();
      busy = false;
      return;
    } catch (_) {}

    if (orientationApiAvailable() && !document.fullscreenElement &&
        document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
        forcedFullscreen = true;
        await lockOrientation(target);
        syncButton();
        window.setTimeout(syncButton, 250);
        showToast(goLandscape ? 'Landscape view' : 'Portrait view');
        if (!goLandscape) await leaveOwnedFullscreen();
        busy = false;
        return;
      } catch (_) {
        await leaveOwnedFullscreen();
      }
    }

    setManualLandscape(goLandscape);
    showToast(goLandscape ? 'Landscape view' : 'Portrait view');
    busy = false;
  }

  Array.prototype.forEach.call(buttons, function(btn){
    btn.addEventListener('click', function(event){
      event.preventDefault();
      event.stopPropagation();
      rotate();
    });
  });

  try {
    if (screen.orientation && screen.orientation.addEventListener) {
      screen.orientation.addEventListener('change', function(){
        if (!manualLandscape) syncButton();
      });
    }
  } catch (_) {}

  window.addEventListener('orientationchange', function(){
    if (!manualLandscape) window.setTimeout(syncButton, 120);
  });
  window.addEventListener('resize', function(){
    if (!manualLandscape) syncButton();
  });
  document.addEventListener('fullscreenchange', function(){
    if (!document.fullscreenElement) forcedFullscreen = false;
  });

  syncButton();
})();