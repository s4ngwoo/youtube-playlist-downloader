#!/usr/bin/env bash
# Create stub paths required by Tauri's build script on CI (Linux).
# Real binaries are prepared only in release.yml / prepare-ffmpeg-sidecar.sh.
#
# Usage (from repo root or src-tauri):
#   ./scripts/ci-prepare-sidecar-stubs.sh
#   TARGET_TRIPLE=x86_64-unknown-linux-gnu ./scripts/ci-prepare-sidecar-stubs.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TAURI_DIR="${ROOT}/src-tauri"
TRIPLE="${TARGET_TRIPLE:-x86_64-unknown-linux-gnu}"
BIN_DIR="${TAURI_DIR}/bin"
RES_DIR="${TAURI_DIR}/resources"

mkdir -p "${BIN_DIR}" "${RES_DIR}"

write_stub() {
  local path="$1"
  local label="$2"
  printf '%s\n' '#!/bin/sh' "echo \"${label} CI stub\"" 'exit 0' > "${path}"
  chmod +x "${path}"
}

write_stub "${BIN_DIR}/yt-dlp-${TRIPLE}" "yt-dlp"
write_stub "${BIN_DIR}/ffmpeg-${TRIPLE}" "ffmpeg"
write_stub "${BIN_DIR}/ffprobe-${TRIPLE}" "ffprobe"

# tauri.conf.json lists this macOS-only resource on every platform.
LAME="${RES_DIR}/libmp3lame.0.dylib"
if [[ ! -f "${LAME}" ]]; then
  : > "${LAME}"
fi

echo "CI sidecar stubs ready under ${BIN_DIR} and ${RES_DIR} (triple=${TRIPLE})"
