from __future__ import annotations

import json
import re
import urllib.parse
from pathlib import Path
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
CRUX = ROOT / 'Crux-Tricks'
MANIFEST = CRUX / 'crux-manifest.js'
ROUTE = CRUX / 'crux-search-route.js'
CRUX_INDEX = CRUX / 'index.html'
VIEWER = CRUX / 'viewer.html'
MY_PAGES = CRUX / 'my-pages.html'
SEARCH_WORKER = ROOT / 'search-worker.js'
SERVICE_WORKER = ROOT / 'service-worker.js'
HOME = ROOT / 'index.html'
SITEMAP = ROOT / 'sitemap.xml'
LLMS = ROOT / 'llms.txt'

ECO_DIR = CRUX / 'pdfs' / 'Books CRUX' / 'Ghatnachakra' / 'Environment & Ecology'
SSC_DIR = CRUX / 'pdfs' / 'Books CRUX' / 'Pinnacle' / 'SSC' / 'Static GK'
ECO_PREFIX = 'pdfs/Books%20CRUX/Ghatnachakra/Environment%20%26%20Ecology/'
SSC_PREFIX = 'pdfs/Books%20CRUX/Pinnacle/SSC/Static%20GK/'
VERSION = '20260917ecossccrux1'


def read(path: Path) -> str:
    return path.read_text(encoding='utf-8')


def write(path: Path, text: str) -> None:
    path.write_text(text, encoding='utf-8')


def roman_to_int(value: str) -> int:
    values = {'i': 1, 'v': 5, 'x': 10, 'l': 50, 'c': 100, 'd': 500, 'm': 1000}
    total = 0
    prev = 0
    for ch in reversed(value.lower()):
        current = values[ch]
        if current < prev:
            total -= current
        else:
            total += current
            prev = current
    return total


def title_from_filename(name: str) -> str:
    stem = re.sub(r'\.pdf$', '', name, flags=re.I)
    stem = re.sub(r'_Full_Mind_Map$', '', stem, flags=re.I)
    stem = re.sub(r'_Mindmap$', '', stem, flags=re.I)
    m = re.match(r'^(\d+)_([ivxlcdm]+)_(.+)$', stem, flags=re.I)
    if m:
        return f'{int(m.group(1)):02d}.{m.group(2).lower()} {m.group(3).replace("_", " ")}'
    m = re.match(r'^(\d+)_(.+)$', stem)
    if m:
        return f'{int(m.group(1)):02d} {m.group(2).replace("_", " ")}'
    return stem.replace('_', ' ')


def sort_key_from_title(title: str) -> str:
    m = re.match(r'^(\d+)(?:\.([ivxlcdm]+))?', title, flags=re.I)
    if not m:
        return '999.999'
    first = int(m.group(1))
    second = roman_to_int(m.group(2)) if m.group(2) else 0
    return f'{first:03d}.{second:03d}'


def clean_title(title: str) -> str:
    return re.sub(r'^\d+(?:\.[ivxlcdm]+)?\s*', '', title, flags=re.I).strip()


def pdf_pages(path: Path) -> int:
    return len(PdfReader(str(path)).pages)


def encoded_pdf_path(prefix: str, filename: str) -> str:
    return prefix + urllib.parse.quote(filename, safe='')


def file_sort(path: Path):
    title = title_from_filename(path.name)
    sk = sort_key_from_title(title)
    return tuple(int(x) for x in sk.split('.')) + (path.name.lower(),)


def load_manifest() -> list[dict]:
    raw = read(MANIFEST).strip()
    prefix = 'window.EF_CRUX_DOCS='
    if not raw.startswith(prefix):
        raise RuntimeError('Unexpected crux-manifest.js format')
    payload = raw[len(prefix):]
    if payload.endswith(';'):
        payload = payload[:-1]
    docs = json.loads(payload)
    if not isinstance(docs, list):
        raise RuntimeError('Crux manifest is not a list')
    return docs


