import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSalesAgentAttribution } from "../useSalesAgentAttribution";
import * as api from "../../api/salesAgentAttribution";

vi.mock("../../api/salesAgentAttribution", () => ({
  assignSalesAgent: vi.fn(),
  changeSalesAgent: vi.fn(),
  revokeSalesAgent: vi.fn(),
  pinAttributionJob: vi.fn(),
}));

describe("useSalesAgentAttribution", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("sets staleConflict on STALE_PRECONDITION", async () => {
    vi.mocked(api.changeSalesAgent).mockRejectedValue({
      response: { data: { code: "STALE_PRECONDITION", message: "Stale" } },
    });

    const { result } = renderHook(() => useSalesAgentAttribution());

    await act(async () => {
      try {
        await result.current.change("c1", {
          salesAgentUserId: "u2",
          expectedCurrentAttributionId: "a1",
        });
      } catch {
        /* expected */
      }
    });

    expect(result.current.staleConflict?.code).toBe("STALE_PRECONDITION");
    expect(result.current.error).toMatch(/Reassigned by another admin/i);
  });

  // Regression: modals put clearStaleConflict in their open/reset effect deps. If it
  // gets a fresh identity every render, that effect re-runs on every render and wipes
  // local form state — e.g. the sales agent you just clicked never stays selected.
  it("keeps clearStaleConflict referentially stable across renders", () => {
    const { result, rerender } = renderHook(() => useSalesAgentAttribution());
    const first = result.current.clearStaleConflict;
    rerender();
    rerender();
    expect(result.current.clearStaleConflict).toBe(first);
  });
});
