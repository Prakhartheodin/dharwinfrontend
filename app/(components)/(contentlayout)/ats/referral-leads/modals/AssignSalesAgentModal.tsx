"use client";

import { useCallback, useEffect, useState } from "react";
import { listUsers } from "@/shared/lib/api/users";
import type { User } from "@/shared/lib/types";
import type { ReferralLeadRow } from "@/shared/lib/api/referralLeads";
import { useSalesAgentAttribution } from "../hooks/useSalesAgentAttribution";

interface AssignSalesAgentModalProps {
  lead: ReferralLeadRow;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (lead?: ReferralLeadRow) => void | Promise<void>;
}

export function AssignSalesAgentModal({ lead, isOpen, onClose, onSaved }: AssignSalesAgentModalProps) {
  const { assign, isMutating, error, staleConflict, clearStaleConflict } = useSalesAgentAttribution();
  const [scope, setScope] = useState<"job" | "candidate">(lead.job?.id ? "job" : "candidate");
  const [agentUserId, setAgentUserId] = useState("");
  const [agentLabel, setAgentLabel] = useState("");
  const [agentSearch, setAgentSearch] = useState("");
  const [agentHits, setAgentHits] = useState<User[]>([]);
  const [agentLoading, setAgentLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [assignedDate, setAssignedDate] = useState(() => new Date().toISOString().slice(0, 10));

  const candidateLevelFrozen = Boolean(lead.salesAgentJobScope === "job" && lead.salesAgent);

  const fetchAgents = useCallback(async (search: string) => {
    setAgentLoading(true);
    try {
      const res = await listUsers({
        search: search.trim() || undefined,
        limit: 40,
        page: 1,
        status: "active",
        role: "sales_agent",
      });
      setAgentHits(res.results ?? []);
    } catch {
      setAgentHits([]);
    } finally {
      setAgentLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setScope(lead.job?.id ? "job" : "candidate");
    setAgentUserId("");
    setAgentLabel("");
    setAgentSearch("");
    setNotes("");
    setAssignedDate(new Date().toISOString().slice(0, 10));
    clearStaleConflict();
  }, [isOpen, lead.id, lead.job?.id, clearStaleConflict]);

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
    if (!agentUserId) return;
    const body = {
      salesAgentUserId: agentUserId,
      jobId: scope === "job" && lead.job?.id ? lead.job.id : null,
      notes: notes.trim() || undefined,
      assignedAt: assignedDate ? new Date(`${assignedDate}T12:00:00`).toISOString() : undefined,
    };
    try {
      const res = await assign(lead.id, body);
      onClose();
      await onSaved(res.lead);
    } catch {
      /* error surfaced via hook */
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-bgdark2 rounded-xl border border-slate-200 dark:border-white/10 p-6 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Assign sales agent</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Assign an assigned sales agent to {lead.fullName}. The assigning user is you; the target is the sales agent
          selected below.
        </p>
        <div className="mt-4 space-y-3">
          <fieldset className="space-y-2">
            <legend className="form-label mb-0">Attribution scope</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="assign-scope"
                checked={scope === "job"}
                disabled={!lead.job?.id}
                onChange={() => setScope("job")}
              />
              Per job{lead.job?.title ? `: ${lead.job.title}` : ""}
            </label>
            <label className="flex items-center gap-2 text-sm" title={candidateLevelFrozen ? "Job-specific rows exist; revoke them first." : undefined}>
              <input
                type="radio"
                name="assign-scope"
                checked={scope === "candidate"}
                disabled={candidateLevelFrozen}
                onChange={() => setScope("candidate")}
              />
              Candidate-level (all jobs)
            </label>
          </fieldset>
          <div className="relative">
            <label className="form-label">Assigned sales agent</label>
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
                ) : agentHits.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-slate-500">No matching sales agents.</div>
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
            <label className="form-label">Assignment date</label>
            <input
              type="date"
              className="form-control w-full"
              max={new Date().toISOString().slice(0, 10)}
              value={assignedDate}
              onChange={(e) => setAssignedDate(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">Notes (optional, {notes.length}/2000)</label>
            <textarea className="form-control w-full" rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {error && <p className="text-sm text-danger m-0">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="ti-btn ti-btn-light" onClick={onClose}>Cancel</button>
          <button type="button" className="ti-btn ti-btn-primary disabled:opacity-60" disabled={isMutating || !agentUserId} onClick={() => void onSubmit()}>
            {isMutating ? "Saving…" : "Save assignment"}
          </button>
        </div>
      </div>
    </div>
  );
}
