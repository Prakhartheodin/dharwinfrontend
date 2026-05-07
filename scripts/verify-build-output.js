/**
 * Post-build self-validation. Walk every `.nft.json` Next.js writes into
 * `.next/server` and assert that every file path it references actually
 * exists on disk. If anything is missing — typically because a postbuild
 * script over-pruned, or because Turbopack chose a chunk Vercel's packer
 * doesn't know about — fail the build with a clear diagnostic so the
 * deploy never reaches production.
 *
 * Sole caller: `npm run postbuild` (after `prune-next-build.js`).
 *
 * Manifest shape (JSON written by Next.js):
 *   { version: number, files: string[] }
 * `files` is an array of relative paths from the manifest's directory.
 */
const fs = require("fs");
const path = require("path");

const rootDir   = path.join(__dirname, "..");
const nextDir   = path.join(rootDir, ".next");
const serverDir = path.join(nextDir, "server");

const ON_VERCEL = !!(process.env.VERCEL || process.env.VERCEL_ENV);

function walk(dir, onFile) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return; }
  for (const ent of entries) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, onFile);
    else onFile(p);
  }
}

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch { return null; }
}

function main() {
  if (!fs.existsSync(serverDir)) {
    console.warn("[verify-build-output] .next/server missing — skipping (build did not produce server output).");
    return;
  }

  /** @type {Array<{ manifest:string, missing:string[] }>} */
  const failures = [];
  let manifestsScanned = 0;
  let referencesChecked = 0;

  walk(serverDir, (p) => {
    if (!p.endsWith(".nft.json")) return;
    manifestsScanned += 1;
    const trace = readJson(p);
    if (!trace || !Array.isArray(trace.files)) return;

    /** @type {string[]} */
    const missing = [];
    const manifestDir = path.dirname(p);
    for (const ref of trace.files) {
      referencesChecked += 1;
      const abs = path.resolve(manifestDir, ref);
      if (!fs.existsSync(abs)) missing.push(ref);
    }
    if (missing.length) failures.push({ manifest: path.relative(rootDir, p), missing });
  });

  if (manifestsScanned === 0) {
    if (ON_VERCEL) {
      console.error("[verify-build-output] FATAL: no .nft.json manifests found on Vercel build. Vercel cannot pack serverless functions without them. Check that scripts/prune-next-build.js is not deleting them.");
      process.exit(1);
    }
    console.warn("[verify-build-output] no .nft.json manifests found — skipping (likely Amplify build with .nft.json removed by prune script).");
    return;
  }

  if (failures.length) {
    console.error(`[verify-build-output] FATAL: ${failures.length} manifest(s) reference missing chunk file(s):`);
    for (const f of failures.slice(0, 25)) {
      console.error(`\n  ${f.manifest}`);
      for (const ref of f.missing.slice(0, 10)) {
        console.error(`    × ${ref}`);
      }
      if (f.missing.length > 10) console.error(`    … ${f.missing.length - 10} more`);
    }
    if (failures.length > 25) {
      console.error(`\n  … ${failures.length - 25} more manifest(s) with missing references`);
    }
    console.error(`\n[verify-build-output] Totals — manifests: ${manifestsScanned}, references: ${referencesChecked}, failed manifests: ${failures.length}.`);
    process.exit(1);
  }

  console.log(`[verify-build-output] ok — ${manifestsScanned} manifest(s), ${referencesChecked} chunk reference(s) all resolved.`);
}

main();
