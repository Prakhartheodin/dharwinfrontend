"use client";

import { useCallback, useEffect, useState } from "react";
import { listUsers } from "@/shared/lib/api/users";
import { listCandidates, type CandidateListItem } from "@/shared/lib/api/employees";
import { listJobs } from "@/shared/lib/api/jobs";
import type { User } from "@/shared/lib/types";
import type { ReferralLeadRow } from "@/shared/lib/api/referralLeads";
import { useSalesAgentAttribution } from "../hooks/useSalesAgentAttribution";

interface BackfillReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (lead?: ReferralLeadRow) => void | Promise<void>;
}

interface JobOption {
  id: string;
  title: string;
}

interface PickerState<T> {
  query: string;
  hits: T[];
  loading: boolean;
  open: boolean;
}

const emptyPicker = <T,>(): PickerState<T> => ({ query: "", hits: [], loading: false, open: false });

function resolveEmployeeOwnerId(candidate: CandidateListItem): string {
  if (candidate.ownerId) return String(candidate.ownerId);
  const owner = candidate.owner;
  if (typeof owner === "string") return owner;
  if (owner && typeof owner === "object") return String(owner.id || owner._id || "");
  return "";
}

export function BackfillReferralModal({ isOpen, onClose, onSaved }: BackfillReferralModalProps) {
  const { backfill, isMutating, error } = useSalesAgentAttribution();

  const [employeeId, setEmployeeId] = useState("");
  const [employeeLabel, setEmployeeLabel] = useState("");
  const [employeeOwnerId, setEmployeeOwnerId] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [employeePicker, setEmployeePicker] = useState(emptyPicker<CandidateListItem>());

  const [referrerId, setReferrerId] = useState("");
  const [referrerLabel, setReferrerLabel] = useState("");
  const [referrerEmail, setReferrerEmail] = useState("");
  const [referrerPicker, setReferrerPicker] = useState(emptyPicker<User>());

  const [agentId, setAgentId] = useState("");
  const [agentLabel, setAgentLabel] = useState("");
  const [agentPicker, setAgentPicker] = useState(emptyPicker<User>());

  const [jobId, setJobId] = useState("");
  const [jobLabel, setJobLabel] = useState("");
  const [jobPicker, setJobPicker] = useState(emptyPicker<JobOption>());

  const [referredAt, setReferredAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const reset = useCallback(() => {
    setEmployeeId(""); setEmployeeLabel(""); setEmployeeOwnerId(""); setEmployeeEmail(""); setEmployeePicker(emptyPicker());
    setReferrerId(""); setReferrerLabel(""); setReferrerEmail(""); setReferrerPicker(emptyPicker());
    setAgentId(""); setAgentLabel(""); setAgentPicker(emptyPicker());
    setJobId(""); setJobLabel(""); setJobPicker(emptyPicker());
    setReferredAt(new Date().toISOString().slice(0, 10));
    setNotes("");
  }, []);

  useEffect(() => {
    if (isOpen) reset();
  }, [isOpen, reset]);

  const fetchEmployees = useCallback(async (q: string) => {
    setEmployeePicker((s) => ({ ...s, loading: true }));
    try {
      const res = await listCandidates({
        fullName: q.trim() || undefined,
        limit: 20,
        page: 1,
        employmentStatus: "all",
        withoutReferrer: true,
      });
      setEmployeePicker((s) => ({ ...s, hits: res.results ?? [], loading: false }));
    } catch {
      setEmployeePicker((s) => ({ ...s, hits: [], loading: false }));
    }
  }, []);

  const fetchUsers = useCallback(async (q: string, role?: string): Promise<User[]> => {
    const res = await listUsers({ search: q.trim() || undefined, limit: 30, page: 1, status: "active", role });
    return res.results ?? [];
  }, []);

  const fetchReferrers = useCallback(async (q: string) => {
    setReferrerPicker((s) => ({ ...s, loading: true }));
    try {
      const hits = await fetchUsers(q);
      setReferrerPicker((s) => ({ ...s, hits, loading: false }));
    } catch {
      setReferrerPicker((s) => ({ ...s, hits: [], loading: false }));
    }
  }, [fetchUsers]);

  const fetchAgents = useCallback(async (q: string) => {
    setAgentPicker((s) => ({ ...s, loading: true }));
    try {
      const hits = await fetchUsers(q, "sales_agent");
      setAgentPicker((s) => ({ ...s, hits, loading: false }));
    } catch {
      setAgentPicker((s) => ({ ...s, hits: [], loading: false }));
    }
  }, [fetchUsers]);

  const fetchJobsLocal = useCallback(async (q: string) => {
    setJobPicker((s) => ({ ...s, loading: true }));
    try {
      const res = await listJobs({ search: q.trim() || undefined, limit: 20, page: 1 });
      const hits = (res.results || []).map((j: { id?: string; _id?: string; title?: string }) => ({
        id: String(j.id ?? j._id ?? ""),
        title: j.title || "",
      })).filter((j) => j.id);
      setJobPicker((s) => ({ ...s, hits, loading: false }));
    } catch {
      setJobPicker((s) => ({ ...s, hits: [], loading: false }));
    }
  }, []);

  useEffect(() => {
    if (!isOpen || employeeId || !employeePicker.open) return;
    const t = window.setTimeout(() => void fetchEmployees(employeePicker.query), employeePicker.query ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [isOpen, employeeId, employeePicker.open, employeePicker.query, fetchEmployees]);

  useEffect(() => {
    if (!isOpen || referrerId || !referrerPicker.open) return;
    const t = window.setTimeout(() => void fetchReferrers(referrerPicker.query), referrerPicker.query ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [isOpen, referrerId, referrerPicker.open, referrerPicker.query, fetchReferrers]);

  useEffect(() => {
    if (!isOpen || agentId || !agentPicker.open) return;
    const t = window.setTimeout(() => void fetchAgents(agentPicker.query), agentPicker.query ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [isOpen, agentId, agentPicker.open, agentPicker.query, fetchAgents]);

  useEffect(() => {
    if (!isOpen || jobId || !jobPicker.open) return;
    const t = window.setTimeout(() => void fetchJobsLocal(jobPicker.query), jobPicker.query ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [isOpen, jobId, jobPicker.open, jobPicker.query, fetchJobsLocal]);

  const sameAsReferrer = Boolean(
    referrerId &&
      ((employeeOwnerId && employeeOwnerId === referrerId) ||
        (employeeEmail &&
          referrerEmail &&
          employeeEmail.trim().toLowerCase() === referrerEmail.trim().toLowerCase()))
  );
  const agentSameAsReferrer = Boolean(agentId && referrerId && agentId === referrerId);
  const canSubmit = Boolean(employeeId && referrerId && agentId && referredAt && !sameAsReferrer && !agentSameAsReferrer);

  const onSubmit = async () => {
    if (!canSubmit) return;
    try {
      const res = await backfill({
        employeeId,
        referredByUserId: referrerId,
        salesAgentUserId: agentId,
        referralJobId: jobId || null,
        referredAt: new Date(`${referredAt}T12:00:00`).toISOString(),
        notes: notes.trim() || undefined,
      });
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
      <div className="relative bg-white dark:bg-bgdark2 rounded-xl border border-slate-200 dark:border-white/10 p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Add referred employee</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manually attach a referrer and sales agent to an existing employee who was referred before the system tracked it.
        </p>

        <div className="mt-4 space-y-3">
          <PickerField
            label="Employee"
            selectedLabel={employeeLabel}
            selectedId={employeeId}
            picker={employeePicker}
            setPicker={setEmployeePicker}
            onClear={() => {
              setEmployeeId("");
              setEmployeeLabel("");
              setEmployeeOwnerId("");
              setEmployeeEmail("");
            }}
            renderRow={(c) => (
              <div className="flex flex-col">
                <span>{c.fullName || c.email}</span>
                {c.email ? <span className="text-xs text-slate-500">{c.email}</span> : null}
              </div>
            )}
            keyOf={(c) => c.id || c._id || ""}
            onPick={(c) => {
              const id = c.id || c._id || "";
              setEmployeeId(String(id));
              setEmployeeOwnerId(resolveEmployeeOwnerId(c));
              setEmployeeEmail(c.email || "");
              setEmployeeLabel(c.fullName ? `${c.fullName}${c.email ? ` · ${c.email}` : ""}` : c.email || String(id));
            }}
            placeholder="Search by name…"
          />

          <PickerField
            label="Referred by"
            selectedLabel={referrerLabel}
            selectedId={referrerId}
            picker={referrerPicker}
            setPicker={setReferrerPicker}
            onClear={() => { setReferrerId(""); setReferrerLabel(""); setReferrerEmail(""); }}
            renderRow={(u) => <span>{u.name || u.email}</span>}
            keyOf={(u) => u.id}
            onPick={(u) => {
              setReferrerId(u.id);
              setReferrerEmail(u.email || "");
              setReferrerLabel(u.name ? `${u.name}${u.email ? ` · ${u.email}` : ""}` : u.email || u.id);
            }}
            placeholder="Search referrer user…"
          />
          {sameAsReferrer && <p className="text-xs text-danger m-0">Referrer cannot be the same person as the employee.</p>}

          <PickerField
            label="Sales agent"
            selectedLabel={agentLabel}
            selectedId={agentId}
            picker={agentPicker}
            setPicker={setAgentPicker}
            onClear={() => { setAgentId(""); setAgentLabel(""); }}
            renderRow={(u) => <span>{u.name || u.email}</span>}
            keyOf={(u) => u.id}
            onPick={(u) => {
              setAgentId(u.id);
              setAgentLabel(u.name ? `${u.name}${u.email ? ` · ${u.email}` : ""}` : u.email || u.id);
            }}
            placeholder="Search sales agents…"
          />
          {agentSameAsReferrer && <p className="text-xs text-danger m-0">Sales agent and referrer must be different.</p>}

          <PickerField
            label="Job (optional)"
            selectedLabel={jobLabel}
            selectedId={jobId}
            picker={jobPicker}
            setPicker={setJobPicker}
            onClear={() => { setJobId(""); setJobLabel(""); }}
            renderRow={(j) => <span>{j.title}</span>}
            keyOf={(j) => j.id}
            onPick={(j) => { setJobId(j.id); setJobLabel(j.title); }}
            placeholder="Search jobs…"
          />

          <div>
            <label className="form-label">Referred date</label>
            <input
              type="date"
              className="form-control w-full"
              max={new Date().toISOString().slice(0, 10)}
              value={referredAt}
              onChange={(e) => setReferredAt(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label">Notes (optional, {notes.length}/2000)</label>
            <textarea
              className="form-control w-full"
              rows={3}
              maxLength={2000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-danger m-0">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="ti-btn ti-btn-light" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="ti-btn ti-btn-primary disabled:opacity-60"
            disabled={isMutating || !canSubmit}
            onClick={() => void onSubmit()}
          >
            {isMutating ? "Saving…" : "Save referral"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface PickerFieldProps<T> {
  label: string;
  selectedLabel: string;
  selectedId: string;
  picker: PickerState<T>;
  setPicker: React.Dispatch<React.SetStateAction<PickerState<T>>>;
  onClear: () => void;
  onPick: (item: T) => void;
  renderRow: (item: T) => React.ReactNode;
  keyOf: (item: T) => string;
  placeholder: string;
}

function PickerField<T>({ label, selectedLabel, selectedId, picker, setPicker, onClear, onPick, renderRow, keyOf, placeholder }: PickerFieldProps<T>) {
  return (
    <div className="relative">
      <label className="form-label">{label}</label>
      {selectedId ? (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5">
          <span className="min-w-0 truncate">{selectedLabel}</span>
          <button type="button" className="ti-btn ti-btn-light ti-btn-sm" onClick={onClear}>Clear</button>
        </div>
      ) : null}
      <input
        className="form-control w-full"
        placeholder={placeholder}
        value={picker.query}
        onChange={(e) => setPicker((s) => ({ ...s, query: e.target.value, open: true }))}
        onFocus={() => setPicker((s) => ({ ...s, open: true }))}
        disabled={!!selectedId}
      />
      {picker.open && !selectedId && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-white/10 dark:bg-slate-900">
          {picker.loading ? (
            <div className="px-3 py-3 text-sm text-slate-500">Loading…</div>
          ) : picker.hits.length === 0 ? (
            <div className="px-3 py-3 text-sm text-slate-500">No matches.</div>
          ) : (
            picker.hits.map((item) => (
              <button
                key={keyOf(item)}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-white/10"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(item);
                  setPicker((s) => ({ ...s, query: "", open: false }));
                }}
              >
                {renderRow(item)}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
