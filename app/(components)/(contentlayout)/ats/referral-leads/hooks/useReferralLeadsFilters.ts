"use client";

import { useMemo, useState } from "react";
import type { ReferralLeadsQueryParams } from "@/shared/lib/api/referralLeads";
import { type DatePreset, rangeForPreset } from "../utils/dateRange.util";
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

export function useReferralLeadsFilters(featureEnabled = false) {
  const [filters, setFilters] = useState<ReferralLeadsFilterState>(INITIAL);

  const setFilter = <K extends keyof ReferralLeadsFilterState>(key: K, value: ReferralLeadsFilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const baseParams = useMemo((): ReferralLeadsQueryParams => {
    const { from, to } =
      filters.customFrom || filters.customTo
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
      if (filters.quickStatus === "convertedEmployees") params.convertedEmployees = true;
      if (filters.quickStatus === "activeEmployees") params.employeeStatus = "active";
      if (filters.quickStatus === "resignedEmployees") params.employeeStatus = "resigned";
      if (filters.quickStatus === "pendingReferrals") params.pendingReferrals = true;
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
    baseParams,
    queryParams: baseParams,
  };
}
