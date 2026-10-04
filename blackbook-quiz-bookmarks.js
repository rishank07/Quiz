/* ExamFusion Prep — Blackbook quiz bookmarks.
 * Uses the shared efp_bookmarks object so saved Blackbook questions appear in
 * All Bookmarks and are automatically included in Backup & Restore.
 */
(function () {
  "use strict";

  var BOOKMARK_KEY = "efp_bookmarks";
  var STYLE_ID = "efp-blackbook-quiz-bookmark-style";
  var FILTER_ID = "efp-bb-quiz-filter";
  var EMPTY_ID = "efp-bb-quiz-empty";
  var observer = null;
  var focusTimer = null;
  var filterTimer = null;
  var filterActive = false;

  function installSectionNavigation() {
    var container = document.getElementById("quiz-container");
    if (!container || typeof window.showSection !== "function") return;

    var nav = document.getElementById("efp-bb-section-nav");
    if (!nav) {
      nav = document.createElement("nav");
      nav.id = "efp-bb-section-nav";
      nav.className = "efp-bb-section-nav";
      nav.setAttribute("aria-label", "Quiz section navigation");
      nav.innerHTML = '<button type="button" class="efp-bb-previous">← Previous</button>' +
        '<button type="button" class="efp-bb-next">Next →</button>';
      nav.firstElementChild.addEventListener("click", function () { move(-1); });
      nav.lastElementChild.addEventListener("click", function () { move(1); });
    }

    function availableLetters() {
      return Array.prototype.filter.call(
        document.querySelectorAll("#alphabet-container button[data-letter]"),
        function (button) { return !button.disabled; }
      ).map(function (button) { return button.dataset.letter; });
    }

    function currentIndex(letters) {
      /* Bookmark filtering can reveal several sections at once. The selected
       * A-Z button remains the source of truth for Next/Previous. */
      var selected = document.querySelector("#alphabet-container button[data-letter].bg-blue-600");
      if (selected) return letters.indexOf(selected.dataset.letter);
      var section = container.querySelector("section:not(.hidden)");
      return section ? letters.indexOf(section.id.replace(/^section-/, "")) : -1;
    }

    function update() {
      var letters = availableLetters();
      var index = currentIndex(letters);
      nav.hidden = index < 0;
      nav.firstElementChild.disabled = index <= 0;
      nav.lastElementChild.textContent = index === letters.length - 1 ? "Finish" : "Next →";
      /* New letters are rendered lazily; always keep navigation after them. */
      if (container.lastElementChild !== nav) container.appendChild(nav);
    }

    function move(direction) {
      var letters = availableLetters();
      var index = currentIndex(letters);
      if (index < 0) return;
      if (direction > 0 && index === letters.length - 1) {
        var leave = function () {
          if (window.EFP_APP_SESSION && typeof window.EFP_APP_SESSION.save === "function") window.EFP_APP_SESSION.save();
          window.location.assign("/Books/BlackBook/BlackBook.html");
        };
        var warning = window.EFP_QUIZ_PROGRESS_WARNING;
        if (warning && typeof warning.releaseBackGuard === "function") {
          warning.releaseBackGuard(leave);
        } else {
          if (warning && typeof warning.disarm === "function") warning.disarm();
          leave();
        }
        return;
      }
      if (index + direction >= 0 && index + direction < letters.length) {
        /* Use the existing A-Z click path: it clears the bookmark filter and
         * saves the chosen letter before lazy answer restoration runs. Calling
         * showSection directly lets that restoration reopen the previous letter. */
        var button = document.querySelector('#alphabet-container button[data-letter="' + letters[index + direction] + '"]');
        if (button && !button.disabled) button.click();
      }
    }

    if (!window.__efpBlackbookSectionNavInstalled) {
      window.__efpBlackbookSectionNavInstalled = true;
      var showSection = window.showSection;
      window.showSection = function () {
        var result = showSection.apply(this, arguments);
        update();
        return result;
      };
    }
    update();
  }

  function safeParse(raw, fallback) {
    try {
      var value = JSON.parse(raw);
      return value == null ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  function getBookmarks() {
    var value = safeParse(localStorage.getItem(BOOKMARK_KEY), {});
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function saveBookmarks(value) {
    try { localStorage.setItem(BOOKMARK_KEY, JSON.stringify(value)); } catch (_) {}
  }

  function keyFor(id) {
    return window.location.pathname + "#" + id;
  }

  function savedSerials() {
    var prefix = window.location.pathname + "#bbq-";
    var saved = {};
    var data = getBookmarks();
    Object.keys(data).forEach(function (key) {
      if (!data[key] || key.indexOf(prefix) !== 0) return;
      var sn = Number(key.slice(prefix.length));
      if (Number.isInteger(sn) && sn > 0) saved[sn] = true;
    });
    return saved;
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      ".efp-bb-section-nav{display:flex;justify-content:space-between;gap:12px;margin:24px 0 0;padding-bottom:16px}" +
      ".efp-bb-section-nav[hidden]{display:none}.efp-bb-section-nav button{min-height:44px;min-width:104px;" +
      "padding:10px 16px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;color:#334155;" +
      "font:700 14px/1.25 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;cursor:pointer;touch-action:manipulation}" +
      ".efp-bb-section-nav .efp-bb-next{background:#2563eb;border-color:#2563eb;color:#fff}" +
      ".efp-bb-section-nav button:disabled{opacity:.4;cursor:default}.efp-bb-section-nav button:focus-visible{outline:3px solid #f5b301;outline-offset:3px}" +
      "html.efp-black .efp-bb-section-nav .efp-bb-previous,html.dark .efp-bb-section-nav .efp-bb-previous{background:#182231;border-color:#475569;color:#f1f5f9}" +
      ".efp-bb-bookmark-btn{flex:0 0 auto;border:1px solid #f2c14e;background:#fff9e8;color:#9a6a00;" +
      "border-radius:10px;padding:6px 9px;font:800 11px/1.15 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;" +
      "cursor:pointer;white-space:nowrap;box-shadow:0 1px 2px rgba(15,23,42,.06);transition:.15s ease}" +
      ".efp-bb-bookmark-btn:hover{background:#fff3c4;border-color:#e5ad2d}" +
      ".efp-bb-bookmark-btn:active{transform:scale(.97)}" +
      ".efp-bb-bookmark-btn.is-bookmarked{background:#f5b301;border-color:#f5b301;color:#1f2937}" +
      "@media(max-width:639px){.sticky-nav{position:static!important;top:auto!important}.efp-mobile-scorebar{" +
      "position:sticky!important;top:0!important;z-index:60!important;display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;" +
      "gap:10px!important;align-items:center!important;transform:none!important;opacity:1!important;pointer-events:auto!important}" +
      ".efp-mobile-scorebar>div{min-width:0;white-space:nowrap}.efp-bb-question-head{display:grid!important;" +
      "grid-template-columns:minmax(0,1fr) auto!important;grid-template-areas:'q save' 'title title' 'meta meta';column-gap:12px!important;" +
      "row-gap:9px!important;align-items:start!important}.efp-bb-question-head>span:first-child{grid-area:q;justify-self:start;margin:0!important}" +
      ".efp-bb-question-head>h3{grid-area:title;width:100%;min-width:0!important;margin:0!important;white-space:normal!important;" +
      "word-break:normal!important;overflow-wrap:break-word!important}.efp-bb-question-head>.efp-bb-bookmark-btn{grid-area:save;" +
      "justify-self:end;margin:0!important}.efp-bb-question-head>span:not(:first-child){grid-area:meta;justify-self:start;max-width:100%;" +
      "margin:0!important;white-space:normal!important;overflow-wrap:break-word!important}.quiz-option{min-width:0!important;max-width:100%!important;" +
      "scroll-margin-top:72px!important}.quiz-option .option-text{min-width:0!important;max-width:100%!important;white-space:normal!important;" +
      "overflow-wrap:anywhere!important}[id^='bbq-']{min-width:0!important;max-width:100%!important;scroll-margin-top:72px!important}" +
      ".explanation-reveal{scroll-margin-top:72px!important}html{scroll-padding-top:72px!important}}" +
      "@media(max-width:359px){[id^='bbq-']{padding:1rem!important}.efp-bb-bookmark-btn{padding:6px 8px!important;font-size:10px!important}" +
      ".efp-mobile-scorebar{padding-left:.65rem!important;padding-right:.65rem!important;gap:6px!important}" +
      ".efp-mobile-scorebar>div{gap:.35rem!important;font-size:.88rem!important}}" +
      "#" + FILTER_ID + "{display:flex;width:100%;align-items:center;justify-content:center;gap:7px;margin-top:10px;" +
      "border:1px solid #d7b451;background:#fff9e8;color:#805b00;border-radius:999px;padding:10px 16px;" +
      "font:800 13px/1.15 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;cursor:pointer;transition:.15s ease}" +
      "#" + FILTER_ID + ":hover{background:#fff3c4;border-color:#e5ad2d}" +
      "#" + FILTER_ID + ".is-active{background:#f5b301;border-color:#f5b301;color:#1f2937;box-shadow:0 4px 12px rgba(245,179,1,.25)}" +
      ".efp-bb-quiz-filter-hidden{display:none!important}" +
      "#" + EMPTY_ID + "{display:none;margin:8px auto 24px;max-width:620px;padding:16px 18px;text-align:center;" +
      "border:1px dashed #d7b451;border-radius:14px;background:#fff9e8;color:#805b00;font:700 13px/1.4 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}" +
      "#" + EMPTY_ID + ".is-visible{display:block}" +
      ".efp-bb-deep-focus{outline:3px solid #f5b301!important;outline-offset:3px;border-radius:16px;" +
      "box-shadow:0 0 0 6px rgba(245,179,1,.16)!important}" +
      "html.efp-black .efp-bb-bookmark-btn,html.efp-black-invert .efp-bb-bookmark-btn{" +
      "background:#2a2517;color:#f7d66c;border-color:#8c7127}" +
      "html.efp-black .efp-bb-bookmark-btn.is-bookmarked,html.efp-black-invert .efp-bb-bookmark-btn.is-bookmarked{" +
      "background:#f5b301;color:#17130a;border-color:#f5b301}" +
      "html.efp-black #" + FILTER_ID + ",html.efp-black-invert #" + FILTER_ID + "," +
      "html.efp-black #" + EMPTY_ID + ",html.efp-black-invert #" + EMPTY_ID + "{" +
      "background:#2a2517;color:#f7d66c;border-color:#8c7127}" +
      "html.efp-black #" + FILTER_ID + ".is-active,html.efp-black-invert #" + FILTER_ID + ".is-active{" +
      "background:#f5b301;color:#17130a;border-color:#f5b301}";
    document.head.appendChild(style);
  }

  function syncFilterControl() {
    var button = document.getElementById(FILTER_ID);
    if (!button) return;
    var count = Object.keys(savedSerials()).length;
    button.textContent = "🔖 Bookmarked (" + count + ")";
    button.classList.toggle("is-active", filterActive);
    button.setAttribute("aria-pressed", filterActive ? "true" : "false");
  }

  function savedLetters(saved) {
    var letters = {};
    try {
      if (typeof vocabData === "undefined" || !Array.isArray(vocabData)) return letters;
      vocabData.forEach(function (item) {
        if (!item || !saved[Number(item.sn)] || !item.word) return;
        var letter = String(item.word).trim().charAt(0).toUpperCase();
        if (letter) letters[letter] = true;
      });
    } catch (_) {}
    return letters;
  }

  function applyFilter() {
    var saved = savedSerials();
    var letters = savedLetters(saved);

    if (filterActive) {
      Object.keys(letters).forEach(function (letter) {
        try { if (typeof renderQuiz === "function") renderQuiz(letter); } catch (_) {}
      });
    }

    document.querySelectorAll('#quiz-container > section').forEach(function (section) {
      if (!filterActive) return;
      var letter = String(section.id || "").replace(/^section-/, "");
      section.classList.toggle("hidden", !letters[letter]);
    });
    document.querySelectorAll('[id^="bbq-"]').forEach(function (card) {
      var sn = Number(String(card.id).replace(/^bbq-/, ""));
      card.classList.toggle("efp-bb-quiz-filter-hidden", filterActive && !saved[sn]);
    });

    var empty = document.getElementById(EMPTY_ID);
    if (empty) empty.classList.toggle("is-visible", filterActive && Object.keys(saved).length === 0);
    syncFilterControl();
  }

  function scheduleFilter() {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(function () {
      filterTimer = null;
      applyFilter();
    }, 0);
  }

  function setFilterActive(active, restoreLetter) {
    filterActive = !!active;
    applyFilter();
    if (!filterActive && restoreLetter) {
      try {
        if (typeof activeLetter !== "undefined" && activeLetter && typeof showSection === "function") {
          showSection(activeLetter);
        }
      } catch (_) {}
    }
  }

  function ensureFilterControl() {
    if (document.getElementById(FILTER_ID)) return;
    var nav = document.getElementById("alphabet-container");
    var quiz = document.getElementById("quiz-container");
    if (!nav || !nav.parentElement || !quiz) return;

    var button = document.createElement("button");
    button.type = "button";
    button.id = FILTER_ID;
    button.setAttribute("aria-label", "Show bookmarked questions from all letters");
    button.addEventListener("click", function () {
      setFilterActive(!filterActive, filterActive);
    });
    nav.parentElement.insertBefore(button, nav.nextSibling);

    var empty = document.createElement("div");
    empty.id = EMPTY_ID;
    empty.textContent = "No bookmarked questions in this quiz yet. Tap ☆ Save on any question first.";
    quiz.parentElement.insertBefore(empty, quiz);

    nav.addEventListener("click", function (event) {
      var target = event.target && event.target.closest ? event.target.closest("button[data-letter]") : null;
      if (target && filterActive) setFilterActive(false, false);
    }, true);
    syncFilterControl();
  }


  function installDesktopFilterScrollBehavior() {
    var sticky = document.querySelector(".sticky-nav");
    var button = document.getElementById(FILTER_ID);
    if (!sticky || !button || sticky.__efpDesktopBookmarkScroll) return;
    sticky.__efpDesktopBookmarkScroll = true;

    var naturalTop = 0;
    var ticking = false;

    function documentTop(el) {
      var top = 0;
      var node = el;
      while (node) {
        top += Number(node.offsetTop) || 0;
        node = node.offsetParent;
      }
      return top;
    }

    function measure() {
      naturalTop = documentTop(sticky);
      sync();
    }

    function apply() {
      ticking = false;
      var desktop = window.innerWidth >= 640;
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      var stuck = desktop && y >= Math.max(0, naturalTop - 1);

      if (stuck) button.style.setProperty("display", "none", "important");
      else button.style.removeProperty("display");
    }

    function sync() {
      if (ticking) return;
      ticking = true;
      (window.requestAnimationFrame || function (fn) { return setTimeout(fn, 16); })(apply);
    }

    measure();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    window.addEventListener("load", measure, { once: true });
  }
  function updateButton(button, active) {
    button.classList.toggle("is-bookmarked", !!active);
    button.textContent = active ? "★ Saved" : "☆ Save";
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }

  function toggle(id, button) {
    var data = getBookmarks();
    var key = keyFor(id);
    if (data[key]) delete data[key];
    else data[key] = true;
    saveBookmarks(data);
    updateButton(button, !!data[key]);
    applyFilter();
  }

  function ensureMobileScorebar() {
    var score = document.getElementById("mobile-score");
    var node = score;
    while (node && node !== document.body) {
      if (node.classList && node.classList.contains("sm:hidden")) {
        node.classList.add("efp-mobile-scorebar");
        return node;
      }
      node = node.parentElement;
    }
    return document.querySelector(".efp-mobile-scorebar");
  }

  function keepAnsweredFeedbackClear(option) {
    if (!option || window.innerWidth >= 640) return;
    var bar = ensureMobileScorebar();
    if (!bar) return;
    var card = option.closest && option.closest('[id^="bbq-"]');
    if (!card) {
      var group = option.closest && option.closest('[id^="opts-"]');
      card = group && group.parentElement;
    }
    if (!card) return;

    setTimeout(function () {
      (window.requestAnimationFrame || window.setTimeout)(function () {
        var target = card.querySelector(".option-correct") || option;
        var barRect = bar.getBoundingClientRect();
        var targetRect = target.getBoundingClientRect();
        var safeTop = barRect.bottom + 12;
        if (targetRect.top < safeTop && targetRect.bottom > barRect.top) {
          window.scrollBy({
            top: Math.floor(targetRect.top - safeTop),
            behavior: "smooth"
          });
        }
      });
    }, 0);
  }

  function enhanceOptions(options) {
    if (!options || !/^opts-\d+$/.test(options.id || "")) return;
    var sn = (options.id || "").replace(/^opts-/, "");
    var card = options.parentElement;
    if (!card) return;

    var id = "bbq-" + sn;
    card.id = id;
    if (card.querySelector(".efp-bb-bookmark-btn")) return;

    var button = document.createElement("button");
    button.type = "button";
    button.className = "efp-bb-bookmark-btn";
    button.setAttribute("aria-label", "Save this Blackbook quiz question");
    updateButton(button, !!getBookmarks()[keyFor(id)]);
    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      toggle(id, button);
    });

    var header = card.firstElementChild;
    if (header) {
      header.classList.add("efp-bb-question-head");
      header.appendChild(button);
    } else card.insertBefore(button, card.firstChild);
  }

  function scan(root) {
    injectStyle();
    ensureFilterControl();
    var scope = root && root.querySelectorAll ? root : document;
    if (scope.matches && scope.matches('[id^="opts-"]')) enhanceOptions(scope);
    scope.querySelectorAll('[id^="opts-"]').forEach(enhanceOptions);
    scheduleFilter();
    focusTarget();
  }

  function syncButtons() {
    var data = getBookmarks();
    document.querySelectorAll(".efp-bb-bookmark-btn").forEach(function (button) {
      var card = button.closest('[id^="bbq-"]');
      if (card) updateButton(button, !!data[keyFor(card.id)]);
    });
  }

  function targetSn() {
    var m = /^#bbq-(\d+)$/.exec(window.location.hash || "");
    return m ? Number(m[1]) : 0;
  }

  function openTargetLetter() {
    var sn = targetSn();
    if (!sn) return;
    try {
      if (typeof vocabData === "undefined" || !Array.isArray(vocabData)) return;
      var item = vocabData.find(function (entry) { return Number(entry && entry.sn) === sn; });
      if (!item || !item.word) return;
      var letter = String(item.word).trim().charAt(0).toUpperCase();
      if (letter && typeof showSection === "function") showSection(letter);
    } catch (_) {}
  }

  function focusTarget() {
    var sn = targetSn();
    if (!sn) return;
    clearTimeout(focusTimer);
    focusTimer = setTimeout(function () {
      var el = document.getElementById("bbq-" + sn);
      if (!el) return;
      if (window.EFP_SEARCH_CONTEXT && window.EFP_SEARCH_CONTEXT.isDismissed(el)) return;
      if (!(window.EFP_SEARCH_CONTEXT && window.EFP_SEARCH_CONTEXT.focusTarget && window.EFP_SEARCH_CONTEXT.focusTarget(el))) {
        try { el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" }); }
        catch (_) { el.scrollIntoView(); }
      }
      el.classList.add("efp-bb-deep-focus");
      clearTimeout(el.__efpBookmarkFocusTimer);
      el.__efpBookmarkFocusTimer = setTimeout(function () {
        el.classList.remove("efp-bb-deep-focus");
      }, 4200);
    }, 20);
  }

  function init() {
    ensureMobileScorebar();
    scan(document);
    installSectionNavigation();
    installDesktopFilterScrollBehavior();
    if (targetSn()) {
      openTargetLetter();
      var tries = 0;
      (function seek() {
        scan(document);
        if (document.getElementById("bbq-" + targetSn())) return;
        if (++tries < 120) setTimeout(seek, 60);
      })();
    }

    observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        Array.prototype.forEach.call(m.addedNodes || [], function (node) {
          if (node && node.nodeType === 1) scan(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  document.addEventListener("click", function (event) {
    var option = event.target && event.target.closest ? event.target.closest(".quiz-option") : null;
    if (!option || !event.isTrusted) return;
    keepAnsweredFeedbackClear(option);
  }, false);

  window.addEventListener("resize", ensureMobileScorebar, { passive: true });

  window.addEventListener("hashchange", function () {
    openTargetLetter();
    focusTarget();
  });
  window.addEventListener("pageshow", function () {
    scan(document);
    syncButtons();
    installDesktopFilterScrollBehavior();
    if (targetSn()) {
      openTargetLetter();
      focusTarget();
    }
  });
  window.addEventListener("storage", function (event) {
    if (!event.key || event.key === BOOKMARK_KEY) {
      syncButtons();
      applyFilter();
    }
  });
})();
