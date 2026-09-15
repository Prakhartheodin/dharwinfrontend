import { useCallback, useEffect, useRef, useState } from "react";
import { listConversations, type Conversation } from "@/shared/lib/api/chat";
import {
  CONVERSATION_LIST_PAGE_LIMIT,
  conversationSearchParam,
} from "../_lib/conversationListQuery";

export const CONVERSATIONS_PAGE_LIMIT = CONVERSATION_LIST_PAGE_LIMIT;

export type ConversationListType = "direct" | "group" | undefined;

type FetchMode = "initial" | "refresh";

export type UseConversationListPaginationArgs = {
  type?: ConversationListType;
  enabled?: boolean;
  page?: number;
  q?: string;
};

const getConversationId = (conversation: Conversation) =>
  String((conversation as { id?: string }).id || (conversation as { _id?: string })._id || "");

function isAbortError(err: unknown) {
  const code = (err as { code?: string; name?: string } | null)?.code;
  const name = (err as { name?: string } | null)?.name;
  return code === "ERR_CANCELED" || name === "CanceledError" || name === "AbortError";
}

export function useConversationListPagination({
  type,
  enabled = true,
  page: requestedPage = 1,
  q = "",
}: UseConversationListPaginationArgs = {}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [page, setPage] = useState(requestedPage);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(false);

  const fetchSeqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const fetchPage = useCallback(
    async (targetPage: number, _mode: FetchMode) => {
      if (!enabled) return;

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const seq = ++fetchSeqRef.current;
      setLoading(true);
      setError(false);

      try {
        const searchQ = conversationSearchParam(q);
        const res = await listConversations(
          {
            page: targetPage,
            limit: CONVERSATIONS_PAGE_LIMIT,
            ...(type ? { type } : {}),
            ...(searchQ ? { q: searchQ } : {}),
          },
          { signal: ac.signal }
        );
        if (seq !== fetchSeqRef.current) return;

        const next = res.results || [];
        const nextPage = res.page ?? targetPage;
        const nextTotalPages = res.totalPages ?? 1;
        const nextTotal = res.total ?? 0;

        setPage(nextPage);
        setTotalPages(nextTotalPages);
        setTotal(nextTotal);
        setConversations(next);
      } catch (err) {
        if (isAbortError(err) || ac.signal.aborted) return;
        if (seq !== fetchSeqRef.current) return;
        setConversations([]);
        setPage(1);
        setTotalPages(1);
        setTotal(0);
        setError(true);
      } finally {
        if (seq === fetchSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [enabled, type, q]
  );

  const refresh = useCallback(async () => {
    await fetchPage(requestedPage, "refresh");
  }, [fetchPage, requestedPage]);

  useEffect(() => {
    if (!enabled) return;
    void fetchPage(requestedPage, "initial");
    return () => {
      abortRef.current?.abort();
    };
  }, [enabled, type, q, requestedPage, fetchPage]);

  return {
    conversations,
    setConversations,
    page,
    totalPages,
    total,
    loading,
    error,
    refresh,
  };
}

export { getConversationId };
