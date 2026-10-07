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
  var seen = Object.create(null);
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

// Common Roman/Hinglish words used by students.  Each entry is an OR-list,
// not an extra required term: "rashtrapati" can therefore match राष्ट्रपति
// or president without making an ordinary English/Hindi search broader.
var EF_SEARCH_ALIASES = {
  rashtrapati: ["राष्ट्रपति", "president"],
  pradhanmantri: ["प्रधानमंत्री", "prime minister"],
  samvidhan: ["संविधान", "constitution"],
  anuchhed: ["अनुच्छेद", "article"],
  sansad: ["संसद", "parliament"],
  nyayalaya: ["न्यायालय", "court"],
  itihas: ["इतिहास", "history"],
  bhugol: ["भूगोल", "geography"],
  rajvyavastha: ["राजव्यवस्था", "polity"],
  arthvyavastha: ["अर्थव्यवस्था", "economics"],
  vigyan: ["विज्ञान", "science"],
  paryavaran: ["पर्यावरण", "environment"],
  ganit: ["गणित", "maths", "mathematics"],
  currentaffairs: ["current affairs", "करेंट अफेयर्स", "समसामयिकी"],
  karent: ["current", "करेंट"],
  trick: ["tricks", "memory trick", "मेमोरी ट्रिक्स"]
};

function efSearchTermAlternatives(term) {
  var aliases = Object.prototype.hasOwnProperty.call(EF_SEARCH_ALIASES, term) ? EF_SEARCH_ALIASES[term] : [];
  var output = [term];
  var seen = Object.create(null);
  seen[term] = true;
  for (var i = 0; i < aliases.length; i++) {
    var normalized = efNormalizeSearchText(aliases[i]);
    if (normalized && !seen[normalized]) {
      seen[normalized] = true;
      output.push(normalized);
    }
  }
  return output;
}

function efBoundedEditDistance(a, b, maximum) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > maximum) return maximum + 1;

  // A very common mobile typo is swapping two neighbouring letters
  // ("poltiy", "gandih"). Treat that as one edit without paying for a full
  // Damerau matrix on every token in the large search indexes.
  if (maximum >= 1 && a.length === b.length) {
    var firstDifference = -1;
    var secondDifference = -1;
    for (var differenceIndex = 0; differenceIndex < a.length; differenceIndex++) {
      if (a.charAt(differenceIndex) === b.charAt(differenceIndex)) continue;
      if (firstDifference === -1) firstDifference = differenceIndex;
      else if (secondDifference === -1) secondDifference = differenceIndex;
      else { secondDifference = -2; break; }
    }
    if (firstDifference >= 0 && secondDifference === firstDifference + 1 &&
        a.charAt(firstDifference) === b.charAt(secondDifference) &&
        a.charAt(secondDifference) === b.charAt(firstDifference)) return 1;
  }

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

