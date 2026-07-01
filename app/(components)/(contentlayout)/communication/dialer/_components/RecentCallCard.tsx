"use client";
import React from "react";
import type { CallRecord } from "@/shared/lib/api/bolna";
import { callName, callNumber, callDirection, isMissed, fmtDuration, hasRecording } from "../_lib/recentCalls";

function initials(name: string): string {
  const t = name.trim();
  if (!t || t.startsWith("+") || /^\d/.test(t)) return "#";
  return t.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}
function fmtTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

type RecentCallCardProps = {
  record: CallRecord; selected: boolean; pinned: boolean;
  onSelect: () => void; onDial: () => void; onTogglePin: () => void;
};

export default function RecentCallCard({ record, selected, pinned, onSelect, onDial, onTogglePin }: RecentCallCardProps) {
  const name = callName(record);
  const dir = callDirection(record);
  const missed = isMissed(record);
  const meta = [fmtTime(record.createdAt), fmtDuration(record.duration)].filter(Boolean).join(" · ");
  const recorded = hasRecording(record);
  return (
    <div
      onDoubleClick={onDial}
      className={`group flex items-center gap-1 rounded-xl border px-1 transition-colors ${
        selected
          ? "border-primary/50 bg-primary/[0.06]"
          : "border-transparent hover:border-defaultborder/70 hover:bg-black/[0.02] dark:hover:bg-white/5"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2.5 text-left"
      >
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold ${
          missed ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"
        }`}>{initials(name)}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <i className={`text-xs ${dir === "inbound" ? "ri-arrow-left-down-line text-emerald-600" : dir === "outbound" ? "ri-arrow-right-up-line text-primary" : "ri-phone-line text-defaulttextcolor/40"}`} aria-hidden />
            <span className={`truncate text-sm font-medium ${missed ? "text-danger" : "text-defaulttextcolor dark:text-white"}`}>{name}</span>
            {recorded ? <i className="ri-play-circle-fill shrink-0 text-[0.85rem] text-primary" aria-label="has recording" title="Recording available" /> : null}
          </span>
          <span className="block truncate text-[0.72rem] text-defaulttextcolor/55 dark:text-white/45">{callNumber(record)}</span>
          {meta ? <span className="block truncate text-[0.66rem] tabular-nums text-defaulttextcolor/40 dark:text-white/35">{meta}</span> : null}
        </span>
      </button>
      <button
        type="button" aria-label={pinned ? "Unpin" : "Pin"} onClick={onTogglePin}
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm hover:bg-primary/10 ${pinned ? "text-primary" : "text-defaulttextcolor/30 opacity-0 group-hover:opacity-100 focus:opacity-100"}`}
      ><i className={pinned ? "ri-pushpin-2-fill" : "ri-pushpin-2-line"} /></button>
      <button
        type="button" aria-label="Dial" onClick={onDial}
        className="mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-emerald-600 opacity-0 transition-opacity hover:bg-emerald-500/10 focus:opacity-100 group-hover:opacity-100"
      ><i className="ri-phone-line" /></button>
    </div>
  );
}
