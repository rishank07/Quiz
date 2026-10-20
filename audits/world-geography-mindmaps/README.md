# World Geography mind-map audit

All 29 World Geography pages have been compared against the audited Geography Original Practice data, in two publication batches: chapters 1–15 and chapters 16–29. The original practice question bank and completed Indian Geography changes are preserved.

The correction plan records 1056 exact sequential HTML patches, original/result Git blob identities and the OP question, answer and explanation for each correction. Statistical rankings are labelled with their source year and metric; settlement definitions, total/native speaker counts, resources/reserves and physical-geography records retain the necessary qualifiers. Historical racial classifications are identified as obsolete rather than taught as biological divisions.

The validation workflow checks exact replay and source citations, unchanged IDs/scripts/styles, table structure, chapter tabs, search anchors and mobile/desktop highlight/clear flows, and analytics isolation. The index synchronizer touches only the 29 reviewed World Geography chapter groups. Publication cache versions, homepage/hub loaders and sitemap dates are updated together.

The supplied ZIP is retained as a reference; this run uses current GitHub chapter templates because local ZIP extraction is unavailable. No claim of ZIP byte equivalence is made.

Validation command set:
- `python3 tools/apply-world-geography-mindmap-audit.py`
- `python3 tools/sync-world-geography-mindmap-index.py --check`
- `node tools/test-world-geography-mindmaps.cjs`
- `python3 tools/install-analytics-guard.py`
- `node tools/test-analytics-guard.cjs`
