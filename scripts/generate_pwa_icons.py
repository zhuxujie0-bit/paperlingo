#!/usr/bin/env python3
"""生成 Ella 小屋 PWA 图标：奶油底 + 红粉蝴蝶结（原创，无 Sanrio 素材）。"""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public"

CREAM = (255, 253, 248, 255)
RED = (223, 66, 109, 255)
RED_DARK = (199, 53, 97, 255)
PINK_LIGHT = (248, 123, 157, 255)
CENTER = (255, 244, 246, 255)


def rounded_rect(draw: ImageDraw.ImageDraw, box, radius, fill):
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def bow_loop(size: int, mirror: bool) -> Image.Image:
    """画一片蝴蝶结瓣（椭圆+内高光），返回可旋转的 RGBA 图层。"""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    w, h = int(size * 0.62), int(size * 0.46)
    x0, y0 = (size - w) // 2, (size - h) // 2
    d.ellipse([x0, y0, x0 + w, y0 + h], fill=RED, outline=RED_DARK, width=max(2, size // 60))
    # 高光
    hw, hh = int(w * 0.5), int(h * 0.28)
    hx0, hy0 = x0 + int(w * 0.16), y0 + int(h * 0.14)
    d.ellipse([hx0, hy0, hx0 + hw, hy0 + hh], fill=PINK_LIGHT)
    if mirror:
        layer = layer.transpose(Image.FLIP_LEFT_RIGHT)
    return layer


def make_icon(px: int, maskable: bool = False) -> Image.Image:
    scale = px / 512
    img = Image.new("RGBA", (px, px), (0, 0, 0, 0) if not maskable else CREAM)
    d = ImageDraw.Draw(img)
    margin = int(px * (0.02 if maskable else 0.0))
    radius = int(px * 0.22)
    rounded_rect(d, [margin, margin, px - margin, px - margin], radius, CREAM)
    if not maskable:
        d.rounded_rectangle([margin, margin, px - margin, px - margin], radius=radius, outline=RED_DARK, width=max(2, int(6 * scale)))

    loop_size = int(px * 0.58)
    left = bow_loop(loop_size, mirror=False).rotate(-18, expand=True, resample=Image.BICUBIC)
    right = bow_loop(loop_size, mirror=True).rotate(18, expand=True, resample=Image.BICUBIC)
    cy = int(px * 0.40)
    img.alpha_composite(left, (int(px * 0.06), cy - left.height // 2))
    img.alpha_composite(right, (px - int(px * 0.06) - right.width, cy - right.height // 2))

    # 中心结
    c = int(px * 0.14)
    d.ellipse([px // 2 - c // 2, cy - c // 2, px // 2 + c // 2, cy + c // 2], fill=CENTER, outline=RED_DARK, width=max(2, int(5 * scale)))

    # 书名文字
    try:
        from PIL import ImageFont
        font_size = int(px * 0.11)
        font = ImageFont.truetype("/System/Library/Fonts/PingFang.ttc", font_size)
        text = "Ella"
        bbox = d.textbbox((0, 0), text, font=font)
        d.text(((px - (bbox[2] - bbox[0])) / 2, int(px * 0.66)), text, font=font, fill=RED_DARK)
    except Exception:
        pass
    return img


def main():
    for px, name, maskable in [
        (192, "icon-192.png", False),
        (512, "icon-512.png", False),
        (512, "icon-maskable-512.png", True),
        (180, "apple-touch-icon.png", False),
        (64, "favicon-64.png", False),
    ]:
        icon = make_icon(px, maskable)
        if not maskable:
            bg = Image.new("RGBA", (px, px), (0, 0, 0, 0))
            bg.alpha_composite(icon)
            icon = bg
        icon.save(OUT / name)
        print("生成", name, f"{px}px")


if __name__ == "__main__":
    main()
