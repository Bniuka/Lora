#!/usr/bin/env python3
"""
Mascot Image Background Removal & Multi-Size Exporter
Converts mascot-original.png to transparent mascot-static.png & mascot-static-sm.png
Tries 'rembg' (AI background removal) first; falls back to flood-fill / chroma-keying with soft edges.
"""

import os
import sys
import math

def get_script_dirs():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    mascot_dir = os.path.abspath(os.path.join(script_dir, "..", "assets", "mascot"))
    return mascot_dir

def remove_bg_rembg(input_path, output_path):
    import rembg
    from PIL import Image

    print("⚡ Using AI background removal ('rembg')...")
    with open(input_path, "rb") as f:
        input_data = f.read()
    output_data = rembg.remove(input_data)
    with open(output_path, "wb") as f:
        f.write(output_data)
    return Image.open(output_path)

def remove_bg_corner_key(input_path, output_path, tolerance=36, feather_radius=2):
    """
    Fallback color-keying & corner flood-fill using standard PIL / Pillow.
    Ensures white tunic and green skirt are strictly protected.
    """
    from PIL import Image, ImageFilter

    print("🎨 Using PIL corner color-keying & edge-softening fallback...")
    img = Image.open(input_path).convert("RGBA")
    w, h = img.size
    pixels = img.load()

    # Sample corners to determine background color
    corners = [
        pixels[0, 0],
        pixels[w - 1, 0],
        pixels[0, h - 1],
        pixels[w - 1, h - 1],
        pixels[2, 2],
        pixels[w - 3, 2]
    ]
    # Average corner color
    avg_r = sum(c[0] for c in corners) // len(corners)
    avg_g = sum(c[1] for c in corners) // len(corners)
    avg_b = sum(c[2] for c in corners) // len(corners)
    print(f"   Detected background color: RGB({avg_r}, {avg_g}, {avg_b})")

    # Target key color (check if magenta #FF00FF or gray)
    is_magenta = (avg_r > 200 and avg_b > 200 and avg_g < 80)
    if is_magenta:
        print("   Detected solid Magenta key screen.")

    alpha_mask = Image.new("L", (w, h), 255)
    mask_pixels = alpha_mask.load()

    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]

            # Color distance from background
            dist = math.sqrt((r - avg_r) ** 2 + (g - avg_g) ** 2 + (b - avg_b) ** 2)

            # Strict protection for White Tunic (high R, G, B) and Green Skirt (high G, lower R/B)
            is_white_tunic = (r > 210 and g > 210 and b > 210)
            is_green_skirt = (g > 100 and g > r + 20 and g > b + 20)

            if is_white_tunic or is_green_skirt:
                mask_pixels[x, y] = 255
            elif dist <= tolerance:
                # Fully transparent background
                mask_pixels[x, y] = 0
            elif dist < tolerance + 16:
                # Soft transition boundary
                ratio = (dist - tolerance) / 16.0
                mask_pixels[x, y] = int(255 * ratio)
            else:
                mask_pixels[x, y] = 255

    # Gentle feathering for smooth anti-aliased cutout
    if feather_radius > 0:
        alpha_mask = alpha_mask.filter(ImageFilter.GaussianBlur(feather_radius / 2))

    img.putalpha(alpha_mask)
    img.save(output_path, "PNG", optimize=True)
    return img

def main():
    mascot_dir = get_script_dirs()
    input_file = os.path.join(mascot_dir, "mascot-original.png")
    out_desktop = os.path.join(mascot_dir, "mascot-static.png")
    out_mobile = os.path.join(mascot_dir, "mascot-static-sm.png")

    if not os.path.exists(input_file):
        print(f"❌ Input file not found: {input_file}")
        print("   Please place your original mascot image at: assets/mascot/mascot-original.png")
        sys.exit(1)

    print("==========================================================")
    print("🖼️  Lora Mascot Image Background Remover")
    print(f"   Input  : {input_file}")
    print(f"   Outputs: {out_desktop} (Desktop)")
    print(f"            {out_mobile} (Mobile 240px)")
    print("==========================================================")

    # 1. Process Desktop Version
    processed_img = None
    try:
        processed_img = remove_bg_rembg(input_file, out_desktop)
    except Exception as e:
        print(f"ℹ️  'rembg' not available ({e}). Falling back to PIL edge keying.")
        try:
            processed_img = remove_bg_corner_key(input_file, out_desktop)
        except Exception as e2:
            print(f"❌ Processing failed: {e2}")
            sys.exit(1)

    print(f"✅ Desktop static transparent image saved: {out_desktop}")

    # 2. Resize and Save Mobile Version (240px wide)
    from PIL import Image
    if not processed_img:
        processed_img = Image.open(out_desktop)

    orig_w, orig_h = processed_img.size
    target_w = 240
    target_h = int((target_w / orig_w) * orig_h)

    mobile_img = processed_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
    mobile_img.save(out_mobile, "PNG", optimize=True)
    print(f"✅ Mobile static transparent image saved (240px): {out_mobile}")

    print("\n🎉 Image processing completed successfully!")

if __name__ == "__main__":
    main()
