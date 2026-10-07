/* ExamFusion Prep — shared section completion and reading continuity. */
(function () {
  "use strict";
  if (window.EFP_QUIZ_CONTINUITY) return;

  function parse(raw, fallback) { try { return JSON.parse(raw) || fallback; } catch (_) { return fallback; } }
  function pagePath() { try { return decodeURIComponent(location.pathname); } catch (_) { return location.pathname; } }
  function opState() { try { return typeof state !== "undefined" && state.screen === "quiz" && Array.isArray(state.quizData) ? state : null; } catch (_) { return null; } }
  function rapidData() { try { return typeof SECTIONS !== "undefined" && Array.isArray(SECTIONS) && typeof saved !== "undefined" && saved.answers ? { sections: SECTIONS, answers: saved.answers } : null; } catch (_) { return null; } }
  function bookAnswers() {
    var store;
    try { store = parse(localStorage.getItem("efp_quiz_progress_v2"), {}); } catch (_) { store = {}; }
    return store[pagePath()] && store[pagePath()].answers || {};
  }
  function validAnswer(value, count) { return Number.isInteger(value) && value >= 0 && value < count; }

  function mark(button, label, attempted, total) {
    var done = total > 0 && attempted === total;
    var text = done ? "✓" : String(label);
    if (button.textContent !== text) button.textContent = text;
    button.classList.toggle("done", done);
    button.classList.toggle("efp-section-complete", done);
    button.dataset.efAttempted = String(attempted);
    button.dataset.efTotal = String(total);
    button.setAttribute("aria-label", "Section " + label + ": " + attempted + " of " + total + " attempted" + (done ? ", complete" : ""));
    if (done) button.classList.remove("border-gray-300", "text-gray-500");
    else if (!button.classList.contains("active")) {
      // Retire the legacy Original Practice tick based only on section order.
      if (button.classList.contains("section-pill")) button.classList.add("border-gray-300", "text-gray-500");
    }
  }

  function syncCompletion() {
    var op = opState();
    if (op) {
      var english = /English_Grammar_Complete_Practice\.html$/i.test(pagePath()), answers = {};
      if (english) try { answers = saved.answers[op.chapterName] || {}; } catch (_) {}
      document.querySelectorAll("#app .section-pill").forEach(function (button, si) {
        var section = op.quizData[si]; if (!section) return;
        var attempted = section.questions.reduce(function (count, q, qi) {
          var answer = english ? answers[q.id] : op.answerMap && op.answerMap[si + "-" + qi];
          var value = english ? answer : answer && answer.selectedOrigIdx;
          return count + (validAnswer(value, (q.options || q.o || []).length) ? 1 : 0);
        }, 0);
        mark(button, si + 1, attempted, section.questions.length);
      });
    }
    var rapid = rapidData();
    if (rapid) document.querySelectorAll("#sectionNav .pill").forEach(function (button, si) {
      var section = rapid.sections[si]; if (!section) return;
      var attempted = section.questions.reduce(function (count, q, qi) { return count + (validAnswer(rapid.answers[si + "-" + qi], q.o.length) ? 1 : 0); }, 0);
      mark(button, si + 1, attempted, section.questions.length);
    });
    var groups = null;
    try { if (typeof groupedData !== "undefined") groups = groupedData; } catch (_) {}
    if (groups && document.getElementById("alphabet-container")) {
      var stored = bookAnswers();
      document.querySelectorAll("#alphabet-container button[data-letter]").forEach(function (button) {
        var label = button.dataset.letter, questions = groups[label] || [];
        var attempted = questions.reduce(function (count, q) {
          var id = "opts-" + q.sn, group = document.getElementById(id);
          return count + (stored[id] && typeof stored[id].value === "string" || group && group.querySelector(".quiz-option:disabled") ? 1 : 0);
        }, 0);
        mark(button, label, attempted, questions.length);
      });
    }
  }

  var syncTimer = 0;
  function schedule() { if (!syncTimer) syncTimer = setTimeout(function () { syncTimer = 0; syncCompletion(); }, 0); }
  function ready() {
    if (!document.getElementById("efp-section-completion-style")) {
      var style = document.createElement("style"); style.id = "efp-section-completion-style";
      style.textContent = ".efp-section-complete:not(.active):not(.bg-blue-600){background:#e8f6f3!important;color:#047857!important;border-color:#a7d8c9!important}html.efp-black .efp-section-complete:not(.active):not(.bg-blue-600),body.dark .efp-section-complete:not(.active){background:#123b31!important;color:#6ee7b7!important;border-color:#28775b!important}";
      document.head.appendChild(style);
    }
    syncCompletion();
    if (window.MutationObserver) new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  }
  document.addEventListener("click", schedule);
  document.addEventListener("change", schedule);
  window.addEventListener("pageshow", schedule);
  window.addEventListener("storage", schedule);
  window.EFP_QUIZ_CONTINUITY = { syncCompletion: syncCompletion };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready, { once: true }); else ready();
})();
