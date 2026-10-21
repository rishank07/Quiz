# Physics mindmap audit

All thirteen Physics mindmaps were reconciled with the checked-in audited Original Practice Science source (4,821 Physics questions). No external fact sources were used. No Original Practice question, option, answer, ID or saved-progress behavior was changed.

The correction plan records 404 sequential HTML edits, original/result Git blob hashes, and exact supporting question/answer/explanation evidence. References use chapter:section:question, with zero-based section and question indexes; references can cross Physics chapters when needed. The count includes repeated occurrences and refinements of the same statement, not 404 distinct factual errors.

Corrections cover SI history, motion assumptions and graph interpretation, friction and levers, work and energy signs, geostationary and escape conditions, flotation, Bernoulli assumptions, temperature conversions, pendulum limitations, sound and intensity, resistor and cell tables, magnetic force/flux, rainbow optics, eye power, semiconductor mechanisms, astronomical history, white-dwarf mass limits and Indian space missions. Main notes, tables and recall boxes are checked together. Time-sensitive moon counts are explicitly attributed to the OP snapshot rather than presented as independently verified current counts.

Original page styles, scripts, IDs, tabs and the table layout conventions are retained. The electric-cell table keeps six columns while correcting each cell’s individual classification and electrode chemistry. Only the thirteen Physics search groups are regenerated. Search revisions, PWA cache version and relevant sitemap dates are refreshed.

Some OP passages retain legacy shorthand beside more precise reviewed questions. The specific reviewed question and explanation are recorded when resolving these conflicts. This is reconciliation with audited OP, not independent verification of every physical fact.

## Validation

- `python3 tools/apply-physics-mindmap-audit.py` — exact replay, source fingerprint and evidence
- `python3 tools/sync-physics-mindmap-index.py --check` — scoped index consistency
- `EFP_TEST_JSDOM=/path/to/jsdom node tools/test-physics-mindmaps.cjs` — template/script/ID preservation, table grids, all tabs, search anchors and mobile/desktop highlight/clear behavior
- `python3 tools/install-analytics-guard.py`
- `node tools/test-analytics-guard.cjs`
- `git diff --check`

The workflow validates the audit branch before master publication and requires generated publication contents to remain clean on master. DOM checks do not replace a full visual browser inspection.
