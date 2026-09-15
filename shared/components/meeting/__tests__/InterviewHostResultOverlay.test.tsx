import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import InterviewHostResultOverlay from "../InterviewHostResultOverlay";

vi.mock("@/shared/lib/api/meetings", () => ({
  updateMeeting: vi.fn().mockResolvedValue({}),
}));

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
});
