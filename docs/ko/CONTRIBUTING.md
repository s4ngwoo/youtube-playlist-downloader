# 기여 가이드

**YouTube Playlist & Audio Downloader**에 관심을 가져 주셔서 감사합니다. 이 프로젝트는 **오픈소스(GPL-3.0)** 로 계속 유지됩니다.

영문 원문: [../CONTRIBUTING.md](../CONTRIBUTING.md)

## 시작하기 전에

1. [README](../../README_KO.md), [이용 약관](TERMS.md), [행동 강령](CODE_OF_CONDUCT.md)을 읽어 주세요.
2. [기존 이슈](https://github.com/s4ngwoo/youtube-playlist-downloader/issues)·PR을 검색해 중복을 피하세요.
3. 보안 이슈는 공개 이슈 대신 [SECURITY.md](SECURITY.md)를 따르세요.

## 개발 환경

[README_KO.md](../../README_KO.md)의 **사전 요구사항** 및 **설치 및 빌드**를 참고하세요.

일반적인 흐름:

```bash
npm install
# src-tauri/bin/ 에 yt-dlp 사이드카 배치
npm run tauri dev
```

clone 후 한 번, 추적 중인 Git 훅을 켜 두세요. Cursor의 `Co-authored-by` trailer가 커밋 메시지에서 제거됩니다:

```bash
git config core.hooksPath .githooks
```

## PR 전 검사

CI (`.github/workflows/ci.yml`)가 PR 및 `main` 푸시마다 실행됩니다.

```bash
# Frontend
npm ci
npm run typecheck
npm run lint
npm run format:check
npm test

# Rust
npm run test:rust
# 또는:
cd src-tauri && cargo fmt --check && cargo check && cargo clippy --all-targets -- -D warnings && cargo test
```

Clippy는 모든 경고를 에러로 취급합니다 (`-D warnings`). 프론트 포맷은 `npm run format`, Rust는 `src-tauri/`에서 `cargo fmt`.

### 로컬 macOS 검증 패키지 (메인테이너 / AI)

**기능처럼 수동 설치 확인이 필요한 변경**이면, 단위 테스트만으로 끝내지 말고 gitignore된 **`local-packages/`** 에 DMG를 둡니다(커밋·GitHub Release 자산 아님).

```bash
# 이 머신용 yt-dlp 사이드카가 src-tauri/bin/ 에 있어야 함
npm run package:local-dmg
# → local-packages/<날짜>-YoutubePlaylistDownloader-<arch>.dmg
# (Tauri DMG가 있으면 복사, 없으면 .app에서 hdiutil UDZO 생성)
```

또는:

```bash
npm run tauri build
mkdir -p local-packages
cp src-tauri/target/release/bundle/dmg/*.dmg \
  "local-packages/$(date +%Y-%m-%d)-YoutubePlaylistDownloader-$(uname -m).dmg"
```

공식 태그 릴리즈와의 차이는 [RELEASING.md](RELEASING.md) 참고.

### 어디에 무엇이 있는지

| 영역 | 경로 |
| :--- | :--- |
| 프론트엔드 | `src/` (React + Zustand) |
| Rust / Tauri | `src-tauri/` |
| UI 문자열 (EN/KO) | `src/i18n/locales/` — 키를 **ko.ts와 en.ts 모두**에 추가 |
| 설정 | plugin-store `settings.json` (`locale`, 동시성, 포맷, 폴더) |
| 사이드카 | `src-tauri/bin/yt-dlp-<target-triple>` (README 참고) |
| 에이전트 규칙 | `.cursor/rules/*.mdc` (Cursor용 프로젝트 컨벤션) |

검사는 **레포 루트**에서 실행하세요. CI는 위 명령을 Ubuntu에서 그대로 돌립니다(Rust는 사이드카 stub — `.github/workflows/ci.yml`).

## 릴리즈

메인테이너: 태그(`v*`) 워크플로·플랫폼 매트릭스·번들 yt-dlp 고정/갱신은 **[RELEASING.md](RELEASING.md)** 를 참고하세요.

## 프로젝트 규칙

- **프론트엔드:** React 19 + TypeScript + Tailwind CSS v4 + Zustand (`src/`)
- **백엔드:** Rust / Tauri v2 (`src-tauri/`) — IPC 커맨드와 서비스를 모듈 단위로 유지
- 큰 혼합 리팩터보다 작고 목적 명확한 PR을 선호합니다
- 기존 네이밍·포맷·에러 처리 스타일을 맞추세요
- 시크릿, 개인 다운로드 경로, README에 명시된 사이드카 워크플로에 필요하지 않은 대용량 바이너리는 커밋하지 마세요

## Pull Request

1. `main`에서 브랜치를 만들어 작업합니다
2. 목적이 분명한 변경을 합니다
3. 사용 OS에서 수동 테스트합니다(다운로드, 취소, 메타데이터 조회 등 관련 흐름)
4. PR에 다음을 적어 주세요.
   - 무엇을·왜 바꿨는지
   - 어떻게 테스트했는지
   - UI 변경 시 스크린샷(권장)

## 이슈 제보

OS, 앱 버전, 재현 절차, 기대/실제 결과, 앱 로그 뷰어의 관련 발췌(필요 시 개인 경로·URL 마스킹)를 포함하면 도움이 됩니다.

## 라이선스

기여함으로써, 기여분이 프로젝트의 **GPL-3.0** 라이선스([LICENSE](../../LICENSE))에 따라 라이선스되는 것에 동의합니다.
