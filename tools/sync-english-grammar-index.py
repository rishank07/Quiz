#!/usr/bin/env python3
"""Rebuild English section search snippets without changing deep-link routes."""
import html
import json
import re
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "Original Practice/English_Grammar_Complete_Practice.html"
SNIPPETS = ROOT / "search-snippets-english-original-practice.js"


def text(value):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]*>", " ", str(value)))).strip()


def sync():
    page = PAGE.read_text()
    match = re.search(r'<script id="master-data" type="application/json">(.*?)</script>', page, re.S)
    master = json.loads(match.group(1))
    source = SNIPPETS.read_text()
    prefix = "window.EF_ENGLISH_ORIGINAL_PRACTICE_SNIPPET_INDEX = "
    start = source.index(prefix) + len(prefix)
    end = source.rfind(";")
    records = json.loads(source[start:end])
    seen = set()
    count = 0
    for record in records:
        args = parse_qs(urlsplit(record["f"]).query)
        chapter = args["chapter"][0]
        section_index = int(args["section"][0]) - 1
        section = master[chapter][section_index]
        route = (chapter, section_index)
        assert route not in seen
        seen.add(route)
        assert len(record["x"]) == len(section["questions"])
        record["t"] = section["title"]
        snippets = []
        for i, question in enumerate(section["questions"]):
            # Preserve the index's existing question marker and route numbering.
            marker = re.match(r"^[\ue000-\uf8ff]+", record["x"][i])
            assert marker, (chapter, section_index, i)
            answer = question["options"][question["answer"]]
            content = " ".join([
                question["prompt"], question["sentence"], "Answer: " + answer,
                "Hinglish Explanation: " + question["explanation"],
                "English Explanation: " + question["englishExplanation"],
                "Quick Rule: " + question["rule"],
            ])
            snippets.append(marker.group() + text(content))
        record["x"] = snippets
        count += len(snippets)
    assert len(seen) == sum(len(sections) for sections in master.values())
    assert count == 2354
    SNIPPETS.write_text(source[:start] + json.dumps(records, ensure_ascii=False, separators=(",", ":")) + source[end:])
    print(f"English search index: {count} questions, {len(records)} sections; routes and markers preserved.")


if __name__ == "__main__":
    sync()
