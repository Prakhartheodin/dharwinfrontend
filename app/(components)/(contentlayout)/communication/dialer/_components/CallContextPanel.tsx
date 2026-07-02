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

      {record.executionId ? (
        <div className="mb-4 rounded-xl border border-defaultborder/60 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wide text-defaulttextcolor/45">Recording</p>
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
