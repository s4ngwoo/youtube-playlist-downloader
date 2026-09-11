# FAQ

## Is this affiliated with YouTube or Google?

No. This is an independent open-source project. See [TERMS.md](TERMS.md).

## Is it free?

Yes. Source and binaries (when published) are available under **GPL-3.0**. See [LICENSE](../LICENSE). Bundled FFmpeg is **LGPL** — [THIRD_PARTY.md](THIRD_PARTY.md).

## Does the app collect my data?

The App keeps preferences, history, and logs **on your device**. It does not provide developer analytics accounts. Downloads contact YouTube as part of normal operation; **Update yt-dlp** may also contact GitHub. Details: [PRIVACY.md](PRIVACY.md).

## Do I need to install FFmpeg myself? (Chocolatey / Scoop / Homebrew)

**Official macOS / Windows installers: no.** Releases ship LGPL `ffmpeg` + `ffprobe` inside the app. You do **not** need Chocolatey, Scoop, winget, or Homebrew for FFmpeg as an end user.

**Building from source** (developers, Linux): binaries are not in git. Run `./scripts/prepare-ffmpeg-sidecar.sh`, or use a system FFmpeg as fallback. Full detail: [FFMPEG.md](FFMPEG.md).

## I already have FFmpeg on my PC. Which one does the app use?

**Bundled first**, then system `PATH` / common locations if the bundle is missing. The app does **not** overwrite your system install. Footer **Environment diagnose** shows `bundled` or `system`.

## Is FFmpeg always the newest on every release?

Not exactly. Release Actions prepare FFmpeg automatically, but:

- **Windows:** default BtbN **latest** LGPL zip (floating)
- **macOS:** version **pinned** via `FFMPEG_TAG` in the workflow (e.g. `n7.1.1`)

There is no in-app FFmpeg updater. Version pins and drift notes: [FFMPEG.md](FFMPEG.md) · [RELEASING.md](RELEASING.md).

## Downloads are slow or failing

1. Use the header **Update yt-dlp** button (installs a newer binary under app data; does not rewrite the release-bundled sidecar)  
2. Or wait for the next app release, which re-bundles yt-dlp / FFmpeg (maintainers: [RELEASING.md](RELEASING.md))  
3. Install **Deno** and ensure it is on your `PATH` (optional but recommended)  
4. Confirm **FFmpeg** — official builds bundle it; if diagnose shows missing, reinstall the app (dev: `scripts/prepare-ffmpeg-sidecar.sh`, or temporary system FFmpeg). See [FFMPEG.md](FFMPEG.md)  
5. Use **Environment diagnose** in the footer (shows yt-dlp source/version plus FFmpeg source/Deno)  
6. Check the in-app **log viewer** for errors  
7. Retry later — YouTube-side changes can cause temporary breakage  
8. Raising **Concurrency** alone often does not speed things up — see [APP.md](APP.md#concurrent-downloads)

## Why doesn’t higher concurrency feel much faster?

Each slot runs download **and** FFmpeg extract/embed on a shared link and CPU. Guide: [APP.md](APP.md#concurrent-downloads).

## Why does macOS say the developer cannot be verified?

This project **does not** use Apple Notarization (no paid Apple Developer account). Use **right-click → Open** (or **Open Anyway** in Privacy & Security). Steps are in the [README](../README.md).

## Which platforms have official installers?

**macOS** (Apple Silicon and Intel) and **Windows x64** via [GitHub Releases](https://github.com/s4ngwoo/youtube-playlist-downloader/releases/latest). Those builds include bundled FFmpeg. **Linux official installers are not planned** (build from source if you want the GUI; otherwise `yt-dlp` on the CLI is usually enough).

## Can I download DRM / Movies / paid rentals?

No. DRM-protected content is not supported.

## Where are files saved?

Wherever you set with **Change Folder**. That path is remembered in app settings (`settings.json`).

## Can I choose only some tracks in a playlist?

Yes — fetch metadata first, then select tracks in the selection UI before downloading.

## Korean filenames look broken on Android

Use the App’s **mobile-friendly ZIP** export (NFC normalization).

## Why don’t filenames include `[video id]` anymore?

Files are saved as `Title.ext` (yt-dlp `-o %(title)s.%(ext)s`). If that path already exists, the download is **skipped** (`--no-overwrites`) instead of overwriting. Details: [APP.md](APP.md#output-filenames).

## Why are some playlist tracks marked skipped (private / deleted)?

Unavailable slots are listed as skipped with a reason. When the flat playlist dump has no title/`availability`, the app probes those video ids once and maps yt-dlp stderr (`Private video` → private, `Video unavailable` → deleted).

## Are subtitles downloaded with audio?

No by default. Audio extract does not request or embed subs. An optional ON toggle is later / on demand.

## How do I build from source?

See [README — Installation & Build](../README.md#installation--build). Prepare FFmpeg with `./scripts/prepare-ffmpeg-sidecar.sh` (or system FFmpeg fallback) — [FFMPEG.md](FFMPEG.md).

## How do I report a bug or get help?

1. Check this FAQ, [FFMPEG.md](FFMPEG.md), and the [README](../README.md)
2. Search [existing issues](https://github.com/s4ngwoo/youtube-playlist-downloader/issues)
3. Open a new issue with OS/arch, app version, steps, expected vs actual, and log excerpts (redact personal paths)

| Channel | Use for |
| :--- | :--- |
| [GitHub Issues](https://github.com/s4ngwoo/youtube-playlist-downloader/issues) | Bugs, feature requests |
| [GitHub Releases](https://github.com/s4ngwoo/youtube-playlist-downloader/releases) | Builds & release notes |
| Email: [s4ngwoo.lee@gmail.com](mailto:s4ngwoo.lee@gmail.com) | Private / security contact |

This is a personal open-source project on a best-effort basis (no SLA). Security reports: [SECURITY.md](SECURITY.md) — do not post exploits publicly.
