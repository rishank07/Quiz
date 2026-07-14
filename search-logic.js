// Shared search ranking logic — used by the global site search (index.html) AND the
// per-section scoped search boxes (Ghatnachakra Purvalokan, Lucent's Objective,
// Pinnacle GS, Mind Maps).
//
// Why this exists: a plain "does this exact phrase appear" search fails constantly
// for real queries — e.g. "gandhi movement" or "fundamental right" would find ZERO
// pages even though both words are all over the site, just never as one exact
// contiguous phrase (and the content index itself stores de-duplicated keywords,
// not full sentences). This version splits the query into separate words and
// requires EVERY word to appear SOMEWHERE in the page (title, breadcrumb, or the
// full page content) — in any order, not necessarily next to each other. Matches
// found in the title rank above matches found only in the breadcrumb, which rank
// above matches found only deep inside the page content.
//
// Depends on: SEARCH_INDEX (search-index-main.js) and, optionally, CONTENT_INDEX
// (search-content-index.js — if it hasn't loaded yet, matching just falls back to
// title + breadcrumb only, no error).
function efSearchRank(query, options) {
  options = options || {};
  var sectionPrefix = options.sectionPrefix || null; // only consider urls starting with this
  var excludeTitleMatches = !!options.excludeTitleMatches; // skip records whose title alone already satisfies the query
  var limit = options.limit || 40;

  var terms = String(query).toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  if (typeof SEARCH_INDEX === "undefined") return [];
  var hasContent = typeof CONTENT_INDEX !== "undefined";

  var scored = [];
  for (var i = 0; i < SEARCH_INDEX.length; i++) {
    var rec = SEARCH_INDEX[i];
    if (sectionPrefix && rec.url.indexOf(sectionPrefix) !== 0) continue;

    var titleLower = rec.title.toLowerCase();
    var breadcrumbLower = rec.breadcrumb.toLowerCase();
    var contentLower = hasContent ? (CONTENT_INDEX[rec.url] || "").toLowerCase() : "";

    if (excludeTitleMatches) {
      var titleAloneMatches = true;
      for (var k = 0; k < terms.length; k++) {
        if (titleLower.indexOf(terms[k]) === -1) { titleAloneMatches = false; break; }
      }
      if (titleAloneMatches) continue;
    }

    var score = 0;
    var allFound = true;
    for (var j = 0; j < terms.length; j++) {
      var t = terms[j];
      if (titleLower.indexOf(t) !== -1) {
        score += 0;
      } else if (breadcrumbLower.indexOf(t) !== -1) {
        score += 1;
      } else if (contentLower.indexOf(t) !== -1) {
        score += 3;
      } else {
        allFound = false;
        break;
      }
    }
    if (!allFound) continue;

    // Tiny tie-breaker so results with an earlier/first-word title match float up.
    var firstIdx = titleLower.indexOf(terms[0]);
    score += firstIdx === -1 ? 0.5 : firstIdx * 0.001;

    scored.push({ score: score, rec: rec });
  }

  scored.sort(function (a, b) { return a.score - b.score; });

  var out = [];
  for (var m = 0; m < scored.length && m < limit; m++) out.push(scored[m].rec);
  return out;
}

// =====================================================================================
// Snippet-level search — shows a real highlighted excerpt from inside the page (like
// Current Affairs / Bihar Special already do), instead of just a bare chapter name.
//
// Depends on EF_SNIPPET_INDEX (search-snippets-*.js): an array of
// { f: url, t: title, b: breadcrumb, x: [snippet1, snippet2, ...] } — one group per
// page, each snippet being one self-contained searchable unit (one MCQ question+answer,
// or one mind-map fact/card). Every word in the query must appear somewhere in a given
// snippet (or its page's title/breadcrumb) for that snippet to match — not necessarily
// as one exact phrase — so multi-word queries work the same way efSearchRank's do.
// =====================================================================================

function efEscapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

// Builds a safe, HTML-highlighted excerpt centered on the first matched term.
function efSnippetWithHighlight(text, terms) {
  var lower = text.toLowerCase();
  var bestIdx = -1;
  var bestLen = 0;
  for (var i = 0; i < terms.length; i++) {
    var idx = lower.indexOf(terms[i]);
    if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
      bestIdx = idx;
      bestLen = terms[i].length;
    }
  }

  var raw;
  if (bestIdx === -1) {
    raw = text.slice(0, 160) + (text.length > 160 ? "..." : "");
  } else {
    var start = Math.max(0, bestIdx - 60);
    var end = Math.min(text.length, bestIdx + bestLen + 100);
    raw = (start > 0 ? "..." : "") + text.slice(start, end) + (end < text.length ? "..." : "");
  }

  var escaped = efEscapeHtml(raw);
  for (var j = 0; j < terms.length; j++) {
    var safe = terms[j].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    var re = new RegExp("(" + safe + ")", "ig");
    escaped = escaped.replace(re, "<mark>$1</mark>");
  }
  return escaped;
}

function efSnippetSearch(query, options) {
  options = options || {};
  var sectionPrefix = options.sectionPrefix || null;
  var excludeTitleMatches = !!options.excludeTitleMatches; // skip pages whose TITLE alone already satisfies the query
  var limit = options.limit || 40;

  var terms = String(query).toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  if (typeof EF_SNIPPET_INDEX === "undefined") return [];

  var scored = [];
  for (var i = 0; i < EF_SNIPPET_INDEX.length; i++) {
    var group = EF_SNIPPET_INDEX[i];
    if (sectionPrefix && group.f.indexOf(sectionPrefix) !== 0) continue;

    var titleLower = group.t.toLowerCase();
    var breadcrumbLower = group.b.toLowerCase();
    var xs = group.x;

    if (excludeTitleMatches) {
      var titleAloneMatches = true;
      for (var tk = 0; tk < terms.length; tk++) {
        if (titleLower.indexOf(terms[tk]) === -1) { titleAloneMatches = false; break; }
      }
      if (titleAloneMatches) continue;
    }

    for (var j = 0; j < xs.length; j++) {
      var snippetLower = xs[j].toLowerCase();
      var allFound = true;
      var firstIdx = -1;
      var inSnippetCount = 0;
      for (var k = 0; k < terms.length; k++) {
        var t = terms[k];
        var idx = snippetLower.indexOf(t);
        if (idx !== -1) {
          inSnippetCount++;
          if (firstIdx === -1 || idx < firstIdx) firstIdx = idx;
          continue;
        }
        if (titleLower.indexOf(t) !== -1 || breadcrumbLower.indexOf(t) !== -1) continue;
        allFound = false;
        break;
      }
      if (!allFound) continue;

      // Prefer snippets that contain MORE of the query terms themselves (not just
      // via title/breadcrumb), and among those, an earlier match position.
      var score = (terms.length - inSnippetCount) * 1000 + (firstIdx === -1 ? 500 : firstIdx);
      scored.push({ score: score, f: group.f, t: group.t, b: group.b, x: xs[j] });
    }
  }

  scored.sort(function (a, b) { return a.score - b.score; });

  var out = [];
  for (var m = 0; m < scored.length && m < limit; m++) out.push(scored[m]);
  return out;
}
