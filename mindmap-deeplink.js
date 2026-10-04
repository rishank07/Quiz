// ExamFusion Prep — Mind Maps exact-tab deep-link + highlight.
// Search indexes store the logical tab key (for example #history, #admin,
// #t4). Mind-map templates use several generations of markup: some panels
// have id="history", others id="tab-history", and their native switchers are
// named switchTab(), st(), show(), etc. Prefer the page's own tab control so
// its native switcher controls all template-specific state; use class/id
// fallbacks only when no clickable navigation control can be resolved.
(function () {
  "use strict";

  var openedKey = "";
  var focusRun = 0;
  var readerLink = document.createElement("link");
  readerLink.rel = "stylesheet";
  readerLink.href = "/mindmap-reader.css?v=20261004uniquehtml1";
  document.documentElement.classList.add("efp-mindmap-reader");
  document.head.appendChild(readerLink);

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

  function searchQuery() {
    try {
      var token = new URL(location.href).searchParams.get("efSearchReturn") ||
        (history.state && history.state.efpSearchReturnToken);
      if (!token) return "";
      var saved = JSON.parse(sessionStorage.getItem("efp_search_return_v1:" + token) || "null");
      if (!saved || saved.token !== token || !Array.isArray(saved.inputs) ||
          new URL(saved.source, location.origin).origin !== location.origin) return "";
      var field = saved.inputs.find(function (input) { return String(input.value || "").trim(); });
      return field ? String(field.value).trim().slice(0, 160) : "";
    } catch (_) { return ""; }
  }

  function clearSearchFocus() {
    ++focusRun;
    document.querySelectorAll(".efp-mindmap-search-context").forEach(function (el) { el.remove(); });
    document.querySelectorAll("mark.efp-mindmap-match").forEach(function (el) {
      el.replaceWith(document.createTextNode(el.textContent));
    });
    document.querySelectorAll(".efp-deep-focus").forEach(function (el) {
      el.classList.remove("efp-deep-focus");
      clearTimeout(el.__efpDeepFocusTimer);
    });
  }

  function highlightQuery(target, query) {
    if (!query) return [];
    var ignored = /^(?:the|a|an|and|or|of|in|on|to|for|is|was|are|were|by|with|da|de|ka|ki|ke|hai|hain|में|का|की|के|है|हैं|और|से)$/i;
    var terms = query.split(/[^\p{L}\p{M}\p{N}]+/u).filter(function (term) {
      return term.length >= 2 && !ignored.test(term);
    });
    terms.unshift(query);
    terms = terms.filter(function (term, i) { return term && terms.indexOf(term) === i; });
    terms.sort(function (a, b) { return b.length - a.length; });
    var pattern = new RegExp("(^|[^\\p{L}\\p{M}\\p{N}])(" + terms.map(function (term) {
      return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }).join("|") + ")(?=$|[^\\p{L}\\p{M}\\p{N}])", "giu");
    var walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        return node.parentElement && node.parentElement.getClientRects().length && !node.parentElement.closest(
          "script,style,button,a,textarea,select,svg,.efp-mm-table-hint,.efp-mindmap-search-context"
        ) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var nodes = [], node, marks = [];
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach(function (textNode) {
      if (marks.length >= 200) return;
      pattern.lastIndex = 0;
      var text = textNode.nodeValue, match, offset = 0, fragment = document.createDocumentFragment();
      while ((match = pattern.exec(text)) && marks.length < 200) {
        var start = match.index + match[1].length;
        fragment.appendChild(document.createTextNode(text.slice(offset, start)));
        var mark = document.createElement("mark");
        mark.className = "efp-mindmap-match";
        mark.textContent = match[2];
        fragment.appendChild(mark); marks.push(mark);
        offset = start + match[2].length;
      }
      if (offset) {
        fragment.appendChild(document.createTextNode(text.slice(offset)));
        textNode.replaceWith(fragment);
      }
    });
    return marks;
  }

  function searchContext(target, key, control, query, marks) {
    // Count reading units, not repeated words or bilingual text in one unit.
    var groups = [], owners = new Map();
    marks.forEach(function (mark) {
      var owner = mark.closest("tr,li,.section-card,.card,.flow-box,.fact,.event,.timeline-item,.node,.branch,.item,.box,.step");
      if (!owner || !target.contains(owner)) owner = target;
      var group = owners.get(owner);
      if (!group) { group = {anchor: owner, marks: []}; owners.set(owner, group); groups.push(group); }
      group.marks.push(mark);
    });
    var bar = document.createElement("div");
    bar.className = "efp-mindmap-search-context";
    var label = document.createElement("div");
    var section = document.createElement("strong");
    section.textContent = control ? control.textContent.trim() : key.replace(/[-_]/g, " ");
    label.appendChild(section);
    var detail = document.createElement("span");
    detail.textContent = query ? "Search: " + query : "Opened section / खुला हुआ भाग";
    label.appendChild(detail); bar.appendChild(label);
    var index = 0;
    function scrollMatch() {
      marks.forEach(function (mark) { mark.classList.remove("efp-mm-current-match"); });
      if (!groups.length) return;
      groups[index].marks.forEach(function (mark) { mark.classList.add("efp-mm-current-match"); });
      groups[index].marks[0].scrollIntoView({ behavior: "instant", block: "center", inline: "nearest" });
      if (next) next.textContent = (index + 1) + "/" + groups.length + (groups.length > 1 ? " ↓" : "");
    }
    var next;
    if (groups.length) {
      next = document.createElement("button");
      next.className = "efp-mm-next";
      next.type = "button";
      next.disabled = groups.length === 1;
      next.setAttribute("aria-label", "Next matched section / अगला मिला भाग");
      next.addEventListener("click", function () { if (groups.length > 1) { index = (index + 1) % groups.length; scrollMatch(); } });
      bar.appendChild(next);
    }
    var close = document.createElement("button");
    close.type = "button";
    close.className = "efp-mm-dismiss";
    close.textContent = "×";
    close.setAttribute("aria-label", "Clear search highlights / खोज हाइलाइट हटाएँ");
    close.setAttribute("title", "Clear search highlights");
    close.addEventListener("click", function () {
      // Remove only search decoration. Keep the selected tab, search-return
      // token and the learner's current reading position intact.
      // Cancel any in-flight smooth scroll before removing the banner.
      window.scrollTo({ top: window.scrollY, left: window.scrollX, behavior: "instant" });
      var anchor = groups.length ? groups[index].anchor : target;
      var top = anchor.getBoundingClientRect().top;
      clearSearchFocus();
      var delta = anchor.getBoundingClientRect().top - top;
      if (delta) window.scrollBy({ top: delta, behavior: "instant" });
    });
    bar.appendChild(close);
    target.prepend(bar);
    return scrollMatch;
  }

  function focusTarget(key, preferredControl) {
    var found = findPanel(key);
    var target = found ? found.el : preferredControl;
    if (!target) return false;

    clearSearchFocus();
    var query = searchQuery();
    var marks = found ? highlightQuery(target, query) : [];
    var focusMatch = found ? searchContext(target, key, preferredControl, query, marks) : null;
    var run = ++focusRun;

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (run !== focusRun) return;
        var nav = preferredControl && preferredControl.parentElement;
        if (nav && nav.scrollWidth > nav.clientWidth) {
          nav.scrollLeft = preferredControl.offsetLeft - (nav.clientWidth - preferredControl.offsetWidth) / 2;
        }
        try {
          if (marks.length) focusMatch();
          else target.scrollIntoView({ behavior: "auto", block: "start", inline: "nearest" });
        } catch (_) {
          target.scrollIntoView();
        }
        target.classList.add("efp-deep-focus");
        clearTimeout(target.__efpDeepFocusTimer);
        target.__efpDeepFocusTimer = setTimeout(function () {
          target.classList.remove("efp-deep-focus");
        }, 8000);
      });
    });
    return true;
  }

  function openHash() {
    var key = hashKey();
    if (!key) return;
    openedKey = key;

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
    if (!key) { openedKey = ""; ++focusRun; clearSearchFocus(); return; }
    if (key === openedKey) return;
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