def save_manifest(docs: list[dict]) -> None:
    write(MANIFEST, 'window.EF_CRUX_DOCS=' + json.dumps(docs, ensure_ascii=False, separators=(',', ':')) + ';\n')


def id_num(doc_id: str) -> int:
    m = re.fullmatch(r'ct(\d+)', str(doc_id or ''))
    return int(m.group(1)) if m else 0


def integrate_manifest() -> tuple[list[dict], list[dict]]:
    if not ECO_DIR.exists():
        raise RuntimeError(f'Missing Ecology folder: {ECO_DIR}')
    if not SSC_DIR.exists():
        raise RuntimeError(f'Missing SSC Static GK folder: {SSC_DIR}')

    eco_files = sorted(ECO_DIR.rglob('*.pdf'), key=file_sort)
    ssc_files = sorted(SSC_DIR.rglob('*.pdf'), key=file_sort)
    if len(eco_files) != 90:
        raise RuntimeError(f'Expected 90 Ecology PDFs, found {len(eco_files)}')
    if len(ssc_files) != 25:
        raise RuntimeError(f'Expected 25 SSC Static GK PDFs, found {len(ssc_files)}')

    docs = load_manifest()
    docs = [d for d in docs if not str(d.get('pdf', '')).startswith((ECO_PREFIX, SSC_PREFIX))]

    for d in docs:
        pdf = str(d.get('pdf', ''))
        if d.get('source') == 'Pinnacle' and '/Pinnacle/Railway/' in pdf:
            d['exam'] = 'Railway'
            crumb = ['Crux & Tricks', 'Pinnacle', 'Railway', str(d.get('subject') or '')]
            if d.get('branch'):
                crumb.append(str(d['branch']))
            d['breadcrumb'] = ' / '.join(x for x in crumb if x)

    next_id = max((id_num(d.get('id', '')) for d in docs), default=0) + 1
    added: list[dict] = []

    for path in eco_files:
        title = title_from_filename(path.name)
        name = clean_title(title)
        doc = {
            'id': f'ct{next_id:04d}', 'kind': 'crux', 'source': 'Ghatnachakra',
            'subject': 'Environment & Ecology', 'branch': '', 'title': title,
            'heading': name.upper() + ' — FULL MIND MAP', 'pages': pdf_pages(path),
            'pdf': encoded_pdf_path(ECO_PREFIX, path.name),
            'breadcrumb': 'Crux & Tricks / Ghatnachakra / Environment & Ecology',
            'sourceTitle': name, 'sortKey': sort_key_from_title(title),
        }
        docs.append(doc); added.append(doc); next_id += 1

    for path in ssc_files:
        title = title_from_filename(path.name)
        name = clean_title(title)
        doc = {
            'id': f'ct{next_id:04d}', 'kind': 'crux', 'source': 'Pinnacle', 'exam': 'SSC',
            'subject': 'Static GK', 'branch': '', 'title': title,
            'heading': 'STATIC GK — ' + name.upper() + ' — FULL MIND MAP',
            'pages': pdf_pages(path), 'pdf': encoded_pdf_path(SSC_PREFIX, path.name),
            'breadcrumb': 'Crux & Tricks / Pinnacle / SSC / Static GK',
            'sourceTitle': name, 'sortKey': sort_key_from_title(title),
        }
        docs.append(doc); added.append(doc); next_id += 1

    save_manifest(docs)
    return docs, added


