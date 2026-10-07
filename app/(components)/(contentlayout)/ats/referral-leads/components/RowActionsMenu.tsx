"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReferralLeadRow } from "@/shared/lib/api/referralLeads";

export interface RowActionsMenuProps {
  lead: ReferralLeadRow;
  featureEnabled?: boolean;
  canManageAttribution?: boolean;
  canRevokeAttribution?: boolean;
  onAssign?: (lead: ReferralLeadRow) => void;
  onChange?: (lead: ReferralLeadRow) => void;
  onRevoke?: (lead: ReferralLeadRow) => void;
  onViewHistory?: (lead: ReferralLeadRow) => void;
  onOverride?: (lead: ReferralLeadRow) => void;
  canOverrideAttribution?: boolean;
}

export function RowActionsMenu({
  lead,
  featureEnabled = false,
  canManageAttribution = false,
  canRevokeAttribution = false,
  onAssign,
  onChange,
  onRevoke,
  onViewHistory,
  onOverride,
  canOverrideAttribution = false,
}: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) closeMenu();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeMenu();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, closeMenu]);

  const hasSalesAgentActions =
    featureEnabled &&
    (canManageAttribution || canRevokeAttribution) &&
    (onAssign || onChange || onRevoke || onViewHistory);
  const hasOverride = canOverrideAttribution && lead.attributionLockedAt && onOverride;

  if (!hasSalesAgentActions && !hasOverride) return null;

  return (
    <div className="relative" ref={rootRef} onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        className="ti-btn ti-btn-light ti-btn-sm border border-slate-200/80 dark:border-white/10 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 inline-flex items-center justify-center"
        aria-label="Row actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <i className="ri-more-2-fill" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[11rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-slate-900"
        >
          {featureEnabled && canManageAttribution && !lead.salesAgent && onAssign && (
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-white/10"
              onClick={() => {
                closeMenu();
                onAssign(lead);
              }}
            >
              Assign sales agent
            </button>
          )}
          {featureEnabled && canManageAttribution && lead.salesAgent && onChange && (
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-white/10"
              onClick={() => {
                closeMenu();
                onChange(lead);
              }}
            >
              Change sales agent
            </button>
          )}
          {featureEnabled && onViewHistory && (
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-white/10"
              onClick={() => {
                closeMenu();
                onViewHistory(lead);
              }}
            >
              View attribution history
            </button>
          )}
          {featureEnabled && canRevokeAttribution && lead.salesAgent && onRevoke && (
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
              onClick={() => {
                closeMenu();
                onRevoke(lead);
              }}
            >
              Revoke attribution
            </button>
          )}
          {hasOverride && (
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-white/10"
              onClick={() => {
                closeMenu();
                onOverride(lead);
              }}
            >
              Override referrer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
