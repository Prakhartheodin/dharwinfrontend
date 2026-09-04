"use client";

import { useEffect, useRef, useState } from "react";
import type { BackdatedDayConflict } from "@/shared/lib/api/backdated-attendance-requests";

export type ConflictPolicy = "skip" | "overwrite";

export interface AttendanceConflictOverlayProps {
  open: boolean;
  /** Days that already carry a holiday, a recorded leave, or a week-off. */
  conflicts: BackdatedDayConflict[];
  /** How many days the admin asked to write in total, conflicts included. */
  totalDays: number;
  personName?: string;
  submitting?: boolean;
  onCancel: () => void;
  onConfirm: (policy: ConflictPolicy) => void;
}

const KIND_META: Record<BackdatedDayConflict["kind"], { icon: string; label: string; tone: string }> = {
  holiday: {
    icon: "ri-flag-2-line",
    label: "Holiday",
    tone: "text-violet-700 bg-violet-500/10 ring-violet-500/20 dark:text-violet-300",
  },
  leave: {
    icon: "ri-suitcase-line",
    label: "Leave",
    tone: "text-amber-700 bg-amber-500/10 ring-amber-500/20 dark:text-amber-300",
  },
  weekoff: {
    icon: "ri-moon-line",
    label: "Week off",
    tone: "text-sky-700 bg-sky-500/10 ring-sky-500/20 dark:text-sky-300",
  },
};

