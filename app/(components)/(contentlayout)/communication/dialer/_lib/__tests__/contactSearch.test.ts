import { describe, it, expect } from "vitest";
import { normalizeQuery, buildContactParams } from "../contactSearch";

describe("contactSearch", () => {
  it("normalizeQuery trims", () => {
    expect(normalizeQuery("  hi  ")).toBe("hi");
    expect(normalizeQuery("")).toBe("");
  });

  it("buildContactParams adds favorite only in favorites view, omits empty q", () => {
    expect(buildContactParams("contacts", "")).toEqual({ limit: 50 });
    expect(buildContactParams("contacts", " anita ")).toEqual({ q: "anita", limit: 50 });
    expect(buildContactParams("favorites", "")).toEqual({ favorite: true, limit: 50 });
    expect(buildContactParams("favorites", "x")).toEqual({ q: "x", favorite: true, limit: 50 });
  });
});
