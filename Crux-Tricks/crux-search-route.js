(function (root) {
  "use strict";

  // Crux search runs both on the site homepage and one directory deeper on
  // /Crux-Tricks/index.html. Keep result URLs rooted at the site so the latter
  // never becomes /Crux-Tricks/Crux-Tricks/viewer.html (a GitHub Pages 404).
  root.efNormalizeCruxSearchUrl = function (value) {
    var url = String(value == null ? "" : value);
    return url.replace(/^(?:\.\/)?Crux-Tricks\//, "/Crux-Tricks/");
  };
})(typeof self !== "undefined" ? self : this);
