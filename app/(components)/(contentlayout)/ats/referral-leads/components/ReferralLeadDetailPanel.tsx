"use client";

import Link from "next/link";
import { ROUTES } from "@/shared/lib/constants";
import { EMPLOYEE_STATUS_META, LINK_TYPE, getStatusMeta } from "@/shared/lib/ats/referral-leads-constants";
import type { ReferralLeadRow } from "@/shared/lib/api/referralLeads";
import { attributionLabel } from "../utils/referralPermissions.util";
import { fmtDate, fmtTime, userDisplay } from "../utils/format.util";
import { SalesAgentBadge } from "./SalesAgentBadge";

interface ReferralLeadDetailPanelProps {
  lead: ReferralLeadRow;
  featureEnabled?: boolean;
  canOverrideAttribution: boolean;
  onClose: () => void;
  onOverride: () => void;
  onViewOverrideHistory: () => void;
  onAssignSalesAgent?: () => void;
  onChangeSalesAgent?: () => void;
  onRevokeSalesAgent?: () => void;
  onViewAttributionHistory?: () => void;
  canManageAttribution?: boolean;
  canRevokeAttribution?: boolean;
}

export function ReferralLeadDetailPanel({
  lead,
  featureEnabled = false,
  canOverrideAttribution,
  onClose,
  onOverride,
  onViewOverrideHistory,
  onAssignSalesAgent,
  onChangeSalesAgent,
  onRevokeSalesAgent,
  onViewAttributionHistory,
  canManageAttribution = false,
  canRevokeAttribution = false,
}: ReferralLeadDetailPanelProps) {
  const a = attributionLabel(lead);

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Referral detail">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="relative ml-auto h-full w-full max-w-md bg-white dark:bg-bgdark2 shadow-2xl flex flex-col overflow-y-auto">
        <div className="p-5 border-b border-slate-200 dark:border-white/10 flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Referral detail</p>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">{lead.fullName}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{lead.email}</p>
          </div>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 text-2xl leading-none"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="p-5 space-y-4 flex-1">
          <div
            className={`text-sm font-medium ${
              a.tone === "ok"
                ? "text-emerald-700 dark:text-emerald-300"
                : a.tone === "warn"
                  ? "text-amber-700 dark:text-amber-200"
                  : "text-slate-600 dark:text-slate-300"
            }`}
          >
            {a.text}
          </div>

          {!lead.referralAttributionAnonymised && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Referred by</p>
              <p className="font-medium text-slate-800 dark:text-white">
                {lead.referredBy?.name || "—"}{" "}
                {lead.referredBy?.email && (
                  <span className="text-slate-500 dark:text-slate-400 text-sm block">{lead.referredBy.email}</span>
                )}
              </p>
            </div>
          )}

          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Pipeline status</p>
            {(() => {
              const m = getStatusMeta(lead.referralPipelineStatus);
              return (
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{ background: m.bg, color: m.color }}
                >
                  {m.label}
                </span>
              );
            })()}
          </div>

          {featureEnabled && lead.employeeConverted && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Employee status</p>
              {(() => {
                const m = EMPLOYEE_STATUS_META[lead.employeeStatus === "resigned" ? "resigned" : "active"];
                return (
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{ background: m.bg, color: m.color }}
                  >
                    {m.label}
                  </span>
                );
              })()}
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {lead.joiningDate && <>Joined {fmtDate(lead.joiningDate)}</>}
                {lead.employeeStatus === "resigned" && lead.resignDate && <> · Resigned {fmtDate(lead.resignDate)}</>}
              </p>
            </div>
          )}

          {featureEnabled && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Assigned sales agent</p>
              <SalesAgentBadge agent={lead.salesAgent} />
            </div>
          )}

          {lead.referralContext && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Link type</p>
              <p className="text-slate-800 dark:text-slate-100">{LINK_TYPE[lead.referralContext] || lead.referralContext}</p>
              {lead.job?.title && <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Job: {lead.job.title}</p>}
            </div>
          )}

          {lead.referredAt && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Attribution time</p>
              <p className="text-slate-800 dark:text-slate-100">
                {fmtDate(lead.referredAt)} {fmtTime(lead.referredAt)}
              </p>
            </div>
          )}

          {lead.referralLastOverride?.overriddenAt && (
            <div className="rounded-lg border border-slate-200 dark:border-white/10 p-3 text-sm space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-0">Last override</p>
                <button type="button" className="text-xs font-medium text-primary hover:underline shrink-0" onClick={onViewOverrideHistory}>
                  View all
                </button>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">By</p>
                <p className="text-slate-800 dark:text-slate-100">{userDisplay(lead.referralLastOverride.overriddenByUser)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">When</p>
                <p className="text-slate-800 dark:text-slate-100">
                  {fmtDate(lead.referralLastOverride.overriddenAt ?? undefined)}{" "}
                  {fmtTime(lead.referralLastOverride.overriddenAt ?? undefined)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Referrer change</p>
                <p className="text-slate-800 dark:text-slate-100">
                  <span className="text-slate-500 dark:text-slate-400">From</span>{" "}
                  {userDisplay(lead.referralLastOverride.previousReferredBy)}
                  <span className="text-slate-500 dark:text-slate-400 mx-1">→</span>
                  <span className="text-slate-500 dark:text-slate-400">to</span> {userDisplay(lead.referralLastOverride.newReferredBy)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Reason</p>
                <p className="text-slate-700 dark:text-slate-200">{lead.referralLastOverride.reason?.trim() || "—"}</p>
              </div>
            </div>
          )}

          <div className="pt-2 space-y-2">
            <Link href={ROUTES.atsCandidateRecordEdit(lead.id)} className="ti-btn ti-btn-primary w-full block text-center">
              View candidate profile
            </Link>
            {canOverrideAttribution && lead.attributionLockedAt && (
              <button type="button" className="ti-btn ti-btn-outline-danger w-full" onClick={onOverride}>
                Override attribution
              </button>
            )}
            {featureEnabled && canManageAttribution && !lead.salesAgent && onAssignSalesAgent && (
              <button type="button" className="ti-btn ti-btn-light w-full border border-slate-200 dark:border-white/10" onClick={onAssignSalesAgent}>
                Assign sales agent
              </button>
            )}
            {featureEnabled && canManageAttribution && lead.salesAgent && onChangeSalesAgent && (
              <button type="button" className="ti-btn ti-btn-light w-full border border-slate-200 dark:border-white/10" onClick={onChangeSalesAgent}>
                Change sales agent
              </button>
            )}
            {featureEnabled && onViewAttributionHistory && (
              <button type="button" className="ti-btn ti-btn-light w-full border border-slate-200 dark:border-white/10" onClick={onViewAttributionHistory}>
                View attribution history
              </button>
            )}
            {featureEnabled && canRevokeAttribution && lead.salesAgent && onRevokeSalesAgent && (
              <button type="button" className="ti-btn ti-btn-outline-danger w-full" onClick={onRevokeSalesAgent}>
                Revoke sales agent attribution
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
