"""Validate Asian Games reading/quiz content and complete-word highlights."""
from pathlib import Path
import json
import re
import unicodedata
from html import unescape

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'Current Affairs/Topic Names'
READING = BASE / '2026/Topic Wise/ASIANGAMES2026.html'
QUIZ = BASE / 'Rapid Practice/2026/Topic Wise/Asian_Games_2026_Current_Affairs_Rapid_Practice.html'

def points(markup):
    return [' '.join(unescape(re.sub(r'<[^>]+>', '', li)).split())
            for li in re.findall(r'<li>(.*?)</li>', markup, re.S)]

def numbers(text):
    return {n.replace(',', '') for n in re.findall(r'\d+(?:[,.]\d+)*', text)}

data = json.loads(re.search(r'<script id="master-data" type="application/json">(.*?)</script>', QUIZ.read_text(), re.S)[1])
questions = [q for section in data for q in section['questions']]
assert len(questions) == 40
for index, q in enumerate(questions, 1):
    assert q['a'] in q['o'], f'Q{index}: answer missing from options'
    en, hi = (points(q['exp_html'][lang]) for lang in ('en', 'hi'))
    assert len(en) == len(hi) and all(en) and all(hi)
    for a, b in zip(en, hi):
        assert numbers(a) == numbers(b), f'Q{index}: bilingual numerical facts differ'
    for lang, bullets in [('en', en), ('hi', hi)]:
        assert ' '.join(bullets) == q['exp'][lang]
        for mark in re.finditer(r'<span class="highlight-text">(.*?)</span>', q['exp_html'][lang]):
            assert len(mark[1]) <= 65 and len(mark[1].split()) <= 8
            before = q['exp_html'][lang][mark.start()-1:mark.start()] if mark.start() else ''
            after = q['exp_html'][lang][mark.end():mark.end()+1]
            assert not any(c and unicodedata.category(c)[0] in 'LMN' for c in (before, after))
    assert 'इमैजिन वन एशिया' not in q['exp']['hi']
    assert 'जोड़ी जोड़ी' not in q['q']['hi']

cards = re.findall(r'<main class="question-card" id="q(\d+)">(.*?)</main>', READING.read_text(), re.S)
assert len(cards) == 22 and [int(n) for n, _ in cards] == list(range(1,23))
for number, card in cards:
    blocks = re.findall(r'<div class="lang-section"><h4>.*?</h4><ul>(.*?)</ul></div>', card, re.S)
    assert len(blocks) == 2
    q = questions[int(number)-1]
    for lang, block in zip(('hi', 'en'), blocks):
        assert points(block) == points(q['exp_html'][lang]), f'Q{number}: reading/quiz differ'
assert questions[3]['a']['en'] == 'Imagine One Asia'
assert questions[3]['a']['hi'] == 'एक एशिया की कल्पना करें'
assert 'दल प्रमुख' in questions[19]['q']['hi']
print('PASS: Asian Games 22 reading/40 practice questions; bilingual bullets/numbers, answer positions, language, complete-word/compact highlights and search explanation text')
