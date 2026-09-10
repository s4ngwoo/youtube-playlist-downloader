# 변경 이력 (Changelog)

영문 원문: [../CHANGELOG.md](../CHANGELOG.md)

이 프로젝트의 주요 변경 사항을 기록합니다.

형식은 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)를 따르며, 릴리즈 태그가 허용하는 범위에서 [Semantic Versioning](https://semver.org/)을 따릅니다.

## [Unreleased]

### Changed

- `tauri-plugin-store` Cargo 의존성을 `2.4`로 정렬 (기존 `2.0.0-rc.0`)
- `package.json` / `Cargo.toml` homepage·repository URL을 이 레포로 수정
- GitHub Release 노트 템플릿에 Windows x64를 macOS Apple Silicon과 함께 공식 지원으로 명시

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

[Unreleased]: https://github.com/s4ngwoo/youtube-playlist-downloader/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/s4ngwoo/youtube-playlist-downloader/releases/tag/v0.1.0
