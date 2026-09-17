// ExamFusion Prep — mind-map hash deep-link + highlight (added 2026-09-18)
// Reads #<tab-id> on load (and on hash change) and shows that tab/panel
// directly by toggling the same CSS classes the page's own tab-switcher
// already uses (site-wide mind maps use several different template
// generations with different container classes and JS function names —
// switchTab/tab-content, switchTab/tab-panel, st()/tab-panel, show()/panel —
// so this manipulates classes directly instead of calling a named function).
(function () {
  "use strict";
  // [containerClass, activeClass] pairs, tried in order.
  var SCHEMES = [
    ["tab-content", "active"],
    ["tab-panel", "active"],
    ["panel", "show"],
    ["panel", "active"],
    ["tab", "active"]
  ];
  function findScheme(id) {
    var el = document.getElementById(id);
    if (!el || !el.classList) return null;
    for (var i = 0; i < SCHEMES.length; i++) {
      if (el.classList.contains(SCHEMES[i][0])) return { el: el, scheme: SCHEMES[i] };
    }
    return null;
  }
  function openHash() {
    var id = (location.hash || "").replace(/^#/, "");
    if (!id) return;
    var found = findScheme(id);
    if (!found) return;
    var containerClass = found.scheme[0], activeClass = found.scheme[1];
    var tagName = found.el.tagName; // scope clearing to same-tag siblings only,
    // so a container class shared with unrelated elements (e.g. "tab" on both
    // <button> nav items and <div> content panels) never cross-toggles them.
    document.querySelectorAll(tagName + "." + containerClass).forEach(function (el) {
      el.classList.remove(activeClass);
    });
    found.el.classList.add(activeClass);
    // Also try to mark the matching nav button active, matching common
    // onclick signatures across templates: switchTab('id'), st(event,'id'),
    // show('id', this) -- best-effort only, cosmetic.
    document.querySelectorAll("button, .tablink").forEach(function (btn) {
      var onclick = btn.getAttribute("onclick") || "";
      if (onclick.indexOf("'" + id + "'") !== -1 || onclick.indexOf('"' + id + '"') !== -1) {
        var group = btn.parentElement;
        if (group) {
          group.querySelectorAll("button, .tablink").forEach(function (b) { b.classList.remove("active"); });
        }
        btn.classList.add("active");
      }
    });
    setTimeout(function () {
      try { found.el.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) { found.el.scrollIntoView(); }
      found.el.classList.add("efp-deep-focus");
      setTimeout(function () { found.el.classList.remove("efp-deep-focus"); }, 2200);
    }, 60);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", openHash);
  } else {
    openHash();
  }
  window.addEventListener("hashchange", openHash);
})();
