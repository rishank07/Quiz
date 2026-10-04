# Search product audit — 4 October 2026

The reported Nitish search and missing yellow controls reproduced two different retrieval/display contracts. Homepage completion also depended on timers rather than completion of its sources.

## Findings and fixes

| Finding | Resulting behavior |
| --- | --- |
| Homepage declared completion after 20 seconds or after only the book/mindmap pipeline | Completion waits for both pipelines. Slow searches remain visibly in progress. A failed source shows incomplete-search status and a retry button instead of a false zero result. |
| Short worker startup timeouts and permanently disabled failed sources | Startup allows up to 60 seconds; response waits are bounded to 30 seconds. Failed sources can be retried. Query cancellation remains separate from failure. |
| Rapid Practice index was requested with the wrong global in Home and its own hub | Both loaders now use `EF_SNIPPET_INDEX_RAPID`, validated against the real index. |
| Full-text search included distractor options; reader adapters included only the correct answer | GS, English and Rapid adapters include all options. The control appears for option-only matches; preview is explicit and does not answer the question. |
| Polity's Nitish mindmap record contained outdated text without its tab anchor | Regenerated all 241 existing mindmap groups from current HTML, with full text coverage and 41,670 validated panel anchors. Old unanchored links resolve their matching panel on entry. |
| Decoration depended entirely on a sessionStorage return snapshot | Result URLs carry a bounded `efSearchQuery` fallback. GS/English URL rewriting preserves it. Existing return/resume snapshots remain authoritative. |
| Overlapping sources could fill the global cap with duplicate routes | Merge removes duplicate destinations before applying the limit. Presentation ignores query/return markers when identifying duplicate routes. |
| Zero-match sources were downloaded again on repeat queries | Successful empty result lists use the bounded result cache. Failed and cancelled searches are not cached as empty. |
| The largest banks ran before compact sources | Compact subject/mindmap sources run earlier; ranking still uses relevance. The shared homepage queue retains at most one worker. |
| Previous scroll tests expected entry focus on the text | Regression expectations now verify the existing requested inline-control centering; explicit preview still scrolls to the matched text. |

## Validation

- Real 18-source homepage test: cold and repeated/case-varied Nitish searches produced the same 32 unique result routes, with no failed sources and at most one active worker.
- Real Static GK screenshot route: yellow control, explicit option preview, dismissal, and unchanged answers, score and shuffle.
- Real unanchored Polity State Executive route: opens `#compare`, highlights Nitish, and retains dismissal after page restore.
- GS/English/Rapid option-only fixtures, bilingual matching, hidden explanations, lazy chapter/set navigation and wrapped result navigation.
- Existing search-return, installed-app home-return and cold-resume tests; ordinary browsers keep their existing resume policy.
- PDF desktop/mobile behavior, missing/wrong text-index recovery, exact page links, highlights and dismissed/resumed context.
- Worker/fallback ranking parity, bounded 100k-candidate selection, 256 KiB result-cache bound, gzip/plain search-index caching and offline/revision behavior.
- `sync-history-mindmap-index.py --all --check`, syntax checks and `git diff --check`.

Tests use real repository content with simulated DOM/layout/navigation. Physical Android/Windows devices and Chromium layout were not verified in this environment. Cold searches still download the existing large corpora progressively; displayed completion now distinguishes that work from a finished search.

Question banks, answer keys, question IDs and progress storage schemas were not edited.
