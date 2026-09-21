import { describe, it, expect } from "vitest";
import { candidateVisibleInterviewNotes, roundName, roundTypeLabel } from "./InterviewPanel";

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

describe("round name and type", () => {
  const meeting = (round: Record<string, unknown> | null) =>
    ({ round } as never);

  it("names an unlabelled round by its index and keeps the type separate", () => {
    const m = meeting({ index: 3, type: "panel" });
    expect(roundName(m)).toBe("Round 3");
    expect(roundTypeLabel(m)).toBe("Panel");
  });

  it("prefers an explicit label over the index", () => {
    const m = meeting({ index: 2, label: "Final loop", type: "technical" });
    expect(roundName(m)).toBe("Final loop");
    expect(roundTypeLabel(m)).toBe("Technical");
  });

  it("drops the type when the label already says it", () => {
    expect(roundTypeLabel(meeting({ index: 1, label: "Technical", type: "technical" }))).toBe("");
  });

  it("returns blanks for a round with no index, label or type", () => {
    expect(roundName(meeting({}))).toBe("");
    expect(roundTypeLabel(meeting(null))).toBe("");
  });
});
