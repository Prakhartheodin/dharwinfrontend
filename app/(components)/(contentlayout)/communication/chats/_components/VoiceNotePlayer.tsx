"use client";

import React, { useEffect, useRef, useState } from "react";
import chatStyles from "../chats.module.scss";
import { formatVoiceElapsed } from "../_lib/voiceNotePreview";

/**
 * Compact voice-note player: play/pause, seek bar, time. Replaces native `<audio controls>`,
 * whose hover-expanding volume slider shoved the bubble's layout around.
 */
export function VoiceNotePlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    // MediaRecorder webm has no duration header (reports Infinity) until the file is scanned once.
    const onMeta = () => {
      if (Number.isFinite(a.duration)) {
        setDuration(a.duration);
        return;
      }
      const onScanned = () => {
        a.removeEventListener("timeupdate", onScanned);
        if (Number.isFinite(a.duration)) setDuration(a.duration);
        a.currentTime = 0;
      };
      a.addEventListener("timeupdate", onScanned);
      a.currentTime = 1e101;
    };
    const onTime = () => setCurrent(a.currentTime);
    const onDuration = () => {
      if (Number.isFinite(a.duration)) setDuration(a.duration);
    };
    const onPlay = () => {
      // One note at a time, like WhatsApp.
      document.querySelectorAll("audio[data-voice-note]").forEach((el) => {
        if (el !== a) (el as HTMLAudioElement).pause();
      });
      setPlaying(true);
    };
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setCurrent(0);
    };
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("durationchange", onDuration);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    return () => {
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("durationchange", onDuration);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
    };
  }, [src]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) void a.play().catch(() => setPlaying(false));
    else a.pause();
  };

  const pct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;

  return (
    <div className={chatStyles.voiceNote} onClick={(e) => e.stopPropagation()}>
      <audio ref={audioRef} src={src} preload="metadata" data-voice-note />
      <button
        type="button"
        className={chatStyles.voiceNotePlay}
        onClick={toggle}
        aria-label={playing ? "Pause voice note" : "Play voice note"}
      >
        <i className={playing ? "ri-pause-fill" : "ri-play-fill"} aria-hidden />
      </button>
      <div className={chatStyles.voiceNoteTrack}>
        <input
          type="range"
          className={chatStyles.voiceNoteSeek}
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(current, duration || 0)}
          disabled={!duration}
          aria-label="Seek voice note"
          aria-valuetext={`${formatVoiceElapsed(current * 1000)} of ${formatVoiceElapsed(duration * 1000)}`}
          style={{ "--voice-progress": `${pct}%` } as React.CSSProperties}
          onChange={(e) => {
            const a = audioRef.current;
            if (!a) return;
            a.currentTime = Number(e.target.value);
            setCurrent(a.currentTime);
          }}
        />
        <span className={chatStyles.voiceNoteTime}>
          {formatVoiceElapsed((playing || current > 0 ? current : duration) * 1000)}
        </span>
      </div>
    </div>
  );
}
