"use client";

import React, { useEffect, useState } from "react";
import styles from "./aiBootstrapProgress.module.css";

const STEPS: { label: string; logs: string[] }[] = [
  {
    label: "Drafting task list",
    logs: [
      "Parsing project context…",
      "Generating task descriptions…",
      "Balancing scope across workstreams…",
    ],
  },
  {
    label: "Matching candidates to tasks",
    logs: [
      "Scoring roster against tasks…",
      "Running compatibility checks…",
      "Ranking best-fit assignees…",
    ],
  },
  {
    label: "Building project team",
    logs: ["Creating team roster…", "Resolving team name collisions…", "Setting team defaults…"],
  },
  {
    label: "Linking team to project",
    logs: ["Connecting workspace…", "Syncing assignments…", "Finalizing links…"],
  },
];

const ACCENT = "#6366f1";
const ACCENT_SOFT = "rgba(99, 102, 241, 0.12)";
const ACCENT_BORDER = "rgba(99, 102, 241, 0.28)";

export interface AiBootstrapProgressOverlayProps {
  open: boolean;
}

/**
 * Full-screen loading treatment for long-running `bootstrapSmartTeam` (and similar) calls.
 * Visual language adapted from `ai_processing_modal_animation.html`: staged steps, progress bar,
 * pulsing hero mark, and rotating status copy — timed to wall-clock while the server works.
 */
export function AiBootstrapProgressOverlay({ open }: AiBootstrapProgressOverlayProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!open) {
      setElapsedMs(0);
      return;
    }
    const startedAt = Date.now();
    setElapsedMs(0);
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 420);
    return () => window.clearInterval(id);
  }, [open]);

  if (!open) return null;

  const elapsed = elapsedMs;
  const activeIdx = Math.min(STEPS.length - 1, Math.floor(elapsed / 16500));
  const pct = Math.min(90, 3 + (elapsed / 88000) * 87);
  const logs = STEPS[activeIdx]?.logs ?? STEPS[0].logs;
  const logIdx = Math.min(logs.length - 1, Math.floor((elapsed % 3200) / 1050));
  const liveLog = logs[logIdx] ?? logs[0];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 px-4 py-8 backdrop-blur-[2px]"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="ai-bootstrap-title"
      aria-busy="true"
    >
      <div
        className={`${styles.card} w-full max-w-[440px] rounded-xl border border-defaultborder bg-bodybg px-8 py-7 shadow-2xl`}
      >
        <h2 id="ai-bootstrap-title" className="sr-only">
          Creating AI team and assignments — in progress
        </h2>

        <div className="mb-6 flex items-start gap-3.5">
          <div className="relative h-10 w-10 shrink-0">
            <div
              className={`${styles.pulse} absolute inset-0 rounded-full`}
              style={{ background: "rgba(99, 102, 241, 0.16)" }}
            />
            <div
              className="absolute inset-1 flex items-center justify-center rounded-full"
              style={{ background: "rgba(99, 102, 241, 0.1)" }}
            >
              <i className="ri-stack-line text-lg" style={{ color: ACCENT }} aria-hidden />
            </div>
          </div>
          <div className="min-w-0 pt-0.5">
            <p className="mb-0 text-[0.9375rem] font-semibold leading-snug text-defaulttextcolor">
              Creating AI team &amp; assignments
            </p>
            <p className="mb-0 mt-1 text-[0.8125rem] leading-snug text-[#8c9097] dark:text-white/50">
              GPT is drafting tasks, matching students to work, creating a new team, and linking it here.
              Keep this tab open — often 30–90 seconds.
            </p>
          </div>
        </div>

        <div className="mb-5" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[0.75rem] font-medium text-[#8c9097] dark:text-white/45">Progress</span>
            <span className="flex items-baseline gap-2">
              <span className="text-[0.75rem] font-semibold tabular-nums text-defaulttextcolor">
                {Math.round(pct)}%
              </span>
              <span className="text-[0.7rem] tabular-nums text-[#8c9097] dark:text-white/40">
                {Math.floor(elapsed / 1000)}s
              </span>
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-[#e9ecef] dark:bg-white/10">
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-out"
              style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${ACCENT}, #8b5cf6)`,
              }}
            />
          </div>
        </div>

        <ul className="mb-6 flex list-none flex-col gap-2.5 ps-0">
          {STEPS.map((s, i) => {
            const done = i < activeIdx;
            const active = i === activeIdx;
            return (
              <li
                key={s.label}
                className={`${styles.stepRow} flex items-center gap-2.5 rounded-lg border px-3 py-2.5`}
                style={{
                  borderColor: done || active ? ACCENT_BORDER : "rgba(140, 144, 151, 0.35)",
                  background: active ? "rgba(99, 102, 241, 0.06)" : done ? ACCENT_SOFT : "transparent",
                  animationDelay: `${0.12 + i * 0.06}s`,
                }}
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border"
                  style={{
                    borderColor: done || active ? ACCENT_BORDER : "rgba(140, 144, 151, 0.35)",
                    background: done ? ACCENT_SOFT : active ? "rgba(99, 102, 241, 0.08)" : "rgba(0,0,0,0.03)",
                  }}
                >
                  {done ? (
                    <svg
                      className={styles.check}
                      width="14"
                      height="14"
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden
                    >
                      <polyline
                        points="4 10 8 14 16 6"
                        stroke={ACCENT}
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <span
                      className={`text-[0.65rem] font-bold tabular-nums ${active ? "" : "opacity-45"}`}
                      style={{ color: active ? ACCENT : "#8c9097" }}
                    >
                      {i + 1}
                    </span>
                  )}
                </span>
                <span
                  className={`text-[0.8125rem] leading-snug ${
                    done || active ? "font-medium text-defaulttextcolor" : "text-[#8c9097] dark:text-white/45"
                  }`}
                >
                  {s.label}
                </span>
              </li>
            );
          })}
        </ul>

        <div
          className="flex items-center gap-2 rounded-lg border border-defaultborder px-3 py-2.5"
          style={{ background: "rgba(0,0,0,0.02)" }}
        >
          <div className="flex items-center gap-1" aria-hidden>
            <span className={`${styles.dot} block h-1.5 w-1.5 rounded-full`} style={{ background: ACCENT }} />
            <span className={`${styles.dot} block h-1.5 w-1.5 rounded-full`} style={{ background: ACCENT }} />
            <span className={`${styles.dot} block h-1.5 w-1.5 rounded-full`} style={{ background: ACCENT }} />
          </div>
          <p className="mb-0 flex-1 text-[0.75rem] leading-snug text-[#8c9097] dark:text-white/50" aria-live="polite">
            {liveLog}
          </p>
        </div>

      </div>
    </div>
  );
}
