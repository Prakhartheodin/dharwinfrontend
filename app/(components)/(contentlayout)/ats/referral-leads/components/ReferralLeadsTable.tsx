"use client";

import { LINK_TYPE, STATUS_META, getStatusMeta } from "@/shared/lib/ats/referral-leads-constants";
import type { ReferralLeadRow } from "@/shared/lib/api/referralLeads";
import { fmtDate, fmtTime } from "../utils/format.util";
import { LifecycleStagePill } from "./LifecycleStagePill";
import { SalesAgentBadge } from "./SalesAgentBadge";
import { RowActionsMenu, type RowActionsMenuProps } from "./RowActionsMenu";

interface ReferralLeadsTableProps extends Omit<RowActionsMenuProps, "lead"> {
  list: ReferralLeadRow[];
  featureEnabled?: boolean;
  onSelect: (lead: ReferralLeadRow) => void;
}

export function ReferralLeadsTable({
  list,
  featureEnabled = false,
  onSelect,
  ...rowActions
}: ReferralLeadsTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
            <th className="px-4 py-3">Candidate</th>
            <th className="px-4 py-3">Referred by</th>
            <th className="px-4 py-3">Link</th>
            <th className="px-4 py-3">Job</th>
            <th className="px-4 py-3">Status</th>
            {featureEnabled && <th className="px-4 py-3">Stage</th>}
            {featureEnabled && <th className="px-4 py-3">Assigned sales agent</th>}
            <th className="px-4 py-3">Claimed</th>
            <th className="px-4 py-3 w-12" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {list.map((lead) => (
            <tr
              key={lead.id}
              className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/80 dark:hover:bg-white/5 cursor-pointer"
              onClick={() => onSelect(lead)}
            >
              <td className="px-4 py-3">
                <div className="font-medium text-slate-800 dark:text-white">{lead.fullName}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{lead.email}</div>
              </td>
              <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                {lead.referralAttributionAnonymised ? (
                  <span className="text-slate-400 dark:text-slate-500">Anonymised</span>
                ) : (
                  <>
                    {lead.referredBy?.name || "—"}
                    {lead.referredBy?.email && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">{lead.referredBy.email}</div>
                    )}
                  </>
                )}
              </td>
              <td className="px-4 py-3">
                {lead.referralContext ? (
                  <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200">
                    {LINK_TYPE[lead.referralContext] || lead.referralContext}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{lead.job?.title || "—"}</td>
              <td className="px-4 py-3">
                {(() => {
                  const st = (lead.referralPipelineStatus || "pending") as keyof typeof STATUS_META;
                  const m = getStatusMeta(st);
                  return (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{ background: m.bg, color: m.color }}
                    >
                      {m.label}
                    </span>
                  );
                })()}
              </td>
              {featureEnabled && (
                <td className="px-4 py-3">
                  <LifecycleStagePill stage={lead.lifecycleStage} />
                </td>
              )}
              {featureEnabled && (
                <td className="px-4 py-3">
                  <SalesAgentBadge agent={lead.salesAgent} />
                </td>
              )}
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                <div>{fmtDate(lead.referredAt || lead.createdAt)}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500">{fmtTime(lead.referredAt || lead.createdAt)}</div>
              </td>
              <td className="px-4 py-3">
                <RowActionsMenu lead={lead} featureEnabled={featureEnabled} {...rowActions} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
