#!/usr/bin/env bash
# =============================================================================
# Mascot Video Background Removal & Multi-Size Exporter
# Converts green/magenta/gray screen MP4s into transparent WebM & Apple MOV clips
# =============================================================================

set -euo pipefail

# --- CONFIGURABLE VARIABLES (Adjust to tune keying & file size) ---
KEY_COLOR="${KEY_COLOR:-0xFF00FF}"     # Default key color: Magenta (#FF00FF). Change to 0x808080 for flat gray.
SIMILARITY="${SIMILARITY:-0.28}"       # Color similarity threshold (0.01 - 1.0). Higher = more background removed.
BLEND="${BLEND:-0.05}"                 # Edge feathering / blend (0.0 - 0.5). Softens cutout boundary.

DESKTOP_WIDTH="${DESKTOP_WIDTH:-360}"  # Desktop width in px (target < 800 KB)
MOBILE_WIDTH="${MOBILE_WIDTH:-240}"    # Mobile width in px (target < 400 KB)
MOBILE_FPS="${MOBILE_FPS:-24}"         # Mobile framerate (saves battery & file size)

DESKTOP_CRF="${DESKTOP_CRF:-32}"       # VP9 CRF quality (0-63; lower = sharper, higher = smaller)
MOBILE_CRF="${MOBILE_CRF:-38}"         # Mobile VP9 CRF
DESKTOP_BITRATE="${DESKTOP_BITRATE:-450k}"
MOBILE_BITRATE="${MOBILE_BITRATE:-200k}"

# Directories (relative to script location)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MASCOT_DIR="$(cd "${SCRIPT_DIR}/../assets/mascot" && pwd)"

# Verify ffmpeg is available
if ! command -v ffmpeg &> /dev/null; then
  echo "❌ Error: 'ffmpeg' was not found in your PATH."
  echo "   Please install ffmpeg (e.g. brew install ffmpeg / sudo apt install ffmpeg / choco install ffmpeg)."
  exit 1
fi

echo "=========================================================="
echo "🎭 Lora Mascot Video Exporter"
echo "   Key Color   : ${KEY_COLOR}"
echo "   Similarity  : ${SIMILARITY} | Blend: ${BLEND}"
echo "   Desktop     : ${DESKTOP_WIDTH}px (CRF ${DESKTOP_CRF}, ~${DESKTOP_BITRATE})"
echo "   Mobile      : ${MOBILE_WIDTH}px @ ${MOBILE_FPS}fps (CRF ${MOBILE_CRF}, ~${MOBILE_BITRATE})"
echo "   Target Dir  : ${MASCOT_DIR}"
echo "=========================================================="

# List of clips to process
CLIPS=("greeting" "idle" "celebrate")

for CLIP in "${CLIPS[@]}"; do
  INPUT="${MASCOT_DIR}/${CLIP}.mp4"

  if [ ! -f "${INPUT}" ]; then
    echo "⚠️  Skipping '${CLIP}': file '${INPUT}' not found."
    continue
  fi

  echo ""
  echo "▶️ Processing: ${CLIP}.mp4"

  # 1. Desktop Transparent WebM (VP9, yuva420p)
  DESKTOP_WEBM="${MASCOT_DIR}/${CLIP}.webm"
  echo "   → Exporting Desktop WebM (360px)..."
  ffmpeg -y -hide_banner -loglevel warning -i "${INPUT}" \
    -vf "colorkey=${KEY_COLOR}:${SIMILARITY}:${BLEND},scale=${DESKTOP_WIDTH}:-2:flags=lanczos,format=yuva420p" \
    -c:v libvpx-vp9 \
    -b:v "${DESKTOP_BITRATE}" \
    -crf "${DESKTOP_CRF}" \
    -auto-alt-ref 0 \
    -an \
    "${DESKTOP_WEBM}"
  
  if [ -f "${DESKTOP_WEBM}" ]; then
    SIZE_KB=$(du -k "${DESKTOP_WEBM}" | cut -f1)
    echo "     ✅ Saved: ${CLIP}.webm (${SIZE_KB} KB)"
  fi

  # 2. Mobile Transparent WebM (240px, 24fps, lightweight)
  MOBILE_WEBM="${MASCOT_DIR}/${CLIP}-sm.webm"
  echo "   → Exporting Mobile WebM (240px, 24fps)..."
  ffmpeg -y -hide_banner -loglevel warning -i "${INPUT}" \
    -vf "colorkey=${KEY_COLOR}:${SIMILARITY}:${BLEND},scale=${MOBILE_WIDTH}:-2:flags=lanczos,fps=${MOBILE_FPS},format=yuva420p" \
    -c:v libvpx-vp9 \
    -b:v "${MOBILE_BITRATE}" \
    -crf "${MOBILE_CRF}" \
    -auto-alt-ref 0 \
    -an \
    "${MOBILE_WEBM}"

  if [ -f "${MOBILE_WEBM}" ]; then
    SIZE_KB=$(du -k "${MOBILE_WEBM}" | cut -f1)
    echo "     ✅ Saved: ${CLIP}-sm.webm (${SIZE_KB} KB)"
  fi

  # 3. Transparent First-Frame Poster (WebP & PNG)
  POSTER_WEBP="${MASCOT_DIR}/${CLIP}-poster.webp"
  echo "   → Exporting Poster Frame..."
  ffmpeg -y -hide_banner -loglevel warning -ss 00:00:00.000 -i "${INPUT}" \
    -vf "colorkey=${KEY_COLOR}:${SIMILARITY}:${BLEND},scale=${DESKTOP_WIDTH}:-2:flags=lanczos,format=yuva420p" \
    -vframes 1 \
    "${POSTER_WEBP}"
  echo "     ✅ Saved: ${CLIP}-poster.webp"

  # 4. Optional Apple Transparent Video (HEVC with alpha / ProRes 4444 .mov)
  # iOS Safari requires HEVC with alpha or ProRes; if unavailable, mascot.js falls back to real-time HTML5 Canvas chroma key.
  APPLE_MOV="${MASCOT_DIR}/${CLIP}.mov"
  if ffmpeg -encoders 2>&1 | grep -q "hevc_videotoolbox"; then
    echo "   → Exporting Apple HEVC with alpha (.mov)..."
    ffmpeg -y -hide_banner -loglevel warning -i "${INPUT}" \
      -vf "colorkey=${KEY_COLOR}:${SIMILARITY}:${BLEND},scale=${DESKTOP_WIDTH}:-2:flags=lanczos,format=bgra" \
      -c:v hevc_videotoolbox -alpha_quality 0.75 -tag:v hvc1 -an \
      "${APPLE_MOV}" 2>/dev/null || true
    [ -f "${APPLE_MOV}" ] && echo "     ✅ Saved Apple transparent clip: ${CLIP}.mov"
  else
    echo "   ℹ️  Note: hevc_videotoolbox not detected on this system."
    echo "      iOS Safari will automatically use the high-performance live Canvas chroma keyer in mascot.js."
  fi

done

echo ""
echo "🎉 Export complete! All clips processed into ${MASCOT_DIR}"
