import { describe, expect, it } from "vitest";
import type { Task, TaskStatus } from "@/shared/lib/api/tasks";
import {
  DASHBOARD_TASKS_FETCH_LIMIT,
  DASHBOARD_TASKS_LIMIT,
  DASHBOARD_TASKS_SORT,
  OPEN_TASK_STATUSES,
  OPEN_TASK_STATUS_PARAM,
  dashboardTaskQuery,
  daysOverdue,
  dueBucket,
  dueTodayOrOverdue,
  openOnly,
  prepareDashboardTasks,
  sortByDueDate,
} from "@/shared/lib/dashboard/dashboardTasks";

const task = (over: Partial<Task> & { _id: string }): Task =>
  ({
    title: `Task ${over._id}`,
    status: "todo" as TaskStatus,
    likesCount: 0,
    commentsCount: 0,
    ...over,
  }) as Task;

/** Local time, so no assertion depends on the runner's zone. */
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);
/** An ISO instant for the given LOCAL calendar day and hour. */
const dueOn = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).toISOString();

describe("the query the dashboard actually sends", () => {
  it("asks the server for open, assigned-to-me tasks (incl. undated)", () => {
    expect(dashboardTaskQuery()).toEqual({
      assignedToMe: true,
      status: "new,todo,on_going,in_review",
      sortBy: "dueDate:asc,_id:asc",
      limit: DASHBOARD_TASKS_FETCH_LIMIT,
    });
  });

  it("never asks for completed tasks", () => {
    expect(OPEN_TASK_STATUSES).not.toContain("completed");
    expect(OPEN_TASK_STATUS_PARAM).not.toContain("completed");
  });

  it("covers every non-completed status, so nothing open is silently hidden", () => {
    expect([...OPEN_TASK_STATUSES].sort()).toEqual(["in_review", "new", "on_going", "todo"].sort());
  });

  it("carries a stable secondary sort key — equal due dates must not reorder", () => {
    expect(DASHBOARD_TASKS_SORT).toBe("dueDate:asc,_id:asc");
  });

  it("bounds the response", () => {
    expect(DASHBOARD_TASKS_LIMIT).toBeGreaterThan(0);
    expect(DASHBOARD_TASKS_LIMIT).toBeLessThanOrEqual(200); // the endpoint's own max
  });
});

describe("dueBucket", () => {
  const now = at(2026, 9, 1);

  it("classifies by the viewer's local calendar day", () => {
    expect(dueBucket(task({ _id: "1", dueDate: dueOn(2026, 8, 30) }), now)).toBe("overdue");
    expect(dueBucket(task({ _id: "2", dueDate: dueOn(2026, 9, 1) }), now)).toBe("today");
    expect(dueBucket(task({ _id: "3", dueDate: dueOn(2026, 9, 5) }), now)).toBe("upcoming");
  });

  it("counts any time on today's date as today, including both edges", () => {
    expect(dueBucket(task({ _id: "1", dueDate: dueOn(2026, 9, 1, 0) }), now)).toBe("today");
    expect(dueBucket(task({ _id: "2", dueDate: dueOn(2026, 9, 1, 23) }), now)).toBe("today");
  });

  it("is unaffected by the hour the viewer checks", () => {
    const due = dueOn(2026, 9, 1, 9);
    for (const hour of [0, 5, 12, 23]) {
      expect(dueBucket(task({ _id: "1", dueDate: due }), at(2026, 9, 1, hour))).toBe("today");
    }
  });

  it("does not classify a task with a missing or broken due date as overdue", () => {
    expect(dueBucket(task({ _id: "1" }), now)).toBe("upcoming");
    expect(dueBucket(task({ _id: "2", dueDate: "not-a-date" }), now)).toBe("upcoming");
  });
});

describe("daysOverdue", () => {
  const now = at(2026, 9, 10);

  it("counts whole local days past due", () => {
    expect(daysOverdue(task({ _id: "1", dueDate: dueOn(2026, 9, 9) }), now)).toBe(1);
    expect(daysOverdue(task({ _id: "2", dueDate: dueOn(2026, 9, 3) }), now)).toBe(7);
  });

  it("is zero for today and for anything still ahead", () => {
    expect(daysOverdue(task({ _id: "1", dueDate: dueOn(2026, 9, 10) }), now)).toBe(0);
    expect(daysOverdue(task({ _id: "2", dueDate: dueOn(2026, 9, 20) }), now)).toBe(0);
  });

  it("is zero rather than NaN for a bad or absent date", () => {
    expect(daysOverdue(task({ _id: "1" }), now)).toBe(0);
    expect(daysOverdue(task({ _id: "2", dueDate: "nope" }), now)).toBe(0);
  });
});

