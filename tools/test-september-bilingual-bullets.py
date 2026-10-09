"""Check the September reading/quiz bullet regression without third-party packages."""
from html.parser import HTMLParser
from pathlib import Path
import json
import re
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
READING = ROOT / 'Current Affairs/Topic Names/2026/Month Wise/SEPTEMBER2026.html'
QUIZ = ROOT / 'Current Affairs/Topic Names/Rapid Practice/2026/Month Wise/September_2026_Current_Affairs_Rapid_Practice.html'


class Points(HTMLParser):
    def __init__(self, source, tag):
        super().__init__(convert_charrefs=True)
        self.tag = tag
        self.points = []
        self.current = None
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        if tag == self.tag:
            assert self.current is None, 'Nested explanation bullets'
            self.current = []

    def handle_data(self, text):
        if self.current is not None:
            self.current.append(text)

    def handle_endtag(self, tag):
        if tag == self.tag:
            assert self.current is not None
            self.points.append(''.join(self.current).strip())
            self.current = None


def numbers(text):
    return {n.replace(',', '') for n in re.findall(r'\d+(?:[,.]\d+)*', text)}


source = QUIZ.read_text()
data = json.loads(re.search(r'<script id="master-data" type="application/json">(.*?)</script>', source, re.S)[1])
questions = [q for section in data for q in section['questions']]
assert len(data) == 9 and len(questions) == 256
for index, q in enumerate(questions, 1):
    en = Points(q['exp_html']['en'], 'p').points
    hi = Points(q['exp_html']['hi'], 'p').points
    assert len(en) == len(hi), f'Q{index}: Hindi/English bullet count differs'
    assert en and all(en) and all(hi), f'Q{index}: empty explanation bullet'
    assert en[0] == 'Answer: ' + q['a']['en'] + '.'
    assert hi[0] == 'उत्तर: ' + q['a']['hi'] + '।'
    for bullet, (a, b) in enumerate(zip(en[1:], hi[1:]), 2):
        assert numbers(a) == numbers(b), f'Q{index} bullet {bullet}: numeric facts differ: {a} / {b}'
    for lang, points in [('en', en), ('hi', hi)]:
        assert ' '.join(points) == q['exp'][lang], f'Q{index}: search text differs from displayed explanation'
        highlights = re.findall(r'<span class="highlight-text">(.*?)</span>', q['exp_html'][lang])
        assert all(len(t) <= 65 and len(t.split()) <= 8 for t in highlights)
        # Inline styling must never split a word, its vowel marks or a number.
        for mark in re.finditer(r'<span class="highlight-text">.*?</span>', q['exp_html'][lang]):
            before = q['exp_html'][lang][mark.start() - 1] if mark.start() else ''
            after = q['exp_html'][lang][mark.end():mark.end() + 1]
            assert not any(c and unicodedata.category(c)[0] in 'LMN' for c in (before, after)), f'Q{index}: highlight splits a word/number'
    for phrase in ('Thermal Infra-Red Imaging', 'Unified Payments Interface', 'प्लेयर ऑफ द सीरीज', 'प्रोजेक्ट', 'लॉन्च', 'Smart engineering', 'Turning Vision into Action'):
        assert phrase not in q['exp']['hi'], f'Q{index}: unnecessary English in Hindi explanation'

assert '<span class="highlight-text">भारतीय</span>' in questions[25]['exp_html']['hi']
assert '<span class="highlight-text">फ्रांसीसी</span>' in questions[44]['exp_html']['hi']
assert 'प्रा<span' not in questions[17]['exp_html']['hi']
assert 'प्रति<span' not in questions[54]['exp_html']['hi']

reading = READING.read_text()
cards = re.findall(r'<main class="question-card" id="q(\d+)">(.*?)</main>', reading, re.S)
assert len(cards) == 107
assert reading.count('class="oneliner-item"') == 30
for number, card in cards:
    blocks = re.findall(r'<div class="lang-section"><h4>.*?</h4><ul>(.*?)</ul></div>', card, re.S)
    assert len(blocks) == 2
    q = questions[int(number) - 1]
    assert Points(blocks[0], 'li').points == Points(q['exp_html']['hi'], 'p').points
    assert Points(blocks[1], 'li').points == Points(q['exp_html']['en'], 'p').points

# The reported regression had two combined Hindi bullets for four English facts.
q = questions[31]
en = Points(q['exp_html']['en'], 'p').points
hi = Points(q['exp_html']['hi'], 'p').points
assert len(en) == len(hi) == 7
assert en[2] == 'Winners' and hi[2] == 'विजेता'
assert 'Widow’s Bay' in en[3] and 'Widow’s Bay' in hi[3]
assert 'The Pitt' in en[4] and 'The Pitt' in hi[4]
assert 'Noah Wyle' in en[5] and 'नोआ वाइली' in hi[5]
assert 'Rhea Seehorn' in en[6] and 'रिया सीहॉर्न' in hi[6]
print('PASS: all 256 quiz explanations have matching bilingual bullet counts/order and numeric facts; all 107 reading explanations match the quiz; Q32 has seven paired bullets; compact highlights retained.')
