"use client";

import { useEffect, useRef, useState } from "react";
import { fetchRecordingObjectUrl } from "@/shared/lib/api/bolna";

/** JWT-protected backend stream paths need a blob fetch; presigned/external URLs play directly. */
function needsBlobFetch(url: string): boolean {
  if (url.startsWith("http://") || url.startsWith("https://")) return false;
  return url.startsWith("/");
}

type InlineRecordingPlayerProps = {
  recordingUrl: string;
  playerKey: string;
  activeKey: string | null;
  onActivate: (key: string) => void;
  /** icon = compact table trigger; button = filled play; outline = detail-panel row style. */
  variant?: "icon" | "button" | "outline";
  buttonLabel?: string;
  audioClassName?: string;
};

export default function InlineRecordingPlayer({
  recordingUrl,
  playerKey,
  activeKey,
  onActivate,
  variant = "icon",
  buttonLabel = "Play Recording",
  audioClassName = "max-w-[200px] h-9",
}: InlineRecordingPlayerProps) {
  const isActive = activeKey === playerKey;
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const playbackUrl = needsBlobFetch(recordingUrl) ? objectUrl : recordingUrl;

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  useEffect(() => {
    if (!isActive && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [isActive]);

  async function handlePlay() {
    onActivate(playerKey);
    if (!needsBlobFetch(recordingUrl) || objectUrl || loading) return;
    setLoading(true);
    setError(null);
    try {
      setObjectUrl(await fetchRecordingObjectUrl(recordingUrl));
    } catch {
      setError("Playback failed");
    } finally {
      setLoading(false);
    }
  }

  if (isActive) {
    if (loading) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-defaulttextcolor/70">
          <i className="ri-loader-4-line animate-spin motion-reduce:animate-none" />
          Loading…
        </span>
      );
    }
    if (error) {
      return <span className="text-xs text-danger">{error}</span>;
    }
    if (playbackUrl) {
      return (
        <audio
          ref={audioRef}
          controls
          autoPlay
          src={playbackUrl}
          className={audioClassName}
          onPlay={() => onActivate(playerKey)}
          onError={() => setError("Playback failed")}
        />
      );
    }
  }

  if (variant === "outline") {
    return (
      <button
        type="button"
        onClick={handlePlay}
        aria-label={buttonLabel}
        className="inline-flex min-h-[34px] items-center gap-1.5 rounded-md border border-defaultborder/60 px-2.5 py-1.5 text-xs font-medium text-defaulttextcolor/80 transition-colors hover:bg-light/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:border-white/10 dark:hover:bg-white/5"
      >
        <i className="ri-play-circle-line text-sm" />
        {buttonLabel}
      </button>
    );
  }

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={handlePlay}
        className="ti-btn ti-btn-success-full !py-1.5 !px-3 !text-[0.8125rem] inline-flex items-center"
        aria-label={buttonLabel}
      >
        <i className="ri-play-line me-1" />
        {buttonLabel}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handlePlay}
      className="ti-btn ti-btn-icon ti-btn-sm ti-btn-success"
      title="Play recording"
      aria-label="Play recording"
    >
      <i className="ri-play-line" />
    </button>
  );
}
