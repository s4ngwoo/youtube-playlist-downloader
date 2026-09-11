# 변경 이력 (Changelog)

영문 원문: [../CHANGELOG.md](../CHANGELOG.md)

이 프로젝트의 주요 변경 사항을 기록합니다.

형식은 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)를 따르며, 릴리즈 태그가 허용하는 범위에서 [Semantic Versioning](https://semver.org/)을 따릅니다.

## [Unreleased]

### Added

- 다운로드 구간만 세션 ETA 추정(`~M:SS`); 추출/태그 남으면 후처리 개수 표시 (가짜 `00:00` sticky ETA 제거)
- 실패 트랙이 플레이리스트 제목을 유지하고 목록 상단으로 정렬; 다운로드 태스크에 제목 전달
- 다운로드 중 헤더/상태에 받는중·대기·후처리 활동 문구
- 전체 진행 바 안정화 (다운로드 구간 0–90% 가중 · 미세 역행 무시)
- 플레이리스트 fetch 시 비공개·삭제 등 건너뛴 항목·사유 표시 (다운로드 대상 아님)

### Changed

- 트랙 제목 폴백·환경 진단 라벨이 EN/KO i18n을 따르도록 정리 (하드코딩 조각 제거)
- 전체 진행률이 스토어에 있는 선택 트랙 평균으로 계산 (밀집 `1..N` 루프 제거)
- yt-dlp stderr 전 라인을 failed로 처리하던 문제 수정 (ERROR·비정상 종료만)

### Notes

- 작업 큐: 다음 **C1→C2** (Sprint 1–2 완료) → 부가(D).
- 후순위: yt-dlp 받기/후처리 2패스 분리 (A2-pipe).

## [0.2.0] - 2026-09-11

### Added

- PR/`main`용 GitHub Actions CI (프론트 typecheck, Rust check/clippy/test)
- parser·NFC·yt-dlp 엔트리 검증 단위 테스트
- `npm run typecheck`, `npm run test:rust` 스크립트
- FFmpeg/Deno 환경 탐색 강화 (Windows 일반 설치 경로 포함)
- 다운로드 전 FFmpeg 필수 검사(설치 안내); Deno 미설치는 경고만
- 사이드카 오류에 플랫폼별 기대 yt-dlp 파일명 표시
- 푸터 **환경 진단** (`diagnose_environment`)
- 앱 설정 저장 (`settings.json`): 저장 폴더, 동시성(1–8), 오디오 포맷(m4a/mp3)
- 동시성·포맷 UI; legacy `localStorage` 저장 경로 1회 마이그레이션
- GitHub Release 매트릭스: Apple Silicon·Windows에 더해 **macOS Intel (x86_64)**
- [RELEASING.md](RELEASING.md) / [영문](../RELEASING.md) — 태그 체크리스트·yt-dlp 사이드카 고정/갱신
- 프론트 EN/KO i18n (헤더 언어 전환; `src/i18n/`); `settings.json`에 locale 저장
- Rust IPC 안정 코드(`error.*` / `ok.*`) + 프론트 매핑으로 이중 언어 에러
- 프론트 `vitest` (settings/i18n 순수 헬퍼; `npm test`); CI frontend job에 테스트 포함
- **yt-dlp 원클릭 업데이트**(푸터): GitHub latest 자산을 앱 데이터 `sidecars/` 오버라이드로 설치; 런타임이 번들보다 오버라이드 우선 (`update_ytdlp` / `ytdlp_status`)
- 환경 진단: 경고/힌트 안정 코드 + yt-dlp 소스/버전; 메타 에디터·로그 뷰어·advanced 라벨 i18n 완료
- Cursor 프로젝트 규칙 (`.cursor/rules/`) 및 로컬 검증 패키징 (`npm run package:local-dmg` → `local-packages/`)

### Changed

- `tauri-plugin-store` Cargo 의존성을 `2.4`로 정렬 (기존 `2.0.0-rc.0`)
- `package.json` / `Cargo.toml` homepage·repository URL을 이 레포로 수정
- GitHub Release 노트 템플릿에 Apple Silicon·Intel Mac·Windows x64 공식 지원 명시
- 기여 가이드에 CI 실행 방법 문서화
- FAQ: Windows FFmpeg 경로 및 환경 진단 버튼 안내
- 릴리즈 워크플로가 `YTDLP_TAG`(`latest` 또는 고정 태그)로 yt-dlp를 받도록 정리
- **Linux 공식 설치 파일은 계획하지 않음** (소스 빌드 / CLI yt-dlp); README·FAQ·RELEASING 반영
- 기여 가이드: i18n 로케일 파일·설정 필드 맵 보강
- CI clippy `-D warnings`; CONTRIBUTING 동기화
- **Apple Notarization 영구 제외**(비용); Gatekeeper 안내는 유지
- 앱 내 yt-dlp 갱신 = 앱 데이터 오버라이드(릴리즈 번들 사이드카와 별개) 문서화
- **로컬 검증 DMG** 절차 문서화: gitignore `local-packages/` + `npm run package:local-dmg` ([CONTRIBUTING.md](CONTRIBUTING.md))

### Fixed

- 앱 로거가 쓰는 `chrono`를 Cargo 직접 의존성으로 선언 (릴리즈 빌드)

### Removed

- 미사용 `src-tauri` scratch/디버그 파일 (`scratch.rs`, `test_*.rs`, `string_to_item_key.rs`, `match_keys.py`)

### Documentation

- 프로젝트 문서를 `docs/`로 정리
- 영문 `README.md`를 기본으로 설정하고 `README_KO.md` 추가
- `docs/ko/`에 한국어 문서 전체 추가

## [0.1.0] - 2025-09

Tauri v2 기반 공개 데스크톱 앱 초기 라인.

### Added

- YouTube 단일 영상·플레이리스트 오디오를 AAC `.m4a`로 다운로드
- 플레이리스트 메타데이터 조회 및 선택 다운로드
- FFmpeg / yt-dlp 파이프라인을 통한 커버아트·메타데이터 임베딩
- 병렬 다운로드 및 실패 항목 재시도
- 다운로드 히스토리(로컬 스토어)
- NFC 파일명 정규화가 적용된 모바일 호환 ZIP 내보내기
- 영구 앱 로깅 및 전용 로그 뷰어 창
- 취소/종료 시 프로세스 트리 정리
- yt-dlp JS 런타임 챌린지를 위한 Deno 감지
- macOS(Apple Silicon)·Windows용 GitHub Actions 릴리즈 워크플로

### Notes

- 정확한 태그 날짜와 에셋 이름: [GitHub Releases](https://github.com/s4ngwoo/youtube-playlist-downloader/releases)

[Unreleased]: https://github.com/s4ngwoo/youtube-playlist-downloader/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/s4ngwoo/youtube-playlist-downloader/releases/tag/v0.2.0
[0.1.0]: https://github.com/s4ngwoo/youtube-playlist-downloader/releases/tag/v0.1.0
