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
