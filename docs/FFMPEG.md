# FFmpeg (bundled LGPL sidecars)

How this app ships and resolves **FFmpeg / ffprobe**.

Korean: [ko/FFMPEG.md](ko/FFMPEG.md)

Related: [RELEASING.md](RELEASING.md) · [THIRD_PARTY.md](THIRD_PARTY.md) · [FAQ.md](FAQ.md)

## Short version

| Who | Do they need Chocolatey / Homebrew FFmpeg? |
| :--- | :--- |
| **End user** installing macOS `.dmg` or Windows `.exe` / `.msi` from [GitHub Releases](https://github.com/s4ngwoo/youtube-playlist-downloader/releases) | **No.** Official installers already include LGPL `ffmpeg` + `ffprobe` next to the app. |
| **Developer** / anyone **building from source** (including Linux) | Git does **not** vendor the binaries. Run `./scripts/prepare-ffmpeg-sidecar.sh`, **or** rely on a system FFmpeg as fallback. |
| **Linux end user** | No official installer. Build from source (or use CLI `yt-dlp` alone). |

This is **not** “install FFmpeg into Windows for you.” The binaries live **inside the app package** as Tauri `externalBin` sidecars.

## Runtime resolution order

1. **Bundled** sidecar (beside the app binary, or `src-tauri/bin/ffmpeg-<triple>` in development)
2. If missing → **system** FFmpeg (`PATH` / common install locations)

Footer **Environment diagnose** shows the path and source (`bundled` / `system`).

A system FFmpeg (different version, Chocolatey, Scoop, etc.) is **not overwritten** and is usually **not used** when the bundle is present.

## What Release Actions include

On each `v*` tag, [`.github/workflows/release.yml`](../.github/workflows/release.yml) runs `scripts/prepare-ffmpeg-sidecar.sh` before `tauri-action`:

| Platform | How FFmpeg is obtained | “Latest?” |
| :--- | :--- | :--- |
| **Windows x64** | Download BtbN **LGPL** zip (`ffmpeg-master-latest-win64-lgpl.zip` by default) | Tracks BtbN’s floating **latest** LGPL build unless you override `FFMPEG_WIN_URL` |
| **macOS** (Apple Silicon + Intel) | Build from FFmpeg git tag `FFMPEG_TAG` (default `n7.1.1`) without `--enable-gpl` | **Pinned** in the workflow — not necessarily the newest master |
| **Linux** | Not part of the official release matrix | — |

yt-dlp is separate (`YTDLP_TAG`, default `latest`). There is **no** in-app FFmpeg updater (unlike yt-dlp’s header **Update yt-dlp**). Fixing a bad FFmpeg pin means a **new app release**.

## Version drift (yes, it can matter later)

Possible issues (usually rare for audio extract / thumbnail embed):

- Windows “latest LGPL” vs macOS pinned tag behave slightly differently
- An old pin breaks with a newer yt-dlp post-process expectation
- A bad BtbN `latest` day ships a broken Windows build

Mitigation: pin known-good versions in `release.yml` / prepare-script env, smoke-test, tag again. See [RELEASING.md](RELEASING.md).

## Source / local development

```bash
./scripts/prepare-ffmpeg-sidecar.sh   # or: npm run prepare:ffmpeg
```

- **Windows:** downloads LGPL zip (no Chocolatey required for this script). Sidecars must be static/self-contained (BtbN `*-lgpl`).
- **macOS:** LGPL source build with `--disable-autodetect`, then `install_name_tool` so `libmp3lame` loads from `Contents/Resources/` (no Homebrew required at runtime). Prepare fails if absolute `/opt/homebrew` or `/usr/local` dylib paths remain.
- Place yt-dlp sidecar separately (see README)

Do not commit large binaries under `src-tauri/bin/` (gitignored except placeholders / license text).

## License

App code: **GPL-3.0-or-later**. Bundled FFmpeg builds: **LGPL** only. Details: [THIRD_PARTY.md](THIRD_PARTY.md), root [NOTICE](../NOTICE).
