/**
 * After `next build`, strip bloat from the build output so it stays under
 * deploy-platform size limits (e.g. AWS Amplify's ~220 MB cap).
 *
 * What gets pruned:
 *  1. Source-map files (.map) everywhere inside `.next`               [always]
 *  2. `.next/cache` directory                                         [Amplify only]
 *  3. `.nft.json` trace files in `.next/server` (~5 MB)               [Amplify only]
 *  4. Non-essential files in `public/assets/iconfonts/` (~19 MB)      [always]
 *
 * Vercel deployments depend on `.nft.json`. Vercel's serverless-function
 * packer reads them to determine which Turbopack / webpack chunks to ship
 * with each route. Deleting them strands chunks like
 * `[root-of-the-server]__<hash>.js` outside the function bundle → runtime
 * MODULE_NOT_FOUND on dynamic routes. We gate the `.nft.json` and
 * `.next/cache` deletes by deploy-platform env vars.
 */
const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const nextDir = path.join(rootDir, ".next");
const iconfontsDir = path.join(rootDir, "public", "assets", "iconfonts");

const ON_VERCEL  = !!(process.env.VERCEL || process.env.VERCEL_ENV);
const ON_AMPLIFY = !!(process.env.AWS_APP_ID || process.env.AWS_BRANCH);
const PLATFORM   = ON_VERCEL ? "vercel" : ON_AMPLIFY ? "amplify" : "local";

/* ── helpers ─────────────────────────────────────────────────────────── */

function walk(dir, onFile) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, onFile);
    else onFile(p);
  }
}

function tryUnlink(p) {
  try {
    const st = fs.statSync(p);
    fs.unlinkSync(p);
    return st.size;
  } catch {
    return 0;
  }
}

function rmEmptyDirs(dir) {
  try {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.isDirectory()) rmEmptyDirs(path.join(dir, ent.name));
    }
    if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  } catch { /* ignore */ }
}

/* ── main ────────────────────────────────────────────────────────────── */

function main() {
  const stats = { maps: 0, mapBytes: 0, nft: 0, nftBytes: 0, icons: 0, iconBytes: 0 };

  /* 1. Remove .map files from .next ──────────────────────────────────── */
  if (fs.existsSync(nextDir)) {
    walk(nextDir, (p) => {
      if (!p.endsWith(".map")) return;
      stats.mapBytes += tryUnlink(p);
      stats.maps++;
    });
  } else {
    console.warn("prune-next-build: .next missing, skipping");
    process.exit(0);
  }

  /* 2. Clear .next/cache ─────────────────────────────────────────────── */
  // Amplify only — on Vercel the cache is uploaded to the build cache
  // store for next deploy, and locally we keep it for incremental dev.
  const cacheDir = path.join(nextDir, "cache");
  if (ON_AMPLIFY && !ON_VERCEL && fs.existsSync(cacheDir)) {
    try { fs.rmSync(cacheDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }

  /* 3. Remove .nft.json trace files from .next/server ────────────────── */
  // Amplify only — Vercel REQUIRES these to pack serverless functions.
  // Removing them on Vercel strands Turbopack / webpack chunks outside
  // the function bundle and produces runtime MODULE_NOT_FOUND on dynamic
  // routes (e.g. `[root-of-the-server]__<hash>.js`).
  const serverDir = path.join(nextDir, "server");
  if (ON_AMPLIFY && !ON_VERCEL && fs.existsSync(serverDir)) {
    walk(serverDir, (p) => {
      if (!p.endsWith(".nft.json")) return;
      stats.nftBytes += tryUnlink(p);
      stats.nft++;
    });
  }

  /* 4. Strip non-essential files from public/assets/iconfonts ────────── */
  //    Keep ONLY the extensions the browser needs to render icons.
  const KEEP_EXTS = new Set([".css", ".woff2", ".woff", ".ttf", ".eot"]);

  const pruneIcons = (dir) => {
    if (fs.existsSync(dir)) {
      walk(dir, (p) => {
        const ext = path.extname(p).toLowerCase();
        if (KEEP_EXTS.has(ext)) return; // essential — keep it
        stats.iconBytes += tryUnlink(p);
        stats.icons++;
      });
      // Clean up any now-empty directories
      rmEmptyDirs(dir);
    }
  };

  pruneIcons(iconfontsDir);

  /* 5. Strip non-essential files from out/assets/iconfonts ───────────── */
  const outIconfontsDir = path.join(rootDir, "out", "assets", "iconfonts");
  pruneIcons(outIconfontsDir);

  /* ── summary ───────────────────────────────────────────────────────── */
  const mb = (b) => (b / 1024 / 1024).toFixed(1);
  console.log(
    [
      `prune-next-build summary (platform=${PLATFORM}):`,
      `  .map files removed   : ${stats.maps} (~${mb(stats.mapBytes)} MB)`,
      `  .nft.json removed    : ${stats.nft} (~${mb(stats.nftBytes)} MB)` +
        (ON_VERCEL ? "  [skipped — required by Vercel]" : ""),
      `  iconfont junk removed: ${stats.icons} (~${mb(stats.iconBytes)} MB)`,
      `  .next/cache          : ${ON_AMPLIFY && !ON_VERCEL ? "cleared" : "kept"}`,
      `  total savings        : ~${mb(stats.mapBytes + stats.nftBytes + stats.iconBytes)} MB`,
    ].join("\n")
  );
}

main();
