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
    expect(listConversations).toHaveBeenCalledWith({ page: 1, limit: 50 });
    expect(result.current.conversations).toHaveLength(1);
  });

  it("fetches the URL page without appending previous pages", async () => {
    listConversations.mockResolvedValue({
      results: [makeConversation("c2")],
      page: 2,
      limit: 50,
      total: 2,
      totalPages: 2,
    });

    const { result } = renderHook(() => useConversationListPagination(undefined, true, { page: 2 }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(listConversations).toHaveBeenCalledWith({ page: 2, limit: 50 });
    expect(result.current.conversations.map((c) => c.id)).toEqual(["c2"]);
    expect(result.current.page).toBe(2);
  });

  it("sends q to the server and resets to the filtered page", async () => {
    listConversations.mockResolvedValue({
      results: [makeConversation("g1", "group")],
      page: 1,
      limit: 50,
      total: 1,
      totalPages: 1,
    });

    const { result } = renderHook(() =>
      useConversationListPagination(undefined, true, { page: 1, q: "  engineering  " })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(listConversations).toHaveBeenCalledWith({ page: 1, limit: 50, q: "engineering" });
    expect(result.current.conversations).toHaveLength(1);
  });

  it("omits empty q from the request", async () => {
    listConversations.mockResolvedValue({
      results: [],
      page: 1,
      limit: 50,
      total: 0,
      totalPages: 1,
    });

    renderHook(() => useConversationListPagination(undefined, true, { page: 1, q: "   " }));
    await waitFor(() => expect(listConversations).toHaveBeenCalled());
    expect(listConversations).toHaveBeenCalledWith({ page: 1, limit: 50 });
  });

  it("requests type=group for the groups dataset", async () => {
    listConversations.mockResolvedValue({
      results: [makeConversation("g1", "group")],
      page: 1,
      limit: 50,
      total: 1,
      totalPages: 1,
    });

    const { result } = renderHook(() => useConversationListPagination("group", true, { page: 1, q: "eng" }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(listConversations).toHaveBeenCalledWith({ page: 1, limit: 50, type: "group", q: "eng" });
    expect(result.current.conversations[0].type).toBe("group");
  });

  it("keeps recent and group datasets separate", async () => {
    listConversations
      .mockResolvedValueOnce({
        results: [makeConversation("c1")],
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      })
      .mockResolvedValueOnce({
        results: [makeConversation("g1", "group")],
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      });

    const recent = renderHook(() => useConversationListPagination());
    const groups = renderHook(() => useConversationListPagination("group", true));

    await waitFor(() => expect(recent.result.current.loading).toBe(false));
    await waitFor(() => expect(groups.result.current.loading).toBe(false));

    expect(recent.result.current.conversations.map((c) => c.id)).toEqual(["c1"]);
    expect(groups.result.current.conversations.map((c) => c.id)).toEqual(["g1"]);
  });

  it("refetches the current URL page on refresh", async () => {
    listConversations
      .mockResolvedValueOnce({
        results: [makeConversation("c2")],
        page: 2,
        limit: 50,
        total: 2,
        totalPages: 2,
      })
      .mockResolvedValueOnce({
        results: [makeConversation("c2b")],
        page: 2,
        limit: 50,
        total: 2,
        totalPages: 2,
      });

    const { result } = renderHook(() => useConversationListPagination(undefined, true, { page: 2 }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.refresh();
    });

    expect(listConversations).toHaveBeenLastCalledWith({ page: 2, limit: 50 });
    expect(result.current.conversations.map((c) => c.id)).toEqual(["c2b"]);
  });

  it("refetches when the URL page changes and replaces the list", async () => {
    listConversations
      .mockResolvedValueOnce({
        results: [makeConversation("c1")],
        page: 1,
        limit: 50,
        total: 2,
        totalPages: 2,
      })
      .mockResolvedValueOnce({
        results: [makeConversation("c2")],
        page: 2,
        limit: 50,
        total: 2,
        totalPages: 2,
      });

    const { result, rerender } = renderHook(
      ({ page }: { page: number }) => useConversationListPagination(undefined, true, { page }),
      { initialProps: { page: 1 } }
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender({ page: 2 });
    await waitFor(() => expect(result.current.conversations.map((c) => c.id)).toEqual(["c2"]));
    expect(listConversations).toHaveBeenLastCalledWith({ page: 2, limit: 50 });
  });
});
