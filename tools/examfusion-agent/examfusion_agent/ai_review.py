from __future__ import annotations

import hashlib
import json
import os
import re
import time
from pathlib import Path
from typing import Iterable

import requests

SYSTEM_PROMPT = r"""
You are ExamFusion Prep's conservative QA reviewer for competitive-exam HTML content.
Audit ONLY the supplied blocks. Do not invent errors.
For each block, check:
1) Hindi and English question meanings match.
2) Hindi and English options match and no language is accidentally missing.
3) Marked correct answer is internally consistent with the explanation.
4) Hindi and English explanations convey the same factual meaning.
5) Obvious duplicates, malformed/broken text, or nonsensical options.

For any correction, create TEXT-ONLY exact find/replace patches copied from that block.
- Never include '<' or '>' in find/replace.
- 'find' must be an exact substring that appears in the supplied HTML block.
- Preserve wording that is already correct.
- Do not change the marked correct answer based only on memory.
- For a factual/current-affairs uncertainty, set needs_web_verification=true and return no patch that changes the factual answer.
- Return exactly one result for every supplied item id.

Return JSON only in this shape:
{
  "results": [
    {
      "id": 1,
      "status": "ok" | "issue",
      "severity": "review" | "critical",
      "summary": "short description",
      "needs_web_verification": true | false,
      "patches": [
        {"find": "exact old text", "replace": "exact corrected text", "reason": "short reason"}
      ]
    }
  ]
}
""".strip()

ANSWER_KEY_RE = re.compile(r"correct\s*answer|सही\s*उत्तर|answer\s*[:=-]", re.I)


def _extract_json(text: str):
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:].strip()
    start_candidates = [x for x in (text.find("{"), text.find("[")) if x >= 0]
    if not start_candidates:
        raise ValueError("No JSON object/array found in model response")
    start = min(start_candidates)
    end = max(text.rfind("}"), text.rfind("]"))
    if end <= start:
        raise ValueError("Incomplete JSON in model response")
    return json.loads(text[start:end + 1])


def _candidate_key(candidate: dict, model: str) -> str:
    payload = "\n".join([
        model,
        str(candidate.get("file", "")),
        str(candidate.get("block", "")),
        str(candidate.get("reason", "")),
        str(candidate.get("text", "")),
        str(candidate.get("html", "")),
    ])
    return hashlib.sha256(payload.encode("utf-8", errors="replace")).hexdigest()


def _load_cache(path: Path) -> dict:
    try:
        if path.exists():
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                return data
    except Exception:
        pass
    return {}


def _save_cache(path: Path, cache: dict):
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        # Cache failure must never break QA.
        pass


def _dedupe_candidates(candidates: Iterable[dict]) -> list[dict]:
    """Merge repeated AI triggers for the same file/question block."""
    merged: dict[tuple, dict] = {}
    order: list[tuple] = []
    for c in candidates:
        key = (c.get("file"), c.get("block"), c.get("html") or c.get("text", ""))
        if key not in merged:
            merged[key] = dict(c)
            merged[key]["reason"] = str(c.get("reason", ""))
            order.append(key)
        else:
            reasons = {x.strip() for x in str(merged[key].get("reason", "")).split(",") if x.strip()}
            reasons.add(str(c.get("reason", "")).strip())
            merged[key]["reason"] = ",".join(sorted(x for x in reasons if x))
    return [merged[k] for k in order]


def _make_batches(items: list[dict], batch_size: int, max_batch_chars: int, max_chars_per_item: int):
    batch: list[dict] = []
    chars = 0
    for item in items:
        text = str(item.get("text", ""))[:max_chars_per_item]
        html = str(item.get("html") or item.get("text", ""))[:max_chars_per_item]
        est = len(text) + len(html) + 500
        if batch and (len(batch) >= batch_size or chars + est > max_batch_chars):
            yield batch
            batch = []
            chars = 0
        batch.append(item)
        chars += est
    if batch:
        yield batch


