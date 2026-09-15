"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import {
  InterviewLinkageBadge,
  InterviewLinkageModal,
  type InterviewLinkageTarget,
} from "../../_components/InterviewLinkageModal";
import { InterviewConsentBadge } from "../../_components/InterviewConsentBadge";
import { linkageActions, offersLinkAction } from "../../_components/interviewLinkage";
import {
  parseInterviewDetailTab,
  visibleInterviewDetailTabs,
  type InterviewDetailTab,
} from "./interviewDetailTabs";

function apiMessage(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return typeof msg === "string" && msg ? msg : fallback;
}

export default function InterviewDetailClient({
  meetingId,
  initialTab,
}: {
  meetingId: string;
  initialTab?: string;
}) {
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

  const tabs = useMemo(
    () =>
      visibleInterviewDetailTabs({
        canReadTranscript: canTranscript,
        canReadSummary: canSummary,
        hasRecording: recordings.some((r) => r.status === "completed"),
      }),
    [canTranscript, canSummary, recordings]
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
      <div className="p-8 text-center" role="status">
        <div className="inline-block animate-spin h-10 w-10 border-2 border-primary border-t-transparent rounded-full" />
        <p className="mt-3 text-sm text-defaulttextcolor/70">Loading interview…</p>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="p-6">
        <p className="text-danger">{error || "Interview not found"}</p>
        <Link href="/ats/interviews" className="ti-btn ti-btn-light mt-4 inline-flex min-h-[2.75rem]">
          Back to interviews
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/ats/interviews" className="text-xs text-primary hover:underline">
            ← Interviews
          </Link>
          <h1 className="text-xl font-semibold mt-1 truncate">{meeting.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <InterviewLinkageBadge status={meeting.linkageStatus} />
            <InterviewConsentBadge consents={meeting.participantConsents} />
            <span className="text-xs text-defaulttextcolor/60">{meeting.status}</span>
          </div>
        </div>
        {showLinkActions && linkageActions({ candidateId: meeting.candidateId, jobPosition: meeting.jobPosition, applicationId: meeting.applicationId }).canLink && (
          <button
            type="button"
            className="ti-btn ti-btn-warning min-h-[2.75rem]"
            onClick={() =>
              setLinkageTarget({
                meetingId: meeting.id || meetingId,
                candidateId: meeting.candidateId || "",
                candidateName: meeting.candidate?.name || "Candidate",
                position: meeting.jobPosition || meeting.title,
                jobPosition: meeting.jobPosition,
                linkageStatus: meeting.linkageStatus,
              })
            }
          >
            Link application
          </button>
        )}
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-defaultborder/60 pb-2" aria-label="Interview sections">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`ti-btn ti-btn-sm capitalize min-h-[2.5rem] ${tab === t ? "ti-btn-primary" : "ti-btn-light"}`}
            aria-current={tab === t ? "page" : undefined}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-defaultborder/60 p-4">
            <h2 className="font-medium mb-2">Schedule</h2>
            <p className="text-sm">{meeting.scheduledAt ? new Date(meeting.scheduledAt).toLocaleString() : "—"}</p>
            <p className="text-xs text-defaulttextcolor/60 mt-1">Room: {meeting.meetingId}</p>
          </section>
          <section className="rounded-xl border border-defaultborder/60 p-4">
            <h2 className="font-medium mb-2">Participants</h2>
            <ul className="text-sm space-y-1">
              {meeting.candidate?.name && <li>Candidate: {meeting.candidate.name}</li>}
              {meeting.host?.name && <li>Host: {meeting.host.name}</li>}
              {meeting.recruiter?.email && (
                <li>Recruiter: {meeting.recruiter.name || meeting.recruiter.email}</li>
              )}
            </ul>
          </section>
        </div>
      )}

      {tab === "recording" && (
        <RecordingPlayer meetingId={meetingId} initialRecording={recordings[0] ?? null} />
      )}

      {tab === "transcript" && (
        <div className="rounded-xl border border-defaultborder/60 p-4 min-h-[240px]">
          {!canTranscript ? (
            <p className="text-sm text-defaulttextcolor/70 py-8 text-center">You do not have access to this transcript.</p>
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
        <div className="rounded-xl border border-defaultborder/60 p-4 min-h-[240px]">
          {!canSummary ? (
            <p className="text-sm text-defaulttextcolor/70 py-8 text-center">You do not have access to this summary.</p>
          ) : summaryLoading ? (
            <p className="text-sm py-8 text-center" role="status">
              Loading summary…
            </p>
          ) : summaryError ? (
            <p className="text-sm text-danger py-4">{summaryError}</p>
          ) : summary ? (
            <div className="space-y-4 text-sm">
              {summary.partial && (
                <p className="text-amber-700 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-xs">
                  Partial summary — session may have ended early.
                </p>
              )}
              <p>{summary.executiveSummary}</p>
              {summary.bulletSummary?.length > 0 && (
                <ul className="list-disc ps-5 space-y-1">
                  {summary.bulletSummary.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="text-sm text-center py-8 text-defaulttextcolor/60">No summary generated yet.</p>
          )}
        </div>
      )}

      {linkageTarget && (
        <InterviewLinkageModal
          target={linkageTarget}
          onClose={() => setLinkageTarget(null)}
          onLinked={loadMeeting}
        />
      )}
    </div>
  );
}
