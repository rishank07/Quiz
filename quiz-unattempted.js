/* ExamFusion Prep — Not Attempted in each quiz's existing score row.
   Native counters remain the source of truth; this feature never saves answers. */
(function () {
  "use strict";
  if (window.EFP_QUIZ_UNATTEMPTED) return;
  var path;
  try { path = decodeURIComponent(location.pathname); } catch (_) { path = location.pathname; }
  var original = /^\/Original Practice\/[^/]+_Complete_Practice\.html$/i.test(path);
  var books = /^\/Books\//i.test(path);
  var rapid = /^\/Current Affairs\/Topic Names\/Rapid Practice\/.*\.html$/i.test(path);
  var sets = /\/Bihar Special\/Topic Names\/Bihar Objective GK - 60 Sets\.html$/i.test(path);
  // Mixed Practice already owns both its live and final unanswered counters.
  if (!original && !books && !rapid && !sets) return;

  function number(text) {
    var value = Number(String(text).replace(/,/g, "").trim());
    return Number.isInteger(value) && value >= 0 ? value : null;
  }
  function fraction(text) {
    var match = String(text).match(/(\d[\d,]*)\s*\/\s*(\d[\d,]*)/);
    if (!match) return null;
    var attempted = number(match[1]), total = number(match[2]);
    return attempted === null || total === null ? null : { total: total, attempted: attempted };
  }
  function remaining(stats) { return Math.max(0, stats.total - stats.attempted); }
  function addCount(host, stats, classes) {
    if (!host || !stats) return;
    var count = host.querySelector(":scope > .efp-unattempted");
    var labels = Array.prototype.map.call(host.childNodes, function (node) { return node.textContent; }).join(" ");
    if (!count && /\b(?:not\s+attempted|unattempted)\b/i.test(labels)) return;
    if (!count) {
      count = document.createElement("span");
      count.className = "efp-unattempted " + (classes || "");
      count.appendChild(document.createTextNode("Not Attempted: "));
      var value = document.createElement("strong");
      value.className = "efp-unattempted-value";
      count.appendChild(value);
      host.insertBefore(count, host.querySelector(":scope > .efp-quiz-reset-btn"));
    }
    var text = String(remaining(stats)), valueNode = count.querySelector(".efp-unattempted-value");
    if (valueNode.textContent !== text) valueNode.textContent = text;
    host.classList.add("efp-counter-bar");
  }
  function originalStats() {
    var spans = document.querySelectorAll("#app .px-2.py-1.rounded.bg-gray-100");
    for (var i = 0; i < spans.length; i++) {
      var stats = /^Total\s*:/i.test(spans[i].textContent) && fraction(spans[i].textContent);
      if (stats) return { host: spans[i].parentElement, stats: stats };
    }
    return null;
  }
  function sync() {
    if (books || sets) {
      document.querySelectorAll(".score-bar,.set-score-bar").forEach(function (bar) {
        var total = bar.querySelector(".total-count");
        addCount(bar, total && fraction(total.textContent), "score-item");
      });
    }
    if (original) {
      var row = originalStats();
      if (row) {
        row.host.classList.add("efp-op-counts");
        addCount(row.host, row.stats, "px-2 py-1 rounded bg-gray-100");
      }
    }
    if (rapid) {
      var score = document.getElementById("scoreTxt");
      var totalChip = score && score.querySelector(".ef-native-score-total");
      if (totalChip) addCount(score, fraction(totalChip.textContent), "ef-native-score-chip");
    }
    if (books && document.getElementById("alphabet-container")) {
      // Blackbook scores are cumulative across A-Z, including restored answers.
      var total = null;
      try { if (typeof vocabData !== "undefined" && Array.isArray(vocabData)) total = vocabData.length; } catch (_) {}
      var correct = document.getElementById("total-score"), wrong = document.getElementById("total-wrong");
      if (total !== null && correct && wrong) {
        var c = number(correct.textContent), w = number(wrong.textContent);
        if (c !== null && w !== null) {
          var stats = { total: total, attempted: c + w };
          var top = correct.parentElement && correct.parentElement.parentElement;
          if (top) { top.classList.add("efp-blackbook-counts"); addCount(top, stats); }
          document.querySelectorAll(".efp-mobile-scorebar,.desktop-sticky-score").forEach(function (bar) {
            addCount(bar, stats);
          });
        }
      }
    }
  }

  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    setTimeout(function () { queued = false; sync(); }, 0);
  }
  function start() {
    // Vocabulary/reading pages in Books have no quiz counter and need no observer.
    if (books && !document.querySelector(".score-bar,#alphabet-container")) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/quiz-unattempted.css?v=20261009type3";
    document.head.appendChild(link);
    sync();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });
    document.addEventListener("visibilitychange", schedule);
    window.addEventListener("pageshow", schedule);
    if (original) {
      var nativeAlert = window.alert;
      window.alert = function (message) {
        var row = originalStats();
        if (row && /^Chapter (?:summary|complete)/i.test(String(message)) && !/not attempted/i.test(String(message))) {
          message = String(message) + "\nNot Attempted: " + remaining(row.stats);
        }
        return nativeAlert.call(window, message);
      };
    }
  }
  window.EFP_QUIZ_UNATTEMPTED = { sync: sync };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
