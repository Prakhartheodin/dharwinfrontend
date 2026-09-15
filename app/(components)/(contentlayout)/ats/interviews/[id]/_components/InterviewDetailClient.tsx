"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/shared/contexts/auth-context";
import {
  getMeeting,
  getMeetingSummary,
  getMeetingTranscript,
  getMeetingRecordings,
  type Meeting,
  type MeetingSummaryResponse,
  type MeetingTranscriptResponse,
  type MeetingRecording,
} from "@/shared/lib/api/meetings";
import {
  canReadInterviewSummary,
  canReadInterviewTranscript,
} from "@/shared/lib/interview-access-permissions";
import { useFeaturePermissions } from "@/shared/hooks/use-feature-permissions";
import TranscriptView from "@/shared/components/meeting/TranscriptView";
import RecordingPlayer from "@/shared/components/meeting/RecordingPlayer";
import InterviewLinkageModal, {
  InterviewLinkageBadge,
  type InterviewLinkageTarget,
} from "../../_components/InterviewLinkageModal";
import { InterviewConsentBadge } from "../../_components/InterviewConsentBadge";
import { linkageActions, offersLinkAction } from "../../_components/interviewLinkage";
import InterviewDetailResultPanel from "./InterviewDetailResultPanel";
import {
  INTERVIEW_DETAIL_TAB_LABELS,
  parseInterviewDetailTab,
  visibleInterviewDetailTabs,
  type InterviewDetailTab,
} from "./interviewDetailTabs";

function apiMessage(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return typeof msg === "string" && msg ? msg : fallback;
}

