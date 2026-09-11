#!/usr/bin/env bash
# Prepare LGPL FFmpeg (+ ffprobe) sidecars under src-tauri/bin/ for Tauri externalBin.
#
# Usage:
#   ./scripts/prepare-ffmpeg-sidecar.sh
#   TARGET_TRIPLE=aarch64-apple-darwin ./scripts/prepare-ffmpeg-sidecar.sh
#   TARGET_TRIPLE=x86_64-pc-windows-msvc ./scripts/prepare-ffmpeg-sidecar.sh
#
# Env:
#   FFMPEG_TAG     — FFmpeg git tag for macOS source build (default: n7.1.1)
#   FFMPEG_WIN_URL — Override Windows LGPL zip URL (default: BtbN latest win64-lgpl)
#   TARGET_TRIPLE  — Rust target triple; default = host from rustc
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN_DIR="${ROOT}/src-tauri/bin"
mkdir -p "${BIN_DIR}"

if [[ -z "${TARGET_TRIPLE:-}" ]]; then
  TARGET_TRIPLE="$(rustc -vV | awk '/^host:/{print $2}')"
fi

FFMPEG_TAG="${FFMPEG_TAG:-n7.1.1}"
FFMPEG_WIN_URL="${FFMPEG_WIN_URL:-https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-lgpl.zip}"

exe_suffix=""
case "${TARGET_TRIPLE}" in
  *-pc-windows-*) exe_suffix=".exe" ;;
esac

FFMPEG_OUT="${BIN_DIR}/ffmpeg-${TARGET_TRIPLE}${exe_suffix}"
FFPROBE_OUT="${BIN_DIR}/ffprobe-${TARGET_TRIPLE}${exe_suffix}"

echo "Preparing LGPL FFmpeg sidecars for ${TARGET_TRIPLE}"
echo "  -> ${FFMPEG_OUT}"
echo "  -> ${FFPROBE_OUT}"

workdir="$(mktemp -d)"
cleanup() { rm -rf "${workdir}"; }
trap cleanup EXIT

case "${TARGET_TRIPLE}" in
  x86_64-pc-windows-msvc|aarch64-pc-windows-msvc)
    if [[ "${TARGET_TRIPLE}" == aarch64-pc-windows-msvc ]]; then
      FFMPEG_WIN_URL="${FFMPEG_WIN_URL/win64-lgpl/winarm64-lgpl}"
    fi
    zip_path="${workdir}/ffmpeg-win-lgpl.zip"
    echo "Downloading Windows LGPL build:"
    echo "  ${FFMPEG_WIN_URL}"
    curl -fsSL "${FFMPEG_WIN_URL}" -o "${zip_path}"
    export FFMPEG_ZIP="${zip_path}"
    export FFMPEG_OUT="${workdir}/extracted"
    python - <<'PY'
import os, zipfile, pathlib
zpath = os.environ["FFMPEG_ZIP"]
out = pathlib.Path(os.environ["FFMPEG_OUT"])
out.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(zpath) as zf:
    zf.extractall(out)
