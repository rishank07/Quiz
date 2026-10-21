# Chemistry mindmap audit

All ten Chemistry mindmaps were reconciled with the checked-in audited Original Practice Science source (4,718 Chemistry questions). No web search or external fact sources were used. No Original Practice question, option, answer, ID or saved-progress behavior was changed.

The correction plan records 475 sequential HTML edits, original/result Git blob hashes, the base commit, and exact supporting question/answer/explanation evidence. References use chapter:section:question with zero-based section/question indexes; cross-chapter Chemistry evidence is used where appropriate. The edit count includes repeated occurrences and refinements, not 475 separate factual errors.

Corrections cover BEC history, crust/air composition, mole/STP conventions, mixture and physical-change definitions, atomic-model history, particle tables, isotopes/spin, historical periodic groups, block exceptions, valency versus oxidation state, solubility, hydrogen bonding, balanced equations, catalysts/promoters, aerosols and Rayleigh scattering, acid tables and washing-soda hydration, metallurgy and amalgams, heavy water, organic series and detergent properties, drugs/fibres/glass, rubber and explosives, sweeteners, greenhouse gases, BOD and water-quality guidance, Bhopal and Oilzapper.

Main notes, tables and recall boxes are checked together. The original styles, scripts, IDs and tab structures are retained. Existing table styling is retained while fixing the aerosol row grouping and inaccurate particle/drinking-water data. Only the ten Chemistry search groups are regenerated; the integration check also compares every unrelated group with the base commit. Search revisions, PWA cache version and relevant sitemap dates are refreshed.

Where OP retains older shorthand beside a precise reviewed question, the precise question/answer is used as evidence. Water-quality criteria and approximate scientific values are reconciled with OP and labelled with their context; they were not independently verified as current external standards. This is reconciliation with audited OP, not independent verification of every chemistry fact.

## Validation

- `python3 tools/apply-chemistry-mindmap-audit.py` — exact replay, source fingerprint and evidence
- `python3 tools/sync-chemistry-mindmap-index.py --check` — scoped index consistency
- `EFP_TEST_JSDOM=/path/to/jsdom node tools/test-chemistry-mindmaps.cjs` — untouched index groups, template/script/ID preservation, table grids, all tabs, valid anchors, mobile/desktop search-highlight-clear behavior
- `python3 tools/install-analytics-guard.py`
- `node tools/test-analytics-guard.cjs`
- `git diff --check`

The workflow validates the audit branch before master publication and requires generated publication contents to remain clean on master. DOM checks do not replace a full visual browser inspection.
