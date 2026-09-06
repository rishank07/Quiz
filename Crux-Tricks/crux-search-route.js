(function (root) {
  "use strict";

  // Crux search runs both on the site homepage and one directory deeper on
  // /Crux-Tricks/index.html. Keep result URLs rooted at the site so the latter
  // never becomes /Crux-Tricks/Crux-Tricks/viewer.html (a GitHub Pages 404).
  root.efNormalizeCruxSearchUrl = function (value) {
    var url = String(value == null ? "" : value);
    return url.replace(/^(?:\.\/)?Crux-Tricks\//, "/Crux-Tricks/");
  };

  if (typeof document !== "undefined" && typeof location !== "undefined" && /\/Crux-Tricks(?:\/|$)/.test(location.pathname)) {
    // Keep the existing site-wide dark-mode compatibility behaviour unchanged.
    var darkButton = document.getElementById("darkBtn");
    if (darkButton) {
      darkButton.hidden = true;
      darkButton.setAttribute("aria-hidden", "true");
      darkButton.setAttribute("tabindex", "-1");
      darkButton.style.display = "none";
    }

    var homeButton = document.querySelector(".topbar .home-btn");
    if (homeButton) {
      homeButton.textContent = "← Home";
      homeButton.style.padding = "7px 10px";
      homeButton.style.fontSize = "11px";
    }

    // Visual polish only: chapter cards stay functionally identical, but the
    // browser-link blue/purple/underline treatment is removed and the list is
    // more compact on phones.
    if (!document.getElementById("efp-crux-chapter-polish")) {
      var style = document.createElement("style");
      style.id = "efp-crux-chapter-polish";
      style.textContent =
        ".chapters{gap:9px!important;}" +
        ".chapter{min-height:74px!important;padding:12px 13px!important;gap:10px!important;border-radius:15px!important;box-shadow:0 7px 18px rgba(15,23,42,.06)!important;transition:border-color .16s ease,background .16s ease,transform .16s ease!important;cursor:pointer;}" +
        ".chapter:hover{border-color:color-mix(in srgb,var(--accent) 65%,var(--line))!important;background:var(--soft)!important;transform:translateY(-1px);}" +
        ".chapter .cnum{width:38px!important;height:38px!important;flex-basis:38px!important;border-radius:11px!important;}" +
        ".chapter .ctxt,.chapter .ctxt:link,.chapter .ctxt:visited,.chapter .ctxt:hover,.chapter .ctxt:active{color:inherit!important;text-decoration:none!important;}" +
        ".chapter .cen{font-size:14px!important;font-weight:850!important;line-height:1.25!important;color:var(--text)!important;text-decoration:none!important;}" +
        ".chapter .chi{font-size:11px!important;line-height:1.3!important;color:var(--muted)!important;text-decoration:none!important;margin-top:3px!important;}" +
        ".chapter .cmeta{font-size:9.5px!important;color:var(--muted)!important;text-decoration:none!important;margin-top:5px!important;}" +
        ".chapter .cfav{flex:0 0 auto!important;font-size:21px!important;line-height:1!important;padding:5px!important;}" +
        "@media(max-width:420px){.chapter{min-height:70px!important;padding:10px 11px!important}.chapter .cnum{width:36px!important;height:36px!important;flex-basis:36px!important}.chapter .cen{font-size:13px!important}.chapter .chi{font-size:10.5px!important}.chapter .cmeta{font-size:9px!important}}";
      document.head.appendChild(style);
    }

    document.addEventListener("click", function (event) {
      var row = event.target.closest && event.target.closest(".chapter");
      if (!row || event.target.closest(".cfav") || event.target.closest("a")) return;
      var link = row.querySelector("a.ctxt");
      if (link && link.href) location.href = link.href;
    });
  }
})(typeof self !== "undefined" ? self : this);

/*
 * Crux browser-history bridge
 * ---------------------------
 * Crux & Tricks is a SPA: Material -> Source -> Subject -> Part -> Chapters
 * all live inside one index.html. Android/TWA hardware Back only understands
 * the browser history stack, so each logical SPA step must become a real
 * history entry. This bridge leaves the existing UI code untouched and mirrors
 * its visible state into pushState/popstate.
 */
(function () {
  "use strict";

  if (typeof window === "undefined" || typeof document === "undefined") return;

  function normalizedPath(pathname) {
    var path = pathname || "/";
    try { path = decodeURIComponent(path); } catch (_) {}
    path = path.replace(/\/{2,}/g, "/");
    if (path.length > 1) path = path.replace(/\/$/, "");
    return path.toLowerCase();
  }

  if (normalizedPath(location.pathname) !== "/crux-tricks/index.html" &&
      normalizedPath(location.pathname) !== "/crux-tricks") return;

  var STATE_FLAG = "efpCruxNav";
  var bootState = history.state;
  var restoring = false;
  var ready = false;
  var SUBJECTS = ["History", "Polity", "Geography", "Science", "Static GK"];
  var BRANCHES = [
    "Ancient History", "Medieval History", "Modern History",
    "Indian Geography", "World Geography", "Physics", "Chemistry", "Biology"
  ];

  function baseUrl() {
    return location.pathname + location.hash;
  }

  function isManaged(state) {
    return !!(state && state[STATE_FLAG] === true && typeof state.level === "string");
  }

  function currentState() {
    return isManaged(history.state) ? history.state : null;
  }

  function makeState(level, depth, data) {
    var state = {
      efpCruxNav: true,
      level: level,
      depth: Math.max(0, Number(depth) || 0),
      kind: "",
      source: "",
      subject: "",
      branch: "",
      utility: ""
    };
    if (data) {
      Object.keys(data).forEach(function (key) {
        if (key in state) state[key] = String(data[key] == null ? "" : data[key]);
      });
    }
    return state;
  }

  function sameState(a, b) {
    if (!isManaged(a) || !isManaged(b)) return false;
    return a.level === b.level && a.depth === b.depth &&
      a.kind === b.kind && a.source === b.source &&
      a.subject === b.subject && a.branch === b.branch &&
      a.utility === b.utility;
  }

  function consume(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  function labelFromChoice(button) {
    var label = button && button.querySelector ? button.querySelector(".copy b") : null;
    return label ? String(label.textContent || "").trim() : "";
  }

  function matchKnown(button, values) {
    var text = String(button && button.textContent || "").replace(/\s+/g, " ").trim();
    for (var i = 0; i < values.length; i++) {
      if (text.indexOf(values[i]) !== -1) return values[i];
    }
    return "";
  }

  function visible(id) {
    var el = document.getElementById(id);
    return !!(el && !el.hidden);
  }

  function commitTransition(previous, next) {
    if (restoring || !next) return;

    // Existing Crux helpers use history.replaceState(null, ...) for the old
    // ?view= utility filter. Put our marker back on the entry the user came
    // from before adding the new logical step.
    if (isManaged(previous)) {
      history.replaceState(previous, "", baseUrl());
    }

    if (sameState(previous, next)) return;
    history.pushState(next, "", baseUrl());
  }

  function scheduleTransition(previous, builder) {
    window.setTimeout(function () {
      if (restoring) return;
      var next = builder();
      commitTransition(previous, next);
    }, 0);
  }

  function clickMaterial(kind) {
    var button = document.querySelector('[data-material="' + kind + '"]');
    if (!button) return false;
    button.click();
    return true;
  }

  function clickSource(source) {
    var buttons = document.querySelectorAll("#sourceChoices .choice");
    for (var i = 0; i < buttons.length; i++) {
      if (labelFromChoice(buttons[i]) === source) {
        buttons[i].click();
        return true;
      }
    }
    return false;
  }

  function clickSubject(subject) {
    var buttons = document.querySelectorAll("#subjectChoices .subject");
    for (var i = 0; i < buttons.length; i++) {
      if (matchKnown(buttons[i], SUBJECTS) === subject) {
        buttons[i].click();
        return true;
      }
    }
    return false;
  }

  function clickBranch(branch) {
    var buttons = document.querySelectorAll("#partChoices .part");
    for (var i = 0; i < buttons.length; i++) {
      if (matchKnown(buttons[i], BRANCHES) === branch) {
        buttons[i].click();
        return true;
      }
    }
    return false;
  }

  function clickUtility(kind) {
    var button = document.querySelector('.utility[data-kind="' + kind + '"]');
    if (!button) return false;
    button.click();
    return true;
  }

  function resetUiToMaterial() {
    // backMaterial is wired directly to root() by the existing Crux SPA. It is
    // safe to invoke even while hidden and gives us one deterministic reset.
    var reset = document.getElementById("backMaterial");
    if (reset) reset.click();
  }

  function restoreState(state) {
    if (!isManaged(state)) return;

    restoring = true;
    try {
      resetUiToMaterial();

      if (state.level === "material") return;
      if (!clickMaterial(state.kind)) return;

      if (state.level === "source") return;
      if (!clickSource(state.source)) return;

      if (state.level === "subjects") return;

      if (state.level === "utility") {
        clickUtility(state.utility);
        return;
      }

      if (!clickSubject(state.subject)) return;
      if (state.level === "parts") return;

      if (state.level === "chapters" && state.branch) {
        clickBranch(state.branch);
      }
    } finally {
      // UI helper clicks above may run old replaceState(null, ...) calls.
      // Reinstate the browser-history marker for the entry we just restored.
      history.replaceState(state, "", baseUrl());
      restoring = false;
      try { window.scrollTo(0, 0); } catch (_) {}
    }
  }

  function goToSourceEntry(event, state) {
    if (!isManaged(state) || state.depth <= 1) return false;
    consume(event);
    history.go(1 - state.depth);
    return true;
  }

  // Use the window capture phase so this runs before back-nav.js and before
  // target onclick handlers. Android hardware Back does not generate a click;
  // it is handled separately by the popstate listener below.
  window.addEventListener("click", function (event) {
    if (!ready || restoring || !event.target || !event.target.closest) return;

    var state = currentState();
    var target = event.target;

    var globalBack = target.closest("#efp-app-back-button");
    if (globalBack && state && state.level !== "material") {
      consume(event);
      history.back();
      return;
    }

    var backSource = target.closest("#backSource");
    if (backSource && goToSourceEntry(event, state)) return;

    var oneStepBack = target.closest("#backMaterial, #backSubjects, #backParts");
    if (oneStepBack && state && state.depth > 0) {
      consume(event);
      history.back();
      return;
    }

    var material = target.closest("[data-material]");
    if (material) {
      var previousMaterial = state;
      var selectedKind = String(material.getAttribute("data-material") || "");
      scheduleTransition(previousMaterial, function () {
        var depth = previousMaterial ? previousMaterial.depth + 1 : 1;
        return makeState("source", depth, { kind: selectedKind });
      });
      return;
    }

    var sourceButton = target.closest("#sourceChoices .choice");
    if (sourceButton) {
      var previousSource = state;
      var selectedSource = labelFromChoice(sourceButton);
      scheduleTransition(previousSource, function () {
        var depth = previousSource ? previousSource.depth + 1 : 2;
        return makeState("subjects", depth, {
          kind: previousSource && previousSource.kind,
          source: selectedSource
        });
      });
      return;
    }

    var subjectButton = target.closest("#subjectChoices .subject");
    if (subjectButton) {
      var previousSubject = state;
      var selectedSubject = matchKnown(subjectButton, SUBJECTS);
      scheduleTransition(previousSubject, function () {
        var depth = previousSubject ? previousSubject.depth + 1 : 3;
        var nextLevel = visible("partPane") ? "parts" : "chapters";
        return makeState(nextLevel, depth, {
          kind: previousSubject && previousSubject.kind,
          source: previousSubject && previousSubject.source,
          subject: selectedSubject
        });
      });
      return;
    }

    var partButton = target.closest("#partChoices .part");
    if (partButton) {
      var previousPart = state;
      var selectedBranch = matchKnown(partButton, BRANCHES);
      scheduleTransition(previousPart, function () {
        var depth = previousPart ? previousPart.depth + 1 : 4;
        return makeState("chapters", depth, {
          kind: previousPart && previousPart.kind,
          source: previousPart && previousPart.source,
          subject: previousPart && previousPart.subject,
          branch: selectedBranch
        });
      });
      return;
    }

    var utilityButton = target.closest(".utility[data-kind]");
    if (utilityButton) {
      var previousUtility = state;
      var utility = String(utilityButton.getAttribute("data-kind") || "");
      scheduleTransition(previousUtility, function () {
        var depth = previousUtility ? previousUtility.depth + 1 : 3;
        return makeState("utility", depth, {
          kind: previousUtility && previousUtility.kind,
          source: previousUtility && previousUtility.source,
          utility: utility
        });
      });
    }
  }, true);

  window.addEventListener("popstate", function (event) {
    if (isManaged(event.state)) {
      restoreState(event.state);
    }
  });

  function initialize() {
    if (ready) return;
    ready = true;

    if (isManaged(bootState)) {
      // A real page navigation (e.g. viewer -> Android Back -> Crux) can reload
      // index.html. The old inline SPA init replaces history.state with null, so
      // bootState captured above is the durable state we restore here.
      restoreState(bootState);
    } else {
      history.replaceState(makeState("material", 0), "", baseUrl());
    }

    window.EFP_CRUX_BROWSER_HISTORY = {
      canGoBackInsideCrux: function () {
        var state = currentState();
        return !!(state && state.level !== "material");
      },
      state: function () { return currentState(); }
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    window.setTimeout(initialize, 0);
  }
})();
