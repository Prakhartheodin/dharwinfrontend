"use client";

import { useMemo, useState } from "react";
import type { ReferralLeadsQueryParams } from "@/shared/lib/api/referralLeads";
import { type DatePreset, rangeForPreset } from "../utils/dateRange.util";
import { isReferralLeadsDateRangeInvalid } from "@/shared/lib/ymd-filter-date-input.util";
import type { QuickStatusFilter } from "../utils/attributionScope.util";

export interface ReferralLeadsFilterState {
  search: string;
  filterReferrer: string;
  filterType: string;
  filterStatus: string;
  datePreset: DatePreset;
  customFrom: string;
  customTo: string;
  salesAgentUserId: string;
  unassigned: boolean;
  quickStatus: QuickStatusFilter;
}

const INITIAL: ReferralLeadsFilterState = {
  search: "",
  filterReferrer: "",
  filterType: "",
  filterStatus: "",
  datePreset: "all",
  customFrom: "",
  customTo: "",
  salesAgentUserId: "",
  unassigned: false,
  quickStatus: null,
};

export function useReferralLeadsFilters(
  featureEnabled = false,
  initialFilters: ReferralLeadsFilterState = INITIAL
) {
  const [filters, setFilters] = useState<ReferralLeadsFilterState>(initialFilters);

  const setFilter = <K extends keyof ReferralLeadsFilterState>(key: K, value: ReferralLeadsFilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  /**
   * True while From > To. Picking a custom date sets datePreset to "all", so the
   * fallback below resolves to no date filter at all -- callers must not fetch on
   * these params or the table shows unfiltered rows under an inline range error.
   */
  const dateRangeInvalid = useMemo(
    () => isReferralLeadsDateRangeInvalid(filters.customFrom, filters.customTo),
    [filters.customFrom, filters.customTo]
  );

  const baseParams = useMemo((): ReferralLeadsQueryParams => {
    const hasCustomDates = !!(filters.customFrom || filters.customTo);
    const customRangeInvalid = isReferralLeadsDateRangeInvalid(filters.customFrom, filters.customTo);
    const { from, to } =
      hasCustomDates && !customRangeInvalid
        ? { from: filters.customFrom || undefined, to: filters.customTo || undefined }
        : rangeForPreset(filters.datePreset);

    const params: ReferralLeadsQueryParams = {
      search: filters.search.trim() || undefined,
      referredByUserId: filters.filterReferrer || undefined,
      referralContext: (filters.filterType as ReferralLeadsQueryParams["referralContext"]) || undefined,
      referralPipelineStatus: filters.filterStatus || undefined,
      from,
      to,
    };

    if (featureEnabled) {
      if (filters.unassigned) {
        params.unassigned = true;
      } else if (filters.salesAgentUserId) {
        params.salesAgentUserId = filters.salesAgentUserId;
      }
      if (filters.quickStatus === "hiredOnly") params.hiredOnly = true;
      if (filters.quickStatus === "activeEmployees") params.employeeStatus = "active";
      if (filters.quickStatus === "resignedEmployees") params.employeeStatus = "resigned";
      if (filters.quickStatus === "appliedOnly") params.appliedOnly = true;
    }

    return params;
  }, [filters, featureEnabled]);

  const hasActiveFilters = useMemo(
    () =>
      !!filters.search ||
      !!filters.filterReferrer ||
      !!filters.filterType ||
      !!filters.filterStatus ||
      filters.datePreset !== "all" ||
      !!filters.customFrom ||
      !!filters.customTo ||
      (featureEnabled &&
        (!!filters.salesAgentUserId || filters.unassigned || filters.quickStatus !== null)),
    [filters, featureEnabled]
  );

  const clearFilters = () => setFilters(INITIAL);

  return {
    filters,
    setFilter,
    setFilters,
    clearFilters,
    hasActiveFilters,
    dateRangeInvalid,
    baseParams,
    queryParams: baseParams,
  };
}
