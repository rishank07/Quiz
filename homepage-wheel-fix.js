/* ExamFusion Prep — homepage mouse-wheel fallback */
(function () {
  "use strict";

  var path = (window.location.pathname || "/").toLowerCase();
  if (path !== "/" && path !== "/index.html") return;
  if (window.__efpHomepageWheelFixInstalled) return;
  window.__efpHomepageWheelFixInstalled = true;

  function scrollRootBy(delta) {
    var root = document.scrollingElement || document.documentElement || document.body;
    if (!root) return;
    root.scrollTop += delta;
  }

  window.addEventListener("wheel", function (event) {
    if (event.ctrlKey || event.metaKey || !event.deltaY) return;

    /* Preserve wheel scrolling inside genuine nested scroll areas such as
       expanded deep-search results. */
    var node = event.target && event.target.closest ? event.target.closest("#menuList.has-deep-results") : null;
    if (node && node.scrollHeight > node.clientHeight) return;

    event.preventDefault();
    scrollRootBy(event.deltaY);
  }, { passive: false, capture: true });
})();
