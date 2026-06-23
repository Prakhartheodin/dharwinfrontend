import { describe, expect, it } from "vitest";
import { deserialize, normalize, serializeFilters } from "../url-state";
import { EMPTY_FILTERS } from "../../types";

describe("url-state", () => {
  it("round-trips filters through URL params", () => {
    const filters = normalize({
      ...EMPTY_FILTERS,
      q: "billing",
      priorities: ["high"],
      assignedToMe: true,
    });
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(serializeFilters(filters))) {
      params.set(k, v);
    }
    const parsed = deserialize(params as unknown as import("next/navigation").ReadonlyURLSearchParams);
    expect(parsed.q).toBe("billing");
    expect(parsed.priorities).toEqual(["high"]);
    expect(parsed.assignedToMe).toBe(true);
  });

  describe("leaving filter", () => {
    it("serializeFilters emits leaving=1 when leaving is true", () => {
      const filters = normalize({ ...EMPTY_FILTERS, leaving: true });
      const out = serializeFilters(filters);
      expect(out["leaving"]).toBe("1");
    });

    it("deserializeFilters parses leaving=1 as true", () => {
      const params = new URLSearchParams({ leaving: "1" });
      const parsed = deserialize(params as unknown as import("next/navigation").ReadonlyURLSearchParams);
      expect(parsed.leaving).toBe(true);
    });

    it("round-trip: leaving:true serializes and deserializes correctly", () => {
      const filters = normalize({ ...EMPTY_FILTERS, leaving: true });
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(serializeFilters(filters))) {
        params.set(k, v);
      }
      const parsed = deserialize(params as unknown as import("next/navigation").ReadonlyURLSearchParams);
      expect(parsed.leaving).toBe(true);
    });

    it("round-trip: leaving:false omits the param and deserializes as false", () => {
      const filters = normalize({ ...EMPTY_FILTERS, leaving: false });
      const out = serializeFilters(filters);
      expect(out["leaving"]).toBeUndefined();
      const params = new URLSearchParams(out);
      const parsed = deserialize(params as unknown as import("next/navigation").ReadonlyURLSearchParams);
      expect(parsed.leaving).toBe(false);
    });
  });
});