NEW_EXAM_LAYER = r'''    // Pinnacle has a dedicated Exam layer. The live document array is filtered
    // in-place so the existing SPA/search/favourites code keeps the same object
    // reference while Railway and SSC remain completely separated.
    function installExamLayer() {
      var sourcePane = document.getElementById("source");
      var studyPane = document.getElementById("study");
      var sourceChoices = document.getElementById("sourceChoices");
      if (!sourcePane || !studyPane || !sourceChoices || document.getElementById("exam")) return;

      var liveDocs = Array.isArray(window.EF_CRUX_DOCS) ? window.EF_CRUX_DOCS : [];
      var masterDocs = liveDocs.slice();

      function docExam(doc) {
        if (!doc || doc.source !== "Pinnacle") return "";
        if (doc.exam) return String(doc.exam);
        var pdf = String(doc.pdf || "");
        if (pdf.indexOf("/Pinnacle/SSC/") !== -1) return "SSC";
        if (pdf.indexOf("/Pinnacle/Railway/") !== -1) return "Railway";
        return "";
      }

      function examCount(name) {
        return masterDocs.filter(function (doc) {
          return doc && doc.source === "Pinnacle" && docExam(doc) === name;
        }).length;
      }

      function restoreDocs() {
        liveDocs.splice(0, liveDocs.length);
        masterDocs.forEach(function (doc) { liveDocs.push(doc); });
      }

      function applyExamFilter(name) {
        liveDocs.splice(0, liveDocs.length);
        masterDocs.forEach(function (doc) {
          if (!doc || doc.source !== "Pinnacle" || docExam(doc) === name) liveDocs.push(doc);
        });
      }

      var railwayCount = examCount("Railway");
      var sscCount = examCount("SSC");
      var choices = "";
      if (railwayCount) {
        choices += '<button class="choice" type="button" data-exam="Railway">' +
          '<span class="ico">🚆</span>' +
          '<span class="copy"><b>Railway</b><span>रेलवे · ' + railwayCount + ' sheets</span></span>' +
          '<span class="arrow">›</span></button>';
      }
      if (sscCount) {
        choices += '<button class="choice" type="button" data-exam="SSC">' +
          '<span class="ico">📝</span>' +
          '<span class="copy"><b>SSC</b><span>एसएससी · ' + sscCount + ' sheets</span></span>' +
          '<span class="arrow">›</span></button>';
      }

      var examPane = document.createElement("section");
      examPane.id = "exam";
      examPane.className = "step";
      examPane.hidden = true;
      examPane.innerHTML =
        '<div class="nav">' +
          '<button id="backExam" class="back" type="button">← Sources</button>' +
          '<span id="examCrumb" class="crumb">Books Crux › Pinnacle</span>' +
        '</div>' +
        '<div class="title"><h2>Choose Exam</h2><p>परीक्षा चुनें</p></div>' +
        '<div id="examChoices" class="choice-grid source-grid">' + choices + '</div>';
      studyPane.parentNode.insertBefore(examPane, studyPane);

      var backExam = document.getElementById("backExam");
      var backSource = document.getElementById("backSource");
      var heroSub = document.getElementById("heroSub");
      var studyCrumb = document.getElementById("studyCrumb");
      var activeExam = "";
      var originalBackSource = backSource && backSource.onclick;

      function sourceLabel(button) {
        var label = button && button.querySelector ? button.querySelector(".copy b") : null;
        return label ? String(label.textContent || "").trim() : "";
      }

      function pinnacleButton() {
        var buttons = sourceChoices.querySelectorAll(".choice");
        for (var i = 0; i < buttons.length; i++) {
          if (sourceLabel(buttons[i]) === "Pinnacle") return buttons[i];
        }
        return null;
      }

      function setHierarchyText() {
        if (heroSub) heroSub.textContent = "Source → Exam → Subject → Part → Chapter";
      }

      function ensureExamCrumb(el) {
        if (!el || !activeExam) return;
        var text = String(el.textContent || "");
        if (text.indexOf("Pinnacle") === -1 || text.indexOf(activeExam) !== -1) return;
        el.textContent = text.replace("Pinnacle", "Pinnacle › " + activeExam);
      }

      function syncCrumbs() {
        ensureExamCrumb(document.getElementById("studyCrumb"));
        ensureExamCrumb(document.getElementById("partCrumb"));
        ensureExamCrumb(document.getElementById("chapterCrumb"));
      }

      function showExam() {
        restoreDocs();
        activeExam = "";
        sourcePane.hidden = true;
        studyPane.hidden = true;
        examPane.hidden = false;
        if (backSource) backSource.textContent = "← Sources";
        setHierarchyText();
        try { window.scrollTo(0, 0); } catch (_) {}
      }

      function hideExam() {
        restoreDocs();
        examPane.hidden = true;
        activeExam = "";
        if (backSource) backSource.textContent = "← Sources";
      }

      function showSources() {
        restoreDocs();
        hideExam();
        studyPane.hidden = true;
        sourcePane.hidden = false;
        try { window.scrollTo(0, 0); } catch (_) {}
      }

      function selectExam(name) {
        if (name !== "Railway" && name !== "SSC") return false;
        if (!examCount(name)) return false;
        var sourceButton = pinnacleButton();
        if (!sourceButton || typeof sourceButton.onclick !== "function") return false;

        applyExamFilter(name);
        activeExam = name;
        examPane.hidden = true;
        sourceButton.onclick.call(sourceButton);
        if (backSource) backSource.textContent = "← Exams";
        setHierarchyText();
        if (studyCrumb) studyCrumb.textContent = "Books Crux › Pinnacle › " + name;
        syncCrumbs();
        try { window.scrollTo(0, 0); } catch (_) {}
        return true;
      }

      document.addEventListener("click", function (event) {
        if (!event.target || !event.target.closest) return;
        var sourceButton = event.target.closest("#sourceChoices .choice");
        if (sourceButton && sourceLabel(sourceButton) === "Pinnacle") {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          showExam();
          return;
        }
        var examButton = event.target.closest("#examChoices .choice[data-exam]");
        if (examButton) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          selectExam(String(examButton.getAttribute("data-exam") || ""));
        }
      }, true);

      if (backExam) backExam.onclick = showSources;
      if (backSource) {
        backSource.onclick = function (event) {
          if (activeExam) {
            if (event) event.preventDefault();
            restoreDocs();
            studyPane.hidden = true;
            examPane.hidden = false;
            activeExam = "";
            backSource.textContent = "← Sources";
            setHierarchyText();
            try { window.scrollTo(0, 0); } catch (_) {}
            return;
          }
          if (typeof originalBackSource === "function") originalBackSource.call(backSource, event);
        };
      }

      ["studyCrumb", "partCrumb", "chapterCrumb"].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el || typeof MutationObserver === "undefined") return;
        new MutationObserver(function () { syncCrumbs(); }).observe(el, { childList: true, characterData: true, subtree: true });
      });

      window.EFP_CRUX_EXAM_LAYER = {
        showExam: showExam, showSources: showSources, hideExam: hideExam,
        selectExam: selectExam, restoreDocs: restoreDocs,
        getExam: function () { return activeExam; },
        isVisible: function () { return !examPane.hidden; }, syncCrumbs: syncCrumbs
      };
    }
'''


