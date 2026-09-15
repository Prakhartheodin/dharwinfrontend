import { describe, expect, it } from "vitest";
import { parseInterviewDetailTab, visibleInterviewDetailTabs } from "../../[id]/_components/interviewDetailTabs";

describe("interviewDetailTabs", () => {
  it("defaults unknown tab to overview", () => {
    expect(parseInterviewDetailTab("nope")).toBe("overview");
    expect(parseInterviewDetailTab("transcript")).toBe("transcript");
  });

  it("hides transcript and summary without permission", () => {
    expect(
      visibleInterviewDetailTabs({
        canReadTranscript: false,
        canReadSummary: false,
        hasRecording: true,
      })
    ).toEqual(["overview", "recording"]);
  });
});
