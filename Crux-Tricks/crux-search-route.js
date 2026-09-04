(function (root) {
  "use strict";

  // Crux search runs both on the site homepage and one directory deeper on
  // /Crux-Tricks/index.html. Keep result URLs rooted at the site so the latter
  // never becomes /Crux-Tricks/Crux-Tricks/viewer.html (a GitHub Pages 404).
  root.efNormalizeCruxSearchUrl = function (value) {
    var url = String(value == null ? "" : value);
    return url.replace(/^(?:\.\/)?Crux-Tricks\//, "/Crux-Tricks/");
  };

  // Dark mode is a site-wide preference controlled from the ExamFusion home
  // page. Keep the compatibility button in the Crux/Tricks DOM because the
  // existing reader logic binds to it, but do not expose a second toggle here.
  if (typeof document !== "undefined" && typeof location !== "undefined" && /\/Crux-Tricks(?:\/|$)/.test(location.pathname)) {
    var darkButton = document.getElementById("darkBtn");
    if (darkButton) {
      darkButton.hidden = true;
      darkButton.setAttribute("aria-hidden", "true");
      darkButton.setAttribute("tabindex", "-1");
      darkButton.style.display = "none";
    }

    var homeButton = document.querySelector(".topbar .home-btn");
    if (homeButton) {
      homeButton.textContent = "← Home";
      homeButton.style.padding = "7px 10px";
      homeButton.style.fontSize = "11px";
    }
  }
})(typeof self !== "undefined" ? self : this);
