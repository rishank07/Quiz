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


## Current Affairs format consistency

- For monthly and topic-wise Current Affairs changes, reuse the corresponding established reading and rapid-practice templates. For topic-wise reading, match `Current Affairs/Topic Names/2026/Topic Wise/APPOINTMENT2026.html`: its header, subtitle, question cards, options, explanation headings, spacing and responsive CSS. Change the topic title only; do not invent a hero box, numbering chips, header counts or a new design.
- Reading headers contain the topic/year/current-affairs title and the existing bilingual/exam subtitle only.
- Explanations use meaningful subject/fact labels in bold followed by the fact, with matched English and Hindi bullet lists. Do not prepend repeated generic “Answer:”, “Answe” or “उत्तर:” bullets to every explanation. Preserve all relevant explanation facts and qualifiers.
- Keep one ordered list of paired English/Hindi facts and generate both reading and quiz explanations from it. Match bullet counts, meaning, names, dates, numbers and emphasis. Highlight short answer-bearing facts only; keep labels, bullet markers and ordinary explanatory text in normal colours.
- Keep question IDs, quiz section/index positions, storage keys, answer options and saved progress stable on formatting updates. Update the affected search text and cache version alongside the page. Verify reading/quiz parity and representative mobile/desktop views before pushing.

This records the existing detailed Current Affairs prompt and the user's format correction on 2026-10-30.
