export const CONVERSATION_SEARCH_MAX_LEN = 100;

export function parseConversationListPage(raw: string | null | undefined): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return 1;
  return n;
}

export function parseConversationListQ(raw: string | null | undefined): string {
  return String(raw ?? "").trim().slice(0, CONVERSATION_SEARCH_MAX_LEN);
}

export function applyConversationListParams(
  current: URLSearchParams,
  next: { page: number; q: string }
): URLSearchParams {
  const params = new URLSearchParams(current.toString());
  if (next.page <= 1) params.delete("page");
  else params.set("page", String(next.page));
  const q = parseConversationListQ(next.q);
  if (!q) params.delete("q");
  else params.set("q", q);
  return params;
}
