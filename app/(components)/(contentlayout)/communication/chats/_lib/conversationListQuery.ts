export const CONVERSATION_SEARCH_DEBOUNCE_MS = 300;
export const CONVERSATION_LIST_PAGE_LIMIT = 50;
export const CONVERSATION_SEARCH_MIN_LENGTH = 2;

export type ConversationListQuery = {
  q: string;
  page: number;
  conv: string | null;
};

export function parseConversationListQuery(
  searchParams: Pick<URLSearchParams, "get">
): ConversationListQuery {
  const q = (searchParams.get("q") ?? "").trim();
  const rawPage = Number.parseInt(searchParams.get("page") ?? "", 10);
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
  const convRaw = (searchParams.get("conv") ?? "").trim();
  return { q, page, conv: convRaw || null };
}

/** Value to send as `q` on GET /chats/conversations. Omit when empty or shorter than min. */
export function conversationSearchParam(q: string | null | undefined): string | undefined {
  const term = (q || "").trim();
  return term.length >= CONVERSATION_SEARCH_MIN_LENGTH ? term : undefined;
}

export function buildConversationListSearch(
  current: { toString: () => string; get: (key: string) => string | null },
  patch: Partial<ConversationListQuery>
): string {
  const sp = new URLSearchParams(current.toString());
  const next: ConversationListQuery = {
    ...parseConversationListQuery(sp),
    ...patch,
  };
  if (next.q) sp.set("q", next.q);
  else sp.delete("q");
  if (next.page > 1) sp.set("page", String(next.page));
  else sp.delete("page");
  if (next.conv) sp.set("conv", next.conv);
  else sp.delete("conv");
  return sp.toString();
}
