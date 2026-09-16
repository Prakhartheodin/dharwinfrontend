export const CALLING_SEARCH_DEBOUNCE_MS = 300;
export const CALLING_SEARCH_MIN_LENGTH = 2;

export type CallingSourceFilter = "all" | "ai_agent" | "telephony" | "in_app";

export type CallingListQuery = {
  q: string;
  page: number;
  source: CallingSourceFilter;
  status: string;
};

export function parseCallingListQuery(
  searchParams: Pick<URLSearchParams, "get">
): CallingListQuery {
  const q = (searchParams.get("q") ?? "").trim();
  const rawPage = Number.parseInt(searchParams.get("page") ?? "", 10);
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
  const sourceRaw = (searchParams.get("source") ?? "all").trim() as CallingSourceFilter;
  const source: CallingSourceFilter =
    sourceRaw === "ai_agent" || sourceRaw === "telephony" || sourceRaw === "in_app"
      ? sourceRaw
      : "all";
  const status = (searchParams.get("status") ?? "all").trim() || "all";
  return { q, page, source, status };
}

export function callingSearchParam(q: string | null | undefined): string | undefined {
  const term = (q || "").trim();
  return term.length >= CALLING_SEARCH_MIN_LENGTH ? term : undefined;
}

export function buildCallingListSearch(
  current: { toString: () => string; get: (key: string) => string | null },
  patch: Partial<CallingListQuery>
): string {
  const sp = new URLSearchParams(current.toString());
  const next: CallingListQuery = {
    ...parseCallingListQuery(sp),
    ...patch,
  };
  if (next.q) sp.set("q", next.q);
  else sp.delete("q");
  if (next.page > 1) sp.set("page", String(next.page));
  else sp.delete("page");
  if (next.source !== "all") sp.set("source", next.source);
  else sp.delete("source");
  if (next.status !== "all") sp.set("status", next.status);
  else sp.delete("status");
  return sp.toString();
}
