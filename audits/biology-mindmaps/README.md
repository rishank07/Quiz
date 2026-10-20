# Biology mindmap audit

The ten existing Biology mindmaps were compared with the checked-in audited Original Practice Science source. The source fingerprint is recorded in corrections.json; its Biology section contains 4,010 questions. Existing page styles, scripts, IDs and tab structures are preserved. No external fact sources were used and no Original Practice question, option, answer, ID or saved progress was modified.

The plan records 200 sequential HTML edits, original and result Git blob hashes, and exact source question/answer/explanation evidence. References use chapter:section:question with zero-based section and question indexes. A reference may cite another Biology chapter when the audited explanation resolves a fact more precisely.

Corrections include taxonomic terminology, algal life cycles, gymnosperm exceptions, animal classification, cell comparisons, cork/guard cells/epithelium, vitamin deficiencies and food energy, gallstones, reflexes and joints, plant hormones, reproductive biology, genetic disorders and disease/pathogen distinctions. Repeated facts in tables and recall boxes are corrected as well as main notes.

Some Original Practice passages contain broad legacy shorthand alongside a more precise reviewed question. Where these differ, the specific reviewed question and its explanation are recorded as evidence; the source itself is unchanged. This is a reconciliation with audited OP, not a claim of independently verifying every biological fact.

## Validation

- python3 tools/apply-biology-mindmap-audit.py
- python3 tools/sync-biology-mindmap-index.py --check
- EFP_TEST_JSDOM=/path/to/jsdom node tools/test-biology-mindmaps.cjs
- python3 tools/install-analytics-guard.py
- node tools/test-analytics-guard.cjs

Only the ten Biology search groups are regenerated. Publication metadata updates search asset revisions, the PWA cache version and the relevant sitemap dates. GitHub Actions validates the audit branch before master publication; master must remain clean after the checks.
