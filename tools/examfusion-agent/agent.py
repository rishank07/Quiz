#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path
import yaml

from examfusion_agent.ai_review import apply_ai_patches, review_candidates
from examfusion_agent.html_checks import apply_safe_fixes, scan_html
from examfusion_agent.repo_checks import check_search_indexes, check_sitemap, tracked_html
from examfusion_agent.report import write_report


def load_config(path: Path) -> dict:
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def run(repo: Path, config_path: Path, report_dir: Path, fix_safe: bool, use_ai: bool | None, ai_fix: bool = False) -> int:
    cfg = load_config(config_path)
    if use_ai is not None:
        cfg.setdefault("ai", {})["enabled"] = use_ai

    roots = cfg.get("tracked_roots", ["Quiz"])
    excludes = cfg.get("exclude_globs", [])
    html_files = tracked_html(repo, roots, excludes)

    safe_fixes = []
    if fix_safe:
        for p in html_files:
            changes = apply_safe_fixes(p)
            if changes:
                safe_fixes.append({"file": p.relative_to(repo).as_posix(), "changes": changes})

    issues = []
    candidates = []
    for p in html_files:
        i, c = scan_html(p, repo)
        issues.extend(i)
        candidates.extend(c)

    sitemap_file = cfg.get("sitemap_file")
    if sitemap_file:
        issues.extend(check_sitemap(repo, html_files, sitemap_file))
    issues.extend(check_search_indexes(repo, html_files, cfg.get("search_index_files", [])))

    ai_issues = review_candidates(candidates, cfg, repo)
    if ai_fix:
        applied_ai, unresolved_ai = apply_ai_patches(repo, ai_issues)
        # Re-run structural checks after modifications so the final report reflects current files.
        issues = []
        candidates_after = []
        for p in html_files:
            i, c = scan_html(p, repo)
            issues.extend(i)
            candidates_after.extend(c)
        if sitemap_file:
            issues.extend(check_sitemap(repo, html_files, sitemap_file))
        issues.extend(check_search_indexes(repo, html_files, cfg.get("search_index_files", [])))
        issues.extend(applied_ai)
        issues.extend(unresolved_ai)
    else:
        issues.extend(ai_issues)

    if safe_fixes:
        for item in safe_fixes:
            issues.append({
                "file": item["file"],
                "code": "SAFE_FIX_APPLIED",
                "severity": "info",
                "message": "; ".join(item["changes"]),
            })

    stats = {
        "html_files": len(html_files),
        "ai_candidates": len(candidates),
        "ai_issues": len(ai_issues),
        "safe_fix_files": len(safe_fixes),
    }
    write_report(report_dir, issues, stats)

    critical = sum(1 for i in issues if i.get("severity") == "critical")
    review = sum(1 for i in issues if i.get("severity") == "review")
    safe = sum(1 for i in issues if i.get("severity") == "safe")
    print(f"Scanned {len(html_files)} HTML files | critical={critical} review={review} safe={safe} | report={report_dir}")

    if cfg.get("fail_on_critical", True) and critical:
        return 2
    return 0


def main():
    ap = argparse.ArgumentParser(description="ExamFusion Prep QA Agent")
    ap.add_argument("--repo", default=".", help="Repository root")
    ap.add_argument("--config", default="config.yml", help="Config YAML")
    ap.add_argument("--report-dir", default="examfusion-qa-report", help="Output report directory")
    ap.add_argument("--fix-safe", action="store_true", help="Apply only conservative structural auto-fixes")
    ap.add_argument("--ai-fix", action="store_true", help="Apply conservative exact-text AI patches; implies --ai")
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--ai", action="store_true", help="Force-enable AI review")
    g.add_argument("--no-ai", action="store_true", help="Force-disable AI review")
    args = ap.parse_args()

    repo = Path(args.repo).resolve()
    cfg = Path(args.config)
    if not cfg.is_absolute():
        cfg = (repo / cfg).resolve()
    report = Path(args.report_dir)
    if not report.is_absolute():
        report = (repo / report).resolve()

    use_ai = True if (args.ai or args.ai_fix) else False if args.no_ai else None
    sys.exit(run(repo, cfg, report, args.fix_safe, use_ai, ai_fix=args.ai_fix))


if __name__ == "__main__":
    main()