def patch_route() -> None:
    text = read(ROUTE)
    pattern = re.compile(r'    // Pinnacle now has an exam layer before Subjects\..*?\n    function installExamLayer\(\) \{.*?\n    \}\n\n    if \(document\.readyState === "loading"\)', re.S)
    text, n = pattern.subn(NEW_EXAM_LAYER + '\n    if (document.readyState === "loading")', text, count=1)
    if n != 1:
        raise RuntimeError('Could not replace Pinnacle exam layer')
    text = text.replace(
        'var SUBJECTS = ["History", "Polity", "Geography", "Science", "Economics", "Maths", "Static GK"];',
        'var SUBJECTS = ["History", "Polity", "Geography", "Environment & Ecology", "Science", "Economics", "English", "Maths", "Static GK"];'
    )
    write(ROUTE, text)


TOPIC_SEARCH = r'''
  function cruxTopicSearch(query) {
    if (!isCruxSearch() || !Array.isArray(cruxDocs) || !cruxDocs.length) return [];
    var parsed = queryTerms(query);
    if (!parsed.terms.length) return [];
    var results = [];
    for (var i = 0; i < cruxDocs.length; i++) {
      var doc = cruxDocs[i] || {};
      var title = normalizeQuery(doc.title || "");
      var sourceTitle = normalizeQuery(doc.sourceTitle || "");
      var meta = normalizeQuery([doc.subject || "", doc.branch || "", doc.source || "", doc.exam || "", doc.breadcrumb || ""].join(" "));
      var all = title + " " + sourceTitle + " " + meta;
      var ok = true;
      for (var t = 0; t < parsed.terms.length; t++) {
        if (all.indexOf(parsed.terms[t]) === -1) { ok = false; break; }
      }
      if (!ok) continue;
      var score = 30;
      if (title === parsed.phrase || sourceTitle === parsed.phrase) score = 0;
      else if (title.indexOf(parsed.phrase) !== -1 || sourceTitle.indexOf(parsed.phrase) !== -1) score = 4;
      else {
        var everyInTitle = true;
        for (var j = 0; j < parsed.terms.length; j++) {
          if (title.indexOf(parsed.terms[j]) === -1 && sourceTitle.indexOf(parsed.terms[j]) === -1) { everyInTitle = false; break; }
        }
        if (everyInTitle) score = 8;
        else if (meta.indexOf(parsed.phrase) !== -1) score = 16;
      }
      results.push({score:score,sequence:i,f:"/Crux-Tricks/viewer.html?id="+encodeURIComponent(String(doc.id||"")),t:doc.title||doc.sourceTitle||"Crux topic",b:doc.breadcrumb||[doc.source,doc.subject,doc.branch].filter(Boolean).join(" / "),x:"Topic · "+(doc.sourceTitle||doc.title||"Crux revision")});
    }
    results.sort(function (a, b) { return a.score - b.score || a.sequence - b.sequence; });
    return results.slice(0, Math.min(config && config.limit || 40, 40));
  }
'''


