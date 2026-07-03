"use client";
import React from "react";
import { getBolnaCallRecord, type CallRecord } from "@/shared/lib/api/bolna";
import { callName, callNumber, callDirection, fmtDuration } from "../_lib/recentCalls";
import CallRecordings from "../../calling/_components/CallRecordings";

const INTEL_POLL_MS = 8000;
// Twilio Intelligence usually completes in 1–3 min; past this we stop polling
// and tell the user instead of pulsing a skeleton forever.
const INTEL_STALL_MS = 10 * 60 * 1000;

function intelPending(intel: CallRecord["intelligence"]): boolean {
  if (!intel || intel.summary || !intel.transcriptSid) return false;
  const s = (intel.status || "").toLowerCase();
  return s !== "failed" && s !== "canceled";
}

/**
 * Keep the selected call fresh while Twilio Intelligence is processing: poll
 * the lightweight single-record endpoint until the summary/transcript lands,
 * fails, or stalls out. The list snapshot never updates on its own, so without
 * this the "Generating summary…" skeleton would sit until the user re-selects.
 */
function useLiveRecord(record: CallRecord | null) {
  const [live, setLive] = React.useState(record);
  React.useEffect(() => setLive(record), [record]);

  const executionId = record?.executionId;
  const pending = intelPending(live?.intelligence);
  const requestedAt = live?.intelligence?.requestedAt;
  const stalled =
    pending && !!requestedAt && Date.now() - new Date(requestedAt).getTime() > INTEL_STALL_MS;

  React.useEffect(() => {
    if (!pending || stalled || !executionId) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const { record: fresh } = await getBolnaCallRecord(executionId);
        if (!cancelled && fresh) setLive((prev) => ({ ...prev, ...fresh }));
      } catch {
        // Transient poll failure — the next tick retries.
      }
    }, INTEL_POLL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [pending, stalled, executionId]);

  return { record: live, stalled };
}

/**
 * AI-generated call summary (Twilio Conversational Intelligence). The backend
 * omits `intelligence` for viewers without the Call AI permission, and for
 * calls made before the pipeline existed — the card hides itself entirely.
 */
