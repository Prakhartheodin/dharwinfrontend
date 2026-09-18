"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getInterviewBiasCheck,
  rerunInterviewBiasCheck,
  type BiasFlagCategory,
  type InterviewBiasCheck,
} from "@/shared/lib/api/meetings";

const POLL_MS = 3000;
const MAX_POLLS = 20;

const FLAG_LABEL: Record<BiasFlagCategory, string> = {
  protected_class: "Protected-class language",
  score_mismatch: "Score vs interview",
  vague_culture_fit: "Vague culture fit",
};

const RISK_CHIP: Record<string, string> = {
  low: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  medium:
    "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/30",
  high: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30",
};

/**
 * @param {unknown} err
 * @returns {number}
 */
function statusOf(err: unknown): number {
  const status = (err as { response?: { status?: number } })?.response?.status;
  return typeof status === "number" ? status : 0;
}

export type InterviewBiasPanelProps = {
  meetingId: string;
  canRerun: boolean;
};

/**
 * Staff advisory bias panel for an ended interview. Does not change pass/fail.
 */
export default function InterviewBiasPanel({ meetingId, canRerun }: InterviewBiasPanelProps) {
  const [report, setReport] = useState<InterviewBiasCheck | null>(null);
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rerunning, setRerunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!meetingId) return;
    try {
      const data = await getInterviewBiasCheck(meetingId);
      setReport(data);
      setError(null);
      setHidden(false);
    } catch (err) {
      const status = statusOf(err);
      if (status === 403 || status === 404) {
        setHidden(true);
        return;
      }
      setError("Couldn't load bias review.");
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    if (report?.status !== "pending") return undefined;
    let ticks = 0;
    const t = window.setInterval(() => {
      ticks += 1;
      if (ticks > MAX_POLLS) {
        window.clearInterval(t);
        setError("Bias review is taking longer than expected. Try Re-run.");
        return;
      }
      void load();
    }, POLL_MS);
    return () => window.clearInterval(t);
  }, [report?.status, load]);

  const onRerun = useCallback(async () => {
    if (!meetingId || !canRerun) return;
    setRerunning(true);
    setError(null);
    try {
      const data = await rerunInterviewBiasCheck(meetingId);
      setReport(data);
    } catch (err) {
      const status = statusOf(err);
      setError(status === 503 ? "Review queue is unavailable. Try again shortly." : "Re-run failed.");
    } finally {
      setRerunning(false);
    }
  }, [meetingId, canRerun]);

  if (hidden || !meetingId) return null;

  const skipLabel = report?.skipReasonLabel || null;
  const isHigh = report?.status === "ready" && report.riskLevel === "high";

  return (
    <section
      className="mt-6 pt-5 border-t border-defaultborder dark:border-defaultborder/10"
      aria-labelledby="interview-bias-heading"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h4
            id="interview-bias-heading"
            className="text-sm font-medium text-defaulttextcolor dark:text-white mb-0.5"
          >
            Bias review
          </h4>
          <p className="text-xs text-defaulttextcolor/60 dark:text-white/60 mb-0">
            Advisory only. A human makes the final decision.
          </p>
        </div>
        {canRerun && (
          <button
            type="button"
            className="ti-btn ti-btn-light !py-1.5 !px-3 !text-xs font-medium shrink-0"
            onClick={onRerun}
            disabled={rerunning || report?.status === "pending"}
            aria-label="Re-run bias review"
          >
            {rerunning || report?.status === "pending" ? "Running…" : "Re-run"}
          </button>
        )}
      </div>

      {loading && !report && (
        <p className="text-xs text-defaulttextcolor/60 dark:text-white/60">Loading review…</p>
      )}

      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}

      {report?.status === "pending" && (
        <p className="text-xs text-defaulttextcolor/70 dark:text-white/70">
          Analyzing transcript, job description, and scorecard…
        </p>
      )}

      {(report?.status === "skipped" || report?.status === "failed") && (
        <p className="text-sm text-defaulttextcolor dark:text-white" role="status">
          {skipLabel ||
            (report.status === "failed"
              ? "Automatic bias review failed. Try Re-run."
              : "Can't analyze this interview.")}
        </p>
      )}

      {report?.status === "ready" && (
        <div className="space-y-3">
          {isHigh && (
            <div
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100"
              role="status"
            >
              Review before you decide — this does not change the result.
            </div>
          )}
          {report.riskLevel && (
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${RISK_CHIP[report.riskLevel] || ""}`}
            >
              {report.riskLevel} risk
            </span>
          )}
          {report.flags.length > 0 && (
            <ul className="space-y-1.5 mb-0">
              {report.flags.map((flag, idx) => (
                <li key={`${flag.category}-${idx}`} className="text-sm text-defaulttextcolor dark:text-white">
                  <span className="text-xs font-semibold uppercase tracking-wide text-defaulttextcolor/50 dark:text-white/50">
                    {FLAG_LABEL[flag.category] || flag.category}
                  </span>
                  <span className="block">{flag.label}</span>
                </li>
              ))}
            </ul>
          )}
          {report.evidence.length > 0 && (
            <div>
              <p className="text-xs font-medium text-defaulttextcolor/70 dark:text-white/70 mb-1">Evidence</p>
              <ul className="space-y-1 mb-0">
                {report.evidence.map((item, idx) => (
                  <li
                    key={`${item.source}-${idx}`}
                    className="text-xs italic text-defaulttextcolor/80 dark:text-white/80 border-l-2 border-defaultborder dark:border-white/20 pl-2"
                  >
                    “{item.quote}”
                  </li>
                ))}
              </ul>
            </div>
          )}
          {report.reasons.length > 0 && (
            <ul className="text-xs text-defaulttextcolor/70 dark:text-white/70 space-y-1 mb-0">
              {report.reasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          )}
          {report.advisoryNotice && (
            <p className="text-[11px] leading-snug text-defaulttextcolor/50 dark:text-white/50 mb-0">
              {report.advisoryNotice}
            </p>
          )}
        </div>
      )}

      {!loading && report && report.status == null && (
        <p className="text-xs text-defaulttextcolor/60 dark:text-white/60">
          Review runs after a recording transcript and a scorecard both exist.
        </p>
      )}
    </section>
  );
}
