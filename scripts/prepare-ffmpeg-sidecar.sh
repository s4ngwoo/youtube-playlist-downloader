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

FFMPEG_BIN="${BIN_DIR}/ffmpeg-${TARGET_TRIPLE}${exe_suffix}"
FFPROBE_BIN="${BIN_DIR}/ffprobe-${TARGET_TRIPLE}${exe_suffix}"

echo "Preparing LGPL FFmpeg sidecars for ${TARGET_TRIPLE}"
echo "  -> ${FFMPEG_BIN}"
echo "  -> ${FFPROBE_BIN}"

workdir="$(mktemp -d)"
cleanup() { rm -rf "${workdir}"; }
trap cleanup EXIT

assert_runnable_ffmpeg() {
  local bin="$1"
  if [[ "${bin}" == *.exe ]]; then
    [[ -f "${bin}" ]] || {
      echo "error: missing ${bin}" >&2
      exit 1
    }
    return 0
  fi
  # Bundled macOS binaries must not keep absolute Homebrew/local dylib paths.
  if command -v otool >/dev/null 2>&1; then
    if otool -L "${bin}" | awk 'NR>1 {print $1}' | grep -E '^/opt/homebrew/|^/usr/local/'; then
      echo "error: ${bin} still links Homebrew/local absolute dylibs:" >&2
      otool -L "${bin}" >&2
      exit 1
    fi
  fi
}

case "${TARGET_TRIPLE}" in
  x86_64-pc-windows-msvc|aarch64-pc-windows-msvc)
    if [[ "${TARGET_TRIPLE}" == aarch64-pc-windows-msvc ]]; then
      FFMPEG_WIN_URL="${FFMPEG_WIN_URL/win64-lgpl/winarm64-lgpl}"
    fi
    zip_path="${workdir}/ffmpeg-win-lgpl.zip"
    extract_dir="${workdir}/extracted"
    echo "Downloading Windows LGPL build:"
    echo "  ${FFMPEG_WIN_URL}"
    curl -fsSL "${FFMPEG_WIN_URL}" -o "${zip_path}"
    export FFMPEG_ZIP="${zip_path}"
    export FFMPEG_EXTRACT_DIR="${extract_dir}"
    python - <<'PY'
import os, zipfile, pathlib
zpath = os.environ["FFMPEG_ZIP"]
out = pathlib.Path(os.environ["FFMPEG_EXTRACT_DIR"])
out.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(zpath) as zf:
    zf.extractall(out)
