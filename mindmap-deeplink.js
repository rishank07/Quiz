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
  var searchView = null, appResume = null, appRestored = false, searchDismissed = false;
  function searchToken() {
    try { return new URL(location.href).searchParams.get("efSearchReturn") ||
      (history.state && history.state.efpSearchReturnToken) || ""; } catch (_) { return ""; }
  }
  function readAppResume() {
    if (appRestored || !window.EFP_APP_SESSION || !window.EFP_APP_SESSION.getSearchState) return;
    var state = window.EFP_APP_SESSION.getSearchState("mindmap");
    if (!state || state.token !== searchToken()) return;
    appRestored = true; appResume = state; searchDismissed = !!state.dismissed; searchView = state;
  }
  window.EFP_MINDMAP_SEARCH_CONTEXT = { snapshot: function () { return searchView; } };
  var readerLink = document.createElement("link");
  readerLink.rel = "stylesheet";
  readerLink.href = "/mindmap-reader.css?v=20261007searchaudit1";
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
      // Two panel templates share .panel but use different active classes.
      // Prefer the scheme already in use by a sibling panel.
      for (var j = 0; j < SCHEMES.length; j++) {
        if (el.classList.contains(SCHEMES[j][0]) && document.querySelector("."+SCHEMES[j][0]+"."+SCHEMES[j][1])) {
          return { el: el, scheme: SCHEMES[j] };
        }
      }
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
      var direct = String(new URL(location.href).searchParams.get("efSearchQuery") || "").trim().slice(0, 160);
      var token = new URL(location.href).searchParams.get("efSearchReturn") ||
        (history.state && history.state.efpSearchReturnToken);
      if (!token) return direct;
      var saved = JSON.parse(sessionStorage.getItem("efp_search_return_v1:" + token) || "null");
      if (!saved || saved.token !== token || !Array.isArray(saved.inputs) ||
          new URL(saved.source, location.origin).origin !== location.origin) return direct;
      var field = saved.inputs.find(function (input) { return String(input.value || "").trim(); });
      return field ? String(field.value).trim().slice(0, 160) : "";
    } catch (_) { return direct || ""; }
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

  function textMatches(query, text, fuzzy) {
    if (typeof efTextMatches === "function") return efTextMatches(query, text, !!fuzzy);
    var terms=query.toLocaleLowerCase().split(/[^\p{L}\p{M}\p{N}]+/u).filter(Boolean);
    text=String(text||"").toLocaleLowerCase();
    return terms.every(function(term){return text.indexOf(term)>=0});
  }

  function highlightQuery(target, query, includePanel, fuzzy) {
    if (!query) return [];
    var ignored = /^(?:the|a|an|and|or|of|in|on|to|for|is|was|are|were|by|with|da|de|ka|ki|ke|hai|hain|में|का|की|के|है|हैं|और|से)$/i;
    var terms = query.split(/[^\p{L}\p{M}\p{N}]+/u).filter(function (term) {
      return term.length >= 2 && !ignored.test(term);
    });
    terms.unshift(query);
    terms = terms.filter(function (term, i) { return term && terms.indexOf(term) === i; });
    // Retrieval accepts partial words and bounded typos. Decorate the actual
    // matching word (Nand -> Nagananda), while leaving its spelling intact.
    var typedTerms=terms.slice();
    Array.from(new Set((target.textContent||"").match(/[\p{L}\p{M}\p{N}]+/gu)||[])).forEach(function(word){
      if(typedTerms.some(function(term){return textMatches(term,word,fuzzy)}))terms.push(word);
    });
    terms=Array.from(new Set(terms));
    terms.sort(function (a, b) { return b.length - a.length; });
    var pattern = new RegExp("(^|[^\\p{L}\\p{M}\\p{N}])(" + terms.map(function (term) {
      return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }).join("|") + ")(?=$|[^\\p{L}\\p{M}\\p{N}])", "giu");
    var walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var parent=node.parentElement;
        var hidden=parent&&parent.closest("[hidden],.hidden");
        return parent && (parent.getClientRects().length || includePanel) && (!hidden || hidden===target) && !parent.closest(
          "script,style,button,a,textarea,select,svg,.efp-mm-table-hint,.efp-mindmap-search-context"
        ) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var nodes = [], node, marks = [];
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach(function (textNode) {
      pattern.lastIndex = 0;
      var text = textNode.nodeValue, match, offset = 0, fragment = document.createDocumentFragment();
      while ((match = pattern.exec(text))) {
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

  function matchingGroups(target, query, marks, fuzzy) {
    // Count reading units, not repeated words or bilingual text in one unit.
    var groups = [], owners = new Map();
    marks.forEach(function (mark) {
      var owner = mark.closest("tr,li,.section-card,.card,.flow-box,.fact,.event,.timeline-item,.node,.branch,.item,.box,.step,.recall-qa,.intro-item");
      var panel=mark.closest(".tab-content,.tab-panel,.panel,section.tab,div.tab")||target;
      if (!owner || !panel.contains(owner)) owner = panel;
      var group = owners.get(owner);
      if (!group) { group = {anchor: owner, panel:panel, marks: []}; owners.set(owner, group); groups.push(group); }
      group.marks.push(mark);
    });
    if(query){
      groups=groups.filter(function(group){
        var content=group.anchor.textContent;
        var matches=textMatches(query,content,fuzzy);
        if(!matches)group.marks.forEach(function(mark){mark.replaceWith(document.createTextNode(mark.textContent))});
        return matches;
      });
    }
    return groups;
  }

  function searchContext(target, key, control, query, groups) {
    var marks=groups.reduce(function(all,group){return all.concat(group.marks)},[]);
    var bar = document.createElement("div");
    bar.className = "efp-mindmap-search-context";
    var label = document.createElement("div");
    var section = document.createElement("strong");
    section.textContent = control ? control.textContent.trim() : key.replace(/[-_]/g, " ");
    label.appendChild(section);
    var detail = document.createElement("span");
    detail.textContent = query ? "Search: " + query + (groups.length ? "" : " · No matching text / मिलान नहीं मिला") : "Opened section / खुला हुआ भाग";
    label.appendChild(detail); bar.appendChild(label);
    var index = Math.max(0,groups.findIndex(function(group){return group.panel===target}));
    if (appResume && !appResume.dismissed && groups.length) {
      var restoredIndex = appResume.anchorId ? groups.findIndex(function(group){return group.anchor.id===appResume.anchorId&&group.panel.id===appResume.panel}) : -1;
      index = restoredIndex >= 0 ? restoredIndex : Math.max(0, Math.min(groups.length-1, Number(appResume.index)||0));
    }
    function scrollMatch() {
      marks.forEach(function (mark) { mark.classList.remove("efp-mm-current-match"); });
      if (!groups.length) return;
      var group=groups[index];
      if(!group.panel.getClientRects().length){
        var panelKey=group.panel.id,nav=matchingNavControl(panelKey);
        if(nav)nav.click();
        var found=findPanel(panelKey);if(found&&!group.panel.getClientRects().length)activatePanelDirectly(found);
        markNavActive(panelKey,nav);
      }
      group.panel.prepend(bar);
      var navControl=matchingNavControl(group.panel.id);
      section.textContent=navControl?navControl.textContent.trim():group.panel.id.replace(/^(tab|panel|section)-/,"").replace(/[-_]/g," ");
      if(hashKey()!==group.panel.id){
        try{var url=new URL(location.href);url.hash=group.panel.id;history.replaceState(history.state,"",url.pathname+url.search+url.hash);openedKey=group.panel.id}catch(_){}
      }
      groups[index].marks.forEach(function (mark) { mark.classList.add("efp-mm-current-match"); });
      if (!appResume) groups[index].marks[0].scrollIntoView({ behavior: "instant", block: "center", inline: "nearest" });
      if (next) next.textContent = (index + 1) + "/" + groups.length + (groups.length > 1 ? " ↓" : "");
      searchView = query ? {kind:"mindmap",token:searchToken(),index:index,panel:group.panel.id,anchorId:group.anchor.id||"",dismissed:false} : null;
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
      var readingMark=groups.length&&groups[index].marks.find(function(mark){return mark.isConnected&&mark.getClientRects().length});
      var anchor = readingMark ? readingMark.parentElement : groups.length ? groups[index].anchor : target;
      var top = anchor.getBoundingClientRect().top;
      searchDismissed = true;
      if (searchView) searchView.dismissed = true;
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
    readAppResume();
    if (searchDismissed) {
      if (appResume) { appResume=null; window.EFP_APP_SESSION.restoreSearchScroll(); }
      return true;
    }
    var query = searchQuery();
    var panels=Array.from(document.querySelectorAll(".tab-content,.tab-panel,.panel,section.tab,div.tab")).filter(function(panel){return panel.id&&!panel.closest("nav")&&!panel.parentElement.closest(".tab-content,.tab-panel,.panel,section.tab,div.tab")});
    if(!panels.length&&found)panels=[target];
    var marks=[],groups=[];
    if(found)panels.forEach(function(panel){marks=marks.concat(highlightQuery(panel,query,true))});
    groups=matchingGroups(target,query,marks,false);
    // Typo matches are a fallback only when no exact/partial reading unit
    // matches, consistent with the shared search engine's result ranking.
    if(found&&query&&!groups.length&&typeof efTextMatches==="function"){
      marks=[];panels.forEach(function(panel){marks=marks.concat(highlightQuery(panel,query,true,true))});
      groups=matchingGroups(target,query,marks,true);
    }
    var focusMatch = found ? searchContext(target, key, preferredControl, query, groups) : null;
    var run = ++focusRun;

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (run !== focusRun) return;
        var nav = preferredControl && preferredControl.parentElement;
        if (nav && nav.scrollWidth > nav.clientWidth) {
          nav.scrollLeft = preferredControl.offsetLeft - (nav.clientWidth - preferredControl.offsetWidth) / 2;
        }
        try {
          if (query) focusMatch();
          else target.scrollIntoView({ behavior: "auto", block: "start", inline: "nearest" });
        } catch (_) {
          target.scrollIntoView();
        }
        target.classList.add("efp-deep-focus");
        clearTimeout(target.__efpDeepFocusTimer);
        target.__efpDeepFocusTimer = setTimeout(function () {
          target.classList.remove("efp-deep-focus");
        }, 8000);
        if (appResume) { appResume=null; window.EFP_APP_SESSION.restoreSearchScroll(); }
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
    // Older generated indexes have unanchored facts. Resolve their actual
    // matching panel on entry instead of silently dropping all decoration.
    if (!key && searchQuery()) {
      var query = searchQuery();
      var panels = Array.from(document.querySelectorAll(".tab-content[id],.tab-panel[id],.panel[id],section.tab[id],div.tab[id]"));
      var matched = panels.find(function(panel) {
        return textMatches(query,panel.textContent,false);
      });
      if(!matched&&typeof efTextMatches==="function")matched=panels.find(function(panel){return textMatches(query,panel.textContent,true)});
      if (matched) {
        key = matched.id;
        var url = new URL(location.href); url.hash = key;
        history.replaceState(history.state, "", url.pathname + url.search + url.hash);
      }
    }
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

  window.addEventListener("efp-search-logic-ready",function(){openedKey="";runWithRetry()});
  window.addEventListener("hashchange", runWithRetry);
  window.addEventListener("efp-app-search-resume", function () {
    readAppResume(); if (appResume) { openedKey=""; runWithRetry(); }
  });
  window.addEventListener("pageshow", function () {
    if (hashKey()) setTimeout(runWithRetry, 0);
  });
})();
