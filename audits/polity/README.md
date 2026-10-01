# Original Practice Polity audit

Audited 22 chapters covering 4,052 questions in 248 sections. Revised 697 question entries across factual answers, scope, Hindi/English wording, explanations and distractors. Repeated instances are counted separately.

## Coverage and method

Every chapter received a question/answer review and consistency scan. Explanations and bilingual wording were reviewed where the factual scope or answer required attention. Every question passed structural checks: four distinct non-empty options in each language, exactly one bilingual answer match, and non-empty question/answer/explanation fields.

Corrections use constitutional provisions, NCERT and relevant official statutes, judgments and institutional records. Sources are recorded in the chapter manifests. This is an independently prepared practice bank; this audit does not claim an exact official SSC PYQ/key match for every question.

Chapter keys, section order/titles, question counts and positional question identifiers were retained. Repeated questions were retained for revision practice and corrected consistently where matched.

| Chapter | Questions reviewed | Entries revised |
| --- | ---: | ---: |
| 1. Constitutional Development of India | 117 | 31 |
| 2. Making of the Constitution | 160 | 41 |
| 3. Preamble & Features of the Constitution | 100 | 23 |
| 4. Sources, Parts, Articles & Schedules | 145 | 12 |
| 5. Union and Its Territories | 86 | 11 |
| 6. Citizenship | 113 | 33 |
| 7. Fundamental Rights | 215 | 31 |
| 8. Directive Principles of State Policy | 173 | 17 |
| 9. Fundamental Duties | 111 | 13 |
| 10. President of India | 205 | 23 |
| 11. Prime Minister & Council of Ministers | 195 | 27 |
| 12. Parliament of India | 384 | 70 |
| 13. State Executive | 230 | 25 |
| 14. State Legislature | 226 | 54 |
| 15. Supreme Court of India | 206 | 36 |
| 16. High Courts & Subordinate Courts | 297 | 41 |
| 17. Centre-State Relations | 140 | 23 |
| 18. Emergency Provisions | 136 | 15 |
| 19. Local Self-Government | 198 | 50 |
| 20. Official Language | 110 | 27 |
| 21. Constitutional Amendment | 163 | 26 |
| 22. Constitutional & Non-Constitutional Bodies | 342 | 68 |

## Validation

- Replaying all 22 manifests against the original master data reproduces the final corrected data.
- All 4,052 questions have valid bilingual fields and answer/option alignment.
- All 248 Polity search records contain the corrected questions, answers and explanations.
- All 1,559 other subject search records remain identical.
- The actual search worker was executed with its index loader; corrected-answer searches and versioned consumers passed. Browser UI testing was unavailable because a Chromium binary could not be downloaded in this environment.
- Shared search-worker versions, the Polity search update, Polity runtime, Random Mixed Polity data URL and service-worker cache were refreshed.

Run from the repository root:

```sh
node tools/apply-polity-chapter-audit.cjs
node tools/sync-polity-index.cjs
```

The first tool validates or applies the before/after records with concurrent-change protection. The sync tool generates `search-snippets-polity-original-practice.js`, which the shared worker applies after loading the existing base index. This replaces only matching Polity routes and leaves other subjects intact. The base file remains unchanged.
