"use client";

import React, { useCallback, useMemo, useState } from "react";
import type {
  MeetingTranscriptResponse,
  RecordingTranscriptResponse,
  TranscriptSegment,
  TranscriptUtterance,
} from "@/shared/lib/api/meetings";

export function msToTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function speakerLabel(u: TranscriptUtterance, fallbackIdx: number): string {
  return (
    u.speakerName ||
    u.speakerLabel ||
    (u.speaker ? `Speaker ${u.speaker}` : `Speaker ${fallbackIdx + 1}`)
  );
}

function speakerColor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  const palette = [
    "bg-primary/10 text-primary border-primary/30",
    "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    "bg-amber-500/10 text-amber-600 border-amber-500/30",
    "bg-rose-500/10 text-rose-600 border-rose-500/30",
    "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
    "bg-cyan-500/10 text-cyan-600 border-cyan-500/30",
  ];
  return palette[Math.abs(hash) % palette.length];
}

function roleBadgeClass(role?: string): string {
  switch (role) {
    case "candidate":
      return "bg-sky-500/10 text-sky-700 border-sky-500/30";
    case "interviewer":
    case "recruiter":
    case "host":
      return "bg-violet-500/10 text-violet-700 border-violet-500/30";
    case "agent":
      return "bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-500/30";
    default:
      return "bg-gray-500/10 text-gray-600 border-gray-500/30";
  }
}

export type TranscriptViewMode =
  | { kind: "recording"; data: RecordingTranscriptResponse }
  | { kind: "interview"; data: MeetingTranscriptResponse };

export interface TranscriptViewProps {
  mode: TranscriptViewMode | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  legacySource?: RecordingTranscriptResponse["source"];
  meetingTitle?: string;
}

