# 🛠️ Mascot Asset Processing Tools

Standalone background removal and mobile-optimization scripts for the Lora Mascot widget. These tools run locally and do not touch or depend on website code.

---

## 📁 Directory Layout

```
assets/mascot/
├── greeting.mp4           # Original green/magenta screen video
├── idle.mp4               # Original idle loop video
├── celebrate.mp4          # Original celebration video
├── mascot-original.png    # Original high-res mascot image
├── greeting.webm          # Exported transparent WebM (360px desktop)
├── greeting-sm.webm       # Exported transparent WebM (240px mobile)
├── mascot-static.png      # Exported transparent PNG (desktop)
└── mascot-static-sm.png   # Exported transparent PNG (240px mobile)
```

---

## 1. Video Processing: `remove-bg-video.sh`

Converts each MP4 video to **transparent VP9 WebM** (`yuva420p`) and an optional Apple-compatible transparent `.mov`.

### Requirements
* [ffmpeg](https://ffmpeg.org/download.html) (with `libvpx-vp9` support).

### Usage

```bash
# Make executable (Linux / macOS / Git Bash on Windows):
chmod +x tools/remove-bg-video.sh

# Run with defaults (Magenta #FF00FF background):
./tools/remove-bg-video.sh

# Or override variables on the command line:
KEY_COLOR="0x808080" SIMILARITY="0.32" BLEND="0.08" ./tools/remove-bg-video.sh
```

### Tuning Settings

Edit the top of `tools/remove-bg-video.sh` to customize:

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `KEY_COLOR` | `0xFF00FF` | Background hex to key out. Use `0xFF00FF` for Magenta or `0x808080` for Gray. |
| `SIMILARITY`| `0.28` | Threshold (0.01 - 1.0). Higher removes more background; lower protects subtle shadows. |
| `BLEND` | `0.05` | Edge softness / anti-aliasing (0.0 - 0.5). |
| `DESKTOP_WIDTH` | `360` | Width of desktop clip (target < 800 KB). |
| `MOBILE_WIDTH` | `240` | Width of mobile clip (target < 400 KB). |
| `MOBILE_FPS` | `24` | Framerate for mobile (smooth yet battery-friendly). |
| `DESKTOP_CRF` | `32` | VP9 quality factor (lower = higher quality, higher = smaller size). |
| `MOBILE_CRF` | `38` | Mobile VP9 quality factor. |

> **Note on White Tunic & Green Skirt:**
> The script keys specifically on Magenta (`#FF00FF`) or Gray (`#808080`). It does **not** key out white or green pixels, ensuring the mascot's clothes remain fully opaque.

---

## 2. Image Processing: `remove-bg-image.py`

Cuts out the background of `mascot-original.png` and exports transparent static images (`mascot-static.png` and `mascot-static-sm.png`).

### Requirements

```bash
# Recommended (AI background cutout):
pip install rembg pillow

# Or standard fallback (corner color-keying):
pip install pillow
```

### Usage

```bash
python tools/remove-bg-image.py
```

Outputs:
* `assets/mascot/mascot-static.png` (Full desktop resolution)
* `assets/mascot/mascot-static-sm.png` (240px wide mobile asset)

---

## 3. iOS Safari & Transparency Support

* **Android / Chrome / Edge / Firefox**: Native support for transparent WebM (`VP9` with `yuva420p` alpha channel).
* **iOS Safari**: Apple does not support VP9 alpha WebM. `mascot.js` includes an **automatic real-time HTML5 Canvas chroma keyer** that plays the original MP4 and strips the background dynamically at 24/60fps with zero plugins. If video playback is blocked by Low Power Mode, it automatically falls back to `mascot-static-sm.png`.
