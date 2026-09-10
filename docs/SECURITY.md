# Security Policy

## Supported versions

Security fixes are applied on a best-effort basis to the latest `main` branch and the most recent GitHub Release.

| Version | Supported |
| :--- | :---: |
| Latest release | Yes |
| Older releases | Best effort |
| Development (`main`) | Yes |

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security-sensitive reports.

Instead, email: **[s4ngwoo.lee@gmail.com](mailto:s4ngwoo.lee@gmail.com)**

Include if possible:

- Description of the issue and potential impact
- Steps to reproduce or a proof of concept
- Affected version / commit / OS
- Suggested fix (optional)

You should receive an acknowledgment when practical. Coordinated disclosure is preferred.

## Scope notes

This App runs local commands and talks to the network for YouTube downloads. Reports involving:

- Path traversal or unexpected file writes outside chosen directories
- Command injection via untrusted input
- Unsafe handling of URLs or sidecar arguments

…are especially appreciated.

Out of scope examples: vulnerabilities solely in upstream `yt-dlp` / `ffmpeg` / `Deno` (report those upstream), or issues that require already-compromised local machines without an App-specific vector.

## Prefer private disclosure

Public discussion of unpatched issues can put users at risk. Thank you for helping keep the project safe.
