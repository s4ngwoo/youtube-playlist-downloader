# Releasing

How we cut GitHub Releases for **YouTube Playlist & Audio Downloader**, including the bundled **yt-dlp** and **LGPL FFmpeg** sidecars.

Korean: [ko/RELEASING.md](ko/RELEASING.md)

## What the release workflow does

Pushing a tag that matches `v*` runs [`.github/workflows/release.yml`](../.github/workflows/release.yml):

| Runner | Rust target | yt-dlp sidecar | FFmpeg triple | FFmpeg source |
| :--- | :--- | :--- | :--- | :--- |
| `macos-latest` | `aarch64-apple-darwin` | `yt-dlp-aarch64-apple-darwin` ← `yt-dlp_macos` | `aarch64-apple-darwin` | LGPL source build (`FFMPEG_TAG`) |
| `windows-latest` | host (x64) | `yt-dlp-x86_64-pc-windows-msvc.exe` ← `yt-dlp.exe` | `x86_64-pc-windows-msvc` | BtbN `win64-lgpl` zip |

**Intel Mac** and **Linux** official installers are **not planned** (build from source only; see README platform table).

Third-party notices: [THIRD_PARTY.md](THIRD_PARTY.md).

**End-user vs source-build behavior** (Chocolatey not required for Release installers; git clones need `prepare-ffmpeg-sidecar.sh`): see **[FFMPEG.md](FFMPEG.md)**.

## Checklist before tagging

0. **Actions token** — Repo Settings → Actions → General → Workflow permissions must allow **Read and write** (or workflows must successfully elevate with top-level `permissions: contents: write`). Otherwise `tauri-action` fails with `Resource not accessible by integration` on create-a-release.
1. **Version** — Bump **together**: `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json` (then refresh `package-lock.json` / `Cargo.lock` as needed).
2. **CHANGELOG** — Move finished items from `[Unreleased]` into a new section in `docs/CHANGELOG.md` and `docs/ko/CHANGELOG.md`.
3. **README platform table** — Confirm Official vs build-from-source rows match the matrix.
4. **yt-dlp / FFmpeg policy** — Decide `YTDLP_TAG` / `FFMPEG_TAG` (see below).
5. **Local smoke** (optional but recommended) — `npm run typecheck`, `npm test`, and `npm run test:rust`.
6. **CI green** on the same commit you will tag.
7. **Tag and push**

```bash
git tag v0.4.2
git push origin v0.4.2
```

8. **Verify** — On the GitHub Release page, confirm the Apple Silicon DMG and Windows installers uploaded; skim the workflow logs for the yt-dlp **and** FFmpeg prepare steps. Wait for **all** matrix jobs (do not treat one green OS as done). If create-a-release 403 appears, re-check step 0.

If a release or CI run fails in a new way, update the **Failure patterns** section below and a private note under `notes/errors/` when useful.

## Sidecar / bundle changes — avoid repeating class-A CI breaks

Changing `tauri.conf.json` `externalBin` or `resources` affects **every** `cargo check` / bundle runner, including Ubuntu CI (which never ships macOS dylibs to users). Before merging:

