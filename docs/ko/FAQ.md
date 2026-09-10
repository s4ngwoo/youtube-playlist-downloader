# 자주 묻는 질문 (FAQ)

영문 원문: [../FAQ.md](../FAQ.md)

## YouTube나 Google과 제휴되어 있나요?

아니요. 독립적인 오픈소스 프로젝트입니다. [TERMS.md](TERMS.md)를 참고하세요.

## 무료인가요?

네. 소스와(게시된 경우) 바이너리는 **GPL-3.0**으로 제공됩니다. [LICENSE](../../LICENSE)를 참고하세요. 프로젝트는 오픈소스로 계속 유지됩니다.

## 앱이 내 데이터를 수집하나요?

환경설정, 히스토리, 로그는 **기기 내부**에 보관됩니다. 개발자용 분석 계정은 없습니다. 다운로드 과정에서 YouTube에 접속합니다. 자세한 내용: [PRIVACY.md](PRIVACY.md).

## macOS에서 “개발자를 확인할 수 없음”이라고 나와요

릴리즈 빌드가 Apple Notarization을 거치지 않았을 수 있습니다. **우클릭 → 열기**(또는 개인정보 보호 및 보안의 **확인 없이 열기**)를 사용하세요. 절차는 [README_KO.md](../../README_KO.md)에 있습니다.

## 다운로드가 느리거나 실패해요

1. `yt-dlp` 사이드카를 최신으로 업데이트  
2. **Deno**를 설치하고 `PATH`에 두기  
3. **FFmpeg** 설치 확인 (Windows: Chocolatey/Scoop/`C:\ffmpeg\bin` 또는 PATH)  
4. 하단 **환경 진단** 버튼으로 FFmpeg/Deno/사이드카 기대 파일명 확인  
5. 앱 **로그 뷰어**에서 오류 확인  
6. 나중에 다시 시도 — YouTube 측 변경으로 일시적으로 깨질 수 있음  

## DRM / 영화 / 유료 대여를 받을 수 있나요?

아니요. DRM 보호 콘텐츠는 지원하지 않습니다.

## 파일은 어디에 저장되나요?

**폴더 변경**으로 지정한 위치입니다. 경로는 로컬에 기억됩니다.

## 플레이리스트에서 일부 트랙만 고를 수 있나요?

네. 메타데이터를 먼저 불러온 뒤 선택 UI에서 트랙을 고르고 다운로드하면 됩니다.

## Android에서 한글 파일명이 깨져요

앱의 **모바일 호환 ZIP** 내보내기(NFC 정규화)를 사용하세요.

## 소스에서 빌드하려면?

[README_KO.md — 설치 및 빌드](../../README_KO.md#설치-및-빌드)를 참고하세요.

## 버그·보안 이슈는 어디에 신고하나요?

- 버그 / 기능: [GitHub Issues](https://github.com/s4ngwoo/youtube-playlist-downloader/issues)  
- 보안: [SECURITY.md](SECURITY.md)  
- 일반 도움: [SUPPORT.md](SUPPORT.md)
