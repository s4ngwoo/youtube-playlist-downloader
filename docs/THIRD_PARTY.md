# Third-party components

This app is licensed under **GPL-3.0-or-later** (see [LICENSE](../LICENSE)).
Official binaries also ship the following components under their own terms.

Korean: [ko/THIRD_PARTY.md](ko/THIRD_PARTY.md)

## yt-dlp

- **Role:** playlist/video fetch and download engine (Tauri `externalBin` sidecar; optional app-data override)
- **Upstream:** [yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp)
- **License:** Unlicense (public domain dedication) — see upstream repository

## FFmpeg / ffprobe (bundled, LGPL)

- **Role:** audio extraction, format conversion, thumbnail/metadata embedding (via yt-dlp `--ffmpeg-location`)
- **License:** **LGPL** builds only in official releases (no `--enable-gpl` / no nonfree extras in our packaging)
- **Windows:** [BtbN/FFmpeg-Builds](https://github.com/BtbN/FFmpeg-Builds) `*-lgpl` static archives
- **macOS:** built from [FFmpeg](https://ffmpeg.org/) sources in CI with LGPL-compatible options (see `scripts/prepare-ffmpeg-sidecar.sh`)
- **Source / compliance:** FFmpeg source corresponding to the bundled build is available from the upstream projects above; the prepare script records `ffmpeg-LGPL-LICENSE.txt` next to local sidecars when present
- **Replacement:** binaries are separate sidecars beside the app executable (not statically linked into the app binary), so they can be replaced with another LGPL-compatible FFmpeg

System-installed FFmpeg remains a supported **fallback** if the bundled sidecar is missing (e.g. incomplete install or custom builds).

**Who needs to install what:** end users of official Release installers do **not** need Chocolatey/Homebrew FFmpeg; source builds use `scripts/prepare-ffmpeg-sidecar.sh`. See [FFMPEG.md](FFMPEG.md).

## Deno (optional, not bundled)

- **Role:** optional JS runtime for yt-dlp YouTube challenge solving (`--js-runtimes`)
- **Install:** user system (Homebrew / Chocolatey / etc.)
- **License:** MIT — [denoland/deno](https://github.com/denoland/deno)

## Other Rust / JS dependencies

See `src-tauri/Cargo.lock` and `package-lock.json` for transitive dependency licenses.
