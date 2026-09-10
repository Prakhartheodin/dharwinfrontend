import { describe, expect, it } from "vitest";
import {
  INTERVIEW_SCHEDULE_ELIGIBLE_STATUSES,
  INTERVIEW_SCHEDULE_REJECTED_MESSAGE,
  getInterviewSchedulingBlockReason,
  isInterviewSchedulingBlocked,
  REJECTED_REOPEN_STATUSES,
  MANUAL_NEXT_STATUSES,
  PIPELINE_STATUSES,
  SYSTEM_ONLY_STATUSES,
  getManualNextStatuses,
  isManualStatusTarget,
  isManualTransition,
  isStatusSelectLocked,
} from "../ats/applicationPipeline";

describe("applicationPipeline", () => {
  it("exposes all seven pipeline statuses for display and filters", () => {
    expect(PIPELINE_STATUSES).toHaveLength(7);
    expect(PIPELINE_STATUSES).toContain("Shortlisted");
  });

  it("blocks interview scheduling for Offered, Hired, and Rejected applications", () => {
    expect(INTERVIEW_SCHEDULE_ELIGIBLE_STATUSES).toEqual([
      "Applied",
      "Screening",
      "Shortlisted",
      "Interview",
    ]);
    for (const status of INTERVIEW_SCHEDULE_ELIGIBLE_STATUSES) {
      expect(isInterviewSchedulingBlocked(status)).toBe(false);
    }
    expect(isInterviewSchedulingBlocked("Rejected")).toBe(true);
    expect(isInterviewSchedulingBlocked("Offered")).toBe(true);
    expect(isInterviewSchedulingBlocked("Hired")).toBe(true);
    expect(getInterviewSchedulingBlockReason("Offered")).toMatch(/offer/i);
    expect(getInterviewSchedulingBlockReason("Hired")).toMatch(/hired application/i);
    expect(isInterviewSchedulingBlocked(null)).toBe(false);
  });

  it("defines reopen targets without system-only stages", () => {
    expect(REJECTED_REOPEN_STATUSES).toEqual(["Applied", "Screening", "Shortlisted"]);
    for (const status of SYSTEM_ONLY_STATUSES) {
      expect(REJECTED_REOPEN_STATUSES.includes(status as never)).toBe(false);
    }
  });

  it("never offers Interview, Offered, or Hired as manual dropdown targets", () => {
    for (const status of PIPELINE_STATUSES) {
      for (const target of getManualNextStatuses(status)) {
        expect(SYSTEM_ONLY_STATUSES.includes(target)).toBe(false);
      }
    }
  });

  it("Option B manual graph matches backend MANUAL_APPLICATION_TRANSITIONS", () => {
    expect(MANUAL_NEXT_STATUSES.Interview).toEqual(["Shortlisted", "Rejected"]);
    expect(MANUAL_NEXT_STATUSES.Shortlisted).toEqual(["Rejected"]);
    expect(MANUAL_NEXT_STATUSES.Offered).toEqual(["Rejected"]);
    expect(MANUAL_NEXT_STATUSES.Hired).toEqual([]);
    expect(isStatusSelectLocked("Hired")).toBe(true);
  });

  it("validates manual transitions", () => {
    expect(isManualTransition("Applied", "Screening")).toBe(true);
    expect(isManualTransition("Applied", "Interview")).toBe(false);
    expect(isManualTransition("Shortlisted", "Offered")).toBe(false);
    expect(isManualTransition("Rejected", "Shortlisted")).toBe(true);
    expect(isManualTransition("Rejected", "Offered")).toBe(false);
  });

  it("treats system-only statuses as non-manual targets", () => {
    for (const status of SYSTEM_ONLY_STATUSES) {
      expect(isManualStatusTarget(status)).toBe(false);
    }
    expect(isManualStatusTarget("Shortlisted")).toBe(true);
  });

  it("provides a user-facing rejected scheduling message", () => {
    expect(INTERVIEW_SCHEDULE_REJECTED_MESSAGE).toMatch(/rejected application/i);
  });
});
