import { describe, it, expect } from "vitest";
import { describeVacancyFill, validateVacanciesInput } from "../ats/jobVacancy";

describe("validateVacanciesInput", () => {
  it("accepts a whole number of 1 or more", () => {
    expect(validateVacanciesInput("1")).toEqual({ ok: true, value: 1 });
    expect(validateVacanciesInput("25")).toEqual({ ok: true, value: 25 });
    expect(validateVacanciesInput(10000)).toEqual({ ok: true, value: 10000 });
  });

  it("rejects a blank field, which used to save as no cap at all", () => {
    for (const blank of ["", "   ", null, undefined]) {
      const r = validateVacanciesInput(blank);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.message).toMatch(/required/i);
    }
  });

  it("rejects zero and negatives, and points at the status field instead", () => {
    // "0 openings" reads like a way to pause hiring; closing the job is the real switch.
    for (const bad of ["0", "-1", -5]) {
      const r = validateVacanciesInput(bad);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.message).toMatch(/Closed/);
    }
  });

  it("rejects fractions", () => {
    expect(validateVacanciesInput("1.5").ok).toBe(false);
  });

  it("rejects above the schema cap rather than letting the API 400", () => {
    const r = validateVacanciesInput("10001");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/10,000/);
  });
});

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
