/* ExamFusion Prep fast background full-text search (v7).
 *
 * IMPORTANT: Large Original Practice / Crux indexes must NOT be normalized or
 * warmed in full during worker startup. The previous implementation warmed
 * 38k+ long records before posting "ready", which made homepage full-text
 * results effectively never appear on slower browsers/WebViews.
 *
 * This worker loads the static index, posts ready immediately, then performs
 * a lightweight case-insensitive scan only when a query is submitted. The UI
 * thread remains free because all heavy work stays inside the worker.
 */
(function () {
  "use strict";

  var config = null;
  var records = null;
  self.window = self; // generated index files assign window.<GLOBAL> = [...]

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
      out.push({ f: scored[k].f, t: scored[k].t, b: scored[k].b, x: scored[k].x });
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
