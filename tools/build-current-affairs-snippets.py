"""Rebuild the Current Affairs question search index from the published HTML.

Run from the repository root: python3 tools/build-current-affairs-snippets.py
Requires lxml. The existing index supplies the page titles and breadcrumbs;
each question's searchable text is read afresh from its own #qN card.
"""

import json
import re
from pathlib import Path
from urllib.parse import unquote

from lxml import html


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "search-snippets-current-affairs.js"
CLASS = "contains(concat(' ', normalize-space(@class), ' '), ' {} ')"


def text(element):
    return " ".join(" ".join(element.itertext()).split())


def first(card, name):
    matches = card.xpath(".//*[" + CLASS.format(name) + "]")
    return text(matches[0]) if matches else ""


def build():
    old = INDEX.read_text(encoding="utf-8")
    groups = []
    decoder = json.JSONDecoder()
    for match in re.finditer(r"\.concat\(", old):
        part, _ = decoder.raw_decode(old[match.end():])
        groups.extend(part)

    if not groups:
        raise ValueError("No existing Current Affairs index groups")

    for group in groups:
        page = ROOT / unquote(group["f"]).removeprefix("./")
        tree = html.fromstring(page.read_bytes())
        cards = {
            card.get("id"): card
            for card in tree.xpath("//*[" + CLASS.format("question-card") + "]")
        }
        snippets = []
        for original in group["x"]:
            anchor = re.match(r"\x01([^\x02]+)\x02", original)
            if not anchor or anchor.group(1) not in cards:
                raise ValueError(f"Missing question anchor in {page}: {original[:40]}")
            card = cards[anchor.group(1)]
            question = first(card, "question-text")
            answer = first(card, "correct-option")
            explanation = first(card, "explanation-box")
            if not question or not answer or not explanation:
                raise ValueError(f"Incomplete question {page}#{anchor.group(1)}")
            label = anchor.group(1).upper()
            if not re.match(r"^Q\d+\b", question, re.IGNORECASE):
                question = f"{label}. {question}"
            snippets.append(f"\x01{anchor.group(1)}\x02{question} "
                            f"Answer: {answer} Explanation: {explanation}")
        group["x"] = snippets

    header = (
        "// Question-level Current Affairs index: question, correct answer and explanation.\n"
        "// Rebuild after editing a quiz: python3 tools/build-current-affairs-snippets.py\n"
    )
    # Two assignments keep compatibility with the existing worker and any
    # other snippet groups that were loaded before this script.
    midpoint = 1 if len(groups) > 1 else len(groups)
    lines = [header]
    for part in (groups[:midpoint], groups[midpoint:]):
        if part:
            lines.append("window.EF_SNIPPET_INDEX = (window.EF_SNIPPET_INDEX || []).concat(" +
                         json.dumps(part, ensure_ascii=False, separators=(",", ":")) + ");\n")
    INDEX.write_text("".join(lines), encoding="utf-8")
    print(f"Indexed {sum(len(group['x']) for group in groups)} questions from {len(groups)} Current Affairs pages")


if __name__ == "__main__":
    build()
