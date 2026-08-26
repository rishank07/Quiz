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
    compact: normalized.replace(/\s+/g, ""),
    tokens: null
  };
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

function efFindTermInPreparedText(field, term, allowFuzzy) {
  var position = field.normalized.indexOf(term);
  if (position !== -1) return { score: 0, position: position, word: term };

  var compactTerm = term.replace(/\s+/g, "");
  if (compactTerm.length > 1 && field.compact.indexOf(compactTerm) !== -1) {
    return { score: 4, position: 0, word: term };
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

function efMatchPreparedFields(terms, fields, allowFuzzy) {
  var total = 0;
  var earliest = 1000000;
  for (var i = 0; i < terms.length; i++) {
    var best = null;
    for (var j = 0; j < fields.length; j++) {
      var found = efFindTermInPreparedText(fields[j], terms[i], allowFuzzy);
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

  function collect(allowFuzzy) {
    var found = [];
    for (var i = 0; i < records.length; i++) {
      var fields = [];
      for (var j = 0; j < fieldNames.length; j++) {
        fields.push(efPrepareSearchText(records[i][fieldNames[j]] || ""));
      }
      var score = efMatchPreparedFields(terms, fields, allowFuzzy);
      if (score !== null) found.push({ index: i, score: score, record: records[i] });
    }
    return found;
  }

  var scored = collect(false);
  if (scored.length === 0 && options.fuzzy !== false) scored = collect(true);
  scored.sort(function (a, b) { return a.score - b.score || a.index - b.index; });

  var output = [];
  for (var k = 0; k < scored.length && k < limit; k++) output.push(scored[k].record);
  return output;
}

function efTextMatches(query, text, allowFuzzy) {
  var terms = efSearchTerms(query);
  if (!terms.length) return true;
  return efMatchPreparedFields(terms, [efPrepareSearchText(text)], !!allowFuzzy) !== null;
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

  function collect(allowFuzzy) {
    var found = [];
    for (var i = 0; i < SEARCH_INDEX.length; i++) {
      var record = SEARCH_INDEX[i];
      if (sectionPrefix && record.url.indexOf(sectionPrefix) !== 0) continue;

      var titleFields = [
        efPrepareSearchText(record.title || ""),
        efPrepareSearchText(record.hi || "")
      ];
      if (excludeTitleMatches && efMatchPreparedFields(terms, titleFields, allowFuzzy) !== null) continue;

      var fields = titleFields.concat([
        efPrepareSearchText(record.breadcrumb || ""),
        efPrepareSearchText(hasContent ? (CONTENT_INDEX[record.url] || "") : "")
      ]);
      var score = efMatchPreparedFields(terms, fields, allowFuzzy);
      if (score !== null) found.push({ index: i, score: score, record: record });
    }
    return found;
  }

  var scored = collect(false);
  if (scored.length === 0 && options.fuzzy !== false) scored = collect(true);
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

  function collect(allowFuzzy) {
    var found = [];
    var sequence = 0;
    for (var i = 0; i < EF_SNIPPET_INDEX.length; i++) {
      var group = EF_SNIPPET_INDEX[i];
      if (sectionPrefix && group.f.indexOf(sectionPrefix) !== 0) continue;

      var titleField = efPrepareSearchText(group.t || "");
      var breadcrumbField = efPrepareSearchText(group.b || "");
      if (excludeTitleMatches && efMatchPreparedFields(terms, [titleField], allowFuzzy) !== null) continue;

      for (var j = 0; j < group.x.length; j++) {
        var fields = [efPrepareSearchText(group.x[j]), titleField, breadcrumbField];
        var score = efMatchPreparedFields(terms, fields, allowFuzzy);
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

  var scored = collect(false);
  if (scored.length === 0 && options.fuzzy !== false) scored = collect(true);
  scored.sort(function (a, b) { return a.score - b.score || a.sequence - b.sequence; });

  var output = [];
  for (var i = 0; i < scored.length && i < limit; i++) {
    output.push({ f: scored[i].f, t: scored[i].t, b: scored[i].b, x: scored[i].x });
  }
  return output;
}
