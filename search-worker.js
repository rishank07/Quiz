/* ExamFusion Prep fast background full-text search (v8).
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
    }
    return raw;
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
    var copy = { f: "./Crux-Tricks/index.html", t: hit.t, b: hit.b, x: hit.x };
    if (doc && doc.id) {
      copy.f = "./Crux-Tricks/viewer.html?id=" + encodeURIComponent(String(doc.id));
    }
    return copy;
  }

  function fastSnippetSearch(query) {
    var parsed = queryTerms(query);
    var terms = parsed.terms;
    var phrase = parsed.phrase;
    if (!terms.length || !Array.isArray(records)) return [];

    var prefix = config.sectionPrefix || null;
    var scored = [];
    var sequence = 0;

    for (var i = 0; i < records.length; i++) {
      var group = records[i];
      if (!group || (prefix && String(group.f || "").indexOf(prefix) !== 0)) continue;
      var headRaw = String(group.t || "") + " " + String(group.b || "");
      var head = headRaw.toLowerCase();
      var snippets = Array.isArray(group.x) ? group.x : [];

      for (var j = 0; j < snippets.length; j++) {
        var raw = String(snippets[j] == null ? "" : snippets[j]);
        var visible = stripMarker(raw);
        var body = visible.toLowerCase();
        var match = containsAll(terms, body, head);
        if (!match) { sequence++; continue; }

        // Strongly prefer an exact query phrase in actual question/page text,
        // then all query words in body text, then mixed body/title matches.
        var phraseBody = phrase ? body.indexOf(phrase) : -1;
        var phraseHead = phrase ? head.indexOf(phrase) : -1;
        var score;
        if (phraseBody >= 0) score = phraseBody * 0.00001;
        else if (match.bodyOnly) score = 10 + match.positionSum * 0.000001;
        else if (phraseHead >= 0) score = 20 + phraseHead * 0.00001;
        else score = 30 + match.positionSum * 0.0000001;

        scored.push({
          score: score,
          sequence: sequence,
          f: group.f,
          t: group.t,
          b: group.b,
          x: raw
        });
        sequence++;
      }
    }

    scored.sort(function (a, b) { return a.score - b.score || a.sequence - b.sequence; });
    var limit = config.limit || 40;
    var out = [];
    for (var k = 0; k < scored.length && k < limit; k++) {
      out.push(routeCruxHit({ f: scored[k].f, t: scored[k].t, b: scored[k].b, x: scored[k].x }));
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
