# 서드파티 구성 요소

이 앱의 코드는 **GPL-3.0-or-later**입니다 ([LICENSE](../../LICENSE)).
공식 바이너리에는 아래 구성 요소가 각각 자체 라이선스로 포함되거나 연동됩니다.

영문: [../THIRD_PARTY.md](../THIRD_PARTY.md)

## yt-dlp

- **역할:** 플레이리스트/영상 메타·다운로드 엔진 (Tauri `externalBin` 사이드카; 선택적 앱 데이터 오버라이드)
- **업스트림:** [yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp)
- **라이선스:** Unlicense (퍼블릭 도메인 기부) — 업스트림 저장소 참고

## FFmpeg / ffprobe (번들, LGPL)

- **역할:** 오디오 추출·변환·썸네일/메타 임베딩 (yt-dlp `--ffmpeg-location`)
- **라이선스:** 공식 릴리즈는 **LGPL** 빌드만 사용 (`--enable-gpl` / nonfree 미사용)
- **Windows:** [BtbN/FFmpeg-Builds](https://github.com/BtbN/FFmpeg-Builds) `*-lgpl` 정적 아카이브
- **macOS (Apple Silicon 공식 빌드):** CI에서 [FFmpeg](https://ffmpeg.org/) 소스를 LGPL 호환 옵션으로 빌드 (`scripts/prepare-ffmpeg-sidecar.sh`)
- **소스·준수:** 번들 버전에 대응하는 FFmpeg 소스는 위 업스트림에서 제공; 로컬 준비 시 `ffmpeg-LGPL-LICENSE.txt`를 사이드카 옆에 둘 수 있음
- **교체:** 앱 실행 파일 옆의 별도 사이드카라 정적 링크가 아니며, 동일 인터페이스의 LGPL FFmpeg로 교체 가능

번들 사이드카가 없을 때(손상된 설치·커스텀 빌드 등)는 **시스템 FFmpeg**를 대체로 사용합니다.

**누가 뭘 설치해야 하나:** 공식 Release 설치본 사용자는 Chocolatey/Homebrew FFmpeg가 **필요 없습니다.** 소스 빌드는 `scripts/prepare-ffmpeg-sidecar.sh`를 쓰세요. [FFMPEG.md](FFMPEG.md) 참고.

## Deno (선택, 번들 안 함)

- **역할:** yt-dlp YouTube JS 챌린지용 선택 런타임 (`--js-runtimes`)
- **설치:** 사용자 시스템 (Homebrew / Chocolatey 등)
- **라이선스:** MIT — [denoland/deno](https://github.com/denoland/deno)

## 기타 Rust / JS 의존성

전이 의존성 라이선스는 `src-tauri/Cargo.lock`, `package-lock.json`을 참고하세요.
