"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { IBM_Plex_Sans } from "next/font/google";
import Swal from "sweetalert2";
import Seo from "@/shared/layout-components/seo/seo";
import {
  getOffboardingConfig,
  saveOffboardingConfig,
  getOffboardingOverview,
  getOffboardingOpenTasks,
  getOffboardingBackdatedRequests,
  getAssignableUsers,
  runOffboardingStep,
  type OffboardingStep,
  type OffboardingOverviewRow,
  type OffboardingActionKey,
  type OffboardingOpenTask,
  type OffboardingBackdatedRequest,
  type AssignableUser,
} from "@/shared/lib/api/offboardingSop";
import {
  approveBackdatedAttendanceRequest,
  rejectBackdatedAttendanceRequest,
  updateBackdatedAttendanceRequest,
} from "@/shared/lib/api/backdated-attendance-requests";

/** Mirrors the Employee (onboarding) SOP page typography. */
const sopHeadline = IBM_Plex_Sans({ weight: ["600"], subsets: ["latin"], display: "swap" });
const sopSectionFont = IBM_Plex_Sans({ weight: ["500", "600"], subsets: ["latin"], display: "swap" });

const ACTION_KEYS: OffboardingActionKey[] = ["email_deactivated", "tasks_reassigned", "org_team_disabled"];
const isAction = (k: string): k is OffboardingActionKey => (ACTION_KEYS as string[]).includes(k);

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase() || "?";
}

function fmtDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** One resigned employee's exit checklist — mirrors the onboarding SOP preview panel. */
function ExitEmployeeCard({
  row,
  busyKey,
  onRun,
  onReassign,
  onReviewAttendance,
}: {
  row: OffboardingOverviewRow;
  busyKey: string;
  onRun: (employeeId: string, stepKey: OffboardingActionKey) => void;
  onReassign: (row: OffboardingOverviewRow) => void;
  onReviewAttendance: (row: OffboardingOverviewRow) => void;
}) {
  const pct = row.totalCount > 0 ? Math.round((100 * row.completedCount) / row.totalCount) : 0;

  return (
    <li className="rounded-lg border-t-2 border-primary/25 border-x border-b border-defaultborder/70 bg-gray-50/95 px-4 py-4 shadow-[inset_0_1px_0_0_rgba(0,0,0,0.05)] dark:border-defaultborder/20 dark:bg-bodybg/45">
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary dark:bg-primary/20"
          aria-hidden
        >
          {initials(row.fullName)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className={`${sopHeadline.className} truncate text-base text-gray-900 dark:text-white`}>
            {row.fullName || "Employee"}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {row.empCode ? <span>{row.empCode} · </span> : null}
            {row.email ? <span>{row.email} · </span> : null}
            <span>Leaves {fmtDate(row.resignDate)}</span>
          </p>
        </div>
        <span className="shrink-0 text-xs font-medium text-gray-600 dark:text-gray-300">
          {row.completedCount}/{row.totalCount}
        </span>
      </div>

      <div
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={row.totalCount}
        aria-valuenow={row.completedCount}
        aria-label={`Exit progress for ${row.fullName}`}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul
        className="mt-3 space-y-0 divide-y divide-defaultborder/50 dark:divide-defaultborder/15 border-t border-defaultborder/50 dark:border-defaultborder/15"
        aria-label="Exit steps"
      >
        {row.steps.map((s, idx) => (
          <li key={`${s.checkerKey}-${idx}`} className="flex items-start gap-3 py-2.5 first:pt-3">
            <input
              type="checkbox"
              readOnly
              checked={s.done}
              tabIndex={-1}
              className="mt-0.5 form-check-input h-4 w-4 rounded border-gray-400 text-primary focus:ring-primary/30 dark:border-white/40 dark:bg-bodybg dark:checked:bg-primary dark:checked:border-primary"
              aria-label={`${s.label}, ${s.done ? "complete" : "not complete"}`}
            />
            <div className="min-w-0 flex-1">
              <div
                className={`text-sm font-medium ${
                  s.done ? "text-gray-500 line-through dark:text-gray-500" : "text-gray-900 dark:text-gray-100"
                }`}
              >
                {s.label}
              </div>
              {s.description ? (
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{s.description}</p>
              ) : null}
            </div>
            {!s.done && s.checkerKey === "attendance_complete" ? (
              <button
                type="button"
                className="ti-btn shrink-0 bg-primary text-white !py-1.5 !px-3 !rounded-md text-xs font-semibold hover:bg-primary/90"
                onClick={() => onReviewAttendance(row)}
              >
                Review…
              </button>
            ) : !s.done && isAction(s.checkerKey) ? (
              <button
                type="button"
                className="ti-btn shrink-0 bg-primary text-white !py-1.5 !px-3 !rounded-md text-xs font-semibold hover:bg-primary/90 disabled:opacity-60"
                disabled={busyKey === `${row.employeeId}:${s.checkerKey}`}
                onClick={() =>
                  s.checkerKey === "tasks_reassigned"
                    ? onReassign(row)
                    : onRun(row.employeeId, s.checkerKey as OffboardingActionKey)
                }
              >
                {busyKey === `${row.employeeId}:${s.checkerKey}`
                  ? "Working…"
                  : s.checkerKey === "tasks_reassigned"
                  ? "Reassign…"
                  : "Run"}
              </button>
            ) : !s.done && s.linkTemplate ? (
              <Link
                href={s.linkTemplate}
                className="shrink-0 self-center text-xs font-medium text-primary hover:underline"
              >
                Open link
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </li>
  );
}

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  todo: "To do",
  on_going: "Ongoing",
  in_review: "In review",
};

/** Overlay: shows the departing employee's open tasks and reassigns them all to one new owner. */
function ReassignModal({
  row,
  onClose,
  onDone,
}: {
  row: OffboardingOverviewRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const [tasks, setTasks] = useState<OffboardingOpenTask[] | null>(null);
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [query, setQuery] = useState("");
  const [targetId, setTargetId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [usersErr, setUsersErr] = useState("");
  const [mode, setMode] = useState<"all" | "per">("all");
  const [perTask, setPerTask] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    getOffboardingOpenTasks(row.employeeId)
      .then((t) => alive && setTasks(t))
      .catch((e) => {
        console.error("[reassign] open-tasks failed:", e);
        if (alive) {
          setTasks([]);
          setErr("Failed to load tasks.");
        }
      });
    getAssignableUsers()
      .then((u) => alive && setUsers(u))
      .catch((e) => {
        console.error("[reassign] assignable-users failed:", e);
        if (alive) setUsersErr("Couldn't load the employee list.");
      });
    return () => {
      alive = false;
    };
  }, [row.employeeId]);

  // ponytail: client-side filter over the assignable list; add a server search param if rosters grow large.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? users.filter((u) => `${u.name ?? ""} ${u.email ?? ""}`.toLowerCase().includes(q))
      : users;
    return list.slice(0, 50);
  }, [users, query]);
  const labelOf = (u: AssignableUser) => u.name ?? u.email ?? "Unknown";

  const target = users.find((u) => u.id === targetId) || null;

  const perAssignments = (tasks ?? [])
    .filter((t) => perTask[t.id])
    .map((t) => ({ taskId: t.id, toUserIds: [perTask[t.id]] }));
  const canSubmit = mode === "per" ? perAssignments.length > 0 : Boolean(targetId);

  const confirm = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setErr("");
    try {
      const body = mode === "per" ? { assignments: perAssignments } : { toUserIds: [targetId] };
      await runOffboardingStep(row.employeeId, "tasks_reassigned", body);
      onDone();
    } catch {
      setErr("Reassignment failed.");
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Reassign tasks for ${row.fullName}`}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={() => !busy && onClose()}
        aria-hidden
      />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-defaultborder/70 bg-white shadow-2xl dark:border-defaultborder/25 dark:bg-bodybg">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-defaultborder/50 px-5 py-4 dark:border-defaultborder/20">
          <div className="min-w-0">
            <h3 className={`${sopHeadline.className} text-base text-gray-900 dark:text-white`}>Reassign open tasks</h3>
            <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
              From {row.fullName}
              {row.empCode ? ` · ${row.empCode}` : ""}
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-gray-200"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            <i className="ti ti-x text-lg" aria-hidden />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {err ? (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              {err}
            </div>
          ) : null}

          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Open tasks
            </span>
            {tasks ? (
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{tasks.length}</span>
            ) : null}
          </div>

          {tasks === null ? (
            <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">Loading tasks…</p>
          ) : tasks.length === 0 ? (
            <p className="rounded-lg border border-dashed border-defaultborder/60 bg-gray-50/80 py-6 text-center text-sm text-gray-600 dark:border-defaultborder/25 dark:bg-white/[0.02] dark:text-gray-400">
              No open tasks — nothing to reassign.
            </p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((t) => (
                <li
                  key={t.id}
                  className="rounded-lg border border-defaultborder/60 bg-gray-50/60 px-3 py-2.5 dark:border-defaultborder/20 dark:bg-white/[0.02]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 break-words text-sm font-medium text-gray-900 dark:text-gray-100">
                      {t.title}
                    </span>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary dark:bg-primary/20">
                      {STATUS_LABELS[t.status] ?? t.status}
                    </span>
                  </div>
                  {t.taskCode ? (
                    <span className="mt-0.5 block text-[11px] text-gray-400 dark:text-gray-500">{t.taskCode}</span>
                  ) : null}
                  {mode === "per" ? (
                    <select
                      className="form-select mt-2 h-9 w-full rounded-md text-sm"
                      style={{ colorScheme: "light" }}
                      value={perTask[t.id] ?? ""}
                      disabled={busy}
                      onChange={(e) => setPerTask((p) => ({ ...p, [t.id]: e.target.value }))}
                    >
                      <option value="">Keep open (no reassign)</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {labelOf(u)}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {/* Target picker */}
          {tasks && tasks.length > 0 ? (
            <div className="mt-4">
              {/* Mode toggle: one assignee for everything, or per-task. */}
              <div className="mb-3 inline-flex rounded-md border border-defaultborder/60 p-0.5 dark:border-defaultborder/25">
                {(["all", "per"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    disabled={busy}
                    onClick={() => setMode(m)}
                    className={`rounded px-3 py-1 text-xs font-medium transition ${
                      mode === m
                        ? "bg-primary text-white"
                        : "text-gray-600 hover:text-primary dark:text-gray-300"
                    }`}
                  >
                    {m === "all" ? "All tasks" : "Per task"}
                  </button>
                ))}
              </div>
              {usersErr ? (
                <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                  {usersErr}
                </div>
              ) : null}
              {mode === "per" ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Pick an assignee for each task above. Leave a task on “Keep open” to skip it.
                </p>
              ) : null}
              <div className={mode === "all" ? "" : "hidden"}>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Reassign all to
              </label>
              <input
                type="text"
                className="form-control h-9 w-full rounded-md"
                placeholder="Search employee by name or email…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={busy}
              />
              <div className="mt-2 max-h-44 overflow-y-auto rounded-md border border-defaultborder/60 dark:border-defaultborder/20">
                {filtered.length === 0 ? (
                  <p className="px-3 py-3 text-center text-xs text-gray-500 dark:text-gray-400">No matches.</p>
                ) : (
                  <ul className="divide-y divide-defaultborder/40 dark:divide-defaultborder/15">
                    {filtered.map((u) => {
                      const active = u.id === targetId;
                      return (
                        <li key={u.id}>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setTargetId(u.id)}
                            className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition ${
                              active
                                ? "bg-primary/10 dark:bg-primary/20"
                                : "hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                            }`}
                          >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary dark:bg-primary/25">
                              {initials(labelOf(u))}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm text-gray-900 dark:text-gray-100">
                                {labelOf(u)}
                              </span>
                              {u.name ? (
                                <span className="block truncate text-[11px] text-gray-500 dark:text-gray-400">
                                  {u.email}
                                </span>
                              ) : null}
                            </span>
                            {active ? <i className="ti ti-check text-primary" aria-hidden /> : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-defaultborder/50 px-5 py-3.5 dark:border-defaultborder/20">
          <button
            type="button"
            className="ti-btn !rounded-md border border-defaultborder/60 px-4 py-2 text-sm font-medium text-gray-600 hover:text-primary disabled:opacity-50 dark:text-gray-300"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ti-btn !rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            onClick={confirm}
            disabled={busy || !canSubmit || !tasks || tasks.length === 0}
          >
            {busy
              ? "Reassigning…"
              : mode === "per"
                ? `Reassign ${perAssignments.length || ""} task${perAssignments.length === 1 ? "" : "s"}`.trim()
                : target
                  ? `Reassign to ${labelOf(target)}`
                  : "Reassign"}
          </button>
        </div>
      </div>
    </div>
  );
}

const BD_STATUS: Record<string, { label: string; badge: string }> = {
  pending: { label: "Pending", badge: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/30" },
  approved: { label: "Approved", badge: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/30" },
  rejected: { label: "Rejected", badge: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:border-rose-500/30" },
  cancelled: { label: "Cancelled", badge: "bg-gray-100 text-gray-600 border-gray-300 dark:bg-white/10 dark:text-gray-300 dark:border-white/20" },
};

const bdDate = (s: string | null | undefined) => {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};
const bdTime = (s: string | null | undefined) => {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

/**
 * Overlay: the departing employee's backdated-attendance requests. Approve / reject / update
 * reuse the same endpoints as the Attendance → Backdated screen (gated by students.manage).
 */
function AttendanceModal({
  row,
  onClose,
}: {
  row: OffboardingOverviewRow;
  onClose: (changed: boolean) => void;
}) {
  const [requests, setRequests] = useState<OffboardingBackdatedRequest[] | null>(null);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);

  const load = useCallback(() => {
    getOffboardingBackdatedRequests(row.employeeId)
      .then(setRequests)
      .catch((e) => {
        console.error("[offboarding] backdated-requests failed:", e);
        setRequests([]);
        setErr("Failed to load backdated-attendance requests.");
      });
  }, [row.employeeId]);

  useEffect(() => {
    load();
  }, [load]);

  const errMsg = (e: unknown) =>
    (e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ??
    (e as { message?: string })?.message ??
    "Action failed.";

  const approve = async (req: OffboardingBackdatedRequest) => {
    const { value: comment } = await Swal.fire({
      title: "Approve request",
      input: "textarea",
      inputPlaceholder: "Comment (optional)",
      showCancelButton: true,
      confirmButtonText: "Approve",
      confirmButtonColor: "#16a34a",
    });
    if (comment === undefined) return;
    setBusyId(req.id);
    try {
      await approveBackdatedAttendanceRequest(req.id, comment || undefined);
      setChanged(true);
      load();
    } catch (e) {
      await Swal.fire({ icon: "error", title: "Error", text: errMsg(e) });
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (req: OffboardingBackdatedRequest) => {
    const { value: comment } = await Swal.fire({
      title: "Reject request",
      input: "textarea",
      inputPlaceholder: "Reason (optional)",
      showCancelButton: true,
      confirmButtonText: "Reject",
      confirmButtonColor: "#dc2626",
    });
    if (comment === undefined) return;
    setBusyId(req.id);
    try {
      await rejectBackdatedAttendanceRequest(req.id, comment || undefined);
      setChanged(true);
      load();
    } catch (e) {
      await Swal.fire({ icon: "error", title: "Error", text: errMsg(e) });
    } finally {
      setBusyId(null);
    }
  };

  const update = async (req: OffboardingBackdatedRequest) => {
    const entries = req.attendanceEntries ?? [];
    if (entries.length === 0) {
      await Swal.fire({ icon: "error", title: "Error", text: "No attendance entries in this request." });
      return;
    }
    const first = entries[0];
    const last = entries[entries.length - 1];
    const fromStr = new Date(first.date).toISOString().slice(0, 10);
    const toStr = new Date(last.date).toISOString().slice(0, 10);
    const pin = new Date(first.punchIn).toTimeString().slice(0, 5);
    const pout = first.punchOut ? new Date(first.punchOut).toTimeString().slice(0, 5) : "";
    const todayStr = new Date().toISOString().slice(0, 10);
    const { value: form } = await Swal.fire({
      title: "Update request",
      html: `
        <div class="text-left text-xs text-gray-500 mb-2">Punch in/out apply to every working day in the range (weekends excluded).</div>
        <label class="swal2-input-label">From</label>
        <input id="bdFrom" type="date" value="${fromStr}" max="${todayStr}" class="swal2-input">
        <label class="swal2-input-label">To</label>
        <input id="bdTo" type="date" value="${toStr}" max="${todayStr}" class="swal2-input">
        <input id="bdIn" type="time" value="${pin}" class="swal2-input">
        <input id="bdOut" type="time" value="${pout}" class="swal2-input">
        <input id="bdTz" type="text" value="${first.timezone || "UTC"}" class="swal2-input" placeholder="Timezone">
        <textarea id="bdNotes" class="swal2-textarea" placeholder="Notes">${req.notes ?? ""}</textarea>
      `,
      showCancelButton: true,
      confirmButtonText: "Update",
      preConfirm: () => {
        const g = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value;
        const fromDate = g("bdFrom"), toDate = g("bdTo"), punchIn = g("bdIn"), punchOut = g("bdOut");
        if (!fromDate || !toDate || !punchIn || !punchOut) {
          Swal.showValidationMessage("From, To, punch in, and punch out are required");
          return false;
        }
        if (toDate < fromDate) {
          Swal.showValidationMessage("To date must be on or after From date");
          return false;
        }
        return { fromDate, toDate, punchIn, punchOut, timezone: g("bdTz"), notes: (document.getElementById("bdNotes") as HTMLTextAreaElement)?.value };
      },
    });
    if (!form) return;
    setBusyId(req.id);
    try {
      const n = (t: string) => (t.length === 5 && t.includes(":") ? t : `${t.padStart(2, "0")}:00`);
      const pIn = n(form.punchIn), pOut = n(form.punchOut), tz = form.timezone || "UTC";
      const pad = (x: number) => String(x).padStart(2, "0");
      const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
      const built: Array<{ date: string; punchIn: string; punchOut: string; timezone: string }> = [];
      const cur = new Date(form.fromDate);
      cur.setHours(0, 0, 0, 0);
      const end = new Date(form.toDate);
      end.setHours(0, 0, 0, 0);
      while (cur <= end) {
        if (!isWeekend(cur)) {
          const key = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`;
          const inDt = new Date(`${key}T${pIn}`);
          let outDt = new Date(`${key}T${pOut}`);
          if (outDt <= inDt) outDt = new Date(outDt.getTime() + 86400000);
          if (outDt.getTime() - inDt.getTime() > 8 * 3600 * 1000) throw new Error("Duration cannot exceed 8 hours");
          built.push({ date: key, punchIn: inDt.toISOString(), punchOut: outDt.toISOString(), timezone: tz });
        }
        cur.setDate(cur.getDate() + 1);
      }
      if (built.length === 0) throw new Error("The selected date range has no working days (weekends excluded).");
      await updateBackdatedAttendanceRequest(req.id, { attendanceEntries: built, notes: form.notes || undefined });
      setChanged(true);
      load();
    } catch (e) {
      await Swal.fire({ icon: "error", title: "Error", text: errMsg(e) });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Backdated attendance for ${row.fullName}`}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => onClose(changed)} aria-hidden />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-defaultborder/70 bg-white shadow-2xl dark:border-defaultborder/25 dark:bg-bodybg">
        <div className="flex items-start justify-between gap-3 border-b border-defaultborder/50 px-5 py-4 dark:border-defaultborder/20">
          <div className="min-w-0">
            <h3 className={`${sopHeadline.className} text-base text-gray-900 dark:text-white`}>Backdated attendance</h3>
            <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
              {row.fullName}
              {row.empCode ? ` · ${row.empCode}` : ""}
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-gray-200"
            onClick={() => onClose(changed)}
            aria-label="Close"
          >
            <i className="ti ti-x text-lg" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {err ? (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              {err}
            </div>
          ) : null}

          {requests === null ? (
            <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">Loading requests…</p>
          ) : requests.length === 0 ? (
            <p className="rounded-lg border border-dashed border-defaultborder/60 bg-gray-50/80 py-6 text-center text-sm text-gray-600 dark:border-defaultborder/25 dark:bg-white/[0.02] dark:text-gray-400">
              No backdated-attendance requests for this employee.
            </p>
          ) : (
            <ul className="space-y-3">
              {requests.map((req) => {
                const st = BD_STATUS[req.status] ?? BD_STATUS.pending;
                const busy = busyId === req.id;
                return (
                  <li
                    key={req.id}
                    className="rounded-lg border border-defaultborder/60 bg-gray-50/60 px-3 py-3 dark:border-defaultborder/20 dark:bg-white/[0.02]"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${st.badge}`}>{st.label}</span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">Requested {bdDate(req.createdAt)}</span>
                    </div>
                    <ul className="space-y-1">
                      {req.attendanceEntries.map((e, i) => (
                        <li key={i} className="flex flex-wrap items-center gap-x-3 text-xs text-gray-700 dark:text-gray-300">
                          <span className="font-medium text-gray-900 dark:text-gray-100">{bdDate(e.date)}</span>
                          <span>In: {bdTime(e.punchIn)}</span>
                          <span>Out: {bdTime(e.punchOut)}</span>
                          {e.timezone ? <span className="text-gray-400">{e.timezone}</span> : null}
                        </li>
                      ))}
                    </ul>
                    {req.notes ? <p className="mt-1.5 text-xs italic text-gray-500 dark:text-gray-400">“{req.notes}”</p> : null}
                    {req.adminComment ? (
                      <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                        Review note: {req.adminComment}
                        {req.reviewedByName ? ` — ${req.reviewedByName}` : ""}
                      </p>
                    ) : null}
                    {req.status === "pending" ? (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => approve(req)}
                          className="ti-btn !rounded-md !py-1 !px-3 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {busy ? "…" : "Approve"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => reject(req)}
                          className="ti-btn !rounded-md !py-1 !px-3 text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => update(req)}
                          className="ti-btn !rounded-md !py-1 !px-3 text-xs font-semibold border border-defaultborder/60 text-gray-700 hover:text-primary disabled:opacity-60 dark:text-gray-300"
                        >
                          Update
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-defaultborder/50 px-5 py-3.5 dark:border-defaultborder/20">
          <button
            type="button"
            className="ti-btn !rounded-md border border-defaultborder/60 px-4 py-2 text-sm font-medium text-gray-600 hover:text-primary dark:text-gray-300"
            onClick={() => onClose(changed)}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OffboardingSopSettingsPage() {
  const [steps, setSteps] = useState<OffboardingStep[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const [rows, setRows] = useState<OffboardingOverviewRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [reassignRow, setReassignRow] = useState<OffboardingOverviewRow | null>(null);
  const [attendanceRow, setAttendanceRow] = useState<OffboardingOverviewRow | null>(null);

  useEffect(() => {
    getOffboardingConfig()
      .then((c) => setSteps(c.steps))
      .catch(() => setError("Failed to load Exit SOP config."));
  }, []);

  const loadOverview = useCallback(async () => {
    setLoadingRows(true);
    try {
      const o = await getOffboardingOverview();
      setRows(o.results);
    } catch {
      setError("Failed to load resigned-employee list.");
    } finally {
      setLoadingRows(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const updateStep = (i: number, patch: Partial<OffboardingStep>) =>
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const onSave = useCallback(async () => {
    setSaving(true);
    setMsg("");
    setError("");
    try {
      const c = await saveOffboardingConfig(steps);
      setSteps(c.steps);
      setMsg("Saved");
      await loadOverview();
    } catch {
      setError("Save failed.");
    } finally {
      setSaving(false);
    }
  }, [steps, loadOverview]);

  const onRun = useCallback(
    async (employeeId: string, stepKey: OffboardingActionKey) => {
      setBusyKey(`${employeeId}:${stepKey}`);
      setError("");
      try {
        await runOffboardingStep(employeeId, stepKey);
        await loadOverview();
      } catch {
        setError("Action failed.");
      } finally {
        setBusyKey("");
      }
    },
    [loadOverview]
  );

  return (
    <>
      <Seo title="Exit SOP" />
      <div className="grid grid-cols-12 gap-6 pt-6 sm:pt-8">
        <div className="xl:col-span-12 col-span-12">
          <div className="w-full max-w-none space-y-6">
            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </div>
            ) : null}

            {/* Editor card */}
            <section
              className="overflow-hidden rounded-xl border border-defaultborder/70 bg-white shadow-sm ring-1 ring-black/[0.03] dark:border-defaultborder/25 dark:bg-bodybg/40 dark:ring-white/[0.05]"
              aria-labelledby="exit-steps-heading"
            >
              <div className="flex flex-col gap-4 border-b border-defaultborder/50 bg-gradient-to-br from-slate-50 via-white to-slate-50/90 px-5 pt-5 pb-6 dark:border-defaultborder/20 dark:from-bodybg dark:via-bodybg/95 dark:to-bodybg/80 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className="mt-0.5 h-10 w-1 shrink-0 rounded-full bg-gradient-to-b from-rose-500 via-primary to-primary/70"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <h2
                      id="exit-steps-heading"
                      className={`${sopSectionFont.className} text-lg font-semibold tracking-tight text-gray-900 dark:text-white`}
                    >
                      Exit SOP steps
                    </h2>
                    <p className="mt-0.5 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                      Auto-starts when an employee&apos;s resignation date is set — no manual entry. Steps are fixed;
                      toggle, relabel, or reorder them.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="ti-btn inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border-2 border-primary/20 bg-white px-4 text-sm font-semibold text-primary shadow-sm transition hover:border-primary hover:bg-primary hover:text-white disabled:opacity-60 dark:border-primary/35 dark:bg-bodybg/60 dark:hover:bg-primary"
                  onClick={onSave}
                  disabled={saving}
                >
                  <i className="ti ti-device-floppy text-lg" aria-hidden />
                  <span className="whitespace-nowrap">{saving ? "Saving…" : "Save"}</span>
                  {msg ? <span className="ml-1 text-xs font-normal opacity-80">{msg}</span> : null}
                </button>
              </div>

              <div className="px-4 pb-5 pt-5 sm:px-5">
                <ul className="m-0 list-none space-y-3 p-0">
                  {steps.map((s, i) => (
                    <li
                      key={s.checkerKey}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-defaultborder/60 bg-gray-50/60 px-3 py-2.5 dark:border-defaultborder/20 dark:bg-white/[0.02]"
                    >
                      <input
                        type="checkbox"
                        checked={s.enabled !== false}
                        onChange={(e) => updateStep(i, { enabled: e.target.checked })}
                        className="form-check-input h-4 w-4 rounded border-gray-400 text-primary focus:ring-primary/30"
                        aria-label={`Enable ${s.label}`}
                      />
                      <input
                        className="form-control h-9 flex-1 min-w-[12rem] rounded-md"
                        value={s.label}
                        onChange={(e) => updateStep(i, { label: e.target.value })}
                        aria-label={`Label for ${s.checkerKey}`}
                      />
                      <input
                        type="number"
                        className="form-control h-9 w-20 rounded-md"
                        value={s.sortOrder}
                        onChange={(e) => updateStep(i, { sortOrder: Number(e.target.value) })}
                        aria-label={`Order for ${s.label}`}
                      />
                      <span className="text-xs text-gray-400 dark:text-gray-500">{s.checkerKey}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Auto-list dashboard — resigned employees with open exit steps */}
            <section
              className="overflow-hidden rounded-xl border border-defaultborder/70 bg-white shadow-sm ring-1 ring-black/[0.03] dark:border-defaultborder/25 dark:bg-bodybg/40 dark:ring-white/[0.05]"
              aria-labelledby="exit-dashboard-heading"
            >
              <div className="flex items-center justify-between border-b border-defaultborder/50 bg-gradient-to-br from-slate-50 via-white to-slate-50/90 px-5 py-4 dark:border-defaultborder/20 dark:from-bodybg dark:via-bodybg/95 dark:to-bodybg/80">
                <h2
                  id="exit-dashboard-heading"
                  className={`${sopSectionFont.className} text-lg font-semibold tracking-tight text-gray-900 dark:text-white`}
                >
                  Resigned employees · open exits
                </h2>
                <button
                  type="button"
                  className="ti-btn ti-btn-sm border border-defaultborder/60 !rounded-md text-xs font-medium text-gray-600 hover:text-primary dark:text-gray-300"
                  onClick={loadOverview}
                  disabled={loadingRows}
                >
                  {loadingRows ? "Refreshing…" : "Refresh"}
                </button>
              </div>
              <div className="px-4 py-5 sm:px-5">
                {loadingRows ? (
                  <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading…</p>
                ) : rows.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-defaultborder/60 bg-gray-50/80 py-8 text-center text-sm text-gray-600 dark:border-defaultborder/25 dark:bg-white/[0.02] dark:text-gray-400">
                    No open exits. Setting an employee&apos;s resignation date adds them here automatically.
                  </p>
                ) : (
                  <ul className="m-0 list-none space-y-4 p-0">
                    {rows.map((row) => (
                      <ExitEmployeeCard
                        key={row.employeeId}
                        row={row}
                        busyKey={busyKey}
                        onRun={onRun}
                        onReassign={setReassignRow}
                        onReviewAttendance={setAttendanceRow}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {reassignRow ? (
        <ReassignModal
          row={reassignRow}
          onClose={() => setReassignRow(null)}
          onDone={() => {
            setReassignRow(null);
            loadOverview();
          }}
        />
      ) : null}

      {attendanceRow ? (
        <AttendanceModal
          row={attendanceRow}
          onClose={(changed) => {
            setAttendanceRow(null);
            if (changed) loadOverview();
          }}
        />
      ) : null}
    </>
  );
}