def _post_batch(base: str, key: str, model: str, fallback_model: str, batch: list[dict], ai: dict,
                max_chars: int, request_counter: dict) -> dict:
    request_items = []
    for idx, c in enumerate(batch, start=1):
        request_items.append({
            "id": idx,
            "file": c.get("file"),
            "block": c.get("block"),
            "reason": c.get("reason"),
            "visible_text": str(c.get("text", ""))[:max_chars],
            "html_block": str(c.get("html") or c.get("text", ""))[:max_chars],
        })

    prompt = "Audit these independent ExamFusion question/content blocks:\n\n" + json.dumps(
        request_items, ensure_ascii=False, separators=(",", ":")
    )

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "HTTP-Referer": ai.get("http_referer", "https://examfusionprep.com/"),
        "X-Title": ai.get("app_title", "ExamFusion QA Agent"),
    }

    models = [model]
    if fallback_model and fallback_model != model:
        models.append(fallback_model)

    timeout = int(ai.get("timeout_seconds", 120))
    max_attempts = int(ai.get("max_request_attempts_per_run", 45))
    last_error = None

    for chosen_model in models:
        if request_counter["attempts"] >= max_attempts:
            raise RuntimeError(f"Free-quota guard stopped AI calls after {max_attempts} attempts")
        request_counter["attempts"] += 1
        payload = {
            "model": chosen_model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0,
        }
        try:
            r = requests.post(
                f"{base}/chat/completions",
                headers=headers,
                json=payload,
                timeout=timeout,
            )
            if r.status_code in (429, 502, 503, 504):
                last_error = RuntimeError(f"HTTP {r.status_code}: {r.text[:300]}")
                # A short pause can help transient free-provider congestion, but do not
                # repeatedly burn the daily request budget.
                time.sleep(float(ai.get("transient_backoff_seconds", 2)))
                continue
            r.raise_for_status()
            data = r.json()
            content = data["choices"][0]["message"]["content"]
            parsed = _extract_json(content)
            if isinstance(parsed, list):
                return {"results": parsed, "model_used": chosen_model}
            if not isinstance(parsed, dict):
                raise ValueError("Model returned non-object JSON")
            parsed["model_used"] = chosen_model
            return parsed
        except Exception as e:
            last_error = e
            continue

    raise last_error or RuntimeError("AI request failed")


def review_candidates(candidates: Iterable[dict], cfg: dict, repo_root: Path | None = None) -> list[dict]:
    ai = cfg.get("ai", {})
    if not ai.get("enabled"):
        return []

    key_env = ai.get("api_key_env", "EXAMFUSION_AI_API_KEY")
    base_env = ai.get("base_url_env", "EXAMFUSION_AI_BASE_URL")
    model_env = ai.get("model_env", "EXAMFUSION_AI_MODEL")
    key = os.getenv(key_env, "").strip()
    base = os.getenv(base_env, ai.get("default_base_url", "")).strip().rstrip("/")
    model = os.getenv(model_env, ai.get("default_model", "")).strip()
    fallback_model = str(ai.get("fallback_model", "")).strip()

    missing = [name for name, value in ((key_env, key), (base_env, base), (model_env, model)) if not value]
    if missing:
        return [{
            "file": "config",
            "code": "AI_CONFIG_MISSING",
            "severity": "review",
            "message": "AI enabled but required environment/default values are missing: " + ", ".join(missing),
        }]

    unique = _dedupe_candidates(candidates)
    limit = int(cfg.get("max_ai_items_per_run", 1000))
    unique = unique[:limit]
    max_chars = int(cfg.get("max_snippet_chars", 3500))
    batch_size = int(ai.get("batch_size", 25))
    max_batch_chars = int(ai.get("max_batch_chars", 65000))

    root = repo_root or Path.cwd()
    cache_path = Path(ai.get("cache_file", ".examfusion-qa-cache/ai-review-cache.json"))
    if not cache_path.is_absolute():
        cache_path = root / cache_path
    cache = _load_cache(cache_path) if ai.get("cache_enabled", True) else {}

    out: list[dict] = []
    pending: list[dict] = []
    cache_hits = 0
    for c in unique:
        ck = _candidate_key(c, model)
        cached = cache.get(ck)
        if isinstance(cached, dict):
            cache_hits += 1
            if cached.get("status") == "issue":
                out.append({
                    "file": c["file"],
                    "block": c.get("block"),
                    "code": "AI_CONTENT_ISSUE",
                    "severity": cached.get("severity", "review"),
                    "message": cached.get("summary", "AI found a content issue."),
                    "needs_web_verification": bool(cached.get("needs_web_verification")),
                    "patches": cached.get("patches") if isinstance(cached.get("patches"), list) else [],
                    "ai_cache": "hit",
                })
            continue
        c2 = dict(c)
        c2["_cache_key"] = ck
        pending.append(c2)

    request_counter = {"attempts": 0}
    processed = 0
    for batch in _make_batches(pending, batch_size, max_batch_chars, max_chars):
        try:
            response = _post_batch(base, key, model, fallback_model, batch, ai, max_chars, request_counter)
            results = response.get("results", [])
            by_id = {int(r.get("id")): r for r in results if isinstance(r, dict) and str(r.get("id", "")).isdigit()}
            for idx, c in enumerate(batch, start=1):
                result = by_id.get(idx)
                if result is None:
                    out.append({
                        "file": c["file"],
                        "block": c.get("block"),
                        "code": "AI_REVIEW_INCOMPLETE",
                        "severity": "review",
                        "message": "AI batch response omitted this item; no automatic correction was made.",
                    })
                    continue
                cache[c["_cache_key"]] = {
                    "status": result.get("status", "ok"),
                    "severity": result.get("severity", "review"),
                    "summary": result.get("summary", ""),
                    "needs_web_verification": bool(result.get("needs_web_verification")),
                    "patches": result.get("patches") if isinstance(result.get("patches"), list) else [],
                }
                if result.get("status") == "issue":
                    out.append({
                        "file": c["file"],
                        "block": c.get("block"),
                        "code": "AI_CONTENT_ISSUE",
                        "severity": result.get("severity", "review"),
                        "message": result.get("summary", "AI found a content issue."),
                        "needs_web_verification": bool(result.get("needs_web_verification")),
                        "patches": result.get("patches") if isinstance(result.get("patches"), list) else [],
                        "ai_model": response.get("model_used", model),
                    })
                processed += 1
        except Exception as e:
            for c in batch:
                out.append({
                    "file": c["file"],
                    "block": c.get("block"),
                    "code": "AI_REVIEW_FAILED",
                    "severity": "review",
                    "message": f"AI batch review failed: {type(e).__name__}: {e}",
                })
            # If the guard was reached, don't keep creating failure rows/calls for later batches.
            if "Free-quota guard" in str(e):
                break

    if ai.get("cache_enabled", True):
        _save_cache(cache_path, cache)

    # One compact info row makes quota savings visible in report without treating it as an error.
    out.append({
        "file": "AI",
        "code": "AI_USAGE_SUMMARY",
        "severity": "info",
        "message": (
            f"Unique candidates={len(unique)}; cache hits={cache_hits}; newly processed={processed}; "
            f"API request attempts={request_counter['attempts']}; batch_size={batch_size}."
        ),
    })
    return out


