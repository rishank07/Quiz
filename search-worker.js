/* ExamFusion Prep bounded relevance search (v10).
 *
 * IMPORTANT: Large Original Practice / Crux indexes must NOT be normalized or
 * warmed in full during worker startup. The previous implementation warmed
 * 38k+ long records before posting "ready", which made homepage full-text
 * results effectively never appear on slower browsers/WebViews.
 *
 * This worker loads the static index, posts ready immediately, then performs
 * a candidate scan and bounded relevance selection only when queried. The UI
 * thread remains free because all heavy work stays inside the worker.
 *
 * Crux & Tricks note: its full-text index predates the PDF.js reader migration,
 * so legacy group.f values can point at routes that no longer exist. For Crux
 * only, returned hits are translated through crux-manifest.js to the current
 * viewer.html?id=ctXXXX route. The page marker stays in hit.x and the existing
 * UI appends the exact page number.
 */
(function () {
  "use strict";

  var config = null;
  var records = null;
  var cruxDocs = null;
  self.window = self; // generated index/manifest files assign window.<GLOBAL>

  function normalizeQuery(value) {
    var text = String(value == null ? "" : value);
    if (text.normalize) {
      try { text = text.normalize("NFKC"); } catch (_) {}
    }
    var devanagariDigits = "०१२३४५६७८९";
    text = text.replace(/[०-९]/g, function (d) {
      return String(devanagariDigits.indexOf(d));
    });
    return text
      .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
      .replace(/[’‘`´'"]/g, "")
      .replace(/[‐‑‒–—―−]/g, "-")
      .toLowerCase()
      .replace(/[^a-z0-9\u0900-\u097f]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function queryTerms(query) {
    var n = normalizeQuery(query);
    if (!n) return { phrase: "", terms: [] };
    var raw = n.split(" "), seen = Object.create(null), out = [];
    for (var i = 0; i < raw.length; i++) {
      if (!raw[i] || seen[raw[i]]) continue;
      seen[raw[i]] = true;
      out.push(raw[i]);
    }
    return { phrase: n, terms: out };
  }

  function stripMarker(raw) {
    raw = String(raw == null ? "" : raw);
    if (raw.length) {
      var code = raw.charCodeAt(0);
      if (code >= 0xE000 && code <= 0xF8FF) return raw.slice(1).replace(/^\s+/, "");
      if (code === 0x0001) {
        var sep = raw.indexOf("\u0002");
        if (sep !== -1) return raw.slice(sep + 1);
      }
    }
    return raw;
  }

  // Generic per-snippet anchor marker (added 2026-09-18), independent of the
  // Crux numeric-page marker above. A snippet may be prefixed with:
  //   \u0001<anchor>\u0002<visible text...>
  // where <anchor> is a URL hash fragment (without '#') that should be
  // appended to the group's f when this exact snippet is the hit — used for
  // per-question (#q42) and per-tab (#narration) deep links on static pages.
  // Crux's own \uE000+ numeric marker scheme is untouched and takes priority
  // if somehow both were present, since Crux routing fully replaces f anyway.
  function extractAnchor(raw) {
    raw = String(raw == null ? "" : raw);
    if (!raw.length || raw.charCodeAt(0) !== 0x0001) return null;
    var sep = raw.indexOf("\u0002");
    if (sep === -1) return null;
    return raw.slice(1, sep);
  }

  function withAnchor(url, anchor) {
    if (!anchor) return url;
    // Original Practice app routes take a query-string ?q=N (already
    // supported by that app's own deep-link handler); every other static
    // page takes a URL hash #anchor (per-question / per-tab id).
    var isOriginalPractice = /[?&]subject=/.test(url) && /[?&]chapter=/.test(url) && /[?&]section=/.test(url);
    if (isOriginalPractice) {
      var withoutHash = String(url || "").split("#")[0];
      var sep = withoutHash.indexOf("?") === -1 ? "?" : "&";
      return withoutHash + sep + "q=" + encodeURIComponent(anchor);
    }
    var base = String(url || "").split("#")[0];
    return base + "#" + anchor;
  }

  function wholePhrasePosition(text, phrase) {
    if (!text || !phrase) return -1;
    var padded = " " + text + " ";
    var position = padded.indexOf(" " + phrase + " ");
    return position < 0 ? -1 : Math.max(0, position - 1);
  }

  function wholeTermPositions(text, terms) {
    var padded = " " + text + " ", positions = [];
    for (var i = 0; i < terms.length; i++) {
      var position = padded.indexOf(" " + terms[i] + " ");
      if (position < 0) return null;
      positions.push(Math.max(0, position - 1));
    }
    return positions;
  }

  // Handwritten OCR contains many plausible-looking fragments. Substring
  // matching (for example, "mean" inside an unrelated OCR word) produces
  // misleading pages, so the Maths OCR index uses clean per-page aliases first
  // and accepts raw OCR only on whole words with sensible proximity.
  function strictOcrScore(parsed, aliasRaw, bodyRaw) {
    var alias = normalizeQuery(aliasRaw);
    var body = normalizeQuery(bodyRaw);
    var phrase = parsed.phrase;
    var terms = parsed.terms;
    var position = wholePhrasePosition(alias, phrase);
    if (position >= 0) return position * 0.001;

    var positions = wholeTermPositions(alias, terms);
    if (positions) {
      var aliasSpan = Math.max.apply(Math, positions) - Math.min.apply(Math, positions);
      return 5 + aliasSpan * 0.001;
    }

    // Short OCR-only terms are too collision-prone; they remain searchable
    // when explicitly present in a curated alias (SI, CI, BPT, etc.).
    if (terms.length === 1 && terms[0].length < 4) return null;

    position = wholePhrasePosition(body, phrase);
    if (position >= 0) return 20 + position * 0.00001;

    positions = wholeTermPositions(body, terms);
    if (!positions) return null;
    var span = Math.max.apply(Math, positions) - Math.min.apply(Math, positions);
    if (terms.length > 1 && span > 180) return null;
    return 35 + span * 0.001 + Math.min.apply(Math, positions) * 0.000001;
  }

  function isCruxSearch() {
    return !!(config && config.globalName === "EF_CRUX_TRICKS_SNIPPET_INDEX");
  }

  var cruxRouter=null;
  function loadCruxManifest() {
    if(!isCruxSearch())return;
    try {
      importScripts("/Crux-Tricks/crux-manifest.js");
      cruxRouter=efCreateCruxSearchRouter(self.EF_CRUX_DOCS);
    } catch (_) { cruxRouter=efCreateCruxSearchRouter([]); }
  }
  function routeCruxHit(hit){return cruxRouter?cruxRouter.route(hit):hit}
  function cruxTopicSearch(query){return cruxRouter?cruxRouter.topics(query,config.limit):[]}

  function fastSnippetSearch(query) {
    var parsed = efRelevanceQuery(query);
    if (!parsed.terms.length || !Array.isArray(records)) return [];
    // Compile normalization-aware retrieval patterns once per query, rather
    // than normalizing every rejected snippet just because it has an apostrophe.
    var ignored = "[\\u200B-\\u200D\\u2060\\uFEFF'’‘`´\"]*";
    var candidates = parsed.alternatives.map(function(choices) {
      return choices.map(function(term) {
        var pattern = Array.from(term).map(function(ch) {
          if (ch === " ") return "[^a-z0-9\\u0900-\\u097f]+";
          if (/[a-z]/.test(ch)) return "[" + ch + String.fromCharCode(ch.charCodeAt(0) + 0xFEE0) + "]";
          if (/[0-9]/.test(ch)) return "[" + ch + "०१२३४५६७८९".charAt(Number(ch)) + String.fromCharCode(ch.charCodeAt(0) + 0xFEE0) + "]";
          return efRegexEscape(ch);
        }).join(ignored);
        return {term:term,pattern:new RegExp(pattern)};
      });
    });
    var limit = config.limit || 40, top = efTopSearchHits(limit);
    var prefix = config.sectionPrefix || null;
    function scan(compact, fuzzy) {
      var sequence = 0;
      for (var i = 0; i < records.length; i++) {
        var group = records[i];
        if (!group || (prefix && String(group.f || "").indexOf(prefix) !== 0)) continue;
        var title = normalizeQuery(group.t), breadcrumb = normalizeQuery(group.b);
        var head = title + " " + breadcrumb;
        var snippets = Array.isArray(group.x) ? group.x : [];
        var aliases = Array.isArray(group.a) ? group.a : [];
        for (var j = 0; j < snippets.length; j++, sequence++) {
          var raw = String(snippets[j] == null ? "" : snippets[j]), visible = stripMarker(raw);
          var match;
          if (config.strictOcr) {
            var score = strictOcrScore(parsed, aliases[j] || "", visible);
            if (score === null) continue;
            match = {score: score, matchType: "exact"};
          } else {
            // Cheap substring candidate retrieval precedes expensive Unicode
            // normalization/ranking. No second full normalized index is stored.
            var cheap = visible.toLowerCase(), possible = compact || fuzzy;
            if (!possible) {
              possible = candidates.every(function(choices) {
                return choices.some(function(candidate) {
                  return cheap.indexOf(candidate.term) >= 0 || head.indexOf(candidate.term) >= 0 || candidate.pattern.test(cheap);
                });
              });
              // Rare compatibility ligatures/circled characters still use the
              // complete NFKC path; ordinary quote-bearing records do not.
              if (!possible && /[\u2100-\u214f\u2460-\u24ff\ufb00-\ufb06]/.test(visible)) possible = true;
            }
            if (!possible) continue;
            match = efRelevanceScore(parsed, normalizeQuery(visible), title, breadcrumb, compact, fuzzy);
            if (!match) continue;
          }
          top.add({score: match.score, matchType: match.matchType, sequence: sequence,
            f: withAnchor(group.f, extractAnchor(raw)), t: group.t, b: group.b, x: raw});
        }
      }
    }
    scan(false, false);
    if (!top.size() && !config.strictOcr && parsed.phrase.length > 2) scan(true, false);
    if (!top.size() && !config.strictOcr && config.fuzzy !== false && parsed.terms.some(function(term){return efAllowedEditDistance(term)>0;})) scan(false, true);
    var out = top.sorted().map(function(hit) {
      return routeCruxHit({f: hit.f, t: hit.t, b: hit.b, x: hit.x, score: hit.score, matchType: hit.matchType});
    });
    if (isCruxSearch()) {
      var topics = cruxTopicSearch(query), merged = [], seen = {};
      topics.concat(out).forEach(function(hit) {
        var key = String(hit && hit.f || "") + "|" + String(hit && hit.x || "").charAt(0);
        if (!hit || seen[key]) return;
        seen[key] = true; merged.push(hit);
      });
      return merged.slice(0, limit);
    }
    return out;
  }

  function compactContentRecords(raw) {
    var output = [];
    for (var i = 0; i < raw.length; i++) {
      output.push({ file: raw[i].f, title: raw[i].t, text: raw[i].x });
    }
    return output;
  }

  function initialize(options) {
    config = options || {};
    if (!config.indexUrl || !config.globalName) throw new Error("Incomplete search-worker configuration");

    // Shared scoring is small and does not warm/normalize any records.
    importScripts(config.logicUrl || "/search-logic.js?v=20261004rank1");
    importScripts(config.indexUrl);
    // Polity audit overlay
    if (config.globalName === "EF_ORIGINAL_PRACTICE_SNIPPET_INDEX") {
      importScripts(new URL("./search-snippets-polity-original-practice.js?v=20261001polity22-583a40e433b0", config.indexUrl).href);
    }
    // End Polity audit overlay
    records = self[config.globalName];
    if (!Array.isArray(records)) throw new Error("Search index was not available: " + config.globalName);
    loadCruxManifest();

    // Keep compatibility for any non-snippet clients that use the shared worker.
    if (config.mode !== "snippet") {
      if (!config.logicUrl) throw new Error("Missing search logic URL");
      if (config.mapCompactContent) records = compactContentRecords(records);
    }
  }

  function runSearch(query) {
    if (!records) return [];
    if (config.mode === "snippet") return fastSnippetSearch(query);
    return efSearchRecords(query, records, {
      fields: config.fields || ["title", "text"],
      limit: config.limit || 40
    });
  }

  self.onmessage = function (event) {
    var message = event.data || {};
    try {
      if (message.type === "init") {
        initialize(message.options);
        self.postMessage({ type: "ready", count: records ? records.length : 0 });
        return;
      }
      if (message.type === "search") {
        self.postMessage({
          type: "result",
          id: message.id,
          results: runSearch(String(message.query == null ? "" : message.query))
        });
      }
    } catch (error) {
      self.postMessage({
        type: "error",
        id: message.id || null,
        message: error && error.message ? error.message : "Search worker failed"
      });
    }
  };
})();
