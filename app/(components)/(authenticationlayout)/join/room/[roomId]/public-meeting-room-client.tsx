"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  useRoomContext,
  useParticipants,
} from "@livekit/components-react";
import { StableVideoConference } from "@/shared/components/livekit/stable-video-conference";
import { createPortal } from "react-dom";
import "@livekit/components-styles";
import { useState, useEffect, useMemo, useRef, useCallback, Component, type ReactNode, type ErrorInfo } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { ConnectionState, DisconnectReason, RoomEvent } from "livekit-client";
import Swal from "sweetalert2";
import * as livekitApi from "@/shared/lib/api/livekit";
import { endMeetingPublic } from "@/shared/lib/api/meetings";
import { useAuth } from "@/shared/contexts/auth-context";
import { WaitingParticipantsPanel } from "@/shared/components/livekit/waiting-participants-panel";
import { RecordingButton } from "@/shared/components/livekit/recording-button";
import { MEETING_CONTROL_BAR_RESPONSIVE_CSS } from "@/shared/components/livekit/meeting-control-bar-responsive.css";
import { useLiveKitBenignErrorSuppression } from "@/shared/lib/livekit-benign-logs";

const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 3000;  // Longer initial delay to let network stabilize
const MAX_RECONNECT_DELAY = 20000;

const LOBBY_AUDIO_BAR_COUNT = 5;

/** Live camera preview + mic level meters for the public join waiting room */
function LobbyDevicePreview({
  enabled,
  showVideo,
  showAudio,
}: {
  enabled: boolean;
  showVideo: boolean;
  showAudio: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const freqDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  const stopAll = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    analyserRef.current = null;
    freqDataRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const v = videoRef.current;
    if (v) {
      v.srcObject = null;
    }
    for (let i = 0; i < LOBBY_AUDIO_BAR_COUNT; i++) {
      const el = barRefs.current[i];
      if (el) el.style.transform = "scaleY(0.12)";
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopAll();
      return;
    }
    if (!showVideo && !showAudio) {
      stopAll();
      return;
    }

    let cancelled = false;

    const runBars = () => {
      const analyser = analyserRef.current;
      const data = freqDataRef.current;
      if (!analyser || !data) return;
      analyser.getByteFrequencyData(data);
      const step = Math.max(1, Math.floor(data.length / LOBBY_AUDIO_BAR_COUNT));
      for (let i = 0; i < LOBBY_AUDIO_BAR_COUNT; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) sum += data[i * step + j] ?? 0;
        const avg = sum / step / 255;
        const scale = 0.12 + avg * 0.88;
        const el = barRefs.current[i];
        if (el) el.style.transform = `scaleY(${Math.min(1, scale)})`;
      }
      rafRef.current = requestAnimationFrame(runBars);
    };

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: showVideo ? { facingMode: "user" } : false,
          audio: showAudio || false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        stopAll();
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const v = videoRef.current;
        if (showVideo && v) {
          v.srcObject = stream;
          v.muted = true;
          await v.play().catch(() => {});
        } else if (v) {
          v.srcObject = null;
        }

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          stopAll();
          return;
        }

        if (showAudio && stream.getAudioTracks().length > 0) {
          const ctx = new AudioContext();
          await ctx.resume().catch(() => {});
          audioCtxRef.current = ctx;
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.65;
          const src = ctx.createMediaStreamSource(stream);
          src.connect(analyser);
          sourceRef.current = src;
          analyserRef.current = analyser;
          freqDataRef.current = new Uint8Array(analyser.frequencyBinCount);
          rafRef.current = requestAnimationFrame(runBars);
        }
      } catch {
        stopAll();
      }
    })();

    return () => {
      cancelled = true;
      stopAll();
    };
  }, [enabled, showVideo, showAudio, stopAll]);

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Preview</p>
      <div
        className="relative w-full overflow-hidden rounded-xl border border-gray-600 bg-black aspect-video"
        aria-label="Camera preview"
      >
        <video
          ref={videoRef}
          className={`h-full w-full object-cover ${showVideo ? "block" : "hidden"} [transform:scaleX(-1)]`}
          playsInline
          muted
          autoPlay
        />
        {!showVideo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500">
            <i className="ri-camera-off-line text-4xl" aria-hidden />
            <span className="text-sm">Camera off</span>
          </div>
        )}
        {showVideo && enabled && (
          <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/55 px-2 py-0.5 text-[0.65rem] text-gray-300">
            Mirror preview
          </div>
        )}
      </div>
      <div>
        <p className="mb-2 text-xs text-gray-500">Microphone level</p>
        <div
          className="flex h-10 items-end justify-center gap-1.5 rounded-lg border border-gray-600 bg-gray-900/80 px-3 py-2"
          aria-label="Microphone level preview"
        >
          {Array.from({ length: LOBBY_AUDIO_BAR_COUNT }, (_, i) => (
            <div
              key={i}
              ref={(el) => {
                barRefs.current[i] = el;
              }}
              className="w-2 origin-bottom rounded-full bg-primary/90 transition-[transform] duration-75"
              style={{ height: "100%", transform: "scaleY(0.12)" }}
            />
          ))}
        </div>
        {!showAudio && (
          <p className="mt-1.5 text-xs text-gray-600">Turn the microphone on to see level activity.</p>
        )}
      </div>
    </div>
  );
}

const MS_15_WARN = 15 * 60 * 1000;
const MS_5_FINAL = 5 * 60 * 1000;

/**
 * Calendar end (scheduledAt + duration): host warnings + host-only last-5m timer; all participants leave at endAt.
 * Server also deletes the LiveKit room when the meeting is marked ended (host action or scheduler).
 */
