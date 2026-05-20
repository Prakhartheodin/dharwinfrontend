import { describe, expect, it } from "vitest";
import { compilePredicate } from "../filter-predicates";
import { EMPTY_FILTERS } from "../../types";

describe("filter-predicates extra", () => {
  it("filters by query and priority", () => {
    const pred = compilePredicate({ ...EMPTY_FILTERS, q: "alpha", priorities: ["high"] });
    expect(pred({ title: "Alpha task", status: "new", priority: "high" } as never)).toBe(true);
    expect(pred({ title: "Beta", status: "new", priority: "low" } as never)).toBe(false);
  });
});
