import { describe, expect, it } from "vitest";
import {
  formatLeaveDateRuns,
  summarizeLeaveDateRuns,
} from "@/shared/lib/leave-date-range";

describe("formatLeaveDateRuns", () => {
  it("collapses five consecutive calendar days", () => {
    expect(
      formatLeaveDateRuns(["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14"])
    ).toBe("Aug 10–14, 2026");
  });

  it("keeps year once for gapped days in the same year", () => {
    expect(formatLeaveDateRuns(["2026-08-10", "2026-08-12", "2026-08-15"])).toBe(
      "Aug 10, Aug 12, Aug 15, 2026"
    );
  });

  it("formats a cross-month continuous run", () => {
    expect(
      formatLeaveDateRuns(["2026-08-28", "2026-08-29", "2026-08-30", "2026-08-31", "2026-09-01", "2026-09-02"])
    ).toBe("Aug 28 – Sep 2, 2026");
  });

  it("formats a single day", () => {
    expect(formatLeaveDateRuns(["2026-08-10"])).toBe("Aug 10, 2026");
  });

  it("does not treat Fri+Mon as continuous when the weekend is omitted", () => {
    expect(formatLeaveDateRuns(["2026-08-07", "2026-08-10"])).toBe("Aug 7, Aug 10, 2026");
  });

  it("joins multiple calendar runs with the year once", () => {
    expect(
      formatLeaveDateRuns([
        "2026-08-10",
        "2026-08-11",
        "2026-08-12",
        "2026-08-13",
        "2026-08-14",
        "2026-08-17",
        "2026-08-18",
        "2026-08-19",
        "2026-08-20",
        "2026-08-21",
      ])
    ).toBe("Aug 10–14, Aug 17–21, 2026");
  });

  it("keeps both years on a cross-year run", () => {
    expect(formatLeaveDateRuns(["2025-12-30", "2025-12-31", "2026-01-01", "2026-01-02"])).toBe(
      "Dec 30, 2025 – Jan 2, 2026"
    );
  });

  it("accepts UTC-midnight ISO strings from the API", () => {
    expect(
      formatLeaveDateRuns([
        "2026-08-10T00:00:00.000Z",
        "2026-08-11T00:00:00.000Z",
        "2026-08-12T00:00:00.000Z",
        "2026-08-13T00:00:00.000Z",
        "2026-08-14T00:00:00.000Z",
      ])
    ).toBe("Aug 10–14, 2026");
  });
});

describe("summarizeLeaveDateRuns", () => {
  it("truncates after three runs and reports remaining days", () => {
    const dates = [
      "2026-07-23",
      "2026-07-24",
      "2026-07-27",
      "2026-07-28",
      "2026-07-29",
      "2026-07-30",
      "2026-07-31",
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
      "2026-08-10",
      "2026-08-11",
      "2026-08-12",
      "2026-08-13",
      "2026-08-14",
    ];
    const summarized = summarizeLeaveDateRuns(dates);
    expect(summarized.label).toBe("Jul 23–24, Jul 27–31, Aug 3–7, 2026, +5 more dates");
    expect(summarized.hiddenDayCount).toBe(5);
    expect(summarized.full).toBe("Jul 23–24, Jul 27–31, Aug 3–7, Aug 10–14, 2026");
  });
});
