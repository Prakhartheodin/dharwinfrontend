import { describe, expect, it } from "vitest";
import { defangCell, fmtExportDate, fmtExportDateTime } from "../xlsx-export";

describe("xlsx-export", () => {
  it("defangCell quotes formula-prefix values", () => {
    expect(defangCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(defangCell("+123")).toBe("'+123");
    expect(defangCell(42)).toBe(42);
    expect(defangCell(null)).toBe("");
  });

  it("fmtExportDateTime formats UTC timestamps", () => {
    expect(fmtExportDateTime("2026-07-20T10:30:00.000Z")).toBe("2026-07-20 10:30");
    expect(fmtExportDateTime(undefined)).toBe("");
  });

  it("fmtExportDate formats UTC date-only values", () => {
    expect(fmtExportDate("2026-07-20T10:30:00.000Z")).toBe("2026-07-20");
    expect(fmtExportDate("")).toBe("");
  });
});
