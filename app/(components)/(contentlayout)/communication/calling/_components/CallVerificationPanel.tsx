"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { CallInterviewSlot, CallRecord } from "@/shared/lib/api/bolna";
import { readBolnaCallSummary, refreshBolnaCallRecord } from "@/shared/lib/api/bolna";
import { formatInZone, getViewerTimezone, normalizeTimezone } from "@/shared/lib/timezone";

const yesNo = (v?: boolean | null) =>
  v === true ? "Yes" : v === false ? "No" : "—";

const interestLabel: Record<string, string> = {
  interested: "Interested",
  not_interested: "Not interested",
  withdrew: "Withdrew",
};

const outcomeLabel: Record<string, string> = {
  fully_confirmed: "Fully confirmed",
  partially_confirmed: "Partially confirmed",
  refused: "Refused",
  voicemail: "Voicemail",
  no_data: "No data",
};

const REASON_LABEL: Record<string, string> = {
  structured_extraction_not_configured:
    "Bolna returned only a call summary — configure Candidate Verification extractions in Bolna",
  empty_extraction: "Structured verification fields were empty",
  low_confidence: "Low extraction confidence",
  no_user_turns: "No candidate responses in transcript",
  runtime_error_in_transcript: "Runtime error in transcript",
};

/**
 * A call has reviewable summary data only if it carries a structured verification
 * or a Bolna call summary. Calls placed before the summary feature shipped have
 * neither, so their `needs_review` status is a false positive — nothing to review.
 */
export function hasReviewableSummary(
  record: Pick<CallRecord, "verification" | "extractedData">
): boolean {
  if (record.verification) return true;
  return Boolean(readBolnaCallSummary(record.extractedData));
}

