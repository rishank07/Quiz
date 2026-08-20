# ExamFusion Prep QA Agent

A conservative QA agent for a static HTML/GitHub Pages exam-prep repository.

## What it checks

- broken local links/assets
- duplicate HTML IDs
- missing UTF-8 charset
- obvious mojibake/broken encoding markers
- suspicious repeated question numbers
- exact duplicate question blocks
- likely missing Hindi/English in quiz blocks
- sitemap coverage
- configured search-index coverage
- optional AI semantic review for bilingual matching and answer/explanation consistency
- optional conservative AI text auto-fix into a Pull Request (no direct production overwrite)

## Safety model

- **SAFE**: conservative structural issue; can be auto-fixed with `--fix-safe`.
- **REVIEW**: needs human review.
- **CRITICAL**: likely broken content/link/duplicate or encoding issue.
- AI never directly changes factual answers in this v1. It reports a suggested fix.
- Items needing fresh factual verification are marked `needs_web_verification=true`.

## Install in your website repository

Copy this whole folder into:

```text
tools/examfusion-agent/
```

Then copy the three workflow files from `.github/workflows/` into your website repository's own:

```text
.github/workflows/
```

Result:

```text
YOUR-WEBSITE-REPO/
├── Quiz/
├── sitemap.xml
├── search-index-main.js
├── search-index.js
├── tools/
│   └── examfusion-agent/
│       ├── agent.py
│       ├── config.yml
│       ├── requirements.txt
│       └── examfusion_agent/
└── .github/
    └── workflows/
        ├── examfusion-qa.yml
        ├── examfusion-ai-qa.yml
        ├── examfusion-safe-autofix.yml
        └── examfusion-ai-autofix.yml
```

## Local test on Windows

From your website repo root:

```bat
py -m pip install -r tools\examfusion-agent\requirements.txt
py tools\examfusion-agent\agent.py --repo . --config tools\examfusion-agent\config.yml --report-dir examfusion-qa-report --no-ai
```

Open:

```text
examfusion-qa-report/report.md
```

## Enable AI review

Edit `tools/examfusion-agent/config.yml`:

```yaml
ai:
  enabled: true
```

For local Windows CMD:

```bat
set EXAMFUSION_AI_API_KEY=YOUR_KEY
set EXAMFUSION_AI_BASE_URL=YOUR_OPENAI_COMPATIBLE_BASE_URL
set EXAMFUSION_AI_MODEL=YOUR_MODEL_NAME
py tools\examfusion-agent\agent.py --repo . --config tools\examfusion-agent\config.yml --report-dir examfusion-qa-report --ai
```

The endpoint is configurable and may be any OpenAI-compatible `/chat/completions` API. This makes the agent usable with different API providers/models without changing the scanner code.

## GitHub secret setup

In your GitHub repository:

`Settings → Secrets and variables → Actions → New repository secret`

Add:

```text
EXAMFUSION_AI_API_KEY
EXAMFUSION_AI_BASE_URL
EXAMFUSION_AI_MODEL
```

Only the API key is normally sensitive. The other two can also be stored as secrets for convenience.

## How to run on GitHub

### Automatic structural QA

The **ExamFusion QA** workflow runs on pushes and pull requests and uploads a QA report artifact.

### Manual AI audit

Go to:

`GitHub repo → Actions → ExamFusion AI QA → Run workflow`

Download the `examfusion-ai-qa-report` artifact and read `report.md`.

### Safe auto-fix

Go to:

`GitHub repo → Actions → ExamFusion Safe Auto-Fix PR → Run workflow`

If conservative structural changes are needed, the workflow creates a new branch and Pull Request. Review the diff and merge it yourself.

## Important configuration for ExamFusion

`tracked_roots` defaults to `Quiz`. Add more directories if needed:

```yaml
tracked_roots:
  - Quiz
  - Books
  - Mind Maps
```

If a search-index file is in a subfolder, put its repo-relative path in `search_index_files`.

## Recommended rollout

1. Run `--no-ai` first and inspect false positives.
2. Adjust `tracked_roots`, `exclude_globs`, and index paths.
3. Enable AI only after structural scan looks clean.
4. Keep factual/current-affairs changes review-only.
5. Use the safe auto-fix PR workflow instead of direct writes to the production branch.

## AI auto-fix mode

After you trust the reports, run:

`GitHub repo → Actions → ExamFusion AI Auto-Fix PR → Run workflow`

The agent may apply exact text-only corrections when the model identifies a bilingual/content mismatch. Safety guards block:

- HTML tag modifications
- answer-key text changes
- fixes that require web/factual verification
- ambiguous find/replace patches that match zero or multiple places
- unusually large replacements

All changes go to a Pull Request for your review; they are not pushed directly to the live branch.

## Free OpenRouter mode (v1.1)

This build is preconfigured for OpenRouter's free tier. You only need an OpenRouter API key for the default setup:

```text
EXAMFUSION_AI_API_KEY = your OpenRouter key
```

Defaults already included in `config.yml`:

```yaml
default_base_url: "https://openrouter.ai/api/v1"
default_model: "nvidia/nemotron-3-ultra-550b-a55b:free"
fallback_model: "openrouter/free"
batch_size: 25
max_request_attempts_per_run: 45
```

The model and base URL environment variables remain optional overrides. If you do not create those two GitHub secrets, the defaults above are used.

### How the free-quota optimizer works

1. Structural Python checks run first and cost no AI requests.
2. The same question block triggered by multiple checks is deduplicated.
3. Up to 25 suspicious blocks are reviewed in one AI request.
4. Up to 1,000 unique suspicious blocks are considered per run.
5. A hard guard stops after 45 request attempts, leaving headroom under a 50-request/day free account limit.
6. Results are cached by model + exact question content. Unchanged blocks are not sent again.
7. GitHub Actions restores `.examfusion-qa-cache/` between runs.

With the default configuration, 1,000 uncached suspicious blocks normally require about 40 successful AI requests. If most content is unchanged, later runs can require far fewer calls.

### Why a fixed free model is the default

`openrouter/free` may route different requests to different available free models. For QA consistency, this build first uses the fixed free `NVIDIA Nemotron 3 Ultra` endpoint and falls back to `openrouter/free` only when necessary.

### Quality warning

Free models can be very strong, but do not treat them as a guaranteed replacement for a current premium ChatGPT model. Keep answer-key changes and fresh factual/current-affairs claims review-only. The agent's auto-fix safety rules intentionally block those changes.

Version: 1.1-free-batched
