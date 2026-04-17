"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import * as candidatesApi from "@/shared/lib/api/candidates";
import type { CandidateListItem, CompanyEmailAssignmentRow } from "@/shared/lib/api/candidates";
import { AxiosError } from "axios";

const PROVIDER_OPTIONS: { value: "" | "gmail" | "outlook" | "unknown"; label: string }[] = [
  { value: "", label: "Auto-detect" },
  { value: "gmail", label: "Google / Gmail" },
  { value: "outlook", label: "Microsoft / Outlook" },
  { value: "unknown", label: "Other" },
];

/** Shouty ALL-CAPS names → gentler title case for scanning */
function formatDisplayName(raw: string): string {
  const t = (raw || "").trim();
  if (!t) return t;
  if (t === t.toUpperCase() && /[A-Z]/.test(t)) {
    return t
      .toLowerCase()
      .split(/\s+/)
      .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");
  }
  return t;
}

export default function SettingsCompanyEmailPage() {
  const [enabled, setEnabled] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [students, setStudents] = useState<CompanyEmailAssignmentRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [draftById, setDraftById] = useState<
    Record<string, { email: string; provider: "" | "gmail" | "outlook" | "unknown" }>
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulkSavingAll, setBulkSavingAll] = useState(false);
  const [toggleSaving, setToggleSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkEmail, setBulkEmail] = useState("");
  const [bulkProvider, setBulkProvider] = useState<"" | "gmail" | "outlook" | "unknown">("");
  const [bulkSaving, setBulkSaving] = useState(false);
  /** Row id → 'saved' briefly after successful save */
  const [rowFlash, setRowFlash] = useState<Record<string, "saved" | null>>({});
  const liveMsgRef = useRef<HTMLParagraphElement | null>(null);
  const flashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const flashSaved = useCallback((id: string) => {
    if (flashTimers.current[id]) clearTimeout(flashTimers.current[id]);
    setRowFlash((prev) => ({ ...prev, [id]: "saved" }));
    flashTimers.current[id] = setTimeout(() => {
      setRowFlash((prev) => ({ ...prev, [id]: null }));
      delete flashTimers.current[id];
    }, 2200);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(flashTimers.current).forEach(clearTimeout);
    };
  }, []);

  const loadSettings = useCallback(async () => {
    setError("");
    setSettingsLoading(true);
    try {
      const s = await candidatesApi.getCompanyEmailSettings();
      setEnabled(Boolean(s.companyEmailAssignmentEnabled));
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? (e.response?.data as { message?: string })?.message ?? e.message
          : "Failed to load settings";
      setError(msg);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const loadList = useCallback(async () => {
    setError("");
    setListLoading(true);
    try {
      const data = await candidatesApi.getCompanyEmailAssignments();
      setStudents(data.students);
      setDraftById(() => {
        const next: Record<string, { email: string; provider: "" | "gmail" | "outlook" | "unknown" }> = {};
        for (const s of data.students) {
          next[s.id] = {
            email: s.companyAssignedEmail || "",
            provider: (s.companyEmailProvider as "" | "gmail" | "outlook" | "unknown") || "",
          };
        }
        return next;
      });
      setSelectedIds([]);
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? (e.response?.data as { message?: string })?.message ?? e.message
          : "Failed to load assignments";
      setError(msg);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (settingsLoading) return;
    if (enabled) void loadList();
    else setListLoading(false);
  }, [enabled, settingsLoading, loadList]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = students;
    if (q) {
      rows = rows.filter((s) => {
        const hay = `${s.fullName} ${s.email} ${s.companyAssignedEmail || ""}`.toLowerCase();
        return hay.includes(q);
      });
    }
    if (showUnassignedOnly) {
      rows = rows.filter((s) => !(s.companyAssignedEmail || "").trim());
    }
    return rows;
  }, [students, search, showUnassignedOnly]);

  const unassignedCount = useMemo(() => students.filter((s) => !(s.companyAssignedEmail || "").trim()).length, [students]);

  const isRowDirty = useCallback((row: CompanyEmailAssignmentRow) => {
    const draft = draftById[row.id];
    if (!draft) return false;
    const se = (row.companyAssignedEmail || "").trim();
    const de = (draft.email || "").trim();
    const sp = (row.companyEmailProvider || "").trim();
    const dp = (draft.provider || "").trim();
    return se !== de || sp !== dp;
  }, [draftById]);

  const dirtyFilteredIds = useMemo(() => filtered.filter((r) => isRowDirty(r)).map((r) => r.id), [filtered, isRowDirty]);

  const selectedInFiltered = useMemo(
    () => filtered.filter((f) => selectedIds.includes(f.id)).length,
    [filtered, selectedIds]
  );

  useEffect(() => {
    const el = selectAllRef.current;
    if (!el) return;
    if (filtered.length === 0) {
      el.indeterminate = false;
      return;
    }
    el.indeterminate = selectedInFiltered > 0 && selectedInFiltered < filtered.length;
  }, [filtered.length, selectedInFiltered]);

  const handleToggle = async (next: boolean) => {
    setToggleSaving(true);
    setError("");
    try {
      const s = await candidatesApi.patchCompanyEmailSettings(next);
      setEnabled(Boolean(s.companyEmailAssignmentEnabled));
      if (s.companyEmailAssignmentEnabled) await loadList();
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? (e.response?.data as { message?: string })?.message ?? e.message
          : "Could not update setting";
      setError(msg);
    } finally {
      setToggleSaving(false);
    }
  };

  const saveRow = async (id: string) => {
    const draft = draftById[id];
    if (!draft) return;
    setSavingId(id);
    setError("");
    try {
      const updated = await candidatesApi.assignCompanyAssignedEmail(id, {
        companyAssignedEmail: draft.email.trim() || null,
        companyEmailProvider: draft.provider || null,
      });
      const u = updated as CandidateListItem;
      setStudents((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                companyAssignedEmail: u.companyAssignedEmail || "",
                companyEmailProvider: (u.companyEmailProvider as string) || "",
              }
            : s
        )
      );
      setDraftById((prev) => ({
        ...prev,
        [id]: {
          email: u.companyAssignedEmail || "",
          provider: (u.companyEmailProvider as typeof draft.provider) || "",
        },
      }));
      flashSaved(id);
      if (liveMsgRef.current) liveMsgRef.current.textContent = `Saved company email for one person.`;
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? (e.response?.data as { message?: string })?.message ?? e.message
          : "Save failed";
      setError(msg);
    } finally {
      setSavingId(null);
    }
  };

  const saveAllDirty = async () => {
    const ids = [...dirtyFilteredIds];
    if (ids.length === 0) return;
    const snapshots = ids
      .map((id) => ({ id, draft: draftById[id] }))
      .filter((x): x is { id: string; draft: { email: string; provider: "" | "gmail" | "outlook" | "unknown" } } =>
        Boolean(x.draft)
      );
    if (snapshots.length === 0) return;
    setBulkSavingAll(true);
    setError("");
    try {
      for (const { id, draft } of snapshots) {
        const updated = await candidatesApi.assignCompanyAssignedEmail(id, {
          companyAssignedEmail: draft.email.trim() || null,
          companyEmailProvider: draft.provider || null,
        });
        const u = updated as CandidateListItem;
        setStudents((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  companyAssignedEmail: u.companyAssignedEmail || "",
                  companyEmailProvider: (u.companyEmailProvider as string) || "",
                }
              : s
          )
        );
        setDraftById((prev) => ({
          ...prev,
          [id]: {
            email: u.companyAssignedEmail || "",
            provider: (u.companyEmailProvider as "" | "gmail" | "outlook" | "unknown") || "",
          },
        }));
        flashSaved(id);
      }
      if (liveMsgRef.current) {
        liveMsgRef.current.textContent = `Saved ${snapshots.length} row(s) with pending changes.`;
      }
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? (e.response?.data as { message?: string })?.message ?? e.message
          : "Bulk save failed";
      setError(msg);
    } finally {
      setBulkSavingAll(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((f) => selectedIds.includes(f.id));
  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      const fset = new Set(filtered.map((f) => f.id));
      setSelectedIds((prev) => prev.filter((id) => !fset.has(id)));
    } else {
      setSelectedIds((prev) => {
        const set = new Set(prev);
        filtered.forEach((f) => set.add(f.id));
        return [...set];
      });
    }
  };

  const applyBulk = async () => {
    const email = bulkEmail.trim();
    if (!email || selectedIds.length === 0) return;
    const n = selectedIds.length;
    setBulkSaving(true);
    setError("");
    try {
      await Promise.all(
        selectedIds.map((id) =>
          candidatesApi.assignCompanyAssignedEmail(id, {
            companyAssignedEmail: email,
            companyEmailProvider: bulkProvider || null,
          })
        )
      );
      setBulkEmail("");
      await loadList();
      setSelectedIds([]);
      if (liveMsgRef.current) {
        liveMsgRef.current.textContent = `Applied company email to ${n} selected people.`;
      }
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? (e.response?.data as { message?: string })?.message ?? e.message
          : "Bulk update failed";
      setError(msg);
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <>
      <Seo title="Company work email" />
      <p ref={liveMsgRef} className="sr-only" aria-live="polite" aria-atomic="true" />

      <div className="box-body space-y-6 pb-6 motion-reduce:transition-none">
        {/* Page hero — aligned with Settings → Agents */}
        <div className="relative overflow-hidden rounded-2xl border border-defaultborder/60 bg-gradient-to-br from-slate-50/90 via-white to-white dark:from-white/[0.04] dark:via-bodybg dark:to-bodybg">
          <div
            className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full bg-emerald-500/[0.07] blur-3xl motion-reduce:opacity-0 dark:bg-emerald-400/[0.06]"
            aria-hidden
          />
          <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <span
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 shadow-sm ring-1 ring-emerald-500/15 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20"
                aria-hidden
              >
                <i className="ri-mail-send-line text-2xl transition-transform duration-300 hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100" />
              </span>
              <div>
                <h4 className="box-title mb-1.5 text-lg tracking-tight text-defaulttextcolor dark:text-white">
                  Company work email
                </h4>
                <p className="mb-0 max-w-2xl text-[0.8125rem] leading-relaxed text-defaulttextcolor/65 dark:text-white/55">
                  Record each person&apos;s company mailbox (Google Workspace or Microsoft 365). It stays separate from
                  their <span className="font-medium text-defaulttextcolor/80 dark:text-white/70">login email</span>.
                  They connect OAuth under <span className="font-medium text-defaulttextcolor/80 dark:text-white/70">Communication → Email</span>.
                </p>
              </div>
            </div>
            {enabled && !listLoading && (
              <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-defaultborder/60 bg-white/80 px-3 py-1 text-xs font-medium text-defaulttextcolor/80 dark:bg-white/5 dark:text-white/70">
                  <i className="ri-group-line text-emerald-600/80 dark:text-emerald-400/90" aria-hidden />
                  {students.length} people
                </span>
                <button
                  type="button"
                  onClick={() => setShowUnassignedOnly((v) => !v)}
                  disabled={unassignedCount === 0}
                  className="inline-flex items-center gap-1.5 rounded-full border border-defaultborder/60 bg-white/80 px-3 py-1 text-xs font-medium transition-colors hover:border-emerald-500/35 hover:bg-emerald-500/[0.06] hover:text-emerald-800 disabled:cursor-default disabled:opacity-55 dark:bg-white/5 dark:text-white/75 dark:hover:text-emerald-200"
                >
                  <i className="ri-mail-unread-line text-defaulttextcolor/45 dark:text-white/45" aria-hidden />
                  {unassignedCount} missing work email
                </button>
              </div>
            )}
          </div>
        </div>

        {error ? (
          <div
            className="flex gap-3 rounded-xl border border-danger/25 bg-danger/[0.07] px-4 py-3 text-sm text-danger motion-safe:opacity-100 motion-safe:transition-opacity motion-safe:duration-200 dark:bg-danger/10"
            role="alert"
          >
            <i className="ri-error-warning-line mt-0.5 shrink-0 text-lg" aria-hidden />
            <span>{error}</span>
          </div>
        ) : null}

        {/* Feature toggle */}
        <div className="rounded-2xl border border-defaultborder/70 bg-white/60 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h6 className="mb-1 text-[0.9375rem] font-semibold text-defaulttextcolor dark:text-white">
                Enable assignment hub
              </h6>
              <p className="mb-0 max-w-xl text-xs leading-relaxed text-defaulttextcolor/60 dark:text-white/50">
                When off, only this switch is shown. When on, you can search, filter, and assign addresses below — same
                flow as <span className="font-medium">Agents</span>, tuned for email.
              </p>
            </div>
            <label className="inline-flex cursor-pointer select-none items-center gap-3 rounded-full border border-defaultborder/60 bg-defaultbackground/50 px-3 py-2 dark:border-white/10 dark:bg-black/20">
              <span className="text-xs font-semibold uppercase tracking-wide text-defaulttextcolor/55 dark:text-white/45">
                {toggleSaving ? "Updating…" : enabled ? "Active" : "Inactive"}
              </span>
              <input
                type="checkbox"
                className="sr-only"
                checked={enabled}
                disabled={settingsLoading || toggleSaving}
                onChange={(e) => void handleToggle(e.target.checked)}
              />
              <span
                className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border border-black/5 transition-[background-color,box-shadow] motion-reduce:transition-none ${
                  enabled ? "bg-emerald-600 shadow-[0_0_0_3px_rgba(5,150,105,0.2)] dark:bg-emerald-500" : "bg-defaultborder/80 dark:bg-white/15"
                }`}
                aria-hidden
              >
                <span
                  className={`absolute top-0.5 inline-block h-6 w-6 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${
                    enabled ? "translate-x-[1.35rem]" : "translate-x-0.5"
                  }`}
                />
              </span>
            </label>
          </div>
        </div>

        {!enabled ? (
          <div className="rounded-2xl border border-dashed border-defaultborder/80 bg-defaultbackground/30 px-5 py-10 text-center dark:border-white/10 dark:bg-white/[0.02]">
            <i className="ri-toggle-line mb-3 inline-block text-3xl text-defaulttextcolor/25 dark:text-white/25" aria-hidden />
            <p className="mb-0 text-sm text-defaulttextcolor/65 dark:text-white/55">
              Turn the hub on to load the roster and assign company work emails.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="relative max-w-lg flex-1">
                <label className="sr-only" htmlFor="company-email-search">
                  Search candidates
                </label>
                <span
                  className="pointer-events-none absolute left-3.5 top-1/2 z-[1] flex h-8 w-8 -translate-y-1/2 items-center justify-center text-defaulttextcolor/45"
                  aria-hidden
                >
                  <i className="ri-search-line text-lg leading-none" />
                </span>
                <input
                  id="company-email-search"
                  type="search"
                  autoComplete="off"
                  placeholder="Search by name, login email, or saved company email…"
                  className="h-10 w-full rounded-xl border border-defaultborder/80 bg-white py-2 pl-12 pr-3 text-sm text-defaulttextcolor shadow-sm placeholder:text-defaulttextcolor/45 transition-[box-shadow,border-color] motion-reduce:transition-none focus:border-emerald-500/45 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-white/15 dark:bg-bodybg dark:placeholder:text-white/35"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-colors motion-reduce:transition-none ${
                    showUnassignedOnly
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:border-emerald-400/35 dark:bg-emerald-400/10 dark:text-emerald-100"
                      : "border-defaultborder/70 bg-white/90 text-defaulttextcolor/75 hover:border-emerald-500/30 hover:bg-emerald-500/[0.06] dark:border-white/12 dark:bg-white/5 dark:text-white/70"
                  }`}
                  onClick={() => setShowUnassignedOnly((v) => !v)}
                >
                  <i className={`${showUnassignedOnly ? "ri-filter-fill" : "ri-filter-3-line"}`} aria-hidden />
                  {showUnassignedOnly ? `Missing only · ${unassignedCount}` : `Show missing · ${unassignedCount}`}
                </button>
                {dirtyFilteredIds.length > 0 && (
                  <button
                    type="button"
                    disabled={bulkSavingAll || savingId !== null}
                    onClick={() => void saveAllDirty()}
                    className="inline-flex items-center gap-2 rounded-full border border-amber-500/35 bg-amber-500/[0.08] px-4 py-2 text-xs font-semibold text-amber-950 transition hover:bg-amber-500/[0.14] disabled:opacity-50 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-50"
                  >
                    <i className="ri-stack-line" aria-hidden />
                    {bulkSavingAll ? "Saving…" : `Save ${dirtyFilteredIds.length} pending change${dirtyFilteredIds.length === 1 ? "" : "s"}`}
                  </button>
                )}
              </div>
            </div>

            {/* Sticky bulk strip */}
            {selectedIds.length > 0 && (
              <div className="sticky bottom-4 z-10 rounded-2xl border border-emerald-500/25 bg-white/95 px-4 py-4 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)] backdrop-blur-md motion-safe:transition-all motion-safe:duration-300 dark:border-emerald-400/20 dark:bg-bodybg/95">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="mb-1 text-sm font-semibold text-defaulttextcolor dark:text-white">
                      {selectedIds.length} selected
                    </p>
                    <p className="mb-0 text-xs text-defaulttextcolor/60 dark:text-white/50">
                      Apply one company address to everyone in this selection (same mailbox policy for a batch).
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <input
                      type="email"
                      className="h-10 min-w-[14rem] rounded-xl border border-defaultborder/80 bg-white px-3 text-sm shadow-sm focus:border-emerald-500/45 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-white/15 dark:bg-bodybg dark:text-white"
                      placeholder="work.address@company.com"
                      value={bulkEmail}
                      onChange={(e) => setBulkEmail(e.target.value)}
                    />
                    <select
                      className="h-10 min-w-[10rem] rounded-xl border border-defaultborder/80 bg-white px-3 text-sm shadow-sm focus:border-emerald-500/45 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-white/15 dark:bg-bodybg dark:text-white"
                      value={bulkProvider}
                      onChange={(e) => setBulkProvider(e.target.value as typeof bulkProvider)}
                    >
                      {PROVIDER_OPTIONS.map((o) => (
                        <option key={o.value || "auto"} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="ti-btn inline-flex min-h-[2.5rem] items-center justify-center gap-2 rounded-xl border-0 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:pointer-events-none disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                      disabled={bulkSaving || !bulkEmail.trim()}
                      onClick={() => void applyBulk()}
                    >
                      {bulkSaving ? (
                        <>
                          <span
                            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none"
                            aria-hidden
                          />
                          Applying…
                        </>
                      ) : (
                        <>
                          <i className="ri-mail-add-line text-base" aria-hidden />
                          Apply to selected
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="ti-btn inline-flex min-h-[2.5rem] items-center justify-center rounded-xl border border-defaultborder/70 bg-white px-3 text-sm font-medium text-defaulttextcolor/70 hover:bg-slate-50 dark:border-white/15 dark:bg-transparent dark:text-white/65 dark:hover:bg-white/5"
                      onClick={() => setSelectedIds([])}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-defaultborder/70 bg-white shadow-sm dark:border-white/10 dark:bg-bodybg">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-defaultborder/60 px-4 py-3 dark:border-white/10">
                <h6 className="mb-0 font-semibold text-defaulttextcolor dark:text-white">Roster</h6>
                {listLoading ? (
                  <span className="inline-flex items-center gap-2 text-xs text-defaulttextcolor/50 dark:text-white/45" role="status">
                    <span
                      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-500/25 border-t-emerald-600 motion-reduce:animate-none dark:border-emerald-400/30 dark:border-t-emerald-300"
                      aria-hidden
                    />
                    Loading roster…
                  </span>
                ) : (
                  <span className="text-xs text-defaulttextcolor/50 dark:text-white/45">
                    {filtered.length} shown · {students.length} total
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="ti-custom-table full-width min-w-[760px] text-left text-sm">
                  <thead className="bg-defaultbackground/50 text-[0.6875rem] font-semibold uppercase tracking-wide text-defaulttextcolor/55 dark:bg-white/[0.04] dark:text-white/45">
                    <tr>
                        <th className="!w-11 px-3 py-3">
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          className="h-4 w-4 rounded border-defaultborder"
                          checked={allFilteredSelected && filtered.length > 0}
                          onChange={toggleSelectAllFiltered}
                          aria-label="Select all visible rows"
                        />
                      </th>
                      <th className="px-3 py-3">Name</th>
                      <th className="px-3 py-3">Login email</th>
                      <th className="px-3 py-3">Roles</th>
                      <th className="min-w-[220px] px-3 py-3">Company work email</th>
                      <th className="min-w-[140px] px-3 py-3">Provider</th>
                      <th className="w-14 px-3 py-3 text-center">
                        <span className="sr-only">Save row</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-defaultborder/50 dark:divide-white/10">
                    {listLoading &&
                      Array.from({ length: 6 }).map((_, i) => (
                        <tr key={`sk-${i}`} className="animate-pulse motion-reduce:animate-none">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-4 w-4 rounded bg-defaultborder/60 dark:bg-white/10" />
                              <div className="h-3 flex-1 max-w-[8rem] rounded bg-defaultborder/60 dark:bg-white/10" />
                              <div className="h-3 flex-1 max-w-[12rem] rounded bg-defaultborder/50 dark:bg-white/10" />
                              <div className="h-3 flex-1 max-w-[6rem] rounded bg-defaultborder/40 dark:bg-white/10" />
                              <div className="h-8 flex-1 max-w-[14rem] rounded-lg bg-defaultborder/50 dark:bg-white/10" />
                              <div className="h-8 w-24 rounded-lg bg-defaultborder/40 dark:bg-white/10" />
                              <div className="h-8 w-9 rounded-lg bg-defaultborder/40 dark:bg-white/10" />
                            </div>
                          </td>
                        </tr>
                      ))}

                    {!listLoading &&
                      filtered.map((row) => {
                        const draft =
                          draftById[row.id] ?? {
                            email: row.companyAssignedEmail || "",
                            provider: (row.companyEmailProvider as (typeof PROVIDER_OPTIONS)[number]["value"]) || "",
                          };
                        const dirty = isRowDirty(row);
                        const flash = rowFlash[row.id] === "saved";
                        return (
                          <tr
                            key={row.id}
                            className={`transition-colors motion-reduce:transition-none ${
                              dirty ? "bg-amber-500/[0.04] dark:bg-amber-400/[0.06]" : "hover:bg-defaultbackground/40 dark:hover:bg-white/[0.02]"
                            } ${flash ? "ring-1 ring-emerald-500/25 motion-safe:transition-[box-shadow] motion-safe:duration-500" : ""}`}
                          >
                            <td className="px-3 py-2.5 align-middle">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-defaultborder"
                                checked={selectedIds.includes(row.id)}
                                onChange={() => toggleSelect(row.id)}
                                aria-label={`Select ${row.fullName}`}
                              />
                            </td>
                            <td className="px-3 py-2.5 align-middle">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium text-defaulttextcolor dark:text-white">
                                  {formatDisplayName(row.fullName)}
                                </span>
                                {dirty ? (
                                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-400/15 dark:text-amber-100">
                                    <i className="ri-edit-2-line text-[0.7rem]" aria-hidden />
                                    Unsaved
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="max-w-[14rem] truncate px-3 py-2.5 align-middle text-defaulttextcolor/70 dark:text-white/60">
                              {row.email}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 align-middle text-xs text-defaulttextcolor/55 dark:text-white/45">
                              {row.ownerRoleLabel}
                            </td>
                            <td className="px-3 py-2.5 align-middle">
                              <input
                                type="email"
                                className={`form-control form-control-sm !rounded-lg border transition-shadow motion-reduce:transition-none ${
                                  dirty
                                    ? "border-amber-500/40 ring-1 ring-amber-500/15 dark:border-amber-400/35"
                                    : "border-defaultborder/70 dark:border-white/12"
                                }`}
                                value={draft.email}
                                onChange={(e) =>
                                  setDraftById((prev) => ({
                                    ...prev,
                                    [row.id]: { ...draft, email: e.target.value },
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key !== "Enter") return;
                                  e.preventDefault();
                                  if (dirty && !bulkSavingAll && savingId !== row.id) void saveRow(row.id);
                                }}
                                placeholder="name@company.com"
                                aria-label={`Company work email for ${formatDisplayName(row.fullName)}`}
                              />
                            </td>
                            <td className="px-3 py-2.5 align-middle">
                              <select
                                className="form-control form-control-sm !rounded-lg border-defaultborder/70 dark:border-white/12"
                                value={draft.provider}
                                onChange={(e) =>
                                  setDraftById((prev) => ({
                                    ...prev,
                                    [row.id]: {
                                      ...draft,
                                      provider: e.target.value as typeof draft.provider,
                                    },
                                  }))
                                }
                                aria-label="Mailbox provider hint"
                              >
                                {PROVIDER_OPTIONS.map((o) => (
                                  <option key={o.value || "auto"} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2.5 align-middle text-center">
                              <div className="inline-flex flex-col items-center gap-1">
                                <button
                                  type="button"
                                  title={dirty ? "Save this row" : "No changes to save"}
                                  disabled={!dirty || savingId === row.id || bulkSavingAll}
                                  onClick={() => void saveRow(row.id)}
                                  className={`ti-btn ti-btn-icon !h-9 !w-9 rounded-xl border transition motion-reduce:transition-none ${
                                    dirty
                                      ? "border-emerald-500/40 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                                      : "border-transparent bg-defaultbackground/60 text-defaulttextcolor/35 dark:bg-white/5 dark:text-white/30"
                                  }`}
                                  aria-label={`Save company email for ${formatDisplayName(row.fullName)}`}
                                >
                                  {savingId === row.id ? (
                                    <span
                                      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none"
                                      aria-hidden
                                    />
                                  ) : flash ? (
                                    <i className="ri-check-line text-lg transition-transform motion-reduce:transition-none" aria-hidden />
                                  ) : (
                                    <i className="ri-save-3-line text-lg" aria-hidden />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                    {!listLoading && filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-14 text-center">
                          <div className="mx-auto flex max-w-md flex-col items-center">
                            <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-defaultbackground text-2xl text-defaulttextcolor/35 dark:bg-white/5 dark:text-white/30">
                              <i className="ri-inbox-unarchive-line" aria-hidden />
                            </span>
                            <p className="mb-1 text-sm font-semibold text-defaulttextcolor dark:text-white">No matches</p>
                            <p className="mb-0 text-xs text-defaulttextcolor/55 dark:text-white/45">
                              Try another search, or turn off the missing-email filter.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
