# 릴리즈 가이드

**YouTube Playlist & Audio Downloader**의 GitHub Release와 번들 **yt-dlp** 사이드카 절차입니다.

영문 원문: [../RELEASING.md](../RELEASING.md)

## 릴리즈 워크플로가 하는 일

`v*` 태그를 푸시하면 [`.github/workflows/release.yml`](../../.github/workflows/release.yml)이 실행됩니다.

| 러너 | Rust 타깃 | 사이드카 파일명 | 업스트림 자산 |
| :--- | :--- | :--- | :--- |
| `macos-latest` | `aarch64-apple-darwin` | `yt-dlp-aarch64-apple-darwin` | `yt-dlp_macos` (universal2) |
| `macos-latest` | `x86_64-apple-darwin` | `yt-dlp-x86_64-apple-darwin` | `yt-dlp_macos` (universal2) |
| `windows-latest` | 호스트 (x64) | `yt-dlp-x86_64-pc-windows-msvc.exe` | `yt-dlp.exe` |

Linux 공식 설치 파일은 **계획하지 않습니다** (소스 빌드만 · README 플랫폼 표 참고).

## 태그 전 체크리스트

1. **버전** — `src-tauri/tauri.conf.json`의 `version`을 올린다 (관련 패키지 메타도 맞추기).
2. **CHANGELOG** — `[Unreleased]` 항목을 `docs/CHANGELOG.md` · `docs/ko/CHANGELOG.md`의 새 섹션으로 옮긴다.
3. **README 플랫폼 표** — Official / 소스 빌드 행이 매트릭스와 일치하는지 확인.
4. **yt-dlp 정책** — `latest` vs 고정 태그 결정 (아래).
5. **로컬 스모크** (권장) — `npm run typecheck`, `npm run test:rust`.
6. **태그 푸시**

```bash
git tag v0.2.1
git push origin v0.2.1
```

7. **확인** — GitHub Release에 DMG(aarch64 + x64)·Windows 설치 파일이 올라갔는지, 워크플로 로그의 사이드카 다운로드 단계를 훑는다.

## yt-dlp 버전: latest vs 고정

`release.yml` 상단:

```yaml
env:
  YTDLP_TAG: latest
```

| 값 | 동작 |
| :--- | :--- |
| `latest` | `…/releases/latest/download/<asset>` (기본값). |
| 예: `2026.08.19` | `…/releases/download/2026.08.19/<asset>`. |

### 고정을 쓰는 경우

- YouTube/추출기 깨짐: **검증된** yt-dlp 릴리즈에 고정한 뒤 새 버전을 확인한다.
- 재현 가능한 빌드: 해당 앱 버전에 명시 태그를 쓴다.

### 갱신 절차

1. [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases)에서 태그 확인.
2. `YTDLP_TAG`를 그 태그로 두거나 `latest` 유지.
3. 로컬에서 `src-tauri/bin/yt-dlp-<triple>`를 교체한 뒤 메타 fetch·다운로드 1회 스모크.
4. 바이너리는 커밋하지 말고 워크플로 변경만 커밋한 뒤, 사용자 배포가 필요하면 앱 태그를 새로 딴다.

자산 ↔ 사이드카 이름 매핑은 위 표와 같다. Unix에서는 다운로드 후 `chmod +x`.

## 로컬 사이드카 (개발)

CI와 같은 파일명. README의 사이드카 안내 참고. Apple Silicon 예:

```bash
mkdir -p src-tauri/bin
curl -fsSL -o src-tauri/bin/yt-dlp-aarch64-apple-darwin \
  https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos
chmod +x src-tauri/bin/yt-dlp-aarch64-apple-darwin
```

명시적으로 벤더하지 않는 한 대용량 사이드카는 커밋하지 않는다.

## 이 체크리스트 범위 밖

- **Apple Notarization** — **영구 제외** (비용 · 유료 Apple Developer 계정 없음). Gatekeeper 첫 실행 안내는 README·릴리즈 노트에 유지. “연기”가 아님.
- **`local-packages/` DMG** — 로컬 검증용만 (gitignore). [CONTRIBUTING.md](CONTRIBUTING.md) 참고. 태그 릴리즈가 아니면 GitHub Release 자산으로 올리지 않는다.

## 앱 내 yt-dlp 갱신 vs 릴리즈 사이드카

사용자는 푸터 **yt-dlp 업데이트**로 최신 바이너리를 받을 수 있다. 이는 앱 로컬 데이터 `sidecars/` **오버라이드**이며, 릴리즈에 포함된 `externalBin` 사이드카를 덮어쓰지 않는다. 다음 GitHub Release의 번들 사이드카는 사용자 오버라이드와 별개로 고정/최신 정책에 따라 다시 패키징된다.

## 관련 문서

- [CONTRIBUTING.md](CONTRIBUTING.md) — PR 검사
- [FAQ.md](FAQ.md) — 다운로드 실패 / yt-dlp 갱신
- [CHANGELOG.md](CHANGELOG.md)
