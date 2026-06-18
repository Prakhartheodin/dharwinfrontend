"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listUsers } from "@/shared/lib/api/users";
import type { User } from "@/shared/lib/types";

interface SalesAgentFilterSelectProps {
  value: string;
  unassigned: boolean;
  onChange: (next: { salesAgentUserId: string; unassigned: boolean }) => void;
}

const labelOf = (u: User) => u.name?.trim() || u.email || u.id;

/**
 * Single searchable dropdown for the "Assigned sales agent" filter: the search box lives inside the
 * open panel (no separate field). Server-searches active sales agents as you type.
 */
export function SalesAgentFilterSelect({ value, unassigned, onChange }: SalesAgentFilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  // Remember the chosen agent's label so the trigger shows a name even after the hit list changes.
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const fetchAgents = useCallback(async (search: string) => {
    setLoading(true);
    try {
      const res = await listUsers({
        search: search.trim() || undefined,
        limit: 40,
        page: 1,
        status: "active",
        role: "sales_agent",
      });
      setHits(res.results ?? []);
    } catch {
      setHits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch (debounced) only while open.
  useEffect(() => {
    if (!open) return;
    const delay = query.trim() === "" ? 0 : 300;
    const t = window.setTimeout(() => void fetchAgents(query), delay);
    return () => window.clearTimeout(t);
  }, [open, query, fetchAgents]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const triggerLabel = unassigned
    ? "Unassigned"
    : value
      ? selectedLabel ?? "Selected agent"
      : "All sales agents";

  const choose = (next: { salesAgentUserId: string; unassigned: boolean }, label: string | null) => {
    setSelectedLabel(label);
    onChange(next);
    setOpen(false);
    setQuery("");
  };

  const isSelected = (id: string) => !unassigned && value === id;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="form-select form-select-sm w-full text-start"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={value || unassigned ? "" : "text-slate-400"}>{triggerLabel}</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full min-w-[220px] rounded-lg border border-slate-200 bg-white shadow-lg dark:border-white/10 dark:bg-bgdark2">
          <div className="p-2">
            <input
              autoFocus
              className="form-control form-control-sm w-full"
              placeholder="Search sales agents…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <ul className="max-h-60 overflow-auto pb-1" role="listbox">
            <li>
              <button
                type="button"
                className={`block w-full px-3 py-1.5 text-start text-sm hover:bg-slate-100 dark:hover:bg-white/10 ${
                  !value && !unassigned ? "font-semibold text-primary" : "text-slate-700 dark:text-slate-200"
                }`}
                onClick={() => choose({ salesAgentUserId: "", unassigned: false }, null)}
              >
                All sales agents
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`block w-full px-3 py-1.5 text-start text-sm hover:bg-slate-100 dark:hover:bg-white/10 ${
                  unassigned ? "font-semibold text-primary" : "text-slate-700 dark:text-slate-200"
                }`}
                onClick={() => choose({ salesAgentUserId: "", unassigned: true }, null)}
              >
                Unassigned
              </button>
            </li>
            {loading && hits.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-400">Loading…</li>
            ) : hits.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-400">No agents found</li>
            ) : (
              hits.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    className={`block w-full truncate px-3 py-1.5 text-start text-sm hover:bg-slate-100 dark:hover:bg-white/10 ${
                      isSelected(u.id) ? "font-semibold text-primary" : "text-slate-700 dark:text-slate-200"
                    }`}
                    onClick={() => choose({ salesAgentUserId: u.id, unassigned: false }, labelOf(u))}
                  >
                    {labelOf(u)}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