const SLOT_STATUS: Record<CallInterviewSlot["status"], { label: string; icon: string; className: string }> = {
  held: {
    label: "Held · awaiting approval",
    icon: "ri-time-line",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  },
  approving: {
    label: "Approving",
    icon: "ri-loader-4-line",
    className: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  },
  approved: {
    label: "Approved",
    icon: "ri-checkbox-circle-line",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
  rejected: {
    label: "Rejected",
    icon: "ri-close-circle-line",
    className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  },
  expired: {
    label: "Expired",
    icon: "ri-history-line",
    className: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300",
  },
  cancelled: {
    label: "Cancelled",
    icon: "ri-forbid-line",
    className: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300",
  },
};

/** Extraction outcomes worth surfacing when no hold exists (held / not_offered say nothing new). */
const SLOT_OUTCOME_REASON: Record<string, string> = {
  declined: "Candidate declined scheduling",
  wants_link: "Asked for a link",
  no_slots: "No slots available",
};

/** True when the call produced a booking, a booking-link email, or a scheduling outcome to explain. */
export function hasInterviewBooking(
  record: Pick<CallRecord, "interviewSlot" | "bookingLinkSentAt" | "verification">
): boolean {
  if (record.interviewSlot || record.bookingLinkSentAt) return true;
  const outcome = record.verification?.interviewSlotOutcome;
  return Boolean(outcome && SLOT_OUTCOME_REASON[outcome]);
}

/**
 * Interview slot booked (or not) from this call. The hold is authoritative; the
 * extraction outcome is only a fallback explanation when there is no hold.
 */
export function InterviewSlotSection({ record }: { record: CallRecord }) {
  if (!hasInterviewBooking(record)) return null;
  const slot = record.interviewSlot;
  const outcome = record.verification?.interviewSlotOutcome;
  const reason = !slot && outcome ? SLOT_OUTCOME_REASON[outcome] : undefined;

  let body: ReactNode;
  if (slot) {
    const viewerTz = getViewerTimezone();
    const candTz = slot.candidateTimezone ? normalizeTimezone(slot.candidateTimezone) : null;
    const status = SLOT_STATUS[slot.status];
    body = (
      <dl className="space-y-1">
        <div className="flex justify-between gap-2">
          <dt className="text-defaulttextcolor/60">Time</dt>
          <dd className="text-end">
            {formatInZone(slot.start, viewerTz)}
            {slot.durationMinutes ? ` · ${slot.durationMinutes} min` : ""}
            {candTz && candTz !== normalizeTimezone(viewerTz) ? (
              <span className="block text-xs text-defaulttextcolor/60">
                (candidate: {formatInZone(slot.start, candTz)})
              </span>
            ) : null}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-defaulttextcolor/60">Interviewer</dt>
          <dd>{slot.interviewerName || "—"}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-defaulttextcolor/60">Status</dt>
          <dd className="flex items-center gap-2">
            {status ? (
              <span
                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${status.className}`}
              >
                <i className={status.icon} aria-hidden="true" />
                {status.label}
              </span>
            ) : (
              slot.status
            )}
            {slot.status === "approved" && slot.meetingId ? (
              <Link href={`/ats/interviews/${slot.meetingId}`} className="text-xs text-primary hover:underline">
                View interview
              </Link>
            ) : null}
          </dd>
        </div>
        {slot.status === "rejected" && slot.rejectReason ? (
          <div className="flex justify-between gap-2">
            <dt className="text-defaulttextcolor/60">Reason</dt>
            <dd>{slot.rejectReason}</dd>
          </div>
        ) : null}
      </dl>
    );
  } else {
    body = (
      <div className="space-y-1">
        {record.bookingLinkSentAt ? (
          <p className="flex items-center gap-1">
            <i className="ri-mail-send-line text-defaulttextcolor/60" aria-hidden="true" />
            Booking link emailed{" "}
            {formatDistanceToNow(new Date(record.bookingLinkSentAt), { addSuffix: true })}
          </p>
        ) : null}
        {reason ? <p className="text-defaulttextcolor/70">{reason}</p> : null}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-defaultborder/60 dark:border-white/10 p-3 text-sm">
      <div className="mb-2 font-semibold">Interview slot</div>
      {body}
    </div>
  );
}

export function CallQualityBadge({
  callQuality,
  hasSummary = true,
  className = "",
}: {
  callQuality?: CallRecord["callQuality"];
  /** When false, suppress the badge (old call with no summary fields to review). */
  hasSummary?: boolean;
  className?: string;
}) {
  if (callQuality?.status !== "needs_review") return null;
  if (!hasSummary) return null;
  const title = (callQuality.reasons || [])
    .map((r) => REASON_LABEL[r] || r)
    .join("; ");
  return (
    <span
      title={title}
      className={`rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 ${className}`}
    >
      Needs review
    </span>
  );
}

export default function CallVerificationPanel({
  record,
  onRecordUpdate,
  alwaysRender = true,
}: {
  record: CallRecord;
  onRecordUpdate?: (record: CallRecord) => void;
  /** When false, hide entirely once a refresh confirms there's no summary/verification data. */
  alwaysRender?: boolean;
}) {
  const [live, setLive] = useState(record);
  const [refreshing, setRefreshing] = useState(false);
  const onRecordUpdateRef = useRef(onRecordUpdate);
  onRecordUpdateRef.current = onRecordUpdate;

  useEffect(() => {
    setLive(record);
  }, [record]);

  // Refresh once per execution when the detail panel opens — not on every parent re-render.
  useEffect(() => {
    if (!record.executionId) return;
    let cancelled = false;
    (async () => {
      setRefreshing(true);
      try {
        const { record: refreshed } = await refreshBolnaCallRecord(record.executionId!);
        if (!cancelled && refreshed) {
          setLive(refreshed);
          onRecordUpdateRef.current?.(refreshed);
        }
      } catch {
        /* keep list/detail data */
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [record.executionId]);

  const v = live.verification;
  const q = live.callQuality;
  const callSummary = readBolnaCallSummary(live.extractedData);
  const needsStructuredConfig = q?.reasons?.includes("structured_extraction_not_configured");

  // Mounted speculatively (alwaysRender=false) for a telephony call whose list payload had
  // no summary/verification. Refresh runs above; if it surfaces nothing, stay hidden — but
  // show a brief syncing line so the user isn't staring at a dead panel.
  if (!alwaysRender && !v && !callSummary && !hasReviewableSummary(live) && !hasInterviewBooking(live)) {
    return refreshing ? (
      <div className="text-xs text-defaulttextcolor/50">Syncing verification from Bolna…</div>
    ) : null;
  }

  const rows: Array<[string, string]> = [
    ["Name confirmed", yesNo(v?.nameConfirmed)],
    ["Corrected name", v?.correctedName || "—"],
    ["Job confirmed", yesNo(v?.jobConfirmed)],
    ["Availability", v?.availability || "—"],
    ["Location", v?.currentLocation || "—"],
    ["Interest", v?.stillInterested ? interestLabel[v.stillInterested] : "—"],
    ["Outcome", v?.callOutcome ? outcomeLabel[v.callOutcome] : "—"],
  ];

  return (
    <div className="space-y-3">
      {callSummary ? (
        <div className="rounded-md border border-defaultborder/60 dark:border-white/10 p-3 text-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="font-semibold">Call summary (Bolna)</span>
            {callSummary.confidence != null ? (
              <span className="text-xs text-defaulttextcolor/60">
                Confidence {(callSummary.confidence * 100).toFixed(0)}%
              </span>
            ) : null}
          </div>
          <p className="text-[0.8125rem] leading-relaxed text-defaulttextcolor/90 whitespace-pre-wrap">
            {callSummary.subjective}
          </p>
        </div>
      ) : null}

      <InterviewSlotSection record={live} />

      <div className="rounded-md border border-defaultborder/60 dark:border-white/10 p-3 text-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="font-semibold">Verification summary</span>
          <div className="flex items-center gap-2">
            {refreshing ? (
              <span className="text-xs text-defaulttextcolor/50">Syncing from Bolna…</span>
            ) : null}
            <CallQualityBadge callQuality={q} hasSummary={hasReviewableSummary(live)} />
          </div>
        </div>
        {needsStructuredConfig ? (
          <p className="mb-2 rounded bg-sky-50 px-2 py-1.5 text-xs text-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
            Bolna only returned the default call summary for this execution — not the{" "}
            <strong>Candidate Verification</strong> category. Click{" "}
            <strong>Setup Extractions</strong> in the toolbar (one-time), then place a{" "}
            <strong>new</strong> verification call. Bolna does not re-run extractions on calls
            that already completed.
          </p>
        ) : null}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-2">
              <dt className="text-defaulttextcolor/60">{label}</dt>
              <dd className={value === "Withdrew" ? "font-semibold text-red-600" : ""}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
