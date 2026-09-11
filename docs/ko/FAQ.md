# 자주 묻는 질문 (FAQ)

영문 원문: [../FAQ.md](../FAQ.md)

## YouTube나 Google과 제휴되어 있나요?

아니요. 독립적인 오픈소스 프로젝트입니다. [TERMS.md](TERMS.md)를 참고하세요.

## 무료인가요?

네. 소스와(게시된 경우) 바이너리는 **GPL-3.0**으로 제공됩니다. [LICENSE](../../LICENSE)를 참고하세요. 프로젝트는 오픈소스로 계속 유지됩니다.

## 앱이 내 데이터를 수집하나요?

환경설정, 히스토리, 로그는 **기기 내부**에 보관됩니다. 개발자용 분석 계정은 없습니다. 다운로드 과정에서 YouTube에 접속하며, **yt-dlp 업데이트** 시 GitHub에도 접속할 수 있습니다. 자세한 내용: [PRIVACY.md](PRIVACY.md).

## macOS에서 “개발자를 확인할 수 없음”이라고 나와요

이 프로젝트는 Apple Notarization을 **하지 않습니다**(유료 개발자 계정 없음). **우클릭 → 열기**(또는 개인정보 보호 및 보안의 **확인 없이 열기**)를 사용하세요. 절차는 [README_KO.md](../../README_KO.md)에 있습니다.

## 다운로드가 느리거나 실패해요

1. 상단 **yt-dlp 업데이트** 버튼 사용 (앱 데이터에 최신 바이너리 오버라이드; 릴리즈 번들 사이드카는 덮어쓰지 않음)  
2. 또는 다음 앱 릴리즈를 기다림 (번들 사이드카 갱신 — 메인테이너: [RELEASING.md](RELEASING.md))  
3. **Deno**를 설치하고 `PATH`에 두기  
4. **FFmpeg** 설치 확인 (Windows: Chocolatey/Scoop/`C:\ffmpeg\bin` 또는 PATH)  
5. 하단 **환경 진단**으로 yt-dlp 소스/버전·FFmpeg/Deno 확인  
6. 앱 **로그 뷰어**에서 오류 확인  
7. 나중에 다시 시도 — YouTube 측 변경으로 일시적으로 깨질 수 있음  
8. **동시 다운로드**만 올려도 체감이 크게 안 나아질 수 있음 — [CONCURRENCY.md](CONCURRENCY.md)

## 동시 다운로드를 올려도 별로 안 빨라요

슬롯마다 받기 + FFmpeg 추출/임베드가 돌아가고, 회선·CPU를 나눠 씁니다. 가이드: [CONCURRENCY.md](CONCURRENCY.md).

## 공식 설치 파일은 어떤 플랫폼인가요?

**macOS**(Apple Silicon·Intel)와 **Windows x64**는 [GitHub Releases](https://github.com/s4ngwoo/youtube-playlist-downloader/releases/latest)에서 받을 수 있습니다. **Linux 공식 설치 파일은 계획하지 않습니다**(GUI가 필요하면 소스 빌드 · 대부분 CLI `yt-dlp`로 충분).

## DRM / 영화 / 유료 대여를 받을 수 있나요?

아니요. DRM 보호 콘텐츠는 지원하지 않습니다.

## 파일은 어디에 저장되나요?

**폴더 변경**으로 지정한 위치입니다. 경로는 앱 설정(`settings.json`)에 기억됩니다.

## 플레이리스트에서 일부 트랙만 고를 수 있나요?

네. 메타데이터를 먼저 불러온 뒤 선택 UI에서 트랙을 고르고 다운로드하면 됩니다.

## Android에서 한글 파일명이 깨져요

앱의 **모바일 호환 ZIP** 내보내기(NFC 정규화)를 사용하세요.

## 파일명에 `[영상 ID]`가 없어요

`제목.확장자`로 저장합니다 (`-o %(title)s.%(ext)s`). 같은 경로 파일이 이미 있으면 **덮어쓰지 않고 건너뜁니다** (`--no-overwrites`). 자세한 내용: [FILENAMES.md](FILENAMES.md).

## 플레이리스트에 비공개·삭제로 건너뛴 트랙이 보여요

받을 수 없는 슬롯은 사유와 함께 건너뜀으로 표시됩니다. flat dump에 제목/`availability`가 없으면 해당 id를 한 번 probe해 stderr(`Private video` → 비공개, `Video unavailable` → 삭제)로 분류합니다.

## 오디오에 자막도 같이 받나요?

기본은 아니요. 오디오 추출 시 자막 요청/임베드를 하지 않습니다. ON 토글은 후순위(수요 시)입니다.

## 소스에서 빌드하려면?

[README_KO.md — 설치 및 빌드](../../README_KO.md#설치-및-빌드)를 참고하세요.

## 버그·보안 이슈는 어디에 신고하나요?

- 버그 / 기능: [GitHub Issues](https://github.com/s4ngwoo/youtube-playlist-downloader/issues)  
- 보안: [SECURITY.md](SECURITY.md)  
- 일반 도움: [SUPPORT.md](SUPPORT.md)