function MeetingScheduleCountdown({
  meetingEndAtIso,
  isHost,
  participantEmail,
  roomName,
  onHardEnd,
}: {
  meetingEndAtIso: string | null;
  isHost: boolean;
  participantEmail?: string;
  roomName: string;
  onHardEnd: () => void;
}) {
  const room = useRoomContext();
  const prevRemainingRef = useRef<number | null>(null);
  const warned15Ref = useRef(false);
  const warned5ModalRef = useRef(false);
  const hardEndStartedRef = useRef(false);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    if (!meetingEndAtIso) return;
    const endMs = new Date(meetingEndAtIso).getTime();
    if (Number.isNaN(endMs)) return;

    const tick = () => {
      if (hardEndStartedRef.current) return;
      const r = endMs - Date.now();
      setRemainingMs(r);

      if (r <= 0) {
        hardEndStartedRef.current = true;
        void (async () => {
          try {
            if (isHost && participantEmail) {
              await endMeetingPublic(roomName, participantEmail);
            }
          } catch {
            /* still disconnect locally */
          }
          try {
            await room.disconnect();
          } catch {
            /* ignore */
          }
          onHardEnd();
        })();
        return;
      }

      const prev = prevRemainingRef.current;
      prevRemainingRef.current = r;
      if (!isHost || prev === null) return;

      if (prev > MS_15_WARN && r <= MS_15_WARN && r > MS_5_FINAL && !warned15Ref.current) {
        warned15Ref.current = true;
        void Swal.fire({
          toast: true,
          position: "top-end",
          icon: "info",
          title: "About 15 minutes left",
          text: "This interview will end at the scheduled time.",
          showConfirmButton: false,
          timer: 6500,
          timerProgressBar: true,
          background: "#1f2937",
          color: "#f9fafb",
        });
      }
      if (prev > MS_5_FINAL && r <= MS_5_FINAL && r > 0 && !warned5ModalRef.current) {
        warned5ModalRef.current = true;
        void Swal.fire({
          icon: "warning",
          title: "Meeting is about to end",
          html: "<p>Less than <strong>5 minutes</strong> remain before this room closes.</p>",
          confirmButtonText: "OK",
          allowOutsideClick: true,
          background: "#111827",
          color: "#f9fafb",
          confirmButtonColor: "#6d28d9",
        });
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [meetingEndAtIso, isHost, participantEmail, roomName, room, onHardEnd]);

  if (!meetingEndAtIso) return null;
  if (!isHost || remainingMs === null || remainingMs > MS_5_FINAL || remainingMs <= 0) return null;

  const totalSec = Math.max(0, Math.floor(remainingMs / 1000));
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  const label = `${mm}:${String(ss).padStart(2, "0")}`;

  return createPortal(
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[3000] flex flex-col items-end gap-1"
      role="status"
      aria-live="polite"
      aria-label={`Meeting ends in ${mm} minutes ${ss} seconds`}
    >
      <div className="rounded-lg border border-amber-500/40 bg-black/80 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-amber-200 shadow-lg backdrop-blur-sm">
        Ending soon
      </div>
      <div className="rounded-xl border border-primary/50 bg-gray-950/95 px-4 py-3 font-mono text-2xl font-bold tabular-nums text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-md">
        {label}
      </div>
    </div>,
    document.body
  );
}

/**
 * Obsidian Studio aesthetic — shared styles for lobby, waiting overlay, and meeting room.
 * Loads Fraunces (display), Manrope (body), JetBrains Mono (HUD) once, then defines
 * a token system used across all surfaces in this file. Idempotent — multiple mounts
 * collapse on the same `data-obs-styles` marker.
 */
function ObsidianStudioStyles() {
  return (
    <>
      <link
        rel="preconnect"
        href="https://fonts.googleapis.com"
      />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Manrope:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
      />
      <style data-obs-styles dangerouslySetInnerHTML={{ __html: `
        :root {
          --obs-bg: #0B0D0E;
          --obs-bg-2: #15181b;
          --obs-bg-3: #1c2024;
          --obs-fg: #f4f5f6;
          --obs-fg-dim: #a8acb1;
          --obs-fg-faint: #6b7075;
          --obs-line: rgba(255,255,255,0.08);
          --obs-line-2: rgba(255,255,255,0.14);
          --obs-accent: #00E6C3;
          --obs-accent-dim: #0a8c77;
          --obs-warm: #FF8A65;
          --obs-danger: #ff5252;
          --obs-font-display: 'Fraunces', 'Times New Roman', serif;
          --obs-font-body: 'Manrope', system-ui, sans-serif;
          --obs-font-mono: 'JetBrains Mono', ui-monospace, monospace;
        }

        .obs-display {
          font-family: var(--obs-font-display);
          font-weight: 500;
          font-variation-settings: "opsz" 96, "SOFT" 50;
          letter-spacing: -0.02em;
          line-height: 1.02;
          color: var(--obs-fg);
        }
        .obs-display-italic {
          font-style: italic;
          font-variation-settings: "opsz" 144, "SOFT" 100;
          color: var(--obs-accent);
        }
        .obs-mono {
          font-family: var(--obs-font-mono);
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--obs-fg-dim);
        }
        .obs-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--obs-accent);
          font-weight: 500;
        }
        .obs-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--obs-warm);
          box-shadow: 0 0 0 3px rgba(255,138,101,0.18);
          animation: obsPulse 1.6s ease-in-out infinite;
        }
        @keyframes obsPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(0.85); }
        }

        /* ---------- LOBBY (split view) ---------- */
        .obs-lobby {
          position: fixed;
          inset: 0;
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(380px, 1fr);
          background: radial-gradient(ellipse at 30% 20%, #1a1d20 0%, var(--obs-bg) 60%, #06070a 100%);
          font-family: var(--obs-font-body);
          color: var(--obs-fg);
          overflow: hidden;
        }
        .obs-lobby__grain {
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/></svg>");
          opacity: 0.04;
          mix-blend-mode: overlay;
          pointer-events: none;
          z-index: 1;
        }
        .obs-lobby__vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 50%, transparent 40%, rgba(0,0,0,0.45) 100%);
          pointer-events: none;
          z-index: 1;
        }
        .obs-lobby__hero {
          position: relative;
          padding: clamp(1rem, 2.4vw, 2.5rem);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }
        .obs-lobby__hero-frame {
          position: relative;
          width: 100%;
          max-width: 880px;
          aspect-ratio: 16 / 10;
          background: #08090a;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid var(--obs-line);
          box-shadow:
            0 30px 80px -20px rgba(0,0,0,0.7),
            0 0 0 1px rgba(255,255,255,0.02),
            inset 0 1px 0 rgba(255,255,255,0.05);
        }
        /* Override LobbyDevicePreview's space-y stack: stretch video, float mic bars, hide redundant label */
        .obs-lobby__hero-frame > div:first-of-type {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          display: block !important;
        }
        .obs-lobby__hero-frame > div:first-of-type > p:first-of-type { display: none !important; }
        .obs-lobby__hero-frame > div:first-of-type > div:nth-of-type(1) {
          position: absolute !important;
          inset: 0 !important;
          border-radius: 0 !important;
          border: none !important;
        }
        .obs-lobby__hero-frame video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover;
        }
        .obs-lobby__hero-frame > div:first-of-type > div:nth-of-type(1) > div.absolute > i {
          font-size: 4rem !important;
          color: rgba(255,255,255,0.18) !important;
        }
        .obs-lobby__hero-frame > div:first-of-type > div:nth-of-type(1) > div.absolute > span {
          color: rgba(255,255,255,0.32) !important;
          font-family: var(--obs-font-display);
          font-style: italic;
          font-size: 18px !important;
        }
        /* "Mirror preview" label tweak */
        .obs-lobby__hero-frame > div:first-of-type > div:nth-of-type(1) > div.pointer-events-none {
          background: rgba(11,13,14,0.6) !important;
          backdrop-filter: blur(8px);
          font-family: var(--obs-font-mono) !important;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-size: 9px !important;
          padding: 4px 8px !important;
          border-radius: 4px !important;
          color: rgba(255,255,255,0.7) !important;
        }
        /* Mic level container — float to top-left */
        .obs-lobby__hero-frame > div:first-of-type > div:nth-of-type(2) {
          position: absolute !important;
          top: 1rem !important;
          left: 1rem !important;
          padding: 0.5rem 0.75rem !important;
          background: rgba(11,13,14,0.65) !important;
          backdrop-filter: blur(12px);
          border: 1px solid var(--obs-line-2) !important;
          border-radius: 999px !important;
          z-index: 3;
          margin: 0 !important;
        }
        .obs-lobby__hero-frame > div:first-of-type > div:nth-of-type(2) > p { display: none !important; }
        .obs-lobby__hero-frame > div:first-of-type > div:nth-of-type(2) > div {
          height: 18px !important;
          padding: 0 !important;
          background: transparent !important;
          border: none !important;
          gap: 3px !important;
        }
        .obs-lobby__hero-frame > div:first-of-type > div:nth-of-type(2) > div > div {
          background: var(--obs-accent) !important;
          width: 3px !important;
        }
        .obs-lobby__hero-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(11,13,14,0) 50%, rgba(11,13,14,0.85) 100%);
          pointer-events: none;
        }
        .obs-lobby__hero-meta {
          position: absolute;
          left: 1.5rem;
          right: 1.5rem;
          bottom: 1.5rem;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1rem;
          z-index: 2;
        }
        .obs-lobby__hero-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          background: rgba(11,13,14,0.7);
          backdrop-filter: blur(12px);
          border: 1px solid var(--obs-line-2);
          border-radius: 999px;
          font-family: var(--obs-font-mono);
          font-size: 10px;
          letter-spacing: 0.18em;
          color: var(--obs-fg);
        }
        .obs-lobby__hero-name {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
          text-align: right;
          max-width: 60%;
        }
        .obs-lobby__hero-name .obs-display {
          font-size: clamp(1.5rem, 2.4vw, 2.4rem);
        }
        .obs-lobby__hero-email {
          font-size: 10px;
          color: var(--obs-fg-faint);
        }
        .obs-lobby__hero-corner {
          position: absolute;
          width: 28px;
          height: 28px;
          border-color: var(--obs-accent);
          border-style: solid;
          border-width: 0;
          opacity: 0.6;
        }
        .obs-lobby__hero-corner--tl { top: 12px; left: 12px; border-top-width: 1px; border-left-width: 1px; }
        .obs-lobby__hero-corner--tr { top: 12px; right: 12px; border-top-width: 1px; border-right-width: 1px; }
        .obs-lobby__hero-corner--bl { bottom: 12px; left: 12px; border-bottom-width: 1px; border-left-width: 1px; }
        .obs-lobby__hero-corner--br { bottom: 12px; right: 12px; border-bottom-width: 1px; border-right-width: 1px; }

        .obs-lobby__panel {
          position: relative;
          z-index: 2;
          background: rgba(11,13,14,0.72);
          backdrop-filter: blur(28px) saturate(140%);
          -webkit-backdrop-filter: blur(28px) saturate(140%);
          border-left: 1px solid var(--obs-line);
          overflow-y: auto;
          padding: clamp(1.5rem, 3vw, 3rem) clamp(1.25rem, 2.5vw, 2.5rem);
          display: flex;
          align-items: center;
        }
        .obs-lobby__panel-inner {
          width: 100%;
          max-width: 460px;
          margin: 0 auto;
        }
        .obs-lobby__head { margin-bottom: 1.75rem; }
        .obs-lobby__title {
          font-size: clamp(2rem, 3.5vw, 2.8rem);
          margin: 0.6rem 0 0.85rem;
        }
        .obs-lobby__subtitle {
          font-size: 14px;
          line-height: 1.55;
          color: var(--obs-fg-dim);
          max-width: 38ch;
        }

        .obs-form { display: flex; flex-direction: column; gap: 1.1rem; }
        .obs-field { display: flex; flex-direction: column; gap: 0.4rem; }
        .obs-field__label {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          font-size: 12px;
          font-weight: 500;
          color: var(--obs-fg-dim);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .obs-field__hint { font-size: 9px; color: var(--obs-fg-faint); }
        .obs-field__note {
          font-size: 11px;
          color: var(--obs-fg-faint);
          line-height: 1.5;
          margin-top: 4px;
        }
        .obs-input {
          width: 100%;
          padding: 0.85rem 1rem;
          font-family: var(--obs-font-body);
          font-size: 14px;
          color: var(--obs-fg);
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--obs-line);
          border-radius: 10px;
          outline: none;
          transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
        }
        .obs-input::placeholder { color: var(--obs-fg-faint); }
        .obs-input:focus {
          border-color: var(--obs-accent);
          background: rgba(0,230,195,0.04);
          box-shadow: 0 0 0 3px rgba(0,230,195,0.12);
        }
        .obs-input--readonly {
          background: rgba(255,255,255,0.015);
          color: var(--obs-fg-dim);
          cursor: not-allowed;
        }
        .obs-input--readonly:focus {
          border-color: var(--obs-line);
          box-shadow: none;
          background: rgba(255,255,255,0.015);
        }

        .obs-toggles {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.6rem;
        }
        .obs-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.85rem 1rem;
          background: rgba(255,255,255,0.025);
          border: 1px solid var(--obs-line);
          border-radius: 12px;
          cursor: pointer;
          transition: border-color 160ms ease, background 160ms ease;
          font-family: var(--obs-font-body);
        }
        .obs-toggle:hover { border-color: var(--obs-line-2); background: rgba(255,255,255,0.04); }
        .obs-toggle--active {
          border-color: rgba(0,230,195,0.4);
          background: rgba(0,230,195,0.06);
        }
        .obs-toggle__icon {
          font-size: 18px;
          color: var(--obs-fg-dim);
          transition: color 160ms ease;
        }
        .obs-toggle--active .obs-toggle__icon { color: var(--obs-accent); }
        .obs-toggle__label {
          flex: 1;
          margin-left: 12px;
          font-size: 13px;
          font-weight: 500;
          color: var(--obs-fg);
          letter-spacing: -0.005em;
        }
        .obs-toggle__pill {
          width: 36px;
          height: 20px;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          position: relative;
          transition: background 160ms ease;
        }
        .obs-toggle__pill::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--obs-fg);
          transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .obs-toggle--active .obs-toggle__pill { background: var(--obs-accent); }
        .obs-toggle--active .obs-toggle__pill::after { transform: translateX(16px); background: #07120f; }

        .obs-status {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--obs-fg-dim);
          margin: 0;
        }
        .obs-spinner {
          width: 12px;
          height: 12px;
          border: 1.5px solid rgba(0,230,195,0.25);
          border-top-color: var(--obs-accent);
          border-radius: 50%;
          animation: obsSpin 700ms linear infinite;
        }
        @keyframes obsSpin { to { transform: rotate(360deg); } }

        .obs-alert {
          padding: 0.85rem 1rem;
          background: linear-gradient(180deg, rgba(255,82,82,0.08), rgba(255,82,82,0.02));
          border: 1px solid rgba(255,82,82,0.25);
          border-radius: 10px;
        }
        .obs-alert__title { font-size: 13px; color: #ffb4b4; margin: 0; font-weight: 500; }
        .obs-alert__body { font-size: 12px; color: rgba(255,180,180,0.75); margin: 6px 0 0; line-height: 1.5; }
        .obs-alert__body--ok { color: rgba(0,230,195,0.85); }

        .obs-actions {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 0.6rem;
          padding-top: 0.5rem;
        }
        .obs-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0.85rem 1.25rem;
          font-family: var(--obs-font-body);
          font-size: 13px;
          font-weight: 600;
          letter-spacing: -0.005em;
          border-radius: 10px;
          border: 1px solid transparent;
          cursor: pointer;
          text-decoration: none;
          transition: transform 120ms ease, background 160ms ease, border-color 160ms ease, opacity 160ms ease;
        }
        .obs-btn:active:not(:disabled) { transform: translateY(1px); }
        .obs-btn--ghost {
          background: rgba(255,255,255,0.03);
          border-color: var(--obs-line-2);
          color: var(--obs-fg-dim);
        }
        .obs-btn--ghost:hover {
          background: rgba(255,255,255,0.06);
          color: var(--obs-fg);
        }
        .obs-btn--primary {
          background: linear-gradient(180deg, #00f0cc 0%, #00c2a4 100%);
          border-color: rgba(0,230,195,0.5);
          color: #06120f;
          box-shadow: 0 8px 24px -8px rgba(0,230,195,0.4), inset 0 1px 0 rgba(255,255,255,0.3);
        }
        .obs-btn--primary:hover:not(:disabled) {
          background: linear-gradient(180deg, #1cffd9 0%, #00d6b6 100%);
        }
        .obs-btn--primary:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          background: linear-gradient(180deg, #2a3a36, #1d2826);
          color: var(--obs-fg-faint);
          box-shadow: none;
        }

        @media (max-width: 900px) {
          .obs-lobby { grid-template-columns: 1fr; grid-template-rows: minmax(220px, 38vh) 1fr; }
          .obs-lobby__panel { border-left: none; border-top: 1px solid var(--obs-line); }
          .obs-lobby__hero { padding: 0.75rem; }
          .obs-lobby__hero-frame { aspect-ratio: 16 / 9; }
          .obs-lobby__hero-name .obs-display { font-size: 1.1rem; }
        }

        /* ---------- WAITING (admission) ---------- */
        .obs-wait {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          font-family: var(--obs-font-body);
          color: var(--obs-fg);
        }
        .obs-wait__bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 50% 30%, rgba(0,230,195,0.06) 0%, transparent 55%),
            radial-gradient(ellipse at 80% 80%, rgba(255,138,101,0.04) 0%, transparent 50%),
            linear-gradient(180deg, rgba(11,13,14,0.96), rgba(6,7,10,0.98));
          backdrop-filter: blur(8px);
        }
        .obs-wait__grain {
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>");
          opacity: 0.05;
          mix-blend-mode: overlay;
          pointer-events: none;
        }
        .obs-wait__card {
          position: relative;
          width: min(440px, calc(100vw - 2rem));
          padding: 2.5rem 2rem;
          background: rgba(20,23,26,0.78);
          backdrop-filter: blur(28px) saturate(140%);
          border: 1px solid var(--obs-line-2);
          border-radius: 18px;
          box-shadow: 0 30px 80px -20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06);
          text-align: center;
        }
        .obs-wait__pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: rgba(0,230,195,0.08);
          border: 1px solid rgba(0,230,195,0.25);
          border-radius: 999px;
          font-size: 10px;
          color: var(--obs-accent);
          letter-spacing: 0.16em;
        }
        .obs-wait__pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--obs-accent);
          box-shadow: 0 0 8px var(--obs-accent);
          animation: obsPulse 1.4s ease-in-out infinite;
        }
        .obs-wait__title {
          font-size: clamp(1.8rem, 3vw, 2.4rem);
          margin: 1.25rem 0 0.6rem;
        }
        .obs-wait__sub {
          font-size: 14px;
          color: var(--obs-fg-dim);
          line-height: 1.55;
          max-width: 32ch;
          margin: 0 auto;
        }
        .obs-wait__bars {
          display: flex;
          justify-content: center;
          gap: 6px;
          margin: 2rem auto 1.5rem;
          height: 28px;
          align-items: end;
        }
        .obs-wait__bars span {
          display: block;
          width: 4px;
          background: linear-gradient(180deg, var(--obs-accent), rgba(0,230,195,0.3));
          border-radius: 2px;
          animation: obsBar 1.1s ease-in-out infinite;
        }
        @keyframes obsBar {
          0%, 100% { height: 8px; opacity: 0.4; }
          50% { height: 28px; opacity: 1; }
        }
        .obs-wait__identity {
          margin-top: 1rem;
          padding: 0.85rem 1rem;
          background: rgba(255,255,255,0.025);
          border: 1px solid var(--obs-line);
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .obs-wait__identity-label {
          font-size: 9px;
          color: var(--obs-fg-faint);
          letter-spacing: 0.2em;
        }
        .obs-wait__identity-name {
          font-family: var(--obs-font-display);
          font-size: 18px;
          font-weight: 500;
          letter-spacing: -0.01em;
        }
        .obs-wait__identity-email {
          font-size: 10px;
          color: var(--obs-fg-faint);
        }
        .obs-wait__cancel { width: 100%; margin-top: 1.5rem; }

        /* ---------- LOADING ---------- */
        .obs-loading {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(ellipse at center, var(--obs-bg-2) 0%, var(--obs-bg) 60%, #06070a 100%);
          font-family: var(--obs-font-body);
          color: var(--obs-fg);
        }
        .obs-loading__inner { text-align: center; }
        .obs-loading__pulse {
          width: 64px;
          height: 64px;
          margin: 0 auto 1.5rem;
          position: relative;
        }
        .obs-loading__pulse::before,
        .obs-loading__pulse::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1.5px solid var(--obs-accent);
          animation: obsRing 1.6s ease-out infinite;
        }
        .obs-loading__pulse::after { animation-delay: 0.8s; }
        @keyframes obsRing {
          0% { transform: scale(0.4); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
        .obs-loading__pulse > span {
          position: absolute;
          inset: 24px;
          border-radius: 50%;
          background: var(--obs-accent);
          box-shadow: 0 0 24px var(--obs-accent);
        }
        .obs-loading__label {
          font-family: var(--obs-font-display);
          font-style: italic;
          font-size: 22px;
          font-weight: 400;
          color: var(--obs-fg);
          margin: 0 0 0.4rem;
          letter-spacing: -0.01em;
        }
        .obs-loading__hint {
          font-family: var(--obs-font-mono);
          font-size: 10px;
          color: var(--obs-fg-faint);
          letter-spacing: 0.2em;
        }

        /* ---------- ERROR ---------- */
        .obs-error {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          background: radial-gradient(ellipse at top, #1d1518 0%, var(--obs-bg) 60%, #06070a 100%);
          font-family: var(--obs-font-body);
          color: var(--obs-fg);
        }
        .obs-error__grain {
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>");
          opacity: 0.04;
          pointer-events: none;
        }
        .obs-error__card {
          position: relative;
          max-width: 460px;
          width: 100%;
          padding: 2rem;
          background: rgba(20,23,26,0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,82,82,0.2);
          border-radius: 16px;
          box-shadow: 0 24px 60px -16px rgba(0,0,0,0.6);
        }
        .obs-error__eyebrow { color: var(--obs-danger); }
        .obs-error__title {
          font-size: 1.8rem;
          margin: 0.5rem 0 0.85rem;
        }
        .obs-error__msg {
          font-size: 14px;
          color: var(--obs-fg-dim);
          line-height: 1.55;
          margin: 0 0 1.25rem;
          padding: 0.75rem 1rem;
          background: rgba(255,82,82,0.06);
          border: 1px solid rgba(255,82,82,0.18);
          border-radius: 8px;
          font-family: var(--obs-font-mono);
          font-size: 12px;
        }
      `}} />
    </>
  );
}

function DeviceToggle({
  label,
  iconOn,
  iconOff,
  active,
  disabled,
  onToggle,
}: {
  label: string;
  iconOn: string;
  iconOff: string;
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={`${label} ${active ? "on" : "off"}`}
      disabled={disabled}
      onClick={onToggle}
      className={`obs-toggle ${active ? "obs-toggle--active" : ""}`}
    >
      <i className={`obs-toggle__icon ${active ? iconOn : iconOff}`} aria-hidden />
      <span className="obs-toggle__label">{label}</span>
      <span className="obs-toggle__pill" aria-hidden />
    </button>
  );
}

function ObsLoadingScreen({ label }: { label: string }) {
  return (
    <div className="obs-loading">
      <ObsidianStudioStyles />
      <div className="obs-loading__inner">
        <div className="obs-loading__pulse">
          <span />
        </div>
        <p className="obs-loading__label">{label}</p>
        <p className="obs-loading__hint">— PLEASE WAIT</p>
      </div>
    </div>
  );
}

/**
 * Catches LiveKit `useVisualStableUpdate` race in @livekit/components-core
 * (`tile-array-update.ts:findIndex` throws when placeholder tracks transition
 * to real tracks across pages). Bumps `key` to remount VideoConference,
 * which recomputes the tile array from current room state.
 */
class VideoConferenceBoundary extends Component<
  { children: (key: number) => ReactNode },
  { remountKey: number; recovering: boolean }
> {
  state = { remountKey: 0, recovering: false };

  static getDerivedStateFromError(): { recovering: boolean } {
    return { recovering: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    if (typeof console !== "undefined") {
      console.warn("[VideoConferenceBoundary] caught:", error.message);
    }
    queueMicrotask(() => {
      this.setState((s) => ({ remountKey: s.remountKey + 1, recovering: false }));
    });
  }

  render() {
    if (this.state.recovering) return null;
    return this.props.children(this.state.remountKey);
  }
}

function PublicRoomContent({
  onLeave,
  onMeetingEnded,
  onReconnect,
  initialAudioEnabled,
  initialVideoEnabled,
  hasPermissionError,
  roomName,
  isHost,
  participantEmail,
  waitingParticipantIdentities,
  meetingEndAtIso,
}: {
  onLeave: () => void;
  onMeetingEnded: () => void;
  onReconnect: () => void | Promise<void>;
  initialAudioEnabled: boolean;
  initialVideoEnabled: boolean;
  hasPermissionError: boolean;
  roomName: string;
  isHost: boolean;
  participantEmail?: string;
  waitingParticipantIdentities?: string[];
  meetingEndAtIso: string | null;
}) {
  const room = useRoomContext();
  const [waitingIds, setWaitingIds] = useState<string[]>(waitingParticipantIdentities || []);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManuallyLeavingRef = useRef(false);
  // Set when a disconnect must NOT trigger an auto-reconnect: React StrictMode
  // dev remounts (CLIENT_INITIATED) and identity displacement (DUPLICATE_IDENTITY).
  // Reconnecting with the same identity in those cases collides with the live
  // connection and ends stuck on "Disconnected". Cleared after the churn settles.
  const suppressAutoReconnectRef = useRef(false);
  const connectionStateRef = useRef<ConnectionState>(room.state);
  const appliedInitialMediaRef = useRef(false);
  const initialMediaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const participants = useParticipants();
  const [recordingSlot, setRecordingSlot] = useState<HTMLElement | null>(null);
  const [endMeetingSlot, setEndMeetingSlot] = useState<HTMLElement | null>(null);
  const [recordingToast, setRecordingToast] = useState(false);
  // Reason-specific leave/disconnect toast text (null = hidden). Avoids telling a
  // removed/disconnected participant the whole "Meeting ended".
  const [meetingEndedToast, setMeetingEndedToast] = useState<string | null>(null);
  const [endingMeeting, setEndingMeeting] = useState(false);

  // Host-only "End meeting for all". Leaving (handleLeave) intentionally only
  // disconnects the host locally so they can rejoin; ending the meeting for
  // everyone is this explicit action. endMeetingPublic deletes the LiveKit room
  // server-side, which disconnects every participant; we then leave locally.
  const handleEndMeetingForAll = useCallback(async () => {
    if (!isHost || endingMeeting) return;
    const confirmed = window.confirm(
      "End the meeting for everyone? All participants will be disconnected."
    );
    if (!confirmed) return;
    setEndingMeeting(true);
    isManuallyLeavingRef.current = true;
    try {
      if (participantEmail) await endMeetingPublic(roomName, participantEmail);
    } catch {
      // Server end failed — still tear down locally so the host isn't stuck.
    }
    try {
      await room.disconnect();
    } catch {
      // already disconnected
    }
    setMeetingEndedToast("Meeting ended for everyone");
    setTimeout(() => onMeetingEnded(), 1200);
  }, [isHost, endingMeeting, participantEmail, roomName, room, onMeetingEnded]);

  useEffect(() => {
    const handleDisconnect = (reason?: DisconnectReason) => {
      if (isManuallyLeavingRef.current) return;
      // A genuine user leave goes through handleLeave/handleEndMeetingForAll, which
      // set isManuallyLeavingRef BEFORE disconnecting (handled by the guard above).
      // So a CLIENT_INITIATED reaching here was NOT triggered by our Leave button —
      // it is React StrictMode's mount→cleanup→remount firing a disconnect on the
      // throwaway connection (dev: "Received leave request while trying to connect").
      // DUPLICATE_IDENTITY means another connection (the live remount / another tab)
      // now owns this identity. Bouncing to the lobby or reconnecting with the same
      // identity is wrong in both cases — the surviving connection is fine. No-op,
      // and suppress the connection-state / top-level reconnect cascade that follows.
      if (
        reason === DisconnectReason.CLIENT_INITIATED ||
        reason === DisconnectReason.DUPLICATE_IDENTITY
      ) {
        suppressAutoReconnectRef.current = true;
        setReconnecting(false);
        setTimeout(() => {
          suppressAutoReconnectRef.current = false;
        }, 2000);
        return;
      }
      // Server explicitly ended/removed room: do not attempt reconnect loop.
      if (
        reason === DisconnectReason.PARTICIPANT_REMOVED ||
        reason === DisconnectReason.ROOM_DELETED
      ) {
        isManuallyLeavingRef.current = true;
        setReconnecting(false);
        if (reason === DisconnectReason.ROOM_DELETED) {
          // Host ended the meeting for everyone -> terminal "meeting ended" screen.
          setMeetingEndedToast("The meeting has ended");
          setTimeout(() => onMeetingEnded(), 1200);
        } else {
          // This participant was individually removed -> back to the join page.
          setMeetingEndedToast("You were removed from the meeting");
          setTimeout(() => onLeave(), 1200);
        }
        return;
      }
      if (hasPermissionError) return;
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        // Prevent stacked reconnect timers when multiple disconnected events fire.
        if (reconnectTimeoutRef.current) return;
        setReconnecting(true);
        const delay = Math.min(
          INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts),
          MAX_RECONNECT_DELAY
        );
        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempts((prev) => prev + 1);
          onReconnect();
        }, delay);
      } else {
        setReconnecting(false);
        setMeetingEndedToast("Connection lost — you've left the meeting");
        setTimeout(() => {
          if (!isManuallyLeavingRef.current) onLeave();
        }, 2000);
      }
    };

    const handleConnectionStateChange = (state: ConnectionState) => {
      connectionStateRef.current = state;
      if (state === ConnectionState.Connected) {
        setReconnecting(false);
        setReconnectAttempts(0);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      } else if (state === ConnectionState.Reconnecting) {
        setReconnecting(true);
      } else if (state === ConnectionState.Disconnected) {
        // In some failure paths LiveKit emits only state change without the
        // `disconnected` event callback. Trigger controlled reconnect here too —
        // unless the disconnect was a StrictMode remount / identity displacement
        // (handleDisconnect set suppressAutoReconnectRef), where reconnecting with
        // the same identity just re-collides and lands stuck on "Disconnected".
        if (
          !isManuallyLeavingRef.current &&
          !hasPermissionError &&
          !suppressAutoReconnectRef.current &&
          !reconnectTimeoutRef.current
        ) {
          setReconnecting(true);
          const delay = Math.min(
            INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts),
            MAX_RECONNECT_DELAY
          );
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts((prev) => prev + 1);
            void onReconnect();
          }, delay);
        }
      }
    };

    room.on("disconnected", handleDisconnect);
    room.on("connectionStateChanged", handleConnectionStateChange);
    return () => {
      room.off("disconnected", handleDisconnect);
      room.off("connectionStateChanged", handleConnectionStateChange);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [room, reconnectAttempts, onLeave, onReconnect, hasPermissionError]);

  useEffect(() => {
    const handleConnected = () => {
      if (appliedInitialMediaRef.current) return;
      appliedInitialMediaRef.current = true;
      const localP = room.localParticipant;
      initialMediaTimeoutRef.current = setTimeout(() => {
        // Join room first with media off, then apply intended state.
        // This avoids early device-init failures causing immediate disconnects.
        localP.setMicrophoneEnabled(Boolean(initialAudioEnabled)).catch(() => {});
        localP.setCameraEnabled(Boolean(initialVideoEnabled)).catch(() => {});
        initialMediaTimeoutRef.current = null;
      }, 150);
    };
    room.on(RoomEvent.Connected, handleConnected);
    return () => {
      room.off(RoomEvent.Connected, handleConnected);
      if (initialMediaTimeoutRef.current) clearTimeout(initialMediaTimeoutRef.current);
    };
  }, [room, initialAudioEnabled, initialVideoEnabled]);

  // Inject recording button into control bar (beside the disconnect/leave button)
  useEffect(() => {
    const tryInject = () => {
      const bar = document.querySelector(".lk-control-bar");
      if (!bar) return false;
      let slot = document.getElementById("recording-button-slot");
      if (!slot) {
        slot = document.createElement("div");
        slot.id = "recording-button-slot";
        slot.style.cssText = "display:flex;align-items:center;order:90;";
        const leaveBtn = bar.querySelector(".lk-disconnect-button, [data-lk-disconnect], button[aria-label*='Leave'], button[aria-label*='Disconnect']");
        if (leaveBtn) {
          bar.insertBefore(slot, leaveBtn);
        } else {
          bar.appendChild(slot);
        }
      }
      setRecordingSlot(slot);
      return true;
    };
    if (tryInject()) return;
    const timer = setInterval(() => {
      if (tryInject()) clearInterval(timer);
    }, 300);
    return () => clearInterval(timer);
  }, []);

  // Inject "End meeting" button slot into the control bar, after the Leave button.
  useEffect(() => {
    const tryInject = () => {
      const bar = document.querySelector(".lk-control-bar");
      if (!bar) return false;
      let slot = document.getElementById("end-meeting-button-slot");
      if (!slot) {
        slot = document.createElement("div");
        slot.id = "end-meeting-button-slot";
        slot.style.cssText = "display:flex;align-items:center;order:1000;";
        const leaveBtn = bar.querySelector(".lk-disconnect-button, [data-lk-disconnect], button[aria-label*='Leave'], button[aria-label*='Disconnect']");
        if (leaveBtn && leaveBtn.parentElement === bar) {
          bar.insertBefore(slot, leaveBtn.nextSibling);
        } else {
          bar.appendChild(slot);
        }
      }
      setEndMeetingSlot(slot);
      return true;
    };
    if (tryInject()) return;
    const timer = setInterval(() => {
      if (tryInject()) clearInterval(timer);
    }, 300);
    return () => clearInterval(timer);
  }, []);

  // The built-in LiveKit "Leave" button calls room.disconnect() directly, which
  // emits Disconnected(CLIENT_INITIATED). The disconnect handlers below treat
  // CLIENT_INITIATED as StrictMode/duplicate churn and no-op — so without this,
  // clicking Leave leaves the user stuck on the "Disconnected" screen (or races
  // into an auto-reconnect). Arm the manual-leave flag in the capture phase, i.e.
  // BEFORE LiveKit's own onClick fires disconnect, so the ensuing CLIENT_INITIATED
  // is recognised as an intentional leave, and navigate away via onLeave.
  useEffect(() => {
    const onLeaveClickCapture = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest(".lk-disconnect-button")) return;
      isManuallyLeavingRef.current = true;
      onLeave();
    };
    document.addEventListener("click", onLeaveClickCapture, true);
    return () => document.removeEventListener("click", onLeaveClickCapture, true);
  }, [onLeave]);

  // Recording started toast (auto-dismiss)
  useEffect(() => {
    if (!recordingToast) return;
    const t = setTimeout(() => setRecordingToast(false), 3000);
    return () => clearTimeout(t);
  }, [recordingToast]);

  useEffect(() => {
    if (waitingParticipantIdentities) {
      setWaitingIds(waitingParticipantIdentities);
    }
  }, [waitingParticipantIdentities]);

  // Fetch waiting participants for ALL users (not just hosts) so everyone can hide them
  const [allWaitingParticipants, setAllWaitingParticipants] = useState<string[]>([]);
  
  useEffect(() => {
    // Fetch waiting participants for everyone, not just hosts
    const fetchWaitingParticipants = async () => {
      try {
        // Use public endpoint - now works for all participants (read-only)
        // Pass empty string for hostEmail since we don't need host verification for viewing
        const response = await livekitApi.getWaitingParticipantsPublic(roomName, '');
        const waitingIds = response.participants?.map(p => p.identity) || [];
        setAllWaitingParticipants(waitingIds);
      } catch (err) {
        // If it fails, use the waitingIds from props (for hosts) or empty array
        setAllWaitingParticipants(waitingIds.length > 0 ? waitingIds : []);
      }
    };

    fetchWaitingParticipants();
    // Poll every 5 seconds (reduces API load and potential reconnect triggers)
    const interval = setInterval(fetchWaitingParticipants, 5000);
    return () => clearInterval(interval);
  }, [roomName, waitingIds]);

  // Combine waiting IDs: prefer props (for hosts) but use fetched list for all participants
  // When a participant is admitted, they should be removed from both lists
  const combinedWaitingIds = waitingIds.length > 0 ? waitingIds : allWaitingParticipants;

  // Hide waiting participants from DOM - check ALL participants and hide those without canPublish
  useEffect(() => {
    // Get all waiting participant identities
    const waitingIdentities = new Set(combinedWaitingIds);
    
    // Build a map of all participants that should be hidden
    const participantsToHide = new Set<string>();
    
    // Check all participants - hide those that are waiting AND don't have canPublish permission
    participants.forEach((p) => {
      // Skip local participant
      if (p.identity === room.localParticipant.identity) return;
      
      // Check if participant has canPublish permission
      // If they have canPublish, they're admitted and should NOT be hidden
      const hasCanPublish = p.permissions?.canPublish === true;
      
      // Only hide if they're in waiting list AND don't have canPublish
      if (waitingIdentities.has(p.identity) && !hasCanPublish) {
        participantsToHide.add(p.identity);
      }
      
      // Also check by name - but only if they don't have canPublish
      if (!hasCanPublish) {
        const participantName = (p.name || p.identity).toLowerCase().trim();
        combinedWaitingIds.forEach((waitingId) => {
          const waitingIdLower = waitingId.toLowerCase().trim();
          // Match by name if identity doesn't match
          if (participantName === waitingIdLower || 
              participantName.includes(waitingIdLower) || 
              waitingIdLower.includes(participantName)) {
            participantsToHide.add(p.identity);
          }
        });
      }
    });

    if (participantsToHide.size === 0) {
      // If no participants to hide, make sure we unhide any previously hidden participants
      // This handles the case where a participant was admitted and should now be visible
      try {
        document.querySelectorAll('[data-waiting-hidden="true"]').forEach((el) => {
          const htmlEl = el as HTMLElement;
          htmlEl.removeAttribute('data-waiting-hidden');
          htmlEl.style.removeProperty('display');
          htmlEl.style.removeProperty('visibility');
          htmlEl.style.removeProperty('opacity');
          htmlEl.style.removeProperty('height');
          htmlEl.style.removeProperty('width');
          htmlEl.style.removeProperty('overflow');
          htmlEl.style.removeProperty('pointer-events');
          htmlEl.style.removeProperty('position');
          htmlEl.style.removeProperty('left');
        });
      } catch (e) {
        // Ignore errors
      }
      return;
    }

    // Function to hide an element
    const hideElement = (el: HTMLElement) => {
      if (el.getAttribute('data-waiting-hidden') === 'true') return;
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.style.setProperty('opacity', '0', 'important');
      el.style.setProperty('height', '0', 'important');
      el.style.setProperty('width', '0', 'important');
      el.style.setProperty('overflow', 'hidden', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
      el.style.setProperty('position', 'absolute', 'important');
      el.style.setProperty('left', '-9999px', 'important');
      el.setAttribute('data-waiting-hidden', 'true');
    };

    // Throttled check function
    let lastCheckTime = 0;
    const throttleDelay = 300; // Check at most every 300ms
    
    const checkAndHide = () => {
      const now = Date.now();
      if (now - lastCheckTime < throttleDelay) return;
      lastCheckTime = now;

      try {
        // Get ALL participant tiles
        const allTiles = document.querySelectorAll(
          '.lk-participant-tile, [class*="participant"], [data-lk-participant-identity], [data-lk-participant], [class*="lk-participant"]'
        );

        allTiles.forEach((tile) => {
          const el = tile as HTMLElement;
          
          // Check by identity attributes
          const tileIdentity = el.getAttribute('data-lk-participant-identity') || 
                              el.getAttribute('data-lk-participant') ||
                              el.getAttribute('data-participant-identity');
          
          // Find the participant for this tile
          const participant = participants.find(p => p.identity === tileIdentity);
          
          // If participant has canPublish, they're admitted - make sure they're visible
          if (participant && participant.permissions?.canPublish === true) {
            if (el.getAttribute('data-waiting-hidden') === 'true') {
              // Unhide admitted participants
              el.removeAttribute('data-waiting-hidden');
              el.style.removeProperty('display');
              el.style.removeProperty('visibility');
              el.style.removeProperty('opacity');
              el.style.removeProperty('height');
              el.style.removeProperty('width');
              el.style.removeProperty('overflow');
              el.style.removeProperty('pointer-events');
              el.style.removeProperty('position');
              el.style.removeProperty('left');
            }
            return; // Don't hide admitted participants
          }
          
          // If already hidden, skip
          if (el.getAttribute('data-waiting-hidden') === 'true') return;
          
          // Check if this tile belongs to a waiting participant
          if (tileIdentity && participantsToHide.has(tileIdentity)) {
            hideElement(el);
            return;
          }

          // Also check by participant name in the tile
          const tileText = el.textContent || el.innerText || '';
          const tileName = el.getAttribute('aria-label') || 
                         el.querySelector('[class*="name"]')?.textContent ||
                         tileText.split('\n')[0]?.trim();
          
          // Check if any waiting participant matches this tile
          participants.forEach((p) => {
            // Skip if participant has canPublish (they're admitted)
            if (p.permissions?.canPublish === true) return;
            
            if (participantsToHide.has(p.identity)) {
              const pName = (p.name || p.identity).toLowerCase().trim();
              const normalizedTileName = (tileName || tileText).toLowerCase().trim();
              
              // If names match (exact or partial), hide the tile
              if (normalizedTileName && (
                normalizedTileName === pName ||
                normalizedTileName.includes(pName) ||
                pName.includes(normalizedTileName) ||
                tileIdentity === p.identity
              )) {
                hideElement(el);
              }
            }
          });
        });

        // Also use direct selectors for each waiting identity
        Array.from(participantsToHide).forEach((identity) => {
          try {
            const selectors = [
              `[data-lk-participant-identity="${identity}"]`,
              `[data-lk-participant="${identity}"]`,
              `[data-participant-identity="${identity}"]`,
            ];
            selectors.forEach((selector) => {
              document.querySelectorAll(selector).forEach((el) => {
                hideElement(el as HTMLElement);
              });
            });
          } catch (e) {
            // Ignore selector errors
          }
        });

        // Unhide participants who are NOT in the waiting list anymore (they've been admitted)
        // This ensures admitted participants become visible immediately
        participants.forEach((p) => {
          // Skip if participant doesn't have canPublish (they're still waiting)
          if (p.permissions?.canPublish !== true) return;
          
          // If participant has canPublish but is marked as hidden, unhide them
          const selectors = [
            `[data-lk-participant-identity="${p.identity}"]`,
            `[data-lk-participant="${p.identity}"]`,
          ];
          selectors.forEach((selector) => {
            try {
              document.querySelectorAll(selector).forEach((el) => {
                const htmlEl = el as HTMLElement;
                if (htmlEl.getAttribute('data-waiting-hidden') === 'true') {
                  // Unhide admitted participants
                  htmlEl.removeAttribute('data-waiting-hidden');
                  htmlEl.style.removeProperty('display');
                  htmlEl.style.removeProperty('visibility');
                  htmlEl.style.removeProperty('opacity');
                  htmlEl.style.removeProperty('height');
                  htmlEl.style.removeProperty('width');
                  htmlEl.style.removeProperty('overflow');
                  htmlEl.style.removeProperty('pointer-events');
                  htmlEl.style.removeProperty('position');
                  htmlEl.style.removeProperty('left');
                }
              });
            } catch (e) {
              // Ignore selector errors
            }
          });
        });
      } catch (error) {
        console.error('Error hiding waiting participants:', error);
      }
    };

    // Run immediately
    checkAndHide();

    // Use MutationObserver with debouncing
    let mutationTimeout: ReturnType<typeof setTimeout> | null = null;
    const observer = new MutationObserver(() => {
      if (mutationTimeout) clearTimeout(mutationTimeout);
      mutationTimeout = setTimeout(() => {
        checkAndHide();
      }, 150);
    });

    // Observe the room container
    const roomContainer = document.querySelector('.room-meeting-container, .lk-video-conference');
    if (roomContainer) {
      observer.observe(roomContainer, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-lk-participant-identity', 'data-lk-participant', 'class'],
      });
    }

    // Use interval as backup
    const interval = setInterval(checkAndHide, 500);

    return () => {
      observer.disconnect();
      clearInterval(interval);
      if (mutationTimeout) clearTimeout(mutationTimeout);
    };
  }, [combinedWaitingIds, participants, room]);

  // Generate CSS to hide waiting participants from video grid (backup to DOM manipulation)
  const waitingParticipantsCSS = waitingIds.length > 0
    ? waitingIds.map(identity => {
        // Escape special characters in identity for CSS selector
        const escapedIdentity = identity.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '\\$&');
        return `
          [data-lk-participant-identity="${identity}"] { display: none !important; visibility: hidden !important; opacity: 0 !important; height: 0 !important; width: 0 !important; overflow: hidden !important; }
          [data-lk-participant="${identity}"] { display: none !important; visibility: hidden !important; opacity: 0 !important; height: 0 !important; width: 0 !important; overflow: hidden !important; }
          .lk-participant-tile[data-lk-participant-identity="${identity}"] { display: none !important; visibility: hidden !important; opacity: 0 !important; height: 0 !important; width: 0 !important; overflow: hidden !important; }
          .lk-participant-tile[data-lk-participant="${identity}"] { display: none !important; visibility: hidden !important; opacity: 0 !important; height: 0 !important; width: 0 !important; overflow: hidden !important; }
          .lk-grid-layout [data-lk-participant-identity="${identity}"] { display: none !important; visibility: hidden !important; opacity: 0 !important; height: 0 !important; width: 0 !important; overflow: hidden !important; }
          .lk-focus-layout [data-lk-participant-identity="${identity}"] { display: none !important; visibility: hidden !important; opacity: 0 !important; height: 0 !important; width: 0 !important; overflow: hidden !important; }
        `;
      }).join('\n')
    : '';

  return (
    <>
      <ObsidianStudioStyles />
      <style dangerouslySetInnerHTML={{ __html: `
        .room-page {
          height: 100%;
          min-height: 0;
        }
        .room-meeting-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          width: 100%;
          background: radial-gradient(ellipse at top, #15181b 0%, #0B0D0E 60%, #06070a 100%);
          font-family: var(--obs-font-body, 'Manrope'), system-ui, sans-serif;
          letter-spacing: -0.005em;
          position: relative;
        }
        .room-meeting-container { isolation: isolate; }
        .room-meeting-container::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' /></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>");
          opacity: 0.025;
          pointer-events: none;
          mix-blend-mode: overlay;
          z-index: -1;
        }
        .room-meeting-container .lk-video-conference,
        .room-meeting-container .lk-video-conference-inner,
        .room-meeting-container .lk-focus-layout-wrapper,
        .room-meeting-container .lk-grid-layout-wrapper {
          flex: 1;
          min-height: 0;
          background: transparent !important;
        }
        /* Keep media area first and controls pinned to bottom. */
        .room-meeting-container .lk-video-conference {
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .room-meeting-container .lk-video-conference-inner {
          flex: 1 1 auto;
          min-height: 0;
        }
        .room-meeting-container .lk-control-bar {
          order: 999;
          margin-top: auto;
        }
        .room-meeting-container .lk-grid-layout {
          min-height: 0;
          padding: 0.75rem;
          gap: 0.5rem;
        }
        .room-meeting-container .lk-participant-tile {
          min-height: 120px;
          border-radius: 14px !important;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 8px 24px -8px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.03);
          transition: border-color 200ms ease, box-shadow 200ms ease;
        }
        .room-meeting-container .lk-participant-tile[data-lk-speaking="true"] {
          border-color: var(--obs-accent, #00E6C3) !important;
          box-shadow: 0 0 0 1px var(--obs-accent, #00E6C3), 0 8px 32px -4px rgba(0,230,195,0.25);
        }
        .room-meeting-container .lk-participant-name,
        .room-meeting-container .lk-participant-metadata {
          font-family: var(--obs-font-mono, 'JetBrains Mono'), monospace !important;
          font-size: 11px !important;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          background: rgba(11,13,14,0.55) !important;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 6px !important;
          padding: 4px 8px !important;
        }
        .room-meeting-container .lk-control-bar {
          flex-shrink: 0;
          margin: 0 0.75rem 0.75rem 0.75rem;
          padding: 0.5rem 0.75rem !important;
          background: rgba(15,17,19,0.72) !important;
          backdrop-filter: blur(24px) saturate(140%);
          -webkit-backdrop-filter: blur(24px) saturate(140%);
          border: 1px solid rgba(255,255,255,0.08) !important;
          border-radius: 16px !important;
          box-shadow: 0 12px 48px -12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05);
        }
        .room-meeting-container .lk-control-bar .lk-button {
          border-radius: 10px !important;
          background: rgba(255,255,255,0.04) !important;
          border: 1px solid rgba(255,255,255,0.06) !important;
          color: #f4f5f6 !important;
          font-family: var(--obs-font-body, 'Manrope'), system-ui, sans-serif !important;
          font-size: 13px !important;
          font-weight: 500 !important;
          letter-spacing: -0.01em;
          padding: 0.55rem 0.85rem !important;
          transition: background 160ms ease, transform 160ms ease, border-color 160ms ease;
        }
        .room-meeting-container .lk-control-bar .lk-button:hover {
          background: rgba(255,255,255,0.08) !important;
          border-color: rgba(255,255,255,0.14) !important;
        }
        .room-meeting-container .lk-control-bar .lk-button[aria-pressed="true"],
        .room-meeting-container .lk-control-bar .lk-button[data-lk-source-muted="false"] {
          background: linear-gradient(180deg, rgba(0,230,195,0.18), rgba(0,230,195,0.08)) !important;
          border-color: rgba(0,230,195,0.4) !important;
          color: #d6fff6 !important;
        }
        .room-meeting-container .lk-control-bar .lk-disconnect-button,
        .room-meeting-container .lk-control-bar .lk-button[data-lk-button-type="leave"] {
          background: linear-gradient(180deg, rgba(255,82,82,0.95), rgba(220,40,40,0.95)) !important;
          border-color: rgba(255,120,120,0.4) !important;
          color: #fff !important;
          font-weight: 600 !important;
        }
        .room-meeting-container .lk-focus-layout {
          gap: 0.5rem !important;
          padding: 0.75rem;
        }
        #recording-button-slot .lk-button {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        ${waitingParticipantsCSS}
        ${MEETING_CONTROL_BAR_RESPONSIVE_CSS}
        @media (max-width: 640px) {
          .room-meeting-container .lk-control-bar {
            margin: 0;
            border-radius: 0 !important;
            border-left: 0 !important;
            border-right: 0 !important;
            border-bottom: 0 !important;
            padding-left: max(0.75rem, env(safe-area-inset-left)) !important;
            padding-right: max(0.75rem, env(safe-area-inset-right)) !important;
            padding-bottom: max(0.75rem, env(safe-area-inset-bottom)) !important;
          }
          .room-meeting-container .lk-grid-layout {
            grid-gap: 0.25rem;
            padding: 0.25rem;
          }
        }
      `}} />
      <div className="room-meeting-container relative flex flex-col h-full min-h-0 w-full">
        <MeetingScheduleCountdown
          meetingEndAtIso={meetingEndAtIso}
          isHost={isHost}
          participantEmail={participantEmail}
          roomName={roomName}
          onHardEnd={onLeave}
        />
        <VideoConferenceBoundary>
          {(remountKey) => <StableVideoConference key={remountKey} />}
        </VideoConferenceBoundary>
        <RoomAudioRenderer />
        {isHost &&
          recordingSlot &&
          createPortal(
            <RecordingButton
              roomName={roomName}
              hostEmail={participantEmail || undefined}
              controlBar
              onRecordingStarted={() => setRecordingToast(true)}
            />,
            recordingSlot
          )}
        {isHost &&
          endMeetingSlot &&
          createPortal(
            <button
              type="button"
              onClick={handleEndMeetingForAll}
              disabled={endingMeeting}
              className="lk-button flex items-center gap-2 rounded-md px-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: "rgba(255,82,82,0.92)",
                border: "1px solid rgba(255,82,82,0.55)",
                color: "#fff",
                fontFamily: "var(--obs-font-mono, ui-monospace, monospace)",
                fontSize: "11px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: endingMeeting ? "not-allowed" : "pointer",
              }}
              title="End the meeting for all participants"
            >
              <i className="ri-phone-fill text-base" style={{ transform: "rotate(135deg)" }} />
              <span className="lk-host-action-btn__label">{endingMeeting ? "Ending…" : "End meeting"}</span>
            </button>,
            endMeetingSlot
          )}
        {recordingToast && isHost && (
          <div
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[2000] flex items-center gap-2 px-4 py-2.5 rounded-full"
            style={{
              background: "rgba(11,13,14,0.82)",
              backdropFilter: "blur(20px) saturate(140%)",
              WebkitBackdropFilter: "blur(20px) saturate(140%)",
              border: "1px solid rgba(255,82,82,0.35)",
              boxShadow: "0 12px 32px -8px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,82,82,0.15)",
              color: "#fff",
              fontFamily: "var(--obs-font-mono, ui-monospace, monospace)",
              fontSize: "11px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
            role="alert"
          >
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{
                background: "#ff5252",
                boxShadow: "0 0 10px #ff5252",
                animation: "obsPulse 1.4s ease-in-out infinite",
              }}
            />
            Recording in progress
          </div>
        )}
        {meetingEndedToast && (
          <div
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[2000] flex items-center gap-2 px-4 py-2.5 rounded-full"
            style={{
              background: "rgba(11,13,14,0.82)",
              backdropFilter: "blur(20px) saturate(140%)",
              WebkitBackdropFilter: "blur(20px) saturate(140%)",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 12px 32px -8px rgba(0,0,0,0.6)",
              color: "#fff",
              fontFamily: "var(--obs-font-mono, ui-monospace, monospace)",
              fontSize: "11px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
            role="alert"
          >
            <i className="ri-checkbox-circle-line text-base" style={{ color: "var(--obs-accent, #00E6C3)" }} />
            {meetingEndedToast}
          </div>
        )}
        {isHost && (
          <div
            className="absolute top-4 left-4 z-[1000]"
            style={{
              maxWidth: "400px",
            }}
          >
            <WaitingParticipantsPanel
              roomName={roomName}
              onParticipantAdmitted={(identity) => {
                console.log("Participant admitted:", identity);
                // Remove from waiting list immediately when admitted
                setWaitingIds((prev) => prev.filter(id => id !== identity));
                setAllWaitingParticipants((prev) => prev.filter(id => id !== identity));
              }}
              onWaitingParticipantsChange={(identities) => {
                setWaitingIds(identities);
                // Also update fetched list
                setAllWaitingParticipants(identities);
              }}
            />
          </div>
        )}
        {reconnecting && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-[100]">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-white border-t-transparent mx-auto mb-4"></div>
              <p>Reconnecting...</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function tokenAllowsRoomJoin(data: { isHost?: boolean; canPublish?: boolean }): boolean {
  return data.isHost === true || data.canPublish === true;
}

function displayNameFromUser(user: { name?: string; email?: string } | null): string {
  if (!user) return "";
  const n = typeof user.name === "string" ? user.name.trim() : "";
  if (n) return n;
  const em = typeof user.email === "string" ? user.email.trim() : "";
  if (em) {
    const local = em.split("@")[0]?.trim();
    if (local) return local;
  }
  return "";
}

export default function PublicMeetingRoomClient() {
  useLiveKitBenignErrorSuppression();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user: authUser, isChecked: authChecked } = useAuth();
  /** Prefer ?room= (invite links / static export); path [roomId] may be placeholder "_" */
  const roomId = (() => {
    const q = searchParams?.get("room")?.trim() || "";
    const p = (params?.roomId as string)?.trim() || "";
    if (q) return q;
    if (p && p !== "_") return p;
    return p || "";
  })();
  const nameFromQuery = searchParams.get("name")?.trim();
  const emailFromQuery = searchParams.get("email")?.trim();
  /** If only email is in the link, use local-part as display name so join still works */
  const nameDerivedFromEmail =
    !nameFromQuery && emailFromQuery
      ? emailFromQuery.split("@")[0]?.trim() || ""
      : "";
  const emailFromSession = authChecked ? (authUser?.email?.trim() ?? "") : "";

  const [showRoom, setShowRoom] = useState(false);
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [meetingEnded, setMeetingEnded] = useState(false);
  const [reconnectKey, setReconnectKey] = useState(0);
  const [hasPermissionError, setHasPermissionError] = useState(false);
  /** Normal participant waiting for host to admit; same page with message + loader */
  const [waitingForAdmission, setWaitingForAdmission] = useState(false);
  /** Host explicitly denied this waiter — terminal state, polling stops. */
  const [admissionDenied, setAdmissionDenied] = useState(false);
  const [participantIdentity, setParticipantIdentity] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  /** Uninvited guest on an invite-only meeting: holds a blind lobby token but does not
   *  connect until they explicitly click "Ask for permission" (then they enter the waiting flow). */
  const [knocking, setKnocking] = useState(false);
  const [knockRequested, setKnockRequested] = useState(false);
  const [waitingParticipantIdentities, setWaitingParticipantIdentities] = useState<string[]>([]);
  /** Calendar end from token API (scheduledAt + duration) for countdown / auto-leave */
  const [meetingEndAtIso, setMeetingEndAtIso] = useState<string | null>(null);
  const [roomConnectEpoch, setRoomConnectEpoch] = useState(0);
  /** Terminal: the browser blocks WebRTC (e.g. Brave Shields / fingerprint protection),
   *  so LiveKit can never connect. Show a clear message and STOP the reconnect loop
   *  instead of churning guest identities forever. */
  const [webrtcUnsupported, setWebrtcUnsupported] = useState(false);
  const admissionPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const participantIdentityRef = useRef<string | null>(null);
  const guestIdentityRef = useRef<string | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualLeaveRef = useRef(false);
  const topLevelReconnectInFlightRef = useRef(false);
  const lastTopLevelReconnectAtRef = useRef(0);

  // Pre-join form state (when no name in URL)
  const [preJoinName, setPreJoinName] = useState("");
  const [preJoinEmail, setPreJoinEmail] = useState("");
  const [preJoinAudio, setPreJoinAudio] = useState(false);
  const [preJoinVideo, setPreJoinVideo] = useState(false);
  const [preJoinError, setPreJoinError] = useState("");
  const [preJoinRequesting, setPreJoinRequesting] = useState(false);
  const [audioPermissionGranted, setAudioPermissionGranted] = useState(false);
  const [videoPermissionGranted, setVideoPermissionGranted] = useState(false);
  const permissionRequestedOnLoadRef = useRef(false);
  /** User must pass the lobby (editable name, read-only email) before we request a LiveKit token */
  const [preJoinCommitted, setPreJoinCommitted] = useState(false);

  const participantName = preJoinCommitted ? preJoinName.trim() : "";
  const participantEmail = preJoinCommitted ? preJoinEmail.trim() : "";

  useEffect(() => {
    participantIdentityRef.current = participantIdentity;
  }, [participantIdentity]);

  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, []);

  // Lobby: prefill name/email from invite link, prefill_* params, or signed-in user (email is not editable in UI)
  useEffect(() => {
    if (preJoinCommitted) return;
    if (!authChecked && !emailFromQuery && !nameFromQuery) return;

    const prefillNameQ =
      nameFromQuery ||
      nameDerivedFromEmail ||
      searchParams.get("prefill_name")?.trim() ||
      searchParams.get("name")?.trim() ||
      "";
    const prefillEmailQ =
      emailFromQuery ||
      searchParams.get("prefill_email")?.trim() ||
      searchParams.get("email")?.trim() ||
      "";

    const sessionDisplay = displayNameFromUser(authUser);
    const sessionEmail = authUser?.email?.trim() ?? "";
    const derivedFromEmail =
      !prefillNameQ && prefillEmailQ
        ? prefillEmailQ.split("@")[0]?.trim() || ""
        : "";

    setPreJoinName((prev) => {
      if (prev.trim()) return prev;
      if (prefillNameQ) return prefillNameQ;
      if (derivedFromEmail) return derivedFromEmail;
      return sessionDisplay;
    });
    setPreJoinEmail((prev) => {
      if (prev.trim()) return prev;
      if (prefillEmailQ) return prefillEmailQ;
      return sessionEmail;
    });
  }, [preJoinCommitted, authChecked, authUser, searchParams, emailFromQuery, nameFromQuery, nameDerivedFromEmail]);

  const audioEnabled = useMemo(() => {
    if (!preJoinCommitted) return preJoinAudio;
    if (searchParams.get("audio") === "0") return false;
    return preJoinAudio;
  }, [preJoinCommitted, preJoinAudio, searchParams]);
  const videoEnabled = useMemo(() => {
    if (!preJoinCommitted) return preJoinVideo;
    if (searchParams.get("video") === "0") return false;
    return preJoinVideo;
  }, [preJoinCommitted, preJoinVideo, searchParams]);

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  // Request browser audio/video permission when lobby opens (before join), like L5-working
  useEffect(() => {
    if (preJoinCommitted) return;
    if (permissionRequestedOnLoadRef.current) return;
    permissionRequestedOnLoadRef.current = true;

    const requestOnLoad = async () => {
      setPreJoinRequesting(true);
      setPreJoinError("");

      let audioGranted = false;
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getTracks().forEach((t) => t.stop());
        audioGranted = true;
        setAudioPermissionGranted(true);
        setPreJoinAudio(true);
      } catch {
        setAudioPermissionGranted(false);
        setPreJoinAudio(false);
      }

      let videoGranted = false;
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoStream.getTracks().forEach((t) => t.stop());
        videoGranted = true;
        setVideoPermissionGranted(true);
        setPreJoinVideo(true);
      } catch {
        setVideoPermissionGranted(false);
        setPreJoinVideo(false);
      }

      if (!audioGranted && !videoGranted) {
        setPreJoinError(
          "Camera and microphone permissions are required. Please allow at least one (audio or video) to join the meeting room."
        );
      } else if (!audioGranted) {
        setPreJoinError("Microphone permission denied. You can join with video only.");
      } else if (!videoGranted) {
        setPreJoinError("Camera permission denied. You can join with audio only.");
      } else {
        setPreJoinError("");
      }
      setPreJoinRequesting(false);
    };

    requestOnLoad();
  }, [preJoinCommitted]);

  // When user turns audio ON again after deny: request permission again
  const handleAudioToggle = useCallback(async () => {
    if (preJoinAudio) {
      setPreJoinAudio(false);
      return;
    }
    if (audioPermissionGranted) {
      setPreJoinAudio(true);
      setPreJoinError(videoPermissionGranted ? "" : "Camera permission denied. You can join with audio only.");
      return;
    }
    setPreJoinRequesting(true);
    setPreJoinError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setAudioPermissionGranted(true);
      setPreJoinAudio(true);
      setPreJoinError(videoPermissionGranted ? "" : "Camera permission denied. You can join with audio only.");
    } catch (err: any) {
      setAudioPermissionGranted(false);
      setPreJoinAudio(false);
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setPreJoinError(
          videoPermissionGranted
            ? "Microphone permission denied. You can join with video only."
            : "Camera and microphone permissions are required. Please allow at least one (audio or video) to join the meeting room."
        );
      } else {
        setPreJoinError("Could not access microphone. Please try again.");
      }
    } finally {
      setPreJoinRequesting(false);
    }
  }, [preJoinAudio, audioPermissionGranted, videoPermissionGranted]);

  // When user turns video ON again after deny: request permission again
  const handleVideoToggle = useCallback(async () => {
    if (preJoinVideo) {
      setPreJoinVideo(false);
      return;
    }
    if (videoPermissionGranted) {
      setPreJoinVideo(true);
      setPreJoinError(audioPermissionGranted ? "" : "Microphone permission denied. You can join with video only.");
      return;
    }
    setPreJoinRequesting(true);
    setPreJoinError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      setVideoPermissionGranted(true);
      setPreJoinVideo(true);
      setPreJoinError(audioPermissionGranted ? "" : "Microphone permission denied. You can join with video only.");
    } catch (err: any) {
      setVideoPermissionGranted(false);
      setPreJoinVideo(false);
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setPreJoinError(
          audioPermissionGranted
            ? "Camera permission denied. You can join with audio only."
            : "Camera and microphone permissions are required. Please allow at least one (audio or video) to join the meeting room."
        );
      } else {
        setPreJoinError("Could not access camera. Please try again.");
      }
    } finally {
      setPreJoinRequesting(false);
    }
  }, [preJoinVideo, videoPermissionGranted, audioPermissionGranted]);

  const handlePreJoinSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const name = preJoinName.trim();
      if (!name) {
        setPreJoinError("Please enter your name.");
        return;
      }
      if (!audioPermissionGranted && !videoPermissionGranted) {
        setPreJoinError("At least one permission (audio or video) is required to join the meeting room.");
        return;
      }
      // New join attempt: clear leave/reconnect guards from any prior session in this tab.
      manualLeaveRef.current = false;
      topLevelReconnectInFlightRef.current = false;
      lastTopLevelReconnectAtRef.current = 0;
      setPreJoinError("");
      setPreJoinCommitted(true);
    },
    [preJoinName, preJoinAudio, preJoinVideo, audioPermissionGranted, videoPermissionGranted]
  );

  /**
   * Pick the token endpoint by auth state. Logged-in users with a matching session email
   * use the authenticated endpoint (stable user identity). Otherwise the public endpoint
   * still grants host when the invite link email matches a host on the meeting record.
   */
  const requestToken = useCallback(
    async (identity?: string, opts?: { forcePublic?: boolean }) => {
      const roomName = decodeURIComponent(roomId);
      const authedEmail = authChecked ? authUser?.email?.trim() : "";
      const invitedEmail = participantEmail?.trim();
      const pinnedIdentity = identity || participantIdentityRef.current || participantIdentity;
      const hasPinnedIdentity = !!pinnedIdentity;
      const sameInvitedAsAuthed =
        !!authedEmail &&
        !!invitedEmail &&
        authedEmail.toLowerCase() === invitedEmail.toLowerCase();
      const shouldUseAuthedEndpoint =
        !opts?.forcePublic &&
        !!authedEmail &&
        // Critical: once a non-host identity is pinned (especially admitted waiters),
        // keep using the same public identity path to avoid auth/public identity drift.
        (!hasPinnedIdentity || isHost) &&
        (!invitedEmail || sameInvitedAsAuthed);
      const guestIdentity =
        identity ||
        participantIdentityRef.current ||
        guestIdentityRef.current ||
        `guest-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      guestIdentityRef.current = guestIdentity;
      if (shouldUseAuthedEndpoint) {
        try {
          return await livekitApi.getLiveKitToken(roomName, participantName, participantEmail || authedEmail);
        } catch (err: unknown) {
          const status = (err as { response?: { status?: number } } | undefined)?.response?.status;
          if (status !== 401 && status !== 403) {
            throw err;
          }
          // Authenticated path rejected — fall back to public guest token path.
        }
      }
      return livekitApi.getPublicLiveKitToken(
        roomName,
        participantName,
        participantEmail || undefined,
        guestIdentity
      );
    },
    [roomId, authChecked, authUser, participantName, participantEmail, participantIdentity, isHost]
  );

  const fetchToken = useCallback(async () => {
    if (!livekitUrl || !participantName) {
      setShowRoom(false);
      setWaitingForAdmission(false);
      return;
    }
    try {
      // New token bootstrap: clear leave/reconnect guards from any prior leave path.
      manualLeaveRef.current = false;
      topLevelReconnectInFlightRef.current = false;
      lastTopLevelReconnectAtRef.current = 0;
      setIsLoading(true);
      setError("");
      const data = await requestToken();
      setToken(data.token);
      setMeetingEndAtIso(data.meetingEndAt ?? null);
      const pid = data.participantIdentity ?? null;
      setParticipantIdentity(pid);
      participantIdentityRef.current = pid;
      setIsHost(data.isHost === true);
      if (data.rejected) {
        // Host denied this waiter — terminal, do not enter the waiting/poll flow.
        setKnocking(false);
        setWaitingForAdmission(false);
        setShowRoom(false);
        setAdmissionDenied(true);
      } else if (tokenAllowsRoomJoin(data)) {
        setKnocking(false);
        setWaitingForAdmission(false);
        setShowRoom(true);
      } else if (data.knocking && !knockRequested) {
        // Uninvited guest on a meeting where guests are NOT allowed: show the explicit
        // "Ask for permission" gate. We hold a blind lobby token but don't connect/poll
        // until they click. (Approval-required waiters are handled by the else branch.)
        setKnocking(true);
        setWaitingForAdmission(false);
        setShowRoom(false);
      } else {
        setWaitingForAdmission(true);
        setShowRoom(false);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 410) {
        setError("This meeting has already ended.");
        setMeetingEnded(true);
      } else {
        console.error("Error fetching token:", err);
        setError(
          err?.response?.data?.message || err?.message || "Failed to connect to room"
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [participantName, livekitUrl, requestToken, knockRequested]);

  useEffect(() => {
    if (participantName && livekitUrl && !showRoom && !token) {
      fetchToken();
    }
  }, [participantName, livekitUrl, showRoom, token, fetchToken]);

  // Poll for admission when normal participant is waiting (must send same participantIdentity or server mints a new guest id)
  useEffect(() => {
    if (!waitingForAdmission || !participantName || !livekitUrl || !roomId || !participantIdentity) return;

    let pollCount = 0;
    const maxPolls = 300;

    const checkAdmission = async () => {
      pollCount++;
      const identity = participantIdentityRef.current;
      if (!identity) return;

      if (pollCount > maxPolls) {
        console.warn("Admission polling stopped after max attempts");
        if (admissionPollRef.current) {
          clearInterval(admissionPollRef.current);
          admissionPollRef.current = null;
        }
        return;
      }

      try {
        const data = await requestToken(identity, { forcePublic: true });

        if (data.rejected) {
          // Host denied the request while waiting — stop polling, show terminal screen.
          if (admissionPollRef.current) {
            clearInterval(admissionPollRef.current);
            admissionPollRef.current = null;
          }
          setWaitingForAdmission(false);
          setAdmissionDenied(true);
          return;
        }

        if (tokenAllowsRoomJoin(data)) {
          if (admissionPollRef.current) {
            clearInterval(admissionPollRef.current);
            admissionPollRef.current = null;
          }
          setToken(data.token);
          setMeetingEndAtIso(data.meetingEndAt ?? null);
          if (data.participantIdentity) {
            setParticipantIdentity(data.participantIdentity);
            participantIdentityRef.current = data.participantIdentity;
          }
          setIsHost(data.isHost === true);
          setWaitingForAdmission(false);
          setShowRoom(true);
          setRoomConnectEpoch((e) => e + 1);
          setReconnectKey((k) => k + 1);
        }
      } catch (err: unknown) {
        const errorMsg = String((err as { message?: string })?.message || "").toLowerCase();
        if (errorMsg.includes("network") || errorMsg.includes("failed")) {
          console.error("Error checking admission status:", err);
        }
      }
    };

    admissionPollRef.current = setInterval(checkAdmission, 1500);
    checkAdmission();

    return () => {
      if (admissionPollRef.current) {
        clearInterval(admissionPollRef.current);
        admissionPollRef.current = null;
      }
    };
  }, [waitingForAdmission, participantName, participantIdentity, livekitUrl, roomId, requestToken]);

  const buildJoinRoomUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set("room", roomId);
    if (participantName?.trim()) params.set("name", participantName.trim());
    if (participantEmail?.trim()) params.set("email", participantEmail.trim());
    return `/join/room?${params.toString()}`;
  }, [roomId, participantName, participantEmail]);

  const handleLeave = useCallback(() => {
    manualLeaveRef.current = true;
    // Leaving only disconnects this participant locally — it must NOT end the meeting
    // for everyone. The link stays joinable for the scheduled window so anyone can
    // rejoin after a drop. Ending is an explicit host action / scheduled-window auto-end.
    setPreJoinCommitted(false);
    setToken("");
    setParticipantIdentity(null);
    participantIdentityRef.current = null;
    guestIdentityRef.current = null;
    setShowRoom(false);
    setWaitingForAdmission(false);
    setKnocking(false);
    setKnockRequested(false);
    router.push(buildJoinRoomUrl());
  }, [router, buildJoinRoomUrl]);

  // Meeting ended for everyone (host pressed "End meeting" or server deleted the
  // room). Halt all reconnect paths and show the terminal "meeting ended" screen
  // in place — no navigation. The LiveKitRoom unmounts with the terminal render,
  // which disconnects this client cleanly.
  const handleMeetingEnded = useCallback(() => {
    manualLeaveRef.current = true;
    topLevelReconnectInFlightRef.current = false;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    setMeetingEnded(true);
  }, []);

  const handleReconnect = useCallback(async () => {
    if (!participantName || !roomId) return;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    try {
      setIsLoading(true);
      const data = await requestToken(participantIdentityRef.current ?? participantIdentity ?? undefined);

      // If reconnect gets a waiting token, do not try to mount the room with it.
      // Move back to admission-wait UI and keep polling until publish access flips on.
      if (!tokenAllowsRoomJoin(data)) {
        setShowRoom(false);
        setWaitingForAdmission(true);
        setKnocking(false);
        return;
      }

      reconnectAttemptsRef.current = 0;
      setToken(data.token);
      setMeetingEndAtIso(data.meetingEndAt ?? null);
      if (data.participantIdentity) {
        setParticipantIdentity(data.participantIdentity);
        participantIdentityRef.current = data.participantIdentity;
      }
      setRoomConnectEpoch((e) => e + 1);
      setReconnectKey((prev) => prev + 1);
    } catch (err) {
      const status = (err as { response?: { status?: number }; status?: number } | undefined)?.response?.status
        ?? (err as { status?: number } | undefined)?.status;

      // Terminal: meeting ended/cancelled. Stop retrying, notify, leave room.
      if (status === 410) {
        reconnectAttemptsRef.current = 0;
        handleMeetingEnded();
        return;
      }

      // Cap attempts to avoid hammering the rate limiter (publicWriteLimiter → 429).
      if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        console.error("Reconnect attempts exhausted; leaving room.", err);
        reconnectAttemptsRef.current = 0;
        void Swal.fire({
          toast: true,
          position: "top-end",
          icon: "warning",
          title: "Lost connection",
          text: "Unable to reconnect. Returning to lobby.",
          showConfirmButton: false,
          timer: 4000,
          background: "#1f2937",
          color: "#f9fafb",
        });
        handleLeave();
        return;
      }

      // 429 → wait longer (rate limited). Others → exponential backoff.
      const attempt = reconnectAttemptsRef.current;
      const base = status === 429
        ? Math.max(INITIAL_RECONNECT_DELAY * 2, MAX_RECONNECT_DELAY)
        : INITIAL_RECONNECT_DELAY * Math.pow(2, attempt);
      const delay = Math.min(base, MAX_RECONNECT_DELAY);
      reconnectAttemptsRef.current = attempt + 1;
      console.error(`Reconnect attempt ${attempt + 1}/${MAX_RECONNECT_ATTEMPTS} failed (status=${status ?? "n/a"}); retrying in ${delay}ms`, err);
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        handleReconnect();
      }, delay);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, participantName, participantIdentity, handleLeave, requestToken]);

  const handleError = useCallback((error: Error) => {
    const errorMessage = error.message.toLowerCase();
    // Fatal, non-recoverable: the browser has WebRTC disabled (Brave Shields /
    // fingerprint protection, an extension, or an outdated browser). LiveKit throws
    // "...doesn't seem to be supported on this browser..." from Room.connect(). Retrying
    // just remounts and re-throws forever, churning a new guest identity each cycle and
    // orphaning the host's admit. Stop the loop and tell the user how to fix it.
    if (
      errorMessage.includes("supported on this browser") ||
      errorMessage.includes("webrtc")
    ) {
      manualLeaveRef.current = true; // halts inner + top-level reconnect handlers
      if (admissionPollRef.current) {
        clearInterval(admissionPollRef.current);
        admissionPollRef.current = null;
      }
      setWebrtcUnsupported(true);
      setWaitingForAdmission(false);
      setHasPermissionError(true);
      return;
    }
    if (
      errorMessage.includes("permission") ||
      errorMessage.includes("notallowed") ||
      errorMessage.includes("devicenotfound") ||
      errorMessage.includes("notreadable") ||
      errorMessage.includes("overconstrained")
    ) {
      setHasPermissionError(true);
      setError(
        "Camera/microphone access denied or not available. Please check your browser permissions and try again."
      );
    }
  }, []);

  // Terminal: the meeting has ended for everyone. Wins over every other screen so
  // host and participants all land here, disconnected, with no auto-navigation.
  if (meetingEnded) {
    return (
      <div className="obs-error">
        <ObsidianStudioStyles />
        <div className="obs-error__grain" aria-hidden />
        <div className="obs-error__card">
          <span className="obs-mono obs-eyebrow obs-error__eyebrow">— SESSION CLOSED</span>
          <h2 className="obs-display obs-error__title">
            The meeting has <em className="obs-display-italic">ended.</em>
          </h2>
          <p className="obs-error__msg">
            The host ended this meeting for everyone. You&apos;ve been disconnected.
          </p>
          <div className="obs-actions">
            <button onClick={() => router.push("/")} className="obs-btn obs-btn--primary">
              Back to home <i className="ri-home-5-line" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (webrtcUnsupported) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="max-w-md text-center text-gray-200">
          <h2 className="text-lg font-semibold mb-2">Your browser is blocking video calls</h2>
          <p className="text-sm text-gray-400 mb-4">
            This browser has WebRTC disabled, so the call can&apos;t connect. To join:
          </p>
          <ul className="text-sm text-gray-300 text-left inline-block space-y-1 mb-5">
            <li>• <strong>Brave:</strong> click the Shields (lion) icon in the address bar and turn Shields <strong>down for this site</strong>, then reload.</li>
            <li>• Or open this meeting link in <strong>Chrome / Edge</strong>.</li>
            <li>• Make sure no extension is blocking WebRTC.</li>
          </ul>
          <div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded bg-primary text-white text-sm"
            >
              Reload and try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!nameFromQuery && !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="text-center text-gray-300">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto mb-3" />
          <p className="text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  // Waiting room / lobby: always before connecting; name editable, email prefilled and read-only
  if (!preJoinCommitted) {
    return (
      <div className="obs-lobby">
        <ObsidianStudioStyles />
        <div className="obs-lobby__grain" aria-hidden />
        <div className="obs-lobby__vignette" aria-hidden />

        <aside className="obs-lobby__hero">
          <div className="obs-lobby__hero-frame">
            <LobbyDevicePreview
              enabled
              showVideo={preJoinVideo && videoPermissionGranted}
              showAudio={preJoinAudio && audioPermissionGranted}
            />
            <div className="obs-lobby__hero-gradient" aria-hidden />
            <div className="obs-lobby__hero-meta">
              <div className="obs-lobby__hero-tag">
                <span className="obs-dot" /> LIVE PREVIEW
              </div>
              <div className="obs-lobby__hero-name">
                <span className="obs-display">
                  {preJoinName.trim() || <em className="obs-display-italic">Your name</em>}
                </span>
                {participantEmail && (
                  <span className="obs-mono obs-lobby__hero-email">{participantEmail}</span>
                )}
              </div>
            </div>
            <div className="obs-lobby__hero-corner obs-lobby__hero-corner--tl" aria-hidden />
            <div className="obs-lobby__hero-corner obs-lobby__hero-corner--tr" aria-hidden />
            <div className="obs-lobby__hero-corner obs-lobby__hero-corner--bl" aria-hidden />
            <div className="obs-lobby__hero-corner obs-lobby__hero-corner--br" aria-hidden />
          </div>
        </aside>

        <section className="obs-lobby__panel">
          <div className="obs-lobby__panel-inner">
            <header className="obs-lobby__head">
              <span className="obs-mono obs-eyebrow">— PRE&nbsp;FLIGHT</span>
              <h1 className="obs-display obs-lobby__title">
                Step <em className="obs-display-italic">into</em> the room.
              </h1>
              <p className="obs-lobby__subtitle">
                Check your name and devices. Mic and camera can be toggled inside the call &mdash; we just need at least one to begin.
              </p>
            </header>

            <form onSubmit={handlePreJoinSubmit} className="obs-form">
              <div className="obs-field">
                <label htmlFor="join-name" className="obs-field__label">
                  <span>Display name</span>
                  <span className="obs-field__hint obs-mono">REQUIRED</span>
                </label>
                <input
                  id="join-name"
                  type="text"
                  value={preJoinName}
                  onChange={(e) => setPreJoinName(e.target.value)}
                  placeholder="John Doe"
                  className="obs-input"
                  required
                  autoComplete="name"
                />
              </div>

              <div className="obs-field">
                <label htmlFor="join-email" className="obs-field__label">
                  <span>Email</span>
                  <span className="obs-field__hint obs-mono">FROM&nbsp;INVITE</span>
                </label>
                <input
                  id="join-email"
                  type="email"
                  readOnly
                  aria-readonly="true"
                  value={preJoinEmail}
                  placeholder="—"
                  className="obs-input obs-input--readonly"
                />
                <p className="obs-field__note">
                  Empty here means you&apos;ll join as a guest. Host will admit you.
                </p>
              </div>

              <div className="obs-toggles">
                <DeviceToggle
                  label="Microphone"
                  iconOn="ri-mic-line"
                  iconOff="ri-mic-off-line"
                  active={preJoinAudio}
                  disabled={preJoinRequesting}
                  onToggle={handleAudioToggle}
                />
                <DeviceToggle
                  label="Camera"
                  iconOn="ri-vidicon-line"
                  iconOff="ri-camera-off-line"
                  active={preJoinVideo}
                  disabled={preJoinRequesting}
                  onToggle={handleVideoToggle}
                />
              </div>

              {preJoinRequesting && (
                <p className="obs-status obs-status--info">
                  <span className="obs-spinner" aria-hidden /> Requesting permissions…
                </p>
              )}

              {preJoinError && (
                <div className="obs-alert">
                  <p className="obs-alert__title">{preJoinError}</p>
                  {!audioPermissionGranted && !videoPermissionGranted && (
                    <p className="obs-alert__body">
                      Allow at least one permission in your browser, then toggle the device above.
                    </p>
                  )}
                  {(audioPermissionGranted || videoPermissionGranted) &&
                    (!audioPermissionGranted || !videoPermissionGranted) && (
                      <p className="obs-alert__body obs-alert__body--ok">
                        {audioPermissionGranted && !videoPermissionGranted && "You can join with audio. Toggle camera to retry video."}
                        {!audioPermissionGranted && videoPermissionGranted && "You can join with video. Toggle mic to retry audio."}
                      </p>
                    )}
                </div>
              )}

              <div className="obs-actions">
                <a href="/" className="obs-btn obs-btn--ghost">Cancel</a>
                <button
                  type="submit"
                  disabled={preJoinRequesting || (!audioPermissionGranted && !videoPermissionGranted)}
                  className="obs-btn obs-btn--primary"
                >
                  Join meeting
                  <i className="ri-arrow-right-line" aria-hidden />
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    );
  }

  // Uninvited guest on an invite-only meeting: explicit "Ask for permission" gate.
  // Until they request, we do NOT connect them to the room (no presence, no media).
  if (knocking && !knockRequested && participantName && token) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#0B0D0E]">
        <ObsidianStudioStyles />
        <div className="obs-wait">
          <div className="obs-wait__bg" aria-hidden />
          <div className="obs-wait__grain" aria-hidden />
          <div className="obs-wait__card">
            <div className="obs-wait__pill obs-mono">
              <span className="obs-wait__pill-dot" />
              GUESTS NOT ALLOWED
            </div>
            <h1 className="obs-display obs-wait__title">
              Ask to <em className="obs-display-italic">join.</em>
            </h1>
            <p className="obs-wait__sub">
              Guests aren&apos;t allowed in this meeting. You can request access — the host will
              be notified and the room opens the moment they let you in.
            </p>

            {(participantName || participantEmail) && (
              <div className="obs-wait__identity">
                <span className="obs-mono obs-wait__identity-label">REQUESTING AS</span>
                <span className="obs-wait__identity-name">{participantName || "Guest"}</span>
                {participantEmail && (
                  <span className="obs-mono obs-wait__identity-email">{participantEmail}</span>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setKnockRequested(true);
                setWaitingForAdmission(true);
              }}
              className="obs-btn obs-btn--primary"
              style={{ marginTop: "1.25rem" }}
            >
              Ask for permission
              <i className="ri-hand-line" aria-hidden style={{ marginLeft: "0.4rem" }} />
            </button>

            <button
              type="button"
              onClick={() => {
                setKnocking(false);
                setKnockRequested(false);
                setToken("");
                setParticipantIdentity(null);
                participantIdentityRef.current = null;
                guestIdentityRef.current = null;
                setPreJoinCommitted(false);
                router.push(buildJoinRoomUrl());
              }}
              className="obs-btn obs-btn--ghost obs-wait__cancel"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Terminal: host declined this waiter. No polling, no LiveKit connection.
  if (admissionDenied) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#0B0D0E]">
        <ObsidianStudioStyles />
        <div className="obs-wait">
          <div className="obs-wait__bg" aria-hidden />
          <div className="obs-wait__grain" aria-hidden />
          <div className="obs-wait__card">
            <div className="obs-wait__pill obs-mono">
              <span className="obs-wait__pill-dot" style={{ background: "#ff5a5a" }} />
              NOT ADMITTED
            </div>
            <h1 className="obs-display obs-wait__title">
              Request <em className="obs-display-italic">declined.</em>
            </h1>
            <p className="obs-wait__sub">
              The host declined your request to join this meeting.
            </p>

            {(participantName || participantEmail) && (
              <div className="obs-wait__identity">
                <span className="obs-mono obs-wait__identity-label">REQUESTED AS</span>
                <span className="obs-wait__identity-name">{participantName || "Guest"}</span>
                {participantEmail && (
                  <span className="obs-mono obs-wait__identity-email">{participantEmail}</span>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setAdmissionDenied(false);
                setToken("");
                setParticipantIdentity(null);
                participantIdentityRef.current = null;
                guestIdentityRef.current = null;
                setPreJoinCommitted(false);
                router.push(`/join/room?room=${encodeURIComponent(roomId)}`);
              }}
              className="obs-btn obs-btn--ghost obs-wait__cancel"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Waiting for host to admit (poll-only). Do not connect to LiveKit here:
  // host waiting panel is driven by backend registry, and avoiding a second
  // LiveKit connection prevents identity/race disconnect loops.
  if (waitingForAdmission && participantName && token) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#0B0D0E]">
        <ObsidianStudioStyles />
        <div className="obs-wait">
          <div className="obs-wait__bg" aria-hidden />
          <div className="obs-wait__grain" aria-hidden />
          <div className="obs-wait__card">
            <div className="obs-wait__pill obs-mono">
              <span className="obs-wait__pill-dot" />
              AWAITING ADMISSION
            </div>
            <h1 className="obs-display obs-wait__title">
              Knock <em className="obs-display-italic">knock.</em>
            </h1>
            <p className="obs-wait__sub">
              The host has been notified. The room will open the moment they admit you.
            </p>

            <div className="obs-wait__bars" aria-hidden>
              <span style={{ animationDelay: "0ms" }} />
              <span style={{ animationDelay: "120ms" }} />
              <span style={{ animationDelay: "240ms" }} />
              <span style={{ animationDelay: "360ms" }} />
              <span style={{ animationDelay: "480ms" }} />
            </div>

            {(participantName || participantEmail) && (
              <div className="obs-wait__identity">
                <span className="obs-mono obs-wait__identity-label">JOINING AS</span>
                <span className="obs-wait__identity-name">{participantName || "Guest"}</span>
                {participantEmail && (
                  <span className="obs-mono obs-wait__identity-email">{participantEmail}</span>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (admissionPollRef.current) {
                  clearInterval(admissionPollRef.current);
                  admissionPollRef.current = null;
                }
                setWaitingForAdmission(false);
                setToken("");
                setParticipantIdentity(null);
                participantIdentityRef.current = null;
                guestIdentityRef.current = null;
                setPreJoinCommitted(false);
                router.push(`/join/room?room=${encodeURIComponent(roomId)}`);
              }}
              className="obs-btn obs-btn--ghost obs-wait__cancel"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading token
  if (isLoading && !token) {
    return <ObsLoadingScreen label="Connecting to room" />;
  }

  // Token error
  if (error && !token) {
    return (
      <div className="obs-error">
        <ObsidianStudioStyles />
        <div className="obs-error__grain" aria-hidden />
        <div className="obs-error__card">
          <span className="obs-mono obs-eyebrow obs-error__eyebrow">
            {meetingEnded ? "— SESSION CLOSED" : "— CONNECTION FAILED"}
          </span>
          <h2 className="obs-display obs-error__title">
            {meetingEnded ? (
              <>The room has <em className="obs-display-italic">closed.</em></>
            ) : (
              <>Couldn&apos;t reach the room.</>
            )}
          </h2>
          <p className="obs-error__msg">{error}</p>
          <div className="obs-actions">
            <button onClick={handleLeave} className="obs-btn obs-btn--ghost">Go back</button>
            {!meetingEnded && (
              <button onClick={fetchToken} className="obs-btn obs-btn--primary">
                Try again <i className="ri-refresh-line" aria-hidden />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // If no token but we have participant name, show loading
  if (!token) {
    if (participantName) {
      return <ObsLoadingScreen label="Connecting to room" />;
    }
    return null;
  }

  // If token exists but showRoom is false, we might be waiting
  if (!showRoom && token) {
    return <ObsLoadingScreen label="Preparing room" />;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#202124]">
      <LiveKitRoom
        key={`${reconnectKey}-${roomConnectEpoch}`}
        connect={true}
        video={videoEnabled}
        audio={audioEnabled}
        token={token}
        serverUrl={livekitUrl}
        onConnected={() => {
          setError("");
        }}
        onDisconnected={(reason) => {
          if (manualLeaveRef.current || meetingEnded) return;
          // StrictMode cleanup (CLIENT_INITIATED) and identity displacement
          // (DUPLICATE_IDENTITY) must NOT trigger a same-identity reconnect — it
          // collides with the live connection and ends stuck on "Disconnected".
          if (
            reason === DisconnectReason.CLIENT_INITIATED ||
            reason === DisconnectReason.DUPLICATE_IDENTITY
          ) {
            return;
          }
          // Host ended the meeting for everyone (server deleted the room): stop all
          // reconnect attempts and show the terminal "meeting ended" screen.
          if (reason === DisconnectReason.ROOM_DELETED) {
            handleMeetingEnded();
            return;
          }
          const now = Date.now();
          if (topLevelReconnectInFlightRef.current) return;
          if (now - lastTopLevelReconnectAtRef.current < 1500) return;
          lastTopLevelReconnectAtRef.current = now;
          topLevelReconnectInFlightRef.current = true;
          void handleReconnect().finally(() => {
            topLevelReconnectInFlightRef.current = false;
          });
        }}
        onError={handleError}
        onMediaDeviceFailure={(failure, kind) => {
          if (failure) {
            setError(
              `Failed to access ${kind || "media device"}. Please check your browser permissions.`
            );
          }
        }}
        options={{
          adaptiveStream: true,
          dynacast: true,
          publishDefaults: { videoSimulcastLayers: [] },
        }}
        data-lk-theme="default"
        className="room-page flex flex-col flex-1 min-h-0 w-full"
      >
        <PublicRoomContent
          onLeave={handleLeave}
          onMeetingEnded={handleMeetingEnded}
          onReconnect={handleReconnect}
          initialAudioEnabled={audioEnabled}
          initialVideoEnabled={videoEnabled}
          hasPermissionError={hasPermissionError}
          roomName={decodeURIComponent(roomId)}
          isHost={isHost}
          participantEmail={participantEmail || undefined}
          meetingEndAtIso={meetingEndAtIso}
        />
      </LiveKitRoom>
    </div>
  );
}