function AiSummaryCard(
  { intelligence, stalled, historical }:
  { intelligence?: CallRecord["intelligence"]; stalled?: boolean; historical?: boolean }
) {
  if (!intelligence || (!intelligence.transcriptSid && !intelligence.summary)) return null;
  // Static lists (e.g. a contact's call history) don't poll Intelligence, and old
  // calls predate the pipeline — show nothing rather than a spinner that never resolves.
  if (historical && !intelligence.summary) return null;
  const status = (intelligence.status || "").toLowerCase();
  const failed = status === "failed" || status === "canceled";
  const pending = !intelligence.summary && !failed;

  return (
    <div className="mb-4 rounded-xl border border-primary/20 bg-primary/[0.04] p-3 dark:border-primary/25 dark:bg-primary/10">
      <p className="mb-2 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-primary/80 dark:text-primary">
        <i className="ri-sparkling-2-line text-sm" aria-hidden />
        AI Summary
        {pending && !stalled ? (
          <i className="ri-loader-4-line ml-auto animate-spin text-sm text-primary/60 motion-reduce:animate-none" aria-hidden />
        ) : null}
      </p>
      {intelligence.summary ? (
        <p className="mb-0 whitespace-pre-line text-sm leading-relaxed text-defaulttextcolor/80 dark:text-white/70">
          {intelligence.summary}
        </p>
      ) : failed ? (
        <p className="mb-0 text-[0.78rem] text-defaulttextcolor/50 dark:text-white/40">
          Summary unavailable for this call.
        </p>
      ) : stalled ? (
        <p className="mb-0 text-[0.78rem] text-defaulttextcolor/50 dark:text-white/40">
          Summary is taking longer than expected — it will appear here once ready.
        </p>
      ) : pending ? (
        <div aria-live="polite">
          <p className="mb-2 text-[0.78rem] text-defaulttextcolor/55 dark:text-white/45">
            Generating summary… usually ready in 1–3 minutes.
          </p>
          <div className="space-y-1.5" aria-hidden>
            <div className="h-2 w-full animate-pulse rounded-full bg-primary/15 dark:bg-primary/20" />
            <div className="h-2 w-4/5 animate-pulse rounded-full bg-primary/15 dark:bg-primary/20" />
            <div className="h-2 w-3/5 animate-pulse rounded-full bg-primary/15 dark:bg-primary/20" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Full call transcript (Twilio Intelligence dual-channel: A = agent leg,
 * B = callee). Backend strips `transcript` without the Call Transcripts
 * permission, so the card self-hides. Collapsed by default — transcripts
 * are long and the summary card above carries the gist.
 */
function TranscriptCard({ transcript }: { transcript?: string }) {
  const [open, setOpen] = React.useState(false);
  if (!transcript?.trim()) return null;
  const lines = transcript.split("\n").map((l) => l.trim()).filter(Boolean);
  return (
    <div className="mb-4 rounded-xl border border-defaultborder/60 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.03]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-defaulttextcolor/45">
          <i className="ri-chat-3-line text-sm" aria-hidden /> Transcript
        </span>
        <span className="flex items-center gap-1 text-[0.7rem] text-defaulttextcolor/45">
          {open ? "Hide" : "Show"}
          <i className={`${open ? "ri-arrow-up-s-line" : "ri-arrow-down-s-line"} text-sm`} aria-hidden />
        </span>
      </button>
      {open ? (
        <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-1">
          {lines.map((line, i) => {
            const m = line.match(/^([AB]):\s*(.*)$/);
            const speaker = m?.[1];
            const text = m ? m[2] : line;
            return (
              <p key={i} className="mb-0 text-[0.8rem] leading-relaxed text-defaulttextcolor/75 dark:text-white/60">
                {speaker ? (
                  <span className={`mr-1.5 font-semibold ${speaker === "A" ? "text-primary" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {speaker === "A" ? "Agent" : "Caller"}
                  </span>
                ) : null}
                {text}
              </p>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The recording + AI-summary + transcript card cluster for one call record.
 * Shared by the dialer's selected-call panel and the contact's Recent-calls list.
 * Static by design: no live polling here — the selected-call panel owns polling
 * via useLiveRecord and passes a fresh `record` in.
 */
export function CallCards(
  { record, stalled, historical }:
  { record: CallRecord; stalled?: boolean; historical?: boolean }
) {
  return (
    <>
      {record.executionId ? (
        <div className="mb-4 rounded-xl border border-defaultborder/60 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wide text-defaulttextcolor/45">Recording</p>
          <CallRecordings executionId={record.executionId} />
        </div>
      ) : null}
      <AiSummaryCard intelligence={record.intelligence} stalled={stalled} historical={historical} />
      <TranscriptCard transcript={record.transcript} />
    </>
  );
}

export default function CallContextPanel(
  { record: recordProp, onCall, onSaveAsContact }:
  { record: CallRecord | null; onCall: (n: string) => void; onSaveAsContact?: (record: CallRecord) => void }
) {
  const { record, stalled } = useLiveRecord(recordProp);
  if (!record) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <span className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-2xl text-primary"><i className="ri-phone-line" /></span>
        <p className="mb-1 text-base font-semibold text-defaulttextcolor dark:text-white">Start a conversation</p>
        <ul className="mb-0 space-y-1 text-[0.78rem] text-defaulttextcolor/55 dark:text-white/45">
          <li>Search recent calls</li><li>Dial a number</li><li>Call from browser</li><li>Call from your phone</li>
        </ul>
      </div>
    );
  }
  const number = callNumber(record);
  const dir = callDirection(record);
  const name = callName(record);
  const duration = fmtDuration(record.duration);
  const status = record.status || "";
  const date = record.createdAt ? new Date(record.createdAt).toLocaleString() : "";

  const s = status.toLowerCase();
  const statusTone = /complete/.test(s)
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    : /(fail|busy|no.?answer|error|disconnect|cancel|reject|decline)/.test(s)
      ? "bg-danger/10 text-danger"
      : "bg-amber-500/10 text-amber-600 dark:text-amber-400";
  const dirIcon = dir === "outbound" ? "ri-arrow-right-up-line" : dir === "inbound" ? "ri-arrow-left-down-line" : "ri-phone-line";
  // Initials for the avatar; fall back to an icon when the "name" is really a phone number.
  const nameIsNumber = !name || /^[+\d]/.test(name.trim());
  const initials = nameIsNumber
    ? ""
    : name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const chip = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium";
  const chipNeutral = "bg-black/[0.04] text-defaulttextcolor/70 dark:bg-white/10 dark:text-white/70";

  return (
    <div className="flex h-full flex-col p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/10 text-base font-semibold text-primary">
          {initials || <i className="ri-user-3-line text-xl" />}
        </span>
        <div className="min-w-0">
          <p className="mb-0 truncate text-lg font-semibold text-defaulttextcolor dark:text-white">{name}</p>
          <p className="mb-0 font-mono text-sm text-defaulttextcolor/60 dark:text-white/50">{number}</p>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {dir !== "unknown" ? (
          <span className={`${chip} ${chipNeutral} capitalize`}><i className={`${dirIcon} text-sm`} />{dir}</span>
        ) : null}
        {status ? <span className={`${chip} ${statusTone} capitalize`}>{status}</span> : null}
        {duration ? (
          <span className={`${chip} ${chipNeutral}`}><i className="ri-time-line text-sm" />{duration}</span>
        ) : null}
      </div>
      {date ? <p className="mb-4 text-[0.78rem] text-defaulttextcolor/45">{date}</p> : null}

      <CallCards record={record} stalled={stalled} />
      {record.tags?.length ? (
        <div className="mb-4">
          <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wide text-defaulttextcolor/45">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {record.tags.map((t) => <span key={t} className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.7rem] text-primary">{t}</span>)}
          </div>
        </div>
      ) : null}
      {record.notes ? (
        <div className="mb-4">
          <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wide text-defaulttextcolor/45">Notes</p>
          <p className="mb-0 text-sm text-defaulttextcolor/70 dark:text-white/55">{record.notes}</p>
        </div>
      ) : null}
      <div className="mt-auto space-y-2 border-t border-defaultborder/60 pt-4 dark:border-white/10">
        <button type="button" onClick={() => onCall(number)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700">
          <i className="ri-phone-line" /> Call
        </button>
        <button type="button" onClick={() => record && onSaveAsContact?.(record)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-defaultborder/70 py-2.5 text-sm font-semibold text-defaulttextcolor/70 hover:bg-black/[0.03] dark:hover:bg-white/5">
          <i className="ri-user-add-line" /> Save as contact
        </button>
      </div>
    </div>
  );
}
