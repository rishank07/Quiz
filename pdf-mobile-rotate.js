(function(){
  'use strict';

  var buttons = document.querySelectorAll('[data-efp-pdf-rotate]');
  if (!buttons.length) return;

  var root = document.documentElement;
  var forcedFullscreen = false;
  var manualMode = '';
  var busy = false;
  var requestedLandscape = false;

  function actualLandscape(){
    try {
      return !!(window.matchMedia && window.matchMedia('(orientation: landscape)').matches);
    } catch (_) {
      return window.innerWidth > window.innerHeight;
    }
  }

  requestedLandscape = actualLandscape();

  var style = document.createElement('style');
  style.id = 'efp-pdf-mobile-rotate-style';
  style.textContent =
    'html.efp-manual-pdf-landscape,html.efp-manual-pdf-landscape body,html.efp-manual-pdf-portrait,html.efp-manual-pdf-portrait body{overflow:hidden!important;width:100%!important;height:100%!important}' +
    'html.efp-manual-pdf-landscape body{position:fixed!important;top:0!important;left:0!important;width:100vh!important;height:100vw!important;max-width:none!important;max-height:none!important;transform:rotate(90deg) translateY(-100%)!important;transform-origin:top left!important}' +
    'html.efp-manual-pdf-portrait body{position:fixed!important;top:0!important;left:0!important;width:100vh!important;height:100vw!important;max-width:none!important;max-height:none!important;transform:rotate(-90deg) translateX(-100%)!important;transform-origin:top left!important}' +
    '[data-efp-pdf-rotate] .efp-orientation-icon{display:block;width:27px;height:27px;pointer-events:none}' +
    '[data-efp-pdf-rotate] .efp-orientation-icon *{vector-effect:non-scaling-stroke}' +
    '.efp-pdf-rotate-fallback-toast{position:fixed;left:50%;bottom:max(76px,calc(12px + env(safe-area-inset-bottom)));transform:translateX(-50%) translateY(12px);z-index:9999;opacity:0;pointer-events:none;background:rgba(15,23,42,.94);color:#fff;border-radius:999px;padding:8px 12px;font:800 11px/1.25 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.28);transition:opacity .18s ease,transform .18s ease}' +
    '.efp-pdf-rotate-fallback-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}';
  document.head.appendChild(style);

  function orientationIcon(targetLandscape){
    if (targetLandscape) {
      return '<svg class="efp-orientation-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false">' +
        '<rect x="4.5" y="10" width="23" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/>' +
        '<path d="M8.5 7.4A11.4 11.4 0 0 1 22 6.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' +
        '<path d="M20.1 3.9 24 6.2l-3.1 3.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>';
    }
    return '<svg class="efp-orientation-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false">' +
      '<rect x="9" y="4.5" width="14" height="23" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/>' +
      '<path d="M25.1 9.2a11.3 11.3 0 0 1 .7 13.4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' +
      '<path d="m23.4 20.8 2.4 3.8 3.1-3.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';
  }

  function shownLandscape(){
    if (manualMode === 'landscape') return true;
    if (manualMode === 'portrait') return false;
    return actualLandscape();
  }

  function syncButton(){
    var land = shownLandscape();
    var targetLandscape = !land;
    Array.prototype.forEach.call(buttons, function(btn){
      var label = targetLandscape ? 'Rotate PDF to landscape' : 'Rotate PDF to portrait';
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
      btn.dataset.orientationTarget = targetLandscape ? 'landscape' : 'portrait';
      btn.innerHTML = orientationIcon(targetLandscape);
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

  function unlockOrientation(){
    try {
      if (window.screen && screen.orientation && typeof screen.orientation.unlock === 'function') {
        screen.orientation.unlock();
      }
    } catch (_) {}
  }

  function lockOrientation(target){
    if (!orientationApiAvailable()) return Promise.reject(new Error('orientation-lock-unavailable'));
    try {
      return Promise.resolve(screen.orientation.lock(target));
    } catch (err) {
      return Promise.reject(err);
    }
  }

  function wait(ms){
    return new Promise(function(resolve){ window.setTimeout(resolve, ms); });
  }

  function waitForOrientation(wantLandscape, timeout){
    timeout = timeout || 850;
    return new Promise(function(resolve){
      var done = false;
      var start = Date.now();

      function finish(value){
        if (done) return;
        done = true;
        window.removeEventListener('resize', check);
        window.removeEventListener('orientationchange', check);
        resolve(value);
      }

      function check(){
        if (actualLandscape() === wantLandscape) {
          finish(true);
          return;
        }
        if (Date.now() - start >= timeout) finish(false);
      }

      window.addEventListener('resize', check, { passive:true });
      window.addEventListener('orientationchange', check, { passive:true });
      check();
      window.setTimeout(check, timeout + 20);
    });
  }

  function dispatchResize(){
    window.setTimeout(function(){
      try { window.dispatchEvent(new Event('resize')); } catch (_) {}
    }, 70);
  }

  function setManualMode(mode){
    manualMode = mode || '';
    root.classList.toggle('efp-manual-pdf-landscape', manualMode === 'landscape');
    root.classList.toggle('efp-manual-pdf-portrait', manualMode === 'portrait');
    dispatchResize();
    syncButton();
  }

  async function enterOwnedFullscreen(){
    if (document.fullscreenElement) return true;
    if (!document.documentElement.requestFullscreen) return false;
    try {
      await document.documentElement.requestFullscreen({ navigationUI:'hide' });
      forcedFullscreen = true;
      return true;
    } catch (_) {
      try {
        await document.documentElement.requestFullscreen();
        forcedFullscreen = true;
        return true;
      } catch (_) {
        return false;
      }
    }
  }

  async function leaveOwnedFullscreen(){
    if (!forcedFullscreen) return;
    forcedFullscreen = false;
    if (document.fullscreenElement && document.exitFullscreen) {
      try { await document.exitFullscreen(); } catch (_) {}
    }
  }

  async function nativeLandscape(){
    try {
      await lockOrientation('landscape-primary');
      return await waitForOrientation(true, 900);
    } catch (_) {}

    if (!document.fullscreenElement) {
      var full = await enterOwnedFullscreen();
      if (!full) return false;
    }

    try {
      await lockOrientation('landscape-primary');
      return await waitForOrientation(true, 1100);
    } catch (_) {
      return false;
    }
  }

  async function nativePortrait(){
    try {
      await lockOrientation('portrait-primary');
      if (await waitForOrientation(false, 1100)) return true;
    } catch (_) {}

    /* A landscape lock made in fullscreen can survive until it is explicitly
       released. Unlock first, then give the phone sensor a chance to restore
       portrait before falling back to CSS. */
    unlockOrientation();
    if (await waitForOrientation(false, 700)) return true;

    if (document.fullscreenElement) {
      try {
        await lockOrientation('portrait-primary');
        if (await waitForOrientation(false, 1100)) return true;
      } catch (_) {}
    }

    if (forcedFullscreen) {
      await leaveOwnedFullscreen();
      unlockOrientation();
      if (await waitForOrientation(false, 900)) return true;
    }

    return false;
  }

  async function rotate(){
    if (busy) return;
    busy = true;

    var goLandscape = !shownLandscape();
    requestedLandscape = goLandscape;

    /* Remove any previous CSS fallback before trying the real Screen
       Orientation API again. */
    if (manualMode) setManualMode('');

    var success = false;
    if (goLandscape) {
      success = await nativeLandscape();
      if (!success) {
        setManualMode('landscape');
        success = true;
      }
    } else {
      success = await nativePortrait();
      if (!success) {
        /* If the browser refuses to release a native landscape lock, visually
           restore portrait so the control still has a deterministic way back. */
        setManualMode(actualLandscape() ? 'portrait' : '');
        success = true;
      }
    }

    await wait(80);
    syncButton();
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
        if (!busy && !manualMode) requestedLandscape = actualLandscape();
        syncButton();
      });
    }
  } catch (_) {}

  window.addEventListener('orientationchange', function(){
    window.setTimeout(function(){
      if (!busy && !manualMode) requestedLandscape = actualLandscape();
      syncButton();
    }, 140);
  });

  window.addEventListener('resize', function(){
    if (!busy && !manualMode && !forcedFullscreen) requestedLandscape = actualLandscape();
    syncButton();
  });

  document.addEventListener('fullscreenchange', function(){
    if (!document.fullscreenElement) forcedFullscreen = false;
    syncButton();
  });

  syncButton();
})();