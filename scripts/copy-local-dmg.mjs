#!/usr/bin/env node
/**
 * Copy (or create) a macOS DMG under gitignored local-packages/
 * for manual install verification — not a GitHub Release asset.
 *
 * Prefers Tauri's bundle/dmg output; if missing, builds a simple
 * UDZO DMG from bundle/macos/*.app via hdiutil.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { arch, platform } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cargoTarget =
  process.env.CARGO_TARGET_DIR ||
  join(root, "src-tauri", "target");
const dmgDir = join(cargoTarget, "release", "bundle", "dmg");
const macosDir = join(cargoTarget, "release", "bundle", "macos");
const outDir = join(root, "local-packages");

if (platform() !== "darwin") {
  console.error("package:local-dmg is macOS-only (no DMG on this platform).");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().slice(0, 10);
const cpu = arch();
const tagged = join(outDir, `${stamp}-YoutubePlaylistDownloader-${cpu}.dmg`);

function copyTauriDmgs() {
  if (!existsSync(dmgDir)) return false;
  const dmgs = readdirSync(dmgDir).filter((f) => f.endsWith(".dmg"));
  if (dmgs.length === 0) return false;
  for (const name of dmgs) {
    const dest = dmgs.length === 1 ? tagged : join(outDir, `${stamp}-${name.replace(/ /g, "-")}`);
    copyFileSync(join(dmgDir, name), dest);
    console.log(`Copied → ${dest}`);
  }
  return true;
}

function createFromApp() {
  if (!existsSync(macosDir)) {
    console.error(`No macOS bundle at ${macosDir}`);
    return false;
  }
  const apps = readdirSync(macosDir).filter((f) => f.endsWith(".app"));
  if (apps.length === 0) {
    console.error(`No .app in ${macosDir}`);
    return false;
  }
  const appPath = join(macosDir, apps[0]);
  const stage = join(outDir, `.stage-${Date.now()}`);
  mkdirSync(stage, { recursive: true });
  const cp = spawnSync("cp", ["-R", appPath, stage], { stdio: "inherit" });
  if (cp.status !== 0) return false;
  spawnSync("ln", ["-sf", "/Applications", join(stage, "Applications")]);
  const hdi = spawnSync(
    "hdiutil",
    [
      "create",
      "-volname",
      "Youtube Playlist Downloader",
      "-srcfolder",
      stage,
      "-ov",
      "-format",
      "UDZO",
      tagged,
    ],
    { stdio: "inherit" }
  );
  spawnSync("rm", ["-rf", stage]);
  if (hdi.status !== 0) {
    console.error("hdiutil create failed");
    return false;
  }
  console.log(`Created → ${tagged}`);
  return true;
}

if (!copyTauriDmgs() && !createFromApp()) {
  console.error("Could not produce a local DMG. Run `npm run tauri build` first.");
  process.exit(1);
}
