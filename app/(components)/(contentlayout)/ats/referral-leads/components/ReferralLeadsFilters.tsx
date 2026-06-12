"use client";

import { useCallback, useEffect, useState } from "react";
import { listUsers } from "@/shared/lib/api/users";
import type { User } from "@/shared/lib/types";
import { STATUS_META } from "@/shared/lib/ats/referral-leads-constants";
import type { ReferralLeadsFilterState } from "../hooks/useReferralLeadsFilters";
import type { DatePreset } from "../utils/dateRange.util";
import type { QuickStatusFilter } from "../utils/attributionScope.util";

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
  const [agentSearch, setAgentSearch] = useState("");
  const [agentHits, setAgentHits] = useState<User[]>([]);
  const [agentLoading, setAgentLoading] = useState(false);

  const fetchAgents = useCallback(async (search: string) => {
    setAgentLoading(true);
    try {
      const res = await listUsers({
        search: search.trim() || undefined,
        limit: 40,
        page: 1,
        status: "active",
        role: "sales_agent",
      });
      setAgentHits(res.results ?? []);
    } catch {
      setAgentHits([]);
    } finally {
      setAgentLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!featureEnabled || !canUseOrgReferralControls) return;
    const delay = agentSearch.trim() === "" ? 0 : 300;
    const t = window.setTimeout(() => void fetchAgents(agentSearch), delay);
    return () => window.clearTimeout(t);
  }, [featureEnabled, canUseOrgReferralControls, agentSearch, fetchAgents]);

  const setQuickStatus = (value: QuickStatusFilter) => {
    setFilter("quickStatus", filters.quickStatus === value ? null : value);
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-bgdark2 p-4 mb-4 space-y-3">
      <div className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[200px]">
        <label className="form-label text-xs">Search</label>
        <input
          className="form-control form-control-sm w-full"
          placeholder="Name, email, job…"
          value={filters.search}
          onChange={(e) => setFilter("search", e.target.value)}
        />
      </div>
      {canUseOrgReferralControls && (
        <div>
          <label className="form-label text-xs">Referrer</label>
          <select
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
          <select
            className="form-select form-select-sm w-full"
            value={filters.unassigned ? "__unassigned__" : filters.salesAgentUserId}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__unassigned__") {
                setFilter("unassigned", true);
                setFilter("salesAgentUserId", "");
              } else {
                setFilter("unassigned", false);
                setFilter("salesAgentUserId", v);
              }
            }}
          >
            <option value="">All sales agents</option>
            <option value="__unassigned__">Unassigned</option>
            {agentLoading && agentHits.length === 0 ? (
              <option disabled value="">
                Loading…
              </option>
            ) : (
              agentHits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name?.trim() || u.email || u.id}
                </option>
              ))
            )}
          </select>
          <input
            className="form-control form-control-sm w-full mt-1"
            placeholder="Search sales agents…"
            value={agentSearch}
            onChange={(e) => setAgentSearch(e.target.value)}
          />
        </div>
      )}
      <div>
        <label className="form-label text-xs">Link type</label>
        <select
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
        <label className="form-label text-xs">Status</label>
        <select
          className="form-select form-select-sm min-w-[150px]"
          value={filters.filterStatus}
          onChange={(e) => setFilter("filterStatus", e.target.value)}
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="form-label text-xs">Date range</label>
        <select
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
      <div>
        <label className="form-label text-xs">From</label>
        <input
          type="date"
          className="form-control form-control-sm w-[150px]"
          value={filters.customFrom}
          onChange={(e) => {
            setFilter("customFrom", e.target.value);
            if (e.target.value) setFilter("datePreset", "all");
          }}
        />
      </div>
      <div>
        <label className="form-label text-xs">To</label>
        <input
          type="date"
          className="form-control form-control-sm w-[150px]"
          value={filters.customTo}
          onChange={(e) => {
            setFilter("customTo", e.target.value);
            if (e.target.value) setFilter("datePreset", "all");
          }}
        />
      </div>
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
                { value: "convertedEmployees" as const, label: "Converted employees" },
                { value: "activeEmployees" as const, label: "Active employees" },
                { value: "resignedEmployees" as const, label: "Resigned employees" },
                { value: "pendingReferrals" as const, label: "Pending referrals" },
              ] as const
            ).map(({ value, label }) => {
              const active = filters.quickStatus === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
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
