from __future__ import annotations

import math
import random
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
THEME = ROOT / "assets" / "themes" / "spiderman"
SOURCE = ROOT / "design-source" / "spiderman"
GENERATED = Path(r"C:\Users\aldor\.codex\generated_images\01a0a0cc-d15a-7c52-a98a-44c330a770db")
TEXTURE_SOURCE = GENERATED / "exec-1788c45d-9e25-4aa3-8155-891e0d3f29f1.png"
ICONS_SOURCE = GENERATED / "exec-8b43f488-e322-4803-94e3-a4a9d1a051cb.png"

INK = (13, 24, 48, 255)
NAVY = (17, 36, 69, 255)
RED = (191, 31, 52, 255)
RED_DARK = (114, 15, 34, 255)
CREAM = (250, 240, 215, 255)
YELLOW = (245, 199, 73, 255)
WHITE = (255, 250, 237, 255)


def save_webp(image: Image.Image, name: str, quality: int = 78) -> None:
    image.save(THEME / name, "WEBP", quality=quality, method=6, exact=True)


def save_master(image: Image.Image, name: str) -> None:
    image.save(SOURCE / name, "PNG", optimize=True)


def web(draw: ImageDraw.ImageDraw, center: tuple[int, int], radius: int, color, width: int = 5) -> None:
    cx, cy = center
    for angle in range(0, 360, 45):
        rad = math.radians(angle)
        draw.line((cx, cy, cx + math.cos(rad) * radius, cy + math.sin(rad) * radius), fill=color, width=width)
    for ring in (0.25, 0.48, 0.72, 1.0):
        points = []
        for angle in range(0, 361, 15):
            rad = math.radians(angle)
            wave = 1 - 0.07 * abs(math.sin(rad * 4))
            points.append((cx + math.cos(rad) * radius * ring * wave, cy + math.sin(rad) * radius * ring * wave))
        draw.line(points, fill=color, width=max(2, width - 2), joint="curve")


