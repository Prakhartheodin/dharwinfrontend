import { gzipSync } from "node:zlib";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const NEXT_BUILD = ".next/static/chunks";
const PATTERN = /taskboard|dnd-kit|virtual/i;
const BUDGET_BYTES = 80 * 1024;

if (!existsSync(NEXT_BUILD)) {
  console.log("No build output yet — skip bundle budget check.");
  process.exit(0);
}

let total = 0;
for (const f of readdirSync(NEXT_BUILD)) {
  if (!PATTERN.test(f)) continue;
  total += gzipSync(readFileSync(join(NEXT_BUILD, f))).length;
}
console.log(`Task board bundle (gzip est.): ${total} bytes (budget ${BUDGET_BYTES})`);
if (total > BUDGET_BYTES) process.exit(1);
