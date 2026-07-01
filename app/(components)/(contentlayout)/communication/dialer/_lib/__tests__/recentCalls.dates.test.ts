import { describe, it, expect } from "vitest";
import { dateGroup, groupByDate } from "../recentCalls";
import type { CallRecord } from "@/shared/lib/api/bolna";

const now = new Date("2026-07-01T12:00:00Z");
const at = (iso: string): CallRecord => ({ _id: iso, createdAt: iso });

describe("date grouping", () => {
  it("buckets a timestamp", () => {
    expect(dateGroup("2026-07-01T09:00:00Z", now)).toBe("Today");
    expect(dateGroup("2026-06-30T09:00:00Z", now)).toBe("Yesterday");
    expect(dateGroup("2026-06-28T09:00:00Z", now)).toBe("This week");
    expect(dateGroup("2026-06-01T09:00:00Z", now)).toBe("Older");
    expect(dateGroup(undefined, now)).toBe("Older");
  });

  it("groups records in fixed order, omitting empties", () => {
    const out = groupByDate(
      [at("2026-06-01T09:00:00Z"), at("2026-07-01T08:00:00Z"), at("2026-07-01T07:00:00Z")],
      now
    );
    expect(out.map((g) => g.group)).toEqual(["Today", "Older"]);
    expect(out[0].records.map((r) => r._id)).toEqual(["2026-07-01T08:00:00Z", "2026-07-01T07:00:00Z"]);
  });
});
