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

  var POSITION_PREFIX = "efp_reading_position_v1:", activeKey = "", pending = null;
  var restoring = false, restoreTimer = 0, saveTimer = 0, entryTimer = 0, generation = 0;
  var retryRestore = null, restoreDeferred = false;
  var resetKey = "";
  var navigation = window.performance && performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
  var entryUrl = new URL(navigation && navigation.name || location.href);
  var initialParams = entryUrl.searchParams, initialHash = entryUrl.hash || location.hash;
  var initialExplicit = explicitTarget(initialParams, initialHash) || initialParams.has("page") || !!(initialHash && !/^#set-\d+$/.test(initialHash)), initialEntry = true;

  function explicitTarget(params, hash) {
    return ["q", "efq", "efSearchQuery", "efsearch", "search"].some(function (key) { return !!params.get(key); }) ||
      /^(?:#rp-\d+-\d+|#(?:q|question|opts|exp|bbt|bbq)-|#q\d+\b|#ca-ol-\d+|#s\d+-\d+|#bihar-(?:fact|ca)-|#op\|)/.test(hash || "");
  }
  function searchOwnsPosition() {
    if (explicitTarget(new URLSearchParams(location.search), location.hash)) return true;
    if (document.querySelector(".efp-search-context,.efp-mindmap-search-context")) return true;
    return false;
  }
  function visible(node) { return !!(node && node.getClientRects().length && !node.closest("[hidden],.efp-op-bookmark-hidden")); }
  function cardsIn(root, selector) { return Array.prototype.filter.call((root || document).querySelectorAll(selector), visible); }
  function currentView() {
    var op = opState();
    if (op) return { key: "op|" + (op.subject || "English Grammar") + "|" + op.chapterName, kind: "op", section: op.currentSection,
      cards: cardsIn(document.getElementById("questions-container"), ":scope > [id^='q-']"), open: function (section) { switchSection(section); } };
    var rapid = rapidData();
    if (rapid && rapid.sections.length && document.getElementById("sectionNav")) {
      var index = 0; try { index = current; } catch (_) {}
      return { key: "rapid", kind: "rapid", section: index, cards: cardsIn(document.getElementById("questions"), ".qcard"),
        open: function (section) { if (rapid.sections[section]) openSection(section); } };
    }
    var alphabet = document.querySelector("#alphabet-container button[data-letter].bg-blue-600");
    if (alphabet) {
      var letter = alphabet.dataset.letter, section = document.getElementById("section-" + letter);
      return { key: "blackbook", kind: "blackbook", section: letter, cards: cardsIn(section, "[id^='opts-']").map(function (group) { return group.parentElement; }),
        open: function (label) { var button = document.querySelector('#alphabet-container button[data-letter="' + String(label).replace(/[^A-Z]/g, "") + '"]'); if (button && !button.disabled) button.click(); } };
    }
    if (/\/Books\/BlackBook\/Files\//i.test(pagePath())) {
      var vocabCards = cardsIn(document, "tbody tr[data-efp-bb-sn],#mobile-cards > .vocab-card[data-efp-bb-sn]");
      if (vocabCards.length) return { key: "blackbook-vocab", kind: "vocab", section: 0, cards: vocabCards,
        scroller: vocabCards[0].closest(".table-container") };
    }
    var setButton = document.querySelector(".set-tab.active[data-set]");
    if (setButton && typeof window.showSet === "function") {
      var setNo = setButton.dataset.set;
      return { key: "bihar-sets", kind: "sets", section: setNo, cards: cardsIn(document.getElementById("set-" + setNo), ".question-box[id]"), open: function (number) { if (/^\d+$/.test(String(number))) showSet(String(number)); } };
    }
    var pdf = window.EFP_READING_PAGE;
    if (pdf && typeof pdf.snapshot === "function") {
      var snap = pdf.snapshot();
      if (snap) return { key: "pdf|" + snap.id, kind: "pdf", section: snap.page, snapshot: snap, api: pdf };
    }
    var path = pagePath().toLowerCase();
    // Single-question Mixed Practice already restores its saved question index.
    // Scope its reading offset to the actual question, independently of set review.
    var mixed = document.getElementById("quizView");
    if (path.indexOf("/original practice/mixed_practice.html") >= 0) {
      if (!visible(mixed)) return null;
      var card = mixed.querySelector(".question-card"), prompt = document.getElementById("questionEn");
      if (!card || !prompt || !prompt.textContent.trim()) return null;
      return { key: "mixed|" + prompt.textContent.trim(), kind: "mixed", section: 0, cards: [card] };
    }
    var staticCards = cardsIn(document, ".question-box[id]");
    if (staticCards.length) return { key: "static", kind: "static", section: 0, cards: staticCards, reading: /\/current affairs\/topic names\//.test(path) };
    if (path.indexOf("/mind maps/") >= 0 && path.indexOf("/chapternames/") >= 0) {
      var panel = document.querySelector(".tab-content.active[id],.tab-panel.active[id],.panel.show[id],.panel.active[id],section.tab.active[id],div.tab.active[id]:not([onclick])");
      var readerCards = cardsIn(panel || document, ".card,.branch,.node-card");
      if (readerCards.length) return { key: "mindmap", kind: "reader", section: panel ? panel.id : "", cards: readerCards, open: function (id) {
        var tabs = document.querySelectorAll("button,a,.tablink,.tab-btn,.tab[onclick]");
        var tab = Array.prototype.find.call(tabs, function (button) {
          var inline = button.getAttribute("onclick") || "";
          return inline.indexOf("'" + id + "'") >= 0 || inline.indexOf('"' + id + '"') >= 0 || ["data-target", "data-tab", "aria-controls"].some(function (attr) { return (button.getAttribute(attr) || "").replace(/^#/, "") === id; });
        });
        if (tab) tab.click();
      } };
    }
    if (/\/(?:current affairs|bihar special)\/topic names\//.test(path)) {
      var sections = document.querySelectorAll("#content .state-section[id]");
      if (sections.length) return { key: "topic-accordion", kind: "accordion", section: 0,
        // Collapsed lists still have client rects beneath their clipping wrapper.
        // Only their headings are readable until the native dropdown is opened.
        cards: cardsIn(document, "#content .state-section.open .data-list > li,#content .state-section:not(.open) > .state-title"),
        expanded: Array.prototype.filter.call(sections, function (section) { return section.classList.contains("open"); }).map(function (section) { return section.id; }),
        prepare: function (record) {
          Array.prototype.forEach.call(sections, function (section) { section.classList.toggle("open", (record.expanded || []).indexOf(section.id) >= 0); });
        }
      };
      var topicCards = cardsIn(document, ".question-card,.qcard,.oneliner-item,.oneliner-row,#content > .cd,.table-scroll").filter(function (card) {
        return !card.matches(".table-scroll") || !card.closest(".question-card,.qcard");
      });
      if (topicCards.length) return { key: "topic", kind: "reader", section: 0, cards: topicCards };
    }
    return null;
  }
  function storageKey(view) { return POSITION_PREFIX + encodeURIComponent(pagePath()) + ":" + encodeURIComponent(view.key); }
  function readPosition(view) { try { return parse(localStorage.getItem(storageKey(view)), null); } catch (_) { return null; } }
  function textFor(card) {
    if (card.hasAttribute("data-efp-bb-sn")) {
      // Desktop rows and phone cards share a serial and canonical vocabulary
      // text, regardless of their different markup and bookmark controls.
      try {
        var bank = typeof vocabData !== "undefined" ? vocabData : typeof idiomsData !== "undefined" ? idiomsData : typeof spellingData !== "undefined" ? spellingData : [];
        var entry = bank.find(function (item) { return String(item.sn) === card.getAttribute("data-efp-bb-sn"); });
        if (entry) return String(entry.word || entry.idiom || "").replace(/\s+/g, " ").trim().slice(0, 160);
      } catch (_) {}
    }
    var group = card.querySelector("[id^='opts-']");
    if (group && document.getElementById("alphabet-container") && window.EFP_BLACKBOOK_QUIZ) {
      return String(window.EFP_BLACKBOOK_QUIZ.correctFor(group.id)).replace(/\s+/g, " ").trim().slice(0, 160);
    }
    var prompt = card.querySelector(".qen,.q-en,.q-text-en,#questionEn,.question-text,.font-bold.text-xl,.font-bold.text-lg");
    if (!prompt) prompt = card.querySelector(":scope > p,.card-header,.en,.en-txt,.title-text,.oneliner-q");
    return (prompt ? prompt.textContent : card.textContent).replace(/\s+/g, " ").trim().slice(0, 160);
  }
  function cardId(card) {
    var group = card.querySelector("[id^='opts-']");
    if (card.id || group && group.id) return card.id || group.id;
    var section = card.closest(".state-section[id]");
    if (section && card.matches(".state-title")) return section.id + "|title";
    if (section && card.matches(".data-list > li")) return section.id + "|fact|" + Array.prototype.indexOf.call(card.parentElement.children, card);
    return "";
  }
  function topInset() {
    var bottom = 12;
    document.querySelectorAll("header,.toolbar,.reader-head,.quiz-head,#efp-top-nav").forEach(function (node) {
      var css = window.getComputedStyle(node), box = node.getBoundingClientRect();
      if ((css.position === "sticky" || css.position === "fixed") && box.top <= 2 && box.bottom > 0 && box.bottom < innerHeight * .55) bottom = Math.max(bottom, box.bottom + 12);
    });
    return bottom;
  }
  function scrollSurface(card) {
    // Some reading layouts give body (or a panel) its own viewport. With
    // overflow-x:hidden, overflow-y can compute to auto even without an
    // explicit vertical-scroll rule; scrolling window then has no effect.
    for (var parent = card && card.parentElement; parent && parent !== document.documentElement; parent = parent.parentElement) {
      var css = window.getComputedStyle(parent);
      if (/^(auto|scroll|overlay)$/.test(css.overflowY) && parent.clientHeight > 0 && parent.scrollHeight > parent.clientHeight + 1) return parent;
    }
    return null;
  }
  function scrollReadingCard(card, wantedTop, offset) {
    var surface = scrollSurface(card);
    if (surface) wantedTop = Math.max(wantedTop, surface.getBoundingClientRect().top + surface.clientTop + 12);
    wantedTop -= Math.max(0, Math.min(Number(offset) || 0, card.getBoundingClientRect().height - 12));
    var target = Math.max(0, (surface ? surface.scrollTop : window.scrollY) + card.getBoundingClientRect().top - wantedTop);
    (surface || window).scrollTo({ top: target, behavior: "instant" });
  }
  function checkpoint(preferred) {
    if (restoring) return;
    var view = currentView(); if (!view) return;
    // A throttled observer/scroll timer can run before a newly opened view has
    // consumed its saved position. Resolve entry first instead of saving Q1
    // over the learner's previous checkpoint.
    if (storageKey(view) !== activeKey) { checkEntry(); if (restoring) return; }
    if (storageKey(view) === resetKey) return;
    var record = { kind: view.kind, section: view.section, ts: Date.now() };
    var reading = view.kind === "reader" || view.kind === "accordion" || view.reading;
    if (reading && /\/(?:current affairs|bihar special)\/topic names\//.test(pagePath().toLowerCase())) {
      // Search and bookmark filters temporarily reshape the dropdowns; retain
      // the last unfiltered reading position instead of saving that layout.
      var input = document.getElementById("searchInput");
      if (searchOwnsPosition() || input && input.value.trim() || document.querySelector("#efpBiharBookmarkFilter.active,#efpCaBookmarkFilter .is-active")) return;
    }
    if (view.kind === "accordion") record.expanded = view.expanded;
    if (view.kind === "vocab") {
      var vocabSearch = document.getElementById("search-input"), randomModal = document.getElementById("random-modal");
      if (searchOwnsPosition() || vocabSearch && vocabSearch.value.trim() ||
          document.querySelector("#efp-bb-topic-filter.is-active") || visible(randomModal)) return;
      if (view.scroller) record.windowY = window.scrollY;
    }
    if (view.kind === "pdf") { if (!view.snapshot.ready) return; record.pdf = view.snapshot; }
    else {
      var cards = view.cards || []; if (!cards.length) return;
      var inset = readingInset(view), bottom = view.scroller ? Math.min(innerHeight, view.scroller.getBoundingClientRect().bottom) : innerHeight;
      var card = preferred && cards.indexOf(preferred) >= 0 ? preferred : null;
      if (!card) {
        var distance = Infinity;
        cards.forEach(function (candidate) { var box = candidate.getBoundingClientRect(); if (box.bottom <= inset || box.top >= bottom) return;
          if (box.top <= inset && box.bottom > inset) { card = candidate; distance = -1; return; }
          var d = Math.abs(box.top - inset); if (d < distance) { distance = d; card = candidate; } });
      }
      // Section headers can fill the phone viewport. Still remember the new
      // section's first question instead of reopening an older section.
      if (!card) card = cards.reduce(function (closest, candidate) { return Math.abs(candidate.getBoundingClientRect().top - inset) < Math.abs(closest.getBoundingClientRect().top - inset) ? candidate : closest; }, cards[0]);
      record.id = cardId(card); record.index = cards.indexOf(card); record.text = textFor(card);
      record.top = Math.max(inset, Math.min(innerHeight * .4, card.getBoundingClientRect().top));
      if (reading) record.offset = Math.max(0, inset - card.getBoundingClientRect().top);
    }
    try { localStorage.setItem(storageKey(view), JSON.stringify(record)); } catch (_) {}
  }
  function clearPosition(section) {
    var view = currentView(); if (!view) return;
    var record = readPosition(view);
    if (section != null && record && String(record.section) !== String(section)) return;
    cancelRestore();
    resetKey = storageKey(view);
    try { localStorage.removeItem(storageKey(view)); } catch (_) {}
    setTimeout(function () { var now = currentView(); if (now && storageKey(now) === resetKey) window.scrollTo({ top: 0, behavior: "instant" }); }, 0);
  }
  function cancelRestore() { generation++; clearTimeout(restoreTimer); restoring = false; pending = null; retryRestore = null; restoreDeferred = false; }
  function deferRestore() {
    clearTimeout(restoreTimer); restoreTimer = 0;
    restoreDeferred = !!(restoring && retryRestore);
  }
  function readingInset(view) {
    var inset = topInset();
    if (view.scroller) {
      var head = view.scroller.querySelector("thead");
      inset = Math.max(inset, view.scroller.getBoundingClientRect().top + (head ? head.getBoundingClientRect().height : 0) + 2);
    }
    return inset;
  }
  function legacyPosition(view) {
    // Existing attempts predate reading checkpoints. Continue at their latest
    // answered question in the saved section until a real reading position exists.
    var id = "", section = view.section, card = null, answers = {}, keys = [];
    if (view.kind === "op") {
      var op = opState(), english = /English_Grammar_Complete_Practice\.html$/i.test(pagePath());
      if (english) {
        try { answers = saved.answers[op.chapterName] || {}; } catch (_) {}
        var questions = op.quizData[section].questions;
        Object.keys(answers).forEach(function (key) { var qi = questions.findIndex(function (q) { return q.id === key; }); if (qi >= 0) id = "q-" + qi; });
      } else Object.keys(op.answerMap || {}).forEach(function (key) { var pair = key.split("-"); if (Number(pair[0]) === section) id = "q-" + pair[1]; });
    } else if (view.kind === "rapid") {
      answers = rapidData().answers;
      Object.keys(answers).forEach(function (key) { var pair = key.split("-"); if (Number(pair[0]) === section) id = "rp-" + key; });
    } else if (view.kind === "blackbook") {
      var store = {}; try { store = parse(localStorage.getItem("efp_quiz_progress_v2"), {}); } catch (_) {}
      var entry = store[pagePath()];
      if (!entry) return null;
      section = entry.section || section;
      var group = []; try { group = groupedData[section] || []; } catch (_) {}
      Object.keys(entry.answers || {}).forEach(function (key) { if (group.some(function (q) { return "opts-" + q.sn === key; })) id = "bbq-" + key.replace(/^opts-/, ""); });
      if (id && window.EFP_BLACKBOOK_QUIZ) return { kind: view.kind, section: section, id: id, text: String(window.EFP_BLACKBOOK_QUIZ.correctFor(id.replace(/^bbq-/, "opts-"))).replace(/\s+/g, " ").trim().slice(0, 160), top: topInset() };
    } else if (view.kind === "static" || view.kind === "sets") {
      answers = bookAnswers(); keys = Object.keys(answers);
      if (view.kind === "sets" && keys.length) {
        id = keys[keys.length - 1]; var match = /^s(\d+)-/.exec(id);
        if (match) return { kind: view.kind, section: match[1], id: id, text: answers[id].text, top: topInset() };
      }
      keys.forEach(function (key) { if (view.cards.some(function (node) { return cardId(node) === key; })) id = key; });
    }
    if (id) card = (view.cards || []).find(function (node) { return cardId(node) === id; });
    return card ? { kind: view.kind, section: section, id: id, text: textFor(card), top: topInset() } : null;
  }
  function resume(view, record) {
    cancelRestore(); restoring = true; pending = record;
    var run = generation, tries = 0, settled = 0, opened = false;
    retryRestore = function () {
      if (run !== generation || document.hidden) return;
      restoreDeferred = false; tries = 0;
      restoreTimer = setTimeout(attempt, 100);
    };
    function attempt() {
      if (run !== generation) return;
      if (document.hidden) { deferRestore(); return; }
      var now = currentView();
      if (!now || now.key !== view.key || searchOwnsPosition()) { cancelRestore(); return; }
      if (now.prepare && !opened) {
        opened = true; now.prepare(record); restoreTimer = setTimeout(attempt, 100); return;
      }
      if (now.kind === "pdf") {
        if (!now.snapshot.ready) { if (++tries < 50) { restoreTimer = setTimeout(attempt, 100); return; } deferRestore(); return; }
        Promise.resolve(now.api.restore(record.pdf, function () { return run === generation; })).then(function () { if (run === generation) cancelRestore(); }, function () { if (run === generation) cancelRestore(); }); return;
      }
      if (String(now.section) !== String(record.section) && now.open && !opened) {
        opened = true; now.open(record.section); restoreTimer = setTimeout(attempt, 100); return;
      }
      if (String(now.section) !== String(record.section)) { cancelRestore(); return; }
      var cards = now.cards || [], card = record.id ? cards.find(function (node) { return cardId(node) === record.id; }) : cards[record.index];
      if (!card || !visible(card)) {
        // Long vocabulary banks render in frame-sized batches. Give late
        // entries time to arrive on phones; learner input still cancels at once.
        if (++tries < (now.kind === "vocab" ? 150 : 40)) { restoreTimer = setTimeout(attempt, now.kind === "vocab" ? 200 : 80); return; }
        // Preserve the pending checkpoint after the finite retry window.
        // A later DOM/layout-ready event or wake will retry this same entry.
        // While waiting, automatic saves must not replace it with the top.
        deferRestore(); return;
      }
      // Stable IDs plus the prompt protect against changed/reordered question banks.
      if (textFor(card) !== record.text) { cancelRestore(); return; }
      if (now.scroller) window.scrollTo({ top: Number.isFinite(record.windowY) ? record.windowY : Math.max(0, window.scrollY + now.scroller.getBoundingClientRect().top - topInset()), behavior: "instant" });
      var wantedTop = Math.max(readingInset(now), Math.min(innerHeight * .4, Number(record.top) || topInset()));
      if (now.scroller) now.scroller.scrollTop += card.getBoundingClientRect().top - wantedTop;
      else scrollReadingCard(card, wantedTop, record.offset);
      // Native page-load section restoration and lazy answer replay may finish a
      // frame later. Settle once, with bounded retries, and yield on user input.
      if (++settled < 4) restoreTimer = setTimeout(attempt, 100); else cancelRestore();
    }
    if (document.hidden) deferRestore(); else retryRestore();
  }
  function checkEntry() {
    var view = currentView(), key = view && storageKey(view) || "";
    if (key === activeKey) {
      if (restoreDeferred && retryRestore && !document.hidden) retryRestore();
      return;
    }
    cancelRestore(); activeKey = key;
    if (!view) return;
    var explicit = initialEntry && initialExplicit || searchOwnsPosition();
    initialEntry = false;
    if (explicit) return;
    var record = readPosition(view) || legacyPosition(view);
    if (record && record.kind === view.kind) resume(view, record);
  }
  function saveSoon() {
    clearTimeout(saveTimer);
    var view = currentView(), key = view && storageKey(view), section = view && view.section;
    saveTimer = setTimeout(function () {
      var now = currentView();
      if (now && storageKey(now) === key && String(now.section) === String(section)) checkpoint();
    }, 180);
  }
  function installContinuity() {
    checkEntry();
    // Pointer/wheel/keyboard activity must cancel pending automatic scrolling.
    ["pointerdown", "touchstart", "wheel", "keydown"].forEach(function (name) { window.addEventListener(name, function (event) { if (event.isTrusted) { checkEntry(); resetKey = ""; cancelRestore(); } }, { passive: true }); });
    document.addEventListener("click", function (event) {
      if (!event.isTrusted) return;
      var view = currentView(), target = event.target;
      var card = view && view.cards && view.cards.find(function (node) { return node.contains(target); });
      var selectedId = card && cardId(card), selectedIndex = card && view.cards.indexOf(card);
      checkpoint(card);
      // Capture the old view before a Chapters/Home/Back handler removes it.
      // Answer clicks can re-render the card; capture again after that handler.
      setTimeout(function () {
        checkEntry(); var now = currentView(), selected = null;
        if (card && now && view.key === now.key && String(view.section) === String(now.section)) {
          selected = selectedId ? now.cards.find(function (node) { return cardId(node) === selectedId; }) : now.cards[selectedIndex];
        }
        checkpoint(selected);
      }, 0);
    }, true);
    document.addEventListener("change", saveSoon);
    document.addEventListener("scroll", saveSoon, { passive: true, capture: true });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") { checkpoint(); deferRestore(); }
      else schedule();
    });
    document.addEventListener("freeze", function () { checkpoint(); deferRestore(); });
    document.addEventListener("resume", schedule);
    window.addEventListener("pagehide", function () { checkpoint(); cancelRestore(); });
    window.addEventListener("beforeunload", function () { checkpoint(); });
    window.addEventListener("popstate", schedule);
    window.addEventListener("efp-pdf-layout-ready", schedule);
    window.addEventListener("pageshow", function (event) { if (event.persisted) { activeKey = ""; schedule(); } });
    // A late-loaded runtime (PDF or generated sections) can become ready without
    // changing its view key. Keep the startup check finite.
    var startupChecks = 0;
    function startup() { checkEntry(); if (++startupChecks < 20) entryTimer = setTimeout(startup, 250); }
    startup();
  }

  var syncTimer = 0;
  function schedule() { if (!syncTimer) syncTimer = setTimeout(function () { syncTimer = 0; syncCompletion(); checkEntry(); }, 0); }
  function ready() {
    if (!document.getElementById("efp-section-completion-style")) {
      var style = document.createElement("style"); style.id = "efp-section-completion-style";
      style.textContent = ".efp-section-complete:not(.active):not(.bg-blue-600){background:#e8f6f3!important;color:#047857!important;border-color:#a7d8c9!important}html.efp-black .efp-section-complete:not(.active):not(.bg-blue-600),body.dark .efp-section-complete:not(.active){background:#123b31!important;color:#6ee7b7!important;border-color:#28775b!important}";
      document.head.appendChild(style);
    }
    syncCompletion();
    installContinuity();
    if (window.MutationObserver) new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  }
  document.addEventListener("click", schedule);
  document.addEventListener("change", schedule);
  window.addEventListener("pageshow", schedule);
  window.addEventListener("storage", schedule);
  window.EFP_QUIZ_CONTINUITY = { syncCompletion: syncCompletion, save: checkpoint, clear: clearPosition };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready, { once: true }); else ready();
})();

