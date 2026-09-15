"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  getRecordingTranscript,
  type RecordingTranscriptResponse,
} from "@/shared/lib/api/meetings";
import TranscriptView from "@/shared/components/meeting/TranscriptView";

interface TranscriptModalProps {
  recordingId: string | null;
  meetingTitle?: string | null;
  onClose: () => void;
}

export default function TranscriptModal({
  recordingId,
  meetingTitle,
  onClose,
}: TranscriptModalProps) {
  const [data, setData] = useState<RecordingTranscriptResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTranscript = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRecordingTranscript(id);
      setData(res);
    } catch (e) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setError(msg || (e instanceof Error ? e.message : "Failed to load transcript"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!recordingId) return;
    setData(null);
    fetchTranscript(recordingId);
  }, [recordingId, fetchTranscript]);

  useEffect(() => {
    if (!recordingId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [recordingId, onClose]);

  if (!recordingId) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Recording transcript"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-bodybg rounded-xl shadow-2xl flex flex-col overflow-hidden px-5 py-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-defaultborder/60">
          <h3 className="font-semibold text-base truncate">{data?.meetingTitle || meetingTitle || "Transcript"}</h3>
          <button type="button" onClick={onClose} className="ti-btn ti-btn-icon ti-btn-sm ti-btn-light" aria-label="Close">
            <i className="ri-close-line" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden pt-3">
          <TranscriptView
            mode={data ? { kind: "recording", data } : null}
            loading={loading}
            error={error}
            onRetry={() => fetchTranscript(recordingId)}
            legacySource={data?.source}
            meetingTitle={data?.meetingTitle || meetingTitle || undefined}
          />
        </div>
      </div>
    </div>
  );
}
