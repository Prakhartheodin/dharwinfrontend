"use client";

import { useEffect, useRef, useState } from "react";
import type { CallRecord } from "@/shared/lib/api/bolna";
import { readBolnaCallSummary, refreshBolnaCallRecord } from "@/shared/lib/api/bolna";

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

export function CallQualityBadge({
  callQuality,
  className = "",
}: {
  callQuality?: CallRecord["callQuality"];
  className?: string;
}) {
  if (callQuality?.status !== "needs_review") return null;
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
}: {
  record: CallRecord;
  onRecordUpdate?: (record: CallRecord) => void;
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

      <div className="rounded-md border border-defaultborder/60 dark:border-white/10 p-3 text-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="font-semibold">Verification summary</span>
          <div className="flex items-center gap-2">
            {refreshing ? (
              <span className="text-xs text-defaulttextcolor/50">Syncing from Bolna…</span>
            ) : null}
            <CallQualityBadge callQuality={q} />
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