export default function TranscriptView({
  mode,
  loading,
  error,
  onRetry,
  legacySource,
  meetingTitle,
}: TranscriptViewProps) {
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);

  const filteredSegments = useMemo<TranscriptSegment[]>(() => {
    if (!mode || mode.kind !== "recording") return [];
    const q = search.trim().toLowerCase();
    const segments = mode.data.segments;
    if (!q) return segments;
    return segments.filter((seg) => {
      if (seg.combinedText?.toLowerCase().includes(q)) return true;
      return seg.utterances?.some((u) => u.text?.toLowerCase().includes(q));
    });
  }, [mode, search]);

  const interviewUtterances = useMemo(() => {
    if (!mode || mode.kind !== "interview") return [];
    const q = search.trim().toLowerCase();
    const list = mode.data.utterances || [];
    if (!q) return list;
    return list.filter((u) => u.text?.toLowerCase().includes(q));
  }, [mode, search]);

  const fullText = useMemo(() => {
    if (!mode) return "";
    if (mode.kind === "recording") {
      return mode.data.segments
        .map((seg) => {
          if (seg.utterances?.length) {
            return seg.utterances
              .map((u, i) => `[${msToTime(u.startMs)}] ${speakerLabel(u, i)}: ${u.text}`)
              .join("\n");
          }
          return `[${msToTime(seg.windowStartMs)}] ${seg.combinedText}`;
        })
        .join("\n\n");
    }
    return mode.data.utterances
      .map((u, i) => {
        const t = u.recordingOffsetMs != null ? msToTime(u.recordingOffsetMs) : "—";
        const name = u.displayName || u.speakerRole || `Speaker ${i + 1}`;
        return `[${t}] ${name}: ${u.text}`;
      })
      .join("\n");
  }, [mode]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  }, [fullText]);

  const handleDownload = useCallback(() => {
    if (!fullText) return;
    const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const title =
      (mode?.kind === "recording" ? mode.data.meetingTitle : meetingTitle) || "transcript";
    const safeTitle = title.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeTitle}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [fullText, mode, meetingTitle]);

  const qualityBanner =
    mode?.kind === "interview" && mode.data.quality?.lowConfidenceShare != null &&
    mode.data.quality.lowConfidenceShare > 0.25 ? (
      <div
        className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200"
        role="status"
      >
        Some utterances have low speech-to-text confidence — review carefully before decisions.
      </div>
    ) : null;

  const legacyBanner =
    legacySource === "meetingId" ? (
      <span
        className="text-[0.65rem] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/30"
        title="Legacy transcript match"
      >
        legacy match
      </span>
    ) : null;

  const evidenceBanner =
    mode?.kind === "interview" && mode.data.evidenceGrade && mode.data.evidenceGrade !== "full" ? (
      <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs" role="status">
        Evidence grade: <strong>{mode.data.evidenceGrade}</strong>
        {mode.data.partialReasons?.length ? ` — ${mode.data.partialReasons.join(", ")}` : ""}
      </div>
    ) : null;

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-defaultborder/60 dark:border-white/5">
        {legacyBanner}
        <div className="relative flex-1 min-w-[12rem]">
          <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-[0.85rem] text-defaulttextcolor/50 pointer-events-none" />
          <input
            type="search"
            placeholder="Search transcript…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-control !py-1 !pl-8 !pr-3 !text-[0.8rem] w-full min-h-[2.5rem]"
            disabled={loading || !mode}
            aria-label="Search transcript"
          />
        </div>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!fullText}
          className="ti-btn ti-btn-light !py-1.5 !px-3 !text-[0.75rem] min-h-[2.5rem] disabled:opacity-50"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!fullText}
          className="ti-btn ti-btn-primary-light !py-1.5 !px-3 !text-[0.75rem] min-h-[2.5rem] disabled:opacity-50"
        >
          Download
        </button>
      </div>

      <div className="flex-1 overflow-auto py-4 space-y-3">
        {loading && (
          <div className="flex flex-col items-center py-12" role="status" aria-live="polite">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mb-3" />
            <p className="text-sm text-gray-500">Loading transcript…</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-xs flex gap-2 items-start">
            <span className="flex-1">{error}</span>
            {onRetry && (
              <button type="button" className="underline font-medium min-h-[2.5rem] px-2" onClick={onRetry}>
                Retry
              </button>
            )}
          </div>
        )}

        {!loading && !error && mode?.kind === "interview" && (
          <>
            {evidenceBanner}
            {qualityBanner}
            {interviewUtterances.length === 0 ? (
              <p className="text-sm text-center text-defaulttextcolor/60 py-8">No transcript utterances.</p>
            ) : (
              interviewUtterances.map((u, idx) => (
                <div key={u.utteranceId || idx} className="flex gap-2 items-start">
                  <span className="font-mono text-[0.7rem] text-defaulttextcolor/50 w-10 shrink-0 pt-1">
                    {u.recordingOffsetMs != null ? msToTime(u.recordingOffsetMs) : "—"}
                  </span>
                  <span
                    className={`inline-flex shrink-0 px-2 py-0.5 rounded border text-[0.65rem] font-medium ${roleBadgeClass(
                      u.speakerRole
                    )}`}
                  >
                    {u.displayName || u.speakerRole || "Unknown"}
                  </span>
                  <p
                    className={`text-sm flex-1 leading-relaxed ${
                      u.confidence != null && u.confidence < 0.75 ? "opacity-80 italic" : ""
                    }`}
                  >
                    {u.text}
                  </p>
                </div>
              ))
            )}
          </>
        )}

        {!loading && !error && mode?.kind === "recording" &&
          filteredSegments.map((seg) => (
            <div
              key={seg.id}
              className="border border-defaultborder/60 dark:border-white/5 rounded-lg p-3"
            >
              <div className="flex items-center gap-2 mb-2 text-[0.7rem] text-defaulttextcolor/60 font-mono">
                <span>
                  {msToTime(seg.windowStartMs)} – {msToTime(seg.windowEndMs)}
                </span>
              </div>
              {seg.utterances?.length ? (
                <div className="space-y-2">
                  {seg.utterances.map((u, idx) => {
                    const key = u.speaker || u.speakerLabel || u.speakerName || `idx-${idx}`;
                    return (
                      <div key={`${seg.id}-${idx}`} className="flex gap-2">
                        <span
                          className={`inline-flex shrink-0 px-2 py-0.5 rounded border text-[0.65rem] font-medium ${speakerColor(
                            String(key)
                          )}`}
                        >
                          {speakerLabel(u, idx)}
                        </span>
                        <p className="text-sm flex-1">{u.text}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm">{seg.combinedText}</p>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
