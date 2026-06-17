#!/usr/bin/env python3
"""Convert grade-6 writing Excel to JSON for Laravel seeder."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pandas as pd

DEFAULT_XLSX = Path(
    r'c:\Users\Administrator\Documents\WeChat Files\wxid_znj0gx1tx1zq22'
    r'\FileStorage\File\2026-05\小升初题库\小升初题库\写作.xlsx'
)
OUTPUT = Path(__file__).resolve().parents[1] / 'database' / 'seeders' / 'data' / 'writing_grade6.json'
REALM = 'L3'


def parse_word_limits(raw: str) -> tuple[int, int]:
    text = str(raw or '').strip()
    if not text or text == '未指定':
        return 40, 100
    if re.search(r'60\s*[-~到至]\s*70', text):
        return 60, 70
    if '60词左右' in text:
        return 55, 75
    if '50词左右' in text:
        return 45, 65
    if '30词左右' in text or '30个单词' in text:
        return 25, 40
    m = re.search(r'不少于\s*(\d+)\s*词', text)
    if m:
        minimum = int(m.group(1))
        return minimum, max(minimum + 30, minimum + 20)
    m = re.search(r'不少于\s*(\d+)\s*字', text)
    if m:
        minimum = int(m.group(1))
        return minimum, max(minimum + 30, minimum + 20)
    if re.search(r'至少?\s*5', text) or '5句话' in text or '5-6句话' in text or '5句' in text:
        return 35, 90
    if re.search(r'不少于\s*6', text):
        return 40, 90
    return 50, 80


def extract_title(question: str, sample: str, serial: int) -> str:
    text = str(question or '')
    for pattern in (
        r"以\s*['\"]([^'\"]+)['\"]",
        r"题目[为:]?\s*['\"]([^'\"]+)['\"]",
        r"['\"]([A-Za-z][^'\"]{1,60})['\"]",
    ):
        match = re.search(pattern, text)
        if match:
            return match.group(1).strip()
    sample_line = str(sample or '').strip().splitlines()
    if sample_line:
        first = sample_line[0].strip()
        if first and len(first) <= 80 and re.match(r'^[A-Za-z0-9 ,\'-]+$', first):
            return first
    return f'Writing Task {serial:02d}'


def detect_writing_type(question: str, sample: str) -> str:
    text = str(question or '')
    if any(key in text for key in ('开头', '续写', '所给开头', 'Read and write')):
        return 'continuation'
    sample_text = str(sample or '').strip()
    if sample_text and not sample_text.splitlines()[0].startswith('My '):
        first = sample_text.splitlines()[0].strip()
        if first.endswith('.') and len(first.split()) >= 6:
            return 'continuation'
    return 'topic'


def extract_passage(question: str, sample: str, writing_type: str) -> str | None:
    if writing_type != 'continuation':
        return None
    text = str(question or '')
    match = re.search(r'开头[：:]\s*(.+?)(?:\n|$)', text)
    if match:
        return match.group(1).strip()
    sample_text = str(sample or '').strip()
    if not sample_text:
        return None
    first_line = sample_text.splitlines()[0].strip()
    return first_line or None


def build_topic(question: str, vocab: str, patterns: str, tense: str, person: str, word_limit: str) -> str:
    parts = [str(question or '').strip()]
    hints: list[str] = []
    if vocab and str(vocab) != 'nan':
        hints.append(f'参考词汇：{str(vocab).strip()}')
    if patterns and str(patterns) != 'nan':
        hints.append(f'参考句型：{str(patterns).strip()}')
    if tense and str(tense) != 'nan':
        hints.append(f'时态要求：{str(tense).strip()}')
    if person and str(person) != 'nan':
        hints.append(f'人称要求：{str(person).strip()}')
    if word_limit and str(word_limit) != 'nan':
        hints.append(f'词数要求：{str(word_limit).strip()}')
    if hints:
        parts.append('\n'.join(hints))
    return '\n\n'.join(part for part in parts if part)


def assign_stage_and_serial(index: int) -> tuple[str, int]:
    # First 6 stages get 5 questions, last 3 get 4.
    counts = [5] * 6 + [4] * 3
    cursor = 0
    for stage_no, count in enumerate(counts, start=1):
        if index < cursor + count:
            return str(stage_no).zfill(2), index - cursor + 1
        cursor += count
    return '09', 1


def convert_row(row: pd.Series) -> dict:
    serial = int(row['序号'])
    question = str(row['题目'] or '')
    sample = str(row['参考范文'] or '')
    writing_type = detect_writing_type(question, sample)
    stage, stage_serial = assign_stage_and_serial(serial - 1)
    word_min, word_max = parse_word_limits(row.get('词数要求', ''))
    title = extract_title(question, sample, serial)
    passage = extract_passage(question, sample, writing_type)
    topic = build_topic(
        question,
        row.get('参考词汇', ''),
        row.get('参考句型', ''),
        row.get('时态要求', ''),
        row.get('人称要求', ''),
        row.get('词数要求', ''),
    )

    return {
        'prompt_id': f'WP-{REALM}-{stage}-{stage_serial}',
        'writing_type': writing_type,
        'realm': REALM,
        'stage': stage,
        'title': title,
        'topic': topic,
        'passage': passage,
        'word_limit_min': word_min,
        'word_limit_max': word_max,
        'scoring_criteria': {
            'grade': '六年级',
            'source_serial': serial,
            'question_type': str(row.get('题型', '') or ''),
            'reference_vocab': str(row.get('参考词汇', '') or ''),
            'reference_sentences': str(row.get('参考句型', '') or ''),
            'tense_requirement': str(row.get('时态要求', '') or ''),
            'person_requirement': str(row.get('人称要求', '') or ''),
            'word_limit_note': str(row.get('词数要求', '') or ''),
            'reference_sample': sample if sample and sample != 'nan' else '',
        },
    }


def main() -> int:
    xlsx = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_XLSX
    if not xlsx.exists():
        print(f'Excel not found: {xlsx}', file=sys.stderr)
        return 1

    df = pd.read_excel(xlsx)
    rows = [convert_row(row) for _, row in df.iterrows()]
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Wrote {len(rows)} prompts to {OUTPUT}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
