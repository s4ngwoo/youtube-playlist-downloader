# FAQ

## Is this affiliated with YouTube or Google?

No. This is an independent open-source project. See [TERMS.md](TERMS.md).

## Is it free?

Yes. Source and binaries (when published) are available under **GPL-3.0**. See [LICENSE](../LICENSE).

## Does the app collect my data?

The App keeps preferences, history, and logs **on your device**. It does not provide developer analytics accounts. Downloads contact YouTube as part of normal operation. Details: [PRIVACY.md](PRIVACY.md).

## Why does macOS say the developer cannot be verified?

Release builds may not be Apple-notarized. Use **right-click → Open** (or **Open Anyway** in Privacy & Security). Steps are in the [README](../README.md).

## Downloads are slow or failing

1. Update the `yt-dlp` sidecar to the latest release  
2. Install **Deno** and ensure it is on your `PATH`  
3. Confirm **FFmpeg** is installed (Windows: Chocolatey/Scoop/`C:\ffmpeg\bin`, or PATH)  
4. Use the in-app **환경 진단 (Environment diagnose)** button in the footer  
5. Check the in-app **log viewer** for errors  
6. Retry later — YouTube-side changes can cause temporary breakage  

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
