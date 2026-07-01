import { useEffect, useState } from "react";

export type ContactListView = "contacts" | "favorites";
export type ContactParams = { q?: string; favorite?: true; limit: number };

export function normalizeQuery(q: string): string {
  return String(q ?? "").trim();
}

export function buildContactParams(view: ContactListView, q: string): ContactParams {
  const params: ContactParams = { limit: 50 };
  const term = normalizeQuery(q);
  if (term) params.q = term;
  if (view === "favorites") params.favorite = true;
  return params;
}

// ponytail: no repo debounce hook exists — 6-line local one, swap for a shared hook if one lands.
export function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
