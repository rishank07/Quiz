(function () {
  "use strict";

  var CLASS_NAME = "efp-crux-restoring";
  var waitToken = 0;

  function managed(state) {
    return !!(state && state.efpCruxNav === true && state.level && state.level !== "material");
  }

  function visible(id) {
    var el = document.getElementById(id);
    return !!(el && !el.hidden);
  }

  function stateIsPaintReady(state) {
    if (!managed(state)) return true;

    if (state.level === "source") {
      return visible("source") && !visible("material");
    }
    if (state.level === "exam") {
      return visible("exam") && !visible("material") && !visible("source") && !visible("study");
    }
    if (state.level === "subjects") {
      return visible("study") && visible("subjectPane") && !visible("source");
    }
    if (state.level === "parts") {
      return visible("study") && visible("partPane") && !visible("subjectPane");
    }
    if (state.level === "chapters") {
      return visible("study") && visible("chapterPane") && !visible("partPane") && !visible("subjectPane");
    }
    if (state.level === "utility") {
      return visible("study") && visible("resultsWrap");
    }
    return false;
  }

  function release() {
    if (!document.documentElement.classList.contains(CLASS_NAME)) return;
    requestAnimationFrame(function () {
      document.documentElement.classList.remove(CLASS_NAME);
    });
  }

  function waitUntilCorrectPane(state) {
    var token = ++waitToken;
    if (!managed(state)) {
      release();
      return;
    }

    document.documentElement.classList.add(CLASS_NAME);

    var deadline = Date.now() + 1400;

    function check() {
      if (token !== waitToken) return;
      if (stateIsPaintReady(state) || Date.now() >= deadline) {
        // Never leave the whole Crux page hidden indefinitely. On some
        // Android WebView/TWA history restores the SPA state can arrive a
        // frame late (or an optional pane may not exist yet). A short
        // fail-safe is preferable to a permanent black/frozen screen.
        release();
        return;
      }
      requestAnimationFrame(check);
    }

    check();
  }

  /* The history bridge is loaded before this file. On DOMContentLoaded its
     restore handler runs first; we then verify that the exact pane described by
     history.state is visible before allowing the page to paint. This prevents
     the legacy Material/root screen from flashing on slow Android/TWA returns. */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      waitUntilCorrectPane(history.state);
    }, { once: true });
  } else {
    waitUntilCorrectPane(history.state);
  }

  window.addEventListener("popstate", function (event) {
    if (managed(event.state)) waitUntilCorrectPane(event.state);
    else release();
  });

  // Back-forward cache restores do not always replay the same lifecycle in
  // Android app shells. Re-check the active history state whenever this page
  // becomes visible again so a stale restore guard can never keep body hidden.
  window.addEventListener("pageshow", function () {
    if (managed(history.state)) waitUntilCorrectPane(history.state);
    else release();
  });
})();