def patch_search_worker() -> None:
    text = read(SEARCH_WORKER)
    if 'function cruxTopicSearch(query)' not in text:
        marker = '\n  function fastSnippetSearch(query) {'
        if marker not in text:
            raise RuntimeError('search-worker fastSnippetSearch marker missing')
        text = text.replace(marker, TOPIC_SEARCH + marker, 1)
    old = '''    scored.sort(function (a, b) { return a.score - b.score || a.sequence - b.sequence; });
    var limit = config.limit || 40;
    var out = [];
    for (var k = 0; k < scored.length && k < limit; k++) {
      out.push(routeCruxHit({ f: scored[k].f, t: scored[k].t, b: scored[k].b, x: scored[k].x }));
    }
    return out;'''
    new = '''    scored.sort(function (a, b) { return a.score - b.score || a.sequence - b.sequence; });
    var limit = config.limit || 40;
    var out = [];
    for (var k = 0; k < scored.length && k < limit; k++) {
      out.push(routeCruxHit({ f: scored[k].f, t: scored[k].t, b: scored[k].b, x: scored[k].x }));
    }
    if (isCruxSearch()) {
      var topics = cruxTopicSearch(query), merged = [], seen = {};
      topics.concat(out).forEach(function (hit) {
        var key = String(hit && hit.f || "") + "|" + String(hit && hit.t || "");
        if (!hit || seen[key]) return;
        seen[key] = true; merged.push(hit);
      });
      return merged.slice(0, limit);
    }
    return out;'''
    if old in text:
        text = text.replace(old, new, 1)
    elif 'topics.concat(out).forEach' not in text:
        raise RuntimeError('search-worker result block not found')
    write(SEARCH_WORKER, text)


def bump_crux_versions() -> None:
    for path in (CRUX_INDEX, VIEWER, MY_PAGES):
        text = read(path)
        text = re.sub(r'crux-manifest\.js\?v=[^"\']+', f'crux-manifest.js?v={VERSION}', text)
        text = re.sub(r'crux-search-route\.js\?v=[^"\']+', f'crux-search-route.js?v={VERSION}', text)
        text = re.sub(r'crux-tricks\.js\?v=[^"\']+', f'crux-tricks.js?v={VERSION}', text)
        text = re.sub(r'viewer-v2\.js\?v=[^"\']+', f'viewer-v2.js?v={VERSION}', text)
        write(path, text)


