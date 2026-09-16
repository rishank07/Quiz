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

  function safeUrl(raw) {
    try { return new URL(raw, location.href); } catch (_) { return null; }
  }

  function unwrapGoogleViewer(raw) {
    const u = safeUrl(raw);
    if (!u) return raw || '';
    const host = u.hostname.toLowerCase();
    if (host === 'docs.google.com' && (/\/gview$/i.test(u.pathname) || u.pathname.includes('/viewer'))) {
      const nested = u.searchParams.get('url');
      if (nested) {
        try { return decodeURIComponent(nested); } catch (_) { return nested; }
      }
    }
    return raw;
  }

  function isDirectPdfLike(raw) {
    if (!raw) return false;
    const url = unwrapGoogleViewer(raw);
    const lower = url.toLowerCase();
    return /\.pdf(?:$|[?#/])/i.test(url) ||
      lower.includes('static.pw.live/') ||
      lower.includes('cdn.testbook.com/') ||
      (lower.includes('adda247.com/') && lower.includes('.pdf')) ||
      (lower.includes('upsc.gov.in/') && lower.includes('.pdf')) ||
      (lower.includes('bpsc.bihar.gov.in/') && lower.includes('.pdf'));
  }

  function drivePreview(raw) {
    const u = safeUrl(raw);
    if (!u) return '';
    const host = u.hostname.toLowerCase();
    if (host !== 'drive.google.com' && host !== 'docs.google.com') return '';

    let id = '';
    const fileMatch = u.pathname.match(/\/file\/d\/([^/]+)/i);
    if (fileMatch) id = fileMatch[1];
    if (!id) id = u.searchParams.get('id') || '';
    return id ? `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview` : '';
  }

  function isKnownBlockedPage(raw) {
    const u = safeUrl(raw);
    if (!u) return true;
    const host = u.hostname.toLowerCase();
    if (host === 'docs.aglasem.com') return true;
    if (host === 'testbook.com' && u.pathname.includes('/pdf-viewer')) return true;
    if (host === 'docs.google.com' && !drivePreview(raw) && !isDirectPdfLike(raw)) return true;
    return false;
  }

  function norm(v) {
    return String(v || '')
      .toLowerCase()
      .replace(/\b(english|hindi|question|paper|previous|year|official|download|pdf|click|here|shift|tier|cbt|prelims|mains)\b/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function sameValue(a, b) {
    return String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
  }

  function findDirectAlternative(found) {
    const selected = found.paper;
    const pool = (found.year?.papers || []).filter(p => p && p.id !== selected.id && isDirectPdfLike(p.pdf));
    const selectedPaper = norm(selected.paper);
    const selectedLabel = norm(selected.label);

    let best = null;
    let bestScore = -1;
    for (const candidate of pool) {
      if (selected.date && candidate.date && !sameValue(selected.date, candidate.date)) continue;
      if (selected.shift && candidate.shift && !sameValue(selected.shift, candidate.shift)) continue;
      if (selected.set && candidate.set && !sameValue(selected.set, candidate.set)) continue;

      const candidatePaper = norm(candidate.paper);
      const candidateLabel = norm(candidate.label);
      let score = 0;

      if (selectedPaper && candidatePaper && selectedPaper === candidatePaper) score += 8;
      if (selected.date && candidate.date && sameValue(selected.date, candidate.date)) score += 8;
      if (selected.shift && candidate.shift && sameValue(selected.shift, candidate.shift)) score += 5;
      if (selected.set && candidate.set && sameValue(selected.set, candidate.set)) score += 5;
      if (selectedLabel && candidateLabel && selectedLabel === candidateLabel) score += 7;

      if (!selected.date && !selected.shift && !selected.set) {
        const a = new Set(selectedLabel.split(' ').filter(Boolean));
        const b = new Set(candidateLabel.split(' ').filter(Boolean));
        let overlap = 0;
        for (const t of a) if (b.has(t)) overlap++;
        if (overlap >= 3) score += overlap;
      }

      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    const minimum = (selected.date || selected.shift || selected.set) ? 8 : 10;
    return bestScore >= minimum ? best : null;
  }

  function chooseEmbed(found, raw) {
    if (!raw) return { url: '', alternative: null, blocked: true };

    const unwrapped = unwrapGoogleViewer(raw);
    if (isDirectPdfLike(unwrapped)) {
      return { url: unwrapped, alternative: null, blocked: false };
    }

    const drive = drivePreview(unwrapped);
    if (drive) return { url: drive, alternative: null, blocked: false };

    if (isKnownBlockedPage(unwrapped)) {
      const alternative = findDirectAlternative(found);
      if (alternative) {
        return { url: unwrapGoogleViewer(alternative.pdf), alternative, blocked: false };
      }
      return { url: '', alternative: null, blocked: true };
    }

    return { url: unwrapped, alternative: null, blocked: false };
  }

  function showError(message) {
    frame.src = 'about:blank';
    loadingEl.hidden = true;
    errorEl.hidden = false;
    if (errorText) errorText.textContent = message || 'Use the source button below.';
  }

  function openInFrame() {
    if (!embedUrl) return showError('This provider does not allow embedded viewing for this paper. Use another source/paper or the source button below.');
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
    setTimeout(() => { loadingEl.hidden = true; }, 500);
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
      sourceBtn.href = sourceUrl;
      sourceBtn.textContent = `Open ${provider} source ↗`;
      document.title = `${mode === 'answer' ? 'Answer Key' : baseTitle} | ExamFusion Prep`;

      const choice = mode === 'paper' ? chooseEmbed(found, sourceUrl) : chooseEmbed({ ...found, paper: { ...paper, pdf: sourceUrl } }, sourceUrl);
      embedUrl = choice.url;

      if (choice.alternative) {
        const altProvider = sourceTag(choice.alternative);
        metaEl.textContent = `${found.exam.name} · ${found.year.year} · ${provider} source blocked · showing ${altProvider} copy inside ExamFusion`;
        loadingText.textContent = `${altProvider} direct PDF copy`;
      } else {
        metaEl.textContent = `${found.exam.name} · ${found.year.year} · ${provider} · inside ExamFusion Prep`;
        loadingText.textContent = `${provider} ${mode === 'answer' ? 'answer key' : 'paper'}`;
      }

      if (!embedUrl) {
        showError('This source blocks embedding and no matching direct-PDF copy is available yet. The rest of ExamFusion remains open here; use the source button only if you want this specific paper.');
      } else {
        openInFrame();
      }

      if (typeof gtag === 'function') {
        gtag('event', 'pyq_internal_viewer_open', {
          exam: found.exam.id,
          year: String(found.year.year),
          paper_id: paper.id,
          provider,
          mode,
          used_alternative: !!choice.alternative
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
