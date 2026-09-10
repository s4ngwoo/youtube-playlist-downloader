# Privacy Policy

**Last updated:** 2026-09-11  
**Product:** YouTube Playlist & Audio Downloader  
**Developer:** Lee SangWoo ([s4ngwoo.lee@gmail.com](mailto:s4ngwoo.lee@gmail.com))

This policy describes how the desktop application (“the App”) handles information. The App is a **local**, open-source tool. It does **not** operate a cloud account system and does **not** sell personal data.

## Summary

| Topic | Practice |
| :--- | :--- |
| Accounts | None — no sign-in |
| Analytics / ads | None built into the App |
| Crash telemetry to the developer | Not sent by the App |
| Data location | On your device only (unless you choose otherwise) |

## Information the App may store on your device

Depending on features you use, the App may keep locally:

- **Download folder path** (e.g. via `localStorage` or equivalent)
- **Download history** (playlist/video URLs and titles you previously used), via Tauri’s local store plugin
- **Application logs** written under the app’s local data directory (for troubleshooting; viewable in the in-app log viewer)
- **Downloaded audio files and optional ZIP archives** in folders **you** select
- Transient UI state (URL input, selected tracks, progress) in memory while the App is running

You can clear history/logs through the App where those features exist, and you can delete files and folders on disk yourself.

## Network activity

To fetch metadata and download media, the App (and bundled helpers such as `yt-dlp`, plus system tools like `ffmpeg` / optional `Deno`) communicate with **third-party services you request** — primarily YouTube (and related CDNs). Those services have their own privacy policies and terms.

The App does **not** intentionally upload your download history, logs, or files to the developer’s servers.

## Permissions

As a desktop app, the App may request or use access to:

- **File system** — read/write the download directory you choose; read/write local config, history, and logs
- **Network** — contact YouTube (and related endpoints) for metadata and media
- **Process execution** — run the `yt-dlp` sidecar and detect/use tools like `ffmpeg` and `Deno` on your system

## Children

The App is not directed at children under 13 (or the minimum age required in your jurisdiction). Do not use it if you are below that age.

## Third-party software

The App bundles or relies on third-party components (for example `yt-dlp`). Their behavior and data practices are governed by their own licenses and policies.

## Changes

This policy may be updated in the repository. The “Last updated” date will change when material updates are made. Continued use after updates constitutes acceptance of the revised policy where permitted by law.

## Contact

Privacy questions: [s4ngwoo.lee@gmail.com](mailto:s4ngwoo.lee@gmail.com)  
Repository: [https://github.com/s4ngwoo/youtube-playlist-downloader](https://github.com/s4ngwoo/youtube-playlist-downloader)

> **Note:** This document is provided for transparency for an open-source personal project. It is not formal legal advice. If you redistribute builds commercially or collect additional data, revise this policy accordingly.
