#!/usr/bin/env python3
"""Replay and verify the reviewed Indian Geography HTML corrections."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / 'audits/indian-geography-mindmaps/corrections.json'

def blob_sha(data):
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='Apply only to the recorded original bytes; already-corrected files are left alone.')
    args = parser.parse_args()
    plan = json.loads(PLAN.read_text(encoding='utf-8'))
    assert len(plan['chapters']) == 17
    assert blob_sha((ROOT / plan['source']).read_bytes()) == plan['source_blob_sha'], 'Original Practice must remain unchanged'
    edits = 0
    for chapter in plan['chapters']:
        original = subprocess.check_output(['git', 'cat-file', '-p', chapter['base_blob_sha']], cwd=ROOT).decode('utf-8')
        assert blob_sha(original.encode()) == chapter['base_blob_sha']
        corrected = original
        ordered = sorted(chapter['edits'], key=lambda e: e['start'])
        for left, right in zip(ordered, ordered[1:]):
            assert left['end'] <= right['start'], 'Overlapping corrections'
        for edit in reversed(ordered):
            assert corrected[edit['start']:edit['end']] == edit['before'], 'Original text mismatch'
            corrected = corrected[:edit['start']] + edit['after'] + corrected[edit['end']:]
        expected = corrected.encode('utf-8')
        assert blob_sha(expected) == chapter['result_blob_sha'], 'Replay fingerprint mismatch'
        path = ROOT / chapter['file']
        current = path.read_bytes()
        if args.apply and blob_sha(current) == chapter['base_blob_sha']:
            path.write_bytes(expected)
            current = expected
        assert current == expected, 'Chapter differs from reviewed result: ' + chapter['file']
        edits += len(ordered)
    print(f'PASS: exact replay of {edits} HTML edits across 17 chapters; Original Practice unchanged')

if __name__ == '__main__':
    main()
