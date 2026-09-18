// ExamFusion Prep — Mind Maps exact-tab deep-link + highlight.
// Search indexes store the logical tab key (for example #history, #admin,
// #t4). Mind-map templates use several generations of markup: some panels
// have id="history", others id="tab-history", and their native switchers are
// named switchTab(), st(), show(), etc. Prefer the page's own tab control so
// its native switcher controls all template-specific state; use class/id
// fallbacks only when no clickable navigation control can be resolved.
(function () {
  "use strict";

  var SCHEMES = [
    ["tab-content", "active"],
    ["tab-panel", "active"],
    ["panel", "show"],
    ["panel", "active"],
    ["tab", "active"]
  ];

  function hashKey() {
    var raw = (window.location.hash || "").replace(/^#/, "");
    if (!raw) return "";
    try { raw = decodeURIComponent(raw); } catch (_) {}
    return raw.trim();
  }

  function candidateIds(key) {
    var out = [];
    function add(value) {
      value = String(value || "").trim();
      if (value && out.indexOf(value) === -1) out.push(value);
    }
    add(key);
    if (/^tab-/i.test(key)) add(key.replace(/^tab-/i, ""));
    else add("tab-" + key);
    if (/^panel-/i.test(key)) add(key.replace(/^panel-/i, ""));
    else add("panel-" + key);
    if (/^section-/i.test(key)) add(key.replace(/^section-/i, ""));
    else add("section-" + key);
    return out;
  }

  function onclickTargetsKey(el, key) {
    var onclick = el.getAttribute("onclick") || "";
    if (!onclick) return false;
    var ids = candidateIds(key);
    for (var i = 0; i < ids.length; i++) {
      if (onclick.indexOf("'" + ids[i] + "'") !== -1 ||
          onclick.indexOf('"' + ids[i] + '"') !== -1) return true;
    }
    return false;
  }

  function dataTargetsKey(el, key) {
    var ids = candidateIds(key);
    var attrs = ["data-target", "data-tab", "aria-controls"];
    for (var i = 0; i < attrs.length; i++) {
      var value = el.getAttribute(attrs[i]);
      if (value && ids.indexOf(value.replace(/^#/, "")) !== -1) return true;
    }
    return false;
  }

  function matchingNavControl(key) {
    var controls = document.querySelectorAll(
      "button, a, .tablink, .tab-btn, .tab"
    );
    for (var i = 0; i < controls.length; i++) {
      if (onclickTargetsKey(controls[i], key) || dataTargetsKey(controls[i], key)) {
        return controls[i];
      }
    }
    return null;
  }

  function findPanel(key) {
    var ids = candidateIds(key);
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (!el || !el.classList) continue;
      for (var j = 0; j < SCHEMES.length; j++) {
        if (el.classList.contains(SCHEMES[j][0])) {
          return { el: el, scheme: SCHEMES[j] };
        }
      }
    }
    return null;
  }

  function activatePanelDirectly(found) {
    if (!found) return;
    var containerClass = found.scheme[0];
    var activeClass = found.scheme[1];
    var tagName = found.el.tagName;
    document.querySelectorAll(tagName + "." + containerClass).forEach(function (el) {
      el.classList.remove(activeClass);
    });
    found.el.classList.add(activeClass);
  }

  function markNavActive(key, preferred) {
    var control = preferred || matchingNavControl(key);
    if (!control) return;
    var parent = control.parentElement;
    if (parent) {
      parent.querySelectorAll("button, a, .tablink, .tab-btn, .tab").forEach(function (el) {
        if (el !== control) el.classList.remove("active", "show", "selected");
      });
    }
    control.classList.add("active");
  }

  function focusTarget(key, preferredControl) {
    var found = findPanel(key);
    var target = found ? found.el : preferredControl;
    if (!target) return false;

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        try {
          target.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
        } catch (_) {
          target.scrollIntoView();
        }
        target.classList.add("efp-deep-focus");
        clearTimeout(target.__efpDeepFocusTimer);
        target.__efpDeepFocusTimer = setTimeout(function () {
          target.classList.remove("efp-deep-focus");
        }, 3600);
      });
    });
    return true;
  }

  function openHash() {
    var key = hashKey();
    if (!key) return;

    // Prefer native navigation. This is the most reliable path because pages
    // vary between id="history" and id="tab-history", and their own functions
    // may update additional state beyond CSS classes.
    var control = matchingNavControl(key);
    if (control) {
      try { control.click(); } catch (_) {}
    }

    var found = findPanel(key);
    if (found) {
      var activeClass = found.scheme[1];
      if (!found.el.classList.contains(activeClass)) activatePanelDirectly(found);
      markNavActive(key, control);
      focusTarget(key, control);
      return;
    }

    // Older pages may expose a logical key only through the native tab control.
    if (control) {
      markNavActive(key, control);
      focusTarget(key, control);
    }
  }

  function runWithRetry() {
    var key = hashKey();
    if (!key) return;
    var attempts = 0;
    (function seek() {
      var control = matchingNavControl(key);
      var panel = findPanel(key);
      if (control || panel) {
        openHash();
        return;
      }
      if (++attempts < 40) setTimeout(seek, 50);
    })();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runWithRetry, { once: true });
  } else {
    runWithRetry();
  }

  window.addEventListener("hashchange", runWithRetry);
  window.addEventListener("pageshow", function () {
    if (hashKey()) setTimeout(runWithRetry, 0);
  });
})();
