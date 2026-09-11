# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/) where release tags allow.

## [Unreleased]

### Added

- Session download ETA estimate (`~M:SS`) from download-phase work only; post-process count when extract/tag remains (no fake `00:00` sticky ETA)
- Failed tracks keep playlist titles (not only “Track #N”) and sort to the top of the per-track list; download tasks carry title for progress events
- Live activity status (receiving / queued / post-process) in header and form while downloading
- Smoother overall progress bar (download phase weighted 0–90%; ignore tiny regressions)
- Playlist fetch surfaces skipped private/deleted/unavailable entries with reasons (still not downloadable)
- Failed-only track list filter; history entries store download folder and can open it

### Fixed

- Skipped playlist entries: classify private/deleted via title (EN/KO), `availability`, and null slots — fewer false “unknown” labels
- History “Folder” uses reveal-in-dir (allowed by `opener:default`); `openPath` was denied and always failed

### Changed

- Track title fallback and environment-diagnose labels follow EN/KO i18n (no hard-coded Korean/English fragments)
- Overall progress averages selected tracks in the store map (not a dense `1..N` index loop)
- yt-dlp stderr no longer marks every line as failed (ERROR / non-zero exit only)

### Notes

- Work queue (maintainer): **Sprint 4** remaining after local DMG smoke — Advanced mode terminal-like progress, default **off** for subtitle download on audio extracts.
- Deferred: split yt-dlp into download-only then post-process passes (A2-pipe); Wave D extras on demand.

## [0.2.0] - 2026-09-11

### Added

- GitHub Actions CI on PRs and `main` (frontend typecheck, Rust check/clippy/test)
- Unit tests for parser title cleaning/regexes, NFC name normalization, and yt-dlp entry validation
- `npm run typecheck` and `npm run test:rust` scripts
- Stronger environment detection for FFmpeg/Deno (including common Windows install paths)
- Pre-download FFmpeg requirement check with install hints; Deno missing is warning-only
- Sidecar errors now include the expected yt-dlp binary name for the current platform
- In-app **Environment diagnose** action (footer) via `diagnose_environment`
- Persistent app settings (`settings.json`): download folder, concurrency (1–8), audio format (m4a/mp3)
- UI controls for concurrency and output format; one-time migration from `localStorage` download path
- GitHub Release matrix: **macOS Intel (x86_64)** alongside Apple Silicon and Windows
- [RELEASING.md](RELEASING.md) / [ko/RELEASING.md](ko/RELEASING.md) — tag checklist and yt-dlp sidecar pin/renew procedure
- Frontend EN/KO i18n (header language switch; catalogs in `src/i18n/`); locale stored in `settings.json`
- Stable Rust IPC message codes (`error.*` / `ok.*`) mapped on the frontend for bilingual errors
- Frontend `vitest` for settings/i18n pure helpers (`npm test`); CI frontend job runs tests
- One-click **yt-dlp update** (footer): downloads latest GitHub asset into app-data `sidecars/` override; runtime prefers override over bundled sidecar (`update_ytdlp` / `ytdlp_status`)
- Environment diagnose returns stable warning/hint codes plus yt-dlp source/version; metadata editor / log viewer / advanced track labels fully i18n
- Cursor project rules under `.cursor/rules/` and local verify packaging (`npm run package:local-dmg` → `local-packages/`)

### Changed

- Aligned `tauri-plugin-store` Cargo dependency to `2.4` (was `2.0.0-rc.0`)
- Corrected `package.json` / `Cargo.toml` homepage and repository URLs to this repo
- Updated GitHub Release notes template for Apple Silicon, Intel Mac, and Windows x64
- Documented CI commands in Contributing guides
- FAQ: Windows FFmpeg paths and Environment diagnose button
- Release workflow downloads yt-dlp via configurable `YTDLP_TAG` (`latest` or a pinned tag)
- **Linux official installers are not planned** (build from source / CLI yt-dlp); README, FAQ, RELEASING updated
- Contributing: project map including i18n locale files and settings fields
- CI clippy uses `-D warnings`; Contributing sync
- **Apple Notarization permanently out of scope** (cost); Gatekeeper docs retained
- Documented in-app yt-dlp update as app-data override (separate from release-bundled sidecar)
- Documented **local verify DMG** workflow: gitignored `local-packages/` + `npm run package:local-dmg` ([CONTRIBUTING.md](CONTRIBUTING.md))

### Fixed

- Declared direct `chrono` dependency used by the app logger (release build)

### Removed

- Unused `src-tauri` scratch/debug helpers (`scratch.rs`, `test_*.rs`, `string_to_item_key.rs`, `match_keys.py`)

### Documentation

- Reorganized project docs under `docs/`
- Set English `README.md` as default; added `README_KO.md`
- Added full Korean translations under `docs/ko/`

## [0.1.0] - 2025-09

Initial public desktop app release line (Tauri v2).

### Added

- YouTube single-video and playlist audio download to AAC `.m4a`
- Playlist metadata fetch and selective track download
- Cover art and metadata embedding via FFmpeg / yt-dlp pipeline
- Parallel download support with retry for failed items
- Download history (local store)
- Mobile-friendly ZIP export with NFC filename normalization
- Persistent app logging and dedicated log viewer window
- Process tree cleanup on cancel / exit
- Deno detection for yt-dlp JS runtime challenges
- GitHub Actions release workflow for macOS (Apple Silicon) and Windows

### Notes

- Exact tag dates and asset names: see [GitHub Releases](https://github.com/s4ngwoo/youtube-playlist-downloader/releases).

[Unreleased]: https://github.com/s4ngwoo/youtube-playlist-downloader/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/s4ngwoo/youtube-playlist-downloader/releases/tag/v0.2.0
[0.1.0]: https://github.com/s4ngwoo/youtube-playlist-downloader/releases/tag/v0.1.0