def update_home_count(total: int) -> None:
    text = read(HOME)
    pattern = re.compile(r'("\./Crux-Tricks/index\.html":\{"total":)\d+(,"unit":"PDFs"\})')
    text, n = pattern.subn(rf'\g<1>{total}\g<2>', text, count=1)
    if n != 1:
        raise RuntimeError('Landing-page Crux count block not found')
    write(HOME, text)


def update_service_worker() -> None:
    text = read(SERVICE_WORKER)
    text = re.sub(r'^// v\d+ .*?\nconst CACHE_VERSION = "[^"]+";', '// v80 Crux Ecology + Pinnacle SSC library 20260917\nconst CACHE_VERSION = "efp-pwa-2026-09-17-v80-crux-eco-ssc";', text, count=1, flags=re.M)
    text = re.sub(r'/Crux-Tricks/crux-tricks\.js\?v=[^"]+', f'/Crux-Tricks/crux-tricks.js?v={VERSION}', text)
    text = re.sub(r'/Crux-Tricks/viewer-v2\.js\?v=[^"]+', f'/Crux-Tricks/viewer-v2.js?v={VERSION}', text)
    write(SERVICE_WORKER, text)


def update_llms(total: int) -> None:
    text = read(LLMS)
    text = re.sub(r'\[Crux & Memory Tricks\]\(https://examfusionprep\.com/Crux-Tricks/index\.html\):[^\n]*', f'[Crux & Memory Tricks](https://examfusionprep.com/Crux-Tricks/index.html): {total} PDF revision sheets, including Ghatnachakra Environment & Ecology and Pinnacle SSC Static GK, with the ExamFusion PDF reader, favourites, saved pages and search.', text, count=1)
    write(LLMS, text)


def update_sitemap(added: list[dict]) -> None:
    text = read(SITEMAP)
    entries = []
    for doc in added:
        loc = 'https://examfusionprep.com/Crux-Tricks/' + str(doc['pdf'])
        if loc not in text:
            entries.append('<url>\n<loc>' + loc + '</loc>\n<lastmod>2026-09-17</lastmod>\n<priority>0.5</priority>\n</url>')
    if entries:
        if '</urlset>' not in text:
            raise RuntimeError('sitemap.xml closing urlset missing')
        text = text.replace('</urlset>', '\n' + '\n'.join(entries) + '\n</urlset>', 1)
        write(SITEMAP, text)


def validate(docs: list[dict]) -> None:
    eco = [d for d in docs if str(d.get('pdf', '')).startswith(ECO_PREFIX)]
    ssc = [d for d in docs if str(d.get('pdf', '')).startswith(SSC_PREFIX)]
    railway = [d for d in docs if d.get('source') == 'Pinnacle' and d.get('exam') == 'Railway']
    if len(eco) != 90:
        raise RuntimeError(f'Final manifest Ecology count is {len(eco)}, expected 90')
    if len(ssc) != 25:
        raise RuntimeError(f'Final manifest SSC Static GK count is {len(ssc)}, expected 25')
    if not railway:
        raise RuntimeError('Existing Pinnacle Railway documents were not preserved')
    ids = [str(d.get('id')) for d in docs]
    if len(ids) != len(set(ids)):
        raise RuntimeError('Duplicate Crux document IDs detected')
    if 'data-exam="SSC"' not in read(ROUTE):
        raise RuntimeError('SSC exam button missing after route patch')
    if 'function cruxTopicSearch(query)' not in read(SEARCH_WORKER):
        raise RuntimeError('Homepage Crux topic search patch missing')


def main() -> None:
    docs, added = integrate_manifest()
    patch_route()
    patch_search_worker()
    bump_crux_versions()
    update_home_count(len(docs))
    update_service_worker()
    update_llms(len(docs))
    update_sitemap(added)
    validate(docs)
    print(f'Crux integration complete: {len(docs)} total PDFs; 90 Ecology; 25 Pinnacle SSC Static GK.')


if __name__ == '__main__':
    main()
