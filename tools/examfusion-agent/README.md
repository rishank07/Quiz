# ExamFusion Structural QA

This repository contains a lightweight structural QA scanner only. It does not use any external model/API and it never edits or commits website files.

It checks HTML encoding/title basics, duplicate IDs, broken local links/assets, question-number anomalies, exact duplicate question cards, likely missing bilingual text, self-URL mismatches, sitemap coverage, and search-index coverage.

## Automatic GitHub check

`.github/workflows/examfusion-qa.yml` runs the scanner on pushes to `master`, pull requests, and manual workflow dispatch. The workflow has read-only repository permission and uploads `examfusion-qa-report` as an artifact.

## Local run

```bat
cd /d D:\projects\Quiz
python -m pip install -r tools\examfusion-agent\requirements.txt
python tools\examfusion-agent\agent.py --repo . --config tools\examfusion-agent\config.yml --report-dir examfusion-qa-report
```

`examfusion-qa-report/` is ignored by Git. Review findings before changing source content.
