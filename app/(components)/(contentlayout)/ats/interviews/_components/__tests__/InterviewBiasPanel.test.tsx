import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InterviewBiasPanel from "../InterviewBiasPanel";
import type { InterviewBiasCheck } from "@/shared/lib/api/meetings";

vi.mock("@/shared/lib/api/meetings", () => ({
  getInterviewBiasCheck: vi.fn(),
  rerunInterviewBiasCheck: vi.fn(),
}));

import { getInterviewBiasCheck, rerunInterviewBiasCheck } from "@/shared/lib/api/meetings";

const getMock = vi.mocked(getInterviewBiasCheck);
const rerunMock = vi.mocked(rerunInterviewBiasCheck);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/**
 * @param {Partial<InterviewBiasCheck>} overrides
 * @returns {InterviewBiasCheck}
 */
function report(overrides: Partial<InterviewBiasCheck> = {}): InterviewBiasCheck {
  return {
    status: "ready",
    skipReason: null,
    skipReasonLabel: null,
    riskLevel: "low",
    flags: [],
    evidence: [],
    reasons: [],
    advisoryNotice: "A human makes the final decision.",
    model: "gpt-4o-mini",
    promptVersion: "bias-v1",
    analyzedAt: "2026-09-18T10:00:00.000Z",
    ...overrides,
  };
}

describe("InterviewBiasPanel", () => {
  beforeEach(() => {
    getMock.mockResolvedValue(report());
  });

  it("shows skip copy when analysis cannot run", async () => {
    getMock.mockResolvedValue(
      report({
        status: "skipped",
        skipReason: "no_transcript",
        skipReasonLabel: "Can't analyze — no interview recording transcript.",
        riskLevel: null,
      })
    );
    render(<InterviewBiasPanel meetingId="abc" canRerun={false} />);
    expect(await screen.findByText(/Can't analyze — no interview recording transcript/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /re-run/i })).not.toBeInTheDocument();
  });

  it("shows a high-risk banner that does not claim to change the result", async () => {
    getMock.mockResolvedValue(
      report({
        riskLevel: "high",
        flags: [{ category: "protected_class", label: "Age comment in scorecard" }],
        evidence: [{ quote: "too old for this team", source: "scorecard_comment" }],
      })
    );
    render(<InterviewBiasPanel meetingId="abc" canRerun />);
    expect(
      await screen.findByText(/Review before you decide — this does not change the result/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/high risk/i)).toBeInTheDocument();
  });

  it("hides the panel on 403 so view-only staff do not see quotes", async () => {
    getMock.mockRejectedValue({ response: { status: 403 } });
    const { container } = render(<InterviewBiasPanel meetingId="abc" canRerun />);
    await waitFor(() => {
      expect(container).toBeEmptyDOMElement();
    });
  });

  it("shows a permission message in the drawer when forbidden", async () => {
    getMock.mockRejectedValue({ response: { status: 403 } });
    render(<InterviewBiasPanel meetingId="abc" canRerun hideWhenForbidden={false} />);
    expect(await screen.findByText(/don't have permission to view this bias review/i)).toBeInTheDocument();
  });

  it("shows failed copy without a fake risk chip", async () => {
    getMock.mockResolvedValue(
      report({
        status: "failed",
        skipReason: null,
        skipReasonLabel: null,
        riskLevel: null,
      })
    );
    render(<InterviewBiasPanel meetingId="abc" canRerun />);
    expect(await screen.findByText(/Automatic bias review failed/i)).toBeInTheDocument();
    expect(screen.queryByText(/high risk/i)).not.toBeInTheDocument();
  });

  it("does not show the high banner for low risk", async () => {
    getMock.mockResolvedValue(report({ riskLevel: "low" }));
    render(<InterviewBiasPanel meetingId="abc" canRerun />);
    expect(await screen.findByText(/low risk/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/Review before you decide — this does not change the result/i)
    ).not.toBeInTheDocument();
  });

  it("gates Re-run on canRerun and calls the rerun API", async () => {
    rerunMock.mockResolvedValue(report({ status: "pending", riskLevel: null }));
    const user = userEvent.setup();
    render(<InterviewBiasPanel meetingId="mtg1" canRerun />);
    const btn = await screen.findByRole("button", { name: /re-run bias review/i });
    await user.click(btn);
    await waitFor(() => {
      expect(rerunMock).toHaveBeenCalledWith("mtg1");
    });
  });
});
