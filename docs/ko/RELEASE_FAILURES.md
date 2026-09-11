# 릴리즈·CI 실패 패턴

사이드카/포맷 변경을 배포할 때마다 태그 릴리즈와 `main` CI가 깨졌던 이유, 원인 분류, 일반화한 수단, 아직 프로세스로 남겨야 할 것, 유지보수자 교훈.

영문 원문: [../RELEASE_FAILURES.md](../RELEASE_FAILURES.md)

관련: [RELEASING.md](RELEASING.md) · [FFMPEG.md](FFMPEG.md) · [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 한 줄 요약

“배포할 때마다 깨짐”은 대부분 **우연한 flaky**가 아니라 같은 구조적 불일치였습니다.

1. **Tauri 빌드 시점 경로** (`externalBin`, `resources`)는 `cargo check` / 번들을 돌리는 **모든** 러너에 파일이 있어야 합니다. 사용자에게 그 OS용 실파일을 안 실어도 마찬가지입니다.
2. **릴리즈**는 실사이드카를 받고/빌드하고, **CI**는 stub만 둡니다. 두 워크플로를 같이 안 고치면 **항상 어긋납니다**.
3. **로컬 macOS 성공 ≠ Ubuntu CI / Windows 릴리즈 성공** (트리플·prepare·링키지 규칙이 다름).
4. **먼저 태그하고 나중에 고치는** 방식이면 제품 버그와 워크플로 공백이 `v*` 실행 중에야 드러납니다.

---

## 사건 맵 (2026-09 전후)

| 시기 | 층 | 증상 | 원인 클래스 | 조치 |
| :--- | :--- | :--- | :--- | :--- |
| 사이드카 CI | CI | `bin/yt-dlp-<linux-triple>` 없음 | A — 빌드 시점 경로 | CI stub → 현재 [`scripts/ci-prepare-sidecar-stubs.sh`](../../scripts/ci-prepare-sidecar-stubs.sh) |
| v0.3.0 태그 | `main` CI | ESLint / Prettier / `cargo fmt` 실패 (릴리즈는 진행) | B — 태그 전 게이트 미실행 | 포맷/린트 수정; 태그 전 CI 초록 |
| tauri-action | Release | GitHub Release 메타 불완전 | C — 액션 입력 | `releaseName` 설정 |
| FFmpeg 기능 | Release macOS | configure / lame 미검출 | D — 호스트 툴체인 vs 이식성 | Homebrew + `PKG_CONFIG` / prefix |
| v0.4.0 Windows | Release | 출력 경로 덮어씀 → `ffmpeg-*.exe` 없음 | D — 스크립트 이식성 | 추출 디렉터리와 `FFMPEG_OUT` 분리 |
| v0.4.0 / 0.4.1 macOS | 설치 후 제품 | Homebrew 절대 경로 링크 | D — 빌드머신 ≠ 사용자 PC | `@executable_path/../Resources/` + `libmp3lame.0.dylib` 번들 |
| v0.4.1 → `main` CI | CI | `resources/libmp3lame.0.dylib` 없음 | A 재발 — resources 추가, CI stub 미확장 | stub + 스크립트; Windows 릴리즈는 이미 stub |

클래스 **A**가 두 번 터졌습니다 (`externalBin` → `resources`). 일회성 YAML 패치가 아니라 **절차·스크립트**로 묶어야 한다는 신호입니다.

---

## 실패 클래스 (이것을 일반화)

### A — Tauri 빌드 시점 아티팩트 존재

**규칙:** `tauri.conf.json`의 `bundle.externalBin` / `bundle.resources`에 적힌 경로는 Tauri 빌드 스크립트 실행 시 **반드시 존재**해야 합니다.

| 환경 | 있어야 할 것 |
| :--- | :--- |
| Ubuntu CI (`cargo check`) | Linux 트리플 stub + 리소스 placeholder |
| Release macOS / Windows | 실 yt-dlp + FFmpeg/ffprobe; macOS는 실 lame dylib; Windows는 안 쓰는 macOS 리소스 stub 가능 |
| 로컬 개발 | 이 머신 호스트 트리플 바이너리 |

**이미 도구로 해결:**

- CI: `./scripts/ci-prepare-sidecar-stubs.sh` (`.github/workflows/ci.yml`에서 호출)
- Release Windows: prepare가 안 만들면 빈 `libmp3lame.0.dylib` stub
- 실 FFmpeg: `./scripts/prepare-ffmpeg-sidecar.sh`

**아직 사람 체크리스트:**

`externalBin` / `resources`를 **추가·이름 변경**하면 stub 스크립트, `release.yml` smoke/stub, [FFMPEG.md](FFMPEG.md) / [RELEASING.md](RELEASING.md) 표를 **셋 다** 갱신합니다.

### B — 초록 게이트 없이 태그

**규칙:** `v*` 태그가 ESLint·Prettier·`cargo fmt`·stub 기반 `cargo check`를 **처음** 돌리는 커밋이면 안 됩니다.

**이미 해결:** PR/`main` CI에 프론트·러스트 게이트 포함.

**프로세스:** `git tag` 전에 **같은 커밋** CI 초록(또는 동일 명령 로컬) 확인. “태그 후 main 핫픽스” 금지.

### C — 릴리즈 액션 / 매트릭스 설정

**규칙:** 업로드는 tauri-action 입력과 OS 매트릭스(Apple Silicon + Intel + Windows)에 의존합니다. 입력 누락은 늦게 터지거나 불완전 릴리즈를 만듭니다.

**이미 해결(알려진 케이스):** `releaseName`; Intel Mac은 `macos-13`에서 네이티브 x86_64 FFmpeg.

**프로세스:** `release.yml` 수정 후 매트릭스·사이드카 파일명·`YTDLP_TAG`/`FFMPEG_TAG`·`test -f` 경로를 한 번 머릿속으로 리허설.

### D — “빌더에서 됨” ≠ “사용자 PC에서 됨”

**규칙:** 러너/내 Mac에서 되는 바이너리도 사용자에게 깨질 수 있습니다.

- Homebrew 절대 경로 링크 (`/opt/homebrew/...`)
- unzip/extract 중 출력 경로 덮어쓰기
- 제품은 “번들”인데 시스템 FFmpeg/Deno 가정

**이미 해결(FFmpeg 0.4.1):** lame 경로 재작성 + Windows 추출 경로 분리 + 사이드카 경로 smoke.

**프로세스:** 새 네이티브 사이드카마다 **이식성 smoke**를 prepare에 넣습니다 (예: 배포용 macOS ffmpeg의 `otool -L`에 `/opt/homebrew`·`/usr/local` 금지). 실패 시 prepare가 죽게 두고 업로드하지 않습니다.

### E — 제품 레이스 / 불완전 취소 (인프라 아님, 배포와 함께 나감)

취소가 살아 있는 PID만 죽이고 `buffer_unordered`는 계속 spawn; stderr `WARNING:`이 실패처럼 보임. `main`에서 수정 (`ok.cancelled`, 취소 플래그, ERROR만 실패). **동시성 + 취소**는 헬퍼 단위 테스트만으로 부족합니다.

---

## 일반화 vs 새로 만들 것

| 필요 | 상태 | 조치 |
| :--- | :---: | :--- |
| CI에서 Tauri 경로 요구 충족 | **도구 있음** | `scripts/ci-prepare-sidecar-stubs.sh` 사용·확장 |
| 실 LGPL FFmpeg 빌드 | **도구 있음** | `scripts/prepare-ffmpeg-sidecar.sh` |
| 사용자 vs 소스 빌드 FFmpeg 설명 | **문서 있음** | [FFMPEG.md](FFMPEG.md) |
| conf 변경 → stub/릴리즈 동기화 강제 | **프로세스 + 체크리스트** | 아래 참고. 선택: `tauri.conf.json` 파싱 후 stub 커버리지 assert CI |
| 업로드 전 Homebrew 링크 차단 | **부분** | prepare가 절대 경로 잔존 시 실패 — 유지 |
| 3개 OS 설치 E2E | **미자동화** | 선택. 비용 큼. 당장은 `package:local-dmg` |
| 게시 없는 릴리즈 리허설 워크플로 | **미구축** | 선택: `workflow_dispatch`로 prepare + `tauri build`만 |

**권장:** 무거운 새 CI보다 stub/prepare 확장과 태그 전 체크리스트를 우선. 클래스 A가 또 나오면 conf-vs-stub assert를 추가.

---

## 유지보수자 체크리스트 (번들/사이드카 변경 PR)

- [ ] `tauri.conf.json`의 `externalBin` / `resources` 변경 명시
- [ ] `scripts/ci-prepare-sidecar-stubs.sh` 갱신 또는 충분함 확인
- [ ] `release.yml` prepare + `test -f` / Windows 리소스 stub 정상
- [ ] macOS: 배포 `ffmpeg`/`ffprobe`에 Homebrew 절대 경로 없음 (`otool -L`)
- [ ] Windows: prepare에서 출력 경로 ≠ 추출 디렉터리
- [ ] 문서: 이름/플랫폼 바뀌면 [RELEASING.md](RELEASING.md) / [FFMPEG.md](FFMPEG.md)
- [ ] 태그할 커밋의 CI 초록
- [ ] 태그 후 매트릭스 **전 OS** 확인 (한 OS 초록만 보고 조기 취소 금지)

---

## 교훈

1. **conf는 모든 빌더와의 계약이다.** macOS 사용자용 리소스도 그날 Linux CI를 깨뜨릴 수 있다.
2. **CI 초록 ≠ 릴리즈 초록.** stub는 컴파일만, prepare+링키지가 출하를 증명한다.
3. **한 OS 초록 ≠ 매트릭스 초록.** Windows/Intel를 취소하면 다음 날 핫픽스가 된다.
4. **이식성은 폴리시가 아니라 기능 요구사항**이다 (특히 Homebrew 보조 빌드).
5. **경로 하나가 아니라 클래스 A를 고친다.** `libmp3lame` 두 번째 실패는 yt-dlp stub 이후 예견 가능했고, stub 스크립트가 그 일반화다.
6. **태그는 승격이지 테스트 계획이 아니다.** `v*` 전에 CI + 로컬 prepare smoke.
7. **실패를 남긴다** (가설은 비공개 `notes/errors/`, 남는 규칙은 이 문서 + [RELEASING.md](RELEASING.md)).

---

## 빠른 명령

```bash
./scripts/ci-prepare-sidecar-stubs.sh
./scripts/prepare-ffmpeg-sidecar.sh

npm run typecheck && npm run lint && npm run format:check && npm test
npm run test:rust
```

이후 버전 범프·CHANGELOG·태그는 [RELEASING.md](RELEASING.md)를 따릅니다.
