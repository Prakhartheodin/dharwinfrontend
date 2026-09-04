"use client";

import React, { useCallback, useEffect, useState } from "react";
import ListPagination from "@/shared/components/ListPagination";
import { listShiftAssignees, type ShiftAssigneePerson } from "@/shared/lib/api/shifts";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;
const ROSTER_SEARCH_ID = "assign-shift-roster-search";

type ShiftAssigneeRosterProps = {
  shiftId: string;
  shiftName: string;
  refreshToken: number;
};

function personKey(person: ShiftAssigneePerson): string {
  return `${person.studentId ?? ""}:${person.candidateId ?? ""}:${person.email}`;
}

function errMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string } | undefined;
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function ShiftAssigneeRoster({
  shiftId,
  shiftName,
  refreshToken,
}: ShiftAssigneeRosterProps) {
  const [people, setPeople] = useState<ShiftAssigneePerson[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const shiftLabel = shiftName || "this shift";

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setPage(1);
    setQuery("");
    setDebouncedQuery("");
  }, [shiftId]);

  const fetchAssignees = useCallback(async (id: string, nextPage: number, search: string) => {
    const resetList = () => {
      setPeople([]);
      setTotalPages(0);
      setTotalResults(0);
    };
    if (!id) {
      resetList();
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listShiftAssignees(id, { page: nextPage, limit: PAGE_SIZE, search });
      setPeople(result.people);
      setPage(result.page);
      setTotalPages(result.totalPages);
      setTotalResults(result.totalResults);
    } catch (err: unknown) {
      setError(errMessage(err, "Failed to load assigned people"));
      resetList();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAssignees(shiftId, page, debouncedQuery);
  }, [shiftId, page, debouncedQuery, refreshToken, fetchAssignees]);

  if (!shiftId) {
    return (
      <div className="rounded-xl border border-dashed border-defaultborder/80 px-4 py-10 text-center">
        <p className="text-sm font-medium text-defaulttextcolor dark:text-white">
          Choose a shift to see who’s assigned.
        </p>
      </div>
    );
  }

  let results: React.ReactNode = null;
  if (loading) {
    results = (
      <div className="overflow-hidden rounded-xl border border-defaultborder/70">
        <div className="border-b border-defaultborder/60 bg-slate-50/80 px-5 py-3.5 dark:bg-white/[0.04]">
          <div className="h-3 w-40 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
        </div>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-4 border-b border-defaultborder/50 px-5 py-4 last:border-b-0">
            <div className="h-4 w-36 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
            <div className="h-4 flex-1 animate-pulse rounded bg-slate-100 dark:bg-white/5" />
          </div>
        ))}
      </div>
    );
  } else if (people.length > 0) {
    results = (
      <div className="overflow-x-auto rounded-xl border border-defaultborder/70">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="border-b border-defaultborder/60 bg-slate-50/80 dark:bg-white/[0.04]">
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70">
                Name
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70">
                Email / ID
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70">
                Type
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-defaultborder/50">
            {people.map((person) => (
              <tr key={personKey(person)} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02]">
                <td className="px-5 py-4 font-medium text-defaulttextcolor dark:text-white">
                  {person.name || "Unnamed"}
                </td>
                <td className="px-5 py-4 text-sm text-defaulttextcolor/85">
                  <span className="block" title={person.email}>
                    {person.email}
                  </span>
                  {person.employeeId ? (
                    <span className="text-xs text-defaulttextcolor/55">{person.employeeId}</span>
                  ) : null}
                </td>
                <td className="px-5 py-4 text-sm text-defaulttextcolor/70">{person.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } else if (!error) {
    results = (
      <div className="rounded-xl border border-dashed border-defaultborder/80 px-4 py-10 text-center">
        <p className="text-sm font-medium text-defaulttextcolor dark:text-white">
          {debouncedQuery
            ? `No one matching “${debouncedQuery}” is assigned to ${shiftLabel}.`
            : `No one is assigned to ${shiftLabel}. Assign people above.`}
        </p>
        <p className="mt-1 text-xs text-defaulttextcolor/60">
          {debouncedQuery ? "Try a different name or email." : "Switch to Assign to add people, or pick another shift."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <label htmlFor={ROSTER_SEARCH_ID} className="relative block w-full sm:max-w-xs">
          <span className="sr-only">Search people assigned to {shiftLabel}</span>
          <i
            className="ri-search-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-defaulttextcolor/40"
            aria-hidden
          />
          <input
            id={ROSTER_SEARCH_ID}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, email, or ID…"
            className="min-h-11 w-full rounded-xl border border-defaultborder/80 bg-white py-2 pl-9 pr-3 text-sm text-defaulttextcolor outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-white/5 dark:text-white"
          />
        </label>
      </div>

      {error && (
        <div
          className="flex flex-col gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void fetchAssignees(shiftId, page, debouncedQuery)}
            className="min-h-11 shrink-0 rounded-lg px-3 text-sm font-medium text-danger underline"
          >
            Retry
          </button>
        </div>
      )}

      {results}

      <ListPagination
        page={page}
        totalPages={totalPages}
        totalResults={totalResults}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        ariaLabel="Assigned people page navigation"
        gotoInputId="assign-shift-roster-goto-page"
      />
    </div>
  );
}
