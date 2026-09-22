import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AxiosRequestConfig } from "axios";

import { apiClient, setSessionExpiredHandler } from "../api/client";

/**
 * Drives the 401 interceptor with a stub adapter.
 *
 * `refreshOutcome` decides whether `POST /auth/refresh-tokens` succeeds. Every other
 * path 401s once and then succeeds, which is what an expired access token looks like.
 */
function installAdapter(refreshOutcome: "ok" | "fail") {
  const refreshCalls: string[] = [];
  const seen = new Set<string>();

  apiClient.defaults.adapter = (async (config: AxiosRequestConfig) => {
    const url = config.url ?? "";

    if (url.includes("refresh-tokens")) {
      refreshCalls.push(url);
      if (refreshOutcome === "fail") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err: any = new Error("refresh rejected");
        err.response = { status: 401, data: {}, config, headers: {}, statusText: "" };
        err.config = config;
        err.isAxiosError = true;
        throw err;
      }
      return { status: 200, data: {}, config, headers: {}, statusText: "OK" };
    }

    if (!seen.has(url)) {
      seen.add(url);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = new Error("unauthorized");
      err.response = { status: 401, data: {}, config, headers: {}, statusText: "" };
      err.config = config;
      err.isAxiosError = true;
      throw err;
    }
    return { status: 200, data: { url }, config, headers: {}, statusText: "OK" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

  return refreshCalls;
}

describe("apiClient 401 refresh", () => {
  beforeEach(() => {
    setSessionExpiredHandler(() => {});
  });

  it("refreshes once when several requests 401 at the same time", async () => {
    const refreshCalls = installAdapter("ok");

    const results = await Promise.all([
      apiClient.get("/training-modules"),
      apiClient.get("/categories"),
      apiClient.get("/auth/my-permissions"),
    ]);

    // Refresh tokens rotate, so a second concurrent refresh presents an already
    // consumed token and signs the user out. One shared refresh, not one per request.
    expect(refreshCalls).toHaveLength(1);
    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
  });

  it("signs out once and rejects every caller when the shared refresh fails", async () => {
    const refreshCalls = installAdapter("fail");
    const onExpired = vi.fn();
    setSessionExpiredHandler(onExpired);

    const settled = await Promise.allSettled([
      apiClient.get("/training-modules"),
      apiClient.get("/categories"),
    ]);

    expect(refreshCalls).toHaveLength(1);
    expect(settled.every((s) => s.status === "rejected")).toBe(true);
    expect(onExpired).toHaveBeenCalled();
  });

  it("starts a fresh refresh for a later 401 instead of reusing the settled one", async () => {
    const refreshCalls = installAdapter("ok");

    await apiClient.get("/first");
    await apiClient.get("/second");

    expect(refreshCalls).toHaveLength(2);
  });
});
