"use client";

import React, { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import ListPagination from "@/shared/components/ListPagination";
import {
  WEEK_OFF_DAY_ABBREV,
  WEEK_OFF_DAYS,
  listWeekOffAssignments,
  unassignWeekOffDay,
  type WeekOffAssignmentPerson,
} from "@/shared/lib/api/students";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

type WeekOffDayRosterProps = {
  selectedDay: string;
  onSelectedDayChange: (day: string) => void;
  dayCounts: Record<string, number>;
  refreshToken: number;
  onPersonWeekOffChanged?: () => void;
};

function personKey(person: WeekOffAssignmentPerson): string {
  return `${person.studentId ?? ""}:${person.candidateId ?? ""}:${person.email}`;
}

function otherDays(person: WeekOffAssignmentPerson, selectedDay: string): string[] {
  return person.weekOff.filter((day) => day !== selectedDay);
}

export default function WeekOffDayRoster({
  selectedDay,
  onSelectedDayChange,
  dayCounts,
  refreshToken,
  onPersonWeekOffChanged,
}: WeekOffDayRosterProps) {
  const [people, setPeople] = useState<WeekOffAssignmentPerson[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [unassigningKey, setUnassigningKey] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setPage(1);
    setQuery("");
    setDebouncedQuery("");
  }, [selectedDay]);

  const fetchAssignments = useCallback(
    async (day: string, nextPage: number, search: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await listWeekOffAssignments(day, {
          page: nextPage,
          limit: PAGE_SIZE,
          search,
        });
        setPeople(result.people);
        setPage(result.page);
        setTotalPages(result.totalPages);
        setTotalResults(result.totalResults);
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
            ?.message ??
          (err as { message?: string })?.message ??
          "Failed to load assignments";
        setError(msg);
        setPeople([]);
        setTotalPages(0);
        setTotalResults(0);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void fetchAssignments(selectedDay, page, debouncedQuery);
  }, [selectedDay, page, debouncedQuery, refreshToken, fetchAssignments]);

  const handleUnassign = async (person: WeekOffAssignmentPerson) => {
    const remaining = otherDays(person, selectedDay);
    const remainingText =
      remaining.length > 0
        ? `Remaining week-off: ${remaining.join(", ")}.`
        : "They will have no week-off days after this.";
    const confirmed = await Swal.fire({
      icon: "warning",
      title: `Remove ${selectedDay}?`,
      html: `<p class="mb-2">Unassign <strong>${person.name || person.email}</strong> from ${selectedDay} week-off.</p><p class="text-sm text-defaulttextcolor/70">${remainingText}</p>`,
      showCancelButton: true,
      confirmButtonText: `Unassign ${selectedDay}`,
      cancelButtonText: "Keep assigned",
      confirmButtonColor: "#dc2626",
      focusCancel: true,
    });
    if (!confirmed.isConfirmed) return;

    const key = personKey(person);
    setUnassigningKey(key);
    try {
      await unassignWeekOffDay({
        day: selectedDay,
        ...(person.studentId ? { studentId: person.studentId } : {}),
        ...(person.candidateId ? { candidateId: person.candidateId } : {}),
      });
      const nextPage = people.length === 1 && page > 1 ? page - 1 : page;
      if (nextPage !== page) setPage(nextPage);
      else await fetchAssignments(selectedDay, page, debouncedQuery);
      onPersonWeekOffChanged?.();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ??
        (err as { message?: string })?.message ??
        "Failed to unassign week-off";
      await Swal.fire({ icon: "error", title: "Could not unassign", text: msg, confirmButtonText: "OK" });
    } finally {
      setUnassigningKey(null);
    }
  };

  return (
    <div className="space-y-5">
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="mb-2 text-sm font-semibold text-defaulttextcolor dark:text-white">
          Week-off day
        </legend>
        <div
          className="inline-flex max-w-full flex-wrap rounded-xl border border-defaultborder/80 bg-white p-1 dark:bg-white/5"
          role="radiogroup"
          aria-label="Filter by week-off day"
        >
          {WEEK_OFF_DAYS.map((day) => {
            const isSelected = selectedDay === day;
            const count = dayCounts[day] ?? 0;
            return (
              <button
                key={day}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSelectedDayChange(day)}
                className={`min-h-11 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  isSelected
                    ? "bg-primary text-white shadow-sm"
                    : "text-defaulttextcolor hover:text-primary"
                }`}
              >
                <span className="md:hidden">{WEEK_OFF_DAY_ABBREV[day]}</span>
                <span className="hidden md:inline">{day}</span>
                <span
                  className={`ms-1.5 tabular-nums text-xs font-semibold ${
                    isSelected ? "text-white/80" : "text-defaulttextcolor/45"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <label className="relative block w-full sm:max-w-xs">
          <span className="sr-only">Search people with {selectedDay} week-off</span>
          <i
            className="ri-search-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-defaulttextcolor/40"
            aria-hidden
          />
          <input
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
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
          {error}
        </div>
      )}

      {loading ? (
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
      ) : people.length === 0 ? (
        <div className="rounded-xl border border-dashed border-defaultborder/80 px-4 py-10 text-center">
          <p className="text-sm font-medium text-defaulttextcolor dark:text-white">
            {debouncedQuery
              ? `No one matching “${debouncedQuery}” has ${selectedDay} off.`
              : `No one has ${selectedDay} as a week-off`}
          </p>
          <p className="mt-1 text-xs text-defaulttextcolor/60">
            {debouncedQuery ? "Try a different name or email." : "Switch to Assign to add people, or pick another day."}
          </p>
        </div>
      ) : (
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
                  Other days
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/70">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-defaultborder/50">
              {people.map((person) => {
                const key = personKey(person);
                const remaining = otherDays(person, selectedDay);
                const busy = unassigningKey === key;
                return (
                  <tr key={key} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02]">
                    <td className="px-5 py-4 font-medium text-defaulttextcolor">{person.name || "Unnamed"}</td>
                    <td className="px-5 py-4 text-sm text-defaulttextcolor/85">
                      <span className="block" title={person.email}>
                        {person.email}
                      </span>
                      {person.employeeId ? (
                        <span className="text-xs text-defaulttextcolor/55">{person.employeeId}</span>
                      ) : null}
                    </td>
                    <td className="px-5 py-4 text-sm text-defaulttextcolor/70">
                      {remaining.length ? remaining.join(", ") : "—"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => void handleUnassign(person)}
                        disabled={busy || (!person.studentId && !person.candidateId)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-danger hover:bg-danger/10 disabled:pointer-events-none disabled:opacity-50"
                        aria-label={`Unassign ${person.name || person.email} from ${selectedDay}`}
                        title={`Unassign ${selectedDay}`}
                      >
                        {busy ? (
                          <i className="ri-loader-4-line animate-spin text-lg" />
                        ) : (
                          <i className="ri-user-unfollow-line text-lg" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ListPagination
        page={page}
        totalPages={totalPages}
        totalResults={totalResults}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        ariaLabel="Who’s off page navigation"
        gotoInputId="week-off-roster-goto-page"
      />
    </div>
  );
}
