"""Generate stylized UI assets for the writing (符篆台) module."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "resources" / "assets" / "images" / "ui" / "writing"
OUT.mkdir(parents=True, exist_ok=True)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def mix(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return (
        int(lerp(c1[0], c2[0], t)),
        int(lerp(c1[1], c2[1], t)),
        int(lerp(c1[2], c2[2], t)),
    )


def radial_glow(size: tuple[int, int], center: tuple[float, float], radius: float, color: tuple[int, int, int, int]) -> Image.Image:
    w, h = size
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    px = img.load()
    cx, cy = center
    for y in range(h):
        for x in range(w):
            d = math.hypot(x - cx, y - cy) / max(radius, 1)
            if d > 1:
                continue
            alpha = int(color[3] * (1 - d) ** 1.6)
            px[x, y] = (color[0], color[1], color[2], alpha)
    return img


def draw_background() -> None:
    w, h = 1920, 1080
    base = Image.new("RGB", (w, h), (12, 8, 4))
    draw = ImageDraw.Draw(base)

    for y in range(h):
        t = y / h
        c = mix((18, 10, 6), (6, 4, 8), t)
        draw.line([(0, y), (w, y)], fill=c)

    glow = radial_glow((w, h), (w * 0.5, h * 0.72), 520, (255, 190, 70, 120))
    altar = radial_glow((w, h), (w * 0.5, h * 0.78), 280, (255, 215, 120, 90))
    base = Image.alpha_composite(base.convert("RGBA"), glow)
    base = Image.alpha_composite(base, altar)

    # magic circle
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    cx, cy = int(w * 0.5), int(h * 0.78)
    for r, alpha in ((260, 55), (220, 75), (180, 95)):
        od.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(212, 168, 67, alpha), width=2)
    for i in range(8):
        ang = i * math.pi / 4
        x1 = cx + math.cos(ang) * 120
        y1 = cy + math.sin(ang) * 60
        x2 = cx + math.cos(ang) * 250
        y2 = cy + math.sin(ang) * 125
        od.line([(x1, y1), (x2, y2)], fill=(255, 210, 90, 45), width=2)

    # floating talismans
    for i, (fx, fy, rot, scale) in enumerate(
        (
            (0.12, 0.22, -18, 0.9),
            (0.86, 0.18, 14, 1.0),
            (0.08, 0.55, 8, 0.75),
            (0.9, 0.48, -10, 0.8),
            (0.18, 0.82, 6, 0.65),
            (0.82, 0.8, -8, 0.7),
        )
    ):
        paper = make_talisman((int(180 * scale), int(320 * scale)), seed=i + 3)
        paper = paper.rotate(rot, expand=True, resample=Image.Resampling.BICUBIC)
        px = int(w * fx - paper.width / 2)
        py = int(h * fy - paper.height / 2)
        overlay.alpha_composite(paper, (px, py))

    base = Image.alpha_composite(base, overlay)
    base = base.filter(ImageFilter.GaussianBlur(0.4))
    base.save(OUT / "background.png", optimize=True)


def parchment(size: tuple[int, int], seed: int = 0) -> Image.Image:
    w, h = size
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    body = (248, 232, 198, 245)
    edge = (186, 142, 74, 255)
    inner = (255, 246, 224, 255)

    draw.rounded_rectangle((8, 10, w - 8, h - 10), radius=18, fill=body, outline=edge, width=3)
    draw.rounded_rectangle((18, 20, w - 18, h - 20), radius=12, outline=(212, 168, 67, 90), width=2)
    draw.rectangle((18, 20, w - 18, h - 20), fill=inner)

    # aged spots
    for i in range(12 + seed):
        x = 30 + (i * 73 + seed * 17) % (w - 60)
        y = 30 + (i * 41 + seed * 11) % (h - 60)
        r = 8 + (i % 4) * 3
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(210, 180, 130, 18))

    # top/bottom rods
    draw.rounded_rectangle((0, 4, w, 18), radius=8, fill=(120, 78, 28, 255))
    draw.rounded_rectangle((0, h - 18, w, h - 4), radius=8, fill=(120, 78, 28, 255))
    return img


def make_talisman(size: tuple[int, int], seed: int = 0) -> Image.Image:
    w, h = size
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((0, 0, w - 1, h - 1), radius=10, fill=(255, 244, 220, 210), outline=(212, 168, 67, 180), width=2)
    for y in range(40, h - 30, 22):
        draw.line([(24, y), (w - 24, y)], fill=(180, 150, 100, 35), width=1)
    # rune marks
    cx = w // 2
    draw.text((cx - 8, 28), "符", fill=(160, 110, 40, 160))
    draw.ellipse((cx - 18, h - 70, cx + 18, h - 34), outline=(212, 168, 67, 120), width=2)
    return img


def draw_scroll_prompt() -> None:
    parchment((960, 300), seed=1).save(OUT / "scroll_prompt.png", optimize=True)


def draw_scroll_editor() -> None:
    parchment((960, 420), seed=2).save(OUT / "scroll_editor.png", optimize=True)


def draw_talisman_paper() -> None:
    make_talisman((300, 400), seed=5).save(OUT / "talisman_paper.png", optimize=True)


def draw_ink_stone() -> None:
    s = 160
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse((8, 24, s - 8, s - 8), fill=(35, 28, 22, 255), outline=(90, 70, 45, 255), width=3)
    draw.ellipse((28, 46, s - 28, s - 28), fill=(8, 6, 5, 255))
    draw.ellipse((42, 58, s - 42, s - 42), fill=(20, 16, 12, 255))
    # ink shine
    draw.ellipse((50, 66, 78, 88), fill=(70, 55, 30, 90))
    # brush hint
    draw.line([(108, 18), (132, 52)], fill=(120, 85, 45, 255), width=4)
    draw.ellipse((100, 10, 116, 26), fill=(210, 180, 120, 255))
    img.save(OUT / "ink_stone.png", optimize=True)


def draw_title_plate() -> None:
    w, h = 640, 96
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((0, 10, w, h - 10), radius=20, fill=(30, 18, 8, 220), outline=(212, 168, 67, 220), width=3)
    draw.rounded_rectangle((12, 18, w - 12, h - 18), radius=14, outline=(255, 215, 120, 80), width=1)
    for x in (40, w - 40):
        draw.polygon([(x, h // 2), (x - 10, h // 2 - 14), (x - 10, h // 2 + 14)], fill=(212, 168, 67, 200))
    img.save(OUT / "title_plate.png", optimize=True)


def draw_angle_card() -> None:
    w, h = 220, 150
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((4, 4, w - 4, h - 4), radius=16, fill=(20, 12, 6, 210), outline=(212, 168, 67, 180), width=2)
    draw.rounded_rectangle((14, 14, w - 14, h - 14), radius=10, outline=(255, 215, 120, 50), width=1)
    img.save(OUT / "angle_card.png", optimize=True)


def draw_btn_forge() -> None:
    w, h = 360, 72
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((0, 0, w, h), radius=18, fill=(168, 118, 28, 255), outline=(255, 228, 150, 255), width=2)
    draw.rounded_rectangle((6, 6, w - 6, h - 14), radius=14, fill=(212, 168, 67, 255))
    img.save(OUT / "btn_forge.png", optimize=True)


def draw_deco_lantern() -> None:
    s = 120
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse((30, 18, 90, 92), fill=(255, 120, 60, 220), outline=(255, 200, 120, 255), width=2)
    draw.rectangle((54, 8, 66, 20), fill=(212, 168, 67, 255))
    draw.rectangle((54, 90, 66, 104), fill=(212, 168, 67, 255))
    glow = radial_glow((s, s), (s / 2, s / 2), 50, (255, 160, 60, 80))
    img = Image.alpha_composite(img, glow)
    img.save(OUT / "deco_lantern.png", optimize=True)


def main() -> None:
    draw_background()
    draw_scroll_prompt()
    draw_scroll_editor()
    draw_talisman_paper()
    draw_ink_stone()
    draw_title_plate()
    draw_angle_card()
    draw_btn_forge()
    draw_deco_lantern()
    print(f"Wrote writing assets to {OUT}")


if __name__ == "__main__":
    main()
