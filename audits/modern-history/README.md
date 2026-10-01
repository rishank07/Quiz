# Modern History audit

All 13 chapters and 1,744 questions were reviewed. 682 questions were revised for facts, clarity, options, explanations or bilingual wording. This is a count of changed questions, not of factual errors.

| Chapter | Questions reviewed | Questions revised |
| --- | ---: | ---: |
| [1. Arrival of European Companies - यूरोपीय कंपनियों का आगमन](chapter-01.json) | 104 | 39 |
| [2. British Expansion in Indian Territories - भारतीय क्षेत्रों में ब्रिटिश विस्तार](chapter-02.json) | 162 | 25 |
| [3. The Revolt of 1857 - 1857 की क्रांति](chapter-03.json) | 102 | 20 |
| [4. Peasant Movements & Tribal Revolt - किसान आंदोलन और जनजातीय विद्रोह](chapter-04.json) | 109 | 23 |
| [5. Socio-Religious Reform Movement - सामाजिक-धार्मिक सुधार आंदोलन](chapter-05.json) | 155 | 52 |
| [6. Development of Press & Education - प्रेस और शिक्षा का विकास](chapter-06.json) | 110 | 69 |
| [7. Formation of Indian National Congress - भारतीय राष्ट्रीय कांग्रेस की स्थापना](chapter-07.json) | 103 | 58 |
| [8. Indian National Movement - भारतीय राष्ट्रीय आंदोलन](chapter-08.json) | 159 | 60 |
| [9. Gandhian Era_ First Phase - गांधीवादी युग_ प्रथम चरण](chapter-09.json) | 133 | 68 |
| [10. Phase of National Politics (1922-29) - राष्ट्रीय राजनीति का चरण (1922-29)](chapter-10.json) | 120 | 48 |
| [11. Gandhian Era_ Second Phase - गांधीवादी युग_ द्वितीय चरण](chapter-11.json) | 163 | 48 |
| [12. Towards Independence - स्वतंत्रता की ओर](chapter-12.json) | 145 | 87 |
| [13. Governor, Governor-General & Viceroy - गवर्नर, गवर्नर-जनरल और वायसराय](chapter-13.json) | 179 | 85 |

Each chapter manifest records the original and final question, the reason for the change and source references. Earlier applied revisions are retained so the workflow can apply supplements safely.

Validation confirms unchanged question counts, chapter and section order, four distinct options per language, and one exact bilingual answer key for every Modern question. Ancient and Medieval content was preserved.

The shared search index contains all 294 Modern section records and 1,744 questions. Its other 1,513 records were preserved. Mixed Practice loads the same History master data; its History request uses the content version to avoid reusing an older cached question bank.

Source priority was NCERT, an exact public official SSC key where available, matched Testbook questions, then official or academic corroboration. The source list is not a claim that every question was matched to an official SSC key. Ambiguous absolute claims, disputed dates and inconsistent attributions were narrowed or rewritten into independently answerable questions.

Run `node tools/apply-modern-chapter-audit.cjs` and `node tools/sync-modern-history-index.cjs` to validate/apply the manifests and synchronize consumers. Add `--commit` in the authorized GitHub workflow to push chapter content separately.
