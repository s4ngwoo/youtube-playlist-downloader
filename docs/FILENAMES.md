# Output filenames

Downloaded audio uses a **clean title** as the file name (no YouTube `[video id]` suffix).

## What you get

| | |
| :--- | :--- |
| Template | `%(title)s.%(ext)s` → e.g. `Insomnia.m4a` |
| Existing file | **Skipped** (`--no-overwrites`) — will not replace a file with the same name |
| Re-download of same playlist URL | App already asks via history confirm before fetch |

Video id in brackets was yt-dlp’s default for uniqueness. It is not required for playback or tags.

## Limits

- Two different videos with the **exact same title** in one folder: the first file wins; later jobs with that name are skipped (not renamed).
- History confirms **playlist/URL** re-download, not per-file presence on disk.
- Korean names on Android: still use **mobile-friendly ZIP (NFC)** if needed — see [FAQ.md](FAQ.md).

## Related

- Concurrent downloads: [CONCURRENCY.md](CONCURRENCY.md)  
- Korean: [ko/FILENAMES.md](ko/FILENAMES.md)