PY
    ffmpeg_src="$(find "${workdir}/extracted" -type f \( -name 'ffmpeg.exe' -o -name 'ffmpeg' \) | head -n1)"
    ffprobe_src="$(find "${workdir}/extracted" -type f \( -name 'ffprobe.exe' -o -name 'ffprobe' \) | head -n1)"
    if [[ -z "${ffmpeg_src}" || -z "${ffprobe_src}" ]]; then
      echo "error: ffmpeg/ffprobe not found in Windows LGPL archive" >&2
      exit 1
    fi
    cp "${ffmpeg_src}" "${FFMPEG_OUT}"
    cp "${ffprobe_src}" "${FFPROBE_OUT}"
    # Keep a copy of the upstream license text next to binaries for redistributors.
    lic_src="$(find "${workdir}/extracted" -type f \( -iname 'LICENSE*' -o -iname 'COPYING*' \) | head -n1 || true)"
    if [[ -n "${lic_src}" ]]; then
      cp "${lic_src}" "${BIN_DIR}/ffmpeg-LGPL-LICENSE.txt"
    fi
    ;;

  aarch64-apple-darwin|x86_64-apple-darwin)
    # Official FFmpeg without --enable-gpl is LGPL. Enable only LGPL-compatible extras (lame).
    echo "Ensuring Homebrew build deps (nasm, pkg-config, lame)…"
    brew list nasm >/dev/null 2>&1 || brew install nasm
    brew list pkg-config >/dev/null 2>&1 || brew list pkgconf >/dev/null 2>&1 || brew install pkg-config
    brew list lame >/dev/null 2>&1 || brew install lame

    # Homebrew lame may not be on the default pkg-config path.
    if command -v brew >/dev/null 2>&1; then
      lame_prefix="$(brew --prefix lame 2>/dev/null || true)"
      if [[ -n "${lame_prefix}" ]]; then
        export PKG_CONFIG_PATH="${lame_prefix}/lib/pkgconfig:${PKG_CONFIG_PATH:-}"
        export CPPFLAGS="-I${lame_prefix}/include ${CPPFLAGS:-}"
        export LDFLAGS="-L${lame_prefix}/lib ${LDFLAGS:-}"
      fi
    fi

    host_triple="$(rustc -vV | awk '/^host:/{print $2}')"
    src_dir="${workdir}/ffmpeg-src"
    echo "Cloning FFmpeg ${FFMPEG_TAG}…"
    git clone --depth 1 --branch "${FFMPEG_TAG}" https://github.com/FFmpeg/FFmpeg.git "${src_dir}"
    pushd "${src_dir}" >/dev/null

    configure_args=(
      --prefix="${workdir}/prefix"
      --disable-debug
      --disable-doc
      --disable-ffplay
      --disable-network
      --enable-pic
      --enable-libmp3lame
      --extra-cflags="${CPPFLAGS:-}"
      --extra-ldflags="${LDFLAGS:-}"
    )

    # Cross-compile when the runner arch ≠ target (e.g. arm64 runner → x86_64 sidecar).
    if [[ "${TARGET_TRIPLE}" == x86_64-apple-darwin && "${host_triple}" == aarch64-apple-darwin ]]; then
      configure_args+=(--arch=x86_64 --enable-cross-compile --target-os=darwin --cc="clang -arch x86_64" --extra-cflags="-arch x86_64 ${CPPFLAGS:-}" --extra-ldflags="-arch x86_64 ${LDFLAGS:-}")
    elif [[ "${TARGET_TRIPLE}" == aarch64-apple-darwin && "${host_triple}" == x86_64-apple-darwin ]]; then
      configure_args+=(--arch=arm64 --enable-cross-compile --target-os=darwin --cc="clang -arch arm64" --extra-cflags="-arch arm64 ${CPPFLAGS:-}" --extra-ldflags="-arch arm64 ${LDFLAGS:-}")
    elif [[ "${TARGET_TRIPLE}" == aarch64-apple-darwin ]]; then
      configure_args+=(--arch=arm64)
    else
      configure_args+=(--arch=x86_64)
    fi

    # Intentionally omit --enable-gpl / --enable-nonfree → LGPL build.
    ./configure "${configure_args[@]}"

    jobs="$(sysctl -n hw.ncpu 2>/dev/null || echo 4)"
    make -j"${jobs}"
    make install
    popd >/dev/null

    cp "${workdir}/prefix/bin/ffmpeg" "${FFMPEG_OUT}"
    cp "${workdir}/prefix/bin/ffprobe" "${FFPROBE_OUT}"
    chmod +x "${FFMPEG_OUT}" "${FFPROBE_OUT}"
    cp "${src_dir}/COPYING.LGPLv3" "${BIN_DIR}/ffmpeg-LGPL-LICENSE.txt" 2>/dev/null \
      || cp "${src_dir}/COPYING.LGPLv2.1" "${BIN_DIR}/ffmpeg-LGPL-LICENSE.txt"
    ;;

  *)
    echo "error: unsupported TARGET_TRIPLE=${TARGET_TRIPLE}" >&2
    echo "Supported: aarch64-apple-darwin, x86_64-apple-darwin, x86_64-pc-windows-msvc, aarch64-pc-windows-msvc" >&2
    exit 1
    ;;
esac

ls -lh "${FFMPEG_OUT}" "${FFPROBE_OUT}"

# Plain names help local `--ffmpeg-location <dir>` (yt-dlp looks for `ffprobe` beside `ffmpeg`).
# Tauri release bundling still uses the triple-suffixed externalBin names above.
plain_ffmpeg="${BIN_DIR}/ffmpeg${exe_suffix}"
plain_ffprobe="${BIN_DIR}/ffprobe${exe_suffix}"
cp "${FFMPEG_OUT}" "${plain_ffmpeg}"
cp "${FFPROBE_OUT}" "${plain_ffprobe}"
if [[ -z "${exe_suffix}" ]]; then
  chmod +x "${plain_ffmpeg}" "${plain_ffprobe}"
fi

echo "Done (LGPL FFmpeg sidecars)."
