# ExamFusion Prep — PYQ PDF Library

The PYQ module now uses a PDF-link catalog only. It does not store extracted question-by-question PYQ data.

## Current model

- `data/pdf-catalog.json` — the single source of truth for exam → year → set/paper links.
- `pyq-app.js` — loads only the small catalog and opens the selected paper directly.
- `index.html` — Exam → Year → Set/Paper UI.

Current catalog sections: BPSC, UPSC CSE, SSC CGL and Banking (IBPS Clerk).

## Add a paper

Add one object under the correct exam/year in `data/pdf-catalog.json` with:

- unique `id`
- user-facing `label`
- optional `set`, `stage`, `paper`, `date`
- `pdf` URL
- clear `source` note
- optional `answer_key`

If a year contains one paper, selecting that year opens it directly. If a year has multiple sets/papers, the Set/Paper dropdown is shown and selecting an item opens it.

## Source rule

Prefer official commission/agency PDFs where a stable archive exists. For public mirrors, store links only rather than rehosting the PDF. Banking papers must be labelled `Memory-based` when the exam body does not publish an official paper archive.
