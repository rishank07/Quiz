// ExamFusion shared bilingual search engine.
//
// Used by the homepage and every section-level/global search box. Matching is:
// - Unicode-aware for Hindi and English;
// - case, punctuation, dash and repeated-space insensitive;
// - word-order independent for multi-word queries;
// - partial-word friendly; and
// - tolerant of one small typo (two for long words) when no exact result exists.

function efNormalizeSearchText(value) {
  var text = String(value == null ? "" : value);
  if (text.normalize) {
    try { text = text.normalize("NFKC"); } catch (ignore) {}
  }

  var devanagariDigits = "०१२३४५६७८९";
  text = text.replace(/[०-९]/g, function (digit) {
    return String(devanagariDigits.indexOf(digit));
  });

  return text
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(/[’‘`´]/g, "'")
    .replace(/['"]/g, "")
    .replace(/[‐‑‒–—―−]/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function efSearchTerms(query) {
  var normalized = efNormalizeSearchText(query);
  if (!normalized) return [];
  var raw = normalized.split(" ");
  var seen = {};
  var terms = [];
  for (var i = 0; i < raw.length; i++) {
    if (!raw[i] || seen[raw[i]]) continue;
    seen[raw[i]] = true;
    terms.push(raw[i]);
  }
  return terms;
}

function efPrepareSearchText(value) {
  var raw = String(value == null ? "" : value);
  var normalized = efNormalizeSearchText(raw);
  return {
    raw: raw,
    normalized: normalized,
    // Building a second, space-free copy of every full-text snippet can more
    // than double memory use on the large 29 MB Ghatnachakra index. Create it
    // only if the normal exact pass finds no result and compact matching is
    // actually needed.
    compact: null,
    tokens: null
  };
}

// Prepared text is immutable for the static search indexes. Cache it once so
// typing another character does not re-normalize tens of megabytes of Hindi
// and English content on the UI thread.
var efPreparedRecordCache = typeof WeakMap === "function" ? new WeakMap() : null;
var efPreparedSnippetGroupCache = typeof WeakMap === "function" ? new WeakMap() : null;

function efPreparedRecordFields(record, fieldNames) {
  var key = fieldNames.join("\u001f");
  var recordCache = efPreparedRecordCache ? efPreparedRecordCache.get(record) : null;
  if (!recordCache) {
    recordCache = {};
    if (efPreparedRecordCache) efPreparedRecordCache.set(record, recordCache);
  }
  if (!recordCache[key]) {
    var fields = [];
    for (var i = 0; i < fieldNames.length; i++) {
      fields.push(efPrepareSearchText(record[fieldNames[i]] || ""));
    }
    recordCache[key] = fields;
  }
  return recordCache[key];
}

function efPreparedSnippetGroup(group) {
  var cached = efPreparedSnippetGroupCache
    ? efPreparedSnippetGroupCache.get(group)
    : null;
  if (cached) return cached;

  var snippets = [];
  var source = Array.isArray(group.x) ? group.x : [];
  for (var i = 0; i < source.length; i++) {
    snippets.push(efPrepareSearchText(source[i]));
  }
  cached = {
    title: efPrepareSearchText(group.t || ""),
    breadcrumb: efPrepareSearchText(group.b || ""),
    snippets: snippets
  };
  if (efPreparedSnippetGroupCache) efPreparedSnippetGroupCache.set(group, cached);
  return cached;
}

function efWarmSearchRecords(records, fieldNames) {
  if (!Array.isArray(records)) return 0;
  fieldNames = fieldNames || ["title", "breadcrumb", "text"];
  for (var i = 0; i < records.length; i++) {
    efPreparedRecordFields(records[i], fieldNames);
  }
  return records.length;
}

function efWarmSnippetIndex(groups) {
  if (!Array.isArray(groups)) return 0;
  for (var i = 0; i < groups.length; i++) efPreparedSnippetGroup(groups[i]);
  return groups.length;
}

function efAllowedEditDistance(term) {
  if (/^\d+$/.test(term) || term.length < 4) return 0;
  return term.length >= 8 ? 2 : 1;
}

function efBoundedEditDistance(a, b, maximum) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > maximum) return maximum + 1;

  var previous = [];
  var current = [];
  var i;
  var j;
  for (j = 0; j <= b.length; j++) previous[j] = j;

  for (i = 1; i <= a.length; i++) {
    current[0] = i;
    var rowMinimum = current[0];
    for (j = 1; j <= b.length; j++) {
      var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost
      );
      if (current[j] < rowMinimum) rowMinimum = current[j];
    }
    if (rowMinimum > maximum) return maximum + 1;
    var swap = previous;
    previous = current;
    current = swap;
  }
  return previous[b.length];
}

function efFindTermInPreparedText(field, term, allowFuzzy, allowCompact) {
  var position = field.normalized.indexOf(term);
  if (position !== -1) return { score: 0, position: position, word: term };

  if (allowCompact !== false) {
    var compactTerm = term.replace(/\s+/g, "");
    if (compactTerm.length > 1) {
      if (field.compact === null) field.compact = field.normalized.replace(/\s+/g, "");
      if (field.compact.indexOf(compactTerm) !== -1) {
        return { score: 4, position: 0, word: term };
      }
    }
  }

  if (!allowFuzzy) return null;
  var maximum = efAllowedEditDistance(term);
  if (!maximum) return null;

  if (!field.tokens) field.tokens = field.normalized.split(" ").filter(Boolean);
  var best = null;
  for (var i = 0; i < field.tokens.length; i++) {
    var candidate = field.tokens[i];
    if (candidate.charAt(0) !== term.charAt(0)) continue;
    if (Math.abs(candidate.length - term.length) > maximum) continue;
    var distance = efBoundedEditDistance(term, candidate, maximum);
    if (distance <= maximum && (!best || distance < best.distance)) {
      best = { distance: distance, word: candidate };
      if (distance === 1) break;
    }
  }
  return best ? { score: 120 + best.distance * 10, position: 0, word: best.word } : null;
}

function efMatchPreparedFields(terms, fields, allowFuzzy, allowCompact) {
  var total = 0;
  var earliest = 1000000;
  for (var i = 0; i < terms.length; i++) {
    var best = null;
    for (var j = 0; j < fields.length; j++) {
      var found = efFindTermInPreparedText(fields[j], terms[i], allowFuzzy, allowCompact);
      if (!found) continue;
      var weighted = found.score + j * 20;
      if (!best || weighted < best.score) {
        best = { score: weighted, position: found.position };
      }
    }
    if (!best) return null;
    total += best.score;
    if (best.position < earliest) earliest = best.position;
  }
  return total + Math.min(earliest, 999) * 0.001;
}

function efSearchRecords(query, records, options) {
  options = options || {};
  var limit = options.limit || 40;
  var fieldNames = options.fields || ["title", "breadcrumb", "text"];
  var terms = efSearchTerms(query);
  if (!terms.length || !records) return [];

  function collect(allowFuzzy, allowCompact) {
    var found = [];
    for (var i = 0; i < records.length; i++) {
      var fields = efPreparedRecordFields(records[i], fieldNames);
      var score = efMatchPreparedFields(terms, fields, allowFuzzy, allowCompact);
      if (score !== null) found.push({ index: i, score: score, record: records[i] });
    }
    return found;
  }

  var scored = collect(false, false);
  if (scored.length === 0 && options.compact !== false) scored = collect(false, true);
  if (scored.length === 0 && options.fuzzy !== false) scored = collect(true, false);
  scored.sort(function (a, b) { return a.score - b.score || a.index - b.index; });

  var output = [];
  for (var k = 0; k < scored.length && k < limit; k++) output.push(scored[k].record);
  return output;
}

function efTextMatches(query, text, allowFuzzy) {
  var terms = efSearchTerms(query);
  if (!terms.length) return true;
  return efMatchPreparedFields(terms, [efPrepareSearchText(text)], !!allowFuzzy, true) !== null;
}

// Homepage title/breadcrumb search.
function efSearchRank(query, options) {
  options = options || {};
  var sectionPrefix = options.sectionPrefix || null;
  var excludeTitleMatches = !!options.excludeTitleMatches;
  var limit = options.limit || 40;
  var terms = efSearchTerms(query);
  if (!terms.length || typeof SEARCH_INDEX === "undefined") return [];
  var hasContent = typeof CONTENT_INDEX !== "undefined";

  function collect(allowFuzzy, allowCompact) {
    var found = [];
    for (var i = 0; i < SEARCH_INDEX.length; i++) {
      var record = SEARCH_INDEX[i];
      if (sectionPrefix && record.url.indexOf(sectionPrefix) !== 0) continue;

      var cachedFields = efPreparedRecordFields(record, ["title", "hi", "breadcrumb"]);
      var titleFields = [cachedFields[0], cachedFields[1]];
      if (excludeTitleMatches &&
          efMatchPreparedFields(terms, titleFields, allowFuzzy, allowCompact) !== null) continue;

      var fields = titleFields.concat([
        cachedFields[2],
        efPrepareSearchText(hasContent ? (CONTENT_INDEX[record.url] || "") : "")
      ]);
      var score = efMatchPreparedFields(terms, fields, allowFuzzy, allowCompact);
      if (score !== null) found.push({ index: i, score: score, record: record });
    }
    return found;
  }

  var scored = collect(false, false);
  if (scored.length === 0 && options.compact !== false) scored = collect(false, true);
  if (scored.length === 0 && options.fuzzy !== false) scored = collect(true, false);
  scored.sort(function (a, b) { return a.score - b.score || a.index - b.index; });

  var output = [];
  for (var i = 0; i < scored.length && i < limit; i++) output.push(scored[i].record);
  return output;
}

function efEscapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
  });
}

function efRegexEscape(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function efSnippetWithHighlight(text, queryOrTerms) {
  text = String(text == null ? "" : text);
  var terms = Array.isArray(queryOrTerms)
    ? queryOrTerms.map(efNormalizeSearchText).filter(Boolean)
    : efSearchTerms(queryOrTerms);
  var lower = text.toLowerCase();
  var bestIndex = -1;
  var bestLength = 0;
  var highlightWords = [];

  for (var i = 0; i < terms.length; i++) {
    var directIndex = lower.indexOf(terms[i]);
    if (directIndex !== -1) {
      highlightWords.push(text.slice(directIndex, directIndex + terms[i].length));
      if (bestIndex === -1 || directIndex < bestIndex) {
        bestIndex = directIndex;
        bestLength = terms[i].length;
      }
    }
  }

  if (bestIndex === -1 && terms.length) {
    var tokenRegex = /[A-Za-z0-9\u0900-\u097F]+/g;
    var match;
    while ((match = tokenRegex.exec(text)) !== null) {
      var candidate = efNormalizeSearchText(match[0]);
      for (var j = 0; j < terms.length; j++) {
        var maximum = efAllowedEditDistance(terms[j]);
        if (!maximum || candidate.charAt(0) !== terms[j].charAt(0)) continue;
        if (efBoundedEditDistance(terms[j], candidate, maximum) <= maximum) {
          bestIndex = match.index;
          bestLength = match[0].length;
          highlightWords.push(match[0]);
          break;
        }
      }
      if (bestIndex !== -1) break;
    }
  }

  var raw;
  if (bestIndex === -1) {
    raw = text.slice(0, 180) + (text.length > 180 ? "..." : "");
  } else {
    var start = Math.max(0, bestIndex - 65);
    var end = Math.min(text.length, bestIndex + bestLength + 115);
    raw = (start > 0 ? "..." : "") + text.slice(start, end) + (end < text.length ? "..." : "");
  }

  for (var k = 0; k < terms.length; k++) {
    if (lower.indexOf(terms[k]) !== -1) highlightWords.push(terms[k]);
  }
  highlightWords.sort(function (a, b) { return b.length - a.length; });

  var escaped = efEscapeHtml(raw);
  var used = {};
  for (var h = 0; h < highlightWords.length; h++) {
    var word = highlightWords[h];
    var key = word.toLowerCase();
    if (!word || used[key]) continue;
    used[key] = true;
    escaped = escaped.replace(new RegExp("(" + efRegexEscape(efEscapeHtml(word)) + ")", "ig"), "<mark>$1</mark>");
  }
  return escaped;
}

// Full-content snippet search used by Ghatnachakra, Lucent, Pinnacle and Mind Maps.
function efSnippetSearch(query, options) {
  options = options || {};
  var sectionPrefix = options.sectionPrefix || null;
  var excludeTitleMatches = !!options.excludeTitleMatches;
  var limit = options.limit || 40;
  var terms = efSearchTerms(query);
  if (!terms.length || typeof EF_SNIPPET_INDEX === "undefined") return [];

  function collect(allowFuzzy, allowCompact) {
    var found = [];
    var sequence = 0;
    for (var i = 0; i < EF_SNIPPET_INDEX.length; i++) {
      var group = EF_SNIPPET_INDEX[i];
      if (sectionPrefix && group.f.indexOf(sectionPrefix) !== 0) continue;

      var preparedGroup = efPreparedSnippetGroup(group);
      var titleField = preparedGroup.title;
      var breadcrumbField = preparedGroup.breadcrumb;
      if (excludeTitleMatches &&
          efMatchPreparedFields(terms, [titleField], allowFuzzy, allowCompact) !== null) continue;

      for (var j = 0; j < group.x.length; j++) {
        var fields = [preparedGroup.snippets[j], titleField, breadcrumbField];
        var score = efMatchPreparedFields(terms, fields, allowFuzzy, allowCompact);
        if (score !== null) {
          found.push({
            score: score,
            sequence: sequence,
            f: group.f,
            t: group.t,
            b: group.b,
            x: group.x[j]
          });
        }
        sequence++;
      }
    }
    return found;
  }

  var scored = collect(false, false);
  if (scored.length === 0 && options.compact !== false) scored = collect(false, true);
  if (scored.length === 0 && options.fuzzy !== false) scored = collect(true, false);
  scored.sort(function (a, b) { return a.score - b.score || a.sequence - b.sequence; });

  var output = [];
  for (var i = 0; i < scored.length && i < limit; i++) {
    output.push({ f: scored[i].f, t: scored[i].t, b: scored[i].b, x: scored[i].x });
  }
  return output;
}

// Small main-thread bridge for the background search worker. Large index files
// are parsed and normalized away from the page, so typing and scrolling remain
// responsive even on slower Android WebViews.
function efCreateSearchWorker(options) {
  options = options || {};
  if (typeof Worker !== "function" || !options.workerUrl) return null;

  var worker = null;
  var startPromise = null;
  var startResolve = null;
  var startReject = null;
  var nextId = 1;
  var latestSearchToken = 0;
  var pending = {};

  function rejectPending(error) {
    Object.keys(pending).forEach(function (id) {
      pending[id].reject(error);
      delete pending[id];
    });
  }

  function start() {
    if (startPromise) return startPromise;
    startPromise = new Promise(function (resolve, reject) {
      startResolve = resolve;
      startReject = reject;
      try {
        worker = new Worker(options.workerUrl);
      } catch (error) {
        reject(error);
        return;
      }

      worker.onmessage = function (event) {
        var message = event.data || {};
        if (message.type === "ready") {
          startResolve(true);
          return;
        }
        if (message.type === "result" && pending[message.id]) {
          pending[message.id].resolve(message.results || []);
          delete pending[message.id];
          return;
        }
        if (message.type === "error") {
          var error = new Error(message.message || "Search worker failed");
          if (message.id && pending[message.id]) {
            pending[message.id].reject(error);
            delete pending[message.id];
          } else if (startReject) {
            startReject(error);
          }
        }
      };

      worker.onerror = function () {
        var error = new Error("Search worker failed to load");
        if (startReject) startReject(error);
        rejectPending(error);
      };

      var initOptions = {};
      Object.keys(options).forEach(function (key) {
        if (key !== "workerUrl") initOptions[key] = options[key];
      });
      worker.postMessage({ type: "init", options: initOptions });
    });
    return startPromise;
  }

  function search(query) {
    var token = ++latestSearchToken;
    return start().then(function () {
      // If several debounced queries were waiting for a large index to warm,
      // send only the newest one instead of replaying every intermediate key.
      if (token !== latestSearchToken) return [];
      return new Promise(function (resolve, reject) {
        var id = nextId++;
        pending[id] = { resolve: resolve, reject: reject };
        worker.postMessage({ type: "search", id: id, query: query });
      });
    });
  }

  function terminate() {
    if (worker) worker.terminate();
    rejectPending(new Error("Search worker terminated"));
    worker = null;
  }

  return { warm: start, search: search, terminate: terminate };
}
