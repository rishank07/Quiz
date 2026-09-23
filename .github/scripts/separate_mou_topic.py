from __future__ import annotations

import html
import json
import os
import re
import subprocess
from pathlib import Path


ROOT = Path(os.environ.get("GITHUB_WORKSPACE", "/workspace/scratch/d0f6bf17ec04/ExamFusionRepo"))
BASE = "75f7e1c48e10ef7dfb16092ea6ff45e0af074231"

SCI_TOPIC_REL = "Current Affairs/Topic Names/2026/Topic Wise/SCIENCETECH2026.html"
MOU_TOPIC_REL = "Current Affairs/Topic Names/2026/Topic Wise/MOU2026.html"
SCI_RAPID_REL = "Current Affairs/Topic Names/Rapid Practice/2026/Topic Wise/Science_and_Technology_2026_Current_Affairs_Rapid_Practice.html"
MOU_RAPID_REL = "Current Affairs/Topic Names/Rapid Practice/2026/Topic Wise/MoU_2026_Current_Affairs_Rapid_Practice.html"

TOPIC_NAMES = ROOT / "Current Affairs/Topic Names.html"
RAPID_HUB = ROOT / "Current Affairs/Topic Names/Rapid Practice.html"
CA_INDEX = ROOT / "Current Affairs/Topic Names/search-index.js"
CA_SNIPPETS = ROOT / "search-snippets-current-affairs.js"
RAPID_SNIPPETS = ROOT / "search-snippets-current-affairs-rapid.js"
MAIN_INDEX = ROOT / "search-index-main.js"
SITEMAP = ROOT / "sitemap.xml"
SERVICE_WORKER = ROOT / "service-worker.js"
BACK_MAP = ROOT / "back-parent-map.js"

SCI_TOPIC_INDEX_PATH = "./Topic Names/2026/Topic Wise/SCIENCETECH2026.html"
MOU_TOPIC_INDEX_PATH = "./Topic Names/2026/Topic Wise/MOU2026.html"
SCI_TOPIC_GLOBAL_PATH = "./Current%20Affairs/Topic%20Names/2026/Topic%20Wise/SCIENCETECH2026.html"
MOU_TOPIC_GLOBAL_PATH = "./Current%20Affairs/Topic%20Names/2026/Topic%20Wise/MOU2026.html"
SCI_RAPID_GLOBAL_PATH = "./Current%20Affairs/Topic%20Names/Rapid%20Practice/2026/Topic%20Wise/Science_and_Technology_2026_Current_Affairs_Rapid_Practice.html"
MOU_RAPID_GLOBAL_PATH = "./Current%20Affairs/Topic%20Names/Rapid%20Practice/2026/Topic%20Wise/MoU_2026_Current_Affairs_Rapid_Practice.html"


def git_show(relative_path: str) -> str:
    return subprocess.check_output(
        ["git", "show", f"{BASE}:{relative_path}"], cwd=ROOT, text=True
    )


def normalize_text(fragment: str) -> str:
    text = re.sub(r"<[^>]+>", " ", fragment)
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def extract_topic_cards(page: str) -> list[str]:
    return re.findall(
        r'<main class="question-card" id="q\d+">.*?</main>', page, re.S
    )


def parse_rapid(page: str) -> list[dict]:
    match = re.search(
        r'<script id="master-data" type="application/json">(.*?)</script>',
        page,
        re.S,
    )
    assert match
    return json.loads(match.group(1))


def parse_concat_file(path: Path):
    text = path.read_text(encoding="utf-8")
    start = text.index("concat(") + len("concat(")
    end = text.rfind(")")
    return text[:start], json.loads(text[start:end]), text[end:]


def parse_concat_text(text: str) -> list:
    start = text.index("concat(") + len("concat(")
    end = text.rfind(")")
    return json.loads(text[start:end])


def save_concat_file(path: Path, prefix: str, data: list, suffix: str):
    path.write_text(
        prefix + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + suffix,
        encoding="utf-8",
    )


