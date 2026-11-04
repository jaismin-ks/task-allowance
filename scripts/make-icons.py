# Regenerates assets/images/* (icon, adaptive icon, splash, favicon).
# Usage: python3 scripts/make-icons.py assets/images   (needs Pillow)
# Generates TaskAllowance's app icon set: a lime progress ring (3/4 full) on ink.
import math, sys
from PIL import Image, ImageDraw

OUT = sys.argv[1]
INK = (11, 11, 12, 255)
TRACK = (44, 44, 48, 255)
LIME = (198, 255, 61, 255)
WHITE = (255, 255, 255, 255)
SS = 4  # supersampling

def ring(size, diameter_frac, stroke_frac, bg, track, arc, sweep=270):
    S = size * SS
    img = Image.new('RGBA', (S, S), bg if bg else (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    D = S * diameter_frac
    w = S * stroke_frac
    c = S / 2
    r = D / 2 - w / 2  # centreline radius
    box = [c - D / 2, c - D / 2, c + D / 2, c + D / 2]
    if track:
        d.ellipse(box, outline=track, width=round(w))
    start = -90  # 12 o'clock, clockwise
    d.arc(box, start, start + sweep, fill=arc, width=round(w))
    for ang in (start, start + sweep):  # round caps
        x = c + r * math.cos(math.radians(ang))
        y = c + r * math.sin(math.radians(ang))
        d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=arc)
    return img.resize((size, size), Image.LANCZOS)

def save(img, name, rgb=False):
    if rgb:
        img = img.convert('RGB')
    img.save(f'{OUT}/{name}', optimize=True)

# iOS / store icon: full bleed, no transparency
save(ring(1024, 0.58, 0.13, INK, TRACK, LIME), 'icon.png', rgb=True)
# Android adaptive: content inside the central 66% safe zone
save(ring(1024, 0.52, 0.115, None, TRACK, LIME), 'android-icon-foreground.png')
save(Image.new('RGB', (1024, 1024), INK[:3]), 'android-icon-background.png')
save(ring(1024, 0.52, 0.115, None, None, WHITE), 'android-icon-monochrome.png')
# Splash: drawn on the #0B0B0C splash background at 200pt
save(ring(1024, 0.86, 0.19, None, TRACK, LIME), 'splash-icon.png')
save(ring(48, 0.80, 0.18, INK, TRACK, LIME), 'favicon.png', rgb=True)
