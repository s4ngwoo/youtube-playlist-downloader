# Concurrent downloads — user guide

This app can run **1–8** track pipelines at once (**default: 3**). Raising the number does **not** always make a playlist finish proportionally faster.

## What “Concurrency” means

Each concurrent slot runs a full **yt-dlp** job for one track:

1. Download media from YouTube  
2. Extract/convert audio (FFmpeg)  
3. Embed thumbnail and metadata  

So the setting controls how many of those **complete jobs** may run together—not a pure “download accelerator.”

## Why 3 may feel similar to 1

- **Your internet link is shared.** Three streams often split the same bandwidth instead of tripling it.  
- **YouTube may pace** multiple connections from the same network.  
- **After the file arrives**, audio extract and artwork/metadata still use **CPU and disk**. Several FFmpeg jobs at once can queue on the same machine.  
- **One slow or failing track** still affects how “done” the session feels.

Concurrency helps most when you have **spare bandwidth and spare CPU**, and many tracks where download time dominates. It helps least when the link or CPU is already busy.

## Practical recommendations

| Situation | Suggested range |
| :--- | :--- |
| Default / most users | **2–3** (default **3** is fine) |
| Slow Wi‑Fi or metered / unstable link | **1–2** (more stable, fewer 403/timeouts) |
| Fast wired + strong CPU, large playlist | **3–5** — try higher only if the machine stays responsive |
| Very high (6–8) | Use only if you know CPU/disk stay cool; can increase failures or fan noise |

**Tip:** Prefer fixing **yt-dlp / FFmpeg / Deno** (header **Update yt-dlp**, footer **Environment diagnose**) over cranking concurrency when downloads are slow or failing.

## Related

- FAQ: [FAQ.md](FAQ.md)  
- Filenames: [FILENAMES.md](FILENAMES.md)  
- Korean: [ko/CONCURRENCY.md](ko/CONCURRENCY.md)
