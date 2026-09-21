"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import type { JobApplication } from "@/shared/lib/api/jobApplications";
import {
  MEETING_JOIN_LEAD_MINUTES,
  formatInterviewModeLabel,
  resolveInterviewPanelState,
  type CandidateInterviewMeeting,
  type InterviewPanelState,
} from "@/shared/lib/dashboard/candidateInterviews";
import { formatDualZone, getViewerTimezone } from "@/shared/lib/timezone";

const ROUND_TYPE_LABELS: Record<string, string> = {
  screening: "Screening",
  technical: "Technical",
  panel: "Panel",
  hr: "HR",
  behavioral: "Behavioral",
  hiring_manager: "Hiring manager",
  culture: "Culture",
  final: "Final",
  other: "Other",
};

/** Name of a round: explicit label, else "Round N". Blank when the round carries neither. */
export function roundName(meeting: CandidateInterviewMeeting): string {
  const round = meeting.round;
  if (!round) return "";
  if (round.label?.trim()) return round.label.trim();
  if (round.index != null) return `Round ${round.index}`;
  return "";
}

/** Round type ("Technical", "Panel"). Blank when absent, or when it already is the name. */
export function roundTypeLabel(meeting: CandidateInterviewMeeting): string {
  const type = meeting.round?.type;
  if (!type) return "";
  const label = ROUND_TYPE_LABELS[type] || type;
  return label.toLowerCase() === roundName(meeting).toLowerCase() ? "" : label;
}

function stateHeading(state: InterviewPanelState): string {
  switch (state.kind) {
    case "no_schedule":
      return "Interview";
    case "cancelled":
      return "Interview cancelled";
    case "link_pending":
      return "Interview scheduled";
    case "scheduled":
      return "Upcoming interview";
    case "live":
      return "Live now";
    case "completed":
      return "Interview completed";
    case "missed":
      return "Interview time has passed";
    default:
      return "Interview";
  }
}

/** Hide recruiter-only metadata copied into meeting notes (e.g. schedule prefill). */
export function candidateVisibleInterviewNotes(raw: string): string {
  return raw
    .split(/\r?\n/)
    .filter((line) => !/^\s*Application ID\s*:/i.test(line))
    .join("\n")
    .trim();
}

function stateBadgeClass(kind: InterviewPanelState["kind"]): string {
  switch (kind) {
    case "live":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25";
    case "cancelled":
    case "missed":
      return "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25";
    case "completed":
      return "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/25";
    case "link_pending":
      return "bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500/25";
    default:
      return "bg-primary/10 text-primary border-primary/20";
  }
}

type InterviewPanelProps = {
  application: JobApplication | null;
  user?: { name?: string | null; email?: string | null } | null;
  now: Date;
};

