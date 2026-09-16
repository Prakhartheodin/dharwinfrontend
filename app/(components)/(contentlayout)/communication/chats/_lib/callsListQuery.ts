export const CALLS_TAB_SEARCH_DEBOUNCE_MS = 300;
export const CALLS_TAB_SEARCH_MIN_LENGTH = 2;
export const CALLS_TAB_PAGE_LIMIT = 30;

export type CallsListQuery = {
  callQ: string;
  callPage: number;
};

export function parseCallsListQuery(
  searchParams: Pick<URLSearchParams, "get">
): CallsListQuery {
  const callQ = (searchParams.get("callQ") ?? "").trim();
  const rawPage = Number.parseInt(searchParams.get("callPage") ?? "", 10);
  const callPage = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
  return { callQ, callPage };
}

export function callsSearchParam(q: string | null | undefined): string | undefined {
  const term = (q || "").trim();
  return term.length >= CALLS_TAB_SEARCH_MIN_LENGTH ? term : undefined;
}

export function buildCallsListSearch(
  current: { toString: () => string; get: (key: string) => string | null },
  patch: Partial<CallsListQuery>
): string {
  const sp = new URLSearchParams(current.toString());
  const next: CallsListQuery = { ...parseCallsListQuery(sp), ...patch };
  if (next.callQ) sp.set("callQ", next.callQ);
  else sp.delete("callQ");
  if (next.callPage > 1) sp.set("callPage", String(next.callPage));
  else sp.delete("callPage");
  return sp.toString();
}
