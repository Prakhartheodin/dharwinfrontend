"use client";

import type { ReferralLeadSalesAgent } from "@/shared/lib/api/referralLeads";
import { scopeLabel } from "../utils/attributionScope.util";

export function SalesAgentBadge({
  agent,
  scope,
  jobTitle,
  showScope = false,
}: {
  agent: ReferralLeadSalesAgent | null | undefined;
  scope?: "candidate" | "job" | null;
  jobTitle?: string | null;
  showScope?: boolean;
}) {
  if (!agent) {
    return <span className="text-xs text-slate-500 dark:text-slate-400 italic">Unassigned</span>;
  }
  return (
    <div className="flex flex-col min-w-0">
      <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{agent.name || agent.email || "—"}</span>
      {agent.email && agent.name ? (
        <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{agent.email}</span>
      ) : null}
      {showScope ? (
        <span className="text-xs text-slate-500 dark:text-slate-400">{scopeLabel(scope, jobTitle)}</span>
      ) : null}
    </div>
  );
}
