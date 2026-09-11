# Releasing

How we cut GitHub Releases for **YouTube Playlist & Audio Downloader**, including the bundled **yt-dlp** and **LGPL FFmpeg** sidecars.

Korean: [ko/RELEASING.md](ko/RELEASING.md)

## What the release workflow does

Pushing a tag that matches `v*` runs [`.github/workflows/release.yml`](../.github/workflows/release.yml):

| Runner | Rust target | yt-dlp sidecar | FFmpeg triple | FFmpeg source |
| :--- | :--- | :--- | :--- | :--- |
| `macos-latest` | `aarch64-apple-darwin` | `yt-dlp-aarch64-apple-darwin` ← `yt-dlp_macos` | `aarch64-apple-darwin` | LGPL source build (`FFMPEG_TAG`) |
| `macos-13` | `x86_64-apple-darwin` | `yt-dlp-x86_64-apple-darwin` ← `yt-dlp_macos` | `x86_64-apple-darwin` | LGPL source build (native Intel) |
| `windows-latest` | host (x64) | `yt-dlp-x86_64-pc-windows-msvc.exe` ← `yt-dlp.exe` | `x86_64-pc-windows-msvc` | BtbN `win64-lgpl` zip |

Linux official installers are **not planned** (build from source only; see README platform table).

Third-party notices: [THIRD_PARTY.md](THIRD_PARTY.md).

**End-user vs source-build behavior** (Chocolatey not required for Release installers; git clones need `prepare-ffmpeg-sidecar.sh`): see **[FFMPEG.md](FFMPEG.md)**.

## Checklist before tagging

1. **Version** — Bump **together**: `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json` (then refresh `package-lock.json` / `Cargo.lock` as needed).
2. **CHANGELOG** — Move finished items from `[Unreleased]` into a new section in `docs/CHANGELOG.md` and `docs/ko/CHANGELOG.md`.
3. **README platform table** — Confirm Official vs build-from-source rows match the matrix.
4. **yt-dlp / FFmpeg policy** — Decide `YTDLP_TAG` / `FFMPEG_TAG` (see below).
5. **Local smoke** (optional but recommended) — `npm run typecheck`, `npm test`, and `npm run test:rust`.
6. **Tag and push**

```bash
git tag v0.4.1
git push origin v0.4.1
```

7. **Verify** — On the GitHub Release page, confirm DMG (aarch64 + x64) and Windows installers uploaded; skim the workflow logs for the yt-dlp **and** FFmpeg prepare steps.

## yt-dlp / FFmpeg pins

Workflow env (top of `release.yml`):

```yaml
env:
  YTDLP_TAG: latest
  FFMPEG_TAG: n7.1.1
```

| Variable | Behavior |
| :--- | :--- |
| `YTDLP_TAG=latest` | Download from `…/releases/latest/download/<asset>` (default). |
| `YTDLP_TAG=<tag>` | Download from `…/releases/download/<tag>/<asset>`. |
| `FFMPEG_TAG` | macOS source checkout branch/tag for the LGPL build. |
| Windows FFmpeg URL | Default BtbN `ffmpeg-master-latest-win64-lgpl.zip` (override via `FFMPEG_WIN_URL` in the prepare script). |

### Version drift

Windows may float on BtbN `latest` LGPL while macOS stays on `FFMPEG_TAG`. That can diverge over time. Prefer pinning both when you need reproducibility, and re-tag after a smoke test if post-process breaks. User-facing explanation: [FFMPEG.md](FFMPEG.md) · [FAQ.md](FAQ.md).

### When to pin

- YouTube / extractor breakage: pin yt-dlp to a **known-good** release until you validate a newer one.
- Reproducible builds: prefer explicit tags for that app version.

### When / how to renew

1. Check [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases) and [FFmpeg tags](https://github.com/FFmpeg/FFmpeg/tags) / [BtbN builds](https://github.com/BtbN/FFmpeg-Builds/releases).
2. Set `YTDLP_TAG` / `FFMPEG_TAG` (or keep defaults).
3. Locally, run `./scripts/prepare-ffmpeg-sidecar.sh`, replace `src-tauri/bin/yt-dlp-<triple>`, and smoke-test fetch + one download.
4. Commit the workflow change (not the binaries), tag a new app release if users need the fix.

Asset ↔ sidecar rename mapping matches the table above. On Unix: `chmod +x` after download.

## Local sidecars (development)

```bash
# FFmpeg + ffprobe (LGPL)
./scripts/prepare-ffmpeg-sidecar.sh

# yt-dlp (Apple Silicon example)
mkdir -p src-tauri/bin
curl -fsSL -o src-tauri/bin/yt-dlp-aarch64-apple-darwin \
  https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos
chmod +x src-tauri/bin/yt-dlp-aarch64-apple-darwin
```

Do **not** commit large sidecars unless the project explicitly decides to vendor them.

**Triple caution:** Development and `npm run package:local-dmg` need sidecars for **this host’s** Rust triple (`rustc -vV` → `host:`). Shipping/CI download other triples separately; mixing names under `src-tauri/bin/` is a common cause of local “sidecar not found” failures.

## Not covered by this checklist

- **Apple Notarization** — **out of scope permanently** (cost / no paid Apple Developer account). First-launch Gatekeeper steps stay in the README / release notes. Do not treat as deferred work.
- **`local-packages/` DMGs** — local verify builds only (gitignored). See [CONTRIBUTING.md](CONTRIBUTING.md). Do not upload these as release assets unless intentionally cutting a tagged release.

## In-app yt-dlp update vs release sidecar

Users can install a newer yt-dlp via the header **Update yt-dlp** action. That writes an **override** under the app local data `sidecars/` directory and prefers it at runtime. It does **not** rewrite the release-bundled `externalBin` sidecar. The next GitHub Release still ships its own pinned/latest sidecar independently of any user’s override.

FFmpeg is release-bundled only (no in-app FFmpeg updater).

## Related

- [CONTRIBUTING.md](CONTRIBUTING.md) — PR checks
- [FAQ.md](FAQ.md) — download failures / updating yt-dlp / FFmpeg questions
- [FFMPEG.md](FFMPEG.md) — bundled FFmpeg model for users and maintainers
- [THIRD_PARTY.md](THIRD_PARTY.md) — LGPL FFmpeg notices
- [CHANGELOG.md](CHANGELOG.md)
