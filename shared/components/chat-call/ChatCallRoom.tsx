"use client";

/**
 * Chat-call-only pieces of the LiveKit room page (meeting-room-client.tsx):
 * - ChatAudioCallStage: dedicated layout for audio calls (video=0) instead of the video grid.
 * - ChatCallErrorScreen: connection failure with Retry / Close.
 * Meetings and interviews never render these.
 */

import React, { useEffect, useState } from "react";
import {
  MediaDeviceMenu,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  useSpeakingParticipants,
} from "@livekit/components-react";
import { initialsOf } from "@/shared/components/chat-call/callState";

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const ROUND_CONTROL =
  "flex h-14 w-14 items-center justify-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 disabled:opacity-50";

/** Audio-only chat call: participant avatars with speaking/muted state, timer, and controls. */
export function ChatAudioCallStage({ elapsedSeconds }: { elapsedSeconds: number }) {
  const room = useRoomContext();
  const participants = useParticipants();
  const speaking = useSpeakingParticipants();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const [micBusy, setMicBusy] = useState(false);
  const [canPickSpeaker, setCanPickSpeaker] = useState(false);

  useEffect(() => {
    // Output-device selection needs setSinkId (Chromium). Elsewhere the menu would be empty.
    setCanPickSpeaker(typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype);
  }, []);

  const speakingIds = new Set(speaking.map((p) => p.identity));
  const others = participants.filter((p) => p.identity !== localParticipant.identity);
  const alone = others.length === 0;

  const toggleMic = async () => {
    setMicBusy(true);
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch {
      /* device errors surface through LiveKitRoom onMediaDeviceFailure */
    } finally {
      setMicBusy(false);
    }
  };

  // Disconnecting fires CLIENT_INITIATED, which RoomContent already turns into "You left" + onLeave.
  const leaveCall = () => {
    void room.disconnect();
  };

  const duration = formatDuration(elapsedSeconds);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-between px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-16 text-white">
      <div className="text-center">
        <p className="text-sm font-medium text-white/60">Voice call</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight" aria-label={`Call duration ${duration}`}>
          {duration}
        </p>
        <p className="mt-1 text-sm text-white/60" aria-live="polite">
          {alone ? "Waiting for others to join…" : `${participants.length} on the call`}
        </p>
      </div>

      <ul className="my-8 flex max-w-3xl flex-wrap items-start justify-center gap-8" aria-label="Participants">
        {participants.map((p) => {
          const isLocal = p.identity === localParticipant.identity;
          const name = (p.name || p.identity || "Participant").trim();
          const isSpeaking = speakingIds.has(p.identity);
          const micOn = p.isMicrophoneEnabled;
          return (
            <li key={p.identity} className="flex w-28 flex-col items-center gap-3 text-center">
              <span className="relative inline-flex">
                <span
                  className={`flex h-24 w-24 items-center justify-center rounded-full bg-white/10 text-3xl font-semibold ring-4 transition-shadow duration-200 motion-reduce:transition-none ${
                    isSpeaking ? "ring-emerald-400" : "ring-white/10"
                  }`}
                  aria-hidden
                >
                  {initialsOf(name)}
                </span>
                {!micOn && (
                  <span
                    className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white ring-2 ring-[#0f1012]"
                    aria-hidden
                  >
                    <i className="ri-mic-off-line text-base" />
                  </span>
                )}
              </span>
              <span className="w-full truncate text-sm font-medium">
                {name}
                {isLocal ? " (you)" : ""}
              </span>
              {/* Text state so colour is never the only signal. */}
              <span className="-mt-2 text-xs text-white/60">
                {!micOn ? "Muted" : isSpeaking ? "Speaking" : " "}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex items-start justify-center gap-6" role="toolbar" aria-label="Call controls">
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={toggleMic}
            disabled={micBusy}
            aria-pressed={!isMicrophoneEnabled}
            aria-label={isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"}
            className={`${ROUND_CONTROL} ${
              isMicrophoneEnabled
                ? "bg-white/10 hover:bg-white/20 focus-visible:ring-white/30"
                : "bg-white text-[#0f1012] hover:bg-white/90 focus-visible:ring-white/40"
            }`}
          >
            <i className={`${isMicrophoneEnabled ? "ri-mic-line" : "ri-mic-off-line"} text-2xl`} aria-hidden />
          </button>
          <span className="text-xs text-white/70">{isMicrophoneEnabled ? "Mute" : "Unmute"}</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <MediaDeviceMenu
            kind="audioinput"
            aria-label="Choose microphone"
            className={`${ROUND_CONTROL} bg-white/10 hover:bg-white/20 focus-visible:ring-white/30`}
          >
            <i className="ri-settings-3-line text-2xl" aria-hidden />
          </MediaDeviceMenu>
          <span className="text-xs text-white/70">Microphone</span>
        </div>

        {canPickSpeaker && (
          <div className="flex flex-col items-center gap-2">
            <MediaDeviceMenu
              kind="audiooutput"
              aria-label="Choose speaker"
              className={`${ROUND_CONTROL} bg-white/10 hover:bg-white/20 focus-visible:ring-white/30`}
            >
              <i className="ri-volume-up-line text-2xl" aria-hidden />
            </MediaDeviceMenu>
            <span className="text-xs text-white/70">Speaker</span>
          </div>
        )}

        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={leaveCall}
            aria-label="Leave call"
            className={`${ROUND_CONTROL} bg-red-500 hover:bg-red-600 focus-visible:ring-red-400/50`}
          >
            <i className="ri-phone-fill rotate-[135deg] text-2xl" aria-hidden />
          </button>
          <span className="text-xs text-white/70">Leave</span>
        </div>
      </div>
    </div>
  );
}

/** Chat call could not connect — clear message, Retry and Close. */
export function ChatCallErrorScreen({
  message,
  onRetry,
  onClose,
}: {
  message: string;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f1012] p-4">
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center"
        role="alert"
        aria-labelledby="chat-call-error-title"
      >
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20">
          <i className="ri-error-warning-line text-2xl text-red-400" aria-hidden />
        </div>
        <h2 id="chat-call-error-title" className="mb-2 text-xl font-bold text-white">
          Couldn&apos;t connect the call
        </h2>
        <p className="mb-8 text-sm text-gray-400">{message}</p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
          >
            <i className="ri-refresh-line text-base" aria-hidden />
            Retry
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-white/20 px-5 text-sm font-semibold text-gray-200 transition-colors duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
