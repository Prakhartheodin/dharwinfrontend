"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { IBM_Plex_Sans } from "next/font/google";
import Seo from "@/shared/layout-components/seo/seo";
import {
  getOffboardingConfig,
  saveOffboardingConfig,
  getOffboardingOverview,
  runOffboardingStep,
  type OffboardingStep,
  type OffboardingOverviewRow,
  type OffboardingActionKey,
} from "@/shared/lib/api/offboardingSop";

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
}: {
  row: OffboardingOverviewRow;
  busyKey: string;
  onRun: (employeeId: string, stepKey: OffboardingActionKey) => void;
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
            {!s.done && isAction(s.checkerKey) ? (
              <button
                type="button"
                className="ti-btn shrink-0 bg-primary text-white !py-1.5 !px-3 !rounded-md text-xs font-semibold hover:bg-primary/90 disabled:opacity-60"
                disabled={busyKey === `${row.employeeId}:${s.checkerKey}`}
                onClick={() => onRun(row.employeeId, s.checkerKey as OffboardingActionKey)}
              >
                {busyKey === `${row.employeeId}:${s.checkerKey}` ? "Working…" : "Run"}
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

export default function OffboardingSopSettingsPage() {
  const [steps, setSteps] = useState<OffboardingStep[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const [rows, setRows] = useState<OffboardingOverviewRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [busyKey, setBusyKey] = useState("");

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
        let body: { toUserIds?: string[] } | undefined;
        if (stepKey === "tasks_reassigned") {
          // Minimal v1 target picker — upgrade to a user-select modal when needed.
          const to = window.prompt("Reassign open tasks to user id:");
          if (!to) return;
          body = { toUserIds: [to.trim()] };
        }
        await runOffboardingStep(employeeId, stepKey, body);
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
                      <ExitEmployeeCard key={row.employeeId} row={row} busyKey={busyKey} onRun={onRun} />
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
