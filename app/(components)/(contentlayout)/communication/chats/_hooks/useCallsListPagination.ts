import { useCallback, useEffect, useRef, useState } from "react";
import { listCalls, type ChatCall } from "@/shared/lib/api/chat";
import { CALLS_TAB_PAGE_LIMIT, callsSearchParam } from "../_lib/callsListQuery";

function isAbortError(err: unknown) {
  const code = (err as { code?: string; name?: string } | null)?.code;
  const name = (err as { name?: string } | null)?.name;
  return code === "ERR_CANCELED" || name === "CanceledError" || name === "AbortError";
}

export function useCallsListPagination({
  enabled = true,
  page = 1,
  q = "",
}: {
  enabled?: boolean;
  page?: number;
  q?: string;
} = {}) {
  const [calls, setCalls] = useState<ChatCall[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(false);
  const fetchSeqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const fetchPage = useCallback(
    async (targetPage: number) => {
      if (!enabled) return;
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const seq = ++fetchSeqRef.current;
      setLoading(true);
      setError(false);
      try {
        const searchQ = callsSearchParam(q);
        const res = await listCalls(
          {
            page: targetPage,
            limit: CALLS_TAB_PAGE_LIMIT,
            ...(searchQ ? { q: searchQ } : {}),
          },
          { signal: ac.signal }
        );
        if (seq !== fetchSeqRef.current) return;
        setCalls(res.results || []);
        setTotalPages(res.totalPages ?? 1);
        setTotal(res.total ?? (res.results || []).length);
      } catch (err) {
        if (isAbortError(err) || ac.signal.aborted) return;
        if (seq !== fetchSeqRef.current) return;
        setCalls([]);
        setTotalPages(1);
        setTotal(0);
        setError(true);
      } finally {
        if (seq === fetchSeqRef.current) setLoading(false);
      }
    },
    [enabled, q]
  );

  useEffect(() => {
    if (!enabled) return;
    void fetchPage(page);
    return () => abortRef.current?.abort();
  }, [enabled, page, q, fetchPage]);

  return { calls, totalPages, total, loading, error, refresh: () => fetchPage(page) };
}
