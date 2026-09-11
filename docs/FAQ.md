# FAQ

## Is this affiliated with YouTube or Google?

No. This is an independent open-source project. See [TERMS.md](TERMS.md).

## Is it free?

Yes. Source and binaries (when published) are available under **GPL-3.0**. See [LICENSE](../LICENSE).

## Does the app collect my data?

The App keeps preferences, history, and logs **on your device**. It does not provide developer analytics accounts. Downloads contact YouTube as part of normal operation. Details: [PRIVACY.md](PRIVACY.md).

## Downloads are slow or failing

1. Use the footer **Update yt-dlp** button (installs a newer binary under app data; does not rewrite the release-bundled sidecar)  
2. Or wait for the next app release, which re-bundles yt-dlp (maintainers: [RELEASING.md](RELEASING.md))  
3. Install **Deno** and ensure it is on your `PATH`  
4. Confirm **FFmpeg** is installed (Windows: Chocolatey/Scoop/`C:\ffmpeg\bin`, or PATH)  
5. Use **Environment diagnose** in the footer (shows yt-dlp source/version plus FFmpeg/Deno)  
6. Check the in-app **log viewer** for errors  
7. Retry later — YouTube-side changes can cause temporary breakage  

## Why does macOS say the developer cannot be verified?

This project **does not** use Apple Notarization (no paid Apple Developer account). Use **right-click → Open** (or **Open Anyway** in Privacy & Security). Steps are in the [README](../README.md).

## Which platforms have official installers?

**macOS** (Apple Silicon and Intel) and **Windows x64** via [GitHub Releases](https://github.com/s4ngwoo/youtube-playlist-downloader/releases/latest). **Linux official installers are not planned** (build from source if you want the GUI; otherwise `yt-dlp` on the CLI is usually enough).

## Can I download DRM / Movies / paid rentals?

No. DRM-protected content is not supported.

## Where are files saved?

Wherever you set with **Change Folder**. That path is remembered locally.

## Can I choose only some tracks in a playlist?

Yes — fetch metadata first, then select tracks in the selection UI before downloading.

## Korean filenames look broken on Android

Use the App’s **mobile-friendly ZIP** export (NFC normalization).

## How do I build from source?

See [README — Installation & Build](../README.md#installation--build).

## How do I report a bug or security issue?

- Bugs / features: [GitHub Issues](https://github.com/s4ngwoo/youtube-playlist-downloader/issues)  
- Security: [SECURITY.md](SECURITY.md)  
- General help: [SUPPORT.md](SUPPORT.md)
