"use client";

import { getLifecycleStageMeta } from "@/shared/lib/ats/referral-leads-constants";

export function LifecycleStagePill({ stage }: { stage?: string | null }) {
  if (!stage) return <span className="text-xs text-slate-400 dark:text-slate-500">—</span>;
  const meta = getLifecycleStageMeta(stage);
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: meta.color, backgroundColor: meta.bg }}
    >
      {meta.label}
    </span>
  );
}
