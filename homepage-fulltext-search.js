/* ExamFusion Prep — homepage full-text search bridge (2026-09-05)
 *
 * The homepage title index is intentionally small. This bridge searches the
 * existing large book/mind-map snippet indexes only after the user actually
 * types a query, and always inside dedicated Web Workers so the landing page
 * remains responsive on phones, PWAs and desktop browsers.
 */
(function () {
  "use strict";

  var box = document.getElementById("searchBox");
  var menuList = document.getElementById("menuList");
  var noResults = document.getElementById("noResults");
  if (!box || !menuList) return;

  var WORKER_URL = new URL("search-worker.js?v=20261007searchaudit1", document.baseURI).href;
  var LOGIC_URL = new URL("search-logic.js?v=20261007searchaudit1", document.baseURI).href;

  // Search the large indexes sequentially so a single query never makes
  // several 10–30 MB indexes parse at the same instant. Share the homepage
  // worker slot and release each index as soon as its results arrive.
  var SOURCES = [
    {
      id: "pinnacle",
      label: "Pinnacle GS",
      icon: "fa-book-open",
      indexUrl: "search-snippets-pinnacle.js?v=20260905books1",
      mode: "snippet",
      globalName: "EF_SNIPPET_INDEX",
      sectionPrefix: "./Books/Pinnacle%20GS/",
      limit: 8
    },
    {
      id: "ghatna",
      label: "Ghatnachakra Purvalokan",
      icon: "fa-book-open",
      indexUrl: "search-snippets-ghatnachakra.js?v=20260905books1",
      mode: "snippet",
      globalName: "EF_SNIPPET_INDEX",
      sectionPrefix: "./Books/Ghatnachakra%20Purvalokan/",
      limit: 8
    },
    {
      id: "lucent",
      label: "Lucent's Objective",
      icon: "fa-book",
      indexUrl: "search-snippets-lucent.js?v=20261003lucentreview10",
      mode: "snippet",
      globalName: "EF_SNIPPET_INDEX",
      sectionPrefix: "./Books/Lucent%27s%20Objective/",
      limit: 6
    },
    {
      id: "blackbook",
      label: "BlackBook",
      icon: "fa-spell-check",
      indexUrl: "search-snippets-blackbook.js?v=20261002wordcues1",
      mode: "records",
      globalName: "EF_BLACKBOOK_INDEX",
      fields: ["t", "x", "b"],
      limit: 6
    },
    {
      id: "mindmaps",
      label: "Mind Maps",
      icon: "fa-sitemap",
      indexUrl: "search-snippets-mindmaps.js?v=20261004searchaudit1",
      mode: "snippet",
      globalName: "EF_SNIPPET_INDEX",
      sectionPrefix: "./Mind%20Maps/",
      limit: 5
    },
    {
      id: "currentaffairs",
      label: "Current Affairs",
      icon: "fa-newspaper",
      indexUrl: "search-snippets-current-affairs.js?v=20261008summits1",
      mode: "snippet",
      globalName: "EF_SNIPPET_INDEX",
      sectionPrefix: "./Current%20Affairs/Topic%20Names/",
      limit: 8
    },
    {
      id: "currentaffairsrapid",
      label: "Current Affairs Rapid Practice",
      icon: "fa-bolt",
      indexUrl: "search-snippets-current-affairs-rapid.js?v=20261008summits1",
      mode: "snippet",
      globalName: "EF_SNIPPET_INDEX_RAPID",
      sectionPrefix: "./Current%20Affairs/Topic%20Names/Rapid%20Practice/",
      limit: 8
    },
    {
      id: "currentaffairsrapidextra",
      label: "Current Affairs Rapid Practice",
      icon: "fa-bolt",
      indexUrl: "search-snippets-current-affairs-rapid-extra.js?v=20261003caquiz29",
      mode: "snippet",
      globalName: "EF_RAPID_EXTRA_INDEX",
      sectionPrefix: "./Current%20Affairs/Topic%20Names/Rapid%20Practice/",
      limit: 5
    },
    {
      id: "bihar60sets",
      label: "Bihar Objective GK - 60 Sets",
      icon: "fa-layer-group",
      indexUrl: "search-snippets-bihar60sets.js?v=20260919b1",
      mode: "snippet",
      globalName: "EF_SNIPPET_INDEX",
      sectionPrefix: "./Bihar%20Special/Topic%20Names/Bihar%20Objective%20GK%20-%2060%20Sets.html",
      limit: 8
    }
  ];

  // Useful compact sources arrive first on a cold mobile connection. Global
  // relevance scores still determine display order as the books arrive.
  var sourceOrder = ["mindmaps","currentaffairs","lucent","blackbook","bihar60sets","currentaffairsrapidextra","currentaffairsrapid","pinnacle","ghatna"];
  SOURCES.sort(function(a,b){return sourceOrder.indexOf(a.id)-sourceOrder.indexOf(b.id)});

  var clients = {};
  var timer = null;
  var sequence = 0;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
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

  function normalizeSourceUrl(source, rawUrl) {
    var url = String(rawUrl == null ? "" : rawUrl).replace(/\\/g, "/");
    if (!url || !source || source.id !== "blackbook") return url;

    // BlackBook's own hub lives in /Books/BlackBook/, so its generated
    // full-text records can legitimately contain "./Files/...". From the
    // homepage that same relative URL would resolve to /Files/... and 404.
    // Normalize every BlackBook full-text hit to the repository-root route.
    if (/^(?:\.\/)?Files\//i.test(url)) {
      return "./Books/BlackBook/" + url.replace(/^\.\//, "");
    }
    if (/^Books\/BlackBook\//i.test(url)) {
      return "./" + url;
    }
    if (!/^(?:[a-z][a-z0-9+.-]*:|\/|\.\/|\.\.\/)/i.test(url) && /\.html(?:[?#]|$)/i.test(url)) {
      return "./Books/BlackBook/Files/" + url;
    }
    return url;
  }

  function homeSearchUrl(rawUrl) {
    if (typeof window.efpHomeSearchUrl === "function") {
      return window.efpHomeSearchUrl(rawUrl);
    }
    try {
      var url = new URL(rawUrl, document.baseURI);
      if (url.origin !== window.location.origin) return rawUrl;
      url.searchParams.set("from", "home-search");
      url.searchParams.set("efSearchQuery", box.value.trim().slice(0,160));
      return url.href;
    } catch (_) {
      return rawUrl;
    }
  }

  function snippetHtml(text, query) {
    text = stripMarker(text);
    if (typeof efSnippetWithHighlight === "function") {
      return efSnippetWithHighlight(text, query);
    }
    var shortText = text.length > 190 ? text.slice(0, 190) + "..." : text;
    return escapeHtml(shortText);
  }

  function cancelledError() {
    var error = new Error("Search cancelled");
    error.efCancelled = true;
    return error;
  }

  var lastInputQueryKey = null;
  function queryKey(value) {
    return typeof efNormalizeSearchText === "function" ? efNormalizeSearchText(value)
      : String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  }
  function sameQuery(value, query) { return queryKey(value) === queryKey(query); }

  function createClient(source) {
    var worker = null;
    var startPromise = null;
    var cancelStartup = null;
    var nextId = 1;
    var latestToken = 0;
    var pending = {};
    var fallbackClient = null;

    function failAll(error) {
      Object.keys(pending).forEach(function (id) {
        clearTimeout(pending[id].timer);
        pending[id].reject(error);
        delete pending[id];
      });
    }

    function start() {
      if (startPromise) return startPromise;
      startPromise = new Promise(function (resolve, reject) {
        if (typeof Worker !== "function") {
          reject(new Error("Worker unsupported"));
          return;
        }
        try {
          if (location.protocol === "file:") {
            reject(new Error("Workers disabled on local file pages"));
            return;
          }
        } catch (_) {}

        try {
          worker = new Worker(WORKER_URL);
        } catch (error) {
          reject(error);
          return;
        }

        var settled = false;
        var startupTimer = setTimeout(function () {
          if (settled) return;
          settled = true;
          cancelStartup = null;
          try { worker.terminate(); } catch (_) {}
          worker = null;
          reject(new Error("Search worker startup timed out"));
        }, 60000);

        cancelStartup = function () {
          if (settled) return;
          settled = true;
          clearTimeout(startupTimer);
          cancelStartup = null;
          reject(cancelledError());
        };

        worker.onmessage = function (event) {
          var message = event.data || {};
          if (message.type === "ready") {
            if (!settled) {
              settled = true;
              clearTimeout(startupTimer);
              cancelStartup = null;
              resolve(true);
            }
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
              settled = true;
              clearTimeout(startupTimer);
              cancelStartup = null;
              reject(error);
            }
          }
        };

        worker.onerror = function () {
          var error = new Error("Search worker failed to load");
          if (!settled) {
            settled = true;
            clearTimeout(startupTimer);
            cancelStartup = null;
            reject(error);
          }
          failAll(error);
        };

        var options = {
          indexUrl: new URL(source.indexUrl, document.baseURI).href,
          logicUrl: LOGIC_URL,
          mode: source.mode,
          globalName: source.globalName,
          limit: source.limit
        };
        if (source.sectionPrefix) options.sectionPrefix = source.sectionPrefix;
        if (source.fields) options.fields = source.fields;
        worker.postMessage({ type: "init", options: options });
      });
      return startPromise;
    }

    function search(query) {
      query = queryKey(query);
      var token = ++latestToken;
      var key = "home:" + JSON.stringify(source) + "|" + queryKey(query);
      var cached = typeof efCachedSearchResults === "function" ? efCachedSearchResults(key) : null;
      if (cached) return Promise.resolve().then(function(){return token === latestToken ? cached : [];});
      return start().then(function () {
        if (token !== latestToken || !worker) return [];
        return new Promise(function (resolve, reject) {
          var id = nextId++;
          pending[id] = { resolve: resolve, reject: reject };
          pending[id].timer = setTimeout(function(){
            if (!pending[id]) return;
            delete pending[id];
            reject(new Error("Search worker response timed out"));
          }, 30000);
          worker.postMessage({ type: "search", id: id, query: query });
        });
      }).then(function (rows) {
        if (token !== latestToken) return [];
        return typeof efCachedSearchResults === "function" ? efCachedSearchResults(key, rows || []) : (rows || []);
      }).catch(function(error){
        if(error&&error.efCancelled||token!==latestToken)return [];
        if(typeof efCreateSearchWorker!=="function")throw error;
        fallbackClient=efCreateSearchWorker({indexUrl:new URL(source.indexUrl,document.baseURI).href,globalName:source.globalName,mode:source.mode,fields:source.fields,sectionPrefix:source.sectionPrefix,limit:source.limit});
        return fallbackClient.search(query).then(function(rows){
          return token===latestToken?efCachedSearchResults(key,rows):[];
        });
      });
    }

    function terminate() {
      latestToken++;
      if(fallbackClient){fallbackClient.terminate();fallbackClient=null;}
      if (cancelStartup) cancelStartup();
      failAll(cancelledError());
      if (worker) {
        try { worker.terminate(); } catch (_) {}
      }
      worker = null;
      startPromise = null;
    }

    return { search: search, terminate: terminate };
  }

  function getClient(source) {
    if (!clients[source.id]) clients[source.id] = createClient(source);
    return clients[source.id];
  }

  function disposeWorkers() {
    Object.keys(clients).forEach(function (id) {
      if (clients[id] && typeof clients[id].terminate === "function") {
        clients[id].terminate();
      }
    });
    clients = {};
  }

  function clearOwnResults() {
    menuList.querySelectorAll("li[data-bookfullresult]").forEach(function (li) { li.remove(); });
  }

  function ensureHeader() {
    var header = menuList.querySelector("li[data-bookfullheader]");
    if (header) return header;
    header = document.createElement("li");
    header.setAttribute("data-deepresult", "");
    header.setAttribute("data-bookfullresult", "");
    header.setAttribute("data-bookfullheader", "");
    var title = document.createElement("div");
    title.className = "group-title";
    title.innerHTML = '<i class="fa-solid fa-book-open"></i> Quiz Books & Mind Maps — Content Matches <span data-bookfullcount></span>';
    header.appendChild(title);
    menuList.appendChild(header);
    return header;
  }

  function updateHeaderCount() {
    var header = menuList.querySelector("li[data-bookfullheader]");
    if (!header) return;
    var count = menuList.querySelectorAll("li[data-bookfullitem]").length;
    var holder = header.querySelector("[data-bookfullcount]");
    if (holder) holder.textContent = "(" + count + ")";
  }

  function rankBlackbookHits(query, hits) {
    hits = Array.isArray(hits) ? hits : [];
    var normalize = (typeof efNormalizeSearchText === "function")
      ? efNormalizeSearchText
      : function (value) { return String(value == null ? "" : value).toLowerCase().replace(/\s+/g, " ").trim(); };
    var q = normalize(query);
    if (!q) return hits;

    function wordStart(haystack, needle) {
      return haystack === needle ||
        haystack.indexOf(needle + " ") === 0 ||
        haystack.indexOf(" " + needle + " ") !== -1 ||
        haystack.lastIndexOf(" " + needle) === haystack.length - needle.length - 1;
    }

    function priority(hit) {
      var title = normalize(hit && hit.t);
      var breadcrumb = normalize(hit && hit.b);
      var snippet = normalize(hit && hit.x);
      if (title === q) return 0;
      if (title.indexOf(q) === 0) return 1;
      if (wordStart(title, q)) return 2;
      if (title.indexOf(q) !== -1) return 3;
      if (wordStart(breadcrumb, q)) return 4;
      if (breadcrumb.indexOf(q) !== -1) return 5;
      if (wordStart(snippet, q)) return 6;
      if (snippet.indexOf(q) !== -1) return 7;
      return 8;
    }

    return hits.map(function (hit, index) {
      return { hit: hit, index: index, priority: priority(hit) };
    }).sort(function (a, b) {
      return a.priority - b.priority || a.index - b.index;
    }).map(function (item) { return item.hit; });
  }

  function appendHits(source, query, hits, seen) {
    hits = Array.isArray(hits) ? hits : [];
    if (source && source.id === "blackbook") hits = rankBlackbookHits(query, hits);
    var added = 0;
    hits.forEach(function (hit) {
      if (added >= source.limit) return;
      var url = normalizeSourceUrl(source, hit && hit.f || "");
      var text = stripMarker(hit && hit.x || "");
      var key = source.id + "\u001f" + url;
      if (!url || !text || seen[key]) return;
      seen[key] = true;
      ensureHeader();

      var li = document.createElement("li");
      li.setAttribute("data-deepresult", "");
      li.setAttribute("data-bookfullresult", "");
      li.setAttribute("data-bookfullitem", "");
      li.setAttribute("data-search-score", String(typeof hit.score === "number" ? hit.score : 10000));

      var a = document.createElement("a");
      a.href = homeSearchUrl(url);
      a.setAttribute("onclick", "openPage(event)");

      var icon = document.createElement("i");
      icon.className = "fa-solid " + source.icon + " menu-icon";

      var span = document.createElement("span");
      span.className = "link-text ef-op-global-result";
      span.innerHTML = '<strong>' + escapeHtml(hit.t || source.label) + '</strong><br>' +
        '<small class="ef-op-search-breadcrumb">' + escapeHtml(source.label + " · " + (hit.b || "Content")) + '</small><br>' +
        '<small class="ef-op-search-snippet">' + snippetHtml(text, query) + '</small>';

      var chevron = document.createElement("i");
      chevron.className = "fa-solid fa-chevron-right chevron-icon";
      a.appendChild(icon);
      a.appendChild(span);
      a.appendChild(chevron);
      li.appendChild(a);
      // Rank all book/mindmap sources together as they stream in. Keep their
      // shared heading and exact routes; source load order adds no rank boost.
      var siblings = menuList.querySelectorAll("li[data-bookfullitem]");
      var before = Array.from(siblings).find(function (row) {
        return Number(row.getAttribute("data-search-score")) > Number(li.getAttribute("data-search-score"));
      });
      if (before) menuList.insertBefore(li, before); else menuList.appendChild(li);
      added++;
    });

    if (added) {
      menuList.classList.add("has-deep-results");
      if (noResults) noResults.classList.remove("show");
      updateHeaderCount();
    }
    return added;
  }

  function runQuery(query, mySequence) {
    if (!sameQuery(box.value, query) || mySequence !== sequence) return;
    clearOwnResults();
    var seen = {};
    var index = 0;
    try {
      window.dispatchEvent(new CustomEvent("efp-search-state", {
        detail: { phase: "fulltext-start", query: query }
      }));
    } catch (_) {}

    // Sequential loading prevents CPU/memory spikes. Results appear source by
    // source while the query remains current.
    function nextSource() {
      if (!sameQuery(box.value, query) || mySequence !== sequence) return;
      if (index >= SOURCES.length) {
        try {
          window.dispatchEvent(new CustomEvent("efp-search-state", {
            detail: { phase: "fulltext-done", query: query }
          }));
        } catch (_) {}
        return;
      }
      var source = SOURCES[index++];
      var client = getClient(source);
      if (!client) {
        nextSource();
        return;
      }
      var search = function () {
        if (!sameQuery(box.value, query) || mySequence !== sequence) return [];
        return client.search(query).then(function (hits) {
          client.terminate();
          if (clients[source.id] === client) clients[source.id] = null;
          return hits;
        }, function (error) {
          client.terminate();
          if (clients[source.id] === client) clients[source.id] = null;
          throw error;
        });
      };
      var job = typeof window.efpWithHomeSearchWorker === "function"
        ? window.efpWithHomeSearchWorker(search) : Promise.resolve().then(search);
      job.then(function (hits) {
        if (!sameQuery(box.value, query) || mySequence !== sequence) return;
        appendHits(source, query, hits, seen);
        nextSource();
      }).catch(function (error) {
        if (error && error.efCancelled) return;
        clients[source.id] = null;
        try { window.dispatchEvent(new CustomEvent("efp-search-state", {
          detail: {phase:"source-error",query:query,source:source.id}
        })); } catch (_) {}
        if (sameQuery(box.value, query) && mySequence === sequence) nextSource();
      });
    }
    nextSource();
  }

  box.addEventListener("input", function (event) {
    var key = queryKey(box.value);
    if (!(event.detail && (event.detail.efpRestoredSearch || event.detail.efpRetrySearch)) && key === lastInputQueryKey) return;
    lastInputQueryKey = key;
    clearTimeout(timer);
    disposeWorkers();
    var query = box.value.trim();
    var mySequence = ++sequence;
    if (event.detail && event.detail.efpRestoredSearch) return;
    if (query.length < 3) {
      clearOwnResults();
      return;
    }
    // Root search renders its lightweight title results at ~180 ms. Starting
    // this pass afterwards prevents the root renderer from clearing our rows.
    timer = setTimeout(function () {
      runQuery(query, mySequence);
    }, 420);
  });

  // BFCache/back navigation can retain generated result rows. They are stale
  // until the next query, so clear only this bridge's rows on restore.
  window.addEventListener("pageshow", function (event) {
    if (event.persisted && !box.value.trim()) clearOwnResults();
  });

  window.addEventListener("pagehide", function () {
    clearTimeout(timer);
    ++sequence;
    lastInputQueryKey = null;
    disposeWorkers();
  });
})();
