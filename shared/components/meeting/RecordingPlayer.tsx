"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { MeetingRecording } from "@/shared/lib/api/meetings";
import { getMeetingRecordings } from "@/shared/lib/api/meetings";

export interface RecordingPlayerProps {
  meetingId: string;
  /** Initial recording row (may lack a fresh playback URL). */
  initialRecording?: MeetingRecording | null;
  seekToMs?: number | null;
  className?: string;
}

export default function RecordingPlayer({
  meetingId,
  initialRecording,
  seekToMs,
  className = "",
}: RecordingPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [recording, setRecording] = useState<MeetingRecording | null>(initialRecording ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshPlayback = useCallback(async () => {
    if (!meetingId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await getMeetingRecordings(meetingId);
      const pick =
        (initialRecording?.id && list.find((r) => r.id === initialRecording.id)) || list[0] || null;
      setRecording(pick);
      if (!pick?.playbackUrl) {
        setError(pick?.playbackError || "Playback unavailable");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load recording");
    } finally {
      setLoading(false);
    }
  }, [meetingId, initialRecording?.id]);

  useEffect(() => {
    void refreshPlayback();
  }, [refreshPlayback]);

  useEffect(() => {
    if (seekToMs == null || !Number.isFinite(seekToMs)) return;
    const v = videoRef.current;
    if (!v) return;
    const sec = seekToMs / 1000;
    const apply = () => {
      try {
        v.currentTime = sec;
      } catch {
        /* not ready */
      }
    };
    if (v.readyState >= 1) apply();
    else v.addEventListener("loadedmetadata", apply, { once: true });
  }, [seekToMs, recording?.playbackUrl]);

  const onVideoError = useCallback(() => {
    void refreshPlayback();
  }, [refreshPlayback]);

  return (
    <div className={`space-y-2 ${className}`}>
      {loading && (
        <p className="text-sm text-defaulttextcolor/60" role="status">
          Refreshing playback URL…
        </p>
      )}
      {error && !recording?.playbackUrl && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger flex flex-wrap gap-2 items-center">
          <span>{error}</span>
          <button type="button" className="ti-btn ti-btn-sm ti-btn-light min-h-[2.5rem]" onClick={() => void refreshPlayback()}>
            Retry
          </button>
        </div>
      )}
      {recording?.playbackUrl ? (
        <video
          ref={videoRef}
          key={recording.playbackUrl}
          controls
          className="w-full max-h-[420px] rounded-lg bg-black aspect-video"
          src={recording.playbackUrl}
          onError={onVideoError}
          aria-label="Interview recording playback"
        >
          <track kind="captions" />
        </video>
      ) : !loading && !error ? (
        <p className="text-sm text-defaulttextcolor/60 py-6 text-center">No completed recording yet.</p>
      ) : null}
    </div>
  );
}
