import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetFeatureFlagCache, useFeatureFlag } from "../useFeatureFlag";

describe("useFeatureFlag", () => {
  beforeEach(() => {
    __resetFeatureFlagCache();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("uses env seed before fetch resolves", () => {
    process.env.NEXT_PUBLIC_TASKBOARD_V2 = "true";
    const { result } = renderHook(() => useFeatureFlag("taskboard-v2"));
    expect(result.current).toBe(true);
    delete process.env.NEXT_PUBLIC_TASKBOARD_V2;
  });

  it("updates when fetch returns enabled", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ enabled: true, rollout: "all" }),
      })
    );

    const { result } = renderHook(() => useFeatureFlag("taskboard-v2"));
    await waitFor(() => expect(result.current).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/feature-flags/taskboard-v2",
      expect.objectContaining({ credentials: "include" })
    );
  });
});
