# Contributing

Thanks for your interest in contributing to **YouTube Playlist & Audio Downloader**.

## Before you start

1. Read the [README](../README.md), [Terms](TERMS.md), and [Code of Conduct](CODE_OF_CONDUCT.md).
2. Search [existing issues](https://github.com/s4ngwoo/youtube-playlist-downloader/issues) and PRs to avoid duplicates.
3. For security issues, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

## Development setup

See **Prerequisites** and **Installation & Build** in the [README](../README.md).

Typical loop:

```bash
npm install
# place yt-dlp sidecar under src-tauri/bin/
npm run tauri dev
```

## Checks before opening a PR

CI (`.github/workflows/ci.yml`) runs on every PR and push to `main`:

```bash
# Frontend
npm ci
npm run typecheck

# Rust (from repo root or src-tauri/)
npm run test:rust
# equivalent:
cd src-tauri && cargo check && cargo clippy --all-targets -- -W clippy::correctness -W clippy::suspicious && cargo test
```

Clippy is enforced progressively (correctness/suspicious warnings); full `-D warnings` is not required yet.

## Cutting a release

Maintainers: see **[RELEASING.md](RELEASING.md)** for the `v*` tag workflow, platform matrix, and how to pin/renew the bundled yt-dlp sidecar.

## Project conventions

- **Frontend:** React 19 + TypeScript + Tailwind CSS v4 + Zustand (`src/`)
- **Backend:** Rust / Tauri v2 (`src-tauri/`) — keep IPC commands and services modular
- Prefer small, focused PRs over large mixed refactors
- Match existing naming, formatting, and error-handling style
- Do not commit secrets, personal download paths, or large binary artifacts unless required for the sidecar workflow documented in the README

## Pull requests

1. Fork and create a branch from `main`
2. Make your change with a clear purpose
3. Test manually on your OS (download flow, cancel, metadata fetch if touched)
4. Open a PR describing:
   - What changed and why
   - How you tested
   - Screenshots for UI changes (helpful)

## Issue reports

Useful reports include OS, app version, steps to reproduce, expected vs actual behavior, and relevant log excerpts from the in-app log viewer (remove personal paths/URLs if needed).

## License

By contributing, you agree that your contributions are licensed under the project’s **GPL-3.0** license ([LICENSE](../LICENSE)).
