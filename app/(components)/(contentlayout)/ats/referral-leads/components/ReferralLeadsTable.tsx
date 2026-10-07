"use client";

import { LINK_TYPE, getStatusMeta } from "@/shared/lib/ats/referral-leads-constants";
import type { ReferralLeadRow } from "@/shared/lib/api/referralLeads";
import { fmtDate, fmtTime } from "../utils/format.util";
import { SalesAgentBadge } from "./SalesAgentBadge";
import { RowActionsMenu, type RowActionsMenuProps } from "./RowActionsMenu";

interface ReferralLeadsTableProps extends Omit<RowActionsMenuProps, "lead"> {
  list: ReferralLeadRow[];
  featureEnabled?: boolean;
  onSelect: (lead: ReferralLeadRow) => void;
}

function StatusPill({ lead }: { lead: ReferralLeadRow }) {
  const m = getStatusMeta(lead.referralPipelineStatus);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: m.bg, color: m.color }}
    >
      {m.label}
    </span>
  );
}

function cellTitle(...parts: (string | null | undefined)[]) {
  return parts.filter(Boolean).join(" · ") || undefined;
}

function ReferredByBlock({ lead }: { lead: ReferralLeadRow }) {
  if (lead.referralAttributionAnonymised) {
    return <span className="text-slate-400 dark:text-slate-500">Anonymised</span>;
  }
  return (
    <>
      <div className="font-medium text-slate-800 dark:text-white break-words">
        {lead.referredBy?.name || "—"}
      </div>
      {lead.referredBy?.email && (
        <div className="text-xs text-slate-500 dark:text-slate-400 break-all">{lead.referredBy.email}</div>
      )}
    </>
  );
}

function LeadCard({
  lead,
  featureEnabled,
  onSelect,
  rowActions,
}: {
  lead: ReferralLeadRow;
  featureEnabled: boolean;
  onSelect: (lead: ReferralLeadRow) => void;
  rowActions: Omit<RowActionsMenuProps, "lead">;
}) {
  const claimedAt = lead.referredAt || lead.createdAt;
  return (
    <article
      className="referral-leads-list-card rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-bodybg2 p-3.5 shadow-sm min-w-0"
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <button
          type="button"
          className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md"
          onClick={() => onSelect(lead)}
        >
          <div className="font-medium text-slate-800 dark:text-white break-words">{lead.fullName}</div>
          {lead.email && (
            <div className="text-xs text-slate-500 dark:text-slate-400 break-all mt-0.5">{lead.email}</div>
          )}
          {lead.joiningDate && (
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">Joining: {fmtDate(lead.joiningDate)}</div>
          )}
        </button>
        <RowActionsMenu lead={lead} featureEnabled={featureEnabled} {...rowActions} />
      </div>

      <div className="mt-3 grid gap-3 border-t border-slate-100 dark:border-white/5 pt-3 text-sm">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
            Referred by
          </p>
          <ReferredByBlock lead={lead} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill lead={lead} />
          {lead.referralContext && (
            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200">
              {LINK_TYPE[lead.referralContext] || lead.referralContext}
            </span>
          )}
        </div>
        {lead.job?.title && (
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-0.5">
              Job
            </p>
            <p className="text-slate-600 dark:text-slate-300 break-words">{lead.job.title}</p>
          </div>
        )}
        {featureEnabled && (
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
              Assigned sales agent
            </p>
            <SalesAgentBadge agent={lead.salesAgent} />
          </div>
        )}
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold uppercase tracking-wide text-[10px] text-slate-500 dark:text-slate-400">
            Claimed
          </span>
          <div className="mt-0.5 text-slate-600 dark:text-slate-300">
            {fmtDate(claimedAt)} · {fmtTime(claimedAt)}
          </div>
        </div>
      </div>
    </article>
  );
}

export function ReferralLeadsTable({
  list,
  featureEnabled = false,
  onSelect,
  ...rowActions
}: ReferralLeadsTableProps) {
  return (
    <>
      <div className="referral-leads-desktop-table hidden lg:block rounded-xl border border-slate-200 dark:border-white/10 min-w-0">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              <th className="px-4 py-3 min-w-0">Candidate</th>
              <th className="px-4 py-3 min-w-0">Referred by</th>
              <th className="hidden xl:table-cell px-4 py-3">Link</th>
              <th className="px-4 py-3 min-w-0">Job</th>
              <th className="px-4 py-3">Status</th>
              {featureEnabled && <th className="px-4 py-3 min-w-0">Assigned sales agent</th>}
              <th className="hidden xl:table-cell px-4 py-3">Claimed</th>
              <th className="px-4 py-3 w-12" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {list.map((lead) => (
              <tr
                key={lead.id}
                tabIndex={0}
                role="button"
                aria-label={`Open details for ${lead.fullName || lead.email || "referral lead"}`}
                className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/80 dark:hover:bg-white/5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset"
                onKeyDown={(e) => {
                  if (e.key !== "Enter" && e.key !== " ") return;
                  if (e.target !== e.currentTarget) return;
                  e.preventDefault();
                  onSelect(lead);
                }}
                onClick={() => onSelect(lead)}
              >
                <td className="px-4 py-3 min-w-0 align-top">
                  <div
                    className="font-medium text-slate-800 dark:text-white truncate"
                    title={cellTitle(lead.fullName, lead.email)}
                  >
                    {lead.fullName}
                  </div>
                  {lead.email && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate" title={lead.email}>
                      {lead.email}
                    </div>
                  )}
                  {lead.joiningDate && (
                    <div className="text-xs text-slate-400 dark:text-slate-500 truncate">
                      Joining: {fmtDate(lead.joiningDate)}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 min-w-0 align-top text-slate-700 dark:text-slate-200">
                  {lead.referralAttributionAnonymised ? (
                    <span className="text-slate-400 dark:text-slate-500">Anonymised</span>
                  ) : (
                    <>
                      <div
                        className="truncate"
                        title={cellTitle(lead.referredBy?.name, lead.referredBy?.email)}
                      >
                        {lead.referredBy?.name || "—"}
                      </div>
                      {lead.referredBy?.email && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate" title={lead.referredBy.email}>
                          {lead.referredBy.email}
                        </div>
                      )}
                    </>
                  )}
                </td>
                <td className="hidden xl:table-cell px-4 py-3 align-top">
                  {lead.referralContext ? (
                    <span className="inline-flex max-w-full items-center gap-1 truncate rounded-md px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200">
                      {LINK_TYPE[lead.referralContext] || lead.referralContext}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 min-w-0 align-top text-slate-600 dark:text-slate-300">
                  {lead.job?.title ? (
                    <span className="block truncate xl:whitespace-normal xl:overflow-visible xl:break-words" title={lead.job.title}>
                      {lead.job.title}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusPill lead={lead} />
                </td>
                {featureEnabled && (
                  <td className="px-4 py-3 min-w-0 align-top">
                    <SalesAgentBadge agent={lead.salesAgent} />
                  </td>
                )}
                <td className="hidden xl:table-cell px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap align-top">
                  <div>{fmtDate(lead.referredAt || lead.createdAt)}</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">
                    {fmtTime(lead.referredAt || lead.createdAt)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <RowActionsMenu lead={lead} featureEnabled={featureEnabled} {...rowActions} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="referral-leads-list-cards lg:hidden flex flex-col gap-3 min-w-0">
        {list.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            featureEnabled={featureEnabled}
            onSelect={onSelect}
            rowActions={rowActions}
          />
        ))}
      </div>
    </>
  );
}
