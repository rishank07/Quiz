# ExamFusion Prep — PYQ Data Module

This module keeps Previous Year Questions separate from Original Practice so the main practice engine remains small and fast.

## Storage model

- `data/manifest.json` — tiny catalog loaded first.
- `data/<exam>/<year>.json` — one lazy-loaded year chunk.
- `data/schema.json` — normalized record contract.
- `data/_template.json` — ingestion example only; it is never listed as live data.
- `pyq-app.js` — common renderer/search/answer engine.

Supported exam ids: `bpsc`, `upsc`, `ssc`, `railway`, `banking`.

## Add a year

1. Create `PYQ/data/<exam>/<year>.json` following `_template.json`.
2. Preserve original paper/date/shift metadata where available.
3. Keep provenance on every question. Prefer official sources; mark reconstructed papers as `memory-based` rather than `official`.
4. Push the file. `.github/workflows/update-pyq-manifest.yml` validates the chunk and automatically refreshes counts/availability in `manifest.json`.

## Performance rule

Never create one giant all-exams JSON file. The browser must load only the selected exam/year chunk. A separate compact search index can be generated later if global full-text PYQ search is needed.

## Deduplication rule

Question `id` must be unique within a year chunk. Cross-shift duplicates may be retained only when their exam/shift provenance is meaningful; otherwise future ingestion tooling should canonicalize the question and preserve multiple appearances as metadata.

## Source rule

Do not copy or rehost third-party coaching PDFs merely because they are publicly downloadable. Store source/provenance metadata and use official, licensed, user-supplied, or clearly labelled memory-based material as appropriate.
