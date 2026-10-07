/* ExamFusion Prep analytics guard. Installed inline before GA on tracked pages.
   Work Mode live checks must enter with ?efpWorkPreview=1 before navigation.
   The marker persists in this browser; ?efpWorkPreview=0 clears it. */
(function () {
  "use strict";
  var key = "efp_work_preview_ga4";
  var marked = false;
  var owner = false;
  var query = new URLSearchParams(location.search);
  var choice = query.get("efpWorkPreview");
  try { marked = localStorage.getItem(key) === "on"; } catch (_) {}
  try { marked = marked || sessionStorage.getItem(key) === "on"; } catch (_) {}
  try { marked = marked || /(?:^|;\s*)efp_work_preview_ga4=on(?:;|$)/.test(document.cookie); } catch (_) {}
  if (choice === "1" || choice === "0") {
    marked = choice === "1";
    try { if (marked) localStorage.setItem(key, "on"); else localStorage.removeItem(key); } catch (_) {}
    try { if (marked) sessionStorage.setItem(key, "on"); else sessionStorage.removeItem(key); } catch (_) {}
    try { document.cookie = key + (marked ? "=on; Path=/; SameSite=Lax" : "=; Path=/; Max-Age=0; SameSite=Lax"); } catch (_) {}
  }
  try { owner = localStorage.getItem("efp_owner_debug_ga4") === "on"; } catch (_) {}
  var live = location.hostname === "examfusionprep.com" || location.hostname === "www.examfusionprep.com";
  var preview = !live || marked || navigator.webdriver === true;
  window.EFP_ANALYTICS_PREVIEW = preview;
  window.EFP_ANALYTICS_EXCLUDED = preview || owner;
  if (window.EFP_ANALYTICS_EXCLUDED) window["ga-disable-G-Q1WNRY8ECV"] = true;
})();
