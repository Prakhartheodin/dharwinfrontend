"use client";

import Seo from "@/shared/layout-components/seo/seo";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import {
  listReferralLeads,
  downloadReferralLeadsExport,
  type ReferralLeadRow,
  type ReferralLeadsQueryParams,
} from "@/shared/lib/api/referralLeads";
import { isSalesAgentRoleName } from "@/shared/lib/roles";
import {
  canManageCandidatesFromPermissions,
  canSeeReferralLeaderboardFromRoles,
} from "./utils/referralPermissions.util";
import { useReferralLeadsFilters } from "./hooks/useReferralLeadsFilters";
import { useReferralLeadsStats } from "./hooks/useReferralLeadsStats";
import {
  useReferralSalesAgentFeatureFlag,
  useSalesAgentAttributionPermissions,
} from "./hooks/useReferralSalesAgentFeature";
import { StatCards } from "./components/StatCards";
import { StaleDataBanner } from "./components/StaleDataBanner";
import { ReferralLeadsFilters } from "./components/ReferralLeadsFilters";
import { ReferralLeadsTable } from "./components/ReferralLeadsTable";
import { ReferralLeadDetailPanel } from "./components/ReferralLeadDetailPanel";
import { OverrideAttributionModal } from "./modals/OverrideAttributionModal";
import { AttributionHistoryModal } from "./modals/AttributionHistoryModal";
import { AssignSalesAgentModal } from "./modals/AssignSalesAgentModal";
import { ChangeSalesAgentModal } from "./modals/ChangeSalesAgentModal";
import { RevokeAttributionModal } from "./modals/RevokeAttributionModal";
import { BackfillReferralModal } from "./modals/BackfillReferralModal";

type HistoryTab = "referrer" | "salesAgent";

