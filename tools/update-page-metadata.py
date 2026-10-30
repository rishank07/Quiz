#!/usr/bin/env python3
"""Repair public page metadata without reserializing study content or scripts.

Run from any directory. Existing substantive descriptions and structured data
are retained. Redirects, personal-data pages and query-driven PDF viewers are
excluded. Canonical URLs follow this repository's existing .html URL contract.
"""
from __future__ import annotations

import argparse
from collections import Counter
from html import escape, unescape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://examfusionprep.com"
BRAND = "ExamFusion Prep"
IMAGE = ORIGIN + "/logo.png"
# These two historical paths have byte-identical bodies. Keep saved links
# working while consolidating their search/share URL on the readable filename.
ALIASES = {
    'Books/Ghatnachakra Purvalokan/Polity/ChapterNames/The Planning Commission #U2014 NITI AAYOG.html':
    'Books/Ghatnachakra Purvalokan/Polity/ChapterNames/The Planning Commission — NITI AAYOG.html',
}
TAG = r'<(?:meta|link)\b(?:[^>\"\x27]|\"[^\"]*\"|\x27[^\x27]*\x27)*>'
HEAD = re.compile(r'(<head\b[^>]*>)(.*?)(</head\s*>)', re.I | re.S)
TITLE = re.compile(r'<title\b[^>]*>(.*?)</title\s*>', re.I | re.S)


class Attributes(HTMLParser):
    def __init__(self, tag):
        super().__init__()
        self.attrs = {}
        self.feed(tag)

    def handle_starttag(self, tag, attrs):
        self.attrs = dict(attrs)


def plain(text):
    return re.sub(r'\s+', ' ', unescape(re.sub(r'<[^>]*>', '', text))).strip()


def meta_values(head):
    values = {}
    for match in re.finditer(TAG, head, re.I):
        attrs = Attributes(match[0]).attrs
        key = attrs.get('name', attrs.get('property', '')).lower()
        if key:
            values[key] = attrs.get('content', '')
    return values


def clean_topic(title):
    title = plain(title)
    title = re.sub(r'^Exam\s*Fusion\s*Prep\s*[|–—:-]\s*', '', title, flags=re.I)
    title = re.sub(r'\s*[|•–—-]\s*Exam\s*Fusion\s*Prep.*$', '', title, flags=re.I)
    title = re.sub(r'\s*[-–—]?\s*Interactive Quiz.*$', '', title, flags=re.I)
    return title.strip(' |–—:-')


def subject_for(path):
    parts = list(path.parts)
    for name in reversed(parts[:-1]):
        if name not in {'Books', 'Mind Maps', 'ChapterNames', 'Files', 'PinnacleParts',
                        'Railway', 'SSC', 'Ghatnachakra Purvalokan', "Lucent's Objective", 'Pinnacle GS'}:
            return {'BioLogy': 'Biology', 'Static Gk': 'Static GK',
                    'Envitonment & Ecology': 'Environment & Ecology'}.get(name, name)
    return 'General Studies'


