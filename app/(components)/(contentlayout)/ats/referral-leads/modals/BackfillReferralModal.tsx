"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

function initialsFrom(text: string): string {
  if (!text) return "?";
  const parts = text.replace(/[·•].*$/, "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarTone(seed: string): string {
  const palette = [
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
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

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [referredAt, setReferredAt] = useState(todayIso);
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

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

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

  const completedSteps = [employeeId, referrerId, agentId, referredAt].filter(Boolean).length;
  const totalRequired = 4;

  const onSubmit = async () => {
    if (!canSubmit) return;
    try {
      const res = await backfill({
        employeeId,
        referredByUserId: referrerId,
        salesAgentUserId: agentId,
        referralJobId: jobId || null,
        // Local noon avoids a UTC date-shift; clamp to now so today-before-noon
        // never sends a future instant the backend rejects (.max('now')).
        referredAt: new Date(Math.min(new Date(`${referredAt}T12:00:00`).getTime(), Date.now())).toISOString(),
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-[fadeIn_.18s_ease-out]">
      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes popIn { from { opacity: 0; transform: translateY(8px) scale(.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10 dark:border-white/10 dark:bg-bgdark2"
        style={{ animation: "popIn .22s cubic-bezier(.2,.8,.2,1)" }}
      >
        <div className="relative flex items-start gap-3 border-b border-slate-100 p-5 dark:border-white/5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-inset ring-primary/20">
            <i className="ri-user-add-line text-lg leading-none" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
              Add referred employee
            </h3>
            <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
              Attach a referrer and sales agent to an existing employee referred before tracking began.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <i className="ri-close-line text-lg leading-none" />
          </button>
        </div>

        <div className="h-0.5 w-full bg-slate-100 dark:bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-primary/70 to-primary transition-[width] duration-300 ease-out"
            style={{ width: `${(completedSteps / totalRequired) * 100}%` }}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-3.5">
            <PickerField
              label="Employee"
              icon="ri-user-line"
              required
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
              renderRow={(c) => {
                const primary = c.fullName || c.email || "";
                return (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${avatarTone(primary)}`}>
                      {initialsFrom(primary)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{primary}</div>
                      {c.email && c.fullName ? (
                        <div className="truncate text-xs text-slate-500 dark:text-slate-400">{c.email}</div>
                      ) : null}
                    </div>
                  </div>
                );
              }}
              keyOf={(c) => c.id || c._id || ""}
              onPick={(c) => {
                const id = c.id || c._id || "";
                setEmployeeId(String(id));
                setEmployeeOwnerId(resolveEmployeeOwnerId(c));
                setEmployeeEmail(c.email || "");
                setEmployeeLabel(c.fullName ? `${c.fullName}${c.email ? ` · ${c.email}` : ""}` : c.email || String(id));
              }}
              placeholder="Search employees by name or email…"
            />

            <PickerField
              label="Referred by"
              icon="ri-user-shared-line"
              required
              selectedLabel={referrerLabel}
              selectedId={referrerId}
              picker={referrerPicker}
              setPicker={setReferrerPicker}
              onClear={() => { setReferrerId(""); setReferrerLabel(""); setReferrerEmail(""); }}
              renderRow={(u) => {
                const primary = u.name || u.email || "";
                return (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${avatarTone(primary)}`}>
                      {initialsFrom(primary)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{primary}</div>
                      {u.email && u.name ? (
                        <div className="truncate text-xs text-slate-500 dark:text-slate-400">{u.email}</div>
                      ) : null}
                    </div>
                  </div>
                );
              }}
              keyOf={(u) => u.id}
              onPick={(u) => {
                setReferrerId(u.id);
                setReferrerEmail(u.email || "");
                setReferrerLabel(u.name ? `${u.name}${u.email ? ` · ${u.email}` : ""}` : u.email || u.id);
              }}
              placeholder="Search referrer…"
            />
            {sameAsReferrer && <InlineAlert>Referrer cannot be the same person as the employee.</InlineAlert>}

            <PickerField
              label="Sales agent"
              icon="ri-customer-service-2-line"
              required
              selectedLabel={agentLabel}
              selectedId={agentId}
              picker={agentPicker}
              setPicker={setAgentPicker}
              onClear={() => { setAgentId(""); setAgentLabel(""); }}
              renderRow={(u) => {
                const primary = u.name || u.email || "";
                return (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${avatarTone(primary)}`}>
                      {initialsFrom(primary)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{primary}</div>
                      {u.email && u.name ? (
                        <div className="truncate text-xs text-slate-500 dark:text-slate-400">{u.email}</div>
                      ) : null}
                    </div>
                  </div>
                );
              }}
              keyOf={(u) => u.id}
              onPick={(u) => {
                setAgentId(u.id);
                setAgentLabel(u.name ? `${u.name}${u.email ? ` · ${u.email}` : ""}` : u.email || u.id);
              }}
              placeholder="Search sales agents…"
            />
            {agentSameAsReferrer && <InlineAlert>Sales agent and referrer must be different.</InlineAlert>}

            <PickerField
              label="Job"
              icon="ri-briefcase-line"
              optional
              selectedLabel={jobLabel}
              selectedId={jobId}
              picker={jobPicker}
              setPicker={setJobPicker}
              onClear={() => { setJobId(""); setJobLabel(""); }}
              renderRow={(j) => (
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-300">
                    <i className="ri-briefcase-line text-sm" />
                  </span>
                  <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{j.title}</span>
                </div>
              )}
              keyOf={(j) => j.id}
              onPick={(j) => { setJobId(j.id); setJobLabel(j.title); }}
              placeholder="Search jobs…"
            />

            <FieldShell label="Referred date" icon="ri-calendar-event-line" required>
              <div className="relative">
                <i className="ri-calendar-event-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  className="form-control w-full !pl-9"
                  max={todayIso}
                  value={referredAt}
                  onChange={(e) => setReferredAt(e.target.value)}
                />
              </div>
            </FieldShell>

            <FieldShell
              label="Notes"
              icon="ri-sticky-note-line"
              optional
              trailing={
                <span className={`text-[11px] tabular-nums ${notes.length > 1800 ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`}>
                  {notes.length}/2000
                </span>
              }
            >
              <textarea
                className="form-control w-full resize-none"
                rows={3}
                maxLength={2000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional context about this referral…"
              />
            </FieldShell>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/5 px-3 py-2.5 text-sm text-danger">
                <i className="ri-error-warning-fill mt-0.5 shrink-0" />
                <span className="min-w-0">{error}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 rounded-b-2xl dark:border-white/5 dark:bg-white/[0.02]">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {completedSteps}/{totalRequired} required
          </span>
          <div className="flex items-center gap-2">
            <button type="button" className="ti-btn ti-btn-light" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="ti-btn ti-btn-primary disabled:opacity-60"
              disabled={isMutating || !canSubmit}
              onClick={() => void onSubmit()}
            >
              {isMutating ? (
                <span className="inline-flex items-center gap-1.5">
                  <i className="ri-loader-4-line animate-spin" />
                  Saving…
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <i className="ri-check-line" />
                  Save referral
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InlineAlert({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-1.5 rounded-md bg-danger/5 px-2.5 py-1.5 text-[12px] text-danger">
      <i className="ri-error-warning-line mt-px shrink-0" />
      <span>{children}</span>
    </div>
  );
}

interface FieldShellProps {
  label: string;
  icon?: string;
  required?: boolean;
  optional?: boolean;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}

function FieldShell({ label, icon, required, optional, trailing, children }: FieldShellProps) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-slate-700 dark:text-slate-200">
          {icon ? <i className={`${icon} text-slate-400`} /> : null}
          <span>{label}</span>
          {required && <span className="text-danger">*</span>}
          {optional && <span className="text-[11px] font-normal text-slate-400">optional</span>}
        </label>
        {trailing}
      </div>
      {children}
    </div>
  );
}

interface PickerFieldProps<T> {
  label: string;
  icon?: string;
  required?: boolean;
  optional?: boolean;
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

function PickerField<T>({
  label,
  icon,
  required,
  optional,
  selectedLabel,
  selectedId,
  picker,
  setPicker,
  onClear,
  onPick,
  renderRow,
  keyOf,
  placeholder,
}: PickerFieldProps<T>) {
  return (
    <FieldShell label={label} icon={icon} required={required} optional={optional}>
      {selectedId ? (
        <div className="group flex items-center gap-2.5 rounded-xl border border-primary/25 bg-primary/[0.04] px-3 py-2 dark:border-primary/30 dark:bg-primary/10">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${avatarTone(selectedLabel)}`}>
            {initialsFrom(selectedLabel)}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
            {selectedLabel}
          </span>
          <button
            type="button"
            aria-label="Clear"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-white"
            onClick={onClear}
          >
            <i className="ri-close-line text-base" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <i className="ri-search-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="form-control w-full !pl-9 !pr-9"
            placeholder={placeholder}
            value={picker.query}
            onChange={(e) => setPicker((s) => ({ ...s, query: e.target.value, open: true }))}
            onFocus={() => setPicker((s) => ({ ...s, open: true }))}
            onBlur={() => window.setTimeout(() => setPicker((s) => ({ ...s, open: false })), 120)}
          />
          {picker.loading ? (
            <i className="ri-loader-4-line absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
          ) : picker.query ? (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5"
              onMouseDown={(e) => { e.preventDefault(); setPicker((s) => ({ ...s, query: "" })); }}
            >
              <i className="ri-close-line text-sm" />
            </button>
          ) : null}

          {picker.open && (
            <div
              className="absolute left-0 right-0 top-full z-20 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 dark:border-white/10 dark:bg-slate-900"
              style={{ animation: "popIn .14s ease-out" }}
            >
              {picker.loading ? (
                <div className="flex items-center gap-2 px-3 py-3 text-sm text-slate-500">
                  <i className="ri-loader-4-line animate-spin" />
                  Searching…
                </div>
              ) : picker.hits.length === 0 ? (
                <div className="flex flex-col items-center gap-1 px-3 py-5 text-center text-sm text-slate-500">
                  <i className="ri-search-eye-line text-xl text-slate-300" />
                  <span>No matches found</span>
                  {picker.query && (
                    <span className="text-xs text-slate-400">Try a different search term</span>
                  )}
                </div>
              ) : (
                <div className="py-1">
                  {picker.hits.map((item) => (
                    <button
                      key={keyOf(item)}
                      type="button"
                      className="block w-full px-3 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onPick(item);
                        setPicker((s) => ({ ...s, query: "", open: false }));
                      }}
                    >
                      {renderRow(item)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </FieldShell>
  );
}
