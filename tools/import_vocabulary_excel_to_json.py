#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pandas as pd


def normalize_col_name(name: str) -> str:
    s = str(name or '').strip().lower()
    s = re.sub(r"\s+", "", s)
    return s


def pick_columns(columns: list[str]) -> dict[str, str]:
    """
    Heuristic mapping from Excel column headers to vocabulary_words fields.
    Expected output keys: lemma, phonetic, pos, grade_level, level_tag, meanings, examples
    """
    mapped: dict[str, str] = {}
    col_map = {c: normalize_col_name(c) for c in columns}

    for original, lc in col_map.items():
        if any(k in lc for k in ["单词", "word", "词汇", "英文", "vocab"]):
            mapped.setdefault("lemma", original)
        if "音标" in lc or (("phon" in lc) and "etic" in lc):
            mapped.setdefault("phonetic", original)
        if "词性" in lc or lc == "pos":
            mapped.setdefault("pos", original)
        if "年级" in lc or "grade" in lc:
            mapped.setdefault("grade_level", original)
        if any(k in lc for k in ["难度", "level", "词汇等级", "tag"]):
            mapped.setdefault("level_tag", original)
        if any(k in lc for k in ["释义", "mean", "中文", "meaning"]):
            mapped.setdefault("meanings", original)
        if any(k in lc for k in ["例句", "例子", "example", "例词句"]):
            mapped.setdefault("examples", original)

    # Fallback by position for Excel files with garbled headers:
    # 1st=所属课本(年级), 2nd=所属单元, 3rd=英文单词, 4th=中文释义
    if len(columns) >= 4:
        mapped.setdefault("grade_level", columns[0])
        mapped.setdefault("lemma", columns[2])
        mapped.setdefault("meanings", columns[3])

    return mapped


def split_meanings(cell: object) -> list[str] | None:
    if cell is None or (isinstance(cell, float) and pd.isna(cell)):
        return None
    text = str(cell).strip()
    if not text or text.lower() == "nan":
        return None
    # Common separators: / ; ， 、 , \n
    parts = re.split(r"[/;；，、,\n]+", text)
    parts = [p.strip() for p in parts if p.strip()]
    if not parts:
        return None
    return parts


def split_examples(cell: object) -> list[str] | None:
    if cell is None or (isinstance(cell, float) and pd.isna(cell)):
        return None
    text = str(cell).strip()
    if not text or text.lower() == "nan":
        return None
    # Allow multiple examples separated by newline or semicolon
    parts = re.split(r"[;\n]+", text)
    parts = [p.strip() for p in parts if p.strip()]
    return parts or None


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python tools/import_vocabulary_excel_to_json.py <excel_path> [--sheet=N]", file=sys.stderr)
        return 2

    excel_path = Path(sys.argv[1])
    # Default: read the first sheet.
    sheet_name: int | str | None = 0
    for arg in sys.argv[2:]:
        if arg.startswith("--sheet="):
            sheet_index = int(arg.split("=", 1)[1])
            sheet_name = sheet_index

    if not excel_path.exists():
        print(f"Excel not found: {excel_path}", file=sys.stderr)
        return 1

    df = pd.read_excel(excel_path, sheet_name=sheet_name)
    if df is None or df.empty:
        print("Excel is empty.", file=sys.stderr)
        return 1

    columns = [str(c) for c in df.columns.tolist()]
    mapped = pick_columns(columns)
    if "lemma" not in mapped:
        print("Failed to identify word column. Columns:", columns, file=sys.stderr)
        return 1

    rows: list[dict] = []
    for _, rec in df.iterrows():
        lemma = str(rec.get(mapped["lemma"]) or "").strip()
        if not lemma or lemma.lower() == "nan":
            continue

        item: dict = {
            "lemma": lemma,
            "phonetic": None,
            "pos": None,
            "grade_level": None,
            "level_tag": "小学",
            "meanings": None,
            "examples": None,
        }

        if "phonetic" in mapped:
            v = rec.get(mapped["phonetic"])
            item["phonetic"] = None if pd.isna(v) else (str(v).strip() or None)
        if "pos" in mapped:
            v = rec.get(mapped["pos"])
            item["pos"] = None if pd.isna(v) else (str(v).strip() or None)
        if "grade_level" in mapped:
            v = rec.get(mapped["grade_level"])
            item["grade_level"] = None if pd.isna(v) else (str(v).strip() or None)
        if "level_tag" in mapped:
            v = rec.get(mapped["level_tag"])
            item["level_tag"] = None if pd.isna(v) else (str(v).strip() or None)

        if "meanings" in mapped:
            item["meanings"] = split_meanings(rec.get(mapped["meanings"]))
        if "examples" in mapped:
            item["examples"] = split_examples(rec.get(mapped["examples"]))

        # Drop null fields for smaller JSON
        item = {k: v for k, v in item.items() if v is not None}
        rows.append(item)

    out_path = Path(__file__).resolve().parents[1] / "database" / "seeders" / "data" / f"vocabulary_words_import_{excel_path.stem}.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Excel->JSON done. Total: {len(rows)}")
    print(f"Mapped columns: {mapped}")
    print(f"Wrote: {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

