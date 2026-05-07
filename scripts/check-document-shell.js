/**
 * Static guard — assert that ONLY app/layout.tsx renders <html>/<body>.
 *
 * Nested layouts re-emitting the document shell produce hydration warnings
 * + SSR runtime chunk corruption on Vercel (the `[root-of-the-server]__
 * <hash>.js MODULE_NOT_FOUND` outage). This script walks every .tsx file
 * under `app/` and fails the build if any file other than `app/layout.tsx`
 * contains a `<html` or `<body` opening tag.
 *
 * Sole caller: `npm run postbuild` (chained alongside prune-next-build.js
 * + verify-build-output.js). Cheap regex scan — does not parse JSX.
 */
const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const appDir  = path.join(rootDir, "app");
const ROOT_LAYOUT = path.join(appDir, "layout.tsx");

const OPEN_TAG_RE = /<\s*(html|body)(\s|>|\/)/;

/**
 * Mask block comments, template literals, and line comments with spaces
 * (newlines preserved so line numbers stay correct). Prevents false
 * positives on `<html>` / `<body>` text living inside string-built HTML
 * passed to `printWindow.document.write(...)` and similar.
 */
function sanitize(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/`(?:\\[\s\S]|[^`\\])*`/g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (_m, lead) => lead + "");
}

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

function main() {
  if (!fs.existsSync(appDir)) {
    console.warn("[check-document-shell] app/ directory missing — skipping.");
    return;
  }

  /** @type {Array<{ file:string, line:number, snippet:string }>} */
  const violations = [];
  let scanned = 0;

  walk(appDir, (p) => {
    if (!p.endsWith(".tsx")) return;
    scanned += 1;
    if (path.resolve(p) === path.resolve(ROOT_LAYOUT)) return;

    const text = sanitize(fs.readFileSync(p, "utf8"));
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (OPEN_TAG_RE.test(line)) {
        violations.push({
          file: path.relative(rootDir, p),
          line: i + 1,
          snippet: line.trim().slice(0, 200),
        });
      }
    }
  });

  if (violations.length) {
    console.error(
      `[check-document-shell] FATAL: ${violations.length} non-root file(s) render <html>/<body>. ` +
      `Only app/layout.tsx may emit the document shell.\n`,
    );
    for (const v of violations.slice(0, 50)) {
      console.error(`  ${v.file}:${v.line}  →  ${v.snippet}`);
    }
    if (violations.length > 50) console.error(`  … ${violations.length - 50} more`);
    console.error(`\n[check-document-shell] Scanned ${scanned} .tsx file(s).`);
    process.exit(1);
  }

  console.log(`[check-document-shell] ok — ${scanned} file(s) scanned, no nested <html>/<body> found.`);
}

main();
