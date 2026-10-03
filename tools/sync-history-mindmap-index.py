#!/usr/bin/env python3
"""Refresh Medieval/Modern search snippets from their checked-in mindmaps.

Other index groups and chapter metadata retain their original bytes. Run with
--check to verify that the index is synchronized without writing it.
"""
from __future__ import annotations

import argparse
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import unquote

VOID = set('area base br col embed hr img input link meta param source track wbr'.split())
SKIP_TAGS = set('script style button nav footer svg noscript'.split())
SKIP_CLASSES = set('tabs tabs-wrapper tab-nav footer page-footer fact-icon'.split())
BLOCKS = set('div p li ul ol table thead tbody tr td th section article main header h1 h2 h3 h4 h5 h6'.split())
# Keep questions with answers, labels with values, and table/timeline rows intact.
UNITS = set('fact trap trap-box trap-card recall-qa rqa qf-item ii intro-item flow-box tlrow tl-item titem ti t-item event-header pc-row drow rev-item mc-row oc-row sb-item vc-row cc-row sc-row rtc-row off-item art-item leader-card nawab-item'.split())


class Node:
    def __init__(self, tag='', attrs=(), parent=None):
        self.tag, self.attrs, self.parent = tag, dict(attrs), parent
        self.children = []

    @property
    def classes(self):
        return set(self.attrs.get('class', '').split())


class Document(HTMLParser):
    def __init__(self, raw):
        super().__init__(convert_charrefs=True)
        self.root = Node()
        self.stack = [self.root]
        self.feed(raw)

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.stack[-1])
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def skipped(node):
    return node.tag in SKIP_TAGS or bool(node.classes & SKIP_CLASSES)


def visible_text(node):
    if isinstance(node, str):
        return node
    if skipped(node):
        return ''
    if node.tag == 'br':
        return ' '
    # Inline emphasis must not split words or punctuation; block siblings need
    # a separator even when HTML is minified.
    return ''.join(visible_text(child) + (' ' if isinstance(child, Node) and child.tag in BLOCKS else '')
                   for child in node.children)


def clean(text):
    return re.sub(r'\s+', ' ', text).strip()


def all_nodes(node):
    yield node
    for child in node.children:
        if isinstance(child, Node):
            yield from all_nodes(child)


def extract(raw):
    document = Document(raw)
    nodes = list(all_nodes(document.root))
    body = next(node for node in nodes if node.tag == 'body')
    ids = {node.attrs['id'] for node in nodes if 'id' in node.attrs}
    snippets, covered = [], []

    def emit(node, text):
        text = clean(text)
        if not text:
            return
        covered.append(text)
        anchor_node = node
        while anchor_node is not None:
            anchor = anchor_node.attrs.get('id', '')
            if anchor.startswith(('panel-', 'tab-')):
                assert anchor in ids
                text = '\x01' + anchor + '\x02' + text
                break
            anchor_node = anchor_node.parent
        snippets.append(text)

    def walk(node):
        if skipped(node):
            return
        children = [child for child in node.children if isinstance(child, Node) and not skipped(child)]
        block_children = [child for child in children if child.tag in BLOCKS]
        if node.tag == 'tr' or node.classes & UNITS or not block_children:
            emit(node, visible_text(node))
            return
        pending = []
        for child in node.children:
            if isinstance(child, str) or child.tag not in BLOCKS:
                pending.append(visible_text(child))
            else:
                emit(node, ''.join(pending))
                pending = []
                walk(child)
        emit(node, ''.join(pending))

    walk(body)
    # Catch omissions in any chapter layout, including bare text between cards.
    assert clean(' '.join(covered)) == clean(visible_text(body)), 'Visible text coverage mismatch'
    return list(dict.fromkeys(snippets))


def group_spans(raw):
    decoder = json.JSONDecoder()
    for match in re.finditer(r'\.concat\(\s*\[', raw):
        pos = match.end()
        while True:
            while raw[pos].isspace() or raw[pos] == ',':
                pos += 1
            if raw[pos] == ']':
                break
            group, end = decoder.raw_decode(raw, pos)
            yield pos, end, group
            pos = end


def synchronize(repo, check=False):
    index = repo / 'search-snippets-mindmaps.js'
    raw = index.read_text(encoding='utf-8')
    replacements = []
    count = 0
    for start, end, group in group_spans(raw):
        path = unquote(group['f']).removeprefix('./')
        if not any(path.startswith('Mind Maps/History/' + subject + '/ChapterNames/')
                   for subject in ('Medieval History', 'Modern History')):
            continue
        count += 1
        updated = dict(group)
        updated['x'] = list(dict.fromkeys(group['x'][:3] + extract((repo / path).read_text(encoding='utf-8'))))
        if group != updated:
            encoded = json.dumps(updated, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
            replacements.append((start, end, encoded))
    assert count == 22, f'Expected 22 history chapters, found {count}'
    if check and replacements:
        raise SystemExit(f'{len(replacements)} history chapter indexes need refreshing')
    for start, end, encoded in reversed(replacements):
        raw = raw[:start] + encoded + raw[end:]
    if replacements:
        index.write_text(raw, encoding='utf-8')
    print(f'Checked {count} history chapters; refreshed {len(replacements)} groups.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    synchronize(Path(__file__).resolve().parents[1], args.check)