def rapid_chunks(data: list[dict]) -> list[str]:
    chunks = []
    for si, section in enumerate(data):
        for qi, question in enumerate(section["questions"]):
            options = " / ".join(
                f"{option['en']} / {option['hi']}" for option in question["o"]
            )
            body = (
                f"{question['q']['en']} {question['q']['hi']} "
                f"Options: {options}. Answer: {question['a']['en']} / {question['a']['hi']}. "
                f"{question['exp']['en']} {question['exp']['hi']}"
            )
            chunks.append(
                f"\x01rp-{si}-{qi}\x02{re.sub(r'\s+', ' ', body).strip()}"
            )
    return chunks


def make_mou_topic(expanded_science: str, original_science: str) -> str:
    source_cards = extract_topic_cards(expanded_science)[103:]
    assert len(source_cards) == 19
    cards = []
    for number, (old_number, block) in enumerate(zip(range(104, 123), source_cards), 1):
        block = block.replace(f'id="q{old_number}"', f'id="q{number}"', 1)
        block = block.replace(f"Q{old_number}.", f"Q{number}.", 1)
        cards.append(
            f'\n    <!-- QUESTION {number}: VERIFIED MoUs & Strategic Partnerships -->\n'
            + block
        )

    first_card = original_science.index('    <main class="question-card" id="q1">')
    footer_start = original_science.index("<footer>")
    prefix = original_science[:first_card]
    suffix = original_science[footer_start:]

    prefix = prefix.replace(
        "<title>ExamFusion Prep - SCIENCE & TECH 2026 Current Affairs</title>",
        "<title>ExamFusion Prep - MoU 2026 Current Affairs</title>",
    )
    prefix = re.sub(
        r'<meta name="description" content="[^"]*">',
        '<meta name="description" content="MoU 2026 Current Affairs: 19 bilingual, web-verified MCQs on agreements, strategic partnerships, technology and international cooperation — ExamFusion Prep.">',
        prefix,
        count=1,
    )
    prefix = prefix.replace(
        '<meta property="og:title" content="ExamFusion Prep - SCIENCE &amp; TECH 2026 Current Affairs">',
        '<meta property="og:title" content="ExamFusion Prep - MoU 2026 Current Affairs">',
    )
    prefix = re.sub(
        r'<meta property="og:description" content="[^"]*">',
        '<meta property="og:description" content="19 bilingual, web-verified MoU 2026 current affairs MCQs with concise explanations and important highlights.">',
        prefix,
        count=1,
    )
    prefix = prefix.replace(
        "https://examfusionprep.com/Current%20Affairs/Topic%20Names/2026/Topic%20Wise/SCIENCETECH2026.html",
        "https://examfusionprep.com/Current%20Affairs/Topic%20Names/2026/Topic%20Wise/MOU2026.html",
    )
    prefix = prefix.replace(
        "🎯 SCIENCE & TECH 2026 CURRENT AFFAIRS",
        "🤝 MoU 2026 CURRENT AFFAIRS",
    )

    divider = """    <section class="oneliner-card mou-section-heading" aria-labelledby="mou-heading">
        <h2 id="mou-heading">🤝 MoUs &amp; Strategic Partnerships 2026</h2>
        <p class="oneliner-q"><span class="en-text">Web-verified MCQs from the MoU 2026 material</span><span class="hi-text">MoU 2026 सामग्री से वेब-सत्यापित प्रश्न</span></p>
    </section>
"""
    suffix = re.sub(
        r"<footer>\s*<p>.*?</p>",
        "<footer>\n        <p>MoU 2026 Current Affairs — 19 Verified MCQs Complete! 🎯 Powered by Exam Fusion Prep.</p>",
        suffix,
        count=1,
        flags=re.S,
    )
    return prefix + divider + "".join(cards) + "\n" + suffix


