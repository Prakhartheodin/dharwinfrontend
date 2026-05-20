import { describe, expect, it } from "vitest";
import { compilePredicate } from "../filter-predicates";
import { EMPTY_FILTERS } from "../../types";
import type { Task } from "@/shared/lib/api/tasks";

const baseTask: Task = {
  _id: "t1",
  title: "Alpha",
  status: "new",
  priority: "medium",
  tags: ["ops"],
  likesCount: 0,
  commentsCount: 0,
};

describe("filter-predicates", () => {
  it("matches search query case-insensitively", () => {
    const pred = compilePredicate({ ...EMPTY_FILTERS, q: "alpha" });
    expect(pred(baseTask)).toBe(true);
    expect(pred({ ...baseTask, title: "Beta" })).toBe(false);
  });

  it("filters by priority", () => {
    const pred = compilePredicate({ ...EMPTY_FILTERS, priorities: ["high"] });
    expect(pred({ ...baseTask, priority: "high" })).toBe(true);
    expect(pred(baseTask)).toBe(false);
  });
});
