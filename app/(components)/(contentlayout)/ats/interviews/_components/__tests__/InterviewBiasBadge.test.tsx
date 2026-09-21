import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { biasBadgePresentation } from "../interviewBiasUi";
import InterviewBiasBadge from "../InterviewBiasBadge";

describe("biasBadgePresentation", () => {
  it("labels ready risk levels without leaking quotes", () => {
    expect(biasBadgePresentation({ status: "ready", riskLevel: "high" }).label).toBe("High bias");
    expect(biasBadgePresentation({ status: "ready", riskLevel: "medium" }).label).toBe("Med bias");
    expect(biasBadgePresentation({ status: "skipped", riskLevel: null }).ariaLabel).toMatch(/skipped/i);
  });
});

describe("InterviewBiasBadge", () => {
  it("opens the review when clicked", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(
      <InterviewBiasBadge summary={{ status: "ready", riskLevel: "medium" }} onOpen={onOpen} />
    );
    await user.click(screen.getByRole("button", { name: /open bias review, medium risk/i }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
