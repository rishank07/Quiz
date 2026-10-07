# Search cross-device audit — 7 October 2026

Audited the current master after the recent search fixes, including shared search,
homepage full text, section hubs, exact result entry, reader controls, PDF routing,
return/resume snapshots and service-worker delivery.

## Findings and corrections

| Finding | Correction |
| --- | --- |
| Section workers that were blocked/unavailable could silently produce an empty list, while a service-worker wrapper retried genuine zero results only on desktop. | Recover actual worker failures through the shared client on every device policy. Cache successful empty results; never download another corpus merely because a search found nothing. Failed recovery emits incomplete-search status and a retry control. |
| Several fallback corpora export the same global; concurrent script loads could read another source's records. | Serialize script loading, key the promise cache by URL and global, clear the previous export, validate the new array, and permit retries after errors/timeouts. Retain at most two loader promises. |
| A large snippet group could run synchronously even though the outer scan was chunked. | Keep the inner snippet cursor between approximately 12 ms batches. Preserve result caps, ranking passes and cancellation checks. |
| Homepage book search had a separate worker implementation with no equivalent recovery. | Delegate failed-worker recovery to the shared client and terminate it when a query is cancelled. Real worker and no-worker Nitish searches return the same routes. |
| BlackBook record fallback lost its original record fields. | Preserve record fields and the existing record-mode search contract. |
| Crux fallback could return obsolete topic paths instead of current PDF viewer destinations. | Share the worker's manifest-based routing factory with fallback. Load a private manifest without overwriting the live Crux application's filtered manifest. |
| Query `constructor` collided with an inherited object property; repeated substitutions could highlight their own HTML markup. | Use dictionaries without prototypes/own-property lookups and one highlighting pass over escaped source text. |
| Search-context normalization could finish loading after reader decoration. | Refresh context/mindmap matching when shared search logic becomes ready. |
| Removing mindmap highlights could reflow lines and anchor the viewport to the start of a broad card. | Remove highlight padding and preserve the first current match's connected reading anchor. |
| First PWA installation could reload an active cold homepage search, then restore its unfinished empty snapshot as completed. | Ignore the first controller claim; retain reload behavior for replacement controllers. Record snapshot completion and rerun interrupted cold searches. Explicit search-back restoration still accepts the original partial snapshot. |
| Six Bihar catalogue entries targeted HTML files that do not exist in the repository. | Remove only those catalogue links. No question/fact content or destination pages were removed. |
| Older cached assets could retain the desktop-only wrapper. | Refresh the app-shell version and strip the legacy injected wrapper from cached search logic. Update shared entry points and the homepage integration generator. |

## Verification

- Integration scan: **1,061 HTML pages**, **72 embedded search screens**, **2,505
  inline scripts** and **13,920 indexed destinations**. No missing indexed files
  or inline JavaScript syntax errors. Search screens use the shared integration.
- Chromium and Firefox: **48 browser cases per engine** across 320×700,
  390×844, 768×1024, 844×390 and 1366×768. Five hubs and four exact entries at
  each size; search results, viewport-contained dock, explicit option preview,
  unchanged score/answers, next match, sticky positioning and dismissal.
  Additional cases cover cold/repeated homepage search, first service-worker
  installation, blocked-worker BlackBook and full homepage recovery parity.
- Mindmap reader: **48 Chromium cases** covering real chapters, mobile/desktop
  sizes and both themes. Content, exact target, highlight visibility, next match,
  dismissal/reading position, search return and restored-page behavior passed.
- Shared cross-device contracts: Android/Windows/iPhone/Firefox UA policies,
  same-global concurrent sources, error retry, bounded/cancelled scans, result
  cache, genuine zero results, record-mode fallback, safe markup and current
  Crux OCR/PDF routes passed.
- Product lifecycle tests: real 18-source homepage cold/repeated Nitish route
  parity, failed-source retry, interrupted snapshots, option preview and
  unanchored mindmap entry passed.
- Existing ranking, case/spacing/spelling, grouped HTML, explanation, Bihar,
  Rapid Practice, Original Practice, mindmap partial/scroll, search return,
  installed-app home return/resume, PDF search/ranges and section loading tests
  passed. Section failure/retry and stale-query notices are exercised.
- `sync-history-mindmap-index.py --all --check` passed for 241 existing groups;
  Crux routing validation, JavaScript syntax checks and `git diff --check` passed.

Tests that assumed the previous inline control position were updated to check
the current fixed reader dock and explicit preview behavior. Expected question
counts and answer/progress contracts were preserved.

## Practical limits

Chromium and Firefox ran as real headless engines on Linux with mobile/tablet/
desktop viewport sizes. UA-policy tests also simulate Android, Windows and iPhone.
Physical Android/iPhone/Windows installations and Safari/WebKit were not run, so
these checks do not certify every browser version or installed wrapper. Offline
search still requires previously cached content. When workers are unavailable,
loading/parsing a large existing script index still happens on the main thread;
its subsequent scan yields and can be cancelled.

Question banks, answers, question IDs, shuffled attempts and progress storage
schemas were not changed.
