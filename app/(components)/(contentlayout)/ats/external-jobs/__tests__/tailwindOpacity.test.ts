import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import path from "path";

// Tailwind v3 only emits opacity modifiers that are multiples of 5. `bg-white/8`
// compiles to nothing at all -- no class, no error, no build warning -- so a
// `dark:bg-white/8` silently loses to the light `bg-gray-100` next to it and the
// element renders as a white block in dark mode. That is what made the External
// Jobs Location chips and action buttons come out blank.
const FEATURE_DIR = path.join(__dirname, "..");
const OPACITY_CLASS = /\b[a-z-]+\/(\d{1,3})\b/g;

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "__tests__" ? [] : tsxFiles(full);
    return /\.tsx?$/.test(e.name) ? [full] : [];
  });
}

describe("external-jobs Tailwind opacity modifiers", () => {
  it("uses only opacity values Tailwind actually compiles", () => {
    const offenders: string[] = [];
    for (const file of tsxFiles(FEATURE_DIR)) {
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          for (const m of line.matchAll(OPACITY_CLASS)) {
            const value = Number(m[1]);
            if (value > 100 || value % 5 === 0) continue;
            offenders.push(`${path.basename(file)}:${i + 1} ${m[0]}`);
          }
        });
    }
    expect(offenders).toEqual([]);
  });
});
