"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listUsers } from "@/shared/lib/api/users";
import { postReferralAttributionOverride, type ReferralLeadRow } from "@/shared/lib/api/referralLeads";
import type { User } from "@/shared/lib/types";

interface OverrideAttributionModalProps {
  lead: ReferralLeadRow;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

export function OverrideAttributionModal({ lead, isOpen, onClose, onSaved }: OverrideAttributionModalProps) {
  const [overrideUserId, setOverrideUserId] = useState("");
  const [overrideReferrerLabel, setOverrideReferrerLabel] = useState("");
  const [referrerSearch, setReferrerSearch] = useState("");
  const [referrerHits, setReferrerHits] = useState<User[]>([]);
  const [referrerLoading, setReferrerLoading] = useState(false);
  const [referrerListError, setReferrerListError] = useState<string | null>(null);
  const [referrerPickerOpen, setReferrerPickerOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideFormError, setOverrideFormError] = useState<string | null>(null);
  const [overrideSaving, setOverrideSaving] = useState(false);
  const overrideReasonRef = useRef<HTMLTextAreaElement>(null);

  const fetchReferrerDirectory = useCallback(async (search: string) => {
    setReferrerLoading(true);
    setReferrerListError(null);
    try {
      const res = await listUsers({
        search: search.trim() || undefined,
        limit: 40,
        page: 1,
        status: "active",
        role: "referral_eligible",
      });
      setReferrerHits(res.results ?? []);
    } catch (e: unknown) {
      setReferrerHits([]);
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string }; status?: number } }).response?.data?.message
          : null;
      const status =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { status?: number } }).response?.status
          : undefined;
      if (status === 403) {
        setReferrerListError("You need permission to list users (users.read), same as Settings → Users.");
      } else {
        setReferrerListError(msg || "Could not load users. Try again.");
      }
    } finally {
      setReferrerLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const q = referrerSearch;
    const delay = q.trim() === "" ? 0 : 300;
    const t = window.setTimeout(() => void fetchReferrerDirectory(q), delay);
    return () => window.clearTimeout(t);
  }, [isOpen, referrerSearch, fetchReferrerDirectory]);

  useEffect(() => {
    if (!isOpen) {
      setOverrideUserId("");
      setOverrideReferrerLabel("");
      setReferrerSearch("");
      setReferrerHits([]);
      setReferrerPickerOpen(false);
      setReferrerListError(null);
      setOverrideReason("");
      setOverrideFormError(null);
    }
  }, [isOpen]);

  const onSubmit = async () => {
    setOverrideFormError(null);
    if (!overrideUserId.trim()) {
      setOverrideFormError("Select a new referrer from the list.");
      return;
    }
    setOverrideSaving(true);
    try {
      await postReferralAttributionOverride(lead.id, {
        newReferredByUserId: overrideUserId.trim(),
        reason: overrideReason.trim(),
      });
      onClose();
      await onSaved();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && e !== null && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      const fallback =
        e instanceof Error ? e.message : typeof e === "string" ? e : "Override failed. Check permissions and try again.";
      setOverrideFormError(msg || fallback);
    } finally {
      setOverrideSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          onClose();
          setReferrerPickerOpen(false);
        }}
      />
      <div className="relative bg-white dark:bg-bgdark2 rounded-xl border border-slate-200 dark:border-white/10 p-6 max-w-md w-full shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Override attribution</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Current: {lead.referredBy?.name || "—"}. Choose the new referrer from your user directory (same as Settings →
          Users). You can add an optional reason for the audit log.
        </p>
        <div className="mt-4 space-y-3">
          <div className="relative">
            <label className="form-label" htmlFor="override-referrer-search">
              New referrer
            </label>
            {overrideUserId ? (
              <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5">
                <span className="min-w-0 truncate text-slate-800 dark:text-slate-100">{overrideReferrerLabel}</span>
                <button
                  type="button"
                  className="ti-btn ti-btn-light !shrink-0 ti-btn-sm"
                  onClick={() => {
                    setOverrideUserId("");
                    setOverrideReferrerLabel("");
                  }}
                >
                  Clear
                </button>
              </div>
            ) : null}
            <input
              id="override-referrer-search"
              className="form-control w-full"
              value={referrerSearch}
              onChange={(e) => {
                setReferrerSearch(e.target.value);
                setReferrerPickerOpen(true);
              }}
              onFocus={() => setReferrerPickerOpen(true)}
              placeholder="Search by name or email…"
              autoComplete="off"
              disabled={!!overrideUserId}
            />
            {referrerListError && <p className="text-xs text-danger mt-1 mb-0">{referrerListError}</p>}
            {referrerPickerOpen && !overrideUserId && (
              <div
                className="absolute left-0 right-0 top-full z-10 mt-1 max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-white/10 dark:bg-slate-900"
                role="listbox"
                aria-label="Matching users"
              >
                {referrerLoading ? (
                  <div className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">Loading users…</div>
                ) : referrerHits.length === 0 ? (
                  <div className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">No matching users.</div>
                ) : (
                  referrerHits.map((u) => {
                    const name = u.name?.trim() ?? "";
                    const displayLabel = name && u.email ? `${name} · ${u.email}` : name || u.email || u.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        role="option"
                        className="block w-full border-0 bg-transparent px-3 py-2.5 text-left text-sm text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-white/10"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setOverrideUserId(u.id);
                          setOverrideReferrerLabel(displayLabel);
                          setReferrerSearch("");
                          setReferrerPickerOpen(false);
                        }}
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-100">{u.name?.trim() || u.email}</span>
                        {u.name?.trim() && u.email ? (
                          <span className="block text-xs text-slate-500 dark:text-slate-400">{u.email}</span>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
          <div>
            <label className="form-label" htmlFor="override-reason">
              Reason (optional)
            </label>
            <textarea
              ref={overrideReasonRef}
              id="override-reason"
              className="form-control w-full"
              rows={3}
              value={overrideReason}
              onChange={(e) => {
                setOverrideReason(e.target.value);
                setOverrideFormError(null);
              }}
              aria-invalid={Boolean(overrideFormError)}
            />
          </div>
          {overrideFormError && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              {overrideFormError}
            </div>
          )}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            className="ti-btn ti-btn-light"
            onClick={() => {
              onClose();
              setReferrerPickerOpen(false);
              setOverrideFormError(null);
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ti-btn ti-btn-danger disabled:opacity-60"
            disabled={overrideSaving}
            onClick={() => void onSubmit()}
          >
            {overrideSaving ? "Saving…" : "Confirm override"}
          </button>
        </div>
      </div>
    </div>
  );
}