CA_TOPICS = {
    'APPOINTMENT2026': ('Appointments 2026', 'appointments, office holders and leadership changes'),
    'ASIANGAMES2026': ('Asian Games 2026', 'Asian Games events, venues and sporting achievements'),
    'AWARDS2026_PROPER_BILINGUAL': ('Awards & Honours 2026', 'national and international awards and their recipients'),
    'BILLSANDACT2026': ('Bills & Acts 2026', 'important bills, acts and legislative developments'),
    'BOOKS2026_PROPER_BILINGUAL': ('Books & Authors 2026', 'books, authors and recent publications'),
    'BRICS2026': ('BRICS 2026', 'BRICS summits, members and major developments'),
    'BUDGET2026-27': ('Union Budget 2026–27', 'budget announcements, allocations and economic priorities'),
    'CENSUS2027': ('Census 2027', 'India census announcements, schedules and key terminology'),
    'CENTRALSCHEMES2026': ('Central Government Schemes 2026', 'central government schemes, objectives and beneficiaries'),
    'COMMONWEALTHGAMES2026': ('Commonwealth Games 2026', 'Commonwealth Games events, venues and sporting achievements'),
    'DAYSANDTHEME2026': ('Important Days & Themes 2026', 'important dates and 2026 themes, with 2025 revision facts'),
    'DRDOANDDEFENCE2026': ('DRDO & Defence 2026', 'defence technology, DRDO projects and military developments'),
    'ECONOMICSURVEY2026': ('Economic Survey 2025–26', 'Economic Survey findings, indicators and economic trends'),
    'ENVIRONMENT2026': ('Environment 2026', 'environment, conservation and climate developments'),
    'EXERCISES2026_PROPER_BILINGUAL': ('Military Exercises 2026', 'military exercises, participating countries and locations'),
    'FILMSAWARDS2026': ('Film Awards 2026', 'film awards, winning films and award recipients'),
    'FIRSTININDIA2026_PROPER_BILINGUAL': ('First in India 2026', 'first-of-their-kind achievements and milestones in India'),
    'GITAG2026_PROPER_BILINGUAL': ('GI Tags 2026', 'Geographical Indication tags, products and their states'),
    'INDEPENDENCEDAY2026': ('Independence Day 2026', 'Independence Day events, themes and related facts'),
    'INDEX2026_PROPER_BILINGUAL': ('Indices & Rankings 2026', 'major indices, reports and country rankings'),
    'MOU2026': ('MoUs & Agreements 2026', 'memorandums of understanding, agreements and partnerships'),
    'RENAME2026': ('Name Changes 2026', 'renamed places, airports and institutions'),
    'SCIENCETECH2026': ('Science & Technology 2026', 'science, technology, space and research developments'),
    'SPORTS2026': ('Sports 2026', 'tournaments, winners, records and sporting achievements'),
    'STATESCHEME2026': ('State Government Schemes 2026', 'state government schemes, objectives and beneficiaries'),
    'SUMMITS2026': ('Summits & Conferences 2026', 'summits, conferences, host countries and major themes'),
}

BIHAR = {
    'ANCIENT HISTORY OF BIHAR': 'Bihar Ancient History',
    'BIHAR ART AND CULTURE': 'Bihar Art & Culture',
    'Bihar Geography ': 'Bihar Geography',
    'Bihar Historical Figures': 'Bihar Historical Figures',
    'Bihar Polity': 'Bihar Polity',
    'Bihar Women, Muslim, Scientific & Literary Figures': 'Bihar Women, Muslim, Scientific & Literary Figures',
    'Current Affairs for BPSC Pre 72': 'Current Affairs for 72nd BPSC Prelims',
    'Introducing Bihar': 'Introducing Bihar',
    'MEDIEVAL HISTORY OF BIHAR ': 'Bihar Medieval History',
    'Major Changes in Bihar Economy': 'Bihar Economy',
    'Modern History of Bihar': 'Bihar Modern History',
}

ENVIRONMENT_LABELS = {
    '01_iii_Water_and_Carbon_Cycle_in_Nature': 'Water & Carbon Cycles in Nature',
    '01_ix_Organizations_and_Institutions': 'Environment Organisations & Institutions',
    '01_v_Sustainable_Development_Goals': 'Sustainable Development Goals',
    '01_x_Acts_-_Related_to_Environment_Conservation': 'Environmental Conservation Acts',
    '01_xi_Environment_-_Some_Important_Facts_For_Exams': 'Environment: Important Exam Facts',
    '03_xi_Biodiversity_United_Nations_and_Other_International_Organizations': 'Biodiversity: UN & International Organisations',
    '04_vi_The_Kyoto_Protocol_and_Other_Protocol': 'Kyoto Protocol & Climate Agreements',
    '04_vii_Action_Plan_of_India_in_Perspective_of_Climate_Change': "India's Climate Change Action Plans",
    '06_vii_Indian_Efforts_Related_to_Conservation_of_Forest_Resources': 'Forest Conservation Efforts in India',
    '07_vi_Bird_Sanctuaries_and_Butterfly_Conservation': 'Bird Sanctuaries & Butterfly Conservation',
    '08_ii_Renewable_and_Non-Renewable_Energy_Resources': 'Renewable & Non-Renewable Energy',
}


