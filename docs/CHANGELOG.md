# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/) where release tags allow.

## [Unreleased]

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

[Unreleased]: https://github.com/s4ngwoo/youtube-playlist-downloader/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/s4ngwoo/youtube-playlist-downloader/releases/tag/v0.1.0
