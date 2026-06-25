"""Generate stylized UI assets for the speaking (诵咒峰 / 回声崖) module."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "resources" / "assets" / "images" / "ui" / "speaking"
OUT.mkdir(parents=True, exist_ok=True)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def mix(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return (
        int(lerp(c1[0], c2[0], t)),
        int(lerp(c1[1], c2[1], t)),
        int(lerp(c1[2], c2[2], t)),
    )


def radial_glow(
    size: tuple[int, int],
    center: tuple[float, float],
    radius: float,
    color: tuple[int, int, int, int],
) -> Image.Image:
    w, h = size
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    px = img.load()
    cx, cy = center
    for y in range(h):
        for x in range(w):
            d = math.hypot(x - cx, y - cy) / max(radius, 1)
            if d > 1:
                continue
            alpha = int(color[3] * (1 - d) ** 1.5)
            px[x, y] = (color[0], color[1], color[2], alpha)
    return img


def draw_background() -> None:
    w, h = 1920, 1080
    base = Image.new("RGB", (w, h), (8, 12, 28))
    draw = ImageDraw.Draw(base)

    # night sky gradient
    for y in range(h):
        t = y / h
        c = mix((12, 18, 42), (4, 8, 18), t)
        draw.line([(0, y), (w, y)], fill=c)

    # distant mountains
    pts_left = [(0, h), (0, int(h * 0.55)), (int(w * 0.35), int(h * 0.42)), (int(w * 0.5), int(h * 0.58)), (0, h)]
    draw.polygon(pts_left, fill=(18, 28, 52))
    pts_right = [(w, h), (w, int(h * 0.5)), (int(w * 0.62), int(h * 0.38)), (int(w * 0.45), int(h * 0.55)), (w, h)]
    draw.polygon(pts_right, fill=(14, 22, 48))

    # echo cliff face (center)
    cliff = [
        (int(w * 0.32), h),
        (int(w * 0.38), int(h * 0.35)),
        (int(w * 0.5), int(h * 0.28)),
        (int(w * 0.62), int(h * 0.35)),
        (int(w * 0.68), h),
    ]
    draw.polygon(cliff, fill=(22, 32, 58))
    draw.polygon(
        [
            (int(w * 0.4), h),
            (int(w * 0.44), int(h * 0.4)),
            (int(w * 0.5), int(h * 0.34)),
            (int(w * 0.56), int(h * 0.4)),
            (int(w * 0.6), h),
        ],
        fill=(30, 44, 78),
    )

    rgba = base.convert("RGBA")
    # moon / spirit orb
    rgba = Image.alpha_composite(rgba, radial_glow((w, h), (w * 0.72, h * 0.18), 120, (180, 220, 255, 100)))
    # cliff resonance pool
    rgba = Image.alpha_composite(rgba, radial_glow((w, h), (w * 0.5, h * 0.72), 320, (80, 160, 255, 90)))
    rgba = Image.alpha_composite(rgba, radial_glow((w, h), (w * 0.5, h * 0.72), 180, (126, 232, 255, 70)))

    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    cx, cy = int(w * 0.5), int(h * 0.72)

    # concentric echo rings on cliff
    for r, alpha in ((280, 40), (220, 55), (160, 70), (100, 85)):
        od.ellipse((cx - r, cy - r // 2, cx + r, cy + r // 2), outline=(126, 232, 255, alpha), width=2)

    # sound wave arcs
    for i in range(5):
        ry = cy - 40 - i * 28
        rx = 100 + i * 35
        od.arc((cx - rx, ry - 12, cx + rx, ry + 12), start=200, end=340, fill=(100, 180, 255, 50 - i * 6), width=2)

    # floating echo runes (wave symbols)
    for i, (fx, fy, s) in enumerate(
        (
            (0.15, 0.25, 1.0),
            (0.85, 0.22, 0.9),
            (0.1, 0.62, 0.75),
            (0.88, 0.58, 0.8),
            (0.22, 0.88, 0.65),
            (0.78, 0.85, 0.7),
        )
    ):
        rune = make_echo_rune(int(80 * s))
        px = int(w * fx - rune.width / 2)
        py = int(h * fy - rune.height / 2)
        overlay.alpha_composite(rune, (px, py))

    # mist at bottom
    for y in range(int(h * 0.75), h):
        t = (y - h * 0.75) / (h * 0.25)
        od.line([(0, y), (w, y)], fill=(40, 80, 140, int(30 * t)))

    rgba = Image.alpha_composite(rgba, overlay)
    rgba = rgba.filter(ImageFilter.GaussianBlur(0.35))
    rgba.save(OUT / "background.png", optimize=True)


def make_echo_rune(size: int = 80) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = size // 2, size // 2
    draw.rounded_rectangle((4, 4, size - 4, size - 4), radius=10, fill=(20, 40, 80, 140), outline=(126, 232, 255, 120), width=2)
    # wave glyph ～
    for i in range(3):
        y = cy - 8 + i * 8
        draw.arc((cx - 18, y - 6, cx + 18, y + 6), start=0, end=180, fill=(180, 230, 255, 180), width=2)
    return img


def draw_staff_panel() -> None:
    w, h = 960, 280
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((0, 0, w - 1, h - 1), radius=20, fill=(10, 18, 38, 230), outline=(100, 180, 255, 200), width=3)
    draw.rounded_rectangle((10, 10, w - 11, h - 11), radius=16, outline=(60, 120, 200, 80), width=1)

    # staff lines
    for i, y in enumerate((70, 100, 130)):
        draw.line([(40, y), (w - 40, y)], fill=(126, 232, 255, 45 if i == 1 else 30), width=1)

    # clef hint (stylized)
    draw.ellipse((48, 88, 68, 128), outline=(126, 232, 255, 100), width=2)
    draw.line([(58, 88), (58, 140)], fill=(126, 232, 255, 80), width=2)

    # corner ornaments
    for x in (24, w - 24):
        draw.polygon([(x, 24), (x - 8, 36), (x + 8, 36)], fill=(126, 232, 255, 120))

    glow = radial_glow((w, h), (w / 2, h / 2), 200, (60, 140, 255, 35))
    img = Image.alpha_composite(img, glow)
    img.save(OUT / "staff_panel.png", optimize=True)


def draw_context_bubble() -> None:
    w, h = 960, 220
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    body = (18, 28, 52, 235)
    edge = (100, 180, 255, 220)
    inner = (24, 38, 68, 200)
    draw.rounded_rectangle((12, 8, w - 12, h - 28), radius=18, fill=body, outline=edge, width=3)
    draw.rounded_rectangle((24, 20, w - 24, h - 40), radius=12, outline=(126, 232, 255, 60), width=1)
    draw.rectangle((24, 20, w - 24, h - 40), fill=inner)
    # speech tail
    draw.polygon([(w // 2 - 16, h - 28), (w // 2, h - 4), (w // 2 + 16, h - 28)], fill=body, outline=edge)
    draw.line([(w // 2 - 14, h - 28), (w // 2 + 14, h - 28)], fill=body, width=2)
    # sound dots
    for i, dx in enumerate((-30, -10, 10, 30)):
        draw.ellipse((w // 2 + dx - 4, 14 - i, w // 2 + dx + 4, 22 - i), fill=(126, 232, 255, 150))
    img.save(OUT / "context_bubble.png", optimize=True)


def draw_spirit_bell() -> None:
    s = 200
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx = s // 2
    # outer glow
    glow = radial_glow((s, s), (cx, s * 0.55), 90, (80, 180, 255, 90))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    # bell body
    draw.polygon(
        [(cx, 36), (cx - 52, 118), (cx - 38, 148), (cx + 38, 148), (cx + 52, 118)],
        fill=(70, 120, 200, 255),
        outline=(180, 230, 255, 255),
    )
    draw.polygon(
        [(cx, 48), (cx - 38, 112), (cx - 28, 136), (cx + 28, 136), (cx + 38, 112)],
        fill=(100, 160, 230, 255),
    )
    # rim
    draw.arc((cx - 42, 130, cx + 42, 158), start=0, end=180, fill=(220, 240, 255, 255), width=3)
    # clapper
    draw.ellipse((cx - 8, 132, cx + 8, 148), fill=(200, 220, 255, 255))
    draw.line([(cx, 118), (cx, 136)], fill=(220, 240, 255, 200), width=2)
    # top loop
    draw.arc((cx - 14, 18, cx + 14, 46), start=180, end=0, fill=(180, 220, 255, 255), width=4)
    draw.rectangle((cx - 4, 30, cx + 4, 42), fill=(140, 180, 230, 255))

    # sound waves on bell
    for i, r in enumerate((58, 72, 86)):
        draw.arc((cx - r, 50, cx + r, 150), start=220, end=320, fill=(200, 240, 255, 100 - i * 25), width=2)

    img.save(OUT / "spirit_bell.png", optimize=True)


def draw_bell_pedestal() -> None:
    w, h = 280, 80
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse((20, 20, w - 20, h - 8), fill=(30, 50, 90, 220), outline=(126, 232, 255, 150), width=2)
    draw.ellipse((40, 28, w - 40, h - 16), fill=(50, 80, 140, 180))
    draw.line([(0, h - 4), (w, h - 4)], fill=(126, 232, 255, 80), width=2)
    img.save(OUT / "bell_pedestal.png", optimize=True)


def draw_echo_gallery() -> None:
    w, h = 960, 360
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((0, 0, w - 1, h - 1), radius=18, fill=(6, 12, 28, 240), outline=(80, 160, 230, 200), width=3)
    draw.rounded_rectangle((12, 12, w - 13, h - 13), radius=14, outline=(126, 232, 255, 50), width=1)
    # echo wave header
    for i in range(8):
        x = 60 + i * 100
        draw.arc((x, 16, x + 60, 46), start=200, end=340, fill=(100, 180, 255, 40), width=2)
    img.save(OUT / "echo_gallery.png", optimize=True)


def draw_btn_cast() -> None:
    w, h = 320, 64
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((0, 0, w, h), radius=16, fill=(40, 100, 180, 255), outline=(180, 230, 255, 255), width=2)
    draw.rounded_rectangle((4, 4, w - 4, h - 12), radius=12, fill=(70, 150, 230, 255))
    # shine
    draw.rounded_rectangle((12, 8, w - 80, h // 2), radius=8, fill=(180, 230, 255, 60))
    img.save(OUT / "btn_cast.png", optimize=True)


def draw_btn_listen() -> None:
    w, h = 180, 44
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((0, 0, w, h), radius=22, fill=(20, 40, 80, 220), outline=(126, 232, 255, 180), width=2)
    # headphone hint arcs
    cx = 28
    draw.arc((cx - 10, 12, cx + 10, 32), start=90, end=270, fill=(126, 232, 255, 200), width=2)
    draw.arc((cx + 4, 12, cx + 24, 32), start=90, end=270, fill=(126, 232, 255, 200), width=2)
    img.save(OUT / "btn_listen.png", optimize=True)


def draw_deco_mist() -> None:
    w, h = 200, 60
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for i in range(5):
        x = i * 40
        g = radial_glow((80, 50), (40, 30), 35, (100, 180, 255, 50))
        img.alpha_composite(g, (x, 5))
    img.save(OUT / "deco_mist.png", optimize=True)


def main() -> None:
    draw_background()
    draw_staff_panel()
    draw_context_bubble()
    draw_spirit_bell()
    draw_bell_pedestal()
    draw_echo_gallery()
    draw_btn_cast()
    draw_btn_listen()
    draw_deco_mist()
    print(f"Wrote speaking assets to {OUT}")


if __name__ == "__main__":
    main()