def comic_burst(size: int, outer=YELLOW, inner=RED) -> Image.Image:
    image = Image.new("RGBA", (size, size))
    draw = ImageDraw.Draw(image)
    cx = cy = size / 2
    points = []
    for index in range(32):
        angle = math.pi * 2 * index / 32 - math.pi / 2
        radius = size * (0.47 if index % 2 == 0 else 0.34)
        points.append((cx + math.cos(angle) * radius, cy + math.sin(angle) * radius))
    draw.polygon(points, fill=outer, outline=INK, width=max(5, size // 64))
    draw.ellipse((size * .27, size * .27, size * .73, size * .73), fill=inner, outline=INK, width=max(5, size // 64))
    return image


def eye_badge(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size))
    draw = ImageDraw.Draw(image)
    draw.ellipse((size * .08, size * .08, size * .92, size * .92), fill=RED, outline=INK, width=max(8, size // 28))
    web(draw, (size // 2, size // 2), int(size * .39), (255, 255, 255, 115), max(2, size // 90))
    left = [(size*.23, size*.38), (size*.46, size*.25), (size*.42, size*.67), (size*.26, size*.57)]
    right = [(size-x, y) for x, y in left]
    draw.polygon(left, fill=WHITE, outline=INK)
    draw.polygon(right, fill=WHITE, outline=INK)
    return image


def spider_badge(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size))
    draw = ImageDraw.Draw(image)
    cx, cy = size // 2, size // 2
    draw.ellipse((cx-size*.07, cy-size*.2, cx+size*.07, cy), fill=INK)
    draw.ellipse((cx-size*.11, cy-size*.01, cx+size*.11, cy+size*.2), fill=INK)
    for side in (-1, 1):
        for offset in (-.14, -.04, .06, .16):
            start = (cx + side*size*.07, cy + size*offset)
            mid = (cx + side*size*.24, cy + size*(offset-.09 if offset < .02 else offset+.06))
            end = (cx + side*size*.39, cy + size*(offset-.01 if offset < .02 else offset+.15))
            draw.line((start, mid, end), fill=INK, width=max(7, size//34), joint="curve")
    return image


def ribbon_emblem() -> Image.Image:
    size = 900
    image = Image.new("RGBA", (size, size))
    draw = ImageDraw.Draw(image)
    web(draw, (450, 410), 300, (255, 240, 218, 82), 6)
    draw.rounded_rectangle((185, 395, 715, 615), radius=28, fill=(245, 214, 180, 245), outline=INK, width=10)
    draw.rounded_rectangle((420, 365, 485, 650), radius=14, fill=RED, outline=INK, width=8)
    draw.polygon([(445, 405), (220, 230), (150, 250), (205, 430)], fill=RED, outline=INK)
    draw.polygon([(460, 405), (680, 225), (750, 250), (695, 430)], fill=RED, outline=INK)
    draw.ellipse((382, 335, 518, 475), fill=RED_DARK, outline=INK, width=9)
    badge = eye_badge(190)
    image.alpha_composite(badge, (355, 340))
    return image


def city_silhouette(width=1600, height=520) -> Image.Image:
    rng = random.Random(311)
    image = Image.new("RGBA", (width, height))
    draw = ImageDraw.Draw(image)
    x = 0
    while x < width:
        building_w = rng.randint(70, 145)
        top = rng.randint(110, 290)
        draw.rectangle((x, top, min(width, x + building_w), height), fill=INK)
        if rng.random() > .55:
            draw.polygon([(x+building_w*.4, top), (x+building_w*.5, top-55), (x+building_w*.6, top)], fill=INK)
        for wx in range(x + 18, x + building_w - 12, 26):
            for wy in range(top + 28, height - 25, 36):
                if rng.random() > .34:
                    draw.rectangle((wx, wy, wx + 10, wy + 14), fill=(245, 199, 73, rng.randint(100, 225)))
        x += building_w + rng.randint(6, 15)
    return image.filter(ImageFilter.GaussianBlur(.25))


def hero_panel(finale=False) -> Image.Image:
    width, height = (1200, 780)
    image = Image.new("RGBA", (width, height))
    draw = ImageDraw.Draw(image)
    burst = comic_burst(620, outer=(245, 199, 73, 230), inner=(191, 31, 52, 238))
    image.alpha_composite(burst, (290, 35))
    badge = eye_badge(310 if not finale else 250)
    image.alpha_composite(badge, (445 if not finale else 475, 180 if not finale else 125))
    if finale:
        city = city_silhouette(1200, 310)
        image.alpha_composite(city, (0, 470))
        draw.arc((350, 120, 850, 660), 198, 342, fill=WHITE, width=9)
        draw.ellipse((574, 420, 626, 472), fill=WHITE, outline=INK, width=5)
    else:
        for x, y, r in ((150, 120, 54), (1020, 170, 38), (170, 610, 32), (1050, 590, 58)):
            decal = spider_badge(r * 2)
            image.alpha_composite(decal, (x-r, y-r))
    return image


def trim_and_square(part: Image.Image, size=420) -> Image.Image:
    alpha = part.getchannel("A")
    alpha = alpha.point(lambda value: 255 if value > 10 else 0)
    bbox = alpha.getbbox()
    if bbox:
        part = part.crop(bbox)
    part.thumbnail((int(size*.82), int(size*.82)), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size))
    canvas.alpha_composite(part, ((size-part.width)//2, (size-part.height)//2))
    return canvas


def make_assets() -> None:
    THEME.mkdir(parents=True, exist_ok=True)
    SOURCE.mkdir(parents=True, exist_ok=True)

    shutil.copy2(TEXTURE_SOURCE, SOURCE / "red-web-paper-source.png")
    shutil.copy2(ICONS_SOURCE, SOURCE / "module-icons-source.png")

    texture = Image.open(TEXTURE_SOURCE).convert("RGB").resize((512, 512), Image.Resampling.LANCZOS)
    texture = ImageEnhance.Color(texture).enhance(.9)
    save_webp(texture, "red-web-paper.webp", 62)

    rng = random.Random(2026)
    grain = Image.new("RGB", (512, 512), (245, 234, 211))
    px = grain.load()
    for y in range(512):
        for x in range(512):
            noise = rng.randint(-13, 13)
            px[x, y] = (max(0, 245+noise), max(0, 234+noise), max(0, 211+noise))
    grain = grain.filter(ImageFilter.GaussianBlur(.32))
    save_master(grain, "paper-grain.png")
    save_webp(grain, "paper-grain.webp", 48)

    icon_sheet = Image.open(ICONS_SOURCE).convert("RGBA")
    width, height = icon_sheet.size
    quadrants = {
        "icon-reasons.webp": (0, 0, width//2, height//2),
        "icon-gallery.webp": (width//2, 0, width, height//2),
        "icon-music.webp": (0, height//2, width//2, height),
        "icon-letter.webp": (width//2, height//2, width, height),
    }
    for name, box in quadrants.items():
        icon = trim_and_square(icon_sheet.crop(box))
        save_master(icon, name.replace(".webp", ".png"))
        save_webp(icon, name, 78)

    opening = ribbon_emblem()
    greeting = hero_panel(False)
    finale = hero_panel(True)
    city = city_silhouette()
    decals = {
        "decal-web": Image.new("RGBA", (420, 420)),
        "decal-mask": eye_badge(420),
        "decal-burst": comic_burst(420),
        "decal-spider": spider_badge(420),
    }
    web(ImageDraw.Draw(decals["decal-web"]), (210, 210), 195, (255, 250, 237, 235), 7)

    for name, asset in (("opening-emblem", opening), ("greeting-hero", greeting), ("finale-hero", finale), ("city-silhouette", city), *decals.items()):
        save_master(asset, f"{name}.png")
        quality = 78 if name in {"greeting-hero", "finale-hero"} else 82
        save_webp(asset, f"{name}.webp", quality)

    thumbnail = Image.new("RGB", (800, 600), (128, 15, 36))
    thumbnail.paste(texture.resize((800, 800), Image.Resampling.LANCZOS).crop((0, 100, 800, 700)), (0, 0))
    overlay = hero_panel(False)
    overlay.thumbnail((690, 480), Image.Resampling.LANCZOS)
    thumbnail = thumbnail.convert("RGBA")
    thumbnail.alpha_composite(overlay, ((800-overlay.width)//2, 65))
    save_master(thumbnail, "thumbnail.png")
    save_webp(thumbnail.convert("RGB"), "thumbnail.webp", 72)

    for file in sorted(THEME.glob("*.webp")):
        print(f"{file.name}: {file.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    make_assets()