export default function ReferralLeadsPage() {
  const { permissions, permissionsLoaded, roleNames, isAdministrator, isPlatformSuperUser } = useAuth();

  const featureEnabled = useReferralSalesAgentFeatureFlag();
  const { canManageAttribution, canRevokeAttribution } = useSalesAgentAttributionPermissions(featureEnabled);

  const canManage = useMemo(
    () => (permissionsLoaded ? canManageCandidatesFromPermissions(permissions) : false),
    [permissions, permissionsLoaded]
  );
  const isSalesAgent = useMemo(() => roleNames.some((n) => isSalesAgentRoleName(n)), [roleNames]);
  const canSeeReferralLeaderboard = useMemo(
    () => canSeeReferralLeaderboardFromRoles(roleNames, isAdministrator, isPlatformSuperUser),
    [roleNames, isAdministrator, isPlatformSuperUser]
  );
  const canUseOrgReferralControls = canManage && !isSalesAgent;
  const canOverrideAttribution = canUseOrgReferralControls;

  const { filters, setFilter, clearFilters, hasActiveFilters, baseParams } = useReferralLeadsFilters(featureEnabled);
  const { stats, isStale, refresh: refreshStats, setIsStale } = useReferralLeadsStats(baseParams, permissionsLoaded);

  const [list, setList] = useState<ReferralLeadRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<ReferralLeadRow | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTab, setHistoryTab] = useState<HistoryTab>("referrer");
  const [assignOpen, setAssignOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [backfillOpen, setBackfillOpen] = useState(false);
  const [actionLead, setActionLead] = useState<ReferralLeadRow | null>(null);

  const refreshList = useCallback(async () => {
    if (!permissionsLoaded) return;
    setLoading(true);
    setError(null);
    setIsStale(false);
    try {
      const params: ReferralLeadsQueryParams = { ...baseParams, limit: 25 };
      const res = await listReferralLeads(params);
      setList(res.results);
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Failed to load";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [permissionsLoaded, baseParams, setIsStale]);

  const refresh = useCallback(async () => {
    await Promise.all([refreshList(), refreshStats().catch(() => undefined)]);
  }, [refreshList, refreshStats]);

  useEffect(() => {
    if (!permissionsLoaded) return;
    void refreshList();
  }, [permissionsLoaded, baseParams, refreshList]);

  const mergeLead = useCallback((updated?: ReferralLeadRow) => {
    if (!updated) return;
    setList((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setSelected((prev) => (prev?.id === updated.id ? updated : prev));
    setActionLead((prev) => (prev?.id === updated.id ? updated : prev));
  }, []);

  const onAttributionSaved = useCallback(
    async (updated?: ReferralLeadRow) => {
      mergeLead(updated);
      await refreshStats().catch(() => undefined);
    },
    [mergeLead, refreshStats]
  );

  const distinctReferrers = useMemo(() => {
    const m = new Map<string, { id: string; name: string }>();
    for (const r of list) {
      if (r.referredBy?.id) {
        m.set(r.referredBy.id, { id: r.referredBy.id, name: r.referredBy.name || r.referredBy.email || "Referrer" });
      }
    }
    return [...m.values()];
  }, [list]);

  const showEmptyNoData = !loading && !error && list.length === 0 && !hasActiveFilters;
  const showEmptyFiltered = !loading && !error && list.length === 0 && hasActiveFilters;

  const onExport = async () => {
    try {
      await downloadReferralLeadsExport(baseParams);
    } catch {
      alert("Export failed. Check permissions and try again.");
    }
  };

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoading(true);
    try {
      const res = await listReferralLeads({ ...baseParams, limit: 25, cursor: nextCursor });
      setList((prev) => [...prev, ...res.results]);
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load more failed");
    } finally {
      setLoading(false);
    }
  };

  const openHistory = (lead: ReferralLeadRow, tab: HistoryTab = "referrer") => {
    setActionLead(lead);
    setHistoryTab(tab);
    setHistoryOpen(true);
  };

  const modalLead = actionLead ?? selected;

  return (
    <React.Fragment>
      <Seo title="Referral leads" />
      <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              ATS / Referral leads
            </p>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">Referral leads</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Candidate profiles who arrived through a tracked referral link
              {canUseOrgReferralControls ? " (organization view)" : " (your referrals)"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
              Each row is an ATS candidate record (same as the Candidates list). It is not a Settings → Users org
              account; the referrer appears in the Referred by column.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {featureEnabled && canManageAttribution && (
              <button
                type="button"
                onClick={() => setBackfillOpen(true)}
                className="ti-btn ti-btn-success !py-2"
              >
                Add referred employee
              </button>
            )}
            <button type="button" onClick={() => void refresh()} className="ti-btn ti-btn-primary !py-2" disabled={loading}>
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void onExport()}
              className="ti-btn ti-btn-light border border-slate-200 dark:border-white/10 !py-2"
            >
              Export CSV
            </button>
          </div>
        </div>

        {isStale && <StaleDataBanner loading={loading} onRefresh={() => void refresh()} />}

        {stats && (
          <StatCards stats={stats} canSeeReferralLeaderboard={canSeeReferralLeaderboard} featureEnabled={featureEnabled} />
        )}

        <ReferralLeadsFilters
          filters={filters}
          setFilter={setFilter}
          clearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
          canUseOrgReferralControls={canUseOrgReferralControls}
          distinctReferrers={distinctReferrers}
          featureEnabled={featureEnabled}
        />

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        )}

        {loading && list.length === 0 && (
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-bgdark2 p-12 text-center text-slate-500">
            Loading referral leads…
          </div>
        )}

        {showEmptyNoData && (
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-bgdark2 p-12 text-center">
            <p className="text-slate-600 dark:text-slate-300">No referral leads yet.</p>
          </div>
        )}

        {showEmptyFiltered && (
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-bgdark2 p-12 text-center">
            <p className="text-slate-600 dark:text-slate-300">No rows match your filters.</p>
            <button type="button" className="ti-btn ti-btn-light mt-3" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        )}

        {list.length > 0 && (
          <>
            <ReferralLeadsTable
              list={list}
              featureEnabled={featureEnabled}
              onSelect={setSelected}
              canManageAttribution={canManageAttribution}
              canRevokeAttribution={canRevokeAttribution}
              canOverrideAttribution={canOverrideAttribution}
              onAssign={(lead) => {
                setActionLead(lead);
                setAssignOpen(true);
              }}
              onChange={(lead) => {
                setActionLead(lead);
                setChangeOpen(true);
              }}
              onRevoke={(lead) => {
                setActionLead(lead);
                setRevokeOpen(true);
              }}
              onViewHistory={(lead) => openHistory(lead, "referrer")}
              onOverride={(lead) => {
                setSelected(lead);
                setOverrideOpen(true);
              }}
            />
            {hasMore && (
              <div className="mt-4 flex justify-center">
                <button type="button" className="ti-btn ti-btn-light" disabled={loading} onClick={() => void loadMore()}>
                  {loading ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selected && !overrideOpen && !assignOpen && !changeOpen && !revokeOpen && !historyOpen && (
        <ReferralLeadDetailPanel
          lead={selected}
          featureEnabled={featureEnabled}
          canOverrideAttribution={canOverrideAttribution}
          canManageAttribution={canManageAttribution}
          canRevokeAttribution={canRevokeAttribution}
          onClose={() => setSelected(null)}
          onOverride={() => setOverrideOpen(true)}
          onViewOverrideHistory={() => openHistory(selected, "referrer")}
          onAssignSalesAgent={() => {
            setActionLead(selected);
            setAssignOpen(true);
          }}
          onChangeSalesAgent={() => {
            setActionLead(selected);
            setChangeOpen(true);
          }}
          onRevokeSalesAgent={() => {
            setActionLead(selected);
            setRevokeOpen(true);
          }}
          onViewAttributionHistory={() => openHistory(selected, "salesAgent")}
        />
      )}

      {selected && overrideOpen && (
        <OverrideAttributionModal
          lead={selected}
          isOpen={overrideOpen}
          onClose={() => setOverrideOpen(false)}
          onSaved={async () => {
            setOverrideOpen(false);
            setSelected(null);
            await refresh();
          }}
        />
      )}

      {modalLead && historyOpen && (
        <AttributionHistoryModal
          lead={modalLead}
          isOpen={historyOpen}
          defaultTab={historyTab}
          featureEnabled={featureEnabled}
          onClose={() => {
            setHistoryOpen(false);
            setActionLead(null);
          }}
        />
      )}

      {modalLead && assignOpen && (
        <AssignSalesAgentModal
          lead={modalLead}
          isOpen={assignOpen}
          onClose={() => {
            setAssignOpen(false);
            setActionLead(null);
          }}
          onSaved={onAttributionSaved}
        />
      )}

      {modalLead && changeOpen && (
        <ChangeSalesAgentModal
          lead={modalLead}
          isOpen={changeOpen}
          onClose={() => {
            setChangeOpen(false);
            setActionLead(null);
          }}
          onSaved={onAttributionSaved}
        />
      )}

      {modalLead && revokeOpen && (
        <RevokeAttributionModal
          lead={modalLead}
          isOpen={revokeOpen}
          onClose={() => {
            setRevokeOpen(false);
            setActionLead(null);
          }}
          onSaved={onAttributionSaved}
        />
      )}

      {backfillOpen && (
        <BackfillReferralModal
          isOpen={backfillOpen}
          onClose={() => setBackfillOpen(false)}
          onSaved={async (lead) => {
            mergeLead(lead);
            await refresh();
          }}
        />
      )}
    </React.Fragment>
  );
}
