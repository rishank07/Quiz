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

  var WORKER_URL = new URL("search-worker.js?v=20260924casespace1", document.baseURI).href;
  var LOGIC_URL = new URL("search-logic.js?v=20260924smartsearch1", document.baseURI).href;

  // Search the large indexes sequentially so a single query never makes
  // several 10–30 MB indexes parse at the same instant. Workers are cancelled
  // when the query changes and released after a short idle period so mobile
  // WebViews do not retain every full-text index in memory indefinitely.
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
      indexUrl: "search-snippets-lucent.js?v=20260905books1",
      mode: "snippet",
      globalName: "EF_SNIPPET_INDEX",
      sectionPrefix: "./Books/Lucent%27s%20Objective/",
      limit: 6
    },
    {
      id: "blackbook",
      label: "BlackBook",
      icon: "fa-spell-check",
      indexUrl: "search-snippets-blackbook.js?v=20260905books1",
      mode: "records",
      globalName: "EF_BLACKBOOK_INDEX",
      fields: ["t", "x", "b"],
      limit: 6
    },
    {
      id: "mindmaps",
      label: "Mind Maps",
      icon: "fa-sitemap",
      indexUrl: "search-snippets-mindmaps.js?v=20260905books1",
      mode: "snippet",
      globalName: "EF_SNIPPET_INDEX",
      sectionPrefix: "./Mind%20Maps/",
      limit: 5
    },
    {
      id: "currentaffairs",
      label: "Current Affairs",
      icon: "fa-newspaper",
      indexUrl: "search-snippets-current-affairs.js?v=20260918ca1",
      mode: "snippet",
      globalName: "EF_SNIPPET_INDEX",
      sectionPrefix: "./Current%20Affairs/Topic%20Names/",
      limit: 8
    },
    {
      id: "currentaffairsrapid",
      label: "Current Affairs Rapid Practice",
      icon: "fa-bolt",
      indexUrl: "search-snippets-current-affairs-rapid.js?v=20260919ca5",
      mode: "snippet",
      globalName: "EF_SNIPPET_INDEX",
      sectionPrefix: "./Current%20Affairs/Topic%20Names/Rapid%20Practice/",
      limit: 8
    },
    {
      id: "currentaffairsrapidextra",
      label: "Current Affairs Rapid Practice",
      icon: "fa-bolt",
      indexUrl: "search-snippets-current-affairs-rapid-extra.js?v=20260919ca5",
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

  var clients = {};
  var disabled = {};
  var timer = null;
  var cleanupTimer = null;
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

  function createClient(source) {
    var worker = null;
    var startPromise = null;
    var nextId = 1;
    var latestToken = 0;
    var pending = {};

    function failAll(error) {
      Object.keys(pending).forEach(function (id) {
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
          try { worker.terminate(); } catch (_) {}
          worker = null;
          reject(new Error("Search worker startup timed out"));
        }, 15000);

        worker.onmessage = function (event) {
          var message = event.data || {};
          if (message.type === "ready") {
            if (!settled) {
              settled = true;
              clearTimeout(startupTimer);
              resolve(true);
            }
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
            } else if (!settled) {
              settled = true;
              clearTimeout(startupTimer);
              reject(error);
            }
          }
        };

        worker.onerror = function () {
          var error = new Error("Search worker failed to load");
          if (!settled) {
            settled = true;
            clearTimeout(startupTimer);
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
      var token = ++latestToken;
      return start().then(function () {
        if (token !== latestToken || !worker) return [];
        return new Promise(function (resolve, reject) {
          var id = nextId++;
          pending[id] = { resolve: resolve, reject: reject };
          worker.postMessage({ type: "search", id: id, query: query });
        });
      }).then(function (rows) {
        return token === latestToken ? (rows || []) : [];
      });
    }

    function terminate() {
      latestToken++;
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
    if (disabled[source.id]) return null;
    if (!clients[source.id]) clients[source.id] = createClient(source);
    return clients[source.id];
  }

  function disposeWorkers() {
    clearTimeout(cleanupTimer);
    cleanupTimer = null;
    Object.keys(clients).forEach(function (id) {
      if (clients[id] && typeof clients[id].terminate === "function") {
        clients[id].terminate();
      }
    });
    clients = {};
  }

  function scheduleWorkerCleanup(mySequence) {
    clearTimeout(cleanupTimer);
    cleanupTimer = setTimeout(function () {
      if (mySequence === sequence) disposeWorkers();
    }, 12000);
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

  function appendHits(source, query, hits, seen) {
    hits = Array.isArray(hits) ? hits : [];
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
      menuList.appendChild(li);
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
    if (box.value.trim() !== query || mySequence !== sequence) return;
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
      if (box.value.trim() !== query || mySequence !== sequence) return;
      if (index >= SOURCES.length) {
        scheduleWorkerCleanup(mySequence);
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
      client.search(query).then(function (hits) {
        if (box.value.trim() !== query || mySequence !== sequence) return;
        appendHits(source, query, hits, seen);
        nextSource();
      }).catch(function (error) {
        if (error && error.efCancelled) return;
        disabled[source.id] = true;
        clients[source.id] = null;
        if (box.value.trim() === query && mySequence === sequence) nextSource();
      });
    }
    nextSource();
  }

  box.addEventListener("input", function () {
    clearTimeout(timer);
    disposeWorkers();
    var query = box.value.trim();
    var mySequence = ++sequence;
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

  window.addEventListener("pagehide", disposeWorkers);
})();
