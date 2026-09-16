(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const state = { manifest: null, exam: null, year: null, questions: [], filtered: [] };
  const els = {
    exam: $('#examSelect'), year: $('#yearSelect'), search: $('#searchInput'),
    stats: $('#stats'), list: $('#questionList'), status: $('#statusText')
  };

  const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = (v='') => String(v).toLowerCase().normalize('NFKD');

  function setStatus(msg){ els.status.textContent = msg; }

  function yearMeta(exam, value){
    return (exam?.years || []).find(y => String(typeof y === 'object' ? y.year : y) === String(value));
  }

  function fillYears(exam){
    els.year.innerHTML = '<option value="">Select year</option>';
    (exam?.years || []).forEach(y => {
      const meta = typeof y === 'object' ? y : {year:y, available:true};
      const o = document.createElement('option');
      o.value = meta.year;
      if (meta.available === false) o.textContent = `${meta.year} · Pending ingestion`;
      else o.textContent = meta.count ? `${meta.year} · ${meta.count.toLocaleString()} Q` : `${meta.year} · Available`;
      els.year.appendChild(o);
    });
    els.year.disabled = !(exam?.years || []).length;
    state.questions = state.filtered = [];
    render();
  }

  function renderStats(){
    const verified = state.filtered.filter(q => q?.source?.verified).length;
    const deleted = state.filtered.filter(q => q?.deleted === true).length;
    const subjects = new Set(state.filtered.map(q => q.subject).filter(Boolean)).size;
    const pills = [`${state.filtered.length.toLocaleString()} questions`, `${verified.toLocaleString()} verified`];
    if (deleted) pills.push(`${deleted.toLocaleString()} deleted by commission`);
    if (subjects) pills.push(`${subjects} subjects`);
    els.stats.innerHTML = pills.map(x => `<span class="pill">${esc(x)}</span>`).join('');
  }

  function optionHtml(q, i, text){
    return `<button class="opt" data-q="${esc(q.id)}" data-i="${i}"${q.deleted ? ' disabled' : ''}>${String.fromCharCode(65+i)}. ${esc(text)}</button>`;
  }

  function render(){
    renderStats();
    if (!state.filtered.length) {
      els.list.innerHTML = '<div class="empty">No loaded questions yet. Choose an available exam and year.</div>';
      return;
    }
    els.list.innerHTML = state.filtered.map((q, idx) => {
      const meta = [q.paper, q.stage, q.date, q.shift, q.subject, q.topic].filter(Boolean).join(' · ');
      const src = q.source || {};
      const srcLabel = `${src.verified ? 'Verified · ' : ''}${src.label || src.type || 'Source recorded'}`;
      const srcHtml = src.url ? `<a href="${esc(src.url)}" target="_blank" rel="noopener">${esc(srcLabel)}</a>` : esc(srcLabel);
      const displayNo = q.number || idx + 1;
      const deletedNote = q.deleted ? '<div class="source explain" style="margin-top:12px"><strong>Deleted in the official final answer key — not scored.</strong></div>' : '';
      const figureNote = q.requires_figure ? '<div class="source" style="margin-top:10px">Figure-based question: use the linked question-paper scan for the original figure.</div>' : '';
      return `<article class="question" data-id="${esc(q.id)}">
        <div class="qmeta">Q${esc(displayNo)}${meta ? ' · ' + esc(meta) : ''}${q.deleted ? ' · DELETED' : ''}</div>
        <div class="qtext">${esc(q.question)}</div>
        ${q.question_hi ? `<div class="qtext" lang="hi" style="margin-top:8px;font-weight:600">${esc(q.question_hi)}</div>` : ''}
        <div class="options">${(q.options || []).map((x,i)=>optionHtml(q,i,x)).join('')}</div>
        ${deletedNote}${figureNote}
        <div class="source">Source: ${srcHtml}${src.question_paper_url ? ` · <a href="${esc(src.question_paper_url)}" target="_blank" rel="noopener">Question paper</a>` : ''}</div>
      </article>`;
    }).join('');
  }

  function applySearch(){
    const term = norm(els.search.value.trim());
    if (!term) state.filtered = state.questions.slice();
    else state.filtered = state.questions.filter(q => norm([
      q.number, q.question, q.question_hi, ...(q.options||[]), ...(q.options_hi||[]),
      q.subject, q.topic, q.paper, q.stage
    ].filter(Boolean).join(' ')).includes(term));
    render();
  }

  async function loadYear(){
    const exam = state.manifest.exams.find(x => x.id === els.exam.value);
    const meta = yearMeta(exam, els.year.value);
    if (!exam || !meta) return;
    const year = typeof meta === 'object' ? meta.year : meta;

    if (typeof meta === 'object' && meta.available === false) {
      state.exam = exam.id; state.year = year;
      state.questions = state.filtered = [];
      render();
      setStatus(`${exam.name} ${year}: year slot is ready, but verified PYQ data has not been ingested yet.`);
      history.replaceState(null,'',`?exam=${encodeURIComponent(exam.id)}&year=${encodeURIComponent(year)}`);
      return;
    }

    const file = (typeof meta === 'object' && meta.file) || `./data/${exam.id}/${year}.json`;
    setStatus(`Loading ${exam.name} ${year}…`);
    els.list.innerHTML = '<div class="empty">Loading only the selected year chunk…</div>';
    try {
      const res = await fetch(file, {cache:'no-cache'});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      state.exam = exam.id; state.year = year;
      state.questions = Array.isArray(data.questions) ? data.questions : [];
      state.filtered = state.questions.slice();
      setStatus(`${exam.name} ${year} loaded. Other years remain unloaded to keep memory usage low.`);
      applySearch();
      history.replaceState(null,'',`?exam=${encodeURIComponent(exam.id)}&year=${encodeURIComponent(year)}`);
    } catch (err) {
      state.questions = state.filtered = [];
      render();
      setStatus(`Could not load ${exam.name} ${year}: ${err.message}`);
    }
  }

  function bindAnswers(){
    els.list.addEventListener('click', e => {
      const b = e.target.closest('.opt'); if (!b) return;
      const q = state.questions.find(x => String(x.id) === b.dataset.q); if (!q || q.deleted) return;
      const card = b.closest('.question');
      card.querySelectorAll('.opt').forEach(x => {
        x.disabled = true;
        const i = Number(x.dataset.i);
        if (i === q.answer) x.classList.add('correct');
      });
      if (Number(b.dataset.i) !== q.answer) b.classList.add('wrong');
      if ((q.explanation || q.explanation_hi) && !card.querySelector('.explain')) {
        card.insertAdjacentHTML('beforeend', `<div class="source explain" style="margin-top:14px">${q.explanation_hi ? `<div lang="hi">${esc(q.explanation_hi)}</div>`:''}${q.explanation ? `<div style="margin-top:6px">${esc(q.explanation)}</div>`:''}</div>`);
      }
    });
  }

  async function init(){
    bindAnswers();
    els.search.addEventListener('input', applySearch);
    els.exam.addEventListener('change', () => {
      const exam = state.manifest.exams.find(x => x.id === els.exam.value);
      fillYears(exam); setStatus(exam ? `${exam.name}: choose a year.` : 'Choose an exam.');
    });
    els.year.addEventListener('change', loadYear);

    try {
      const res = await fetch('./data/manifest.json', {cache:'no-cache'});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      state.manifest = await res.json();
      state.manifest.exams.forEach(exam => {
        const o = document.createElement('option'); o.value = exam.id;
        o.textContent = `${exam.name} · ${exam.hi || ''}`; els.exam.appendChild(o);
      });
      const p = new URLSearchParams(location.search), ex = p.get('exam'), yr = p.get('year');
      if (ex && state.manifest.exams.some(x=>x.id===ex)) {
        els.exam.value = ex; const exam = state.manifest.exams.find(x=>x.id===ex); fillYears(exam);
        if (yr && yearMeta(exam,yr)) { els.year.value = yr; await loadYear(); return; }
      }
      setStatus('Engine ready. Choose an exam to begin.'); render();
    } catch (err) {
      setStatus(`PYQ manifest could not load: ${err.message}`); render();
    }
  }
  init();
})();
