(() => {
  'use strict';

  const examEl = document.getElementById('examSelect');
  const yearEl = document.getElementById('yearSelect');
  const paperEl = document.getElementById('paperSelect');
  const statsEl = document.getElementById('stats');
  const panelEl = document.getElementById('paperPanel');
  const statusEl = document.getElementById('statusText');
  let catalog = null;

  const esc = (v = '') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const setStatus = msg => { if (statusEl) statusEl.textContent = msg; };
  const getExam = id => (catalog?.exams || []).find(x => x.id === id);
  const getYear = (exam, year) => (exam?.years || []).find(x => String(x.year) === String(year));

  function sourceTag(paper) {
    const src = `${paper?.source || ''} ${paper?.pdf || ''}`.toLowerCase();
    if (src.includes('testbook')) return 'Testbook';
    if (src.includes('adda247') || src.includes('adda247.com')) return 'Adda247';
    if (src.includes('physics wallah') || src.includes('pw.live')) return 'PW';
    if (src.includes('official') || src.includes('upsc.gov.in') || src.includes('bpsc.bihar.gov.in')) return 'Official';
    return 'Public';
  }

  function totalPapers() {
    return (catalog?.exams || []).reduce((sum, exam) =>
      sum + (exam.years || []).reduce((s, y) => s + (y.papers || []).length, 0), 0);
  }

  function renderStats(exam, year) {
    const pills = [`${totalPapers()} PDFs catalogued`];
    if (exam) pills.push(`${exam.name}: ${(exam.years || []).reduce((s,y)=>s+(y.papers||[]).length,0)} PDFs`);
    if (year) pills.push(`${year.year}: ${(year.papers || []).length} paper${(year.papers || []).length === 1 ? '' : 's'}`);
    if (statsEl) statsEl.innerHTML = pills.map(x => `<span class="pill">${esc(x)}</span>`).join('');
  }

  function resetPaper() {
    paperEl.innerHTML = '<option value="">Select set / paper</option>';
    paperEl.disabled = true;
    if (panelEl) panelEl.innerHTML = '';
  }

  function fillYears(exam) {
    yearEl.innerHTML = '<option value="">Select year</option>';
    resetPaper();
    (exam?.years || []).forEach(meta => {
      const count = (meta.papers || []).length;
      const opt = document.createElement('option');
      opt.value = String(meta.year);
      opt.textContent = count ? `${meta.year} · ${count} PDF${count > 1 ? 's' : ''}` : `${meta.year} · Pending`;
      yearEl.appendChild(opt);
    });
    yearEl.disabled = !exam || !(exam.years || []).length;
    renderStats(exam, null);
  }

  function paperCard(paper) {
    if (!panelEl || !paper) return;
    const meta = [sourceTag(paper), paper.stage, paper.paper, paper.set ? `Set ${paper.set}` : null, paper.date, paper.shift ? `Shift ${paper.shift}` : null]
      .filter(Boolean).join(' · ');
    panelEl.innerHTML = `<div class="empty">
      <div class="qmeta">${esc(meta)}</div>
      <div class="qtext">${esc(paper.label || 'PYQ Paper')}</div>
      <div class="source" style="margin-top:10px">Source: ${esc(paper.source || '')}</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:14px">
        <a class="pdf-btn" href="${esc(paper.pdf)}" target="_blank" rel="noopener noreferrer external">Open in Browser ↗</a>
        ${paper.answer_key ? `<a class="pdf-btn secondary" href="${esc(paper.answer_key)}" target="_blank" rel="noopener noreferrer external">Answer Key ↗</a>` : ''}
      </div>
    </div>`;
  }

  function remember(examId, year, paperId) {
    const p = new URLSearchParams();
    if (examId) p.set('exam', examId);
    if (year) p.set('year', year);
    if (paperId) p.set('paper', paperId);
    history.replaceState(null, '', p.toString() ? `?${p.toString()}` : location.pathname);
  }

  function openExternal(url) {
    if (!url) return false;
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      window.location.href = url;
      return false;
    }
    return true;
  }

  function openPaper(paper) {
    if (!paper?.pdf) return;
    remember(examEl.value, yearEl.value, paper.id || '');
    paperCard(paper);
    setStatus(`Opening [${sourceTag(paper)}] ${paper.label || 'PYQ PDF'} in browser…`);
    openExternal(paper.pdf);
  }

  function fillPapers(yearMeta, autoOpen) {
    resetPaper();
    const exam = getExam(examEl.value);
    const papers = yearMeta?.papers || [];
    renderStats(exam, yearMeta || null);

    if (!papers.length) {
      setStatus(`${exam ? exam.name : 'Exam'} ${yearMeta ? yearMeta.year : ''}: PDF अभी add नहीं हुआ है.`);
      remember(examEl.value, yearMeta ? yearMeta.year : '', '');
      return;
    }

    papers.forEach(paper => {
      const opt = document.createElement('option');
      opt.value = paper.id;
      opt.textContent = `[${sourceTag(paper)}] ${paper.label || paper.paper || 'Paper'}`;
      paperEl.appendChild(opt);
    });
    paperEl.disabled = false;

    if (papers.length === 1) {
      paperEl.value = papers[0].id;
      paperCard(papers[0]);
      setStatus(`${yearMeta.year}: [${sourceTag(papers[0])}] ${papers[0].label}`);
      if (autoOpen) openPaper(papers[0]);
    } else {
      setStatus(`${yearMeta.year}: ${papers.length} papers available — Set/Paper चुनो.`);
      remember(examEl.value, yearMeta.year, '');
    }
  }

  async function loadCatalog() {
    const urls = [
      `./data/pdf-catalog.json?v=${Date.now()}`,
      `https://raw.githubusercontent.com/rishank07/Quiz/master/PYQ/data/pdf-catalog.json?v=${Date.now()}`
    ];
    let lastError = null;
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data || !Array.isArray(data.exams) || !data.exams.length) throw new Error('Empty catalog');
        return data;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('Catalog unavailable');
  }

  function populateExams() {
    examEl.innerHTML = '<option value="">Select exam</option>';
    (catalog.exams || []).forEach(exam => {
      const opt = document.createElement('option');
      opt.value = exam.id;
      opt.textContent = `${exam.name}${exam.hi ? ` · ${exam.hi}` : ''}`;
      examEl.appendChild(opt);
    });
    examEl.disabled = false;
    renderStats(null, null);
  }

  async function init() {
    if (!examEl || !yearEl || !paperEl) return;
    examEl.disabled = true;
    yearEl.disabled = true;
    paperEl.disabled = true;

    examEl.addEventListener('change', () => {
      const exam = getExam(examEl.value);
      fillYears(exam);
      setStatus(exam ? `${exam.name}: year चुनो.` : 'Exam चुनो.');
      remember(exam ? exam.id : '', '', '');
    });

    yearEl.addEventListener('change', () => {
      const exam = getExam(examEl.value);
      const year = getYear(exam, yearEl.value);
      if (!year) { resetPaper(); return; }
      fillPapers(year, true);
    });

    paperEl.addEventListener('change', () => {
      const exam = getExam(examEl.value);
      const year = getYear(exam, yearEl.value);
      const paper = (year?.papers || []).find(x => x.id === paperEl.value);
      if (paper) openPaper(paper);
    });

    try {
      setStatus('Loading PYQ catalog…');
      catalog = await loadCatalog();
      populateExams();

      const p = new URLSearchParams(location.search);
      const exam = getExam(p.get('exam'));
      if (exam) {
        examEl.value = exam.id;
        fillYears(exam);
        const year = getYear(exam, p.get('year'));
        if (year) {
          yearEl.value = String(year.year);
          fillPapers(year, false);
          const paper = (year.papers || []).find(x => x.id === p.get('paper'));
          if (paper) {
            paperEl.value = paper.id;
            paperCard(paper);
          }
          setStatus(`${exam.name} ${year.year}: ready.`);
          return;
        }
      }
      setStatus('Catalog ready. Exam चुनो.');
    } catch (err) {
      examEl.disabled = false;
      setStatus(`Catalog load failed: ${err.message}`);
      if (panelEl) panelEl.innerHTML = '<div class="empty">Catalog load नहीं हुआ. Page reload करके फिर try करें.</div>';
    }
  }

  init();
})();
