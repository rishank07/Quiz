(() => {
  'use strict';

  const frame = document.getElementById('pdfFrame');
  const titleEl = document.getElementById('docTitle');
  const metaEl = document.getElementById('docMeta');
  const loadingEl = document.getElementById('loading');
  const loadingText = document.getElementById('loadingText');
  const errorEl = document.getElementById('error');
  const errorText = document.getElementById('errorText');
  const sourceBtn = document.getElementById('sourceBtn');
  const retryBtn = document.getElementById('retryBtn');
  const backBtn = document.getElementById('backBtn');
  const params = new URLSearchParams(location.search);

  let paper = null;
  let sourceUrl = '';
  let embedUrl = '';

  function sourceTag(p) {
    const src = `${p?.source || ''} ${p?.pdf || ''}`.toLowerCase();
    if (src.includes('testbook')) return 'Testbook';
    if (src.includes('adda247') || src.includes('adda247.com')) return 'Adda247';
    if (src.includes('physics wallah') || src.includes('pw.live')) return 'PW';
    if (src.includes('official') || src.includes('upsc.gov.in') || src.includes('bpsc.bihar.gov.in')) return 'Official';
    return 'Public';
  }

  async function loadCatalog() {
    const urls = [
      `./data/pdf-catalog.json?v=${Date.now()}`,
      `https://raw.githubusercontent.com/rishank07/Quiz/master/PYQ/data/pdf-catalog.json?v=${Date.now()}`
    ];
    let lastError;
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data && Array.isArray(data.exams)) return data;
      } catch (err) { lastError = err; }
    }
    throw lastError || new Error('Catalog unavailable');
  }

  function findPaper(catalog) {
    const examId = params.get('exam');
    const yearVal = params.get('year');
    const id = params.get('id');
    if (!id) return null;

    const exams = catalog.exams || [];
    const preferredExam = exams.find(x => x.id === examId);
    if (preferredExam) {
      const preferredYear = (preferredExam.years || []).find(y => String(y.year) === String(yearVal));
      const hit = (preferredYear?.papers || []).find(p => p.id === id);
      if (hit) return { exam: preferredExam, year: preferredYear, paper: hit };
    }

    for (const exam of exams) {
      for (const year of exam.years || []) {
        const hit = (year.papers || []).find(p => p.id === id);
        if (hit) return { exam, year, paper: hit };
      }
    }
    return null;
  }

  function isAndroidLike() {
    return /Android/i.test(navigator.userAgent || '') || window.matchMedia('(display-mode: standalone)').matches;
  }

  function drivePreview(url) {
    const m = url.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
    return m ? `https://drive.google.com/file/d/${m[1]}/preview` : url;
  }

  function chooseEmbed(url) {
    if (!url) return '';
    const lower = url.toLowerCase();
    if (lower.includes('drive.google.com')) return drivePreview(url);

    const looksDirectPdf = /\.pdf(?:$|[?#])/i.test(url) ||
      lower.includes('static.pw.live/') ||
      lower.includes('cdn.testbook.com/') ||
      (lower.includes('adda247.com/') && lower.includes('.pdf'));

    if (looksDirectPdf && isAndroidLike()) {
      return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}`;
    }
    return url;
  }

  function showError(message) {
    loadingEl.hidden = true;
    errorEl.hidden = false;
    if (errorText) errorText.textContent = message || 'Use the source button below.';
  }

  function openInFrame() {
    if (!embedUrl) return showError('No embeddable source is available for this paper.');
    errorEl.hidden = true;
    loadingEl.hidden = false;
    frame.src = 'about:blank';
    setTimeout(() => { frame.src = embedUrl; }, 30);
  }

  backBtn.addEventListener('click', () => {
    if (history.length > 1) history.back();
    else location.assign('./index.html');
  });

  retryBtn.addEventListener('click', e => {
    e.preventDefault();
    openInFrame();
  });

  frame.addEventListener('load', () => {
    if (frame.src === 'about:blank') return;
    setTimeout(() => { loadingEl.hidden = true; }, 350);
  });

  async function init() {
    try {
      const catalog = await loadCatalog();
      const found = findPaper(catalog);
      if (!found) throw new Error('Paper not found in current catalog');

      paper = found.paper;
      const mode = params.get('mode') === 'answer' ? 'answer' : 'paper';
      sourceUrl = mode === 'answer' ? (paper.answer_key || '') : (paper.pdf || '');
      if (!sourceUrl) throw new Error(mode === 'answer' ? 'Answer key is not available for this paper' : 'PDF URL missing');

      const provider = sourceTag(paper);
      const baseTitle = paper.label || paper.paper || 'PYQ Paper';
      titleEl.textContent = mode === 'answer' ? `Answer Key · ${baseTitle}` : baseTitle;
      metaEl.textContent = `${found.exam.name} · ${found.year.year} · ${provider} · inside ExamFusion Prep`;
      loadingText.textContent = `${provider} ${mode === 'answer' ? 'answer key' : 'paper'}`;
      sourceBtn.href = sourceUrl;
      sourceBtn.textContent = `Open ${provider} source ↗`;
      document.title = `${mode === 'answer' ? 'Answer Key' : baseTitle} | ExamFusion Prep`;

      embedUrl = chooseEmbed(sourceUrl);
      openInFrame();

      if (typeof gtag === 'function') {
        gtag('event', 'pyq_internal_viewer_open', {
          exam: found.exam.id,
          year: String(found.year.year),
          paper_id: paper.id,
          provider,
          mode
        });
      }
    } catch (err) {
      titleEl.textContent = 'PYQ Viewer';
      metaEl.textContent = 'ExamFusion Prep';
      sourceBtn.removeAttribute('href');
      showError(err.message || 'Could not load this paper.');
    }
  }

  init();
})();