def make_mou_rapid(expanded_science: str) -> tuple[str, list[dict]]:
    expanded_data = parse_rapid(expanded_science)
    assert len(expanded_data[3]["questions"]) == 32
    assert len(expanded_data[10]["questions"]) == 40
    mou_data = [
        {
            "title": {"en": "Main MCQs Q1–Q19", "hi": "मुख्य MCQ Q1–Q19"},
            "questions": expanded_data[3]["questions"][13:],
        },
        {
            "title": {
                "en": "Explanation Drill: Facts 1–35",
                "hi": "स्पष्टीकरण अभ्यास: तथ्य 1–35",
            },
            "questions": expanded_data[10]["questions"][5:],
        },
    ]
    assert [len(section["questions"]) for section in mou_data] == [19, 35]

    page = expanded_science
    page = page.replace(
        "<title>Science &amp; Technology 2026 Rapid Practice - ExamFusion Prep</title>",
        "<title>MoU 2026 Rapid Practice - ExamFusion Prep</title>",
    )
    page = page.replace(
        'content="Bilingual Science &amp; Technology 2026 rapid current affairs practice with main MCQs and explanation-derived drills for competitive exams."',
        'content="Bilingual MoU 2026 rapid current affairs practice with verified main MCQs and explanation-derived drills for competitive exams."',
    )
    page = page.replace(
        "<h1>Science &amp; Technology 2026 Rapid Practice</h1>",
        "<h1>MoU 2026 Rapid Practice</h1>",
    )
    page = page.replace(
        "विज्ञान एवं प्रौद्योगिकी 2026 · ExamFusion Prep Original Practice Series · Main MCQs + Explanation Fact Drill",
        "समझौता ज्ञापन (MoU) 2026 · ExamFusion Prep Original Practice Series · Main MCQs + Explanation Fact Drill",
    )
    page = page.replace(
        '<div class="stat"><b>342</b><span>Total Practice</span></div>',
        '<div class="stat"><b>54</b><span>Total Practice</span></div>',
    )
    page = page.replace(
        '<div class="stat"><b>122</b><span>Main MCQs</span></div>',
        '<div class="stat"><b>19</b><span>Main MCQs</span></div>',
    )
    page = page.replace(
        '<div class="stat"><b>220</b><span>Explanation Drills</span></div>',
        '<div class="stat"><b>35</b><span>Explanation Drills</span></div>',
    )
    match = re.search(
        r'<script id="master-data" type="application/json">(.*?)</script>', page, re.S
    )
    assert match
    payload = json.dumps(mou_data, ensure_ascii=False, separators=(",", ":"))
    page = page[: match.start(1)] + payload + page[match.end(1) :]
    page = page.replace(
        'const STORE="efp_ca_topic_science_technology_2026_rapid_v1"',
        'const STORE="efp_ca_topic_mou_2026_rapid_v1"',
    )
    return page, mou_data


def update_topic_names():
    text = TOPIC_NAMES.read_text(encoding="utf-8")
    assert "MOU2026.html" not in text
    science = """                    <a href="./Topic Names/2026/Topic Wise/SCIENCETECH2026.html" onclick="openPage(event)">
                      <i class="fa-solid fa-flask"></i><span class="bilabel"><span class="bilabel-en">18. Sci And Tech</span><span class="bilabel-hi">विज्ञान एवं प्रौद्योगिकी</span></span>
                      <i class="fa-solid fa-arrow-right"></i>
                    </a>"""
    mou = """
                    <a href="./Topic Names/2026/Topic Wise/MOU2026.html" onclick="openPage(event)">
                      <i class="fa-solid fa-handshake"></i><span class="bilabel"><span class="bilabel-en">19. MoU</span><span class="bilabel-hi">समझौता ज्ञापन</span></span>
                      <i class="fa-solid fa-arrow-right"></i>
                    </a>"""
    assert text.count(science) == 1
    text = text.replace(science, science + mou)
    for old, new, label in [
        (19, 20, "State Scheme"),
        (20, 21, "GI Tag"),
        (21, 22, "Independence Day"),
        (22, 23, "Census"),
    ]:
        text = text.replace(f">{old}. {label}<", f">{new}. {label}<", 1)
    TOPIC_NAMES.write_text(text, encoding="utf-8")


