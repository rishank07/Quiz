/* Small result batches for section searches; Home owns its own presentation. */
(function () {
  "use strict";
  if (/^\/(?:index\.html)?$/i.test(location.pathname)) return;
  var PAGE_SIZE = 12;
  var targets = [
    [".efp-op-search-results", ".efp-op-search-result"],
    ["#results", "a[href]"],
    ["#searchResults", "a[href]"],
    ["#efContentResults", "li"],
    ["#efBlackbookResults", "li"],
    ["#fullTextResults", "a.hit"],
    ["#efp-ca-rapid-exact-results", "a[href]"],
    ["#content", ".leaf-section .card"]
  ];
  var selector = targets.map(function (target) { return target[0]; }).join(",");
  var states = new WeakMap(), scheduled = false;
  var style = document.createElement("style");
  style.textContent = '.efp-section-result-hidden{display:none!important}.efp-section-search-more{display:block;width:100%;margin:12px 0;padding:12px 16px;border:1px solid #c8a65b;border-radius:12px;background:transparent;color:inherit;font:600 14px/1.4 system-ui,sans-serif;cursor:pointer}.efp-section-search-more[hidden]{display:none!important}.efp-section-search-more:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}';
  document.head.appendChild(style);

  function queryFor(container) {
    var panel = container.closest(".efp-op-search");
    var input = panel ? panel.querySelector("input") :
      document.querySelector('input[type="search"], input[id*="earch"]');
    return input ? input.value.trim() : "";
  }
  function reconcile(container, itemSelector) {
    var query = queryFor(container), state = states.get(container);
    if (!state) {
      state = { query: query, limit: PAGE_SIZE, button: null };
      states.set(container, state);
    }
    if (state.query !== query) { state.query = query; state.limit = PAGE_SIZE; }
    var rows = Array.prototype.slice.call(container.querySelectorAll(itemSelector));
    rows.forEach(function (row, index) {
      row.classList.toggle("efp-section-result-hidden", !!query && index >= state.limit);
    });
    var hasMore = query && rows.length > state.limit;
    if (hasMore && !state.button) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "efp-section-search-more";
      button.addEventListener("click", function () {
        state.limit += PAGE_SIZE;
        reconcile(container, itemSelector);
        if (observer) observer.takeRecords();
      });
      state.button = button;
    }
    if (state.button) {
      // The source renderer can replace the result list while a query streams
      // in. Keep the control beside that list and retain already revealed rows.
      if (state.button.previousElementSibling !== container) container.insertAdjacentElement("afterend", state.button);
      state.button.hidden = !hasMore;
      state.button.textContent = "Show more results / और परिणाम (" + Math.min(state.limit, rows.length) + " / " + rows.length + ")";
    }
  }
  function sync() {
    scheduled = false;
    targets.forEach(function (target) {
      document.querySelectorAll(target[0]).forEach(function (container) { reconcile(container, target[1]); });
    });
    if (observer) observer.takeRecords();
    // Remove controls whose SPA search panel was replaced by a quiz screen.
    document.querySelectorAll(".efp-section-search-more").forEach(function (button) {
      if (!button.previousElementSibling || !button.previousElementSibling.matches(selector)) button.remove();
    });
    if (observer) observer.takeRecords();
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    (window.requestAnimationFrame || function (callback) { return setTimeout(callback, 0); })(sync);
  }
  var observer = typeof MutationObserver === "function" ? new MutationObserver(function (records) {
    if (records.some(function (record) {
      if (record.target.closest && record.target.closest(selector)) return true;
      return Array.prototype.some.call(record.addedNodes, function (node) {
        return node.nodeType === 1 && (node.matches(selector) || node.querySelector(selector));
      });
    })) schedule();
  }) : null;
  function start() {
    if (observer && document.body) observer.observe(document.body, { childList: true, subtree: true });
    sync();
  }
  document.addEventListener("input", function (event) {
    if (event.target.matches && event.target.matches('input[type="search"], input[id*="earch"]')) schedule();
  }, true);
  window.addEventListener("pageshow", schedule);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
