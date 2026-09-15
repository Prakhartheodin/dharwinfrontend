import { useCallback, useEffect, useRef, useState } from "react";
import { listConversations, type Conversation } from "@/shared/lib/api/chat";
import { parseConversationListQ } from "../_lib/conversationListQuery";

export const CONVERSATIONS_PAGE_LIMIT = 50;

export type ConversationListType = "direct" | "group" | undefined;

type FetchMode = "initial" | "refresh";

export function useConversationListPagination(
  type?: ConversationListType,
  enabled = true,
  query: { page?: number; q?: string } = {}
) {
  const page = query.page && query.page > 0 ? query.page : 1;
  const q = parseConversationListQ(query.q);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(enabled);

  const fetchSeqRef = useRef(0);

  const fetchPage = useCallback(
    async (targetPage: number, mode: FetchMode) => {
      if (!enabled) return;

      const seq = ++fetchSeqRef.current;
      if (mode === "initial") setLoading(true);

      try {
        const res = await listConversations({
          page: targetPage,
          limit: CONVERSATIONS_PAGE_LIMIT,
          ...(type ? { type } : {}),
          ...(q ? { q } : {}),
        });
        if (seq !== fetchSeqRef.current) return;

        setTotalPages(res.totalPages ?? 1);
        setTotal(res.total ?? 0);
        setConversations(res.results || []);
      } catch {
        if (seq !== fetchSeqRef.current) return;
        setConversations([]);
        setTotalPages(1);
        setTotal(0);
      } finally {
        if (seq === fetchSeqRef.current) setLoading(false);
      }
    },
    [enabled, type, q]
  );

  const refresh = useCallback(async () => {
    await fetchPage(page, "refresh");
  }, [fetchPage, page]);

  useEffect(() => {
    if (!enabled) return;
    void fetchPage(page, "initial");
  }, [enabled, type, fetchPage, page]);

  return {
    conversations,
    setConversations,
    page,
    totalPages,
    total,
    loading,
    refresh,
  };
}