def update_rapid_hub():
    text = RAPID_HUB.read_text(encoding="utf-8")
    assert "MoU_2026_Current_Affairs_Rapid_Practice.html" not in text
    text = text.replace(
        '<div class="stat"><b>38</b><span>Rapid Practice quizzes</span></div>',
        '<div class="stat"><b>39</b><span>Rapid Practice quizzes</span></div>',
    )
    text = text.replace("0 / 38 quizzes opened", "0 / 39 quizzes opened")
    text = text.replace(
        "Science_and_Technology_2026_Current_Affairs_Rapid_Practice.html',342,11]",
        "Science_and_Technology_2026_Current_Affairs_Rapid_Practice.html',288,11],"
        "['2026-topic','MoU 2026','समझौता ज्ञापन 2026','Rapid Practice/2026/Topic Wise/MoU_2026_Current_Affairs_Rapid_Practice.html',54,2]",
    )
    text = text.replace(
        "'2026-topic':['📂 2026 Topic Wise','22 quizzes']",
        "'2026-topic':['📂 2026 Topic Wise','23 quizzes']",
    )
    RAPID_HUB.write_text(text, encoding="utf-8")


def update_search_indexes(
    original_science: str,
    mou_topic: str,
    original_rapid_data: list[dict],
    mou_rapid_data: list[dict],
):
    science_cards = extract_topic_cards(original_science)
    mou_cards = extract_topic_cards(mou_topic)
    assert len(science_cards) == 103 and len(mou_cards) == 19

    text = CA_INDEX.read_text(encoding="utf-8")
    data = json.loads(text.split("=", 1)[1].strip().rstrip(";"))
    positions = [i for i, item in enumerate(data) if item.get("f") == SCI_TOPIC_INDEX_PATH]
    assert len(positions) == 122
    insert_at = positions[0]
    data = [item for item in data if item.get("f") != SCI_TOPIC_INDEX_PATH]
    science_entries = [
        {
            "f": SCI_TOPIC_INDEX_PATH,
            "t": "Science And Tech Current Affairs",
            "x": normalize_text(card),
        }
        for card in science_cards
    ]
    mou_entries = [
        {
            "f": MOU_TOPIC_INDEX_PATH,
            "t": "MoU 2026 Current Affairs",
            "x": normalize_text(card),
        }
        for card in mou_cards
    ]
    data[insert_at:insert_at] = science_entries + mou_entries
    CA_INDEX.write_text(
        "window.CA_SEARCH_INDEX = "
        + json.dumps(data, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )

    prefix, data, suffix = parse_concat_file(CA_SNIPPETS)
    positions = [i for i, item in enumerate(data) if item.get("f") == SCI_TOPIC_GLOBAL_PATH]
    assert len(positions) == 1
    index = positions[0]
    base_snippets = parse_concat_text(git_show("search-snippets-current-affairs.js"))
    base_science = [item for item in base_snippets if item.get("f") == SCI_TOPIC_GLOBAL_PATH]
    assert len(base_science) == 1 and len(base_science[0]["x"]) == 103
    data[index] = base_science[0]
    data.insert(
        index + 1,
        {
            "f": MOU_TOPIC_GLOBAL_PATH,
            "t": "MOU2026",
            "b": "Current Affairs / 2026 / Topic Wise",
            "x": [
                f"\x01q{i}\x02{normalize_text(card)}"
                for i, card in enumerate(mou_cards, 1)
            ],
        },
    )
    save_concat_file(CA_SNIPPETS, prefix, data, suffix)

    prefix, data, suffix = parse_concat_file(RAPID_SNIPPETS)
    positions = [i for i, item in enumerate(data) if item.get("f") == SCI_RAPID_GLOBAL_PATH]
    assert len(positions) == 1
    index = positions[0]
    science_chunks = rapid_chunks(original_rapid_data)
    mou_chunks = rapid_chunks(mou_rapid_data)
    assert len(science_chunks) == 288 and len(mou_chunks) == 54
    base_rapid_snippets = parse_concat_text(git_show("search-snippets-current-affairs-rapid.js"))
    base_science = [item for item in base_rapid_snippets if item.get("f") == SCI_RAPID_GLOBAL_PATH]
    assert len(base_science) == 1 and len(base_science[0]["x"]) == 288
    data[index] = base_science[0]
    data.insert(
        index + 1,
        {
            "f": MOU_RAPID_GLOBAL_PATH,
            "t": "MoU_2026_Current_Affairs_Rapid_Practice",
            "b": "Current Affairs / Rapid Practice / 2026 / Topic Wise",
            "x": mou_chunks,
        },
    )
    save_concat_file(RAPID_SNIPPETS, prefix, data, suffix)

    text = MAIN_INDEX.read_text(encoding="utf-8")
    data = json.loads(text.split("=", 1)[1].strip().rstrip(";"))
    assert not any("MOU2026.html" in item.get("url", "") for item in data)
    positions = [i for i, item in enumerate(data) if "SCIENCETECH2026.html" in item.get("url", "")]
    assert len(positions) == 1
    data.insert(
        positions[0] + 1,
        {
            "title": "MoU 2026 Current Affairs",
            "url": "./Current%20Affairs/Topic%20Names/2026/Topic%20Wise/MOU2026.html",
            "section": "Current Affairs",
            "breadcrumb": "Current Affairs / 2026 / Topic Wise",
            "leaf": True,
        },
    )
    MAIN_INDEX.write_text(
        "var SEARCH_INDEX = "
        + json.dumps(data, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )


def update_sitemap_and_cache():
    text = SITEMAP.read_text(encoding="utf-8")
    assert "MOU2026.html" not in text
    science_block = """<url>
<loc>https://examfusionprep.com/Current%20Affairs/Topic%20Names/2026/Topic%20Wise/SCIENCETECH2026.html</loc>
<priority>0.6</priority>
</url>"""
    mou_block = """
<url>
<loc>https://examfusionprep.com/Current%20Affairs/Topic%20Names/2026/Topic%20Wise/MOU2026.html</loc>
<priority>0.6</priority>
</url>"""
    assert text.count(science_block) == 1
    SITEMAP.write_text(text.replace(science_block, science_block + mou_block), encoding="utf-8")

    text = SERVICE_WORKER.read_text(encoding="utf-8")
    text, count = re.subn(
        r'\A// v\d+.*?\nconst CACHE_VERSION = "[^"]+";',
        '// v99 separate verified MoU 2026 topic and practice 20260923\n'
        'const CACHE_VERSION = "efp-pwa-2026-09-23-v99-mou-topic";',
        text,
        count=1,
    )
    assert count == 1
    SERVICE_WORKER.write_text(text, encoding="utf-8")

    text = BACK_MAP.read_text(encoding="utf-8")
    start = text.index("Object.freeze(") + len("Object.freeze(")
    end = text.rfind(")")
    mapping = json.loads(text[start:end])
    additions = {
        "/Current Affairs/Topic Names/2026/Topic Wise/MOU2026.html": "/Current Affairs/Topic Names.html",
        "/Current Affairs/Topic Names/Rapid Practice/2026/Topic Wise/MoU_2026_Current_Affairs_Rapid_Practice.html": "/Current Affairs/Topic Names.html",
    }
    assert not any(key in mapping for key in additions)
    mapping.update(additions)
    BACK_MAP.write_text(
        text[:start]
        + json.dumps(mapping, ensure_ascii=False, separators=(",", ":"))
        + text[end:],
        encoding="utf-8",
    )


def validate(original_science: str, original_rapid: str):
    science_path = ROOT / SCI_TOPIC_REL
    mou_path = ROOT / MOU_TOPIC_REL
    science_rapid_path = ROOT / SCI_RAPID_REL
    mou_rapid_path = ROOT / MOU_RAPID_REL

    assert science_path.read_text(encoding="utf-8") == original_science
    assert science_rapid_path.read_text(encoding="utf-8") == original_rapid

    mou = mou_path.read_text(encoding="utf-8")
    ids = [int(x) for x in re.findall(r'<main class="question-card" id="q(\d+)">', mou)]
    assert ids == list(range(1, 20))
    assert mou.count('class="option correct-option"') == 19
    assert "black-mode.js" in mou and "G-Q1WNRY8ECV" in mou and "efpCopyrightYear" in mou
    assert "MOU2026.html" in mou

    rapid = mou_rapid_path.read_text(encoding="utf-8")
    data = parse_rapid(rapid)
    assert len(data) == 2
    assert [len(section["questions"]) for section in data] == [19, 35]
    for section in data:
        for question in section["questions"]:
            assert len(question["o"]) == 4
            assert len({option["en"] for option in question["o"]}) == 4
            assert sum(option["en"] == question["a"]["en"] for option in question["o"]) == 1
    assert "efp_ca_topic_mou_2026_rapid_v1" in rapid

    topic_names = TOPIC_NAMES.read_text(encoding="utf-8")
    assert topic_names.index("SCIENCETECH2026.html") < topic_names.index("MOU2026.html") < topic_names.index("STATESCHEME2026.html")
    for number, label in [(19, "MoU"), (20, "State Scheme"), (21, "GI Tag"), (22, "Independence Day"), (23, "Census")]:
        assert f">{number}. {label}<" in topic_names

    hub = RAPID_HUB.read_text(encoding="utf-8")
    assert '<b>39</b><span>Rapid Practice quizzes</span>' in hub
    assert "0 / 39 quizzes opened" in hub
    assert "'23 quizzes'" in hub
    assert "Science_and_Technology_2026_Current_Affairs_Rapid_Practice.html',288,11" in hub
    assert "MoU_2026_Current_Affairs_Rapid_Practice.html',54,2" in hub
    values = [int(value) for value, _ in re.findall(r"\['(?:2025|2026)-(?:topic|month)'[^\]]+?,(\d+),(\d+)\]", hub)]
    assert len(values) == 39 and sum(values) == 8960

    ca_data = json.loads(CA_INDEX.read_text(encoding="utf-8").split("=", 1)[1].strip().rstrip(";"))
    assert sum(item.get("f") == SCI_TOPIC_INDEX_PATH for item in ca_data) == 103
    assert sum(item.get("f") == MOU_TOPIC_INDEX_PATH for item in ca_data) == 19

    for path, targets in [
        (CA_SNIPPETS, {SCI_TOPIC_GLOBAL_PATH: 103, MOU_TOPIC_GLOBAL_PATH: 19}),
        (RAPID_SNIPPETS, {SCI_RAPID_GLOBAL_PATH: 288, MOU_RAPID_GLOBAL_PATH: 54}),
    ]:
        _, snippets, _ = parse_concat_file(path)
        for target, expected in targets.items():
            matches = [item for item in snippets if item.get("f") == target]
            assert len(matches) == 1 and len(matches[0]["x"]) == expected
            anchors = [chunk.split("\x02", 1)[0] for chunk in matches[0]["x"]]
            assert len(anchors) == len(set(anchors))

    main_data = json.loads(MAIN_INDEX.read_text(encoding="utf-8").split("=", 1)[1].strip().rstrip(";"))
    assert sum("MOU2026.html" in item.get("url", "") for item in main_data) == 1
    assert SITEMAP.read_text(encoding="utf-8").count("MOU2026.html") == 1
    assert "efp-pwa-2026-09-23-v99-mou-topic" in SERVICE_WORKER.read_text(encoding="utf-8")
    back_map = BACK_MAP.read_text(encoding="utf-8")
    assert back_map.count("/MOU2026.html") == 1
    assert back_map.count("/MoU_2026_Current_Affairs_Rapid_Practice.html") == 1


def main():
    expanded_science = (ROOT / SCI_TOPIC_REL).read_text(encoding="utf-8")
    expanded_rapid = (ROOT / SCI_RAPID_REL).read_text(encoding="utf-8")
    original_science = git_show(SCI_TOPIC_REL)
    original_rapid = git_show(SCI_RAPID_REL)
    original_rapid_data = parse_rapid(original_rapid)
    assert sum(len(section["questions"]) for section in original_rapid_data) == 288

    mou_topic = make_mou_topic(expanded_science, original_science)
    mou_rapid, mou_rapid_data = make_mou_rapid(expanded_rapid)

    (ROOT / MOU_TOPIC_REL).write_text(mou_topic, encoding="utf-8")
    (ROOT / MOU_RAPID_REL).write_text(mou_rapid, encoding="utf-8")
    (ROOT / SCI_TOPIC_REL).write_text(original_science, encoding="utf-8")
    (ROOT / SCI_RAPID_REL).write_text(original_rapid, encoding="utf-8")

    update_topic_names()
    update_rapid_hub()
    update_search_indexes(
        original_science, mou_topic, original_rapid_data, mou_rapid_data
    )
    update_sitemap_and_cache()
    validate(original_science, original_rapid)
    print("Separated MoU 2026 into its own topic: 19 MCQs + 54 rapid questions; Science & Tech restored.")


if __name__ == "__main__":
    main()
