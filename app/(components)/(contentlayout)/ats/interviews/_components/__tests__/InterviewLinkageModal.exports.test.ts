/** @vitest-environment jsdom */
/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import InterviewLinkageModal, { InterviewLinkageBadge } from "../InterviewLinkageModal";

describe("InterviewLinkageModal exports", () => {
  it("default-exports the modal component for detail and list clients", () => {
    expect(typeof InterviewLinkageModal).toBe("function");
    expect(typeof InterviewLinkageBadge).toBe("function");
  });
});
