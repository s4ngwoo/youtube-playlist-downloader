# 릴리즈

**YouTube Playlist & Audio Downloader** GitHub Releases 절차, 번들 **yt-dlp** / **LGPL FFmpeg** 사이드카 정책, CI·릴리즈 실패 패턴입니다.

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

새 방식으로 CI/릴리즈가 깨지면 아래 **[실패 패턴 · 교훈](#실패-패턴--교훈)** 과 필요 시 `notes/errors/` 를 갱신합니다.

## 사이드카·번들 변경 시 (클래스 A CI 재발 방지)

`tauri.conf.json`의 `externalBin` / `resources`를 바꾸면 Ubuntu CI의 `cargo check`도 영향받습니다(사용자에게 Linux 설치본을 안 줘도 동일). 머지 전:

1. [`scripts/ci-prepare-sidecar-stubs.sh`](../../scripts/ci-prepare-sidecar-stubs.sh) 확장·검증
2. `release.yml` prepare / `test -f` / Windows 리소스 stub 정렬
3. [유지보수자 체크리스트](#유지보수자-체크리스트-번들사이드카-변경-pr) 재확인

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

- [CONTRIBUTING.md](CONTRIBUTING.md) · [FAQ.md](FAQ.md) · [FFMPEG.md](FFMPEG.md) · [THIRD_PARTY.md](THIRD_PARTY.md) · [CHANGELOG.md](CHANGELOG.md)
- 문서 허브: [README.md](README.md)

---

## 실패 패턴 · 교훈

사이드카/포맷 변경을 배포할 때마다 태그 릴리즈와 `main` CI가 깨졌던 이유, 원인 분류, 일반화한 수단, 교훈입니다.

영문: [../RELEASING.md](../RELEASING.md#failure-patterns--lessons)

### 한 줄 요약

“배포할 때마다 깨짐”은 대부분 **우연한 flaky**가 아니라 같은 구조적 불일치였습니다.

1. **Tauri 빌드 시점 경로** (`externalBin`, `resources`)는 `cargo check` / 번들을 돌리는 **모든** 러너에 파일이 있어야 합니다.
2. **릴리즈**는 실사이드카를 받고/빌드하고, **CI**는 stub만 둡니다. 두 워크플로를 같이 안 고치면 어긋납니다.
3. **로컬 macOS 성공 ≠ Ubuntu CI / Windows 릴리즈 성공**
4. **먼저 태그하고 나중에 고치는** 방식이면 공백이 `v*` 실행 중에야 드러납니다.

### 사건 맵 (2026-09 전후)

| 시기 | 층 | 증상 | 원인 클래스 | 조치 |
| :--- | :--- | :--- | :--- | :--- |
| 사이드카 CI | CI | `bin/yt-dlp-<linux-triple>` 없음 | A — 빌드 시점 경로 | CI stub → [`scripts/ci-prepare-sidecar-stubs.sh`](../../scripts/ci-prepare-sidecar-stubs.sh) |
| v0.3.0 태그 | `main` CI | ESLint / Prettier / `cargo fmt` 실패 | B — 태그 전 게이트 미실행 | 포맷/린트 수정; 태그 전 CI 초록 |
| tauri-action | Release | GitHub Release 메타 불완전 | C — 액션 입력 | `releaseName` 설정 |
| FFmpeg 기능 | Release macOS | configure / lame 미검출 | D — 호스트 툴체인 vs 이식성 | Homebrew + `PKG_CONFIG` / prefix |
| v0.4.0 Windows | Release | 출력 경로 덮어씀 → `ffmpeg-*.exe` 없음 | D — 스크립트 이식성 | 추출 디렉터리와 `FFMPEG_OUT` 분리 |
| v0.4.0 / 0.4.1 macOS | 설치 후 제품 | Homebrew 절대 경로 링크 | D — 빌드머신 ≠ 사용자 PC | `@executable_path/../Resources/` + `libmp3lame.0.dylib` 번들 |
| v0.4.1 → `main` CI | CI | `resources/libmp3lame.0.dylib` 없음 | A 재발 | stub + 스크립트 |

클래스 **A**가 두 번 터졌습니다. 일회성 YAML 패치가 아니라 **절차·스크립트**로 묶어야 합니다.

### 실패 클래스

#### A — Tauri 빌드 시점 아티팩트 존재

`tauri.conf.json`의 `externalBin` / `resources`는 빌드 스크립트 실행 시 **반드시 존재**해야 합니다. CI stub·릴리즈 prepare·로컬 호스트 트리플을 구분하세요. 추가·이름 변경 시 stub 스크립트 + `release.yml` + [FFMPEG.md](FFMPEG.md)를 함께 갱신합니다.

#### B — 초록 게이트 없이 태그

`v*` 전에 같은 커밋의 CI(또는 동일 로컬 게이트)를 확인합니다.

#### C — 릴리즈 액션 / 매트릭스

`releaseName`, OS 매트릭스, 사이드카 파일명, `YTDLP_TAG`/`FFMPEG_TAG`를 `release.yml` 수정 후 리허설합니다.

#### D — 빌더 ≠ 사용자

Homebrew 절대 경로 금지, Windows 추출 경로 ≠ 출력 경로, “번들” claim과 시스템 의존을 혼동하지 않습니다.

#### E — 취소·동시성

대기열 spawn 중단 + stderr WARNING ≠ 실패. 동시성+취소는 통합적으로 생각합니다.

### 유지보수자 체크리스트 (번들/사이드카 변경 PR)

- [ ] `tauri.conf.json`의 `externalBin` / `resources` 변경 명시
- [ ] `scripts/ci-prepare-sidecar-stubs.sh` 갱신 또는 충분함 확인
- [ ] `release.yml` prepare + `test -f` / Windows 리소스 stub 정상
- [ ] macOS: 배포 `ffmpeg`/`ffprobe`에 Homebrew 절대 경로 없음 (`otool -L`)
- [ ] Windows: prepare에서 출력 경로 ≠ 추출 디렉터리
- [ ] 문서: 이름/플랫폼 바뀌면 이 문서 / [FFMPEG.md](FFMPEG.md)
- [ ] 태그할 커밋의 CI 초록
- [ ] 태그 후 매트릭스 **전 OS** 확인

### 교훈

1. conf는 모든 빌더와의 계약이다.
2. CI 초록 ≠ 릴리즈 초록.
3. 한 OS 초록 ≠ 매트릭스 초록.
4. 이식성은 기능 요구사항이다.
5. 경로 하나가 아니라 클래스 A를 고친다.
6. 태그는 승격이지 테스트 계획이 아니다.
7. 가설은 `notes/errors/`, 남는 규칙은 이 문서에 둔다.

### 빠른 명령

```bash
./scripts/ci-prepare-sidecar-stubs.sh
./scripts/prepare-ffmpeg-sidecar.sh
npm run typecheck && npm run lint && npm run format:check && npm test
npm run test:rust
```