def content_metadata(path, title, description):
    parts = path.parts
    subject = subject_for(path)
    if parts[0] == 'Books':
        if parts[1] == 'BlackBook':
            if path.name == 'BlackBook.html':
                return ('Blackbook English Vocabulary & Quizzes | ' + BRAND,
                        'Study Blackbook vocabulary, one word substitutions, idioms, synonyms, antonyms and spellings. Read meanings and practise quizzes on ExamFusion Prep.')
            topic = {'All Spelling': 'Spelling Correction', 'All one Word': 'One Word Substitutions',
                     'Syno & Anto': 'Synonyms & Antonyms'}.get(path.stem, path.stem)
            topic = topic.replace(' and ', ' & ').removesuffix(' Quiz')
            quiz = path.stem.endswith(' Quiz')
            return (f'{topic} {"Quiz" if quiz else "Vocabulary"} | Blackbook | {BRAND}',
                    f'{"Practise" if quiz else "Revise"} Blackbook {topic.lower()} '
                    + ('with interactive English MCQs, answers and score tracking' if quiz else 'with English entries and Hindi meanings for SSC English preparation')
                    + ' on ExamFusion Prep.')
        book = {'Ghatnachakra Purvalokan': 'GhatnaChakra', "Lucent's Objective": 'Lucent',
                'Pinnacle GS': 'Pinnacle'}.get(parts[1], parts[1])
        if book == 'Pinnacle':
            book += ' Railway' if 'Railway' in parts else ' SSC' if 'SSC' in parts else ' SSC/Railway'
        hub = path.stem in {'ChapterName', 'ChapterNames', 'SubjectName', 'GeographyParts', 'HistoryParts', 'ScienceParts', 'PinnacleParts'}
        if hub:
            if path.stem in {'SubjectName', 'PinnacleParts'}:
                label = f'{book} General Studies'
            else:
                label = f'{book} {subject}'
            return (f'{label} MCQs & Chapters | {BRAND}',
                    f'Browse {label} chapters and practise free Hindi-English MCQs. Choose a topic, check answers and track your quiz score on ExamFusion Prep.')
        topic = clean_topic(title)
        topic = re.sub(r'\s*\|\s*(?:GhatnaChakra|Lucent|Pinnacle(?: SSC/Railway| SSC| Railway)?)$', '', topic)
        topic = re.sub(r'\s+MCQs$', '', topic)
        topic = re.sub(r'\s*\(MCQ\)', '', topic, flags=re.I)
        if parts[1] == 'Ghatnachakra Purvalokan' and subject == 'Environment and Ecology':
            topic = ENVIRONMENT_LABELS.get(path.stem, topic)
        if re.fullmatch(r'Miscellaneous(?:\s*\(Numerical\))?', topic, re.I):
            topic = f'{subject} {topic}'
            if re.search(r'Miscellaneous\s*-\s*1', path.stem, re.I):
                topic += ' 1'
        if topic in {'The Planning Commission — NITI AAYOG', 'Discoveries'}:
            topic += f' ({subject})'
        # Keep the subject explicit where the chapter label alone is ambiguous.
        label = f'{topic} MCQs'
        return (f'{label} | {book} | {BRAND}',
                f'Practise {topic} MCQs in Hindi and English for {subject} revision. Explore the {book} section with answers and quiz score tracking on ExamFusion Prep.')
    if parts[0] == 'Mind Maps':
        if path.stem in {'ChapterName', 'ChapterNames', 'SubjectName', 'GeographyParts', 'HistoryParts', 'ScienceParts'}:
            topic = 'Subject-wise' if path.stem == 'SubjectName' else subject
            return (f'{topic} Mind Maps & Revision Notes | {BRAND}',
                    f'Explore {topic.lower() if topic == "Subject-wise" else topic} mind maps and chapter-wise visual revision notes. Choose a topic for competitive-exam preparation on ExamFusion Prep.')
        topic = clean_topic(title)
        topic = re.sub(r'\s*[|–—-]?\s*(?:Revision )?Mind Map\s*$', '', topic, flags=re.I)
        topic = re.sub(r'^(?:(?:World )?Geography|Economics|Viral Maths)?\s*[-–—:]?\s*Ch\s*\d+\s*[-–—:]\s*', '', topic, flags=re.I)
        topic = re.sub(r'\s*[-–—]\s*Ch\s*\d+\s*$', '', topic, flags=re.I).strip(' |–—:-')
        title = f'{topic} Mind Map | {BRAND}'
        poor = not description or any(x in description for x in ['exam prep — ExamFusionPrep', 'exam preparation — ExamFusionPrep', ': 📗', ': 🔢'])
        if poor:
            description = f'Revise {topic} with a visual {subject} mind map. Explore organised notes and key facts for competitive-exam revision on ExamFusion Prep.'
        return title, description.replace('ExamFusionPrep', BRAND)
    if parts[0] == 'Bihar Special':
        if path.name == 'Bihar Special.html':
            return ('Bihar GK: History, Geography, Polity & Practice Sets | ' + BRAND,
                    'Study Bihar GK in Hindi and English: history, geography, polity, economy, art and culture, current affairs and 60 practice sets for BPSC and BSSC.')
        if path.stem == 'Bihar Objective GK - 60 Sets':
            return ('Bihar GK MCQs: 60 Practice Sets | ' + BRAND,
                    'Practise 60 Bihar GK question sets in Hindi and English for BPSC, BSSC and Bihar state exams. Check answers and track your quiz score on ExamFusion Prep.')
        topic = BIHAR[path.stem]
        return (f'{topic} One-Liners in Hindi & English | {BRAND}',
                f'Read {topic} one-liners in Hindi and English for BPSC, BSSC and Bihar state exams. Revise topic-wise facts and answers on ExamFusion Prep.')
    if parts[0] == 'Current Affairs':
        if path.name == 'Topic Names.html':
            return ('Current Affairs 2026 & 2025: Monthly & Topic-wise MCQs | ' + BRAND,
                    'Study current affairs for 2026 and 2025 in Hindi and English. Browse monthly and topic-wise questions, answers and practice quizzes for SSC, Railway and BPSC.')
        if path.name == 'Rapid Practice.html':
            return ('Current Affairs Quizzes 2026 & 2025 | Rapid Practice | ' + BRAND,
                    'Practise monthly and topic-wise current affairs quizzes for 2026 and 2025 in Hindi and English, with explanations, bookmarks and saved progress.')
        rapid = 'Rapid Practice' in parts
        if 'Month Wise' in parts:
            match = re.search(r'(January|February|March|April|May|June|July|August|September|October|November|December)[ _]?(202[56])', path.stem, re.I)
            if not match:
                raise ValueError(f'Unrecognised month: {path}')
            topic = f'{match[1].title()} {match[2]} Current Affairs'
            desc = (f'Practise {topic} quizzes in Hindi and English with answers, explanations and saved progress for SSC, Railway and BPSC on ExamFusion Prep.' if rapid else
                    f'Read {topic} MCQs in Hindi and English with answers and explanations. Revise monthly events for SSC, Railway and BPSC on ExamFusion Prep.')
            return (f'{topic} {"Quiz" if rapid else "MCQs"} | {BRAND}', desc)
        if rapid:
            topic = re.sub(r'_(?:Current_Affairs_)?Rapid_Practice$', '', path.stem).replace('_', ' ')
            topic = topic.replace('2026-27', '2026–27').replace('2025-26', '2025–26')
            description = f'Practise {topic} current affairs MCQs in Hindi and English, with answers, explanations, bookmarks and saved progress on ExamFusion Prep.'
            # This page already has an accurate, manually written description.
            if path.stem.startswith('Name_Changes_'):
                return title, meta_values(HEAD.search(path.read_text(encoding='utf-8-sig'))[2]).get('description', description)
            return f'{topic} Current Affairs Quiz | {BRAND}', description
        topic, scope = CA_TOPICS[path.stem]
        if path.stem == 'RENAME2026':
            return title, description
        return (f'{topic} Current Affairs MCQs | {BRAND}',
                f'Study {topic}: {scope}. Free Hindi-English current affairs questions with answers and explanations on ExamFusion Prep.')
    # These pages already have substantive metadata; add missing sharing fields
    # and canonical URLs while preserving their existing title and description.
    return title, description


