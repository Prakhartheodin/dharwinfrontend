import { describe, it, expect } from "vitest";
import { candidateVisibleInterviewNotes } from "./InterviewPanel";

describe("candidateVisibleInterviewNotes", () => {
  it("removes Application ID lines from recruiter prefill notes", () => {
    const input = [
      "Application ID: 507f1f77bcf86cd799439011",
      "Current stage: Interview",
      "Job: Data Analyst",
    ].join("\n");
    expect(candidateVisibleInterviewNotes(input)).toBe(
      ["Current stage: Interview", "Job: Data Analyst"].join("\n"),
    );
  });

  it("returns empty when notes only contain Application ID", () => {
    expect(candidateVisibleInterviewNotes("Application ID: abc123")).toBe("");
  });

  it("matches Application ID case-insensitively", () => {
    expect(candidateVisibleInterviewNotes("application id: hidden\nBring ID card")).toBe("Bring ID card");
  });
});
