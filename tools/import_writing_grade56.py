#!/usr/bin/env python3
"""Convert grade 5-6 writing Excel to JSON for Laravel seeder."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pandas as pd

DEFAULT_XLSX = Path(
    r'c:\Users\Administrator\Documents\WeChat Files\wxid_znj0gx1tx1zq22'
    r'\FileStorage\File\2026-06\五六年级写作_含范文.xlsx'
)
OUTPUT = Path(__file__).resolve().parents[1] / 'database' / 'seeders' / 'data' / 'writing_grade56.json'

# 五年级上/下 → L1 07/08；六年级上/下 → L1 09 / L2 01（符篆台从练气七层 L1-07 解锁）
GRADE_REALM_STAGE: dict[str, tuple[str, str]] = {
    '五年级上册': ('L1', '07'),
    '五年级下册': ('L1', '08'),
    '六年级上册': ('L1', '09'),
    '六年级下册': ('L2', '01'),
}


def parse_word_limits(question: str) -> tuple[int, int]:
    text = str(question or '').strip()
    if re.search(r'60\s*[-~到至]\s*70', text):
        return 60, 70
    m = re.search(r'不少于\s*(\d+)\s*词', text)
    if m:
        minimum = int(m.group(1))
        return minimum, max(minimum + 30, minimum + 20)
    m = re.search(r'不少于\s*(\d+)\s*字', text)
    if m:
        minimum = int(m.group(1))
        return minimum, max(minimum + 30, minimum + 20)
    if re.search(r'不少于\s*(\d+)\s*句', text):
        m = re.search(r'不少于\s*(\d+)\s*句', text)
        if m:
            sentences = int(m.group(1))
            return max(30, sentences * 8), max(60, sentences * 15)
    if re.search(r'至少?\s*5', text) or '5句话' in text or '5句' in text:
        return 35, 90
    if re.search(r'不少于\s*6', text) or '6句' in text:
        return 40, 100
    return 50, 80


def extract_title(question: str, sample: str, serial: int) -> str:
    text = str(question or '')
    for pattern in (
        r'用题目[：:]\s*([A-Za-z][A-Za-z0-9\s\'-]+)',
        r'题目[：:]\s*([A-Za-z][A-Za-z0-9\s\'-]+)',
        r"以\s*['\"]([^'\"]+)['\"]",
        r"['\"]([A-Za-z][^'\"]{1,60})['\"]",
    ):
        match = re.search(pattern, text)
        if match:
            return match.group(1).strip().rstrip('来')
    sample_line = str(sample or '').strip().splitlines()
    if sample_line:
        first = sample_line[0].strip()
        if first and len(first) <= 80:
            return first
    return f'Writing Task {serial:02d}'


def detect_writing_type(question: str, sample: str) -> str:
    text = str(question or '')
    if any(key in text for key in ('开头', '续写', '所给开头', 'Read and write')):
        return 'continuation'
    sample_text = str(sample or '').strip()
    if sample_text:
        first = sample_text.splitlines()[0].strip()
        if first.endswith('.') and len(first.split()) >= 6 and not first.startswith('My '):
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


def convert_row(row: pd.Series, stage_serial: int) -> dict:
    grade = str(row['年级'] or '').strip()
    question = str(row['题目'] or '')
    sample = str(row['答案范文'] or '')
    if sample == 'nan':
        sample = ''

    realm, stage = GRADE_REALM_STAGE.get(grade, ('L1', '07'))
    writing_type = detect_writing_type(question, sample)
    word_min, word_max = parse_word_limits(question)
    title = extract_title(question, sample, stage_serial)
    passage = extract_passage(question, sample, writing_type)

    return {
        'prompt_id': f'WP-{realm}-{stage}-{stage_serial}',
        'writing_type': writing_type,
        'realm': realm,
        'stage': stage,
        'title': title,
        'topic': question.strip(),
        'passage': passage,
        'word_limit_min': word_min,
        'word_limit_max': word_max,
        'scoring_criteria': {
            'grade': grade,
            'reference_sample': sample,
        },
    }


def main() -> int:
    xlsx = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_XLSX
    if not xlsx.exists():
        print(f'Excel not found: {xlsx}', file=sys.stderr)
        return 1

    df = pd.read_excel(xlsx)
    counters: dict[tuple[str, str], int] = {}
    rows: list[dict] = []

    for _, row in df.iterrows():
        grade = str(row['年级'] or '').strip()
        key = GRADE_REALM_STAGE.get(grade, ('L1', '07'))
        counters[key] = counters.get(key, 0) + 1
        rows.append(convert_row(row, counters[key]))

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Wrote {len(rows)} prompts to {OUTPUT}')
    for grade, (realm, stage) in GRADE_REALM_STAGE.items():
        count = sum(1 for r in rows if r['scoring_criteria']['grade'] == grade)
        print(f'  {grade} -> {realm}-{stage}: {count}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
