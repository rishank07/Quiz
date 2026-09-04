(function (root) {
  "use strict";

  // Crux search runs both on the site homepage and one directory deeper on
  // /Crux-Tricks/index.html. Keep result URLs rooted at the site so the latter
  // never becomes /Crux-Tricks/Crux-Tricks/viewer.html (a GitHub Pages 404).
  root.efNormalizeCruxSearchUrl = function (value) {
    var url = String(value == null ? "" : value);
    return url.replace(/^(?:\.\/)?Crux-Tricks\//, "/Crux-Tricks/");
  };

  if (typeof document !== "undefined" && typeof location !== "undefined" && /\/Crux-Tricks(?:\/|$)/.test(location.pathname)) {
    // Keep the existing site-wide dark-mode compatibility behaviour unchanged.
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

    // Visual polish only: chapter cards stay functionally identical, but the
    // browser-link blue/purple/underline treatment is removed and the list is
    // more compact on phones.
    if (!document.getElementById("efp-crux-chapter-polish")) {
      var style = document.createElement("style");
      style.id = "efp-crux-chapter-polish";
      style.textContent =
        ".chapters{gap:9px!important;}" +
        ".chapter{min-height:74px!important;padding:12px 13px!important;gap:10px!important;border-radius:15px!important;box-shadow:0 7px 18px rgba(15,23,42,.06)!important;transition:border-color .16s ease,background .16s ease,transform .16s ease!important;cursor:pointer;}" +
        ".chapter:hover{border-color:color-mix(in srgb,var(--accent) 65%,var(--line))!important;background:var(--soft)!important;transform:translateY(-1px);}" +
        ".chapter .cnum{width:38px!important;height:38px!important;flex-basis:38px!important;border-radius:11px!important;}" +
        ".chapter .ctxt,.chapter .ctxt:link,.chapter .ctxt:visited,.chapter .ctxt:hover,.chapter .ctxt:active{color:inherit!important;text-decoration:none!important;}" +
        ".chapter .cen{font-size:14px!important;font-weight:850!important;line-height:1.25!important;color:var(--text)!important;text-decoration:none!important;}" +
        ".chapter .chi{font-size:11px!important;line-height:1.3!important;color:var(--muted)!important;text-decoration:none!important;margin-top:3px!important;}" +
        ".chapter .cmeta{font-size:9.5px!important;color:var(--muted)!important;text-decoration:none!important;margin-top:5px!important;}" +
        ".chapter .cfav{flex:0 0 auto!important;font-size:21px!important;line-height:1!important;padding:5px!important;}" +
        "@media(max-width:420px){.chapter{min-height:70px!important;padding:10px 11px!important}.chapter .cnum{width:36px!important;height:36px!important;flex-basis:36px!important}.chapter .cen{font-size:13px!important}.chapter .chi{font-size:10.5px!important}.chapter .cmeta{font-size:9px!important}}";
      document.head.appendChild(style);
    }

    document.addEventListener("click", function (event) {
      var row = event.target.closest && event.target.closest(".chapter");
      if (!row || event.target.closest(".cfav") || event.target.closest("a")) return;
      var link = row.querySelector("a.ctxt");
      if (link && link.href) location.href = link.href;
    });
  }
})(typeof self !== "undefined" ? self : this);
