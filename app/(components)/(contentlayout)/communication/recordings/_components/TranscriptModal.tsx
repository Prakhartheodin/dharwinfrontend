"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  getRecordingTranscript,
  type RecordingTranscriptResponse,
  type TranscriptSegment,
  type TranscriptUtterance,
} from "@/shared/lib/api/meetings";

interface TranscriptModalProps {
  recordingId: string | null;
  meetingTitle?: string | null;
  onClose: () => void;
}

function msToTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function speakerLabel(u: TranscriptUtterance, fallbackIdx: number): string {
  return (
    u.speakerName ||
    u.speakerLabel ||
    (u.speaker ? `Speaker ${u.speaker}` : `Speaker ${fallbackIdx + 1}`)
  );
}

function speakerColor(key: string): string {
  // Deterministic hue from speaker key — keeps the same speaker the same color.
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

export default function TranscriptModal({
  recordingId,
  meetingTitle,
  onClose,
}: TranscriptModalProps) {
  const [data, setData] = useState<RecordingTranscriptResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [segmentPage, setSegmentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);

  const fetchTranscript = useCallback(async (id: string, page = 1, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await getRecordingTranscript(id, { page, limit: 50 });
      setData((prev) => {
        if (append && prev) {
          return {
            ...res,
            segments: [...prev.segments, ...res.segments],
          };
        }
        return res;
      });
      setSegmentPage(res.page ?? page);
    } catch (e) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setError(msg || (e instanceof Error ? e.message : "Failed to load transcript"));
      if (!append) setData(null);
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, []);

  const loadMoreSegments = useCallback(() => {
    if (!recordingId || loadingMore) return;
    const totalPages = data?.totalPages ?? 1;
    if (segmentPage >= totalPages) return;
    void fetchTranscript(recordingId, segmentPage + 1, true);
  }, [recordingId, loadingMore, data?.totalPages, segmentPage, fetchTranscript]);

  useEffect(() => {
    if (!recordingId) return;
    setSearch("");
    setData(null);
    setSegmentPage(1);
    fetchTranscript(recordingId, 1, false);
  }, [recordingId, fetchTranscript]);

  useEffect(() => {
    if (!recordingId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [recordingId, onClose]);

  const filteredSegments = useMemo<TranscriptSegment[]>(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.segments;
    return data.segments.filter((seg) => {
      if (seg.combinedText?.toLowerCase().includes(q)) return true;
      return seg.utterances?.some((u) => u.text?.toLowerCase().includes(q));
    });
  }, [data, search]);

  const fullText = useMemo(() => {
    if (!data) return "";
    return data.segments
      .map((seg) => {
        if (seg.utterances?.length) {
          return seg.utterances
            .map((u, i) => `[${msToTime(u.startMs)}] ${speakerLabel(u, i)}: ${u.text}`)
            .join("\n");
        }
        return `[${msToTime(seg.windowStartMs)}] ${seg.combinedText}`;
      })
      .join("\n\n");
  }, [data]);

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
    if (!data || !fullText) return;
    const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const safeTitle = (data.meetingTitle || "transcript").replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeTitle}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [data, fullText]);

  if (!recordingId) return null;

  const aiStatus = data?.recording.aiProcessingStatus;
  const showProcessingNotice =
    data && data.segments.length === 0 && aiStatus && aiStatus !== "completed" && aiStatus !== "none";
  const showNoSegmentsNotice = data && data.segments.length === 0 && !showProcessingNotice;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Recording transcript"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-bodybg rounded-xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-defaultborder/60 dark:border-white/5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <i className="ri-file-text-line text-primary text-lg" />
              <h3 className="font-semibold text-base text-gray-800 dark:text-white truncate">
                Transcript
              </h3>
              {data?.source === "meetingId" && (
                <span
                  className="text-[0.65rem] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/30"
                  title="Segments matched by meetingId (legacy fallback). New recordings link by recordingId directly."
                >
                  legacy match
                </span>
              )}
            </div>
            <p className="text-xs text-defaulttextcolor/60 mt-0.5 truncate">
              {data?.meetingTitle || meetingTitle || "—"}
              {data && (
                <span className="ms-2 text-defaulttextcolor/40">
                  · {data.totalSegments} segment{data.totalSegments === 1 ? "" : "s"}
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ti-btn ti-btn-icon ti-btn-sm ti-btn-light"
            aria-label="Close"
          >
            <i className="ri-close-line" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-defaultborder/60 dark:border-white/5">
          <div className="relative flex-1 min-w-[12rem]">
            <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-[0.85rem] text-defaulttextcolor/50 pointer-events-none" />
            <input
              type="text"
              placeholder="Search transcript…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-control !py-1 !pl-8 !pr-3 !text-[0.8rem] w-full"
              disabled={!data || data.segments.length === 0}
            />
          </div>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!fullText}
            className="ti-btn ti-btn-light !py-1 !px-2.5 !text-[0.75rem] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {copied ? (
              <>
                <i className="ri-check-line me-1 text-success" />
                Copied
              </>
            ) : (
              <>
                <i className="ri-file-copy-line me-1" />
                Copy
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!fullText}
            className="ti-btn ti-btn-primary-light !py-1 !px-2.5 !text-[0.75rem] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="ri-download-line me-1" />
            Download .txt
          </button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mb-3" />
              <p className="text-sm text-gray-500">Loading transcript…</p>
            </div>
          )}

          {error && !loading && (
            <div className="p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-xs flex items-start gap-2">
              <i className="ri-error-warning-line text-base mt-0.5" />
              <span className="flex-1">{error}</span>
              <button
                type="button"
                onClick={() => recordingId && fetchTranscript(recordingId, 1, false)}
                className="text-xs font-medium underline"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && showProcessingNotice && (
            <div className="p-4 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-sm flex items-start gap-2">
              <i className="ri-loader-4-line animate-spin text-base mt-0.5" />
              <div>
                <div className="font-medium">Transcript still processing</div>
                <div className="text-xs mt-1 opacity-80">
                  AI pipeline status: <span className="font-mono">{aiStatus}</span>. Reopen this
                  dialog in a minute to refresh.
                </div>
                {data?.recording.aiProcessingError && (
                  <div className="text-xs mt-1 text-rose-600 dark:text-rose-400">
                    {data.recording.aiProcessingError}
                  </div>
                )}
              </div>
            </div>
          )}

          {!loading && !error && showNoSegmentsNotice && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3">
                <i className="ri-file-search-line text-2xl text-defaulttextcolor/40" />
              </div>
              <h4 className="text-sm font-semibold mb-1">No transcript available</h4>
              <p className="text-xs text-defaulttextcolor/60 max-w-sm">
                This recording has no transcript segments. AI processing may not have run, or it
                completed with no captured speech.
              </p>
            </div>
          )}

          {!loading && !error && data && filteredSegments.length === 0 && data.segments.length > 0 && (
            <div className="text-center py-8 text-xs text-defaulttextcolor/60">
              No segments match &quot;{search}&quot;.
            </div>
          )}

          {!loading && !error && filteredSegments.map((seg) => (
            <div
              key={seg.id}
              className="border border-defaultborder/60 dark:border-white/5 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2 mb-2 text-[0.7rem] text-defaulttextcolor/60 font-mono">
                <i className="ri-time-line text-info" />
                <span>{msToTime(seg.windowStartMs)} – {msToTime(seg.windowEndMs)}</span>
                <span className="text-defaulttextcolor/30">·</span>
                <span>#{seg.sequenceNumber}</span>
              </div>
              {seg.utterances && seg.utterances.length > 0 ? (
                <div className="space-y-2">
                  {seg.utterances.map((u, idx) => {
                    const key = u.speaker || u.speakerLabel || u.speakerName || `idx-${idx}`;
                    return (
                      <div key={`${seg.id}-${idx}`} className="flex gap-2">
                        <span
                          className={`inline-flex items-center shrink-0 px-2 py-0.5 rounded border text-[0.65rem] font-medium ${speakerColor(
                            String(key)
                          )}`}
                          title={u.speakerSource ? `source: ${u.speakerSource}` : undefined}
                        >
                          {speakerLabel(u, idx)}
                        </span>
                        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed flex-1">
                          {u.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                  {seg.combinedText}
                </p>
              )}
            </div>
          ))}

          {!loading && !error && data && segmentPage < (data.totalPages ?? 1) && (
            <div className="text-center pt-2 pb-4">
              <button
                type="button"
                className="ti-btn ti-btn-sm ti-btn-outline-secondary !rounded-full"
                onClick={loadMoreSegments}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <i className="ri-loader-4-line animate-spin me-1" />
                    Loading…
                  </>
                ) : (
                  `Load more (${data.segments.length} of ${data.totalSegments})`
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