function formatConflictDate(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Consent gate for the admin instant-add flow.
 *
 * Writing Present over a holiday or a recorded leave destroys that record, so the admin has to
 * say which they mean. The safe choice (keep) is the default; overwrite is opt-in and turns the
 * confirm button destructive and relabels it, so the consequence is never carried by colour alone.
 */
export default function AttendanceConflictOverlay({
  open,
  conflicts,
  totalDays,
  personName,
  submitting = false,
  onCancel,
  onConfirm,
}: AttendanceConflictOverlayProps) {
  const [policy, setPolicy] = useState<ConflictPolicy>("skip");
  const panelRef = useRef<HTMLDivElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // Remember the trigger so focus returns where it came from on close.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  // Escape cancels; Tab is trapped inside the panel.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) {
        e.stopPropagation();
        onCancel();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, submitting, onCancel]);

  if (!open) return null;

  const remaining = Math.max(totalDays - conflicts.length, 0);
  const overwriting = policy === "overwrite";

  return (
    <div
      className="fixed inset-0 z-[10500] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="attn-conflict-title"
      aria-describedby="attn-conflict-desc"
    >
      <style>{`
        @keyframes attn-conflict-backdrop { from { opacity: 0 } to { opacity: 1 } }
        @keyframes attn-conflict-panel {
          from { opacity: 0; transform: scale(0.97) translateY(-6px) }
          to { opacity: 1; transform: scale(1) translateY(0) }
        }
        .attn-conflict-backdrop { animation: attn-conflict-backdrop 0.18s ease-out forwards }
        .attn-conflict-panel { animation: attn-conflict-panel 0.24s cubic-bezier(0.22, 1, 0.36, 1) forwards }
        @media (prefers-reduced-motion: reduce) {
          .attn-conflict-backdrop, .attn-conflict-panel { animation: none }
        }
      `}</style>

      <div className="flex min-h-full items-start justify-center p-4 pt-[8vh] pb-8">
        {/* Scrim doubles as the dismiss affordance; the blur says the page behind is inert. */}
        <div
          className="attn-conflict-backdrop fixed inset-0 bg-black/55 backdrop-blur-[2px]"
          onClick={() => {
            if (!submitting) onCancel();
          }}
          aria-hidden
        />

        <div
          ref={panelRef}
          className="attn-conflict-panel relative flex max-h-[85vh] w-full max-w-[34rem] flex-col overflow-hidden rounded-2xl border border-defaultborder/70 bg-white shadow-xl dark:border-white/10 dark:bg-bodybg dark:shadow-black/40"
        >
          <div className="relative border-b border-defaultborder/60 bg-gradient-to-br from-amber-50/80 to-transparent dark:border-white/10 dark:from-amber-950/20 dark:to-transparent">
            <div
              className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-400 to-amber-600 dark:from-amber-500 dark:to-amber-700"
              aria-hidden
            />
            <div className="flex items-start justify-between gap-4 py-5 pl-5 pr-4">
              <div className="flex min-w-0 items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 shadow-inner ring-1 ring-amber-500/20 dark:text-amber-400">
                  <i className="ri-alert-line text-[1.5rem]" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h2
                    id="attn-conflict-title"
                    className="text-lg font-semibold tracking-tight text-defaulttextcolor dark:text-white"
                  >
                    {conflicts.length} {conflicts.length === 1 ? "day is" : "days are"} already accounted for
                  </h2>
                  <p id="attn-conflict-desc" className="mt-1 text-sm text-defaulttextcolor/70 dark:text-white/60">
                    {personName ? (
                      <>
                        <span className="font-medium text-defaulttextcolor dark:text-white/85">{personName}</span> has{" "}
                      </>
                    ) : (
                      "This person has "
                    )}
                    a holiday, leave, or week off on {conflicts.length === 1 ? "one" : "some"} of the {totalDays} day
                    {totalDays === 1 ? "" : "s"} you selected.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCancel}
                disabled={submitting}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-defaulttextcolor/70 transition-colors hover:bg-black/5 hover:text-defaulttextcolor focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Close without adding attendance"
              >
                <i className="ri-close-line text-xl" aria-hidden />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <ul className="divide-y divide-defaultborder/50 overflow-hidden rounded-xl border border-defaultborder/60 dark:divide-white/10 dark:border-white/10">
              {conflicts.map((c) => {
                const meta = KIND_META[c.kind];
                return (
                  <li
                    key={`${c.kind}-${c.date}`}
                    className="flex items-center gap-3 bg-slate-50/70 px-4 py-3 dark:bg-white/5"
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ${meta.tone}`} aria-hidden>
                      <i className={`${meta.icon} text-base`} />
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-medium tabular-nums text-defaulttextcolor dark:text-white/90">
                      {formatConflictDate(c.date)}
                    </span>
                    {/* The kind is spelled out, so it never depends on the icon colour alone. */}
                    <span className="shrink-0 text-right text-xs text-defaulttextcolor/70 dark:text-white/60">
                      <span className="font-semibold text-defaulttextcolor/85 dark:text-white/80">{meta.label}</span>
                      {c.label && c.label !== meta.label ? <> · {c.label}</> : null}
                    </span>
                  </li>
                );
              })}
            </ul>

            <fieldset className="space-y-2">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/60 dark:text-white/55">
                What should happen to {conflicts.length === 1 ? "that day" : "those days"}?
              </legend>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                  !overwriting
                    ? "border-teal-500/60 bg-teal-500/5 dark:border-teal-400/50 dark:bg-teal-400/10"
                    : "border-defaultborder/70 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                }`}
              >
                <input
                  ref={firstFieldRef}
                  type="radio"
                  name="attn-conflict-policy"
                  value="skip"
                  checked={!overwriting}
                  onChange={() => setPolicy("skip")}
                  disabled={submitting}
                  className="mt-0.5 h-4 w-4 accent-teal-600 dark:accent-teal-400"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-defaulttextcolor dark:text-white">
                    Keep them — add the other {remaining} day{remaining === 1 ? "" : "s"}
                  </span>
                  <span className="mt-0.5 block text-xs text-defaulttextcolor/70 dark:text-white/60">
                    The holiday and leave records stay exactly as they are.
                  </span>
                </span>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                  overwriting
                    ? "border-rose-500/60 bg-rose-500/5 dark:border-rose-400/50 dark:bg-rose-400/10"
                    : "border-defaultborder/70 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                }`}
              >
                <input
                  type="radio"
                  name="attn-conflict-policy"
                  value="overwrite"
                  checked={overwriting}
                  onChange={() => setPolicy("overwrite")}
                  disabled={submitting}
                  className="mt-0.5 h-4 w-4 accent-rose-600 dark:accent-rose-400"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-defaulttextcolor dark:text-white">
                    Replace them — mark all {totalDays} day{totalDays === 1 ? "" : "s"} Present
                  </span>
                  <span className="mt-0.5 block text-xs text-rose-700 dark:text-rose-300">
                    <i className="ri-error-warning-line mr-1 align-[-0.1em]" aria-hidden />
                    The existing holiday and leave records are overwritten and cannot be restored.
                  </span>
                </span>
              </label>
            </fieldset>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-defaultborder/60 bg-defaultborder/5 px-5 py-4 dark:border-white/10 dark:bg-white/5">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="min-h-[2.75rem] rounded-xl border border-defaultborder/80 px-4 text-sm font-medium text-defaulttextcolor transition-colors hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 dark:border-white/15 dark:text-white/85 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(policy)}
              disabled={submitting}
              className={`inline-flex min-h-[2.75rem] items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 dark:focus:ring-offset-bodybg ${
                overwriting
                  ? "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500/60 active:bg-rose-800"
                  : "bg-teal-600 hover:bg-teal-700 focus:ring-teal-500/60 active:bg-teal-800"
              }`}
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
                  Adding…
                </>
              ) : overwriting ? (
                <>
                  <i className="ri-error-warning-line text-base" aria-hidden />
                  Overwrite {conflicts.length} day{conflicts.length === 1 ? "" : "s"}
                </>
              ) : (
                <>
                  <i className="ri-check-line text-base" aria-hidden />
                  Add {remaining} day{remaining === 1 ? "" : "s"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
