"use client";

import { useCallback, useEffect, useState } from "react";
import { listUsers } from "@/shared/lib/api/users";
import type { User } from "@/shared/lib/types";
import type { ReferralLeadRow } from "@/shared/lib/api/referralLeads";
import { useSalesAgentAttribution } from "../hooks/useSalesAgentAttribution";
import { SalesAgentBadge } from "../components/SalesAgentBadge";

interface ChangeSalesAgentModalProps {
  lead: ReferralLeadRow;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (lead?: ReferralLeadRow) => void | Promise<void>;
}

export function ChangeSalesAgentModal({ lead, isOpen, onClose, onSaved }: ChangeSalesAgentModalProps) {
  const { change, isMutating, error, staleConflict, clearStaleConflict } = useSalesAgentAttribution();
  const [agentUserId, setAgentUserId] = useState("");
  const [agentLabel, setAgentLabel] = useState("");
  const [agentSearch, setAgentSearch] = useState("");
  const [agentHits, setAgentHits] = useState<User[]>([]);
  const [agentLoading, setAgentLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [attributionId, setAttributionId] = useState(lead.salesAgentCurrentAttributionId || "");

  const fetchAgents = useCallback(async (search: string) => {
    setAgentLoading(true);
    try {
      const res = await listUsers({ search: search.trim() || undefined, limit: 40, page: 1, status: "active", role: "sales_agent" });
      setAgentHits(res.results ?? []);
    } catch {
      setAgentHits([]);
    } finally {
      setAgentLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setAgentUserId("");
    setAgentLabel("");
    setAgentSearch("");
    setNotes("");
    setAttributionId(lead.salesAgentCurrentAttributionId || "");
    clearStaleConflict();
  }, [isOpen, lead, clearStaleConflict]);

  useEffect(() => {
    if (!isOpen) return;
    const delay = agentSearch.trim() === "" ? 0 : 300;
    const t = window.setTimeout(() => void fetchAgents(agentSearch), delay);
    return () => window.clearTimeout(t);
  }, [isOpen, agentSearch, fetchAgents]);

  useEffect(() => {
    if (!staleConflict) return;
    void onSaved();
    clearStaleConflict();
  }, [staleConflict, onSaved, clearStaleConflict]);

  const onSubmit = async () => {
    if (!agentUserId || !attributionId) return;
    try {
      const res = await change(lead.id, {
        salesAgentUserId: agentUserId,
        jobId: lead.salesAgentJobScope === "job" && lead.job?.id ? lead.job.id : null,
        expectedCurrentAttributionId: attributionId,
        notes: notes.trim() || undefined,
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
      <div className="relative bg-white dark:bg-bodybg2 rounded-xl border border-slate-200 dark:border-white/10 p-6 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Change sales agent</h3>
        <div className="mt-3 rounded-lg border border-slate-200 dark:border-white/10 p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Current assigned sales agent</p>
          <SalesAgentBadge
            agent={lead.salesAgent}
            scope={lead.salesAgentJobScope}
            jobTitle={lead.job?.title}
            showScope
          />
        </div>
        <div className="mt-4 space-y-3">
          <div className="relative">
            <label className="form-label">New assigned sales agent</label>
            {agentUserId ? (
              <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5">
                <span className="min-w-0 truncate">{agentLabel}</span>
                <button type="button" className="ti-btn ti-btn-light ti-btn-sm" onClick={() => { setAgentUserId(""); setAgentLabel(""); }}>
                  Clear
                </button>
              </div>
            ) : null}
            <input
              className="form-control w-full"
              placeholder="Search sales agents…"
              value={agentSearch}
              onChange={(e) => { setAgentSearch(e.target.value); setPickerOpen(true); }}
              onFocus={() => setPickerOpen(true)}
              disabled={!!agentUserId}
            />
            {pickerOpen && !agentUserId && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-white/10 dark:bg-slate-900">
                {agentLoading ? (
                  <div className="px-3 py-3 text-sm text-slate-500">Loading…</div>
                ) : (
                  agentHits.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-white/10"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setAgentUserId(u.id);
                        setAgentLabel(u.name?.trim() && u.email ? `${u.name} · ${u.email}` : u.name || u.email || u.id);
                        setAgentSearch("");
                        setPickerOpen(false);
                      }}
                    >
                      {u.name || u.email}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <div>
            <label className="form-label">Notes (optional, {notes.length}/2000)</label>
            <textarea className="form-control w-full" rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {error && <p className="text-sm text-danger m-0">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="ti-btn ti-btn-light" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="ti-btn ti-btn-primary disabled:opacity-60"
            disabled={isMutating || !agentUserId || !attributionId}
            onClick={() => void onSubmit()}
          >
            {isMutating ? "Saving…" : "Save change"}
          </button>
        </div>
      </div>
    </div>
  );
}
