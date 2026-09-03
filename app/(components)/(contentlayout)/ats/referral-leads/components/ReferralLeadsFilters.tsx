"use client";

import { useEffect, useState } from "react";
import { STATUS_META } from "@/shared/lib/ats/referral-leads-constants";
import { SalesAgentFilterSelect } from "./SalesAgentFilterSelect";
import { YmdFilterDateInput } from "./YmdFilterDateInput";
import { getReferralLeadsDateRangeError } from "../utils/sanitizeDateInput.util";
import type { ReferralLeadsFilterState } from "../hooks/useReferralLeadsFilters";
import type { DatePreset } from "../utils/dateRange.util";
import type { QuickStatusFilter } from "../utils/attributionScope.util";

/** Fixed so From can find To after its own remount; useId would change across that. */
const CUSTOM_TO_INPUT_ID = "referral-leads-custom-to";

interface ReferralLeadsFiltersProps {
  filters: ReferralLeadsFilterState;
  setFilter: <K extends keyof ReferralLeadsFilterState>(key: K, value: ReferralLeadsFilterState[K]) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  canUseOrgReferralControls: boolean;
  distinctReferrers: { id: string; name: string }[];
  featureEnabled?: boolean;
}

export function ReferralLeadsFilters({
  filters,
  setFilter,
  clearFilters,
  hasActiveFilters,
  canUseOrgReferralControls,
  distinctReferrers,
  featureEnabled = false,
}: ReferralLeadsFiltersProps) {
  // Typing committed straight to the filter state, so every keystroke was a request.
  // Draft locally and commit on a 300ms pause (page.tsx sequences the responses).
  const [searchDraft, setSearchDraft] = useState(filters.search);
  useEffect(() => {
    setSearchDraft(filters.search);
  }, [filters.search]);
  useEffect(() => {
    if (searchDraft === filters.search) return;
    const t = setTimeout(() => setFilter("search", searchDraft), 300);
    return () => clearTimeout(t);
  }, [searchDraft, filters.search, setFilter]);

  const setQuickStatus = (value: QuickStatusFilter) => {
    setFilter("quickStatus", filters.quickStatus === value ? null : value);
  };

  const commitCustomDate = (key: "customFrom" | "customTo", sanitized: string) => {
    setFilter(key, sanitized);
    if (sanitized) setFilter("datePreset", "all");
    // A filled From should hand over to To rather than make the user aim at it. The From
    // field is keyed on its own value, so it remounts on this commit -- wait a frame or the
    // focus lands on the element that is about to be torn down.
    if (key === "customFrom" && sanitized) {
      requestAnimationFrame(() => document.getElementById(CUSTOM_TO_INPUT_ID)?.focus());
    }
  };

  const dateRangeError = getReferralLeadsDateRangeError(filters.customFrom, filters.customTo);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-bodybg2 p-4 mb-4 space-y-3">
      <div className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[200px]">
        <label className="form-label text-xs" htmlFor="referral-leads-search">
          Search
        </label>
        <input
          id="referral-leads-search"
          type="search"
          className="form-control form-control-sm w-full"
          placeholder="Name, email, job…"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
        />
      </div>
      {canUseOrgReferralControls && (
        <div>
          <label className="form-label text-xs" htmlFor="referral-leads-referrer">
            Referrer
          </label>
          <select
            id="referral-leads-referrer"
            className="form-select form-select-sm min-w-[160px]"
            value={filters.filterReferrer}
            onChange={(e) => setFilter("filterReferrer", e.target.value)}
          >
            <option value="">All referrers</option>
            {distinctReferrers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {featureEnabled && canUseOrgReferralControls && (
        <div className="min-w-[180px]">
          <label className="form-label text-xs">Assigned sales agent</label>
          <SalesAgentFilterSelect
            value={filters.salesAgentUserId}
            unassigned={filters.unassigned}
            onChange={({ salesAgentUserId, unassigned }) => {
              setFilter("unassigned", unassigned);
              setFilter("salesAgentUserId", salesAgentUserId);
            }}
          />
        </div>
      )}
      <div>
        <label className="form-label text-xs" htmlFor="referral-leads-link-type">
          Link type
        </label>
        <select
          id="referral-leads-link-type"
          className="form-select form-select-sm min-w-[140px]"
          value={filters.filterType}
          onChange={(e) => setFilter("filterType", e.target.value)}
        >
          <option value="">All types</option>
          <option value="SHARE_CANDIDATE_ONBOARD">Onboard invite</option>
          <option value="JOB_APPLY">Job link</option>
        </select>
      </div>
      <div>
        <label className="form-label text-xs" htmlFor="referral-leads-status">
          Status
        </label>
        <select
          id="referral-leads-status"
          className="form-select form-select-sm min-w-[150px]"
          value={filters.filterStatus}
          onChange={(e) => setFilter("filterStatus", e.target.value)}
        >
          <option value="">All statuses</option>
          {/* in_review is a legacy alias of interview (same label) — drop it so the dropdown has no duplicate. */}
          {Object.entries(STATUS_META)
            .filter(([k]) => k !== "in_review")
            .map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
        </select>
      </div>
      <div>
        <label className="form-label text-xs" htmlFor="referral-leads-date-preset">
          Date range
        </label>
        <select
          id="referral-leads-date-preset"
          className="form-select form-select-sm min-w-[140px]"
          value={filters.datePreset}
          onChange={(e) => {
            setFilter("datePreset", e.target.value as DatePreset);
            setFilter("customFrom", "");
            setFilter("customTo", "");
          }}
        >
          <option value="all">All time</option>
          <option value="week">Last 7 days</option>
          <option value="month">Last 30 days</option>
          <option value="quarter">Last 90 days</option>
        </select>
      </div>
      <YmdFilterDateInput
        key={`custom-from-${filters.datePreset}-${filters.customFrom}`}
        label="From"
        value={filters.customFrom}
        maxDate={filters.customTo || undefined}
        rangeError={dateRangeError}
        onCommit={(sanitized) => commitCustomDate("customFrom", sanitized)}
      />
      <YmdFilterDateInput
        key={`custom-to-${filters.datePreset}-${filters.customTo}`}
        label="To"
        inputId={CUSTOM_TO_INPUT_ID}
        value={filters.customTo}
        minDate={filters.customFrom || undefined}
        rangeError={dateRangeError}
        onCommit={(sanitized) => commitCustomDate("customTo", sanitized)}
      />
      {hasActiveFilters && (
        <div className="shrink-0">
          <label className="form-label text-xs select-none pointer-events-none opacity-0" aria-hidden>
            Reset
          </label>
          <button
            type="button"
            className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-light border border-slate-200/80 dark:border-white/10 shadow-sm hover:border-slate-300 dark:hover:border-white/20"
            onClick={clearFilters}
            aria-label="Clear all filters"
            title="Clear all filters"
          >
            <i className="ri-filter-off-line text-[1.125rem] leading-none" aria-hidden />
          </button>
        </div>
      )}
      </div>

      {featureEnabled && (
        <div
          className="flex flex-col gap-2 border-t border-slate-100 pt-3 dark:border-white/5 sm:flex-row sm:items-center sm:gap-3"
          role="group"
          aria-label="Quick filters"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 shrink-0">
            Quick filters
          </span>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { value: "hiredOnly" as const, label: "Hired only" },
                { value: "activeEmployees" as const, label: "Active employees" },
                { value: "resignedEmployees" as const, label: "Resigned employees" },
                  { value: "appliedOnly" as const, label: "Applied" },
              ] as const
            ).map(({ value, label }) => {
              const active = filters.quickStatus === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  className={`inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-colors sm:min-h-0 ${
                    active
                      ? "bg-primary text-white shadow-sm"
                      : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                  }`}
                  onClick={() => setQuickStatus(value)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
