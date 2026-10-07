# ExamFusion Prep content preferences

## Explanation highlighting

- Highlight only the main answer-bearing facts: important names, places, dates, numerical values, ranks, acronyms and essential terms.
- Keep explanatory sentences and connecting text in the normal text colour. Never wrap an entire explanation, paragraph or full sentence in yellow merely because it is an explanation.
- A short proper name or a compact answer phrase may be highlighted as a unit; do not highlight surrounding filler words.
- Apply this consistently in Hindi and English, on topic pages and quiz explanations, while preserving the existing design.
- When updating content, check the highlight spans before publishing. Preserve question counts, answer keys, question IDs and saved progress unless the user requests a change.

This is a standing user preference, explicitly requested on 2026-10-03.

## Exclude assistant verification from Google Analytics

- Before opening a live ExamFusion page for Work Mode verification, enter the
  target URL with `efpWorkPreview=1`. The early analytics guard persists that
  exclusion in the assistant's browser across subsequent pages and tabs.
- Local and hosted previews outside `examfusionprep.com` and
  `www.examfusionprep.com` are automatically excluded. Never treat a ChatGPT
  referrer as preview traffic: genuine visitors can arrive from ChatGPT.
- Browser test scripts must block Google Analytics and Google Tag Manager
  requests before their first navigation, including when testing old builds.
- Run `python tools/install-analytics-guard.py` after adding/changing tracked
  HTML or the guard source, then `node tools/test-analytics-guard.cjs`.
- Keep the guard before GA on every tracked HTML page; service-worker injection
  alone misses the first visit. Owner Debug OFF must not override preview mode.

This is a standing user preference, explicitly requested on 2026-10-07.
