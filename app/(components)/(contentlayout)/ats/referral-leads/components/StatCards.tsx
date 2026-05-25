"use client";

import type { ReferralLeadsStatsResponse } from "@/shared/lib/api/referralLeads";

interface StatCardsProps {
  stats: ReferralLeadsStatsResponse;
  canSeeReferralLeaderboard: boolean;
  featureEnabled?: boolean;
}

export function StatCards({ stats, canSeeReferralLeaderboard, featureEnabled = false }: StatCardsProps) {
  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-bgdark2 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Total referrals</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalReferrals}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">In current filters</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-bgdark2 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Converted</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.converted}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{stats.conversionRate}% rate</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-bgdark2 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Pending</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.pending}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-bgdark2 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
            {canSeeReferralLeaderboard ? "Hired + top referrer" : "Hired"}
          </p>
          <p className="text-2xl font-bold text-violet-600 dark:text-violet-400 mt-1">{stats.hired}</p>
          {canSeeReferralLeaderboard && stats.topReferrer && (
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 truncate" title={stats.topReferrer.name}>
              {stats.topReferrer.name} ({stats.topReferrer.count})
            </p>
          )}
        </div>
      </div>

      {featureEnabled && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-bgdark2 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Unassigned</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.unassignedCount ?? 0}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">No assigned sales agent</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-bgdark2 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Referred hires</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
              {stats.totalReferredHires ?? stats.hired}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-bgdark2 p-4 shadow-sm sm:col-span-2 lg:col-span-1">
            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Top sales agent</p>
            {stats.topSalesAgent ? (
              <>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{stats.topSalesAgent.count}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 truncate" title={stats.topSalesAgent.name}>
                  {stats.topSalesAgent.name}
                </p>
              </>
            ) : (
              <p className="text-2xl font-bold text-slate-400 dark:text-slate-500 mt-1">—</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