1. Extend or verify [`scripts/ci-prepare-sidecar-stubs.sh`](../scripts/ci-prepare-sidecar-stubs.sh)
2. Align `release.yml` prepare / `test -f` / Windows resource stubs
3. Re-read the [maintainer checklist](#maintainer-checklist-add-to-every-sidecar--bundle-change) below

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
- Docs hub: [README.md](README.md)

---

## Failure patterns & lessons

Why tagged releases and `main` CI kept breaking while shipping sidecar / format changes — root causes, what we generalized, what still needs process, and maintainer lessons.

Korean: [ko/RELEASING.md](ko/RELEASING.md#실패-패턴--교훈)

### Short answer

Most “every deploy breaks” incidents were **not random flakiness**. They came from the same structural mismatch:

1. **Tauri build-time paths** (`externalBin`, `resources`) must exist on **every** runner that runs `cargo check` / bundle — even when that OS never ships the real file to users.
2. **Release** downloads/builds real sidecars; **CI** only stubs them. Those two workflows **drift** unless updated together.
3. **Local macOS success ≠ Ubuntu CI / Windows release success** (different triples, different prepare scripts, different linkage rules).
4. **Tag-first / fix-later** shipping meant product bugs and workflow gaps were discovered **during** `v*` runs instead of before.

### Incident map (2026-09 era)

| When | Layer | Symptom | Root cause (class) | Fix |
| :--- | :--- | :--- | :--- | :--- |
| Sidecar CI | CI | `resource path bin/yt-dlp-<linux-triple> doesn't exist` | A — build-time path | Stub in CI → now [`scripts/ci-prepare-sidecar-stubs.sh`](../scripts/ci-prepare-sidecar-stubs.sh) |
| v0.3.0 tag | CI on `main` | ESLint / Prettier / `cargo fmt` fail while Release still ran | B — gate not run before tag | Format/lint fix commit; always green CI before tag |
| tauri-action | Release | GitHub Release metadata incomplete | C — action inputs | Set `releaseName` (and keep checklist) |
| FFmpeg feature | Release macOS | configure / lame not found | D — host toolchain vs portable binary | Homebrew + `PKG_CONFIG` / prefixes in prepare |
| v0.4.0 Windows | Release | prepare overwrote output path; no `ffmpeg-*.exe` | D — script portability | Separate extract dir vs `FFMPEG_OUT` |
| v0.4.0 / 0.4.1 macOS | Product after install | FFmpeg linked to Homebrew absolute paths | D — ship machine ≠ user machine | `@executable_path/../Resources/` + bundle `libmp3lame.0.dylib` |
| v0.4.1 → `main` CI | CI | `resource path resources/libmp3lame.0.dylib doesn't exist` | A again — new resource, CI stub not extended | Stub + script; release already stubbed on Windows |

Same class **A** hit twice: first `externalBin`, then `resources`. That is the strongest signal that the rule must be procedural, not one-off YAML edits.

### Failure classes (generalize these)

#### A — Tauri build-time artifact presence

**Rule:** Anything listed in `tauri.conf.json` under `bundle.externalBin` or `bundle.resources` must exist when the Tauri build script runs.

| Environment | What should exist |
| :--- | :--- |
| Ubuntu CI (`cargo check`) | Stubs for Linux triples + empty/placeholder resources |
| Release macOS / Windows | Real yt-dlp + FFmpeg/ffprobe; macOS also real lame dylib; Windows may stub unused macOS resource |
| Local dev | Host triple binaries only |

**Already solved with tooling:**

- CI: `./scripts/ci-prepare-sidecar-stubs.sh` (wired from `.github/workflows/ci.yml`)
- Release Windows: empty `libmp3lame.0.dylib` stub when prepare does not create one
- Release / local real FFmpeg: `./scripts/prepare-ffmpeg-sidecar.sh`

**Still process (human checklist), not fully automated:**

Whenever you **add or rename** an `externalBin` or `resources` entry, update **all three**: stub script, `release.yml` smoke/stub steps, and [FFMPEG.md](FFMPEG.md) / this page’s tables.

#### B — Release tag without green maintainer gates

**Rule:** Tagging `v*` must not be the first time ESLint, Prettier, `cargo fmt`, or stub-aware `cargo check` run on the commit you ship.

**Already solved:** PR/`main` CI includes frontend lint/format/test and Rust fmt/check/clippy/test.

**Process:** Before `git tag`, confirm the **same commit** is green on CI (or run the same commands locally). Do not “tag then fix on main.”

#### C — Release action / matrix configuration

**Rule:** GitHub Release uploads depend on tauri-action inputs, a correct OS matrix, **and** a `GITHUB_TOKEN` that can create releases.

**Already solved for known cases:** `releaseName` set; workflow top-level `permissions: contents: write`; repo Actions default token set to **write** (read-only default → `Resource not accessible by integration` on create-a-release). Official matrix is Apple Silicon + Windows only (no Intel Mac runner).

**Process:** After any `release.yml` edit, dry-run: matrix rows, sidecar names, prepare env, smoke `test -f`, and Settings → Actions → Workflow permissions.

#### D — “Builds on the builder” ≠ “runs on the user”

**Rule:** A binary that works on the GitHub runner / your Mac can still fail for users if it:

- links absolute Homebrew paths (`/opt/homebrew/...`),
- overwrites its own output path during unzip/extract,
- assumes system FFmpeg/Deno when the product claim is “bundled.”

**Already solved for FFmpeg 0.4.1:** portable lame rewrite + Windows extract-dir fix + CI/release smoke checks for sidecar paths.

**Process:** For any new native sidecar, add an explicit **portability smoke** (e.g. `otool -L` must not contain `/opt/homebrew` or `/usr/local` on shipped macOS ffmpeg). Prefer failing prepare over shipping a “works on CI” binary.

#### E — Product race / incomplete cancel (not deploy infra, but shipped with releases)

Cancel only killed live PIDs while `buffer_unordered` kept spawning; stderr `WARNING:` looked like failure. Fixed on `main` (`ok.cancelled`, cancel flag, ERROR-only fail). Treat as a reminder: **concurrency + cancel** need integration thinking, not only unit tests on helpers.

### What we can generalize vs invent

| Need | Status | Action |
| :--- | :---: | :--- |
| Keep Tauri path requirements satisfied on CI | **Tool exists** | Use / extend `scripts/ci-prepare-sidecar-stubs.sh` |
| Build real LGPL FFmpeg | **Tool exists** | `scripts/prepare-ffmpeg-sidecar.sh` |
| Document end-user vs source-build FFmpeg | **Docs exist** | [FFMPEG.md](FFMPEG.md) |
| Force “conf change → stub/release sync” | **Process + checklist** | See below; optional future: CI job that parses `tauri.conf.json` and asserts stub script covers listed names |
| Catch Homebrew linkage before upload | **Partial** | prepare already fails if absolute paths remain; keep that invariant |
| Full install E2E on all three release OS | **Not automated** | Optional future: post-release smoke. Costly; local `package:local-dmg` remains the cheap bar |
| Pre-tag “release rehearsal” workflow | **Not built** | Optional: `workflow_dispatch` that runs prepare + `tauri build` **without** publishing |

**Recommendation:** Prefer extending the stub/prepare scripts and the pre-tag checklist over new heavy CI. Add conf-vs-stub assertion only if class A recurs again.

### Maintainer checklist (add to every sidecar / bundle change)

Copy into the PR description when touching bundling:

- [ ] `tauri.conf.json` `externalBin` / `resources` change listed
- [ ] `scripts/ci-prepare-sidecar-stubs.sh` updated (or verified still sufficient)
- [ ] `release.yml` prepare + `test -f` / Windows resource stub still correct
- [ ] macOS: no absolute Homebrew paths in shipped `ffmpeg` / `ffprobe` (`otool -L`)
- [ ] Windows: output path ≠ extract directory in prepare
- [ ] Docs: this page / [FFMPEG.md](FFMPEG.md) tables if names or platforms changed
- [ ] CI green on the commit you will tag
- [ ] Tag only after the above; watch **all** matrix jobs (do not cancel early on first green OS)

### Lessons (keep these)

1. **Conf is a contract with every builder.** Adding a resource for macOS users still breaks Linux CI the same day unless stubs follow.
2. **CI green ≠ release green.** Stubs prove compile; prepare + linkage prove ship.
3. **One OS green ≠ matrix green.** Cancelled Windows jobs hide the next day’s emergency patch.
4. **Portability is a feature requirement**, not a polish step — especially with Homebrew-assisted builds.
5. **Fix the class, not only the path.** The second `doesn't exist` for `libmp3lame` was predictable after yt-dlp stubs; the stub script is the generalization.
6. **Tag is a promotion, not a test plan.** Use CI + local prepare smoke before `v*`.
7. **Write the failure down** (private `notes/errors/` for hypotheses; lasting rules stay on this page).

### Quick commands

```bash
./scripts/ci-prepare-sidecar-stubs.sh
./scripts/prepare-ffmpeg-sidecar.sh

npm run typecheck && npm run lint && npm run format:check && npm test
npm run test:rust
```

Then follow the [checklist before tagging](#checklist-before-tagging) above.
