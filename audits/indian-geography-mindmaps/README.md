# Indian Geography mind-map audit

All 17 Indian Geography chapters use the uploaded Original Practice Geography material as the content authority. World Geography and the Original Practice HTML are outside the edit scope.

The prior completed audit was recovered from Git blob `145a1777b6558fdaf02ece2dabcf99c5203bb695` after the local execution environment disappeared. Its corrected visible text was reconstructed in the original chapter templates. Table-cell boundaries were reviewed separately. Recovery also corrected broad-replacement artefacts involving the coal carbon-content header, alluvial-soil abundance, HINDALCO and the Leh city label; retained Australia's lithium-production entry; restored separate tribal and tributary pills; and moved Agartala to the south-of-Tropic list.

`corrections.json` records each exact HTML edit, original and result Git blob fingerprints, and the unchanged Original Practice source fingerprint. Offsets count Unicode code points. Replaying these patches against their recorded original blobs reproduces every committed chapter exactly.

Validation:

```sh
python tools/apply-indian-geography-mindmap-audit.py
python tools/sync-history-mindmap-index.py --indian-geography --check
EFP_TEST_JSDOM=/path/to/jsdom node tools/test-indian-geography-mindmaps.cjs
```

The GitHub Actions workflow runs these checks plus the analytics-guard installer and tests in an isolated fixture containing the changed tracked HTML pages. DOM checks cover table rowspans, unique/preserved IDs, unchanged styles/scripts, every chapter tab, snippet anchors and mobile/desktop search/highlight/clear flows.

The homepage, mind-map search loader, service worker and sitemap are refreshed with the chapter changes.
