from __future__ import annotations

from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {
    ".git",
    "node_modules",
    "vendor",
    "storage",
    "public/build",
}
TARGET_SUFFIXES = {
    ".php",
    ".js",
    ".css",
    ".blade.php",
    ".json",
    ".md",
    ".yml",
    ".yaml",
    ".env.example",
}
CONFLICT_PREFIXES = ("<<<<<<<", "=======", ">>>>>>>")


def is_skipped(path: Path) -> bool:
    rel = path.relative_to(ROOT).as_posix()
    return any(rel == item or rel.startswith(f"{item}/") for item in SKIP_DIRS)


def is_target(path: Path) -> bool:
    name = path.name
    return path.suffix in TARGET_SUFFIXES or any(name.endswith(suffix) for suffix in TARGET_SUFFIXES)


def get_unmerged_paths() -> list[str]:
    try:
        result = subprocess.run(
            ["git", "diff", "--name-only", "--diff-filter=U"],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
    except OSError:
        return []

    if result.returncode != 0:
        return []

    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def iter_target_files():
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        if is_skipped(path):
            continue
        if is_target(path):
            yield path


def main() -> int:
    issues: list[str] = []

    for rel in get_unmerged_paths():
        issues.append(f"[UNMERGED] {rel}")

    for path in iter_target_files():
        rel = path.relative_to(ROOT)
        try:
            with path.open("r", encoding="utf-8", errors="ignore") as f:
                for line_no, line in enumerate(f, 1):
                    stripped = line.lstrip()
                    if stripped.startswith(CONFLICT_PREFIXES):
                        issues.append(f"[MARKER] {rel}:{line_no}: {stripped.strip()}")
        except OSError as exc:
            issues.append(f"[READ_ERROR] {rel}: {exc}")

    if issues:
        print("Conflict check failed:")
        for issue in issues:
            print(f"- {issue}")
        return 1

    print("Conflict check passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
