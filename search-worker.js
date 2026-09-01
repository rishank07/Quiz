/* ExamFusion Prep background full-text search.
 *
 * Heavy section indexes are intentionally loaded inside this worker. Parsing
 * and Unicode-normalising them here keeps the page, keyboard and scrolling
 * responsive on Android/WebView while preserving the existing bilingual and
 * typo-tolerant search behaviour.
 */
(function () {
  "use strict";

  var config = null;
  var records = null;

  // Existing generated index files assign their arrays through window.*.
  // A classic worker has the same global semantics once window aliases self.
  self.window = self;

  function compactContentRecords(raw) {
    var output = [];
    for (var i = 0; i < raw.length; i++) {
      output.push({ file: raw[i].f, title: raw[i].t, text: raw[i].x });
    }
    return output;
  }

  function initialize(options) {
    config = options || {};
    if (!config.logicUrl || !config.indexUrl || !config.globalName) {
      throw new Error("Incomplete search-worker configuration");
    }

    importScripts(config.logicUrl);
    importScripts(config.indexUrl);

    records = self[config.globalName];
    if (!Array.isArray(records)) throw new Error("Search index was not available");

    if (config.mode === "snippet") {
      self.EF_SNIPPET_INDEX = records;
      if (typeof efWarmSnippetIndex === "function") efWarmSnippetIndex(records);
    } else {
      if (config.mapCompactContent) records = compactContentRecords(records);
      if (typeof efWarmSearchRecords === "function") {
        efWarmSearchRecords(records, config.fields || ["title", "text"]);
      }
    }
  }

  function runSearch(query) {
    if (!records) return [];
    if (config.mode === "snippet") {
      return efSnippetSearch(query, {
        sectionPrefix: config.sectionPrefix || null,
        excludeTitleMatches: !!config.excludeTitleMatches,
        limit: config.limit || 30
      });
    }
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
        self.postMessage({ type: "ready" });
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
