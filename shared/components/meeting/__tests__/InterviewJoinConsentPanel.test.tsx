import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InterviewJoinConsentPanel from "@/shared/components/meeting/InterviewJoinConsentPanel";
import * as meetingsApi from "@/shared/lib/api/meetings";

vi.mock("@/shared/lib/api/meetings", async (importOriginal) => {
  const actual = await importOriginal<typeof meetingsApi>();
  return {
    ...actual,
    submitPublicMeetingConsent: vi.fn().mockResolvedValue({
      meetingId: "meeting_x",
      identity: "c1",
      noticeVersion: "draft-2026-09-v1",
      recording: true,
      transcription: true,
      aiEvaluation: false,
      acceptedAt: new Date().toISOString(),
    }),
  };
});

describe("InterviewJoinConsentPanel", () => {
  beforeEach(() => {
    vi.mocked(meetingsApi.submitPublicMeetingConsent).mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("defaults interviewer recording off and omits AI choice", () => {
    render(
      <InterviewJoinConsentPanel
        roomName="meeting_test"
        liveKitToken="tok"
        variant="interviewer"
        onComplete={() => {}}
      />
    );
    const recording = screen.getByRole("checkbox", { name: /Recording of audio and video/i });
    expect(recording).toBeDisabled();
    expect(recording).not.toBeChecked();
    expect(screen.queryByRole("checkbox", { name: /AI-assisted summary/i })).toBeNull();
  });

  it("submits candidate choices on continue", async () => {
    const onComplete = vi.fn();
    render(
      <InterviewJoinConsentPanel
        roomName="meeting_test"
        liveKitToken="tok"
        variant="candidate"
        onComplete={onComplete}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /Continue to meeting/i }));
    expect(meetingsApi.submitPublicMeetingConsent).toHaveBeenCalledWith(
      "meeting_test",
      "tok",
      expect.objectContaining({ recording: true, transcription: true })
    );
    expect(onComplete).toHaveBeenCalled();
  });
});
