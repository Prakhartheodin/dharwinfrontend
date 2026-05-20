import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { trackTaskBoard } from "../telemetry";

describe("telemetry", () => {
  beforeEach(() => {
    vi.spyOn(console, "debug").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("tracks via __analytics when present", () => {
    const track = vi.fn();
    (window as Window & { __analytics?: { track: typeof track } }).__analytics = { track };
    trackTaskBoard("taskboard.viewed", { boardVersion: "v2" });
    expect(track).toHaveBeenCalledWith("taskboard.viewed", expect.objectContaining({ boardVersion: "v2" }));
  });
});
