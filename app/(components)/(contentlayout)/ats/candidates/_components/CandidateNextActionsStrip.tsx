"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { IBM_Plex_Sans } from "next/font/google";
import {
  getCandidateSopStatus,
  type CandidateSopStatus,
  type SopStatusStepRow,
} from "@/shared/lib/api/candidateSop";
import {
  loadSopStripPrefs,
  saveSopStripPrefs,
  SOP_STRIP_REFRESH_EVENT,
} from "@/shared/lib/sop-strip-preferences";

const headline = IBM_Plex_Sans({
  weight: ["600"],
  subsets: ["latin"],
  display: "swap",
});

type Props = {
  candidateId: string;
  /** Optional bump from parent after a save that should refresh completion state immediately. */
  refreshKey?: number;
};

function sortOpenSteps(steps: SopStatusStepRow[]): SopStatusStepRow[] {
  return [...steps].filter((s) => !s.done).sort((a, b) => a.sortOrder - b.sortOrder);
}

export default function CandidateNextActionsStrip({ candidateId, refreshKey = 0 }: Props) {
  const [data, setData] = useState<CandidateSopStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [focusOpenIndex, setFocusOpenIndex] = useState(0);
  const [internalRefresh, setInternalRefresh] = useState(0);

  const openSteps = useMemo(() => (data ? sortOpenSteps(data.steps) : []), [data]);
  const openStepsRef = useRef(openSteps);
  openStepsRef.current = openSteps;

  const load = useCallback(async () => {
    if (!candidateId) return;
    setLoading(true);
    setErr(null);
    try {
      const d = await getCandidateSopStatus(candidateId);
      setData(d);
    } catch {
      setData(null);
      setErr("Unable to load setup checklist.");
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey, internalRefresh]);

  useEffect(() => {
    const bump = () => setInternalRefresh((x) => x + 1);
    const onVis = () => {
      if (document.visibilityState === "visible") bump();
    };
    window.addEventListener("focus", bump);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener(SOP_STRIP_REFRESH_EVENT, bump);
    return () => {
      window.removeEventListener("focus", bump);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener(SOP_STRIP_REFRESH_EVENT, bump);
    };
  }, []);

  useEffect(() => {
    if (!candidateId) return;
    const prefs = loadSopStripPrefs(candidateId);
    setExpanded(Boolean(prefs?.expanded));
  }, [candidateId]);

  useEffect(() => {
    if (!data) return;
    const prefs = loadSopStripPrefs(candidateId);
    const open = sortOpenSteps(data.steps);
    let idx = 0;
    if (prefs?.focusedOpenKey) {
      const i = open.findIndex((s) => s.checkerKey === prefs.focusedOpenKey);
      if (i >= 0) idx = i;
    }
    if (idx === 0 && data.nextStep && open.length > 0) {
      const j = open.findIndex((s) => s.checkerKey === data.nextStep!.checkerKey);
      if (j >= 0) idx = j;
    }
    setFocusOpenIndex(open.length ? Math.min(idx, open.length - 1) : 0);
  }, [data, candidateId, refreshKey, internalRefresh]);

  const setExpandedPersist = useCallback(
    (next: boolean) => {
      setExpanded(next);
      const open = openStepsRef.current;
      const key = open[focusOpenIndex]?.checkerKey ?? null;
      saveSopStripPrefs(candidateId, { v: 1, focusedOpenKey: key, expanded: next });
    },
    [candidateId, focusOpenIndex],
  );

  const goPrevOpen = useCallback(() => {
    setFocusOpenIndex((prev) => {
      const open = openStepsRef.current;
      if (open.length <= 1) return prev;
      const nextIdx = (prev - 1 + open.length) % open.length;
      saveSopStripPrefs(candidateId, {
        v: 1,
        focusedOpenKey: open[nextIdx]?.checkerKey ?? null,
        expanded,
      });
      return nextIdx;
    });
  }, [candidateId, expanded]);

  const goNextOpen = useCallback(() => {
    setFocusOpenIndex((prev) => {
      const open = openStepsRef.current;
      if (open.length <= 1) return prev;
      const nextIdx = (prev + 1) % open.length;
      saveSopStripPrefs(candidateId, {
        v: 1,
        focusedOpenKey: open[nextIdx]?.checkerKey ?? null,
        expanded,
      });
      return nextIdx;
    });
  }, [candidateId, expanded]);

  if (loading && !data) {
    return (
      <div className="border-t border-defaultborder/80 dark:border-defaultborder/20 bg-white/80 dark:bg-bgdark/40 px-4 py-3 shadow-[inset_0_1px_0_0_rgba(0,0,0,0.04)]">
        <div className="h-5 w-48 animate-pulse rounded bg-gray-200/80 dark:bg-white/10" aria-hidden />
      </div>
    );
  }

  if (err || !data) {
    return null;
  }

  if (data.skipped || data.totalCount === 0) {
    return null;
  }

  const allDone = data.completedCount >= data.totalCount && data.totalCount > 0;
  const openRemaining = openSteps.length;
  const summary = `${data.completedCount} of ${data.totalCount} complete`;
  const focused = !allDone && openSteps.length > 0 ? openSteps[focusOpenIndex] : null;
  const canCycleOpen = openSteps.length > 1;

  return (
    <section
      className="border-t-2 border-primary/25 dark:border-primary/35 bg-gray-50/95 dark:bg-bgdark/50 px-4 py-3 shadow-[inset_0_1px_0_0_rgba(0,0,0,0.06)] transition-colors duration-150"
      aria-labelledby="sop-next-heading"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <h2
            id="sop-next-heading"
            className={`${headline.className} text-lg font-semibold tracking-tight text-gray-900 dark:text-white`}
          >
            Next step
          </h2>
          <p
            className="mt-0.5 text-sm text-gray-600 dark:text-gray-400"
            aria-live="polite"
            aria-atomic="true"
          >
            {allDone ? (
              <span>All setup tasks complete.</span>
            ) : (
              <span>
                <span className="sr-only">Progress: </span>
                {summary}
                {focused ? (
                  <>
                    <span className="mx-1 text-gray-400" aria-hidden>
                      ·
                    </span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{focused.label}</span>
                  </>
                ) : null}
              </span>
            )}
          </p>
          <div
            className="mt-2 h-1 w-full max-w-md overflow-hidden rounded-full bg-gray-200 dark:bg-white/10"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={data.totalCount}
            aria-valuenow={data.completedCount}
            aria-label="Onboarding progress"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
              style={{
                width: `${data.totalCount ? Math.round((100 * data.completedCount) / data.totalCount) : 0}%`,
              }}
            />
          </div>
        </div>
        <div className="flex flex-shrink-0 flex-col gap-2 lg:items-end">
          {!allDone && focused?.link ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-md border border-primary/30 bg-white/80 shadow-sm dark:bg-bgdark/80">
                <button
                  type="button"
                  className="ti-btn !mb-0 !rounded-e-none !border-0 !bg-transparent !text-primary hover:!bg-primary/10 disabled:!opacity-40"
                  disabled={!canCycleOpen}
                  aria-label="Previous incomplete task"
                  onClick={goPrevOpen}
                >
                  <i className="ri-arrow-left-s-line text-lg" aria-hidden />
                </button>
                <button
                  type="button"
                  className="ti-btn !mb-0 !rounded-none !border-0 !border-x !border-primary/20 !bg-transparent !text-primary hover:!bg-primary/10 disabled:!opacity-40"
                  disabled={!canCycleOpen}
                  aria-label="Next incomplete task"
                  onClick={goNextOpen}
                >
                  <i className="ri-arrow-right-s-line text-lg" aria-hidden />
                </button>
              </div>
              <Link
                href={focused.link}
                className="ti-btn bg-primary text-white !py-2 !px-4 text-center !rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                Go to {focused.label}
              </Link>
            </div>
          ) : null}
          <button
            type="button"
            className="text-left text-sm font-medium text-primary hover:underline lg:text-right"
            aria-expanded={expanded}
            aria-controls="sop-all-steps"
            aria-label={
              allDone
                ? `${expanded ? "Hide" : "Show"} full setup checklist (${data.totalCount} steps, all complete)`
                : `${expanded ? "Hide" : "Show"} setup tasks, ${openRemaining} remaining of ${data.totalCount}`
            }
            onClick={() => setExpandedPersist(!expanded)}
          >
            {allDone ? (
              <>All setup tasks (complete · {data.totalCount} total)</>
            ) : openRemaining === 1 ? (
              <>1 setup task left</>
            ) : (
              <>{openRemaining} setup tasks left</>
            )}
          </button>
        </div>
      </div>
      {expanded ? (
        <ul
          id="sop-all-steps"
          className="mt-3 space-y-1.5 border-t border-dashed border-defaultborder/60 pt-3 dark:border-defaultborder/20"
        >
          {data.steps.map((s) => {
            const isFocused = Boolean(focused && s.checkerKey === focused.checkerKey && !s.done);
            return (
              <li
                key={s.checkerKey}
                className={`flex flex-wrap items-center gap-2 text-sm transition-opacity duration-150 ${
                  s.done ? "text-gray-500 line-through dark:text-gray-500" : "text-gray-800 dark:text-gray-200"
                } ${isFocused ? "rounded-md bg-primary/5 px-2 py-0.5 -mx-2" : ""}`}
              >
                <span
                  className={`inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                    s.done ? "border-success/50 text-success" : "border-current"
                  }`}
                  aria-hidden
                >
                  {s.done ? "✓" : "○"}
                </span>
                <span>{s.label}</span>
                {!s.done && s.link ? (
                  <Link
                    href={s.link}
                    className="text-primary hover:underline"
                    onClick={() => {
                      saveSopStripPrefs(candidateId, {
                        v: 1,
                        focusedOpenKey: s.checkerKey,
                        expanded,
                      });
                    }}
                  >
                    Open
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