PY
    ffmpeg_src="$(find "${extract_dir}" -type f \( -name 'ffmpeg.exe' -o -name 'ffmpeg' \) | head -n1)"
    ffprobe_src="$(find "${extract_dir}" -type f \( -name 'ffprobe.exe' -o -name 'ffprobe' \) | head -n1)"
    if [[ -z "${ffmpeg_src}" || -z "${ffprobe_src}" ]]; then
      echo "error: ffmpeg/ffprobe not found in Windows LGPL archive" >&2
      exit 1
    fi
    cp "${ffmpeg_src}" "${FFMPEG_BIN}"
    cp "${ffprobe_src}" "${FFPROBE_BIN}"
    # Keep a copy of the upstream license text next to binaries for redistributors.
    lic_src="$(find "${extract_dir}" -type f \( -iname 'LICENSE*' -o -iname 'COPYING*' \) | head -n1 || true)"
    if [[ -n "${lic_src}" ]]; then
      cp "${lic_src}" "${BIN_DIR}/ffmpeg-LGPL-LICENSE.txt"
    fi
    ;;

  aarch64-apple-darwin|x86_64-apple-darwin)
    # Official FFmpeg without --enable-gpl is LGPL. Enable only LGPL-compatible extras (lame).
    # Portable: --disable-autodetect (no Homebrew SDL), then rewrite lame install name to
    # @executable_path/../Resources/libmp3lame.0.dylib (bundled via tauri.conf.json resources).
    echo "Ensuring Homebrew build deps (nasm, pkg-config, lame)…"
    brew list nasm >/dev/null 2>&1 || brew install nasm
    brew list pkg-config >/dev/null 2>&1 || brew list pkgconf >/dev/null 2>&1 || brew install pkg-config
    brew list lame >/dev/null 2>&1 || brew install lame

    lame_prefix="$(brew --prefix lame 2>/dev/null || true)"
    if [[ -z "${lame_prefix}" || ! -d "${lame_prefix}" ]]; then
      echo "error: Homebrew lame not found" >&2
      exit 1
    fi
    lame_dylib="$(ls "${lame_prefix}"/lib/libmp3lame.*.dylib 2>/dev/null | head -n1 || true)"
    if [[ -z "${lame_dylib}" || ! -f "${lame_dylib}" ]]; then
      echo "error: libmp3lame dylib not found under ${lame_prefix}/lib" >&2
      exit 1
    fi
    export PKG_CONFIG_PATH="${lame_prefix}/lib/pkgconfig:${PKG_CONFIG_PATH:-}"
    lame_cflags="-I${lame_prefix}/include"
    lame_ldflags="-L${lame_prefix}/lib"
    lame_extra_libs="-lmp3lame"

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
      --disable-autodetect
      --enable-static
      --disable-shared
      --enable-pic
      --enable-libmp3lame
      --extra-cflags="${lame_cflags}"
      --extra-ldflags="${lame_ldflags}"
      --extra-libs="${lame_extra_libs}"
    )

    # Cross-compile when the runner arch ≠ target (e.g. arm64 runner → x86_64 sidecar).
    if [[ "${TARGET_TRIPLE}" == x86_64-apple-darwin && "${host_triple}" == aarch64-apple-darwin ]]; then
      configure_args+=(--arch=x86_64 --enable-cross-compile --target-os=darwin --cc="clang -arch x86_64" --extra-cflags="-arch x86_64 ${lame_cflags}" --extra-ldflags="-arch x86_64 ${lame_ldflags}")
    elif [[ "${TARGET_TRIPLE}" == aarch64-apple-darwin && "${host_triple}" == x86_64-apple-darwin ]]; then
      configure_args+=(--arch=arm64 --enable-cross-compile --target-os=darwin --cc="clang -arch arm64" --extra-cflags="-arch arm64 ${lame_cflags}" --extra-ldflags="-arch arm64 ${lame_ldflags}")
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

    cp "${workdir}/prefix/bin/ffmpeg" "${FFMPEG_BIN}"
    cp "${workdir}/prefix/bin/ffprobe" "${FFPROBE_BIN}"
    chmod +x "${FFMPEG_BIN}" "${FFPROBE_BIN}"

    resources_dir="${ROOT}/src-tauri/resources"
    mkdir -p "${resources_dir}"
    lame_bundled_name="libmp3lame.0.dylib"
    cp "${lame_dylib}" "${resources_dir}/${lame_bundled_name}"
    chmod 755 "${resources_dir}/${lame_bundled_name}"
    install_name_tool -id "@executable_path/../Resources/${lame_bundled_name}" \
      "${resources_dir}/${lame_bundled_name}" 2>/dev/null || true

    old_lame="$(otool -L "${FFMPEG_BIN}" | awk '/libmp3lame/{print $1; exit}')"
    if [[ -z "${old_lame}" ]]; then
      echo "error: ffmpeg was built without libmp3lame linkage" >&2
      exit 1
    fi
    for bin in "${FFMPEG_BIN}" "${FFPROBE_BIN}"; do
      install_name_tool -change "${old_lame}" \
        "@executable_path/../Resources/${lame_bundled_name}" "${bin}"
      codesign --force --sign - "${bin}" 2>/dev/null || true
    done
    codesign --force --sign - "${resources_dir}/${lame_bundled_name}" 2>/dev/null || true

    # Smoke in a fake .app layout (Resources sibling of MacOS).
    fake_root="${workdir}/FakeApp.app/Contents"
    mkdir -p "${fake_root}/MacOS" "${fake_root}/Resources"
    cp "${FFMPEG_BIN}" "${fake_root}/MacOS/ffmpeg"
    cp "${resources_dir}/${lame_bundled_name}" "${fake_root}/Resources/${lame_bundled_name}"
    codesign --force --sign - "${fake_root}/MacOS/ffmpeg" 2>/dev/null || true
    codesign --force --sign - "${fake_root}/Resources/${lame_bundled_name}" 2>/dev/null || true
    if ! "${fake_root}/MacOS/ffmpeg" -version >/dev/null 2>&1; then
      echo "error: portable ffmpeg smoke failed (lame @executable_path rewrite)" >&2
      otool -L "${fake_root}/MacOS/ffmpeg" >&2
      exit 1
    fi

    cp "${src_dir}/COPYING.LGPLv3" "${BIN_DIR}/ffmpeg-LGPL-LICENSE.txt" 2>/dev/null \
      || cp "${src_dir}/COPYING.LGPLv2.1" "${BIN_DIR}/ffmpeg-LGPL-LICENSE.txt"
    ;;

  *)
    echo "error: unsupported TARGET_TRIPLE=${TARGET_TRIPLE}" >&2
    echo "Supported: aarch64-apple-darwin, x86_64-apple-darwin, x86_64-pc-windows-msvc, aarch64-pc-windows-msvc" >&2
    exit 1
    ;;
esac

assert_runnable_ffmpeg "${FFMPEG_BIN}"
assert_runnable_ffmpeg "${FFPROBE_BIN}"
ls -lh "${FFMPEG_BIN}" "${FFPROBE_BIN}"

# Plain names help local `--ffmpeg-location <dir>` (yt-dlp looks for `ffprobe` beside `ffmpeg`).
# Tauri release bundling still uses the triple-suffixed externalBin names above.
plain_ffmpeg="${BIN_DIR}/ffmpeg${exe_suffix}"
plain_ffprobe="${BIN_DIR}/ffprobe${exe_suffix}"
cp "${FFMPEG_BIN}" "${plain_ffmpeg}"
cp "${FFPROBE_BIN}" "${plain_ffprobe}"
if [[ -z "${exe_suffix}" ]]; then
  chmod +x "${plain_ffmpeg}" "${plain_ffprobe}"
fi

echo "Done (LGPL FFmpeg sidecars)."
