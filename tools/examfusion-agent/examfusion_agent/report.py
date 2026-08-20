from __future__ import annotations

from collections import Counter
from pathlib import Path
import json


def write_report(report_dir: Path, issues: list[dict], stats: dict) -> None:
    report_dir.mkdir(parents=True, exist_ok=True)
    (report_dir / "report.json").write_text(json.dumps({"stats": stats, "issues": issues}, ensure_ascii=False, indent=2), encoding="utf-8")

    sev = Counter(i.get("severity", "review") for i in issues)
    codes = Counter(i.get("code", "UNKNOWN") for i in issues)
    lines = [
        "# ExamFusion QA Report",
        "",
        f"- HTML files scanned: **{stats.get('html_files', 0)}**",
        f"- AI candidates: **{stats.get('ai_candidates', 0)}**",
        f"- Total issues: **{len(issues)}**",
        f"- Critical: **{sev.get('critical', 0)}**",
        f"- Review: **{sev.get('review', 0)}**",
        f"- Safe auto-fixable: **{sev.get('safe', 0)}**",
        "",
        "## Issue summary",
        "",
    ]
    for code, count in sorted(codes.items(), key=lambda x: (-x[1], x[0])):
        lines.append(f"- `{code}`: {count}")

    lines += ["", "## Details", ""]
    for i in issues:
        where = i.get("file", "?")
        if i.get("block") is not None:
            where += f" (block {i['block']})"
        lines.append(f"### [{i.get('severity','review').upper()}] {i.get('code','UNKNOWN')} — `{where}`")
        lines.append("")
        lines.append(i.get("message", ""))
        if i.get("snippet"):
            lines += ["", "```text", str(i["snippet"])[:1200], "```"]
        if i.get("suggested_fix"):
            lines += ["", "**Suggested fix:**", "", "```text", str(i["suggested_fix"])[:2500], "```"]
        if i.get("needs_web_verification"):
            lines += ["", "⚠️ Requires external/web verification before changing the answer."]
        lines.append("")

    (report_dir / "report.md").write_text("\n".join(lines), encoding="utf-8")
