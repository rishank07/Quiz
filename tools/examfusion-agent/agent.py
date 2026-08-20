#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path
import yaml

from examfusion_agent.html_checks import scan_html
from examfusion_agent.repo_checks import check_search_indexes, check_sitemap, tracked_html
from examfusion_agent.report import write_report


def load_config(path: Path) -> dict:
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def run(repo: Path, config_path: Path, report_dir: Path) -> int:
    cfg = load_config(config_path)
    roots = cfg.get("tracked_roots", ["."])
    excludes = cfg.get("exclude_globs", [])
    html_files = tracked_html(repo, roots, excludes)

    issues: list[dict] = []
    site_url = cfg.get("site_url")
    for path in html_files:
        issues.extend(scan_html(path, repo, site_url))

    sitemap_file = cfg.get("sitemap_file")
    if sitemap_file:
        issues.extend(check_sitemap(repo, html_files, sitemap_file))
    issues.extend(check_search_indexes(repo, html_files, cfg.get("search_index_files", [])))

    stats = {
        "html_files": len(html_files),
        "scan_scope": "full",
    }
    write_report(report_dir, issues, stats)

    critical = sum(1 for item in issues if item.get("severity") == "critical")
    review = sum(1 for item in issues if item.get("severity") == "review")
    safe = sum(1 for item in issues if item.get("severity") == "safe")
    print(
        f"Scanned {len(html_files)} HTML files | "
        f"critical={critical} review={review} safe={safe} | report={report_dir}"
    )

    if cfg.get("fail_on_critical", True) and critical:
        return 2
    return 0


def main():
    parser = argparse.ArgumentParser(description="ExamFusion Prep structural QA scanner")
    parser.add_argument("--repo", default=".", help="Repository root")
    parser.add_argument("--config", default="config.yml", help="Config YAML")
    parser.add_argument("--report-dir", default="examfusion-qa-report", help="Output report directory")
    args = parser.parse_args()

    repo = Path(args.repo).resolve()
    config_path = Path(args.config)
    if not config_path.is_absolute():
        config_path = (repo / config_path).resolve()
    report_dir = Path(args.report_dir)
    if not report_dir.is_absolute():
        report_dir = (repo / report_dir).resolve()

    sys.exit(run(repo, config_path, report_dir))


if __name__ == "__main__":
    main()
