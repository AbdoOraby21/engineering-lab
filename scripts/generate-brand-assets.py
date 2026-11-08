#!/usr/bin/env python3
"""Generate the Engineering Lab brand asset set from the real logo emblem.

The source file (apps/web/public/images/brand/logo-source.png) is a raster
export of the circular emblem on a baked-in transparency checkerboard. Instead
of chroma-keying the checkerboard (which would eat silver/gray ring pixels),
we geometrically detect the emblem's outer ring, crop a square around it and
apply an anti-aliased circular alpha mask cut ~1.5 px inside the ring edge.
Pixels inside the circle are left untouched.

Outputs (all committed):
  apps/web/public/images/brand/logo-emblem-{512,256,128}.{png,webp}
  apps/web/public/images/brand/logo-emblem.{png,webp}      (512 canonical)
  apps/web/public/favicon.ico
  apps/web/public/favicon-32x32.png
  apps/web/public/favicon-192x192.png
  apps/web/public/favicon-512x512.png
  apps/web/public/apple-touch-icon.png                     (180)
  apps/web/public/images/brand/og-image.png                (1200x630)
  test-results/logo-circle-debug.png                       (verification)
  test-results/logo-halo-dark.png / logo-halo-light.png    (verification)

Usage:
  python scripts/generate-brand-assets.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "apps" / "web" / "public" / "images" / "brand" / "logo-source.png"
BRAND_DIR = ROOT / "apps" / "web" / "public" / "images" / "brand"
PUBLIC_DIR = ROOT / "apps" / "web" / "public"
TEST_RESULTS = ROOT / "test-results"

BG_DARK = (7, 11, 15)  # #070B0F
BG_WHITE = (255, 255, 255)
BRAND_GREEN = (34, 197, 94)  # #22C55E
BRAND_WHITE = (245, 247, 250)
MUTED = (154, 164, 178)

EMBLEM_SIZES = (512, 256, 128)
MASK_INSET = 1.5  # px cut inside the detected outer radius
HALO_TOLERANCE = 2  # max per-channel deviation from the background


# ---------------------------------------------------------------------------
# Circle detection
# ---------------------------------------------------------------------------

def detect_circle(gray: np.ndarray) -> tuple[float, float, float, np.ndarray]:
    """Return (cx, cy, outer_radius, edge_points) for the emblem's silver ring."""
    h, w = gray.shape
    blur = cv2.medianBlur(gray, 7)
    min_r = int(min(h, w) * 0.2)
    max_r = int(min(h, w) * 0.45)
    circles = cv2.HoughCircles(
        blur,
        cv2.HOUGH_GRADIENT,
        dp=1.2,
        minDist=int(min(h, w) * 0.35),
        param1=120,
        param2=50,
        minRadius=min_r,
        maxRadius=max_r,
    )
    if circles is None:
        raise SystemExit("Could not detect the emblem circle with HoughCircles.")
    cx0, cy0, r0 = (float(v) for v in np.round(circles[0][0]).astype(float))
    print(f"[detect] Hough seed: center=({cx0:.1f}, {cy0:.1f}) r={r0:.1f}")

    # Sample the strongest bright->dark radial gradient (the ring's outer edge)
    # at sub-pixel steps, then robustly fit a circle to those edge points.
    points: list[tuple[float, float]] = []
    for angle in np.deg2rad(np.arange(0.0, 360.0, 0.5)):
        radii = np.arange(r0 - 15.0, r0 + 15.0, 0.25)
        xs = (cx0 + radii * np.cos(angle)).astype(np.float32).reshape(1, -1)
        ys = (cy0 + radii * np.sin(angle)).astype(np.float32).reshape(1, -1)
        values = cv2.remap(gray, xs, ys, cv2.INTER_LINEAR).ravel()
        gradient = np.gradient(values)
        radius = radii[int(np.argmin(gradient))]
        points.append((cx0 + radius * np.cos(angle), cy0 + radius * np.sin(angle)))

    pts = np.asarray(points, dtype=np.float64)
    cx, cy, radius = cx0, cy0, r0
    for _ in range(6):
        a = np.c_[2.0 * pts[:, 0], 2.0 * pts[:, 1], np.ones(len(pts))]
        b = (pts ** 2).sum(axis=1)
        sol, *_ = np.linalg.lstsq(a, b, rcond=None)
        cx, cy = float(sol[0]), float(sol[1])
        radius = float(np.sqrt(sol[2] + cx * cx + cy * cy))
        residual = np.sqrt((pts[:, 0] - cx) ** 2 + (pts[:, 1] - cy) ** 2) - radius
        med = float(np.median(residual))
        mad = float(np.median(np.abs(residual - med)))
        limit = max(1.0, 3.0 * 1.4826 * mad)
        keep = np.abs(residual - med) <= limit
        if keep.all():
            break
        pts = pts[keep]

    residual = np.sqrt((pts[:, 0] - cx) ** 2 + (pts[:, 1] - cy) ** 2) - radius
    print(
        f"[detect] robust fit: center=({cx:.2f}, {cy:.2f}) outerR={radius:.2f} "
        f"residual_std={residual.std():.3f}px"
    )
    return cx, cy, radius, pts


