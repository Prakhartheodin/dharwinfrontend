import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useConversationListPagination } from "./useConversationListPagination";

const listConversations = vi.fn();

vi.mock("@/shared/lib/api/chat", () => ({
  listConversations: (...args: unknown[]) => listConversations(...args),
}));

function makeConversation(id: string, type: "direct" | "group" = "direct") {
  return { id, type, name: type === "group" ? `Group ${id}` : undefined };
}

describe("useConversationListPagination", () => {
  beforeEach(() => {
    listConversations.mockReset();
  });

  it("fetches recent conversations page 1 on mount", async () => {
    listConversations.mockResolvedValueOnce({
      results: [makeConversation("c1")],
      page: 1,
      limit: 50,
      total: 1,
      totalPages: 1,
    });

    const { result } = renderHook(() => useConversationListPagination());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(listConversations).toHaveBeenCalledWith({ page: 1, limit: 50 }, expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(result.current.conversations).toHaveLength(1);
  });

  it("sends q and requested page", async () => {
    listConversations.mockResolvedValue({
      results: [makeConversation("c1")],
      page: 2,
      limit: 50,
      total: 60,
      totalPages: 2,
    });

    const { result } = renderHook(() =>
      useConversationListPagination({ page: 2, q: "eng" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(listConversations).toHaveBeenCalledWith(
      { page: 2, limit: 50, q: "eng" },
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(result.current.page).toBe(2);
  });

  it("omits q shorter than 2 characters", async () => {
    listConversations.mockResolvedValue({
      results: [],
      page: 1,
      limit: 50,
      total: 0,
      totalPages: 1,
    });

    renderHook(() => useConversationListPagination({ q: "a" }));
    await waitFor(() => expect(listConversations).toHaveBeenCalled());
    expect(listConversations).toHaveBeenCalledWith(
      { page: 1, limit: 50 },
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("requests type=group for the groups dataset", async () => {
    listConversations.mockResolvedValue({
      results: [makeConversation("g1", "group")],
      page: 1,
      limit: 50,
      total: 1,
      totalPages: 1,
    });

    const { result } = renderHook(() =>
      useConversationListPagination({ type: "group", enabled: true })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(listConversations).toHaveBeenCalledWith(
      { page: 1, limit: 50, type: "group" },
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(result.current.conversations[0].type).toBe("group");
  });

  it("replaces an in-flight fetch when q changes instead of dropping the second call", async () => {
    let resolveFirst: ((value: unknown) => void) | undefined;
    const firstSignalHolders: AbortSignal[] = [];
    listConversations
      .mockImplementationOnce((_params, options: { signal?: AbortSignal }) => {
        if (options?.signal) firstSignalHolders.push(options.signal);
        return new Promise((resolve) => {
          resolveFirst = resolve;
        });
      })
      .mockResolvedValueOnce({
        results: [makeConversation("hit")],
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      });

    const { result, rerender } = renderHook(
      ({ q }: { q: string }) => useConversationListPagination({ q }),
      { initialProps: { q: "al" } }
    );

    await waitFor(() => expect(listConversations).toHaveBeenCalledTimes(1));

    rerender({ q: "alice" });
    await waitFor(() => expect(listConversations).toHaveBeenCalledTimes(2));

    expect(firstSignalHolders[0]?.aborted).toBe(true);

    await act(async () => {
      resolveFirst?.({
        results: [makeConversation("stale")],
        page: 1,
        limit: 50,
        total: 9,
        totalPages: 1,
      });
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.conversations.map((c) => c.id)).toEqual(["hit"]);
    expect(listConversations).toHaveBeenLastCalledWith(
      { page: 1, limit: 50, q: "alice" },
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("refresh replaces an in-flight initial fetch", async () => {
    let resolveFirst: ((value: unknown) => void) | undefined;
    listConversations
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockResolvedValueOnce({
        results: [makeConversation("fresh")],
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      });

    const { result } = renderHook(() => useConversationListPagination());
    await waitFor(() => expect(listConversations).toHaveBeenCalledTimes(1));

    await act(async () => {
      const refreshPromise = result.current.refresh();
      resolveFirst?.({
        results: [makeConversation("stale")],
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      });
      await refreshPromise;
    });

    expect(result.current.conversations.map((c) => c.id)).toEqual(["fresh"]);
  });

  it("surfaces a load error instead of looking empty", async () => {
    listConversations.mockRejectedValueOnce(new Error("network"));
    const { result } = renderHook(() => useConversationListPagination());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(true);
    expect(result.current.conversations).toEqual([]);
  });
});
