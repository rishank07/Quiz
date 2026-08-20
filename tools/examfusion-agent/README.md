# ExamFusion Prep QA Agent

Conservative QA automation for the ExamFusion Prep static HTML/GitHub Pages repository.

## What it checks

- broken local links/assets
- duplicate HTML IDs
- missing UTF-8 charset
- mojibake/broken encoding markers
- repeated question numbers across separate question cards
- exact duplicate complete question cards
- likely missing Hindi/English in quiz blocks
- stale `og:url` / canonical self-URLs after files are moved
- sitemap coverage
- configured search-index coverage
- optional AI semantic review for Hindi/English matching and answer/explanation consistency
- conservative AI text fixes through a Pull Request only

## Safety model

- **SAFE**: conservative structural issue that can be auto-fixed with `--fix-safe`.
- **REVIEW**: needs human review.
- **CRITICAL**: likely broken content/configuration or an incomplete AI pipeline.
- AI does not directly push to `master`.
- AI answer-key changes are blocked.
- Factual/current-affairs uncertainty is marked for web verification and is not auto-fixed.
- `Mind Maps/Computer/**` is intentionally excluded from AI auto-editing.

## Repository layout

```text
YOUR-REPO/
├── sitemap.xml
├── search-index-main.js
├── search-index.js
├── tools/
│   └── examfusion-agent/
└── .github/
    └── workflows/
        ├── examfusion-qa.yml
        ├── examfusion-ai-qa.yml
        ├── examfusion-safe-autofix.yml
        └── examfusion-ai-autofix.yml
```

## GitHub secret

Only one secret is required for the default OpenRouter setup:

```text
EXAMFUSION_AI_API_KEY
```

Create it at:

`Repository → Settings → Secrets and variables → Actions → New repository secret`

The OpenRouter base URL and model are already defined in `config.yml`. Environment variables
`EXAMFUSION_AI_BASE_URL` and `EXAMFUSION_AI_MODEL` remain optional non-empty overrides.

## Workflows

### ExamFusion QA

Runs automatically on pushes to `master`, on pull requests, and manually. It performs the
full structural scan and uploads `examfusion-qa-report`.

### ExamFusion AI Auto-Fix PR

Runs automatically when HTML outside `Mind Maps/Computer/**` is pushed to `master`.
On push it scans only HTML files changed since the previous commit, which protects the free AI
quota. High-confidence text-only fixes are placed on a new branch and proposed as a Pull Request;
nothing is written directly to the live branch.

It can also be started manually; a manual run performs a full-repository AI pass.

### ExamFusion AI QA

Manual full-repository AI audit with no repository write permission. Download the
`examfusion-ai-qa-report` artifact to inspect findings. Large repositories progress across
repeated runs because cached candidates are skipped before the per-run uncached-item limit is applied.

### ExamFusion Safe Auto-Fix PR

Manual structural safe-fix workflow. It can currently add a missing UTF-8 charset while preserving
existing page formatting and proposes the change through a Pull Request.

## Local commands

From the repository root:

```bat
python -m pip install -r tools\examfusion-agent\requirements.txt
python tools\examfusion-agent\agent.py --repo . --config tools\examfusion-agent\config.yml --report-dir examfusion-qa-report --no-ai
```

Manual AI audit locally:

```bat
set EXAMFUSION_AI_API_KEY=YOUR_KEY
python tools\examfusion-agent\agent.py --repo . --config tools\examfusion-agent\config.yml --report-dir examfusion-qa-report --ai
```

Changed-files AI audit, for example from a known earlier commit:

```bat
python tools\examfusion-agent\agent.py --repo . --config tools\examfusion-agent\config.yml --report-dir examfusion-qa-report --ai --changed-from COMMIT_SHA
```

## OpenRouter defaults

```yaml
default_base_url: "https://openrouter.ai/api/v1"
default_model: "nvidia/nemotron-3-ultra-550b-a55b:free"
fallback_model: "openrouter/free"
batch_size: 25
max_ai_items_per_run: 1000
max_request_attempts_per_run: 45
```

The fixed Nemotron model is used first for consistent QA. `openrouter/free` is the fallback.
The cache is stored in `.examfusion-qa-cache/` and restored by GitHub Actions.

## Free-quota behavior

- structural checks use no AI requests
- duplicate AI triggers for the same block are merged
- up to 1,000 **uncached** candidates are selected per full run
- cached items no longer consume that 1,000-item selection window
- up to 25 candidates are batched per request
- the hard request-attempt guard is 45
- subsequent full runs continue with the next uncached candidates
- automatic push runs inspect changed HTML only

## Important review rule

A Pull Request created by the agent is a proposal, not an approval. Review its diff before merging,
especially for current affairs, factual explanations, or source-specific wording.

Version: 1.2-audited
