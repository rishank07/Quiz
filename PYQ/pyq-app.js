(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const ui = {
    search: $('paperSearch'), clearSearch: $('clearSearch'), examGrid: $('examGrid'),
    year: $('yearSelect'), stage: $('stageSelect'), language: $('languageSelect'),
    source: $('sourceSelect'), sort: $('sortSelect'), reset: $('resetFilters'),
    stats: $('stats'), status: $('statusText'), summary: $('resultSummary'),
    panel: $('paperPanel'), loadMore: $('loadMore')
  };

  const PAGE_SIZE = 24;
  const examOrder = ['ssc', 'railway', 'upsc', 'bpsc', 'uppcs', 'banking'];
  const state = { exam: '', year: '', stage: '', language: '', source: '', query: '', sort: 'newest', visible: PAGE_SIZE };
  const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
  let catalog = null;
  let papers = [];

  const esc = (value = '') => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const normal = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9\u0900-\u097f]+/g, ' ').trim();
  const unique = values => [...new Set(values.filter(Boolean))];
  const countExam = exam => (exam.years || []).reduce((sum, year) => sum + (year.papers || []).length, 0);

  function sourceTag(paper) {
    const src = `${paper?.source || ''} ${paper?.pdf || ''}`.toLowerCase();
    if (src.includes('testbook')) return 'Testbook';
    if (src.includes('adda247')) return 'Adda247';
    if (src.includes('physics wallah') || src.includes('pw.live')) return 'PW';
    if (src.includes('official') || src.includes('upsc.gov.in') || src.includes('bpsc.bihar.gov.in') || src.includes('uppsc.up.nic.in')) return 'Official';
    return 'Other';
  }

  function orderedExams() {
    return [...(catalog?.exams || [])].sort((a, b) => {
      const ai = examOrder.indexOf(a.id);
      const bi = examOrder.indexOf(b.id);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || collator.compare(a.name, b.name);
    });
  }

  function flattenCatalog() {
    const seen = new Set();
    papers = [];
    orderedExams().forEach(exam => {
      (exam.years || []).forEach(year => {
        (year.papers || []).forEach(paper => {
          const key = `${exam.id}|${paper.pdf}`;
          if (!paper.pdf || seen.has(key)) return;
          seen.add(key);
          const item = { ...paper, examId: exam.id, examName: exam.name, year: String(year.year), sourceGroup: sourceTag(paper) };
          item.searchText = normal([
            item.id, item.examName, item.examId, item.year, item.label, item.stage, item.paper,
            item.set, item.date, item.shift, item.language, item.source, item.sourceGroup
          ].filter(Boolean).join(' '));
          papers.push(item);
        });
      });
    });
  }

  function setStatus(message) {
    if (ui.status) ui.status.textContent = message;
  }

  function fillSelect(element, values, allLabel, selected, sortFn = collator.compare) {
    if (!element) return;
    const sorted = [...values].sort(sortFn);
    element.innerHTML = `<option value="">${esc(allLabel)}</option>` + sorted.map(value =>
      `<option value="${esc(value)}">${esc(value)}</option>`
    ).join('');
    element.value = sorted.includes(selected) ? selected : '';
  }

  function availableForExam() {
    return state.exam ? papers.filter(paper => paper.examId === state.exam) : papers;
  }

  function populateFilters() {
    const pool = availableForExam();
    fillSelect(ui.year, unique(pool.map(paper => paper.year)), 'All years', state.year, (a, b) => Number(b) - Number(a));
    fillSelect(ui.stage, unique(pool.map(paper => paper.stage)), 'All stages', state.stage);
    fillSelect(ui.language, unique(pool.map(paper => paper.language)), 'All languages', state.language);
    fillSelect(ui.source, unique(pool.map(paper => paper.sourceGroup)), 'All sources', state.source);
    state.year = ui.year.value;
    state.stage = ui.stage.value;
    state.language = ui.language.value;
    state.source = ui.source.value;
  }

  function renderExamCards() {
    if (!ui.examGrid) return;
    const cards = [{ id: '', name: 'All Exams', count: papers.length }, ...orderedExams().map(exam => ({
      id: exam.id, name: exam.name, count: countExam(exam)
    }))];
    ui.examGrid.innerHTML = cards.map(exam => `
      <button class="exam-card${state.exam === exam.id ? ' active' : ''}" type="button" data-exam="${esc(exam.id)}" aria-pressed="${state.exam === exam.id}">
        <span class="exam-name">${esc(exam.name)}</span>
        <span class="exam-count">${exam.count.toLocaleString('en-IN')} PDF${exam.count === 1 ? '' : 's'}</span>
        <span class="exam-arrow" aria-hidden="true">›</span>
      </button>`).join('');
  }

  function matches(paper) {
    if (state.exam && paper.examId !== state.exam) return false;
    if (state.year && paper.year !== state.year) return false;
    if (state.stage && (paper.stage || '') !== state.stage) return false;
    if (state.language && (paper.language || '') !== state.language) return false;
    if (state.source && paper.sourceGroup !== state.source) return false;
    const tokens = normal(state.query).split(' ').filter(Boolean);
    return tokens.every(token => paper.searchText.includes(token));
  }

  function sortedResults() {
    const result = papers.filter(matches);
    if (state.sort === 'oldest') {
      return result.sort((a, b) => Number(a.year) - Number(b.year) || collator.compare(a.label || '', b.label || ''));
    }
    if (state.sort === 'az') {
      return result.sort((a, b) => collator.compare(a.label || '', b.label || '') || Number(b.year) - Number(a.year));
    }
    return result.sort((a, b) => Number(b.year) - Number(a.year) || collator.compare(a.examName, b.examName) || collator.compare(a.label || '', b.label || ''));
  }

  function paperCard(paper) {
    const details = [
      paper.paper,
      paper.set ? `Set ${paper.set}` : '',
      paper.date,
      paper.shift ? `Shift ${paper.shift}` : ''
    ].filter(Boolean);
    return `<article class="paper-card" id="paper-${esc(paper.id)}">
      <div class="paper-badges">
        <span class="badge year">${esc(paper.year)}</span>
        ${paper.stage ? `<span class="badge">${esc(paper.stage)}</span>` : ''}
        ${paper.language ? `<span class="badge">${esc(paper.language)}</span>` : ''}
        <span class="badge source">${esc(paper.sourceGroup)}</span>
      </div>
      <h3 class="paper-title">${esc(paper.label || paper.paper || 'Previous Year Paper')}</h3>
      <p class="paper-exam">${esc(paper.examName)}</p>
      ${details.length ? `<div class="paper-details">${details.map(detail => `<span>${esc(detail)}</span>`).join('')}</div>` : ''}
      <p class="paper-source">Source: ${esc(paper.source || paper.sourceGroup)}</p>
      <div class="paper-actions">
        <a class="pdf-btn" data-paper-id="${esc(paper.id)}" href="${esc(paper.pdf)}" target="_blank" rel="noopener noreferrer external">Open PDF ↗</a>
        ${paper.answer_key ? `<a class="pdf-btn secondary" href="${esc(paper.answer_key)}" target="_blank" rel="noopener noreferrer external">Answer Key ↗</a>` : ''}
      </div>
    </article>`;
  }

  function activeFilterText() {
    const bits = [];
    const exam = orderedExams().find(item => item.id === state.exam);
    if (exam) bits.push(exam.name);
    if (state.year) bits.push(state.year);
    if (state.stage) bits.push(state.stage);
    if (state.language) bits.push(state.language);
    if (state.source) bits.push(state.source);
    if (state.query) bits.push(`“${state.query}”`);
    return bits.join(' · ');
  }

  function renderStats(results) {
    if (!ui.stats) return;
    const examCount = (catalog?.exams || []).length;
    const years = unique(papers.map(paper => paper.year));
    ui.stats.innerHTML = [
      `${papers.length.toLocaleString('en-IN')} PDFs`,
      `${examCount} exam sections`,
      `${Math.min(...years.map(Number))}–${Math.max(...years.map(Number))}`,
      `${results.length.toLocaleString('en-IN')} matching`
    ].map(text => `<span class="pill">${esc(text)}</span>`).join('');
  }

  function remember(extra = {}) {
    const params = new URLSearchParams();
    const next = { ...state, ...extra };
    if (next.exam) params.set('exam', next.exam);
    if (next.year) params.set('year', next.year);
    if (next.stage) params.set('stage', next.stage);
    if (next.language) params.set('language', next.language);
    if (next.source) params.set('source', next.source);
    if (next.query) params.set('q', next.query);
    if (next.sort && next.sort !== 'newest') params.set('sort', next.sort);
    if (next.paper) params.set('paper', next.paper);
    history.replaceState(null, '', params.toString() ? `?${params.toString()}` : location.pathname);
  }

  function render() {
    const results = sortedResults();
    const visible = results.slice(0, state.visible);
    if (ui.panel) {
      ui.panel.innerHTML = visible.length ? visible.map(paperCard).join('') : `
        <div class="empty">
          <strong>No matching paper found</strong>
          <p>Try fewer words, another year, or reset the filters.</p>
        </div>`;
    }
    if (ui.summary) {
      const filterText = activeFilterText();
      ui.summary.textContent = `${results.length.toLocaleString('en-IN')} paper${results.length === 1 ? '' : 's'}${filterText ? ` · ${filterText}` : ' · newest papers first'}`;
    }
    if (ui.loadMore) {
      ui.loadMore.hidden = visible.length >= results.length;
      ui.loadMore.textContent = `Show more papers (${(results.length - visible.length).toLocaleString('en-IN')} left)`;
    }
    if (ui.clearSearch) ui.clearSearch.hidden = !state.query;
    renderStats(results);
    setStatus(results.length ? 'Catalog ready. Tap Open PDF on the paper you want.' : 'No match. Change the search or filters.');
    remember();
  }

  function resetVisibleAndRender() {
    state.visible = PAGE_SIZE;
    render();
  }

  function resetAll() {
    Object.assign(state, { exam: '', year: '', stage: '', language: '', source: '', query: '', sort: 'newest', visible: PAGE_SIZE });
    ui.search.value = '';
    ui.sort.value = 'newest';
    populateFilters();
    renderExamCards();
    render();
  }

  function bindEvents() {
    ui.examGrid.addEventListener('click', event => {
      const button = event.target.closest('[data-exam]');
      if (!button) return;
      const selectedExam = button.dataset.exam || '';
      state.exam = selectedExam && state.exam === selectedExam ? '' : selectedExam;
      state.year = '';
      state.stage = '';
      state.language = '';
      state.source = '';
      populateFilters();
      renderExamCards();
      resetVisibleAndRender();
    });

    let searchTimer = null;
    ui.search.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.query = ui.search.value.trim();
        resetVisibleAndRender();
      }, 120);
    });
    ui.clearSearch.addEventListener('click', () => {
      ui.search.value = '';
      state.query = '';
      ui.search.focus();
      resetVisibleAndRender();
    });

    [['year', ui.year], ['stage', ui.stage], ['language', ui.language], ['source', ui.source]].forEach(([key, element]) => {
      element.addEventListener('change', () => {
        state[key] = element.value;
        resetVisibleAndRender();
      });
    });
    ui.sort.addEventListener('change', () => {
      state.sort = ui.sort.value;
      resetVisibleAndRender();
    });
    ui.reset.addEventListener('click', resetAll);
    ui.loadMore.addEventListener('click', () => {
      state.visible += PAGE_SIZE;
      render();
    });
    ui.panel.addEventListener('click', event => {
      const link = event.target.closest('[data-paper-id]');
      if (link) remember({ paper: link.dataset.paperId });
    });
  }

  async function loadCatalog() {
    const urls = [
      `./data/pdf-catalog.json?v=${Date.now()}`,
      `https://raw.githubusercontent.com/rishank07/Quiz/master/PYQ/data/pdf-catalog.json?v=${Date.now()}`
    ];
    let lastError = null;
    for (const url of urls) {
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!data || !Array.isArray(data.exams) || !data.exams.length) throw new Error('Empty catalog');
        return data;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('Catalog unavailable');
  }

  function restoreState() {
    const params = new URLSearchParams(location.search);
    const validExam = orderedExams().some(exam => exam.id === params.get('exam'));
    state.exam = validExam ? params.get('exam') : '';
    state.year = params.get('year') || '';
    state.stage = params.get('stage') || '';
    state.language = params.get('language') || '';
    state.source = params.get('source') || '';
    state.query = params.get('q') || '';
    state.sort = ['newest', 'oldest', 'az'].includes(params.get('sort')) ? params.get('sort') : 'newest';
    ui.search.value = state.query;
    ui.sort.value = state.sort;
  }

  async function init() {
    if (!ui.search || !ui.examGrid || !ui.panel) return;
    try {
      setStatus('Loading PYQ catalog…');
      const initialPaperId = new URLSearchParams(location.search).get('paper');
      catalog = await loadCatalog();
      flattenCatalog();
      restoreState();
      populateFilters();
      renderExamCards();
      bindEvents();
      render();

      const paperId = initialPaperId;
      if (paperId) {
        const index = sortedResults().findIndex(paper => paper.id === paperId);
        if (index >= 0) {
          state.visible = Math.max(PAGE_SIZE, Math.ceil((index + 1) / PAGE_SIZE) * PAGE_SIZE);
          render();
          requestAnimationFrame(() => document.getElementById(`paper-${CSS.escape(paperId)}`)?.scrollIntoView({ block: 'center' }));
        }
      }
    } catch (error) {
      setStatus(`Catalog load failed: ${error.message}`);
      ui.panel.innerHTML = '<div class="empty"><strong>Catalog could not be loaded</strong><p>Reload the page and try again.</p></div>';
    }
  }

  init();
})();
