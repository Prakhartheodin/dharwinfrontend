"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  getRoundHistory,
  type InterviewRoundHistory,
  type InterviewRoundHistoryEntry,
  type RoundEvaluation,
} from "@/shared/lib/api/meetings";
import { formatDualZone, getViewerTimezone } from "@/shared/lib/timezone";
import RoundProgressChip from "./RoundProgressChip";

export type RoundHistoryPanelProps = {
  applicationId: string;
  candidateName?: string;
  jobTitle?: string;
};

function statusChipClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "ended" || s === "completed") return "bg-success/15 text-success border-success/30";
  if (s === "cancelled" || s === "canceled") return "bg-gray-500/15 text-defaulttextcolor/80 border-defaultborder/60";
  return "bg-primary/10 text-primary border-primary/25";
}

function resultChipClass(result: string): string {
  const r = result.toLowerCase();
  if (r === "selected") return "bg-success/15 text-success border-success/30";
  if (r === "rejected") return "bg-danger/15 text-danger border-danger/30";
  return "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-200";
}

function formatStatusLabel(status: string): string {
  if (!status) return "Unknown";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function EvaluationBlock({ evaluation }: { evaluation: RoundEvaluation }) {
  const legacy = evaluation.isLegacy;
  return (
    <div className="rounded-lg border border-defaultborder/70 bg-white/80 p-3 dark:border-white/10 dark:bg-black/20">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-defaulttextcolor dark:text-white">{evaluation.evaluatorName}</span>
        <div className="flex flex-wrap items-baseline gap-2 tabular-nums text-sm">
          {legacy || evaluation.weightedScore === null ? (
            <span className="text-xs text-defaulttextcolor/70 dark:text-white/70">
              Recorded on the previous scorecard
            </span>
          ) : (
            <>
              <span className="font-semibold text-primary">{evaluation.weightedScore}%</span>
              <span className="text-xs text-defaulttextcolor/60 dark:text-white/60">
                {evaluation.coveragePct}% coverage
              </span>
              {!evaluation.isComplete && (
                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[0.65rem] font-medium text-amber-700 dark:text-amber-300">
                  Incomplete
                </span>
              )}
            </>
          )}
        </div>
      </div>
      {!legacy && evaluation.ratings?.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-defaulttextcolor/80 dark:text-white/80">
          {evaluation.ratings.map((r) => (
            <li key={r.key} className="flex flex-wrap gap-x-2 tabular-nums">
              <span className="font-medium">{r.label}</span>
              {r.weight != null && <span className="text-defaulttextcolor/50">({r.weight}%)</span>}
              <span>
                {r.notApplicable
                  ? "N/A"
                  : r.rating != null
                    ? r.rating
                    : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
      {evaluation.comment?.trim() && (
        <p className="mt-2 text-sm text-defaulttextcolor/80 dark:text-white/75">{evaluation.comment}</p>
      )}
    </div>
  );
}

function RoundRow({
  entry,
  viewerTz,
}: {
  entry: InterviewRoundHistoryEntry;
  viewerTz: string;
}) {
  const when = entry.scheduledAt
    ? formatDualZone(entry.scheduledAt, entry.timezone || "UTC", viewerTz)
    : "Not scheduled";
  const duration =
    entry.durationMinutes != null && entry.durationMinutes > 0 ? `${entry.durationMinutes} min` : null;

  return (
    <article className="rounded-xl border border-defaultborder/70 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-black/20">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-defaulttextcolor dark:text-white">{entry.roundName}</h3>
          <p className="mt-1 text-xs text-defaulttextcolor/70 dark:text-white/70">{entry.title}</p>
          <p className="mt-1 text-xs text-defaulttextcolor/80 dark:text-white/80">
            {when}
            {duration ? ` · ${duration}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-medium ${statusChipClass(entry.status)}`}
          >
            {formatStatusLabel(entry.status)}
          </span>
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-medium capitalize ${resultChipClass(entry.interviewResult)}`}
          >
            {entry.interviewResult || "pending"}
          </span>
        </div>
      </div>

      {entry.interviewers?.length > 0 && (
        <div className="mt-3">
          <p className="text-[0.65rem] font-medium uppercase tracking-wide text-defaulttextcolor/50 dark:text-white/50">
            Interviewers
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-defaulttextcolor dark:text-white/85">
            {entry.interviewers.map((iv, idx) => (
              <li key={`${iv.email}-${idx}`}>
                {iv.name}
                {iv.role ? ` (${iv.role})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-xs text-defaulttextcolor/70 dark:text-white/70">
        Rubric: <span className="font-medium">{entry.rubric?.templateName || "—"}</span>
      </p>

      {entry.evaluations?.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-[0.65rem] font-medium uppercase tracking-wide text-defaulttextcolor/50 dark:text-white/50">
            Evaluations
          </p>
          {entry.evaluations.map((ev, i) => (
            <EvaluationBlock key={ev.id || `${ev.evaluatorEmail}-${i}`} evaluation={ev} />
          ))}
        </div>
      )}
    </article>
  );
}

export default function RoundHistoryPanel({
  applicationId,
  candidateName,
  jobTitle,
}: RoundHistoryPanelProps) {
  const [viewerTz, setViewerTz] = useState("UTC");
  const [data, setData] = useState<InterviewRoundHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!applicationId) return;
    setLoading(true);
    setError(null);
    try {
      const history = await getRoundHistory(applicationId);
      setData(history);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        "Could not load round history.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    setViewerTz(getViewerTimezone());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3 p-1" aria-busy="true">
        <div className="h-6 w-2/3 rounded bg-gray-200 dark:bg-white/10" />
        <div className="h-24 rounded-xl bg-gray-200 dark:bg-white/10" />
        <div className="h-24 rounded-xl bg-gray-200 dark:bg-white/10" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-danger/25 bg-danger/10 p-4 text-sm text-danger">
        <p>{error}</p>
        <button type="button" className="ti-btn ti-btn-light mt-3 !py-1.5 !px-3 !text-sm" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  const summary = data?.summary;
  const rounds = data?.rounds ?? [];

  return (
    <div className="flex max-h-[min(80vh,40rem)] flex-col gap-4 overflow-y-auto overflow-x-hidden p-1">
      <header className="space-y-1 border-b border-defaultborder/60 pb-3 dark:border-white/10">
        {candidateName && (
          <p className="text-base font-semibold text-defaulttextcolor dark:text-white">{candidateName}</p>
        )}
        {jobTitle && <p className="text-sm text-defaulttextcolor/70 dark:text-white/70">{jobTitle}</p>}
        {/* Renders nothing when no plan is in force, which is the normal state of every
            application that predates the round plan. */}
        <div className="mt-2 empty:mt-0">
          <RoundProgressChip progress={data?.progress} size="md" showSteps />
        </div>
        {summary && (
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4 tabular-nums">
            <div>
              {/* "held", not "Rounds": it counts rounds that happened, while the chip above
                  counts rounds planned. The two legitimately differ whenever an extra round
                  was added or a planned one has not happened yet. */}
              <dt className="text-defaulttextcolor/50 dark:text-white/50">Rounds held</dt>
              <dd className="font-medium text-defaulttextcolor dark:text-white">{summary.roundCount}</dd>
            </div>
            <div>
              <dt className="text-defaulttextcolor/50 dark:text-white/50">Decided</dt>
              <dd className="font-medium text-defaulttextcolor dark:text-white">{summary.decidedCount}</dd>
            </div>
            <div>
              <dt className="text-defaulttextcolor/50 dark:text-white/50">Evaluations</dt>
              <dd className="font-medium text-defaulttextcolor dark:text-white">{summary.evaluationCount}</dd>
            </div>
            <div>
              <dt className="text-defaulttextcolor/50 dark:text-white/50">Avg score</dt>
              <dd className="font-medium text-defaulttextcolor dark:text-white">
                {summary.averageWeightedScore === null ? "—" : `${summary.averageWeightedScore}%`}
              </dd>
            </div>
          </dl>
        )}
      </header>

      {rounds.length === 0 ? (
        <div className="rounded-lg border border-dashed border-defaultborder/80 p-6 text-center dark:border-white/15">
          <p className="font-medium text-defaulttextcolor dark:text-white">No interview rounds yet</p>
          <p className="mt-2 text-sm text-defaulttextcolor/70 dark:text-white/70">
            Scheduling an interview from this application creates round 1.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {rounds.map((entry) => (
            <RoundRow key={entry.id || entry.meetingId} entry={entry} viewerTz={viewerTz} />
          ))}
        </div>
      )}
    </div>
  );
}
