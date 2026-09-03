"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AxiosError } from "axios";
import {
  assignCompanyPhoneNumberToUser,
  getCompanyPhoneUserAssignments,
  syncCompanyPhoneNumbers,
  type CompanyPhoneNumberOption,
  type CompanyPhoneUserAssignmentRow,
} from "@/shared/lib/api/companyPhoneNumbers";
import { useAuth } from "@/shared/contexts/auth-context";
import { hasPermission } from "@/shared/lib/permissions";
import { useConfirm } from "@/shared/components/ui/useConfirm";
import pipelineStyles from "../../../ats/ats-pipeline-list.module.css";

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

function formatPhoneDisplay(e164: string): string {
  const digits = String(e164 || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    const d = digits.slice(1);
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return e164 || "—";
}

function axiosMessage(e: unknown, fallback: string): string {
  if (e instanceof AxiosError) {
    return (e.response?.data as { message?: string })?.message ?? e.message ?? fallback;
  }
  return e instanceof Error ? e.message : fallback;
}

export default function CompanyWorkNumberAssignmentPanel({ reloadToken = 0 }: { reloadToken?: number }) {
  const auth = useAuth();
  const canManage = hasPermission(auth, "manage_company_number");
  const { confirm, confirmDialog } = useConfirm();

  const [users, setUsers] = useState<CompanyPhoneUserAssignmentRow[]>([]);
  const [numbers, setNumbers] = useState<CompanyPhoneNumberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [draftByUserId, setDraftByUserId] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [rowFlash, setRowFlash] = useState<Record<string, "saved" | null>>({});
  const flashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const flashSaved = useCallback((id: string) => {
    if (flashTimers.current[id]) clearTimeout(flashTimers.current[id]);
    setRowFlash((prev) => ({ ...prev, [id]: "saved" }));
    flashTimers.current[id] = setTimeout(() => {
      setRowFlash((prev) => ({ ...prev, [id]: null }));
      delete flashTimers.current[id];
    }, 2200);
  }, []);

  useEffect(() => {
    return () => Object.values(flashTimers.current).forEach(clearTimeout);
  }, []);

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      if (canManage) {
        try {
          await syncCompanyPhoneNumbers();
        } catch {
          // Non-fatal: roster still loads from registry; user can retry Sync from Twilio.
        }
      }
      const data = await getCompanyPhoneUserAssignments();
      setUsers(data.users || []);
      setNumbers(data.numbers || []);
      const next: Record<string, string> = {};
      for (const u of data.users || []) {
        next[u.userId] = u.companyPhoneNumberId || "";
      }
      setDraftByUserId(next);
    } catch (e) {
      setError(axiosMessage(e, "Failed to load user assignments"));
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    void load();
  }, [load, reloadToken]);

  const handleSync = async () => {
    if (!canManage) return;
    setSyncing(true);
    setError("");
    try {
      await syncCompanyPhoneNumbers();
      await load();
    } catch (e) {
      setError(axiosMessage(e, "Sync from Twilio failed"));
    } finally {
      setSyncing(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = users;
    if (q) {
      rows = rows.filter((u) => {
        const hay = `${u.fullName} ${u.email} ${u.companyPhoneNumber || ""} ${u.roleLabel}`.toLowerCase();
        return hay.includes(q);
      });
    }
    if (showUnassignedOnly) {
      rows = rows.filter((u) => !(u.companyPhoneNumber || "").trim());
    }
    return rows;
  }, [users, search, showUnassignedOnly]);

  const unassignedCount = useMemo(
    () => users.filter((u) => !(u.companyPhoneNumber || "").trim()).length,
    [users],
  );

  /**
   * Assignment saves on change. The only confirm step is a reassignment — taking a number
   * off a user who already holds it, which silently kills their dialer. `savingId` drives
   * the spinner AND blocks a second request for the same row, and the draft only ever
   * moves to the server's answer: on failure it snaps back to the last confirmed value,
   * so the roster never shows an assignment the backend rejected.
   */
  const saveRow = async (userId: string, draft: string) => {
    if (!canManage || savingId === userId) return;
    const confirmed = users.find((u) => u.userId === userId)?.companyPhoneNumberId || "";
    // Optimistic first so the cancel path is a real state change — a controlled <select>
    // does not snap back on its own when the handler leaves state untouched.
    setDraftByUserId((prev) => ({ ...prev, [userId]: draft }));

    const target = draft ? numbers.find((n) => n._id === draft) : undefined;
    const holderId = target?.assignedToUserId;
    if (target && holderId && holderId !== userId) {
      const holder = formatDisplayName(
        users.find((u) => u.userId === holderId)?.fullName || "another user",
      );
      const recipient = formatDisplayName(
        users.find((u) => u.userId === userId)?.fullName || "this user",
      );
      const strong = "font-semibold text-defaulttextcolor dark:text-white";
      const ok = await confirm({
        title: "Reassign this number?",
        tone: "danger",
        confirmLabel: "Reassign number",
        cancelLabel: "Keep as is",
        message: (
          <div className="space-y-2.5">
            <p className="mb-0">
              <span className={`font-mono ${strong}`}>{formatPhoneDisplay(target.phoneNumber)}</span>{" "}
              is currently allocated to <span className={strong}>{holder}</span>.
            </p>
            <p className="mb-0">
              Assign it to <span className={strong}>{recipient}</span> instead?
            </p>
            <p className="mb-0 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.08] px-3 py-2 text-amber-800 dark:text-amber-200">
              <i className="ri-phone-off-line mt-0.5 shrink-0 text-base" aria-hidden />
              <span>
                {holder} will no longer be able to use calling in the dialer until another number is
                assigned to them.
              </span>
            </p>
          </div>
        ),
      });
      if (!ok) {
        setDraftByUserId((prev) => ({ ...prev, [userId]: confirmed }));
        return;
      }
    }

    setSavingId(userId);
    setError("");
    try {
      const res = await assignCompanyPhoneNumberToUser({
        userId,
        companyPhoneNumberId: draft || null,
      });
      // A reassignment moves the number off whoever held it. The server already did that,
      // so drop it from the old holder's row here too — otherwise the roster shows one
      // number on two users until the next refresh.
      const displaced = res.companyPhoneNumberId
        ? users.find((u) => u.userId !== userId && u.companyPhoneNumberId === res.companyPhoneNumberId)
            ?.userId
        : undefined;
      setUsers((prev) =>
        prev.map((u) => {
          if (u.userId === userId) {
            return {
              ...u,
              companyPhoneNumberId: res.companyPhoneNumberId,
              companyPhoneNumber: res.companyPhoneNumber || "",
            };
          }
          if (u.userId === displaced) {
            return { ...u, companyPhoneNumberId: null, companyPhoneNumber: "" };
          }
          return u;
        }),
      );
      setDraftByUserId((prev) => {
        const next = { ...prev, [userId]: res.companyPhoneNumberId || "" };
        if (displaced) next[displaced] = "";
        return next;
      });
      setNumbers((prev) =>
        prev.map((n) => {
          if (n._id === res.companyPhoneNumberId) return { ...n, assignedToUserId: userId };
          if (n.assignedToUserId === userId && n._id !== res.companyPhoneNumberId) {
            return { ...n, assignedToUserId: null };
          }
          return n;
        }),
      );
      flashSaved(userId);
    } catch (e) {
      // Backend refused (e.g. "already assigned to another user") — restore the confirmed value.
      setDraftByUserId((prev) => ({ ...prev, [userId]: confirmed }));
      setError(axiosMessage(e, "Save failed"));
    } finally {
      setSavingId(null);
    }
  };

  const activeNumbers = numbers.filter((n) => n.isActive);

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden">
      {confirmDialog}
      <div className="rounded-2xl border border-defaultborder/70 bg-white/60 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03] sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div>
            <h6 className="mb-1 text-[0.9375rem] font-semibold text-defaulttextcolor dark:text-white">
              Assign company work numbers
            </h6>
            <p className="mb-0 max-w-2xl text-xs leading-relaxed text-defaulttextcolor/60 dark:text-white/50">
              Pick a purchased Twilio number for each user. Inbound calls to that number ring the user&apos;s browser
              dialer when they are logged in on Communication → Calling.
            </p>
          </div>
          {canManage ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full border border-defaultborder/70 px-3 py-1.5 text-xs font-semibold"
                onClick={() => void load()}
                disabled={loading}
              >
                <i className={loading ? "ri-loader-4-line animate-spin" : "ri-restart-line"} aria-hidden />
                Refresh
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                onClick={() => void handleSync()}
                disabled={syncing}
              >
                <i className={syncing ? "ri-loader-4-line animate-spin" : "ri-cloud-line"} aria-hidden />
                Sync from Twilio
              </button>
            </div>
          ) : null}
        </div>

        {numbers.length === 0 && !loading ? (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
            No numbers in the registry yet. Click <strong>Sync from Twilio</strong> after buying numbers below.
          </p>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-danger/25 bg-danger/[0.07] px-4 py-3 text-sm text-danger" role="alert">
          {error}
        </div>
      ) : null}

      <div className="min-w-0 overflow-hidden rounded-2xl border border-defaultborder/70 bg-white shadow-sm dark:border-white/10 dark:bg-bodybg">
        <div className="flex flex-col gap-2 border-b border-defaultborder/60 px-3 py-3 dark:border-white/10 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4">
          <button
            type="button"
            className="group -mx-1 flex min-w-0 items-center gap-2 rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-defaultbackground/60 dark:hover:bg-white/[0.04]"
            onClick={() => setRosterOpen((v) => !v)}
            aria-expanded={rosterOpen}
            aria-controls="user-roster-table"
          >
            <i
              className={`ri-arrow-right-s-line text-lg text-defaulttextcolor/60 transition-transform duration-200 dark:text-white/60 ${
                rosterOpen ? "rotate-90" : ""
              }`}
              aria-hidden
            />
            <h6 className="mb-0 font-semibold text-defaulttextcolor dark:text-white">User roster</h6>
            <span className="rounded-full bg-defaultbackground/70 px-2 py-0.5 text-xs font-medium text-defaulttextcolor/60 dark:bg-white/[0.06] dark:text-white/50">
              {users.length}
            </span>
          </button>
          {rosterOpen ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                className="form-control form-control-sm !w-44 !rounded-lg"
                placeholder="Search users…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                type="button"
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
                  showUnassignedOnly
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                    : "border-defaultborder/60 text-defaulttextcolor/70"
                }`}
                onClick={() => setShowUnassignedOnly((v) => !v)}
              >
                {showUnassignedOnly ? `Missing only · ${unassignedCount}` : `Show missing · ${unassignedCount}`}
              </button>
            </div>
          ) : null}
        </div>

        {rosterOpen ? (
        <div id="user-roster-table" className={`${pipelineStyles.tableWrap} overflow-x-auto`}>
          <table className={`ti-custom-table full-width text-left text-sm ${pipelineStyles.tableWide}`}>
            <thead className="bg-defaultbackground/50 text-[0.6875rem] font-semibold uppercase tracking-wide text-defaulttextcolor/55 dark:bg-white/[0.04] dark:text-white/45">
              <tr>
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Login email</th>
                <th className="px-3 py-3">Roles</th>
                <th className="min-w-[220px] px-3 py-3">Company work number</th>
                {canManage ? (
                  <th className="w-14 px-3 py-3 text-center">
                    <span className="sr-only">Save</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-defaultborder/50 dark:divide-white/10">
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="animate-pulse">
                    <td colSpan={canManage ? 5 : 4} className="px-4 py-3">
                      <div className="h-3 max-w-xs rounded bg-defaultborder/50" />
                    </td>
                  </tr>
                ))}

              {!loading &&
                filtered.map((row) => {
                  const flash = rowFlash[row.userId] === "saved";
                  const draft = draftByUserId[row.userId] || "";
                  return (
                    <tr
                      key={row.userId}
                      className={flash ? "ring-1 ring-emerald-500/25" : ""}
                    >
                      <td className="px-3 py-2.5 align-middle">
                        <span className="font-medium text-defaulttextcolor dark:text-white">
                          {formatDisplayName(row.fullName)}
                        </span>
                      </td>
                      <td className="max-w-[14rem] truncate px-3 py-2.5 text-defaulttextcolor/70 dark:text-white/60">
                        {row.email}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-defaulttextcolor/55 dark:text-white/45">
                        {row.roleLabel}
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        {canManage ? (
                          <select
                            className="form-select form-select-sm !rounded-lg"
                            value={draft}
                            disabled={savingId === row.userId || activeNumbers.length === 0}
                            onChange={(e) => void saveRow(row.userId, e.target.value)}
                          >
                            <option value="">— None —</option>
                            {activeNumbers.map((n) => {
                              const inUse =
                                n.assignedToUserId && n.assignedToUserId !== row.userId;
                              return (
                                <option key={n._id} value={n._id}>
                                  {formatPhoneDisplay(n.phoneNumber)}
                                  {inUse ? " (reassign)" : ""}
                                </option>
                              );
                            })}
                          </select>
                        ) : (
                          <span className="font-mono text-sm">
                            {row.companyPhoneNumber
                              ? formatPhoneDisplay(row.companyPhoneNumber)
                              : "—"}
                          </span>
                        )}
                      </td>
                      {canManage ? (
                        // Status only — the dropdown saves itself (a reassignment confirms first).
                        <td className="px-3 py-2.5 text-center align-middle">
                          {savingId === row.userId ? (
                            <i
                              className="ri-loader-4-line animate-spin text-defaulttextcolor/60"
                              aria-label="Saving"
                            />
                          ) : flash ? (
                            <i className="ri-check-line text-emerald-600" aria-label="Saved" />
                          ) : null}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}

              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 5 : 4} className="px-4 py-8 text-center text-sm text-defaulttextcolor/55">
                    No users match your filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        ) : null}
      </div>
    </div>
  );
}
