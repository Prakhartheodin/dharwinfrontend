"use client";
import React from "react";
import type { CallRecord } from "@/shared/lib/api/bolna";
import { callName, callNumber, callDirection, fmtDuration } from "../_lib/recentCalls";
import CallRecordings from "../../calling/_components/CallRecordings";

export default function CallContextPanel(
  { record, onCall, onSaveAsContact }:
  { record: CallRecord | null; onCall: (n: string) => void; onSaveAsContact?: (record: CallRecord) => void }
) {
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
  const line = [dir !== "unknown" ? dir : null, record.status, fmtDuration(record.duration)].filter(Boolean).join(" · ");
  const date = record.createdAt ? new Date(record.createdAt).toLocaleString() : "";
  return (
    <div className="flex h-full flex-col p-5">
      <div className="mb-4">
        <p className="mb-0 text-lg font-semibold text-defaulttextcolor dark:text-white">{callName(record)}</p>
        <p className="mb-0 font-mono text-sm text-defaulttextcolor/60 dark:text-white/50">{number}</p>
      </div>
      <div className="mb-4 space-y-1 text-sm text-defaulttextcolor/70 dark:text-white/55">
        {line ? <p className="mb-0 capitalize">{line}</p> : null}
        {date ? <p className="mb-0 text-[0.78rem] text-defaulttextcolor/45">{date}</p> : null}
      </div>
      {record.executionId ? (
        <div className="mb-4">
          <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wide text-defaulttextcolor/45">Recording</p>
          <CallRecordings executionId={record.executionId} />
        </div>
      ) : null}
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
      <div className="mt-auto space-y-2">
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
