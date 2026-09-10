# Releasing

How we cut GitHub Releases for **YouTube Playlist & Audio Downloader**, including the bundled **yt-dlp** sidecar.

Korean: [ko/RELEASING.md](ko/RELEASING.md)

## What the release workflow does

Pushing a tag that matches `v*` runs [`.github/workflows/release.yml`](../.github/workflows/release.yml):

| Runner | Rust target | Sidecar file name | Upstream asset |
| :--- | :--- | :--- | :--- |
| `macos-latest` | `aarch64-apple-darwin` | `yt-dlp-aarch64-apple-darwin` | `yt-dlp_macos` (universal2) |
| `macos-latest` | `x86_64-apple-darwin` | `yt-dlp-x86_64-apple-darwin` | `yt-dlp_macos` (universal2) |
| `windows-latest` | host (x64) | `yt-dlp-x86_64-pc-windows-msvc.exe` | `yt-dlp.exe` |

Linux official installers are **not** in the matrix yet (build from source).

## Checklist before tagging

1. **Version** — Bump `src-tauri/tauri.conf.json` `version` (and keep package metadata consistent if you change it).
2. **CHANGELOG** — Move finished items from `[Unreleased]` into a new section in `docs/CHANGELOG.md` and `docs/ko/CHANGELOG.md`.
3. **README platform table** — Confirm Official vs build-from-source rows match the matrix.
4. **yt-dlp policy** — Decide `latest` vs a pinned tag (see below).
5. **Local smoke** (optional but recommended) — `npm run typecheck` and `npm run test:rust`.
6. **Tag and push**

```bash
git tag v0.1.1
git push origin v0.1.1
```

7. **Verify** — On the GitHub Release page, confirm DMG (aarch64 + x64) and Windows installers uploaded; skim the workflow logs for the sidecar download step.

## yt-dlp version: latest vs pin

Workflow env (top of `release.yml`):

```yaml
env:
  YTDLP_TAG: latest
```

| Value | Behavior |
| :--- | :--- |
| `latest` | Download from `…/releases/latest/download/<asset>` (default). |
| A release tag, e.g. `2026.08.19` | Download from `…/releases/download/2026.08.19/<asset>`. |

### When to pin

- YouTube / extractor breakage: pin to a **known-good** yt-dlp release until you validate a newer one.
- Reproducible builds: prefer an explicit tag for that app version.

### When / how to renew

1. Check [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases).
2. Set `YTDLP_TAG` to that tag (or keep `latest`).
3. Locally, replace `src-tauri/bin/yt-dlp-<triple>` and smoke-test fetch + one download.
4. Commit the workflow change (not the binary), tag a new app release if users need the fix.

Asset ↔ sidecar rename mapping matches the table above. On Unix: `chmod +x` after download.

## Local sidecar (development)

Same names as CI; see README “Place the yt-dlp sidecar”. Example for Apple Silicon:

```bash
mkdir -p src-tauri/bin
curl -fsSL -o src-tauri/bin/yt-dlp-aarch64-apple-darwin \
  https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos
chmod +x src-tauri/bin/yt-dlp-aarch64-apple-darwin
```

Do **not** commit large sidecars unless the project explicitly decides to vendor them.

## Not covered by this checklist

- **In-app / one-click yt-dlp update** — still a product roadmap item; releases re-bundle a fresh sidecar instead.
- **Apple Notarization** — optional; needs a paid Apple Developer account. Current first-launch Gatekeeper steps stay in the README / release notes.

## Related

- [CONTRIBUTING.md](CONTRIBUTING.md) — PR checks
- [FAQ.md](FAQ.md) — download failures / updating yt-dlp
- [CHANGELOG.md](CHANGELOG.md)
