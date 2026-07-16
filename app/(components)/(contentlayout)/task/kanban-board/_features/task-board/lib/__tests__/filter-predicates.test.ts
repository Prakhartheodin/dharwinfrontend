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

  it("matches employee-id search via assignee metadata", () => {
    const pred = compilePredicate({ ...EMPTY_FILTERS, q: "dbs102" });
    expect(
      pred({
        ...baseTask,
        assigneeEmployeeIds: ["DBS102"],
      })
    ).toBe(true);
  });

  it("filters by priority", () => {
    const pred = compilePredicate({ ...EMPTY_FILTERS, priorities: ["high"] });
    expect(pred({ ...baseTask, priority: "high" })).toBe(true);
    expect(pred(baseTask)).toBe(false);
  });

  it("filters reassigned tasks", () => {
    const pred = compilePredicate({ ...EMPTY_FILTERS, reassigned: true });
    expect(pred({ ...baseTask, formerAssignees: [{ user: "u1" }] })).toBe(true);
    expect(pred(baseTask)).toBe(false);
  });
});
