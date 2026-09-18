import { describe, expect, it } from "vitest";
import {
  INTERVIEW_DETAIL_TAB_LABELS,
  parseInterviewDetailTab,
  visibleInterviewDetailTabs,
} from "../../[id]/_components/interviewDetailTabs";

describe("interviewDetailTabs", () => {
  it("defaults unknown tab to overview", () => {
    expect(parseInterviewDetailTab("nope")).toBe("overview");
    expect(parseInterviewDetailTab("transcript")).toBe("transcript");
    expect(parseInterviewDetailTab("result")).toBe("result");
  });

  it("hides transcript and summary without permission but keeps result read-only", () => {
    expect(
      visibleInterviewDetailTabs({
        canReadTranscript: false,
        canReadSummary: false,
        canManageResult: false,
      })
    ).toEqual(["overview", "recording", "result"]);
  });

  it("shows result tab for managers", () => {
    expect(
      visibleInterviewDetailTabs({
        canReadTranscript: true,
        canReadSummary: true,
        canManageResult: true,
      })
    ).toEqual(["overview", "recording", "transcript", "summary", "result"]);
  });

  it("labels every tab for UI", () => {
    expect(INTERVIEW_DETAIL_TAB_LABELS.result).toBe("Result");
  });
});
