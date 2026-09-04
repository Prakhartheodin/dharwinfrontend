import { describe, expect, it } from "vitest";
import type { Holiday } from "@/shared/lib/api/holidays";
import { effectiveIsActive, sortHolidaysByRelevance } from "@/shared/lib/holidays/effectiveHoliday";

const at = (y: number, m: number, d: number) => new Date(y, m - 1, d);

const holiday = (over: Partial<Holiday> & { title: string; date: string }): Holiday => ({
  isActive: true,
  ...over,
});

describe("effectiveIsActive", () => {
  const ref = at(2026, 9, 4);

  it("returns false when stored isActive is false", () => {
    expect(effectiveIsActive(holiday({ title: "Old", date: "2026-12-25", isActive: false }), ref)).toBe(false);
  });

  it("returns false for a past single-day holiday even when stored active", () => {
    expect(effectiveIsActive(holiday({ title: "Independence Day", date: "2026-08-15" }), ref)).toBe(false);
  });

  it("returns true for upcoming holidays when stored active", () => {
    expect(effectiveIsActive(holiday({ title: "Diwali", date: "2026-11-08" }), ref)).toBe(true);
  });

  it("returns true for a multi-day holiday still in progress", () => {
    expect(
      effectiveIsActive(holiday({ title: "Onam", date: "2026-09-02", endDate: "2026-09-05" }), ref)
    ).toBe(true);
  });

  it("returns false once a multi-day holiday has ended", () => {
    expect(
      effectiveIsActive(holiday({ title: "Onam", date: "2026-08-30", endDate: "2026-09-03" }), ref)
    ).toBe(false);
  });
});

describe("sortHolidaysByRelevance", () => {
  const ref = at(2026, 9, 4);

  it("puts upcoming nearest-first, then past most-recent-first", () => {
    const rows = [
      holiday({ id: "1", title: "Old August", date: "2026-08-01" }),
      holiday({ id: "2", title: "December", date: "2026-12-25" }),
      holiday({ id: "3", title: "Next week", date: "2026-09-10" }),
      holiday({ id: "4", title: "Tomorrow", date: "2026-09-05" }),
      holiday({ id: "5", title: "Recent past", date: "2026-09-01", endDate: "2026-09-03" }),
    ];
    expect(sortHolidaysByRelevance(rows, ref).map((h) => h.title)).toEqual([
      "Tomorrow",
      "Next week",
      "December",
      "Recent past",
      "Old August",
    ]);
  });
});
