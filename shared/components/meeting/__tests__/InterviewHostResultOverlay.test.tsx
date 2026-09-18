import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import InterviewHostResultOverlay from "../InterviewHostResultOverlay";

/**
 * The overlay embeds RubricEvaluationForm, which reads the session and the round's rubric.
 * Without these the whole dialog throws on render ("useAuth must be used within
 * AuthProvider") and every case here fails before it asserts anything.
 */
const api = vi.hoisted(() => ({
  updateMeeting: vi.fn(),
  getInterviewEvaluations: vi.fn(),
  saveInterviewEvaluation: vi.fn(),
}));

vi.mock("@/shared/lib/api/meetings", () => api);

vi.mock("@/shared/contexts/auth-context", () => ({
  useAuth: () => ({ user: { id: "u1", name: "Host User", email: "host@example.com" } }),
}));

vi.mock("@/shared/components/ui/useConfirm", () => ({
  useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(true), confirmDialog: null }),
}));

const RUBRIC = {
  templateId: null,
  templateName: "Default rubric",
  criteria: [{ key: "communication", label: "Communication", weight: 100, scaleMin: 1, scaleMax: 5 }],
};

const MEETING = {
  id: "m1",
  meetingId: "room-1",
  title: "Backend Engineer",
  status: "ended",
  scheduledAt: new Date().toISOString(),
  durationMinutes: 60,
  maxParticipants: 10,
  allowGuestJoin: true,
  requireApproval: false,
  hosts: [],
  emailInvites: [],
  interviewType: "Video",
  candidate: { id: "c1", name: "Alex Candidate", email: "alex@example.com" },
};

beforeEach(() => {
  api.updateMeeting.mockResolvedValue({});
  api.getInterviewEvaluations.mockResolvedValue({
    meetingId: "m1",
    rubric: RUBRIC,
    evaluations: [],
  });
  api.saveInterviewEvaluation.mockResolvedValue({
    id: "e1",
    meeting: "m1",
    evaluator: "u1",
    evaluatorName: "Host User",
    evaluatorEmail: "host@example.com",
    rubricTemplateName: "Default rubric",
    ratings: [{ key: "communication", rating: 4, notApplicable: false }],
    comment: "",
    weightedScore: 75,
    coveragePct: 100,
    scoredCount: 1,
    totalCount: 1,
    isComplete: true,
    submittedAt: "2026-09-18T10:39:09.714Z",
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("InterviewHostResultOverlay", () => {
  it("renders outcome choices for the host", () => {
    render(
      <InterviewHostResultOverlay
        meeting={{
          id: "m1",
          meetingId: "room-1",
          title: "Backend Engineer",
          status: "ended",
          scheduledAt: new Date().toISOString(),
          durationMinutes: 60,
          maxParticipants: 10,
          allowGuestJoin: true,
          requireApproval: false,
          hosts: [],
          emailInvites: [],
          interviewType: "Video",
          candidate: { id: "c1", name: "Alex Candidate", email: "alex@example.com" },
        }}
        onDone={() => {}}
      />
    );

    expect(screen.getByRole("dialog", { name: /set interview result/i })).toBeInTheDocument();
    expect(screen.getByText("Backend Engineer · Alex Candidate")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /selected/i })).toBeInTheDocument();
  });

  it("scopes dark theme tokens for obsidian variant", () => {
    const { container } = render(
      <InterviewHostResultOverlay
        variant="obsidian"
        meeting={{
          id: "m1",
          meetingId: "room-1",
          title: "Instant Interview",
          status: "ended",
          scheduledAt: new Date().toISOString(),
          durationMinutes: 60,
          maxParticipants: 10,
          allowGuestJoin: true,
          requireApproval: false,
          hosts: [],
          emailInvites: [],
          interviewType: "Video",
          candidate: { id: "c1", name: "Prakhar Sharma", email: "p@example.com" },
        }}
        onDone={() => {}}
      />
    );

    const card = container.querySelector(".dark");
    expect(card).toBeTruthy();
    expect(screen.getByText("Instant Interview · Prakhar Sharma")).toHaveClass("dark:text-white/70");
  });

  it("calls onDone when skipping", () => {
    const onDone = vi.fn();
    render(
      <InterviewHostResultOverlay
        meeting={{
          id: "m1",
          meetingId: "room-1",
          title: "Interview",
          status: "ended",
          scheduledAt: new Date().toISOString(),
          durationMinutes: 60,
          maxParticipants: 10,
          allowGuestJoin: true,
          requireApproval: false,
          hosts: [],
          emailInvites: [],
          interviewType: "Video",
          candidate: { id: "c1", name: "Alex", email: "a@b.com" },
        }}
        onDone={onDone}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /skip for now/i }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  /**
   * The bug this guards: "Save result" recorded the outcome and closed, while the ratings
   * the host had just entered were never sent anywhere. Scores reached the database only
   * when somebody separately pressed the form's own button, so the Results tab came up
   * empty for almost every interview.
   */
  it("saves the scorecard before the outcome", async () => {
    render(<InterviewHostResultOverlay meeting={MEETING} onDone={() => {}} />);

    fireEvent.click(await screen.findByRole("button", { name: "Communication: 4" }));
    fireEvent.click(screen.getByRole("button", { name: /save result/i }));

    await waitFor(() => expect(api.saveInterviewEvaluation).toHaveBeenCalledTimes(1));
    expect(api.saveInterviewEvaluation).toHaveBeenCalledWith("m1", {
      ratings: [{ key: "communication", rating: 4, notApplicable: false }],
      comment: "",
    });
    await waitFor(() => expect(api.updateMeeting).toHaveBeenCalledTimes(1));
    expect(api.saveInterviewEvaluation.mock.invocationCallOrder[0]).toBeLessThan(
      api.updateMeeting.mock.invocationCallOrder[0]
    );
  });

  /** A scorecard that will not save must block the close, not be discarded by it. */
  it("does not record the outcome when the scorecard fails to save", async () => {
    const onDone = vi.fn();
    api.saveInterviewEvaluation.mockRejectedValue(new Error("network down"));

    render(<InterviewHostResultOverlay meeting={MEETING} onDone={onDone} />);

    fireEvent.click(await screen.findByRole("button", { name: "Communication: 4" }));
    fireEvent.click(screen.getByRole("button", { name: /save result/i }));

    await waitFor(() => expect(api.saveInterviewEvaluation).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText("network down")).toBeInTheDocument());
    expect(api.updateMeeting).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });
});