export default function InterviewPanel({ application, user, now }: InterviewPanelProps) {
  const [viewerTz, setViewerTz] = useState<string | undefined>(undefined);

  useEffect(() => {
    setViewerTz(getViewerTimezone());
  }, []);

  const interviews = (application?.interviews ?? []) as CandidateInterviewMeeting[];
  const state = useMemo(
    () => resolveInterviewPanelState(interviews, now, user),
    [interviews, now, user],
  );

  const job = application?.job as { title?: string; organisation?: { name?: string } } | undefined;
  const jobTitle = job?.title?.trim() || "Selected application";
  const company = job?.organisation?.name?.trim();

  const meeting = state.kind === "no_schedule" ? null : state.meeting;
  const timeLine =
    meeting &&
    formatDualZone(meeting.scheduledAt, meeting.timezone || "UTC", viewerTz);

  const showJoin =
    (state.kind === "live" && state.joinHref) ||
    (state.kind === "scheduled" && state.joinHref);

  const instructionText = meeting?.notes
    ? candidateVisibleInterviewNotes(meeting.notes)
    : "";

  const primaryRoundName = meeting ? roundName(meeting) : "";
  const primaryRoundType = meeting ? roundTypeLabel(meeting) : "";

  return (
    <aside
      className="rounded-2xl border border-defaultborder/50 dark:border-white/10 bg-white dark:bg-bodybg shadow-sm p-5 lg:sticky lg:top-6"
      aria-labelledby="interview-panel-heading"
      data-testid="interview-panel"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2
            id="interview-panel-heading"
            className="text-base font-semibold text-defaulttextcolor dark:text-white"
          >
            {stateHeading(state)}
          </h2>
          <p className="text-sm text-defaulttextcolor/65 dark:text-white/55 truncate mt-0.5">
            {jobTitle}
            {company ? ` · ${company}` : ""}
          </p>
        </div>
        {state.kind !== "no_schedule" ? (
          <span
            className={`shrink-0 inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold leading-5 ${stateBadgeClass(state.kind)}`}
          >
            {state.kind === "live"
              ? "Live"
              : state.kind === "link_pending"
                ? "Link pending"
                : state.kind.charAt(0).toUpperCase() + state.kind.slice(1).replace("_", " ")}
          </span>
        ) : null}
      </div>

      {state.kind === "no_schedule" ? (
        <p className="text-sm text-defaulttextcolor/60 dark:text-white/50" role="status">
          No interview scheduled yet. We will notify you when a recruiter books a time.
        </p>
      ) : (
        <div className="space-y-4">
          {meeting?.title?.trim() ? (
            <p className="text-sm font-semibold text-defaulttextcolor dark:text-white">
              {meeting.title.trim()}
            </p>
          ) : null}
          {timeLine ? (
            <p className="text-sm font-medium text-defaulttextcolor dark:text-white tabular-nums">
              {timeLine}
            </p>
          ) : null}
          <p className="text-sm text-defaulttextcolor/70 dark:text-white/60">
            {formatInterviewModeLabel(meeting?.interviewType, meeting?.requireApproval)}
            {primaryRoundName ? ` · ${primaryRoundName}` : ""}
            {primaryRoundType ? ` · ${primaryRoundType}` : ""}
          </p>

          {state.kind === "link_pending" ? (
            <p className="text-sm text-defaulttextcolor/65 dark:text-white/55" role="status">
              Meeting link will be shared soon.
            </p>
          ) : null}

          {state.kind === "cancelled" ? (
            <p className="text-sm text-defaulttextcolor/65 dark:text-white/55" role="status">
              This interview was cancelled. Contact your recruiter if you have questions.
            </p>
          ) : null}

          {state.kind === "completed" ? (
            <p className="text-sm text-defaulttextcolor/65 dark:text-white/55" role="status">
              Thank you for interviewing. Your recruiter will update your application status.
            </p>
          ) : null}

          {state.kind === "missed" ? (
            <p className="text-sm text-defaulttextcolor/65 dark:text-white/55" role="status">
              Interview time has passed. Contact your recruiter if you need to reschedule.
            </p>
          ) : null}

          {instructionText ? (
            <div className="rounded-xl border border-defaultborder/40 dark:border-white/10 bg-defaultborder/5 dark:bg-white/[0.03] px-3 py-2.5">
              <p className="text-xs font-semibold text-defaulttextcolor/70 dark:text-white/60 mb-1">
                Instructions
              </p>
              <p className="text-sm text-defaulttextcolor/80 dark:text-white/75 whitespace-pre-wrap">
                {instructionText}
              </p>
            </div>
          ) : null}

          {showJoin ? (
            <Link
              href={state.joinHref!}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Join interview
              <i className="ri-video-add-line" aria-hidden />
            </Link>
          ) : state.kind === "scheduled" ? (
            <p
              className="rounded-xl border border-defaultborder/50 bg-defaultborder/5 dark:bg-white/[0.03] px-3 py-2.5 text-center text-xs text-defaulttextcolor/60 dark:text-white/50"
              role="status"
            >
              Join opens {MEETING_JOIN_LEAD_MINUTES} minutes before your interview starts.
            </p>
          ) : null}

          {interviews.length > 1 ? (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-defaulttextcolor/55 dark:text-white/45 mb-2">
                All rounds
              </h3>
              <ul className="m-0 list-none space-y-2 p-0" aria-label="Interview rounds">
                {interviews.map((row) => {
                  const rowState = resolveInterviewPanelState([row], now, user);
                  const name = roundName(row);
                  const type = roundTypeLabel(row);
                  const label = name || type || "Interview";
                  const when = formatDualZone(row.scheduledAt, row.timezone || "UTC", viewerTz);
                  return (
                    <li
                      key={row.id || row.meetingId || `${row.scheduledAt}-${label}`}
                      className="rounded-lg border border-defaultborder/40 dark:border-white/10 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-baseline gap-1.5">
                          <span className="font-medium text-defaulttextcolor dark:text-white truncate">
                            {label}
                          </span>
                          {name && type ? (
                            <span className="shrink-0 rounded-md bg-defaultborder/20 dark:bg-white/10 px-1.5 py-0.5 text-[11px] font-medium leading-4 text-defaulttextcolor/70 dark:text-white/60">
                              {type}
                            </span>
                          ) : null}
                        </span>
                        <span className="text-xs text-defaulttextcolor/55 dark:text-white/45 shrink-0 capitalize">
                          {rowState.kind === "no_schedule" ? row.status : rowState.kind.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-xs text-defaulttextcolor/60 dark:text-white/50 mt-0.5 tabular-nums">
                        {when}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </aside>
  );
}
