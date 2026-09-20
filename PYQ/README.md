# ExamFusion Prep — PYQ PDF Library

The PYQ module now uses a PDF-link catalog only. It does not store extracted question-by-question PYQ data.

## Current model

- `data/pdf-catalog.json` — the single source of truth for exam → year → set/paper links.
- `pyq-app.js` — loads the catalog, powers instant search and filters, and opens a paper only after an explicit tap.
- `index.html` — searchable exam cards → filters → paper-card discovery UI.

Current catalog sections: SSC, Railway/RRB, UPSC CSE, BPSC, UPPCS and Banking.

## Add a paper

Add one object under the correct exam/year in `data/pdf-catalog.json` with:

- unique `id`
- user-facing `label`
- optional `set`, `stage`, `paper`, `date`
- `pdf` URL
- clear `source` note
- optional `answer_key`

Papers are searchable by exam, title, year, stage, paper, set, date, shift, language and source. No filter or selection auto-opens a PDF.

## Source rule

Prefer official commission/agency PDFs where a stable archive exists. For public mirrors, store links only rather than rehosting the PDF. Banking papers must be labelled `Memory-based` when the exam body does not publish an official paper archive.