def save_debug_overlay(img_bgr: np.ndarray, cx: float, cy: float, outer_r: float, mask_r: float) -> None:
    overlay = img_bgr.copy()
    center = (int(round(cx)), int(round(cy)))
    cv2.circle(overlay, center, int(round(outer_r)), (0, 0, 255), 2, cv2.LINE_AA)
    cv2.circle(overlay, center, int(round(mask_r)), (0, 255, 0), 1, cv2.LINE_AA)
    cv2.drawMarker(overlay, center, (255, 0, 255), cv2.MARKER_CROSS, 40, 2)
    label = f"center=({cx:.1f},{cy:.1f}) outerR={outer_r:.1f} maskR={mask_r:.1f}"
    cv2.putText(overlay, label, (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 3, cv2.LINE_AA)
    cv2.putText(overlay, label, (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 1, cv2.LINE_AA)
    TEST_RESULTS.mkdir(parents=True, exist_ok=True)
    out = TEST_RESULTS / "logo-circle-debug.png"
    cv2.imwrite(str(out), overlay)
    print(f"[debug] wrote {out.relative_to(ROOT)}")


# ---------------------------------------------------------------------------
# Masking / resizing
# ---------------------------------------------------------------------------

def build_masked_emblem(
    img_rgb: np.ndarray, cx: float, cy: float, outer_r: float, mask_r: float
) -> tuple[np.ndarray, float, float, float]:
    """Crop a square around the circle and apply an anti-aliased circular alpha mask.

    Returns (rgba_square, cx_in_crop, cy_in_crop, side).
    """
    side = int(np.ceil(2.0 * (outer_r + 1.0)))
    x0 = int(round(cx - side / 2.0))
    y0 = int(round(cy - side / 2.0))
    crop = img_rgb[y0 : y0 + side, x0 : x0 + side].copy()
    if crop.shape[0] != side or crop.shape[1] != side:
        raise SystemExit("Crop window fell outside the source image.")

    cx_crop = cx - x0
    cy_crop = cy - y0

    yy, xx = np.mgrid[0:side, 0:side]
    distance = np.sqrt((xx + 0.5 - cx_crop) ** 2 + (yy + 0.5 - cy_crop) ** 2)
    coverage = np.clip(mask_r + 0.5 - distance, 0.0, 1.0)  # 1 px AA transition
    alpha = (coverage * 255.0).round().astype(np.uint8)

    rgba = np.dstack([crop, alpha])
    return rgba, cx_crop, cy_crop, side


def resize_rgba_premultiplied(rgba: np.ndarray, size: int) -> np.ndarray:
    """Resize RGBA with premultiplied alpha so transparent pixels never bleed."""
    a = rgba[..., 3:4].astype(np.float32) / 255.0
    rgb = rgba[..., :3].astype(np.float32)
    premultiplied = np.concatenate([rgb * a, rgba[..., 3:4].astype(np.float32)], axis=2)
    resized = cv2.resize(premultiplied, (size, size), interpolation=cv2.INTER_AREA)
    a2 = resized[..., 3:4] / 255.0
    rgb2 = np.where(a2 > 1e-6, resized[..., :3] / np.maximum(a2, 1e-6), 0.0)
    return np.concatenate(
        [np.clip(rgb2, 0, 255), np.clip(resized[..., 3:4], 0, 255)], axis=2
    ).astype(np.uint8)


def composite_on(rgba: np.ndarray, bg: tuple[int, int, int]) -> np.ndarray:
    a = rgba[..., 3:4].astype(np.float32) / 255.0
    rgb = rgba[..., :3].astype(np.float32)
    bg_arr = np.asarray(bg, dtype=np.float32).reshape(1, 1, 3)
    return np.clip(rgb * a + bg_arr * (1.0 - a), 0, 255).astype(np.uint8)


def verify_halo(rgba: np.ndarray, bg: tuple[int, int, int]) -> tuple[bool, float]:
    """Ensure the annulus just outside the mask is exactly the background color."""
    size = rgba.shape[0]
    yy, xx = np.mgrid[0:size, 0:size]
    center = (size - 1) / 2.0
    dist = np.sqrt((xx - center) ** 2 + (yy - center) ** 2)
    alpha = rgba[..., 3]

    ys, xs = np.nonzero(alpha > 0)
    if len(xs) == 0:
        return False, 255.0
    max_r = float(np.max(np.sqrt((xs - center) ** 2 + (ys - center) ** 2)))

    # Everything more than 1 px beyond the last visible pixel must be pure bg.
    annulus = dist > (max_r + 1.0)
    if not annulus.any():
        return True, 0.0
    composited = composite_on(rgba, bg)
    deviation = np.abs(
        composited[annulus].astype(np.int16) - np.asarray(bg, dtype=np.int16)
    )
    worst = float(deviation.max()) if deviation.size else 0.0
    return worst <= HALO_TOLERANCE, worst


def save_halo_previews(rgba: np.ndarray, mask_r_scaled: float) -> None:
    TEST_RESULTS.mkdir(parents=True, exist_ok=True)
    size = rgba.shape[0]
    pad = int(round(mask_r_scaled * 0.12))
    half = int(round(mask_r_scaled)) + pad
    x0 = max(0, size // 2 - half)
    x1 = min(size, size // 2 + half)
    for name, bg in (("logo-halo-dark.png", BG_DARK), ("logo-halo-light.png", BG_WHITE)):
        composited = composite_on(rgba, bg)
        Image.fromarray(composited[x0:x1, x0:x1]).save(TEST_RESULTS / name)
        print(f"[verify] wrote test-results/{name}")


# ---------------------------------------------------------------------------
# Exports
# ---------------------------------------------------------------------------

def save_emblem_exports(rgba: np.ndarray) -> dict[int, Image.Image]:
    BRAND_DIR.mkdir(parents=True, exist_ok=True)
    images: dict[int, Image.Image] = {}
    for size in EMBLEM_SIZES:
        resized = resize_rgba_premultiplied(rgba, size)
        image = Image.fromarray(resized, mode="RGBA")
        images[size] = image
        image.save(BRAND_DIR / f"logo-emblem-{size}.png", optimize=True)
        image.save(BRAND_DIR / f"logo-emblem-{size}.webp", lossless=True, method=6)
        print(f"[export] logo-emblem-{size}.png / .webp")
    # Canonical default (512).
    images[512].save(BRAND_DIR / "logo-emblem.png", optimize=True)
    images[512].save(BRAND_DIR / "logo-emblem.webp", lossless=True, method=6)
    print("[export] logo-emblem.png / .webp (canonical 512)")
    return images


def save_favicons(images: dict[int, Image.Image]) -> None:
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    base = images[512]
    for size, name in ((32, "favicon-32x32.png"), (192, "favicon-192x192.png"), (512, "favicon-512x512.png")):
        img = base.resize((size, size), Image.LANCZOS)
        img.save(PUBLIC_DIR / name, optimize=True)
        print(f"[export] {name}")
    apple = base.resize((180, 180), Image.LANCZOS)
    apple.save(PUBLIC_DIR / "apple-touch-icon.png", optimize=True)
    print("[export] apple-touch-icon.png (180)")

    ico_source = base.resize((256, 256), Image.LANCZOS)
    ico_source.save(
        PUBLIC_DIR / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64)],
    )
    print("[export] favicon.ico (16/24/32/48/64)")


def find_bold_font(size: int) -> ImageFont.FreeTypeFont:
    candidates = [
        "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/calibrib.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def save_og_image(images: dict[int, Image.Image]) -> None:
    width, height = 1200, 630
    canvas = Image.new("RGB", (width, height), BG_DARK)
    draw = ImageDraw.Draw(canvas)

    # Subtle brand glow behind the emblem.
    glow = Image.new("RGB", (width, height), BG_DARK)
    glow_draw = ImageDraw.Draw(glow)
    for i in range(60, 0, -1):
        radius = 260 + i * 4
        alpha = int(6 * (60 - i) / 60)
        color = tuple(min(255, c + alpha) for c in BG_DARK)
        glow_draw.ellipse(
            [width / 2 - radius, 200 - radius, width / 2 + radius, 200 + radius],
            fill=color,
        )
    canvas = Image.blend(canvas, glow, 0.6)

    emblem_size = 300
    emblem = images[512].resize((emblem_size, emblem_size), Image.LANCZOS)
    canvas.paste(emblem, ((width - emblem_size) // 2, 70), emblem)

    font_big = find_bold_font(76)
    font_small = find_bold_font(30)
    draw = ImageDraw.Draw(canvas)

    left_text, right_text = "Engineering ", "Lab"
    lw = draw.textlength(left_text, font=font_big)
    rw = draw.textlength(right_text, font=font_big)
    start_x = (width - (lw + rw)) / 2
    text_y = 400
    draw.text((start_x, text_y), left_text, font=font_big, fill=BRAND_WHITE)
    draw.text((start_x + lw, text_y), right_text, font=font_big, fill=BRAND_GREEN)

    tagline = "Build  ·  Innovate  ·  Create"
    tw = draw.textlength(tagline, font=font_small)
    draw.text(((width - tw) / 2, 510), tagline, font=font_small, fill=MUTED)

    out = BRAND_DIR / "og-image.png"
    canvas.save(out, optimize=True)
    print(f"[export] {out.relative_to(ROOT)} (1200x630)")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    if not SOURCE.exists():
        print(f"Source not found: {SOURCE}", file=sys.stderr)
        return 1

    bgr = cv2.imread(str(SOURCE), cv2.IMREAD_COLOR)
    if bgr is None:
        print(f"Could not read source image: {SOURCE}", file=sys.stderr)
        return 1
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

    cx, cy, outer_r, _ = detect_circle(gray)

    mask_r = outer_r - MASK_INSET
    save_debug_overlay(bgr, cx, cy, outer_r, mask_r)

    # Build, verify, and shrink the mask if any checkerboard fringe survives.
    for attempt in range(4):
        rgba, cx_crop, cy_crop, side = build_masked_emblem(rgb, cx, cy, outer_r, mask_r)
        rgba512 = resize_rgba_premultiplied(rgba, 512)
        scale = 512.0 / side
        mask_r_scaled = mask_r * scale
        ok_dark, dev_dark = verify_halo(rgba512, BG_DARK)
        ok_light, dev_light = verify_halo(rgba512, BG_WHITE)
        print(
            f"[verify] attempt {attempt + 1}: maskR={mask_r:.2f}px "
            f"dark_dev={dev_dark:.1f} light_dev={dev_light:.1f}"
        )
        if ok_dark and ok_light:
            break
        mask_r -= 1.0
        print("[verify] gray fringe detected; shrinking mask radius by 1 px")
    else:
        print("[verify] WARNING: could not eliminate halo within 4 attempts", file=sys.stderr)

    save_halo_previews(rgba512, mask_r_scaled)
    images = save_emblem_exports(rgba)
    save_favicons(images)
    save_og_image(images)

    print("")
    print("Summary")
    print(f"  Source:        {SOURCE.relative_to(ROOT)} ({rgb.shape[1]}x{rgb.shape[0]})")
    print(f"  Detected:      center=({cx:.2f}, {cy:.2f}) outerR={outer_r:.2f}px")
    print(f"  Mask radius:   {mask_r:.2f}px (inset {outer_r - mask_r:.2f}px)")
    print(f"  Master crop:   {side}x{side}px")
    print(f"  Largest export: {max(EMBLEM_SIZES)}x{max(EMBLEM_SIZES)}px (downscaled, not upscaled)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
