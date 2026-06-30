#!/usr/bin/env python3
"""Convert junior listening Excel to JSON for `php artisan listening:import-json`."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

try:
    import openpyxl
except ImportError as exc:  # pragma: no cover
    raise SystemExit("请先安装 openpyxl: pip install openpyxl") from exc


def parse_workbook(path: Path, realm: str, grade_level: str) -> dict:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(min_row=2, values_only=True))
    wb.close()

    passages: list[dict] = []
    current: dict | None = None

    for row in rows:
        cells = list(row) + [None] * 5
        passage_no, listening_text, sub_id, content, answer = cells[:5]

        if passage_no is not None and listening_text:
            if current:
                passages.append(current)
            current = {
                "passage_no": int(passage_no),
                "listening_text": str(listening_text).strip(),
                "questions": [],
            }

        if current is None:
            continue
        if not sub_id or not content or not answer:
            continue

        current["questions"].append(
            {
                "sub_id": str(sub_id).strip(),
                "content": str(content).strip(),
                "answer": str(answer).strip().upper(),
            }
        )

    if current:
        passages.append(current)

    return {
        "source": str(path),
        "import_source": path.stem,
        "realm": realm,
        "grade_level": grade_level,
        "level_tag": "初中",
        "passages": passages,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("excel", type=Path)
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("database/data/junior_grade8_listening_import.json"),
    )
    parser.add_argument("--realm", default="Z1")
    parser.add_argument("--grade-level", default="初二")
    args = parser.parse_args()

    if not args.excel.exists():
        print(f"文件不存在: {args.excel}", file=sys.stderr)
        return 1

    payload = parse_workbook(args.excel, args.realm, args.grade_level)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        f"已写入 {args.output}：{len(payload['passages'])} 段材料，"
        f"{sum(len(p['questions']) for p in payload['passages'])} 道题"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
