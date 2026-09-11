# 릴리즈

**YouTube Playlist & Audio Downloader** GitHub Releases 절차와 번들 **yt-dlp** / **LGPL FFmpeg** 사이드카 정책입니다.

영문: [../RELEASING.md](../RELEASING.md)

## 워크플로가 하는 일

`v*` 태그를 푸시하면 [`.github/workflows/release.yml`](../../.github/workflows/release.yml)이 실행됩니다.

| Runner | Rust target | yt-dlp 사이드카 | FFmpeg triple | FFmpeg 출처 |
| :--- | :--- | :--- | :--- | :--- |
| `macos-latest` | `aarch64-apple-darwin` | `yt-dlp_macos` → `yt-dlp-aarch64-apple-darwin` | `aarch64-apple-darwin` | LGPL 소스 빌드 (`FFMPEG_TAG`) |
| `macos-13` | `x86_64-apple-darwin` | `yt-dlp_macos` → `yt-dlp-x86_64-apple-darwin` | `x86_64-apple-darwin` | LGPL 소스 빌드 (Intel 네이티브) |
| `windows-latest` | host (x64) | `yt-dlp.exe` → `…-windows-msvc.exe` | `x86_64-pc-windows-msvc` | BtbN `win64-lgpl` zip |

Linux 공식 설치 파일은 **계획 없음**. 서드파티 고지: [THIRD_PARTY.md](THIRD_PARTY.md).

**일반 사용자 vs 소스 빌드**(공식 설치본은 Chocolatey 불필요, git clone은 `prepare-ffmpeg-sidecar.sh` 필요): **[FFMPEG.md](FFMPEG.md)** 참고.

## 태그 전 체크리스트

1. **버전** — `package.json` · `src-tauri/Cargo.toml` · `src-tauri/tauri.conf.json` 함께 올리기  
2. **CHANGELOG** — `[Unreleased]` → 새 섹션 (`docs/CHANGELOG.md` + `docs/ko/CHANGELOG.md`)  
3. **README 플랫폼 표** — 매트릭스와 일치하는지 확인  
4. **yt-dlp / FFmpeg 핀** — `YTDLP_TAG` / `FFMPEG_TAG`  
5. **로컬 스모크** (권장) — `npm run typecheck` · `npm test` · `npm run test:rust`  
6. 태그 푸시 후 릴리즈 자산·워크플로 로그(yt-dlp **및** FFmpeg 준비 단계) 확인. 매트릭스 **전 OS**가 끝날 때까지 기다릴 것(한 OS 초록 ≠ 완료).  

새 방식으로 CI/릴리즈가 깨지면 **[RELEASE_FAILURES.md](RELEASE_FAILURES.md)** 와 필요 시 `notes/errors/` 를 갱신합니다.

## 사이드카·번들 변경 시 (클래스 A CI 재발 방지)

`tauri.conf.json`의 `externalBin` / `resources`를 바꾸면 Ubuntu CI의 `cargo check`도 영향받습니다(사용자에게 Linux 설치본을 안 줘도 동일). 머지 전:

1. [`scripts/ci-prepare-sidecar-stubs.sh`](../../scripts/ci-prepare-sidecar-stubs.sh) 확장·검증  
2. `release.yml` prepare / `test -f` / Windows 리소스 stub 정렬  
3. [RELEASE_FAILURES.md](RELEASE_FAILURES.md) 체크리스트 재확인  

## 핀 정책

```yaml
env:
  YTDLP_TAG: latest
  FFMPEG_TAG: n7.1.1
```

로컬 준비: `./scripts/prepare-ffmpeg-sidecar.sh`  
자세한 표·갱신 절차·버전 핀/드리프트는 영문 [RELEASING.md](../RELEASING.md) 및 [FFMPEG.md](FFMPEG.md)와 동일합니다.

## 인앱 yt-dlp 업데이트 vs 릴리즈 사이드카

헤더 **yt-dlp 업데이트**는 앱 데이터 `sidecars/` 오버라이드만 쓰며 릴리즈 번들을 덮어쓰지 않습니다.  
FFmpeg는 릴리즈 번들만 제공(인앱 FFmpeg 업데이트 없음).

## 관련

- [RELEASE_FAILURES.md](RELEASE_FAILURES.md) — CI/릴리즈 반복 실패 원인·체크리스트
- [CONTRIBUTING.md](CONTRIBUTING.md) · [FAQ.md](FAQ.md) · [FFMPEG.md](FFMPEG.md) · [THIRD_PARTY.md](THIRD_PARTY.md) · [CHANGELOG.md](CHANGELOG.md)
