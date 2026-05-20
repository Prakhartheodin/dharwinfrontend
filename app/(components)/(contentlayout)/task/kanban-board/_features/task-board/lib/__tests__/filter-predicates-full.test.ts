import { describe, expect, it } from "vitest";
import { compilePredicate } from "../filter-predicates";
import { EMPTY_FILTERS } from "../../types";

const base = {
  _id: "1",
  title: "Ship feature",
  status: "todo" as const,
  priority: "medium" as const,
  tags: ["backend"],
  assignedTo: [{ name: "Ada" }],
};

describe("compilePredicate full", () => {
  it("matches assignedToMe", () => {
    const pred = compilePredicate({ ...EMPTY_FILTERS, assignedToMe: true });
    expect(pred({ ...base, assignedToMe: true } as never)).toBe(true);
  });
  it("matches status filter", () => {
    const pred = compilePredicate({ ...EMPTY_FILTERS, statuses: ["todo"] });
    expect(pred(base as never)).toBe(true);
    expect(pred({ ...base, status: "new" } as never)).toBe(false);
  });
});
