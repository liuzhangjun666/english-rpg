"""Remove white or dark matte fringe from PNG assets."""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


def decontaminate(path: Path, matte: tuple[int, int, int] = (255, 255, 255), alpha_cut: int = 18) -> Path:
    im = Image.open(path).convert('RGBA')
    data = np.array(im, dtype=np.float64)
    r, g, b, a = data[..., 0], data[..., 1], data[..., 2], data[..., 3]
    alpha = np.clip(a / 255.0, 0, 1)
    semi = (a > 0) & (a < 255)

    for i, m in enumerate(matte):
        ch = data[..., i]
        corrected = (ch - (1.0 - alpha) * m) / np.maximum(alpha, 1e-3)
        data[..., i] = np.where(semi, np.clip(corrected, 0, 255), ch)

    r, g, b, a = data[..., 0], data[..., 1], data[..., 2], data[..., 3]
    lum = 0.299 * r + 0.587 * g + 0.114 * b

    h, w = a.shape
    edge = np.zeros((h, w), dtype=bool)
    opaque = a >= 200
    transparent = a == 0
    for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)):
        y0, y1 = max(0, dy), min(h, h + dy)
        x0, x1 = max(0, dx), min(w, w + dx)
        sy0, sy1 = max(0, -dy), min(h, h - dy)
        sx0, sx1 = max(0, -dx), min(w, w - dx)
        shifted_opaque = np.zeros_like(opaque)
        shifted_trans = np.zeros_like(transparent)
        shifted_opaque[sy0:sy1, sx0:sx1] = opaque[y0:y1, x0:x1]
        shifted_trans[sy0:sy1, sx0:sx1] = transparent[y0:y1, x0:x1]
        edge |= (opaque & shifted_trans) | ((a > 0) & (a < 255) & shifted_trans)

    fringe = edge & (a < 220) & (lum > 150)
    data[..., 3] = np.where(fringe, np.clip(a * 0.35, 0, 255), a)
    data[..., 3] = np.where((a > 0) & (a < alpha_cut), 0, data[..., 3])

    r, g, b, a = data[..., 0], data[..., 1], data[..., 2], data[..., 3]
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    bright_edge = edge & (lum > 210) & (a > 0)
    for i in range(3):
        data[..., i] = np.where(bright_edge, data[..., i] * 0.82, data[..., i])

    out = np.clip(data, 0, 255).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(path, optimize=True)
    return path


def remove_dark_matte(path: Path, thresh: int = 28) -> Path:
    """Flood-fill dark/near-black background to transparent (AI icon exports)."""
    im = Image.open(path).convert('RGBA')
    width, height = im.size
    transparent = (0, 0, 0, 0)
    for xy in ((0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)):
        ImageDraw.floodfill(im, xy, transparent, thresh=thresh)
    for x in range(width):
        ImageDraw.floodfill(im, (x, 0), transparent, thresh=thresh)
        ImageDraw.floodfill(im, (x, height - 1), transparent, thresh=thresh)
    for y in range(height):
        ImageDraw.floodfill(im, (0, y), transparent, thresh=thresh)
        ImageDraw.floodfill(im, (width - 1, y), transparent, thresh=thresh)
    im.save(path, optimize=True)
    return path


def count_bright_edge(path: Path) -> int:
    im = Image.open(path).convert('RGBA')
    arr = np.array(im)
    a = arr[..., 3]
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    h, w = a.shape
    count = 0
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            if a[y, x] > 0 and (a[y - 1 : y + 2, x - 1 : x + 1] == 0).any():
                if int(r[y, x]) + int(g[y, x]) + int(b[y, x]) > 500:
                    count += 1
    return count


def main(argv: list[str]) -> int:
    args = list(argv[1:])
    use_dark = '--dark' in args
    if use_dark:
        args = [a for a in args if a != '--dark']

    paths = [Path(p) for p in args] if args else []
    if not paths:
        base = Path(__file__).resolve().parents[1] / 'resources/assets/images/ui'
        if use_dark:
            listen = base / 'listening'
            paths = [
                listen / 'wind_leaf.png',
                listen / 'wind_bell_play.png',
                listen / 'wind_chime_fragment.png',
            ]
        else:
            paths = [base / 'cangjingge' / 'question.png', base / 'cangjingge' / 'options.png']

    for path in paths:
        if use_dark:
            remove_dark_matte(path)
            print(f'{path.name}: dark matte removed')
            continue
        before = count_bright_edge(path)
        decontaminate(path)
        after = count_bright_edge(path)
        print(f'{path.name}: bright edge pixels {before} -> {after}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv))
