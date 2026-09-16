import { describe, it, expect } from "vitest";
import { describeVacancyFill } from "../ats/jobVacancy";

describe("describeVacancyFill", () => {
  it("shows a bare count when the job declares no vacancies", () => {
    // Legacy postings predate the field — no denominator to show, and nothing is wrong.
    const r = describeVacancyFill(3, null);
    expect(r.label).toBe("3");
    expect(r.statusSuffix).toBe("");
    expect(r.overCapacity).toBe(false);
    expect(r.toneClass).toContain("emerald");
  });

  it("shows a ratio while the job is under capacity", () => {
    const r = describeVacancyFill(1, 3);
    expect(r.label).toBe("1 / 3");
    expect(r.statusSuffix).toBe(" · 1/3 filled");
    expect(r.overCapacity).toBe(false);
    expect(r.toneClass).toContain("emerald");
  });

  it("stays on the success tone when exactly full", () => {
    // Fully filled is the goal state, not a problem.
    const r = describeVacancyFill(2, 2);
    expect(r.label).toBe("2 / 2");
    expect(r.statusSuffix).toBe(" · 2/2 filled");
    expect(r.overCapacity).toBe(false);
  });

  it("flags over-capacity with a warning tone", () => {
    // The reported bug state: 2 hired against 1 vacancy.
    const r = describeVacancyFill(2, 1);
    expect(r.label).toBe("2 / 1");
    expect(r.overCapacity).toBe(true);
    expect(r.toneClass).toContain("amber");
    expect(r.toneClass).toContain("dark:");
  });

  it("treats a zero or negative vacancy count as undeclared", () => {
    expect(describeVacancyFill(1, 0).label).toBe("1");
    expect(describeVacancyFill(1, -2).label).toBe("1");
  });
});
