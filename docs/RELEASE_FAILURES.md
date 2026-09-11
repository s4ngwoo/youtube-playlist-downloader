# Release & CI failure patterns

Why tagged releases and `main` CI kept breaking while shipping sidecar / format changes — root causes, what we generalized, what still needs process, and maintainer lessons.

Korean: [ko/RELEASE_FAILURES.md](ko/RELEASE_FAILURES.md)

Related: [RELEASING.md](RELEASING.md) · [FFMPEG.md](FFMPEG.md) · [CONTRIBUTING.md](CONTRIBUTING.md)

---

## Short answer

Most “every deploy breaks” incidents were **not random flakiness**. They came from the same structural mismatch:

1. **Tauri build-time paths** (`externalBin`, `resources`) must exist on **every** runner that runs `cargo check` / bundle — even when that OS never ships the real file to users.
2. **Release** downloads/builds real sidecars; **CI** only stubs them. Those two workflows **drift** unless updated together.
3. **Local macOS success ≠ Ubuntu CI / Windows release success** (different triples, different prepare scripts, different linkage rules).
4. **Tag-first / fix-later** shipping meant product bugs and workflow gaps were discovered **during** `v*` runs instead of before.

---

## Incident map (2026-09 era)

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

---

## Failure classes (generalize these)

### A — Tauri build-time artifact presence

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

Whenever you **add or rename** an `externalBin` or `resources` entry, update **all three**: stub script, `release.yml` smoke/stub steps, and [FFMPEG.md](FFMPEG.md) / [RELEASING.md](RELEASING.md) tables.

### B — Release tag without green maintainer gates

**Rule:** Tagging `v*` must not be the first time ESLint, Prettier, `cargo fmt`, or stub-aware `cargo check` run on the commit you ship.

**Already solved:** PR/`main` CI includes frontend lint/format/test and Rust fmt/check/clippy/test.

**Process:** Before `git tag`, confirm the **same commit** is green on CI (or run the same commands locally). Do not “tag then fix on main.”

### C — Release action / matrix configuration

**Rule:** GitHub Release uploads depend on tauri-action inputs and a correct OS matrix (Apple Silicon + Intel + Windows). Missing inputs fail late or produce incomplete releases.

**Already solved for known cases:** `releaseName` set; Intel Mac on `macos-13` for native x86_64 FFmpeg.

**Process:** After any `release.yml` edit, read one dry-run mental checklist: matrix rows, sidecar download names, prepare env (`YTDLP_TAG` / `FFMPEG_TAG`), smoke `test -f` paths.

### D — “Builds on the builder” ≠ “runs on the user”

**Rule:** A binary that works on the GitHub runner / your Mac can still fail for users if it:

- links absolute Homebrew paths (`/opt/homebrew/...`),
- overwrites its own output path during unzip/extract,
- assumes system FFmpeg/Deno when the product claim is “bundled.”

**Already solved for FFmpeg 0.4.1:** portable lame rewrite + Windows extract-dir fix + CI/release smoke checks for sidecar paths.

**Process:** For any new native sidecar, add an explicit **portability smoke** (e.g. `otool -L` must not contain `/opt/homebrew` or `/usr/local` on shipped macOS ffmpeg). Prefer failing prepare over shipping a “works on CI” binary.

### E — Product race / incomplete cancel (not deploy infra, but shipped with releases)

Cancel only killed live PIDs while `buffer_unordered` kept spawning; stderr `WARNING:` looked like failure. Fixed on `main` (`ok.cancelled`, cancel flag, ERROR-only fail). Treat as a reminder: **concurrency + cancel** need integration thinking, not only unit tests on helpers.

---

## What we can generalize vs invent

| Need | Status | Action |
| :--- | :---: | :--- |
| Keep Tauri path requirements satisfied on CI | **Tool exists** | Use / extend `scripts/ci-prepare-sidecar-stubs.sh` |
| Build real LGPL FFmpeg | **Tool exists** | `scripts/prepare-ffmpeg-sidecar.sh` |
| Document end-user vs source-build FFmpeg | **Docs exist** | [FFMPEG.md](FFMPEG.md) |
| Force “conf change → stub/release sync” | **Process + checklist** | See below; optional future: CI job that parses `tauri.conf.json` and asserts stub script covers listed names |
| Catch Homebrew linkage before upload | **Partial** | prepare already fails if absolute paths remain; keep that invariant |
| Full install E2E on all three release OS | **Not automated** | Optional future: post-release smoke (download DMG/NSIS, launch, diagnose). Costly; local `package:local-dmg` remains the cheap bar |
| Pre-tag “release rehearsal” workflow | **Not built** | Optional: `workflow_dispatch` that runs prepare + `tauri build` **without** publishing |

**Recommendation:** Prefer extending the stub/prepare scripts and the pre-tag checklist over new heavy CI. Add conf-vs-stub assertion only if class A recurs again.

---

## Maintainer checklist (add to every sidecar / bundle change)

Copy into the PR description when touching bundling:

- [ ] `tauri.conf.json` `externalBin` / `resources` change listed
- [ ] `scripts/ci-prepare-sidecar-stubs.sh` updated (or verified still sufficient)
- [ ] `release.yml` prepare + `test -f` / Windows resource stub still correct
- [ ] macOS: no absolute Homebrew paths in shipped `ffmpeg` / `ffprobe` (`otool -L`)
- [ ] Windows: output path ≠ extract directory in prepare
- [ ] Docs: [RELEASING.md](RELEASING.md) / [FFMPEG.md](FFMPEG.md) tables if names or platforms changed
- [ ] CI green on the commit you will tag
- [ ] Tag only after the above; watch **all** matrix jobs (do not cancel early on first green OS)

---

## Lessons (keep these)

1. **Conf is a contract with every builder.** Adding a resource for macOS users still breaks Linux CI the same day unless stubs follow.
2. **CI green ≠ release green.** Stubs prove compile; prepare + linkage prove ship.
3. **One OS green ≠ matrix green.** Cancelled Windows / Intel jobs hide the next day’s emergency patch.
4. **Portability is a feature requirement**, not a polish step — especially with Homebrew-assisted builds.
5. **Fix the class, not only the path.** The second `doesn't exist` for `libmp3lame` was predictable after yt-dlp stubs; the stub script is the generalization.
6. **Tag is a promotion, not a test plan.** Use CI + local prepare smoke before `v*`.
7. **Write the failure down** (private `notes/errors/` for hypotheses; public docs for lasting rules). Next release should start from this page + [RELEASING.md](RELEASING.md).

---

## Quick commands

```bash
# Before relying on Ubuntu-parity locally (optional)
./scripts/ci-prepare-sidecar-stubs.sh

# Real FFmpeg for this machine
./scripts/prepare-ffmpeg-sidecar.sh

# Maintainer gates (same spirit as CI)
npm run typecheck && npm run lint && npm run format:check && npm test
npm run test:rust   # or: cargo test --manifest-path src-tauri/Cargo.toml
```

Then follow [RELEASING.md](RELEASING.md) to bump versions, changelog, and tag.