function formatStatusLabel(status: string): string {
  if (!status) return "Unknown";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function resultBadgeClass(result: Meeting["interviewResult"]): string {
  if (result === "selected") return "bg-success/15 text-success border-success/30";
  if (result === "rejected") return "bg-danger/15 text-danger border-danger/30";
  return "bg-gray-500/10 text-defaulttextcolor/70 border-defaultborder/60";
}

function tabButtonClass(active: boolean): string {
  return `-mb-px inline-flex min-h-[2.75rem] flex-shrink-0 items-center whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
    active
      ? "border-primary bg-primary/10 text-primary"
      : "border-transparent text-defaulttextcolor/60 hover:border-defaultborder hover:text-defaulttextcolor dark:text-white/60"
  }`;
}

export default function InterviewDetailClient({
  meetingId,
  initialTab,
}: {
  meetingId: string;
  initialTab?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { permissions, isPlatformSuperUser } = useAuth();
  const manage = useFeaturePermissions("ats.interviews");
  const [tab, setTab] = useState<InterviewDetailTab>(() => parseInterviewDetailTab(initialTab));
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<MeetingRecording[]>([]);
  const [transcript, setTranscript] = useState<MeetingTranscriptResponse | null>(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [summary, setSummary] = useState<MeetingSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [linkageTarget, setLinkageTarget] = useState<InterviewLinkageTarget | null>(null);

  const canTranscript = canReadInterviewTranscript(permissions ?? [], isPlatformSuperUser);
  const canSummary = canReadInterviewSummary(permissions ?? [], isPlatformSuperUser);
  const canManageResult = Boolean(manage.canEdit);

  const loadMeeting = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const m = await getMeeting(meetingId);
      setMeeting(m);
      const recs = await getMeetingRecordings(meetingId);
      setRecordings(recs);
    } catch (e) {
      setError(apiMessage(e, "Could not load interview"));
      setMeeting(null);
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    void loadMeeting();
  }, [loadMeeting]);

  const loadTranscript = useCallback(async () => {
    if (!canTranscript) return;
    setTranscriptLoading(true);
    setTranscriptError(null);
    try {
      setTranscript(await getMeetingTranscript(meetingId));
    } catch (e) {
      const status = (e as { response?: { status?: number } }).response?.status;
      setTranscriptError(
        status === 403
          ? "You do not have permission to view this transcript."
          : apiMessage(e, "Transcript unavailable")
      );
      setTranscript(null);
    } finally {
      setTranscriptLoading(false);
    }
  }, [canTranscript, meetingId]);

  const loadSummary = useCallback(async () => {
    if (!canSummary) return;
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      setSummary(await getMeetingSummary(meetingId));
    } catch (e) {
      const status = (e as { response?: { status?: number } }).response?.status;
      setSummaryError(
        status === 403
          ? "You do not have permission to view this summary."
          : apiMessage(e, "Summary unavailable")
      );
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [canSummary, meetingId]);

  useEffect(() => {
    if (tab === "transcript") void loadTranscript();
  }, [tab, loadTranscript]);

  useEffect(() => {
    if (tab === "summary") void loadSummary();
  }, [tab, loadSummary]);

  const hasCompletedRecording = recordings.some((r) => r.status === "completed");

  const tabs = useMemo(
    () =>
      visibleInterviewDetailTabs({
        canReadTranscript: canTranscript,
        canReadSummary: canSummary,
        hasRecording: hasCompletedRecording,
        canManageResult,
      }),
    [canTranscript, canSummary, hasCompletedRecording, canManageResult]
  );

  useEffect(() => {
    if (!tabs.includes(tab)) setTab("overview");
  }, [tab, tabs]);

  const selectTab = useCallback(
    (next: InterviewDetailTab) => {
      setTab(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "overview") params.delete("tab");
      else params.set("tab", next);
      const qs = params.toString();
      router.replace(qs ? `/ats/interviews/${meetingId}?${qs}` : `/ats/interviews/${meetingId}`, {
        scroll: false,
      });
    },
    [meetingId, router, searchParams]
  );

  const openLinkage = useCallback(
    (reason?: InterviewLinkageTarget["reason"]) => {
      if (!meeting) return;
      setLinkageTarget({
        meetingId: meeting.id || meetingId,
        candidateId: meeting.candidateId || "",
        candidateName: meeting.candidate?.name || "Candidate",
        position: meeting.jobPosition || meeting.title,
        jobPosition: meeting.jobPosition,
        linkageStatus: meeting.linkageStatus,
        reason,
      });
    },
    [meeting, meetingId]
  );

  const showLinkActions =
    manage.canEdit &&
    meeting &&
    offersLinkAction({
      linkageStatus: meeting.linkageStatus,
      candidateId: meeting.candidateId,
      jobPosition: meeting.jobPosition,
      applicationId: meeting.applicationId,
    });

  if (loading) {
    return (
      <div className="box custom-box">
        <div className="box-body flex min-h-[16rem] flex-col items-center justify-center py-12" role="status">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-3 text-sm text-defaulttextcolor/70">Loading interview…</p>
        </div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="box custom-box">
        <div className="box-body p-6">
          <p className="text-danger">{error || "Interview not found"}</p>
          <Link href="/ats/interviews" className="ti-btn ti-btn-light mt-4 inline-flex min-h-[2.75rem]">
            Back to interviews
          </Link>
        </div>
      </div>
    );
  }

  const interviewResult = meeting.interviewResult || "pending";
  const scheduledLabel = meeting.scheduledAt
    ? new Date(meeting.scheduledAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not scheduled";

  return (
    <div className="box custom-box overflow-hidden rounded-2xl border border-defaultborder/70 shadow-sm">
      <div className="box-header flex flex-col gap-4 border-b border-defaultborder/80 bg-gradient-to-br from-primary/[0.06] via-transparent to-transparent px-4 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="min-w-0 flex-1">
          <Link
            href="/ats/interviews"
            className="inline-flex min-h-[2.25rem] items-center text-sm font-medium text-primary hover:underline"
          >
            <i className="ri-arrow-left-line me-1.5 align-middle" aria-hidden />
            Interviews
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-defaulttextcolor dark:text-white sm:text-2xl">
            {meeting.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <InterviewLinkageBadge status={meeting.linkageStatus} />
            <InterviewConsentBadge consents={meeting.participantConsents} />
            <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize border-defaultborder/60 bg-white/80 dark:bg-black/20">
              {formatStatusLabel(meeting.status)}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${resultBadgeClass(interviewResult)}`}
            >
              Result: {interviewResult}
            </span>
          </div>
        </div>
        <div className="flex flex-shrink-0 flex-wrap gap-2">
          {canManageResult && (
            <button
              type="button"
              className="ti-btn ti-btn-primary min-h-[2.75rem] !text-sm"
              onClick={() => selectTab("result")}
            >
              <i className="ri-checkbox-circle-line me-1.5 align-middle" aria-hidden />
              {interviewResult === "pending" ? "Record result" : "Update result"}
            </button>
          )}
          {showLinkActions &&
            linkageActions({
              candidateId: meeting.candidateId,
              jobPosition: meeting.jobPosition,
              applicationId: meeting.applicationId,
            }).canLink && (
              <button type="button" className="ti-btn ti-btn-warning min-h-[2.75rem] !text-sm" onClick={() => openLinkage()}>
                Link application
              </button>
            )}
        </div>
      </div>

      <div className="box-body px-4 pb-6 pt-4 sm:px-6">
        <div className="border-b border-defaultborder/80 dark:border-defaultborder/10">
          <nav
            className="flex flex-nowrap gap-1 overflow-x-auto scrollbar-thin sm:gap-2"
            aria-label="Interview sections"
            role="tablist"
          >
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                id={`interview-tab-${t}`}
                aria-controls={`interview-panel-${t}`}
                aria-selected={tab === t}
                onClick={() => selectTab(t)}
                className={tabButtonClass(tab === t)}
              >
                {INTERVIEW_DETAIL_TAB_LABELS[t]}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-6 min-h-[20rem]">
          {tab === "overview" && (
            <div
              id="interview-panel-overview"
              role="tabpanel"
              aria-labelledby="interview-tab-overview"
              className="space-y-4"
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-xl border border-defaultborder/60 bg-defaultbackground/40 p-4 dark:bg-black/10">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-defaulttextcolor/60">Schedule</h2>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-defaulttextcolor/60">When</dt>
                      <dd className="text-end font-medium text-defaulttextcolor">{scheduledLabel}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-defaulttextcolor/60">Duration</dt>
                      <dd className="font-medium">{meeting.durationMinutes ? `${meeting.durationMinutes} min` : "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-defaulttextcolor/60">Type</dt>
                      <dd className="font-medium">{meeting.interviewType || "—"}</dd>
                    </div>
                    {meeting.jobPosition && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-defaulttextcolor/60">Role</dt>
                        <dd className="max-w-[60%] text-end font-medium">{meeting.jobPosition}</dd>
                      </div>
                    )}
                    <div className="flex justify-between gap-4">
                      <dt className="text-defaulttextcolor/60">Room ID</dt>
                      <dd className="font-mono text-xs break-all text-end">{meeting.meetingId}</dd>
                    </div>
                  </dl>
                </section>

                <section className="rounded-xl border border-defaultborder/60 bg-defaultbackground/40 p-4 dark:bg-black/10">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-defaulttextcolor/60">Participants</h2>
                  <ul className="mt-3 space-y-3 text-sm">
                    <li className="flex justify-between gap-3">
                      <span className="text-defaulttextcolor/60">Candidate</span>
                      <span className="font-medium text-end">{meeting.candidate?.name || "Not assigned"}</span>
                    </li>
                    <li className="flex justify-between gap-3">
                      <span className="text-defaulttextcolor/60">Host</span>
                      <span className="font-medium text-end">
                        {meeting.hosts?.[0]?.name || meeting.hosts?.[0]?.email || "—"}
                      </span>
                    </li>
                    <li className="flex justify-between gap-3">
                      <span className="text-defaulttextcolor/60">Recruiter</span>
                      <span className="font-medium text-end">
                        {meeting.recruiter?.name || meeting.recruiter?.email || "—"}
                      </span>
                    </li>
                  </ul>
                </section>
              </div>

              <section className="rounded-xl border border-defaultborder/60 p-4">
                <h2 className="text-sm font-semibold text-defaulttextcolor">Session artifacts</h2>
                <p className="mt-1 text-xs text-defaulttextcolor/60">
                  Open recordings, transcript, and AI summary from here after the interview ends.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {(
                    [
                      ["recording", "Recording", hasCompletedRecording ? "Ready to play" : "Not available yet"],
                      ["transcript", "Transcript", canTranscript ? "View conversation" : "No access"],
                      ["summary", "Summary", canSummary ? "View AI recap" : "No access"],
                    ] as const
                  ).map(([key, label, hint]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => selectTab(key)}
                      className="flex min-h-[4.5rem] flex-col items-start rounded-lg border border-defaultborder/60 bg-white p-3 text-start transition-colors hover:border-primary/40 hover:bg-primary/[0.03] dark:bg-bodybg"
                    >
                      <span className="text-sm font-medium text-defaulttextcolor">{label}</span>
                      <span className="mt-1 text-xs text-defaulttextcolor/60">{hint}</span>
                    </button>
                  ))}
                </div>
              </section>

              {meeting.notes?.trim() && (
                <section className="rounded-xl border border-defaultborder/60 p-4">
                  <h2 className="text-sm font-semibold text-defaulttextcolor">Notes</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-defaulttextcolor/80">{meeting.notes}</p>
                </section>
              )}
            </div>
          )}

          {tab === "recording" && (
            <div id="interview-panel-recording" role="tabpanel" aria-labelledby="interview-tab-recording">
              {hasCompletedRecording ? (
                <RecordingPlayer meetingId={meetingId} initialRecording={recordings[0] ?? null} />
              ) : (
                <div className="flex min-h-[14rem] flex-col items-center justify-center rounded-xl border border-dashed border-defaultborder/70 px-6 py-10 text-center">
                  <i className="ri-video-line text-3xl text-defaulttextcolor/40" aria-hidden />
                  <p className="mt-3 text-sm font-medium text-defaulttextcolor">No recording yet</p>
                  <p className="mt-1 max-w-md text-xs text-defaulttextcolor/60">
                    Recordings appear here after the session ends and processing completes. Check back in a few minutes.
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === "transcript" && (
            <div
              id="interview-panel-transcript"
              role="tabpanel"
              aria-labelledby="interview-tab-transcript"
              className="rounded-xl border border-defaultborder/60 p-4"
            >
              {!canTranscript ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-defaulttextcolor/70">You do not have access to this transcript.</p>
                </div>
              ) : (
                <TranscriptView
                  mode={transcript ? { kind: "interview", data: transcript } : null}
                  loading={transcriptLoading}
                  error={transcriptError}
                  onRetry={() => void loadTranscript()}
                  meetingTitle={meeting.title}
                />
              )}
            </div>
          )}

          {tab === "summary" && (
            <div
              id="interview-panel-summary"
              role="tabpanel"
              aria-labelledby="interview-tab-summary"
              className="rounded-xl border border-defaultborder/60 p-4"
            >
              {!canSummary ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-defaulttextcolor/70">You do not have access to this summary.</p>
                </div>
              ) : summaryLoading ? (
                <p className="py-10 text-center text-sm" role="status">
                  Loading summary…
                </p>
              ) : summaryError ? (
                <p className="text-sm text-danger">{summaryError}</p>
              ) : summary ? (
                <div className="space-y-4 text-sm">
                  {summary.partial && (
                    <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                      Partial summary. The session may have ended early.
                    </p>
                  )}
                  <div>
                    <h3 className="text-sm font-semibold text-defaulttextcolor">Executive summary</h3>
                    <p className="mt-2 leading-relaxed text-defaulttextcolor/85">{summary.executiveSummary}</p>
                  </div>
                  {summary.bulletSummary?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-defaulttextcolor">Highlights</h3>
                      <ul className="mt-2 list-disc space-y-1 ps-5">
                        {summary.bulletSummary.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <p className="text-sm font-medium text-defaulttextcolor">No summary generated yet</p>
                  <p className="mt-1 text-xs text-defaulttextcolor/60">
                    Summaries are created after the interview ends and the transcript is processed.
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === "result" && canManageResult && (
            <div
              id="interview-panel-result"
              role="tabpanel"
              aria-labelledby="interview-tab-result"
              className="rounded-xl border border-defaultborder/60 p-4 sm:p-6"
            >
              <InterviewDetailResultPanel
                meeting={meeting}
                meetingId={meetingId}
                onSaved={loadMeeting}
                onRequestLink={(reason) => openLinkage(reason)}
              />
            </div>
          )}
        </div>
      </div>

      {linkageTarget && (
        <InterviewLinkageModal target={linkageTarget} onClose={() => setLinkageTarget(null)} onLinked={loadMeeting} />
      )}
    </div>
  );
}