def apply_ai_patches(repo_root: Path, ai_issues: list[dict]) -> tuple[list[dict], list[dict]]:
    """Apply only exact, text-only, non-answer-key AI patches. Returns (applied_events, unresolved_issues)."""
    applied_events: list[dict] = []
    unresolved: list[dict] = []

    for item in ai_issues:
        if item.get("code") == "AI_USAGE_SUMMARY":
            unresolved.append(item)
            continue
        if item.get("code") != "AI_CONTENT_ISSUE":
            unresolved.append(item)
            continue
        if item.get("needs_web_verification"):
            item["message"] += " Auto-fix blocked because external factual verification is required."
            unresolved.append(item)
            continue
        patches = item.get("patches") or []
        if not patches:
            unresolved.append(item)
            continue

        file_path = (repo_root / item["file"]).resolve()
        try:
            file_path.relative_to(repo_root.resolve())
        except ValueError:
            item["message"] += " Auto-fix blocked: unsafe path."
            unresolved.append(item)
            continue
        if not file_path.exists():
            item["message"] += " Auto-fix blocked: source file missing."
            unresolved.append(item)
            continue

        raw = file_path.read_text(encoding="utf-8", errors="replace")
        working = raw
        applied_count = 0
        skipped_reasons = []

        for p in patches:
            find = str(p.get("find", ""))
            replace = str(p.get("replace", ""))
            if not find or find == replace:
                skipped_reasons.append("empty/no-op patch")
                continue
            if "<" in find or ">" in find or "<" in replace or ">" in replace:
                skipped_reasons.append("HTML-tag-changing patch blocked")
                continue
            if ANSWER_KEY_RE.search(find) or ANSWER_KEY_RE.search(replace):
                skipped_reasons.append("answer-key patch blocked")
                continue
            if len(replace) > max(len(find) * 3, len(find) + 600):
                skipped_reasons.append("oversized replacement blocked")
                continue
            if working.count(find) != 1:
                skipped_reasons.append(f"find text occurs {working.count(find)} times")
                continue
            working = working.replace(find, replace, 1)
            applied_count += 1

        if applied_count:
            file_path.write_text(working, encoding="utf-8", newline="\n")
            applied_events.append({
                "file": item["file"],
                "block": item.get("block"),
                "code": "AI_FIX_APPLIED",
                "severity": "info",
                "message": f"Applied {applied_count} conservative AI text patch(es). Original finding: {item.get('message','')}",
            })

        if skipped_reasons or not applied_count:
            remaining = dict(item)
            if skipped_reasons:
                remaining["message"] = item.get("message", "") + " Auto-fix skipped: " + "; ".join(skipped_reasons)
            unresolved.append(remaining)

    return applied_events, unresolved
