# Economics mind map audit — 20 October 2026

Corrects the 19 existing Economics mind maps against the supplied audited
`Original Practice/Economics_Complete_Practice.html` (2,115 questions). The
uploaded ZIP matches the repository's starting mind maps after CRLF/LF
normalisation. No web research or external factual source was used.

`corrections.json` records each replacement, its section/question references
(`SxQy`) within the corresponding OP chapter, the OP source fingerprint, and
before/after fingerprints for every page. There are 845 replacement rules;
this is an editing-rule count, not a count of distinct factual errors.
Repeated facts in topic panels, exam traps and quick-reference tables are
corrected together. Existing correct material, page names, panel IDs, scripts,
styles and navigation remain in place.

The corrections include demand/supply terminology; sector shares and dated
rankings; HDI/PQLI; national-income definitions, base years and formulas;
planning; poverty and employment measurement; money aggregates, price-index
series and monetary tools; banking and NBFC rules; market instruments; fiscal
and tax concepts; GST; trade/BOP/FDI; agriculture; industrial indices and PSU
criteria; scheme eligibility and status; international institutions; Census
2011 figures; committees; certification marks and report publishers.

Undated bank branch counts not supported by the audited OP were removed from
the bank table. The OP does not supply the new ICI refinery-products or iron-ore
weights: these cells remain `—`; no numerical values were inferred. Dated
facts retain their OP reference periods rather than being treated as live data.

Only the 19 Economics groups in `search-snippets-mindmaps.js` are regenerated.
Other subjects' index groups and all index chapter metadata retain their bytes.
The mind map hub and homepage loader use the new index revision; the service
worker cache revision is advanced. Existing progress, bookmarks, owner-state
storage and OP questions/answers are untouched. Sitemap dates were checked for the changed mind maps and hub and were already
current (20 October 2026).

## Validation

- Source and output fingerprints, valid OP question references, and reproducible
  replay of the correction plan on the original pages.
- The 19 pages retain their original inline CSS, scripts and existing IDs.
- `tools/test-economics-mindmaps.cjs`: 270 tab actions and 38 mobile/desktop DOM
  search, highlighted deep-link and clear flows; valid index anchors; consistent
  table columns; analytics excluded during verification.
- `tools/test-analytics-guard.cjs`: live/preview isolation and guard placement.
- `tools/test-search-index-cache.cjs`: revision refresh, gzip/plain compatibility
  and lossless offline reads.
- `python tools/sync-history-mindmap-index.py --economics --check` and
  `git diff --check`.

The DOM checks cover behaviour and structure; no new browser-rendered visual
inspection is claimed. Run the Node tools with `EFP_TEST_JSDOM` pointing to a
local jsdom installation when jsdom is not installed in the repository.

The apply tool is fingerprint guarded: it recognises the reviewed output,
can replay on the original input, and refuses unexpected concurrent content.
Use `--check` for a read-only fingerprint check.
