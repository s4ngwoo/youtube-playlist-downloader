# FFmpeg (번들 LGPL 사이드카)

이 앱이 **FFmpeg / ffprobe**를 어떻게 넣고 찾는지 정리합니다.

영문: [../FFMPEG.md](../FFMPEG.md)

관련: [RELEASING.md](RELEASING.md) · [THIRD_PARTY.md](THIRD_PARTY.md) · [FAQ.md](FAQ.md)

## 한눈에

| 대상 | Chocolatey / Homebrew로 FFmpeg를 깔아야 하나? |
| :--- | :--- |
| **일반 사용자** — [GitHub Releases](https://github.com/s4ngwoo/youtube-playlist-downloader/releases)의 Apple Silicon macOS `.dmg` / Windows `.exe`·`.msi` | **아니요.** 공식 설치본에 LGPL `ffmpeg` + `ffprobe`가 이미 포함됩니다. |
| **소스 빌드**하는 사람 | git에 바이너리가 안 들어 있습니다. `./scripts/prepare-ffmpeg-sidecar.sh` 실행 **또는** 시스템 FFmpeg를 대체로 사용. |
| **Intel Mac** · **Linux** 일반 사용자 | 공식 설치 파일 없음. 소스 빌드(또는 CLI `yt-dlp`만 사용). |

Windows에 FFmpeg를 “시스템 전역 설치”해 주는 방식이 **아닙니다.** 앱 패키지 안 **사이드카**로 들어갑니다.

공식 릴리즈 매트릭스: **Apple Silicon Mac + Windows x64**만.

## 런타임에서 찾는 순서

1. **번들** 사이드카 (앱 실행 파일 옆, 개발 시 `src-tauri/bin/ffmpeg-<triple>`)
2. 없으면 → **시스템** FFmpeg (`PATH` / 흔한 설치 경로)

푸터 **환경 진단**에 경로와 소스(`bundled` / `system`)가 표시됩니다.

시스템에 다른 버전(Chocolatey 등)이 있어도 **덮어쓰지 않으며**, 번들이 있으면 **보통 번들을 씁니다.**

## 릴리즈 Action이 넣는 것

`v*` 태그 시 [`.github/workflows/release.yml`](../../.github/workflows/release.yml)이 `scripts/prepare-ffmpeg-sidecar.sh`를 돌린 뒤 앱을 빌드합니다.

| 플랫폼 | FFmpeg 확보 방법 | “최신”인가? |
| :--- | :--- | :--- |
| **Windows x64** | BtbN **LGPL** zip (기본 `ffmpeg-master-latest-win64-lgpl.zip`) | BtbN의 floating **latest** LGPL (원하면 `FFMPEG_WIN_URL`로 핀) |
| **macOS** (공식: Apple Silicon) | FFmpeg git 태그 `FFMPEG_TAG`(기본 `n7.1.1`)를 LGPL 옵션으로 빌드 | 워크플로에 **핀** — master 최신과 다를 수 있음 |
| **Intel Mac** / **Linux** | 공식 릴리즈 매트릭스에 없음 | — |

yt-dlp는 별도(`YTDLP_TAG`, 기본 `latest`). **인앱 FFmpeg 업데이트는 없습니다**(yt-dlp 헤더 업데이트와 다름). FFmpeg 핀을 고치려면 **앱을 새로 릴리즈**해야 합니다.

## 버전 차이 (나중에 문제 될 수 있음)

드물지만 가능한 예:

- Windows latest LGPL vs macOS 핀 태그의 미묘한 차이
- 오래된 핀 + 새 yt-dlp 후처리 기대 불일치
- BtbN `latest`가 깨진 날의 Windows 빌드

대응: `release.yml` 등에서 알려진 좋은 버전으로 핀 → 스모크 → 재태그. [RELEASING.md](RELEASING.md) 참고.

## 소스 / 로컬 개발

```bash
./scripts/prepare-ffmpeg-sidecar.sh   # 또는: npm run prepare:ffmpeg
```

- **Windows:** LGPL zip 다운로드 (이 스크립트는 Chocolatey 불필요). BtbN `*-lgpl` 정적 빌드.
- **macOS:** `--disable-autodetect` 후 `install_name_tool`로 `libmp3lame`를 `Contents/Resources/`에서 로드(런타임 Homebrew 불필요). `/opt/homebrew`·`/usr/local` 절대 경로가 남으면 prepare 실패.
- yt-dlp 사이드카는 별도 배치 (README)

`src-tauri/bin/`의 큰 바이너리는 커밋하지 않습니다(placeholder·라이선스 텍스트 제외).

## 라이선스

앱 코드: **GPL-3.0-or-later**. 번들 FFmpeg: **LGPL**만. 자세한 내용: [THIRD_PARTY.md](THIRD_PARTY.md), 루트 [NOTICE](../../NOTICE).
