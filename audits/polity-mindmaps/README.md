# Polity mind-map audit — 20 October 2026

All 22 existing mind maps were compared with the supplied audited
`Original Practice/Polity_Complete_Practice.html` (4,052 bilingual questions).
The uploaded HTML's master data matches the repository's OP, and the uploaded
ZIP's 22 chapter pages match their repository versions after newline
normalisation. No external factual source or web research was used.

`corrections.json` records 288 replacement rules, chapter-local OP section and
question references (`SxQy`), source question/answer/explanation excerpts,
source and before/after fingerprints, and exact sequential replay patches.
The rule count is not a count of distinct factual errors. Repeated claims in
main notes, tables, traps and revision cards were checked together.

Corrections cover the RBI's founding legislation; constitution-making dates,
people and case-law claims; Preamble and constitutional sources; Article 3
consultation and Andhra State; citizenship and CAA residence requirements;
Fundamental Rights and DPSP amendments; presidential/ministerial powers;
Parliament's composition, committees and public funds; State executive and
legislative rules; judicial appointments, retirement and jurisdiction;
Centre–State relations; emergency provisions; local government elections and
municipal categories; official language; amendments; and constitutional and
statutory bodies. Appointment-related facts are dated where the OP supplies
appointment dates rather than presented as newly verified live officeholders.

Existing page paths, IDs, inline CSS, scripts, navigation, table structures and
card containers remain intact. Existing correct facts remain in place. OP
questions, answer keys, IDs, saved progress and bookmarks are not edited.
Only the 22 Polity groups in `search-snippets-mindmaps.js` are regenerated;
other groups retain their content. The homepage and mind-map hub load the new
index revision, and the service-worker cache revision is advanced. Sitemap
last-modified dates are added for the 22 chapters and mind-map hub.

## Validation

- All source references exist; OP and page fingerprints are checked.
- Cold replay of all 288 rules on the uploaded original chapters exactly
  reproduces every reviewed output fingerprint.
- All 22 pages retain their IDs, inline scripts and CSS; table column counts
  and card/container counts were checked against the originals.
- `tools/test-polity-mindmaps.cjs`: 240 tab actions and 44 mobile/desktop DOM
  search, highlighted-deep-link and clear flows; valid search anchors;
  consistent tables; verification analytics excluded.
- Analytics guard installer: 333 tracked pages, no changes required.
- Analytics isolation and service-worker cache tests pass, including gzip and
  plain storage, revision refresh and lossless offline reads.
- Polity index synchronisation check and `git diff --check` pass.

These are DOM behaviour and structural checks; browser-rendered visual
inspection is not claimed. Set `EFP_TEST_JSDOM` to a local jsdom installation
when the repository does not provide that dependency.

Run `python tools/apply-polity-mindmap-audit.py --check` for a read-only output
and source fingerprint check. Without `--check`, the tool replays only on the
reviewed original input and refuses concurrent changes.