describe("openOnly", () => {
  it("drops completed tasks, which is what makes a ticked row disappear", () => {
    const rows = [
      task({ _id: "1", status: "todo" }),
      task({ _id: "2", status: "completed" }),
      task({ _id: "3", status: "in_review" }),
    ];
    expect(openOnly(rows).map((t) => t._id)).toEqual(["1", "3"]);
  });

  it("INVARIANT: a completed task can never reach the widget", () => {
    const rows = (["new", "todo", "on_going", "in_review", "completed"] as TaskStatus[]).map(
      (status, i) => task({ _id: String(i), status })
    );
    expect(openOnly(rows).some((t) => t.status === "completed")).toBe(false);
  });
});

describe("sortByDueDate", () => {
  it("orders soonest first", () => {
    const rows = [
      task({ _id: "c", dueDate: dueOn(2026, 9, 20) }),
      task({ _id: "a", dueDate: dueOn(2026, 9, 1) }),
      task({ _id: "b", dueDate: dueOn(2026, 9, 10) }),
    ];
    expect(sortByDueDate(rows).map((t) => t._id)).toEqual(["a", "b", "c"]);
  });

  it("breaks equal due dates by id, so the list does not reshuffle between renders", () => {
    const same = dueOn(2026, 9, 5);
    const forward = sortByDueDate([
      task({ _id: "z", dueDate: same }),
      task({ _id: "a", dueDate: same }),
    ]);
    const reverse = sortByDueDate([
      task({ _id: "a", dueDate: same }),
      task({ _id: "z", dueDate: same }),
    ]);
    expect(forward.map((t) => t._id)).toEqual(["a", "z"]);
    expect(reverse.map((t) => t._id)).toEqual(forward.map((t) => t._id));
  });

  it("sinks undated tasks to the end rather than the front", () => {
    // Mongo sorts missing values FIRST; client-side ordering must not let undated
    // rows displace a real overdue task.
    const rows = [task({ _id: "undated" }), task({ _id: "dated", dueDate: dueOn(2026, 9, 5) })];
    expect(sortByDueDate(rows).map((t) => t._id)).toEqual(["dated", "undated"]);
  });

  it("does not mutate the array it was given", () => {
    const rows = [
      task({ _id: "b", dueDate: dueOn(2026, 9, 10) }),
      task({ _id: "a", dueDate: dueOn(2026, 9, 1) }),
    ];
    sortByDueDate(rows);
    expect(rows.map((t) => t._id)).toEqual(["b", "a"]);
  });

  it("returns an empty array unchanged", () => {
    expect(sortByDueDate([])).toEqual([]);
  });
});

describe("prepareDashboardTasks", () => {
  it("shows overdue first, then dated upcoming, then undated open tasks", () => {
    const rows = [
      task({ _id: "undated", status: "new" }),
      task({ _id: "later", dueDate: dueOn(2026, 9, 20), status: "todo" }),
      task({ _id: "late", dueDate: dueOn(2026, 9, 1), status: "todo" }),
      task({ _id: "done", status: "completed", dueDate: dueOn(2026, 9, 1) }),
    ];
    expect(prepareDashboardTasks(rows).map((t) => t._id)).toEqual(["late", "later", "undated"]);
  });

  it("caps at the widget row limit", () => {
    const rows = Array.from({ length: DASHBOARD_TASKS_LIMIT + 3 }, (_, i) =>
      task({ _id: String(i), dueDate: dueOn(2026, 9, i + 1) })
    );
    expect(prepareDashboardTasks(rows)).toHaveLength(DASHBOARD_TASKS_LIMIT);
  });
});

describe("dueTodayOrOverdue", () => {
  const now = at(2026, 9, 10);

  it("includes overdue and today, excludes the future", () => {
    const rows = [
      task({ _id: "late", dueDate: dueOn(2026, 9, 1) }),
      task({ _id: "today", dueDate: dueOn(2026, 9, 10) }),
      task({ _id: "later", dueDate: dueOn(2026, 9, 20) }),
    ];
    expect(dueTodayOrOverdue(rows, now).map((t) => t._id)).toEqual(["late", "today"]);
  });

  it("excludes completed tasks even when they are overdue", () => {
    const rows = [task({ _id: "done", status: "completed", dueDate: dueOn(2026, 9, 1) })];
    expect(dueTodayOrOverdue(rows, now)).toEqual([]);
  });

  it("excludes undated tasks", () => {
    expect(dueTodayOrOverdue([task({ _id: "x" })], now)).toEqual([]);
  });

  it("handles an empty list", () => {
    expect(dueTodayOrOverdue([], now)).toEqual([]);
  });
});
