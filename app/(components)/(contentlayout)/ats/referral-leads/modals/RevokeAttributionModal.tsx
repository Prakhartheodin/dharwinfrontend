"use client";

import { useEffect, useState } from "react";
import type { ReferralLeadRow } from "@/shared/lib/api/referralLeads";
import { useSalesAgentAttribution } from "../hooks/useSalesAgentAttribution";
import { SalesAgentBadge } from "../components/SalesAgentBadge";

interface RevokeAttributionModalProps {
  lead: ReferralLeadRow;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (lead?: ReferralLeadRow) => void | Promise<void>;
}

export function RevokeAttributionModal({ lead, isOpen, onClose, onSaved }: RevokeAttributionModalProps) {
  const { revoke, isMutating, error, staleConflict, clearStaleConflict } = useSalesAgentAttribution();
  const [revokeReason, setRevokeReason] = useState("");
  const [attributionId, setAttributionId] = useState(lead.salesAgentCurrentAttributionId || "");

  useEffect(() => {
    if (!isOpen) return;
    setRevokeReason("");
    setAttributionId(lead.salesAgentCurrentAttributionId || "");
    clearStaleConflict();
  }, [isOpen, lead, clearStaleConflict]);

  useEffect(() => {
    if (!staleConflict) return;
    void onSaved();
    clearStaleConflict();
  }, [staleConflict, onSaved, clearStaleConflict]);

  const onSubmit = async () => {
    if (!revokeReason.trim() || !attributionId) return;
    try {
      const res = await revoke(lead.id, {
        jobId: lead.salesAgentJobScope === "job" && lead.job?.id ? lead.job.id : null,
        expectedCurrentAttributionId: attributionId,
        revokeReason: revokeReason.trim(),
      });
      onClose();
      await onSaved(res.lead);
    } catch {
      /* hook sets error */
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-bgdark2 rounded-xl border border-slate-200 dark:border-white/10 p-6 max-w-md w-full shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Revoke sales agent attribution</h3>
        <div className="mt-3 rounded-lg border border-slate-200 dark:border-white/10 p-3">
          <SalesAgentBadge
            agent={lead.salesAgent}
            scope={lead.salesAgentJobScope}
            jobTitle={lead.job?.title}
            showScope
          />
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <label className="form-label">Reason (required, {revokeReason.length}/2000)</label>
            <textarea
              className="form-control w-full"
              rows={4}
              maxLength={2000}
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-danger m-0">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="ti-btn ti-btn-light" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="ti-btn ti-btn-danger disabled:opacity-60"
            disabled={isMutating || !revokeReason.trim() || !attributionId}
            onClick={() => void onSubmit()}
          >
            {isMutating ? "Revoking…" : "Revoke attribution"}
          </button>
        </div>
      </div>
    </div>
  );
}