def update_head(head, title, description, canonical):
    desired = {
        'description': description,
        'og:title': title, 'og:description': description, 'og:type': 'website',
        'og:url': canonical, 'og:site_name': BRAND, 'og:image': IMAGE,
        'og:image:alt': 'ExamFusion Prep logo',
        'twitter:card': 'summary', 'twitter:title': title,
        'twitter:description': description, 'twitter:image': IMAGE,
        'twitter:image:alt': 'ExamFusion Prep logo',
    }
    seen = set()
    def replace_tag(match):
        attrs = Attributes(match[0]).attrs
        key = attrs.get('name', attrs.get('property', '')).lower()
        if attrs.get('rel', '').lower() == 'canonical':
            key = 'canonical'
        if key not in desired and key != 'canonical':
            return match[0]
        if key in seen:
            return ''
        seen.add(key)
        if key == 'canonical':
            return f'<link rel="canonical" href="{escape(canonical, quote=True)}">'
        attribute = 'property' if key.startswith('og:') else 'name'
        return f'<meta {attribute}="{key}" content="{escape(desired[key], quote=True)}">'
    updated = re.sub(TAG, replace_tag, head, flags=re.I)
    updated = TITLE.sub(lambda m: '<title>' + escape(title) + '</title>', updated, count=1)
    missing = []
    if 'canonical' not in seen:
        missing.append(f'<link rel="canonical" href="{escape(canonical, quote=True)}">')
    for key, value in desired.items():
        if key not in seen:
            attribute = 'property' if key.startswith('og:') else 'name'
            missing.append(f'<meta {attribute}="{key}" content="{escape(value, quote=True)}">')
    if missing:
        end = TITLE.search(updated).end()
        updated = updated[:end] + '\n  ' + '\n  '.join(missing) + updated[end:]
    return updated


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Report pending changes without writing')
    args = parser.parse_args()
    paths = subprocess.check_output(['git', 'ls-files', '-z', '*.html'], cwd=ROOT).decode().split('\0')
    changed, skipped, titles = [], [], Counter()
    processed = 0
    for relative in filter(None, paths):
        path = Path(relative)
        source = ROOT / path
        raw = source.read_bytes()
        text = raw.decode('utf-8-sig')
        match = HEAD.search(text)
        if not match:
            raise ValueError(f'Missing head: {path}')
        head = match[2]
        values = meta_values(head)
        if ('noindex' in values.get('robots', '').lower()
                or re.search(r'<meta\b[^>]*http-equiv=["\x27]refresh', head, re.I)
                or relative in {'offline.html', 'Crux-Tricks/viewer.html'}):
            skipped.append(relative)
            continue
        title_match = TITLE.search(head)
        if not title_match:
            raise ValueError(f'Missing title: {path}')
        title = plain(title_match[1])
        title, description = content_metadata(path, title, values.get('description', ''))
        processed += 1
        if not title or not description:
            raise ValueError(f'Empty public metadata: {path}')
        canonical_path = ALIASES.get(relative, relative)
        canonical = ORIGIN + ('/' if canonical_path == 'index.html' else '/' + quote(canonical_path, safe='/'))
        updated_head = update_head(head, title, description, canonical)
        updated = text[:match.start(2)] + updated_head + text[match.end(2):]
        output = (b'\xef\xbb\xbf' if raw.startswith(b'\xef\xbb\xbf') else b'') + updated.encode('utf-8')
        if relative not in ALIASES:
            titles[title] += 1
        if output != raw:
            changed.append(relative)
            if not args.check:
                source.write_bytes(output)
    duplicates = {t: n for t, n in titles.items() if n > 1}
    print(json.dumps({'public_pages': processed, 'canonical_pages': sum(titles.values()), 'changed': len(changed),
                      'sections': dict(Counter(p.split('/')[0] for p in changed)),
                      'excluded_pages': skipped, 'duplicate_titles': duplicates}, indent=2))
    if duplicates:
        raise SystemExit('Duplicate public titles need review')
    if args.check and changed:
        raise SystemExit('Metadata updates are pending')


if __name__ == '__main__':
    main()
