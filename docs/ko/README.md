# 문서

**YouTube Playlist & Audio Downloader** 공개 문서입니다 (GPL-3.0).

영문 허브: [../README.md](../README.md)

역할별로 고르세요. 파일 전체를 나열해 두지 않습니다.

---

## 사용자

| 문서 | 용도 |
| :--- | :--- |
| [FAQ.md](FAQ.md) | 자주 묻는 질문 · 도움 받기 |
| [APP.md](APP.md) | 동시 다운로드 · 저장 파일명 |
| [FFMPEG.md](FFMPEG.md) | 번들 vs 시스템 FFmpeg |
| [CHANGELOG.md](CHANGELOG.md) | 변경 이력 |

제품 진입: [../../README_KO.md](../../README_KO.md)

## 기여자

| 문서 | 용도 |
| :--- | :--- |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 개발 환경 · 검사 · 로컬 DMG |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | 행동 강령 |

## 유지보수자

| 문서 | 용도 |
| :--- | :--- |
| [RELEASING.md](RELEASING.md) | 태그 · 사이드카 핀 · **CI/릴리즈 실패 패턴** |
| [THIRD_PARTY.md](THIRD_PARTY.md) | yt-dlp + LGPL FFmpeg 고지 |
| [FFMPEG.md](FFMPEG.md) | prepare · 핀 · 탐색 순서 |

## 법률·정책

| 문서 | 용도 |
| :--- | :--- |
| [PRIVACY.md](PRIVACY.md) | 개인정보 |
| [TERMS.md](TERMS.md) | 이용 약관 |
| [SECURITY.md](SECURITY.md) | 취약점 신고 |

---

## 구조

```
docs/ko/     ← 이 트리 (영문과 동일 basename)
docs/        ← 영문 원문
```

비공개 작업 노트는 gitignore된 `notes/`에만 둡니다.

## 라이선스

앱: [../../LICENSE](../../LICENSE) (GPL-3.0). 번들 FFmpeg: LGPL — [THIRD_PARTY.md](THIRD_PARTY.md).
