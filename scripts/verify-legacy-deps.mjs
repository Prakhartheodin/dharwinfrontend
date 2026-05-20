import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = ".";
const LEGACY_ONLY = ["dragula", "react-perfect-scrollbar"];
const TASKBOARD_DIR = join("app", "(components)", "(contentlayout)", "task", "kanban-board");

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, files);
    else if (/\.(tsx?|jsx?)$/.test(name)) files.push(p);
  }
  return files;
}

let ok = true;
const elsewhere = {};

for (const dep of LEGACY_ONLY) {
  const taskBoardHits = [];
  const otherHits = [];
  for (const f of walk(join(ROOT, "app"))) {
    if (f.includes("_legacy")) continue;
    const s = readFileSync(f, "utf8");
    if (!s.includes(dep)) continue;
    if (f.includes(TASKBOARD_DIR)) taskBoardHits.push(f);
    else otherHits.push(f);
  }
  if (taskBoardHits.length) {
    ok = false;
    console.error(`FAIL: ${dep} used in task-board V2 (must stay in _legacy):`, taskBoardHits);
  } else {
    console.log(`OK: ${dep} not present in task-board V2.`);
  }
  if (otherHits.length) elsewhere[dep] = otherHits;
}

if (Object.keys(elsewhere).length) {
  console.log("\nLegacy deps retained for non-task-board pages (informational, not a failure):");
  for (const [dep, hits] of Object.entries(elsewhere)) {
    console.log(`  ${dep}: ${hits.length} file(s)`);
    for (const h of hits) console.log(`    - ${h}`);
  }
}

process.exit(ok ? 0 : 1);
