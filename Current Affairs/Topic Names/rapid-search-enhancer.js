/* ExamFusion Prep — Current Affairs Rapid Practice exact-content search UX.
 *
 * Hub search returns question/fact-level hits and links directly to the exact
 * #rp-section-question anchor. Inner-quiz local search remains hidden because
 * Rapid Practice now uses the hub/global content search as its discovery path.
 */
(function () {
  "use strict";

  var HUB_PATH = "/current affairs/topic names/rapid practice.html";
  var INNER_PREFIX = "/current affairs/topic names/rapid practice/";
  var LOGIC_SRC = "/search-logic.js?v=20260919ca3";
  var WORKER_SRC = "/search-worker.js?v=20260919ca3";
  var INDEX_SRC = "/search-snippets-current-affairs-rapid.js?v=20260919ca5";
  var EXTRA_INDEX_SRC = "/search-snippets-current-affairs-rapid-extra.js?v=20260919ca5";
  var INDEX_PREFIX = "./Current%20Affairs/Topic%20Names/Rapid%20Practice/";
  var LOCAL_HIDE_STYLE_ID = "efp-ca-rapid-local-search-hide";
  var RESULT_STYLE_ID = "efp-ca-rapid-result-style";
  var RESULT_ID = "efp-ca-rapid-exact-results";
  var STATUS_ID = "efp-ca-rapid-search-status";
  var debounceTimer = 0;
  var requestToken = 0;
  var searchClients = null;

  function normalizedPath() {
    var path = window.location.pathname || "/";
    try { path = decodeURIComponent(path); } catch (_) {}
    return path.replace(/\/{2,}/g, "/").replace(/\/$/, "").toLowerCase();
  }

  function isHub() {
    return normalizedPath() === HUB_PATH;
  }

  function isInnerQuiz() {
    return normalizedPath().indexOf(INNER_PREFIX) === 0;
  }

  function ensureInnerHideStyle() {
    if (!document.head || document.getElementById(LOCAL_HIDE_STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = LOCAL_HIDE_STYLE_ID;
    style.textContent = "input#search.search{display:none!important;visibility:hidden!important}";
    document.head.appendChild(style);
  }

  function hideInnerSearch() {
    if (!isInnerQuiz()) return;
    ensureInnerHideStyle();
    var input = document.getElementById("search");
    if (!input) return;
    input.value = "";
    input.hidden = true;
    input.style.display = "none";
    input.setAttribute("aria-hidden", "true");
    input.tabIndex = -1;
  }

  function loadScript(id, src, readyTest) {
    return new Promise(function (resolve, reject) {
      if (readyTest()) return resolve();
      var old = document.getElementById(id);
      if (old) {
        if (readyTest()) return resolve();
        old.addEventListener("load", resolve, { once: true });
        old.addEventListener("error", reject, { once: true });
        return;
      }
      var script = document.createElement("script");
      script.id = id;
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      (document.head || document.documentElement).appendChild(script);
    });
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function stripMarker(raw) {
    raw = String(raw == null ? "" : raw);
    if (raw.length && raw.charCodeAt(0) === 1) {
      var sep = raw.indexOf("\u0002");
      if (sep !== -1) return raw.slice(sep + 1);
    }
    return raw;
  }

  function resultHref(value) {
    var raw = String(value || "");
    if (!raw) return "#";
    if (/^(?:https?:)?\/\//i.test(raw) || raw.charAt(0) === "/") return raw;
    return "/" + raw.replace(/^\.\//, "");
  }

  function ensureResultUi() {
    if (!document.head || !isHub()) return null;

    if (!document.getElementById(RESULT_STYLE_ID)) {
      var style = document.createElement("style");
      style.id = RESULT_STYLE_ID;
      style.textContent =
        "#" + STATUS_ID + "{display:none;margin:-8px 0 12px;color:var(--muted);font-size:12px;text-align:center}" +
        "#" + RESULT_ID + "{display:none;gap:10px;flex-direction:column;margin:0 0 22px}" +
        "#" + RESULT_ID + ".show{display:flex}" +
        "#" + RESULT_ID + " .efp-rp-result{display:block;text-decoration:none;color:inherit;padding:14px 16px;" +
        "border-radius:16px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.075);" +
        "box-shadow:0 7px 22px rgba(0,0,0,.14);transition:.18s}" +
        "#" + RESULT_ID + " .efp-rp-result:hover{transform:translateY(-1px);border-color:rgba(255,189,90,.5);" +
        "background:rgba(255,255,255,.105)}" +
        "#" + RESULT_ID + " .efp-rp-source{display:inline-block;color:var(--gold);font-size:11px;font-weight:900;" +
        "letter-spacing:.03em;margin-bottom:5px}" +
        "#" + RESULT_ID + " .efp-rp-bread{color:var(--muted);font-size:11px;margin-bottom:6px}" +
        "#" + RESULT_ID + " .efp-rp-snippet{font-size:13px;line-height:1.55}" +
        "#" + RESULT_ID + " mark{background:#ffbd5a;color:#17212b;border-radius:4px;padding:0 3px}" +
        "#" + RESULT_ID + " .efp-rp-empty{padding:24px;text-align:center;color:var(--muted);" +
        "border:1px dashed rgba(255,255,255,.14);border-radius:14px}";
      document.head.appendChild(style);
    }

    var toolbar = document.querySelector(".toolbar");
    if (!toolbar) return null;

    var status = document.getElementById(STATUS_ID);
    if (!status) {
      status = document.createElement("div");
      status.id = STATUS_ID;
      toolbar.insertAdjacentElement("afterend", status);
    }

    var result = document.getElementById(RESULT_ID);
    if (!result) {
      result = document.createElement("div");
      result.id = RESULT_ID;
      status.insertAdjacentElement("afterend", result);
    }
    return result;
  }

  function setSearchMode(active) {
    var groups = document.getElementById("groups");
    var opened = document.querySelector(".opened-progress");
    var empty = document.getElementById("empty");
    var results = ensureResultUi();
    var status = document.getElementById(STATUS_ID);

    if (groups) groups.style.display = active ? "none" : "";
    if (opened) opened.style.display = active ? "none" : "";
    if (empty) empty.style.display = "none";
    if (results) {
      results.classList.toggle("show", active);
      if (!active) results.innerHTML = "";
    }
    if (status) {
      status.style.display = active ? "block" : "none";
      if (!active) status.textContent = "";
    }
  }

  function ensureClient() {
    if (searchClients) return Promise.resolve(searchClients);
    return loadScript("efp-shared-search-logic", LOGIC_SRC, function () {
      return typeof window.efCreateSearchWorker === "function";
    }).then(function () {
      searchClients = [
        window.efCreateSearchWorker({
          workerUrl: WORKER_SRC,
          logicUrl: LOGIC_SRC,
          indexUrl: INDEX_SRC,
          mode: "snippet",
          globalName: "EF_SNIPPET_INDEX",
          sectionPrefix: INDEX_PREFIX,
          limit: 36
        }),
        window.efCreateSearchWorker({
          workerUrl: WORKER_SRC,
          logicUrl: LOGIC_SRC,
          indexUrl: EXTRA_INDEX_SRC,
          mode: "snippet",
          globalName: "EF_RAPID_EXTRA_INDEX",
          sectionPrefix: INDEX_PREFIX,
          limit: 24
        })
      ].filter(Boolean);
      if (!searchClients.length) throw new Error("Rapid Practice search clients unavailable");
      return searchClients;
    });
  }

  function snippetHtml(text, query) {
    text = stripMarker(text);
    if (typeof window.efSnippetWithHighlight === "function") {
      return window.efSnippetWithHighlight(text, query);
    }
    var shortText = text.length > 210 ? text.slice(0, 210) + "..." : text;
    return escapeHtml(shortText);
  }

  function renderMatches(query, matches, token) {
    if (token !== requestToken) return;
    var input = document.getElementById("search");
    if (!input || input.value.trim() !== query) return;

    var results = ensureResultUi();
    var status = document.getElementById(STATUS_ID);
    if (!results || !status) return;

    matches = Array.isArray(matches) ? matches : [];
    if (!matches.length) {
      status.textContent = "";
      results.innerHTML = '<div class="efp-rp-empty">No exact question/fact found / कोई सटीक प्रश्न या तथ्य नहीं मिला</div>';
      return;
    }

    status.textContent = matches.length + " exact result(s) · tap to jump straight to the matched question";
    var seen = {};
    var html = [];

    for (var i = 0; i < matches.length; i++) {
      var m = matches[i] || {};
      var href = resultHref(m.f);
      var key = href + "\u001f" + String(m.x || "");
      if (!href || seen[key]) continue;
      seen[key] = true;
      html.push(
        '<a class="efp-rp-result" href="' + escapeHtml(href) + '">' +
          '<span class="efp-rp-source">' + escapeHtml(m.t || "Rapid Practice") + '</span>' +
          (m.b ? '<div class="efp-rp-bread">' + escapeHtml(m.b) + '</div>' : '') +
          '<div class="efp-rp-snippet">' + snippetHtml(m.x || "", query) + '</div>' +
        '</a>'
      );
    }
    results.innerHTML = html.join("") || '<div class="efp-rp-empty">No exact question/fact found.</div>';
  }

  function runHubSearch() {
    if (!isHub()) return;
    var input = document.getElementById("search");
    if (!input) return;

    var query = input.value.trim();
    var token = ++requestToken;
    clearTimeout(debounceTimer);

    if (query.length < 2) {
      setSearchMode(false);
      return;
    }

    setSearchMode(true);
    var status = document.getElementById(STATUS_ID);
    if (status) status.textContent = "⏳ Searching exact questions and facts...";

    debounceTimer = setTimeout(function () {
      ensureClient().then(function (clients) {
        if (token !== requestToken) return [];
        return Promise.all(clients.map(function (client) {
          return client.search(query).catch(function () { return []; });
        }));
      }).then(function (parts) {
        var matches = [];
        (parts || []).forEach(function (rows) {
          if (Array.isArray(rows)) matches = matches.concat(rows);
        });
        renderMatches(query, matches, token);
      }).catch(function () {
        if (token !== requestToken) return;
        if (status) status.textContent = "Search data could not load. Please refresh once.";
        var results = ensureResultUi();
        if (results) results.innerHTML = "";
      });
    }, 180);
  }

  function initHub() {
    if (!isHub()) return;
    var input = document.getElementById("search");
    if (!input || input.dataset.efpRapidExactSearch === "1") return;

    input.dataset.efpRapidExactSearch = "1";
    input.placeholder = "Search any question or fact / कोई भी प्रश्न या तथ्य खोजें";
    input.setAttribute("aria-label", "Search every Current Affairs Rapid Practice question and fact");
    ensureResultUi();

    input.addEventListener("input", function () {
      setTimeout(runHubSearch, 0);
    });

    input.addEventListener("focus", function () {
      ensureClient().then(function (clients) {
        (clients || []).forEach(function (client) {
          if (client && typeof client.warm === "function") client.warm().catch(function () {});
        });
      }).catch(function () {});
    });

    if (input.value.trim().length >= 2) runHubSearch();
  }

  function init() {
    if (isInnerQuiz()) {
      hideInnerSearch();
      return;
    }
    if (isHub()) initHub();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
  window.addEventListener("pageshow", init);
})();
