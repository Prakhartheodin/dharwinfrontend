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

  it("shows a short recording notice for participants", () => {
    render(
      <InterviewJoinConsentPanel
        roomName="meeting_test"
        liveKitToken="tok"
        variant="candidate"
        onComplete={() => {}}
      />
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /This meeting may be recorded/i })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByText(/Notice version/i)).toBeNull();
  });

  it("submits consent and continues on primary action", async () => {
    const onComplete = vi.fn();
    render(
      <InterviewJoinConsentPanel
        roomName="meeting_test"
        liveKitToken="tok"
        variant="candidate"
        onComplete={onComplete}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /^Continue$/i }));
    expect(meetingsApi.submitPublicMeetingConsent).toHaveBeenCalledWith(
      "meeting_test",
      "tok",
      expect.objectContaining({
        recording: true,
        transcription: true,
        aiEvaluation: true,
      })
    );
    expect(onComplete).toHaveBeenCalled();
  });

  it("sets aiEvaluation false for guest variant", async () => {
    render(
      <InterviewJoinConsentPanel
        roomName="meeting_test"
        liveKitToken="tok"
        variant="guest"
        onComplete={() => {}}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /^Continue$/i }));
    expect(meetingsApi.submitPublicMeetingConsent).toHaveBeenCalledWith(
      "meeting_test",
      "tok",
      expect.objectContaining({ aiEvaluation: false })
    );
  });
});
