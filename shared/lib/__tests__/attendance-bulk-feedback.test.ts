import { describe, it, expect } from "vitest";
import {
  bulkOutcomeIcon,
  emailSkippedSummaryText,
  holidaySkippedSummaryHtml,
} from "@/shared/lib/attendance-bulk-feedback";

describe("attendance-bulk-feedback", () => {
  it("renders holiday skipped html", () => {
    const html = holidaySkippedSummaryHtml([
      { studentName: "A", holidayTitle: "Diwali", date: "2026-11-01", reason: "already assigned" },
    ]);
    expect(html).toContain("Skipped (1)");
    expect(html).toContain("Diwali");
  });

  it("summarizes email skips", () => {
    const text = emailSkippedSummaryText([{ email: "a@test.com", reason: "no profile" }]);
    expect(text).toContain("a@test.com");
    expect(text).toContain("1 skipped");
  });

  it("uses warning icon when skips present", () => {
    expect(bulkOutcomeIcon(3, 1)).toBe("warning");
    expect(bulkOutcomeIcon(3, 0)).toBe("success");
  });
});
