import { describe, expect, it } from "vitest";
import { safeGet, safeSet, safeRemove } from "../safe-storage";

describe("safe-storage", () => {
  it("round-trips JSON values", () => {
    expect(safeSet("taskboard:test", { a: 1 })).toBe("ok");
    expect(safeGet<{ a: number }>("taskboard:test")).toEqual({ a: 1 });
    safeRemove("taskboard:test");
    expect(safeGet("taskboard:test")).toBeNull();
  });
});
