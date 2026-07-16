import { describe, expect, it } from "vitest";
import { countAdvancedFilters } from "../advanced-filter-count";
import { EMPTY_FILTERS } from "../../types";

describe("countAdvancedFilters", () => {
  it("returns 0 when no advanced filters are active", () => {
    expect(countAdvancedFilters(EMPTY_FILTERS)).toBe(0);
  });

  it("counts each selected priority", () => {
    expect(
      countAdvancedFilters({
        ...EMPTY_FILTERS,
        priorities: ["high", "urgent"],
      })
    ).toBe(2);
  });

  it("counts leaving as one active filter", () => {
    expect(
      countAdvancedFilters({
        ...EMPTY_FILTERS,
        leaving: true,
      })
    ).toBe(1);
  });

  it("sums priorities and leaving", () => {
    expect(
      countAdvancedFilters({
        ...EMPTY_FILTERS,
        priorities: ["low"],
        leaving: true,
      })
    ).toBe(2);
  });
});
