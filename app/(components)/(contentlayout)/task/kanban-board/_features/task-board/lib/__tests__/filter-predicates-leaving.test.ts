import { describe, it, expect } from "vitest";
import { applyClientFilters } from "../filter-predicates";
import { EMPTY_FILTERS } from "../../types";
import type { Task } from "@/shared/lib/api/tasks";

const base = (over: Partial<Task>): Task =>
  ({ _id: "t", title: "t", status: "todo", likesCount: 0, commentsCount: 0, ...over } as Task);

describe("leaving filter", () => {
  it("keeps only flagged tasks when leaving is on", () => {
    const tasks = [
      base({ _id: "a", offboardingFlag: "resigned" }),
      base({ _id: "b" }),
      base({ _id: "c", offboardingFlag: "soon" }),
    ];
    const out = applyClientFilters(tasks, { ...EMPTY_FILTERS, leaving: true });
    expect(out.map((t) => t._id)).toEqual(["a", "c"]);
  });

  it("keeps all tasks when leaving is off", () => {
    const tasks = [base({ _id: "a", offboardingFlag: "soon" }), base({ _id: "b" })];
    const out = applyClientFilters(tasks, { ...EMPTY_FILTERS, leaving: false });
    expect(out).toHaveLength(2);
  });
});
