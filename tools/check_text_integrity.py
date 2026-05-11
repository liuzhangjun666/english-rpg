from __future__ import annotations

from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
TARGET_DIRS = [ROOT / "resources" / "js", ROOT / "resources" / "css"]
TARGET_SUFFIXES = {".js", ".css"}


def iter_target_files():
    for base in TARGET_DIRS:
        if not base.exists():
            continue
        for p in base.rglob("*"):
            if p.is_file() and p.suffix in TARGET_SUFFIXES:
                yield p


def main() -> int:
    issues: list[str] = []

    for path in iter_target_files():
        rel = path.relative_to(ROOT)
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError as exc:
            issues.append(f"[ENCODING] {rel}: not valid UTF-8 ({exc})")
            continue

        if "\ufffd" in text:
            issues.append(f"[REPLACEMENT_CHAR] {rel}: contains U+FFFD")

        if "label: '??" in text or 'label: "??' in text:
            issues.append(f"[PLACEHOLDER] {rel}: contains placeholder label like ??/???")

    if issues:
        print("Text integrity check failed:")
        for issue in issues:
            print(f"- {issue}")
        return 1

    print("Text integrity check passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

