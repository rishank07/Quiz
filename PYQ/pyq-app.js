(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const state = { catalog: null, exam: null, year: null };
  const els = {
    exam: $('#examSelect'),
    year: $('#yearSelect'),
    paper: $('#paperSelect'),
    stats: $('#stats'),
    panel: $('#paperPanel'),
    status: $('#statusText')
  };

  const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const setStatus = (msg) => { els.status.textContent = msg; };

  function findExam(id){
    return (state.catalog?.exams || []).find(x => x.id === id);
  }

  function findYear(exam, value){
    return (exam?.years || []).find(y => String(y.year) === String(value));
  }

  function totalPapers(){
    return (state.catalog?.exams || []).reduce((sum, exam) =>
      sum + (exam.years || []).reduce((s, y) => s + (y.papers || []).length, 0), 0);
  }

  function renderStats(exam=null, year=null){
    const pills = [`${totalPapers()} PDFs catalogued`];
    if (exam) {
      const examCount = (exam.years || []).reduce((s,y)=>s+(y.papers||[]).length,0);
      pills.push(`${exam.name}: ${examCount} PDFs`);
    }
    if (year) pills.push(`${year.year}: ${(year.papers || []).length} paper${(year.papers || []).length === 1 ? '' : 's'}`);
    els.stats.innerHTML = pills.map(x => `<span class="pill">${esc(x)}</span>`).join('');
  }

  function resetPaper(){
    els.paper.innerHTML = '<option value="">Select set / paper</option>';
    els.paper.disabled = true;
    els.panel.innerHTML = '';
  }

  function fillYears(exam){
    els.year.innerHTML = '<option value="">Select year</option>';
    resetPaper();
    (exam?.years || []).forEach(meta => {
      const count = (meta.papers || []).length;
      const o = document.createElement('option');
      o.value = meta.year;
      o.textContent = count ? `${meta.year} · ${count} PDF${count > 1 ? 's' : ''}` : `${meta.year} · Pending`;
      els.year.appendChild(o);
    });
    els.year.disabled = !(exam?.years || []).length;
    renderStats(exam, null);
  }

  function paperCard(paper){
    const meta = [paper.stage, paper.paper, paper.set ? `Set ${paper.set}` : null, paper.date].filter(Boolean).join(' · ');
    els.panel.innerHTML = `<div class="empty">
      <div class="qmeta">${esc(meta)}</div>
      <div class="qtext">${esc(paper.label || 'PYQ Paper')}</div>
      <div class="source" style="margin-top:10px">${esc(paper.source || 'Source recorded')}</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:14px">
        <a class="pdf-btn" href="${esc(paper.pdf)}">Open PDF</a>
        ${paper.answer_key ? `<a class="pdf-btn secondary" href="${esc(paper.answer_key)}" target="_blank" rel="noopener">Answer Key</a>` : ''}
      </div>
    </div>`;
  }

  function rememberSelection(examId, year, paperId=''){
    const p = new URLSearchParams();
    if (examId) p.set('exam', examId);
    if (year) p.set('year', year);
    if (paperId) p.set('paper', paperId);
    history.replaceState(null, '', p.toString() ? `?${p.toString()}` : location.pathname);
  }

  function openPaper(paper){
    if (!paper?.pdf) return;
    const examId = els.exam.value;
    const year = els.year.value;
    rememberSelection(examId, year, paper.id || '');
    paperCard(paper);
    setStatus(`Opening ${paper.label || 'PYQ PDF'}…`);
    window.location.assign(paper.pdf);
  }

  function fillPapers(yearMeta, autoOpen=false){
    resetPaper();
    const papers = yearMeta?.papers || [];
    renderStats(findExam(els.exam.value), yearMeta || null);

    if (!papers.length) {
      setStatus(`${els.exam.options[els.exam.selectedIndex]?.textContent?.split(' · ')[0] || 'This exam'} ${yearMeta?.year || ''}: PDF अभी catalog में add नहीं हुआ है.`);
      rememberSelection(els.exam.value, yearMeta?.year || '');
      return;
    }

    papers.forEach(paper => {
      const o = document.createElement('option');
      o.value = paper.id;
      o.textContent = paper.label || `${paper.paper || 'Paper'}${paper.set ? ` · Set ${paper.set}` : ''}`;
      els.paper.appendChild(o);
    });
    els.paper.disabled = false;

    if (papers.length === 1) {
      els.paper.value = papers[0].id;
      paperCard(papers[0]);
      setStatus(`${yearMeta.year}: ${papers[0].label}.`);
      if (autoOpen) openPaper(papers[0]);
    } else {
      setStatus(`${yearMeta.year}: ${papers.length} papers available — set/paper चुनो, PDF direct खुलेगा.`);
      rememberSelection(els.exam.value, yearMeta.year);
    }
  }

  function onExamChange(){
    const exam = findExam(els.exam.value);
    state.exam = exam?.id || null;
    state.year = null;
    fillYears(exam);
    setStatus(exam ? `${exam.name}: year चुनो.` : 'Exam चुनो.');
    rememberSelection(exam?.id || '', '');
  }

  function onYearChange(){
    const exam = findExam(els.exam.value);
    const year = findYear(exam, els.year.value);
    state.year = year?.year || null;
    if (!year) { resetPaper(); return; }
    fillPapers(year, true);
  }

  function onPaperChange(){
    const exam = findExam(els.exam.value);
    const year = findYear(exam, els.year.value);
    const paper = (year?.papers || []).find(p => p.id === els.paper.value);
    if (paper) openPaper(paper);
  }

  async function init(){
    els.exam.addEventListener('change', onExamChange);
    els.year.addEventListener('change', onYearChange);
    els.paper.addEventListener('change', onPaperChange);

    try {
      const res = await fetch('./data/pdf-catalog.json', {cache:'no-cache'});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      state.catalog = await res.json();

      (state.catalog.exams || []).forEach(exam => {
        const o = document.createElement('option');
        o.value = exam.id;
        o.textContent = `${exam.name} · ${exam.hi || ''}`;
        els.exam.appendChild(o);
      });
      renderStats();

      const p = new URLSearchParams(location.search);
      const ex = p.get('exam'), yr = p.get('year'), paperId = p.get('paper');
      const exam = findExam(ex);
      if (exam) {
        els.exam.value = exam.id;
        fillYears(exam);
        const year = findYear(exam, yr);
        if (year) {
          els.year.value = year.year;
          fillPapers(year, false); // never auto-reopen on Back navigation
          const paper = (year.papers || []).find(x => x.id === paperId);
          if (paper) {
            els.paper.value = paper.id;
            paperCard(paper);
            setStatus(`${paper.label} ready. Set select/change करते ही PDF खुलेगा.`);
          }
          return;
        }
      }

      setStatus('Catalog ready. Exam चुनो.');
    } catch (err) {
      setStatus(`PDF catalog could not load: ${err.message}`);
      els.panel.innerHTML = '<div class="empty">Catalog load failed. Refresh once and try again.</div>';
    }
  }

  init();
})();
