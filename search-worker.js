/* ExamFusion Prep fast background full-text search (v9).
 *
 * IMPORTANT: Large Original Practice / Crux indexes must NOT be normalized or
 * warmed in full during worker startup. The previous implementation warmed
 * 38k+ long records before posting "ready", which made homepage full-text
 * results effectively never appear on slower browsers/WebViews.
 *
 * This worker loads the static index, posts ready immediately, then performs
 * a lightweight case-insensitive scan only when a query is submitted. The UI
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
    var raw = n.split(" "), seen = {}, out = [];
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

  function containsAll(terms, body, head) {
    var bodyOnly = true;
    var positionSum = 0;
    for (var i = 0; i < terms.length; i++) {
      var p = body.indexOf(terms[i]);
      if (p >= 0) {
        positionSum += p;
        continue;
      }
      bodyOnly = false;
      p = head.indexOf(terms[i]);
      if (p < 0) return null;
      positionSum += 100000 + p;
    }
    return { bodyOnly: bodyOnly, positionSum: positionSum };
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

  function safeDecode(value) {
    var text = String(value == null ? "" : value);
    try { return decodeURIComponent(text); } catch (_) { return text; }
  }

  function stripCruxSerial(value) {
    return normalizeQuery(value)
      .replace(/^\d+\s+(?:[ivxlcdm]+\s+)?/i, "")
      .trim();
  }

  function cruxBasename(value) {
    var text = safeDecode(value).replace(/\\/g, "/");
    text = text.split(/[?#]/)[0];
    text = text.slice(text.lastIndexOf("/") + 1).replace(/\.(?:html?|pdf|js)$/i, "");
    return normalizeQuery(text.replace(/[_-]+/g, " "));
  }

  function loadCruxManifest() {
    cruxDocs = null;
    if (!isCruxSearch()) return;
    try {
      if (typeof self.efNormalizeCruxSearchUrl !== "function") {
        importScripts("/Crux-Tricks/crux-search-route.js");
      }
      if (!Array.isArray(self.EF_CRUX_DOCS)) {
        importScripts("/Crux-Tricks/crux-manifest.js");
      }
      if (Array.isArray(self.EF_CRUX_DOCS)) cruxDocs = self.EF_CRUX_DOCS;
    } catch (_) {
      // Search itself should remain available even if manifest routing cannot
      // initialize. routeCruxHit() will use the non-404 landing-page fallback.
      cruxDocs = null;
    }
  }

  function resolveCruxDoc(hit) {
    if (!Array.isArray(cruxDocs) || !cruxDocs.length) return null;

    var f = safeDecode(hit && hit.f || "");
    var directId = (f + " " + String(hit && hit.t || "")).match(/\bct\d{1,6}\b/i);
    if (directId) {
      var wantedId = directId[0].toLowerCase();
      for (var d0 = 0; d0 < cruxDocs.length; d0++) {
        if (String(cruxDocs[d0].id || "").toLowerCase() === wantedId) return cruxDocs[d0];
      }
    }

    var hitTitle = normalizeQuery(hit && hit.t || "");
    var hitTitleLoose = stripCruxSerial(hit && hit.t || "");
    var fileBase = cruxBasename(f);
    var fileBaseLoose = stripCruxSerial(fileBase);
    var breadcrumb = normalizeQuery(hit && hit.b || "");
    var best = null;
    var bestScore = 0;

    for (var i = 0; i < cruxDocs.length; i++) {
      var doc = cruxDocs[i] || {};
      var title = normalizeQuery(doc.title || "");
      var titleLoose = stripCruxSerial(doc.title || "");
      var sourceTitle = normalizeQuery(doc.sourceTitle || "");
      var sourceTitleLoose = stripCruxSerial(doc.sourceTitle || "");
      var pdf = safeDecode(doc.pdf || "").replace(/^\.\//, "");
      var score = 0;

      if (pdf && f.replace(/^\.\/Crux-Tricks\//, "").indexOf(pdf) !== -1) score = Math.max(score, 1400);
      if (hitTitle && title && hitTitle === title) score = Math.max(score, 1200);
      if (hitTitle && sourceTitle && hitTitle === sourceTitle) score = Math.max(score, 1160);
      if (hitTitleLoose && titleLoose && hitTitleLoose === titleLoose) score = Math.max(score, 1100);
      if (hitTitleLoose && sourceTitleLoose && hitTitleLoose === sourceTitleLoose) score = Math.max(score, 1060);
      if (fileBase && title && fileBase === title) score = Math.max(score, 1040);
      if (fileBase && sourceTitle && fileBase === sourceTitle) score = Math.max(score, 1020);
      if (fileBaseLoose && titleLoose && fileBaseLoose === titleLoose) score = Math.max(score, 1000);
      if (fileBaseLoose && sourceTitleLoose && fileBaseLoose === sourceTitleLoose) score = Math.max(score, 980);

      // Breadcrumb/source metadata is only a tie-breaker; title/path equality
      // remains the authoritative match so similarly named chapters are safe.
      if (score && breadcrumb) {
        var subject = normalizeQuery(doc.subject || "");
        var branch = normalizeQuery(doc.branch || "");
        var source = normalizeQuery(doc.source || "");
        if (subject && breadcrumb.indexOf(subject) !== -1) score += 8;
        if (branch && breadcrumb.indexOf(branch) !== -1) score += 8;
        if (source && breadcrumb.indexOf(source) !== -1) score += 4;
      }

      if (score > bestScore) {
        bestScore = score;
        best = doc;
      }
    }

    return bestScore >= 980 ? best : null;
  }

  function routeCruxHit(hit) {
    if (!isCruxSearch() || !hit) return hit;
    var doc = resolveCruxDoc(hit);
    var normalizeUrl = typeof self.efNormalizeCruxSearchUrl === "function"
      ? self.efNormalizeCruxSearchUrl
      : function (value) { return String(value || "").replace(/^(?:\.\/)?Crux-Tricks\//, "/Crux-Tricks/"); };
    var copy = { f: normalizeUrl("/Crux-Tricks/index.html"), t: hit.t, b: hit.b, x: hit.x };
    if (doc && doc.id) {
      copy.f = normalizeUrl("/Crux-Tricks/viewer.html?id=" + encodeURIComponent(String(doc.id)));
    }
    return copy;
  }

  function cruxTopicSearch(query) {
    if (!isCruxSearch() || !Array.isArray(cruxDocs) || !cruxDocs.length) return [];
    var parsed = queryTerms(query);
    if (!parsed.terms.length) return [];
    var results = [];
    for (var i = 0; i < cruxDocs.length; i++) {
      var doc = cruxDocs[i] || {};
      var title = normalizeQuery(doc.title || "");
      var sourceTitle = normalizeQuery(doc.sourceTitle || "");
      var meta = normalizeQuery([doc.subject || "", doc.branch || "", doc.source || "", doc.exam || "", doc.breadcrumb || ""].join(" "));
      var all = title + " " + sourceTitle + " " + meta;
      var ok = true;
      for (var t = 0; t < parsed.terms.length; t++) {
        if (all.indexOf(parsed.terms[t]) === -1) { ok = false; break; }
      }
      if (!ok) continue;
      var score = 30;
      if (title === parsed.phrase || sourceTitle === parsed.phrase) score = 0;
      else if (title.indexOf(parsed.phrase) !== -1 || sourceTitle.indexOf(parsed.phrase) !== -1) score = 4;
      else {
        var everyInTitle = true;
        for (var j = 0; j < parsed.terms.length; j++) {
          if (title.indexOf(parsed.terms[j]) === -1 && sourceTitle.indexOf(parsed.terms[j]) === -1) { everyInTitle = false; break; }
        }
        if (everyInTitle) score = 8;
        else if (meta.indexOf(parsed.phrase) !== -1) score = 16;
      }
      results.push({score:score,sequence:i,f:"/Crux-Tricks/viewer.html?id="+encodeURIComponent(String(doc.id||"")),t:doc.title||doc.sourceTitle||"Crux topic",b:doc.breadcrumb||[doc.source,doc.subject,doc.branch].filter(Boolean).join(" / "),x:"Topic · "+(doc.sourceTitle||doc.title||"Crux revision")});
    }
    results.sort(function (a, b) { return a.score - b.score || a.sequence - b.sequence; });
    return results.slice(0, Math.min(config && config.limit || 40, 40));
  }

  function fastSnippetSearch(query) {
    var parsed = queryTerms(query);
    var terms = parsed.terms;
    var phrase = parsed.phrase;
    if (!terms.length || !Array.isArray(records)) return [];

    var prefix = config.sectionPrefix || null;
    var scored = [];

    // Keep the common scan cheap. Only retry with full Unicode/punctuation
    // normalization (and finally joined words) when it found nothing.
    function scan(normalized, compact) {
      var sequence = 0;
      var searchTerms = compact ? [phrase.replace(/ /g, "")] : terms;
      var searchPhrase = compact ? searchTerms[0] : phrase;
      for (var i = 0; i < records.length; i++) {
        var group = records[i];
        if (!group || (prefix && String(group.f || "").indexOf(prefix) !== 0)) continue;
        var headRaw = String(group.t || "") + " " + String(group.b || "");
        var head = normalized ? normalizeQuery(headRaw) : headRaw.toLowerCase().replace(/\s+/g, " ");
        if (compact) head = head.replace(/ /g, "");
        var snippets = Array.isArray(group.x) ? group.x : [];
        var aliases = Array.isArray(group.a) ? group.a : [];

        for (var j = 0; j < snippets.length; j++) {
          var raw = String(snippets[j] == null ? "" : snippets[j]);
          var visible = stripMarker(raw);
          if (config.strictOcr) {
            var strictScore = strictOcrScore(parsed, aliases[j] || "", visible);
            if (strictScore === null) { sequence++; continue; }
            scored.push({
              score: strictScore,
              sequence: sequence,
              f: withAnchor(group.f, extractAnchor(raw)),
              t: group.t,
              b: group.b,
              x: raw
            });
            sequence++;
            continue;
          }
          var body = normalized ? normalizeQuery(visible) : visible.toLowerCase().replace(/\s+/g, " ");
          if (compact) body = body.replace(/ /g, "");
          var match = containsAll(searchTerms, body, head);
          if (!match) { sequence++; continue; }

          // Strongly prefer an exact query phrase in actual question/page text,
          // then all query words in body text, then mixed body/title matches.
          var phraseBody = searchPhrase ? body.indexOf(searchPhrase) : -1;
          var phraseHead = searchPhrase ? head.indexOf(searchPhrase) : -1;
          var score;
          if (phraseBody >= 0) score = phraseBody * 0.00001;
          else if (match.bodyOnly) score = 10 + match.positionSum * 0.000001;
          else if (phraseHead >= 0) score = 20 + phraseHead * 0.00001;
          else score = 30 + match.positionSum * 0.0000001;

          scored.push({
            score: score,
            sequence: sequence,
            f: withAnchor(group.f, extractAnchor(raw)),
            t: group.t,
            b: group.b,
            x: raw
          });
          sequence++;
        }
      }
    }

    scan(false, false);
    if (!scored.length && !config.strictOcr) scan(true, false);
    if (!scored.length && !config.strictOcr && phrase.length > 2) scan(true, true);

    scored.sort(function (a, b) { return a.score - b.score || a.sequence - b.sequence; });
    var limit = config.limit || 40;
    var out = [];
    for (var k = 0; k < scored.length && k < limit; k++) {
      out.push(routeCruxHit({ f: scored[k].f, t: scored[k].t, b: scored[k].b, x: scored[k].x }));
    }
    if (isCruxSearch()) {
      var topics = cruxTopicSearch(query), merged = [], seen = {};
      topics.concat(out).forEach(function (hit) {
        var key = String(hit && hit.f || "") + "|" + String(hit && hit.t || "");
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

    // For snippet mode, intentionally do not import/warm search-logic.js.
    // The index itself is all this fast worker needs.
    importScripts(config.indexUrl);
    records = self[config.globalName];
    if (!Array.isArray(records)) throw new Error("Search index was not available: " + config.globalName);
    loadCruxManifest();

    // Keep compatibility for any non-snippet clients that use the shared worker.
    if (config.mode !== "snippet") {
      if (!config.logicUrl) throw new Error("Missing search logic URL");
      importScripts(config.logicUrl);
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
