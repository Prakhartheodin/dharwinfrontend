import { describe, it, expect } from "vitest";
import { isAiNudge } from "../notification-utils";

describe("isAiNudge", () => {
  it("is true only for smart_nudge", () => {
    expect(isAiNudge("smart_nudge")).toBe(true);
    expect(isAiNudge("meeting_reminder")).toBe(false);
    expect(isAiNudge(undefined)).toBe(false);
  });
});
