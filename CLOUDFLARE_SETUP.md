# ExamFusion Prep: Cloudflare Pages deployment

Connect the existing `rishank07/Quiz` repository to a **Pages** project using Git
integration. Select these settings:

| Setting | Value |
| --- | --- |
| Production branch | `master` |
| Framework preset | None |
| Root directory | Repository root (leave blank) |
| Build command | `python3 tools/build-cloudflare-pages.py` |
| Build output directory | `cloudflare-dist` |

The build uses Python's standard library. It does not need npm packages,
Functions, Workers, R2, API keys, or a separate upload step. GitHub remains the
source of truth; future pushes rebuild the deployment automatically. The
existing GitHub Pages website continues serving the unchanged source files
until the custom domain is moved.

## What the build prepares

The current source includes two search indexes and two PDFs larger than the
25 MiB asset limit. Only the generated deployment changes:

- Search data is split into static JavaScript parts. Record order, text, links,
  anchors, and the existing search worker are preserved. The browser fallback
  loads the same parts asynchronously. Splitting an index does not itself
  reduce the total search data or the browser's search work.
- Large PDFs are divided into 1 MiB byte ranges, without recompressing or
  changing the source documents. PDF.js reads those ranges on demand. Flat
  scanned PDFs get a small, incremental page-tree update in the reader delivery
  so PDF.js can locate a page without downloading every scan first. Original
  bytes, images, content streams and page order are preserved. The full
  document, page numbers, reading progress, bookmarks, and search links keep
  their existing IDs. Read ranges use a bounded memory cache, selected pages
  load before background neighbours, and immutable PDF parts are reused offline
  without background downloads. The Open PDF action reconstructs the original bytes in
  the browser. It needs memory for a complete PDF when opening the full original.
- Small route compatibility scripts restore the existing `.html` addresses in
  browser history after Pages' automatic extension-less redirects, before
  existing navigation and app scripts read the route.
- The generated service-worker cache version includes the build revision.
  Static parts use content hashes, and the worker script uses `no-cache`.
- Internal tools, audit files, GitHub configuration and the old `CNAME` are
  omitted from the public output. The build refuses oversized unsupported
  assets, more than 20,000 files, Functions, or an advanced-mode Worker.

Source PDFs, quiz content, question IDs, and production JavaScript are not
modified. `cloudflare-dist` is generated and must not be committed.

## Verify before moving the domain

1. Deploy to the assigned `*.pages.dev` address first.
2. Verify homepage search (including Ghatnachakra and Original Practice),
   section search, quizzes, back navigation, and saved progress.
3. In both large Maths PDFs, open the first, middle, and last pages, test a
   saved-page link, and test Open PDF. Check mobile and desktop layouts.
4. Check a fresh browser and an existing PWA session. Confirm updates arrive
   after another test deployment.
5. Connect the custom domain only after the preview checks pass. Verify the
   Android/Windows apps on the actual custom domain after the switch.

Local tests emulate Pages routing; they do not replace a real Pages preview or
measure a particular daily-visitor capacity. No custom Cache Everything rule
or post-push cache-purge workflow is needed for this Pages deployment.

## Local checks

```sh
python3 tools/build-cloudflare-pages.py
node tools/test-cloudflare-pdf-cache.cjs
node tools/test-cloudflare-pages.cjs
node tools/test-analytics-guard.cjs
```

The integration check requires Playwright and Chromium. For PDF.js rendering
and existing-reader tests, set `EFP_PDFJS_TEST_DIR` to a directory containing
the official PDF.js v3.11.174 browser `pdf.js` and matching `pdf.worker.js`.
The test checks all search content and exact PDF bytes, then exercises worker
search, the no-Worker browser fallback, PDF range reads and reader deep links.
PDF checks compare rendered pages with the originals and cap startup downloads
to catch a return of the full-book scan before first paint.
It blocks Google Analytics and Google Tag Manager before browser navigation.

Pages' static requests are distinct from the Workers request allowance shown
on the account overview. The Free plan also has a monthly build allowance;
check Cloudflare's current plan limits when changing the deployment frequency.