function efFindSingleTermInPreparedText(field, term, allowFuzzy, allowCompact) {
  var literal = efRelevanceTerm(field.normalized, term);
  if (literal) return {score: [-12, -5, 0][literal.quality], position: literal.position, word: term};

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

function efFindTermInPreparedText(field, term, allowFuzzy, allowCompact) {
  // Prefer the literal query. Aliases carry a small penalty so a genuine
  // typed-language match always ranks above a translated/Hinglish match.
  var direct = efFindSingleTermInPreparedText(field, term, false, allowCompact);
  if (direct) return direct;

  var alternatives = efSearchTermAlternatives(term);
  for (var i = 1; i < alternatives.length; i++) {
    var alias = efFindSingleTermInPreparedText(field, alternatives[i], false, allowCompact);
    if (alias) {
      alias.score += 18;
      return alias;
    }
  }

  return allowFuzzy
    ? efFindSingleTermInPreparedText(field, term, true, allowCompact)
    : null;
}

function efSearchPhraseBonus(query, fields, weights, alreadyNormalized) {
  var phrase = alreadyNormalized ? query : efNormalizeSearchText(query);
  if (!phrase || phrase.length < 2) return 0;
  var best = 0;
  for (var i = 0; i < fields.length; i++) {
    var normalized = fields[i] && fields[i].normalized || "";
    if (!normalized) continue;
    var weight = weights && weights[i] != null ? weights[i] : Math.max(40, 180 - i * 55);
    var bonus = 0;
    if (normalized === phrase) bonus = -weight;
    else if (normalized.indexOf(phrase) === 0) bonus = -Math.round(weight * 0.78);
    else if (normalized.indexOf(phrase) !== -1) bonus = -Math.round(weight * 0.56);
    if (bonus < best) best = bonus;
  }
  return best;
}

function efSearchSectionIntentBonus(query, record) {
  var normalized = efNormalizeSearchText(query);
  var haystack = efNormalizeSearchText((record.section || "") + " " + (record.breadcrumb || "") + " " + (record.url || ""));
  var intents = [
    { words: ["pyq", "previous year"], targets: ["previous year", "pyq"] },
    { words: ["crux", "trick", "memory"], targets: ["crux", "trick"] },
    { words: ["current affairs", "karent affairs", "समसामयिकी", "करेंट अफेयर्स"], targets: ["current affairs"] },
    { words: ["original practice", "practice"], targets: ["original practice"] },
    { words: ["mind map", "mindmap"], targets: ["mind map"] },
    { words: ["bihar"], targets: ["bihar"] },
    { words: ["pinnacle", "lucent", "ghatna", "blackbook"], targets: ["books", "pinnacle", "lucent", "ghatna", "blackbook"] }
  ];
  for (var i = 0; i < intents.length; i++) {
    var requested = intents[i].words.some(function (word) { return normalized.indexOf(word) !== -1; });
    var belongs = intents[i].targets.some(function (word) { return haystack.indexOf(word) !== -1; });
    if (requested && belongs) return -85;
  }
  return 0;
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

// Lower scores are better. Quality tiers are deliberately wider than field,
// proximity and length boosts: an embedded substring cannot outrank a word.
// This is local relevance ranking, not web authority/PageRank.
function efRelevanceQuery(query) {
  var phrase = efNormalizeSearchText(query), terms = efSearchTerms(query);
  return { phrase: phrase, terms: terms, alternatives: terms.map(efSearchTermAlternatives) };
}
function efWholeSearchPosition(text, term) {
  var from=0,p;
  while((p=text.indexOf(term,from))>=0) {
    var end=p+term.length;
    if((p===0||text.charAt(p-1)===" ")&&(end===text.length||text.charAt(end)===" "))return p;
    from=p+1;
  }
  return -1;
}
function efRelevanceTerm(text, term) {
  var p=efWholeSearchPosition(text,term);
  if(p>=0)return {quality:0,position:p};
  var from=0;
  while((p=text.indexOf(term,from))>=0) {if(p===0||text.charAt(p-1)===" ")return {quality:1,position:p};from=p+1;}
  p=text.indexOf(term);
  return p>=0?{quality:2,position:p}:null;
}

function efRelevanceScore(parsed, body, title, breadcrumb, allowCompact, allowFuzzy) {
  var fields = [body, title, breadcrumb], quality = 0, allBody = true;
  var questionEnd = body.search(/ (?:answer|explanation|उत्तर|व्याख्या) /);
  var question = questionEnd < 0 ? body : body.slice(0, questionEnd);
  var allQuestion = true, earliest = body.length, latest = 0;
  for (var i = 0; i < parsed.terms.length; i++) {
    var alternatives = parsed.alternatives[i], best = null;
    for (var j = 0; j < fields.length; j++) {
      for (var a = 0; a < alternatives.length; a++) {
        var match = efRelevanceTerm(fields[j], alternatives[a]);
        if (!match && allowCompact) {
          var at = fields[j].replace(/ /g, "").indexOf(alternatives[a].replace(/ /g, ""));
          if (at >= 0) match = { quality: 4, position: at };
        }
        if (!match && allowFuzzy) {
          var fuzzy = efFindSingleTermInPreparedText({normalized: fields[j], compact: null, tokens: null}, alternatives[a], true, false);
          if (fuzzy) match = {quality: 5, position: fuzzy.position};
        }
        if (!match) continue;
        var q = Math.max(match.quality, a ? 3 : 0);
        if (!best || q < best.quality || (q === best.quality && j < best.field)) {
          best = {quality: q, position: match.position, field: j};
        }
        if (best && best.quality === 0 && best.field === 0) break;
      }
      if (best && best.quality === 0 && best.field === 0) break;
    }
    if (!best) return null;
    quality = Math.max(quality, best.quality);
    if (best.field !== 0) allBody = false;
    if (efWholeSearchPosition(question, parsed.terms[i]) < 0) allQuestion = false;
    if (best.field === 0) { earliest = Math.min(earliest, best.position); latest = Math.max(latest, best.position); }
  }
  var phrase = parsed.phrase, tier;
  if (title === phrase) tier = 0;
  else if (efWholeSearchPosition(question, phrase) >= 0) tier = 1;
  else if (allQuestion) tier = 2;
  else if (efWholeSearchPosition(body, phrase) >= 0) tier = 3;
  else if (allBody) tier = 4;
  else if (efWholeSearchPosition(title, phrase) >= 0) tier = 5;
  else tier = 6;
  // Saturated length/proximity signals avoid rewarding repeated keyword spam.
  var proximity = allBody ? Math.min(20, Math.max(0, latest - earliest - phrase.length) / 20) : 20;
  var length = Math.min(10, Math.log(1 + body.length) / 2);
  return {score: quality * 1000 + tier * 50 + proximity + length + Math.min(earliest, 1000) / 10000,
    matchType: ["exact", "prefix", "substring", "alias", "compact", "typo"][quality]};
}

// Bounded, deduplicating max-heap. Only K hits and their routing metadata are
// retained, even for a query matching every question. Final output is stable.
function efTopSearchHits(limit) {
  var heap = [], locations = new Map();
  function compare(a, b) { return a.score - b.score || a.sequence - b.sequence; }
  function key(hit) {
    var raw = String(hit.x || ""), code = raw.charCodeAt(0);
    // PDF pages and Original Practice questions carry a private-use marker.
    // Hash/query anchors are already part of f for ordinary HTML questions.
    return String(hit.f || "") + (code >= 0xE000 && code <= 0xF8FF ? "|" + code : "");
  }
  function swap(a, b) { var t = heap[a]; heap[a] = heap[b]; heap[b] = t; locations.set(heap[a]._key, a); locations.set(heap[b]._key, b); }
  function down(i) { while (true) { var l=i*2+1,r=l+1,w=i; if(l<heap.length&&compare(heap[l],heap[w])>0)w=l; if(r<heap.length&&compare(heap[r],heap[w])>0)w=r; if(w===i)break;swap(i,w);i=w; } }
  return {
    add: function (hit) {
      var k=key(hit), at=locations.get(k);
      if (at !== undefined) { if(compare(hit,heap[at])>=0)return; hit._key=k;heap[at]=hit;down(at);return; }
      hit._key=k;
      if(heap.length<limit) { var i=heap.length;heap.push(hit);locations.set(k,i);while(i>0){var p=(i-1)>>1;if(compare(heap[i],heap[p])<=0)break;swap(i,p);i=p;} }
      else if(compare(hit,heap[0])<0) { locations.delete(heap[0]._key);heap[0]=hit;locations.set(k,0);down(0); }
    },
    size: function () { return heap.length; },
    sorted: function () { return heap.slice().sort(compare).map(function (hit) { delete hit._key; return hit; }); }
  };
}

// Cache only small result lists, never another copy of the source index.
// Config/revision is part of the key; requests still keep cancellation guards.
var efSearchResultCache = new Map(), efSearchResultCacheBytes = 0;
function efCachedSearchResults(key, rows) {
  if (arguments.length === 1) {
    var item = efSearchResultCache.get(key);
    if (!item) return null;
    efSearchResultCache.delete(key);efSearchResultCache.set(key,item);
    return item.rows;
  }
  if (!Array.isArray(rows)) return rows;
  var bytes = JSON.stringify(rows).length * 2;
  if (bytes > 131072) return rows;
  var old = efSearchResultCache.get(key);
  if(old) {efSearchResultCacheBytes-=old.bytes;efSearchResultCache.delete(key);}
  efSearchResultCache.set(key,{rows:rows,bytes:bytes});efSearchResultCacheBytes+=bytes;
  while(efSearchResultCacheBytes>262144||efSearchResultCache.size>32) {
    var oldest=efSearchResultCache.keys().next().value;
    efSearchResultCacheBytes-=efSearchResultCache.get(oldest).bytes;efSearchResultCache.delete(oldest);
  }
  return rows;
}

function efSearchRecords(query, records, options) {
  options = options || {};
  var limit = options.limit || 40, fields = options.fields || ["title", "breadcrumb", "text"];
  var parsed = efRelevanceQuery(query);
  if (!parsed.terms.length || !records) return [];
  function collect(compact, fuzzy) {
    var found = [];
    for (var i = 0; i < records.length; i++) {
      var record = records[i], prepared = efPreparedRecordFields(record, fields);
      var title = efNormalizeSearchText(record.title || record.t || prepared[0].normalized);
      var body = efNormalizeSearchText(record.text || record.x || prepared.map(function(f){return f.normalized;}).join(" "));
      var breadcrumb = efNormalizeSearchText(record.breadcrumb || record.b || "");
      var match = efRelevanceScore(parsed, body, title, breadcrumb, compact, fuzzy);
      if(match) found.push({record: record, score: match.score, index: i, matchType: match.matchType});
    }
    return found;
  }
  var scored=collect(false,false);
  if(!scored.length&&options.compact!==false)scored=collect(true,false);
  if(!scored.length&&options.fuzzy!==false)scored=collect(false,true);
  scored.sort(function(a,b){return a.score-b.score||a.index-b.index;});
  return scored.slice(0,limit).map(function(item){
    return Object.assign({},item.record,{score:item.score,matchType:item.matchType});
  });
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
  var parsed = efRelevanceQuery(query);
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

      var title = cachedFields[0].normalized + " " + cachedFields[1].normalized;
      var content = efNormalizeSearchText(hasContent ? (CONTENT_INDEX[record.url] || "") : "");
      var match = efRelevanceScore(parsed, content, title.trim(), cachedFields[2].normalized, allowCompact, allowFuzzy);
      if (match) {
        // Preserve an exact English OR Hindi title as the strongest title hit.
        if (cachedFields[0].normalized === parsed.phrase || cachedFields[1].normalized === parsed.phrase) match.score = 0;
        var intent = Math.max(-40, efSearchSectionIntentBonus(query, record));
        found.push({index:i,score:match.score+intent,record:record});
      }
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
    var highlightAlternatives = efSearchTermAlternatives(terms[i]);
    for (var alternativeIndex = 0; alternativeIndex < highlightAlternatives.length; alternativeIndex++) {
      var highlightTerm = highlightAlternatives[alternativeIndex];
      var directIndex = lower.indexOf(highlightTerm);
      if (directIndex !== -1) {
        highlightWords.push(text.slice(directIndex, directIndex + highlightTerm.length));
        if (bestIndex === -1 || directIndex < bestIndex) {
          bestIndex = directIndex;
          bestLength = highlightTerm.length;
        }
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

  // Match raw text once; never run later replacements through generated tags.
  // Overlapping terms and a query such as "mark" must not corrupt the markup.
  var words = highlightWords.filter(function(word,index,all){
    return word && all.findIndex(function(other){return other.toLowerCase()===word.toLowerCase()})===index;
  });
  if (!words.length) return efEscapeHtml(raw);
  var pattern = new RegExp(words.map(efRegexEscape).join("|"), "ig");
  var output = "", offset = 0, match;
  while ((match = pattern.exec(raw))) {
    output += efEscapeHtml(raw.slice(offset, match.index)) + "<mark>" + efEscapeHtml(match[0]) + "</mark>";
    offset = match.index + match[0].length;
  }
  return output + efEscapeHtml(raw.slice(offset));
}

// Full-content snippet search used by Ghatnachakra, Lucent, Pinnacle and Mind Maps.
function efSnippetSearch(query, options) {
  options = options || {};
  var sectionPrefix = options.sectionPrefix || null;
  var excludeTitleMatches = !!options.excludeTitleMatches;
  var limit = options.limit || 40;
  var terms = efSearchTerms(query);
  var parsed = efRelevanceQuery(query);
  if (!terms.length || typeof EF_SNIPPET_INDEX === "undefined") return [];

  function collect(allowFuzzy, allowCompact) {
    var found = efTopSearchHits(limit);
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
        var match = efRelevanceScore(parsed, efNormalizeSearchText(efFallbackStripMarker(group.x[j])), titleField.normalized, breadcrumbField.normalized, allowCompact, allowFuzzy);
        if (match) {
          found.add({
            score: match.score,
            matchType: match.matchType,
            sequence: sequence,
            f: efFallbackWithAnchor(group.f, efFallbackExtractAnchor(group.x[j])),
            t: group.t,
            b: group.b,
            x: group.x[j]
          });
        }
        sequence++;
      }
    }
    return found.sorted();
  }

  var scored = collect(false, false);
  if (scored.length === 0 && options.compact !== false) scored = collect(false, true);
  if (scored.length === 0 && options.fuzzy !== false) scored = collect(true, false);
  scored.sort(function (a, b) { return a.score - b.score || a.sequence - b.sequence; });

  var output = [];
  for (var i = 0; i < scored.length && i < limit; i++) {
    output.push({ f: scored[i].f, t: scored[i].t, b: scored[i].b, x: scored[i].x, score: scored[i].score, matchType: scored[i].matchType });
  }
  return output;
}

// Background-worker bridge with a main-thread fallback.
//
// Why the fallback exists: Chromium/WebView blocks Worker() for many file://
// pages and some restrictive embedded contexts. ExamFusion pages are often
// tested locally before upload, so full-text search must still work there.
// On normal https:// hosting the worker remains the preferred fast path.
var EF_FALLBACK_SCRIPT_PROMISES = Object.create(null);
var EF_FALLBACK_GLOBAL_URLS = Object.create(null);
var efFallbackLoadQueue = Promise.resolve();
function efLoadSearchIndexScript(url, globalName) {
  var key = new URL(url, document.baseURI).href + "|" + globalName;
  if (EF_FALLBACK_SCRIPT_PROMISES[key]) return EF_FALLBACK_SCRIPT_PROMISES[key];
  // Several independent corpora export EF_SNIPPET_INDEX. Serialize loading and
  // retain the array belonging to this URL instead of reusing another corpus.
  var job = efFallbackLoadQueue.then(function () {
    if (EF_FALLBACK_GLOBAL_URLS[globalName] === key && Array.isArray(window[globalName])) return window[globalName];
    return new Promise(function (resolve, reject) {
      var triedPlain = false;
      window[globalName]=undefined;
      function attach(src) {
        var script = document.createElement("script"), timer;
        script.async = true; script.src = src;
        function fail(error) { clearTimeout(timer); script.remove(); reject(error); }
        script.onload = function () {
          clearTimeout(timer); script.remove();
          if (!Array.isArray(window[globalName])) { reject(new Error("Search index did not expose " + globalName)); return; }
          EF_FALLBACK_GLOBAL_URLS[globalName] = key;
          resolve(window[globalName]);
        };
        script.onerror = function () {
          clearTimeout(timer); script.remove();
          if (!triedPlain && String(src).indexOf("?") !== -1) { triedPlain = true; attach(String(src).split("?")[0]); return; }
          fail(new Error("Search index script could not load"));
        };
        timer = setTimeout(function(){fail(new Error("Search index load timed out"))},60000);
        (document.head || document.documentElement).appendChild(script);
      }
      attach(url);
    });
  });
  EF_FALLBACK_SCRIPT_PROMISES[key] = job.catch(function(error){delete EF_FALLBACK_SCRIPT_PROMISES[key];throw error});
  efFallbackLoadQueue = job.catch(function(){});
  // Bound retained fallback corpora. The caller keeps its own array while it
  // searches; future jobs can reload an evicted source without mixing globals.
  Object.keys(EF_FALLBACK_SCRIPT_PROMISES).slice(0,-2).forEach(function(old){delete EF_FALLBACK_SCRIPT_PROMISES[old]});
  return EF_FALLBACK_SCRIPT_PROMISES[key];
}

function efFallbackQueryTerms(query) {
  var normalized = efNormalizeSearchText(query);
  var raw = normalized.split(/\s+/), seen = Object.create(null), out = [];
  for (var i = 0; i < raw.length; i++) {
    if (!raw[i] || seen[raw[i]]) continue;
    seen[raw[i]] = true;
    out.push(raw[i]);
  }
  return { phrase: normalized, terms: out };
}

function efFallbackStripMarker(raw) {
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

function efFallbackWholePhrasePosition(text, phrase) {
  text = efNormalizeSearchText(text);
  phrase = efNormalizeSearchText(phrase);
  if (!text || !phrase) return -1;
  var position = (" " + text + " ").indexOf(" " + phrase + " ");
  return position < 0 ? -1 : Math.max(0, position - 1);
}

function efFallbackWholeTermPositions(text, terms) {
  var padded = " " + efNormalizeSearchText(text) + " ", positions = [];
  for (var i = 0; i < terms.length; i++) {
    var position = padded.indexOf(" " + terms[i] + " ");
    if (position < 0) return null;
    positions.push(Math.max(0, position - 1));
  }
  return positions;
}

function efFallbackStrictOcrScore(parsed, alias, body) {
  var position = efFallbackWholePhrasePosition(alias, parsed.phrase);
  if (position >= 0) return position * 0.001;
  var positions = efFallbackWholeTermPositions(alias, parsed.terms);
  if (positions) return 5 + (Math.max.apply(Math, positions) - Math.min.apply(Math, positions)) * 0.001;
  if (parsed.terms.length === 1 && parsed.terms[0].length < 4) return null;
  position = efFallbackWholePhrasePosition(body, parsed.phrase);
  if (position >= 0) return 20 + position * 0.00001;
  positions = efFallbackWholeTermPositions(body, parsed.terms);
  if (!positions) return null;
  var span = Math.max.apply(Math, positions) - Math.min.apply(Math, positions);
  if (parsed.terms.length > 1 && span > 180) return null;
  return 35 + span * 0.001 + Math.min.apply(Math, positions) * 0.000001;
}

// Mirrors search-worker.js's extractAnchor/withAnchor for the no-Worker
// fallback path (e.g. file:// pages), so per-question/per-tab deep links
// still resolve when the fast worker path is unavailable.
function efFallbackExtractAnchor(raw) {
  raw = String(raw == null ? "" : raw);
  if (!raw.length || raw.charCodeAt(0) !== 0x0001) return null;
  var sep = raw.indexOf("\u0002");
  if (sep === -1) return null;
  return raw.slice(1, sep);
}

function efFallbackWithAnchor(url, anchor) {
  if (!anchor) return url;
  var isOriginalPractice = /[?&]subject=/.test(url) && /[?&]chapter=/.test(url) && /[?&]section=/.test(url);
  if (isOriginalPractice) {
    var withoutHash = String(url || "").split("#")[0];
    var sep = withoutHash.indexOf("?") === -1 ? "?" : "&";
    return withoutHash + sep + "q=" + encodeURIComponent(anchor);
  }
  var base = String(url || "").split("#")[0];
  return base + "#" + anchor;
}

function efFallbackSnippetSearchAsync(query, records, options) {
  options = options || {};
  var parsed = efRelevanceQuery(query);
  var terms = parsed.terms;
  var phrase = parsed.phrase;
  if (!terms.length || !Array.isArray(records)) return Promise.resolve([]);

  var prefix = options.sectionPrefix || null;
  var top = efTopSearchHits(options.limit || 40);
  var compact = false, fuzzy = false;
  var i = 0, j = 0, sequence = 0;
  var limit = options.limit || 40;

  return new Promise(function (resolve) {
    function step() {
      if (options.cancelled && options.cancelled()) { resolve([]); return; }
      var started = Date.now();
      while (i < records.length && Date.now() - started < 12) {
        var group = records[i];
        if (!group || (prefix && String(group.f || "").indexOf(prefix) !== 0)) { i++; j=0; continue; }
        var title = efNormalizeSearchText(group.t), breadcrumb = efNormalizeSearchText(group.b);
        var snippets = Array.isArray(group.x) ? group.x : [];
        var aliases = Array.isArray(group.a) ? group.a : [];

        for (; j < snippets.length; j++) {
          if (Date.now() - started >= 12) break;
          var raw = String(snippets[j] == null ? "" : snippets[j]);
          var visible = efFallbackStripMarker(raw);
          if (options.strictOcr) {
            var strictScore = efFallbackStrictOcrScore(parsed, aliases[j] || "", visible);
            if (strictScore === null) { sequence++; continue; }
            top.add({
              score: strictScore,
              sequence: sequence,
              f: efFallbackWithAnchor(group.f, efFallbackExtractAnchor(raw)),
              t: group.t,
              b: group.b,
              x: raw
            });
            sequence++;
            continue;
          }
          var match = efRelevanceScore(parsed, efNormalizeSearchText(visible), title, breadcrumb, compact, fuzzy);
          if (!match) { sequence++; continue; }
          var score = match.score;
          top.add({
            score: score,
            matchType: match.matchType,
            sequence: sequence,
            f: efFallbackWithAnchor(group.f, efFallbackExtractAnchor(raw)),
            t: group.t,
            b: group.b,
            x: raw
          });
          sequence++;
        }
        if (j >= snippets.length) { i++; j=0; }
      }
      if (i < records.length) {
        setTimeout(step, 0);
        return;
      }
      if (!top.size() && !options.strictOcr) {
        if (!compact && !fuzzy && phrase.length > 2) { compact=true;i=0;j=0;sequence=0;setTimeout(step,0);return; }
        if (!fuzzy && options.fuzzy !== false && terms.some(function(term){return efAllowedEditDistance(term)>0;})) { compact=false;fuzzy=true;i=0;j=0;sequence=0;setTimeout(step,0);return; }
      }
      var out = top.sorted().map(function(hit) {
        return {f:hit.f,t:hit.t,b:hit.b,x:hit.x,score:hit.score,matchType:hit.matchType};
      });
      resolve(out);
    }
    step();
  });
}

// Section pages used to retain several large workers (and warm them on focus).
// Match Home's low-memory policy: start on demand, serialize sources and free
// each index after its results have been copied out of the worker.
var efSectionSearchScheduler = { tail: Promise.resolve(), active: null, epoch: 0 };
function efIsSectionSearchPage() {
  if (typeof document === "undefined" || typeof location === "undefined") return false;
  return !/^\/(?:index\.html)?$/i.test(location.pathname);
}
function efManageSectionSearchClient(client) {
  var generation = 0;
  var managed = {
    // Merely focusing a field must not download/parse all its indexes.
    warm: function () { return Promise.resolve(true); },
    terminate: function () { ++generation; client.terminate(); },
    search: function (query) {
      var token = ++generation, epoch = efSectionSearchScheduler.epoch;
      if (efSectionSearchScheduler.active === managed) client.terminate();
      var job = efSectionSearchScheduler.tail.then(function () {
        if (token !== generation || epoch !== efSectionSearchScheduler.epoch) return [];
        efSectionSearchScheduler.active = managed;
        return client.search(query).then(function (rows) {
          return token === generation && epoch === efSectionSearchScheduler.epoch ? rows : [];
        }).finally(function () {
          client.terminate();
          if (efSectionSearchScheduler.active === managed) efSectionSearchScheduler.active = null;
        });
      });
      efSectionSearchScheduler.tail = job.catch(function () {});
      return job;
    }
  };
  return managed;
}
if (efIsSectionSearchPage()) {
  var efCancelSectionSearch = function () {
    ++efSectionSearchScheduler.epoch;
    if (efSectionSearchScheduler.active) efSectionSearchScheduler.active.terminate();
  };
  var efSectionInputQueries = new WeakMap();
  document.addEventListener("input", function (event) {
    var input = event.target;
    if (!input || !input.matches || !input.matches('input[type="search"], input[id*="earch"]')) return;
    var query = efNormalizeSearchText(input.value);
    if (efSectionInputQueries.get(input) === query) return;
    efSectionInputQueries.set(input, query);
    efCancelSectionSearch();
  }, true);
  window.addEventListener("pagehide", efCancelSectionSearch);
}

function efCreateSearchWorker(options) {
  options = options || {};
  var managedSection = efIsSectionSearchPage();
  // Worker policy is the same across layouts. Fall back only after failure,
  // with yielding/cancellable scans; a successful empty search is final.
  var worker = null;
  var workerStartPromise = null;
  var cancelStartup = null;
  var workerFailed = false;
  var nextId = 1;
  var latestSearchToken = 0;
  var pending = {};
  var fallbackRecordsPromise = null;
  function cancellation() {
    var error = new Error("Search worker terminated");
    error.efCancelled = true;
    return error;
  }

  function rejectPending(error) {
    Object.keys(pending).forEach(function (id) {
      clearTimeout(pending[id].timer);
      pending[id].reject(error);
      delete pending[id];
    });
  }

  function canUseWorker() {
    if (typeof Worker !== "function" || !options.workerUrl) return false;
    // Local file pages are the exact context in which Chromium commonly blocks
    // dedicated workers. Skip the doomed attempt and use the reliable fallback.
    try { if (location && location.protocol === "file:") return false; } catch (_) {}
    return true;
  }

  function startWorker() {
    if (!canUseWorker() || workerFailed) return Promise.reject(new Error("Worker unavailable"));
    if (workerStartPromise) return workerStartPromise;
    workerStartPromise = new Promise(function (resolve, reject) {
      try {
        worker = new Worker(options.workerUrl);
      } catch (error) {
        workerFailed = true;
        reject(error);
        return;
      }

      var settled = false;
      var timeout = setTimeout(function () {
        if (settled) return;
        settled = true;
        cancelStartup = null;
        workerFailed = true;
        try { worker.terminate(); } catch (_) {}
        worker = null;
        reject(new Error("Search worker startup timed out"));
      }, options.startupTimeout || 60000);

      cancelStartup = function () {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        cancelStartup = null;
        reject(cancellation());
      };

      worker.onmessage = function (event) {
        var message = event.data || {};
        if (message.type === "ready") {
          if (!settled) { settled = true; clearTimeout(timeout); cancelStartup = null; resolve(true); }
          return;
        }
        if (message.type === "result" && pending[message.id]) {
          clearTimeout(pending[message.id].timer);
          pending[message.id].resolve(message.results || []);
          delete pending[message.id];
          return;
        }
        if (message.type === "error") {
          var error = new Error(message.message || "Search worker failed");
          if (message.id && pending[message.id]) {
            clearTimeout(pending[message.id].timer);
            pending[message.id].reject(error);
            delete pending[message.id];
          } else if (!settled) {
            settled = true; clearTimeout(timeout); cancelStartup = null; workerFailed = true; reject(error);
          }
        }
      };

      worker.onerror = function () {
        var error = new Error("Search worker failed to load");
        workerFailed = true;
        if (!settled) { settled = true; clearTimeout(timeout); cancelStartup = null; reject(error); }
        rejectPending(error);
      };

      var initOptions = {};
      Object.keys(options).forEach(function (key) {
        if (key !== "workerUrl") initOptions[key] = options[key];
      });
      worker.postMessage({ type: "init", options: initOptions });
    });
    return workerStartPromise;
  }

  function getFallbackRecords() {
    if (fallbackRecordsPromise) return fallbackRecordsPromise;
    if (!options.indexUrl || !options.globalName) {
      fallbackRecordsPromise = Promise.reject(new Error("No fallback search index configured"));
    } else {
      fallbackRecordsPromise = efLoadSearchIndexScript(options.indexUrl, options.globalName).then(function(records){
        if(options.globalName!=="EF_ORIGINAL_PRACTICE_SNIPPET_INDEX")return records;
        window.EF_ORIGINAL_PRACTICE_SNIPPET_INDEX=records;
        return efLoadSearchIndexScript(new URL("./search-snippets-polity-original-practice.js?v=20261001polity22-583a40e433b0",options.indexUrl).href,"EF_POLITY_ORIGINAL_PRACTICE_SNIPPET_INDEX").then(function(updates){
          var byRoute=Object.create(null);updates.forEach(function(row){byRoute[row.f]=row});
          return records.map(function(row){return byRoute[row.f]||row});
        });
      }).catch(function(error){fallbackRecordsPromise=null;throw error});
    }
    return fallbackRecordsPromise;
  }

  function fallbackSearch(query, token) {
    return getFallbackRecords().then(function (records) {
      if(token!==latestSearchToken)return [];
      if (options.mode === "snippet") return efFallbackSnippetSearchAsync(query, records, Object.assign({},options,{cancelled:function(){return token!==latestSearchToken}})).then(function(rows){
        if(options.globalName!=="EF_CRUX_TRICKS_SNIPPET_INDEX")return rows;
        return efCruxFallbackRouter().then(function(router){
          var seen=Object.create(null),merged=[];
          router.topics(query,options.limit).concat(rows.map(router.route)).forEach(function(hit){
            var key=hit.f+"|"+String(hit.x||"").charAt(0);if(seen[key])return;seen[key]=true;merged.push(hit);
          });return merged.slice(0,options.limit||40);
        });
      });
      return efSearchRecords(query, records, { fields: options.fields || ["title", "text"], limit: options.limit || 40 });
    });
  }

  var cachePrefix = JSON.stringify(options) + "|";
  function reportFailure(query) {
    if (typeof window !== "undefined" && typeof CustomEvent === "function") {
      window.dispatchEvent(new CustomEvent("efp-search-state", {detail:{
        phase:"source-error",query:query,source:options.indexUrl
      }}));
    }
  }
  function recover(query, token, cacheKey) {
    return fallbackSearch(query,token).then(function(rows){
      return token===latestSearchToken?efCachedSearchResults(cacheKey,rows):[];
    }).catch(function(error){if(token===latestSearchToken){reportFailure(query);throw error}return []});
  }
  function search(query) {
    query = efNormalizeSearchText(query);
    var token = ++latestSearchToken;
    var cacheKey = cachePrefix + efNormalizeSearchText(query);
    var cached = efCachedSearchResults(cacheKey);
    if (cached) return Promise.resolve().then(function(){return token === latestSearchToken ? cached : [];});
    if (!canUseWorker() || workerFailed) {
      // Worker unavailable: retain search coverage with the yielding fallback.
      return recover(query, token, cacheKey);
    }
    return startWorker().then(function () {
      if (token !== latestSearchToken) return [];
      return new Promise(function (resolve, reject) {
        var id = nextId++;
        pending[id] = { resolve: resolve, reject: reject };
        pending[id].timer = setTimeout(function(){
          if (!pending[id]) return;
          delete pending[id];
          reject(new Error("Search worker response timed out"));
        }, options.searchTimeout || 30000);
        worker.postMessage({ type: "search", id: id, query: query });
      });
    }).then(function (rows) {
      return token === latestSearchToken ? efCachedSearchResults(cacheKey, rows) : [];
    }).catch(function (error) {
      if (error && error.efCancelled) return [];
      workerFailed = true;
      if(token!==latestSearchToken)return [];
      return recover(query, token, cacheKey);
    });
  }

  function warm() {
    if (canUseWorker() && !workerFailed) {
      return startWorker().catch(function () {
        workerFailed = true;
        return false;
      });
    }
    return Promise.resolve(false);
  }

  function terminate() {
    ++latestSearchToken;
    if (cancelStartup) cancelStartup();
    if (worker) worker.terminate();
    rejectPending(cancellation());
    worker = null;
    workerStartPromise = null;
    workerFailed = false;
    fallbackRecordsPromise = null;
  }

  // Always return a client when an index is configured. This prevents UI code
  // from degrading to a misleading "Full-text search unavailable" state.
  if (!options.indexUrl || !options.globalName) return null;
  var client = { warm: warm, search: search, terminate: terminate };
  return managedSection ? efManageSectionSearchClient(client) : client;
}

if (typeof window!=="undefined" && window.dispatchEvent && typeof CustomEvent==="function") window.dispatchEvent(new CustomEvent("efp-search-logic-ready"));

// One PDF-route contract for workers and browsers without worker support.
function efCreateCruxSearchRouter(cruxDocs) {
  var normalizeQuery=efNormalizeSearchText, queryTerms=efRelevanceQuery;
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
    if (!hit) return hit;
    var doc = resolveCruxDoc(hit);
    var normalizeUrl = function (value) { return String(value || "").replace(/^(?:\.\/)?Crux-Tricks\//, "/Crux-Tricks/"); };
    var copy = { f: normalizeUrl("/Crux-Tricks/index.html"), t: hit.t, b: hit.b, x: hit.x, score: hit.score, matchType: hit.matchType };
    if (doc && doc.id) {
      copy.f = normalizeUrl("/Crux-Tricks/viewer.html?id=" + encodeURIComponent(String(doc.id)));
    }
    return copy;
  }

  function cruxTopicSearch(query,limit) {
    if (!Array.isArray(cruxDocs) || !cruxDocs.length) return [];
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
    return results.slice(0, Math.min(limit || 40, 40));
  }

  return {route:routeCruxHit,topics:cruxTopicSearch};
}

var efCruxFallbackRouterPromise=null;
function efCruxFallbackRouter(){
  if(!efCruxFallbackRouterPromise)efCruxFallbackRouterPromise=fetch("/Crux-Tricks/crux-manifest.js").then(function(response){
    if(!response.ok)throw new Error("PDF search routing could not load");return response.text();
  }).then(function(text){
    return efCreateCruxSearchRouter(JSON.parse(text.replace(/^\s*window\.EF_CRUX_DOCS\s*=\s*/," ").replace(/;\s*$/,"")));
  }).catch(function(error){efCruxFallbackRouterPromise=null;throw error});
  return efCruxFallbackRouterPromise;
}
