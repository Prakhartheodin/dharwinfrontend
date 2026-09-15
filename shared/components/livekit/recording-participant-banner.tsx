"use client";

import { useEffect, useState } from "react";
import { useParticipants } from "@livekit/components-react";
import { fetchRecordingStatus } from "./recording-api";
import { isRecordingActive } from "./recording-status";

interface RecordingParticipantBannerProps {
  roomName: string;
  /** Public join rooms must poll the unauthenticated status endpoint for all participants. */
  usePublicStatusApi?: boolean;
  /** When an AI agent participant is in the room. */
  aiAssistantConnected?: boolean;
}

/**
 * Persistent top banner for all participants while a room recording is active.
 * Polls the existing public/authenticated recording status API every 5s.
 */
export function RecordingParticipantBanner({
  roomName,
  usePublicStatusApi = false,
  aiAssistantConnected = false,
}: RecordingParticipantBannerProps) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const data = await fetchRecordingStatus(roomName, usePublicStatusApi);
        setActive(isRecordingActive(data));
      } catch {
        // Transient poll failure — keep last known state.
      }
    };

    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, [roomName, usePublicStatusApi]);

  if (!active) return null;

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        className="recording-participant-banner"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 110,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          padding: "0.5rem 1rem",
          background: "rgba(127,29,29,0.92)",
          borderBottom: "1px solid rgba(248,113,113,0.35)",
          color: "#fecaca",
          fontSize: "0.8125rem",
          fontWeight: 600,
          letterSpacing: "0.02em",
          pointerEvents: "none",
        }}
      >
        <span
          className="recording-participant-banner__dot"
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: "#f87171",
            flexShrink: 0,
            animation: "recordingBannerPulse 2s ease-in-out infinite",
          }}
        />
        This meeting is being recorded
        {aiAssistantConnected && (
          <span className="opacity-90 font-normal"> · AI assistant is listening to assist with notes</span>
        )}
      </div>
      <style>{`
        @keyframes recordingBannerPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        @media (prefers-reduced-motion: reduce) {
          .recording-participant-banner__dot {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
}

/** Use inside LiveKitRoom — detects connected agent participants for the AI indicator. */
export function LiveKitAiRecordingBanner(
  props: Omit<RecordingParticipantBannerProps, "aiAssistantConnected">
) {
  const participants = useParticipants();
  const aiAssistantConnected = participants.some((p) => {
    const id = (p.identity || "").toLowerCase();
    const name = (p.name || "").toLowerCase();
    return id.includes("agent") || name.includes("agent") || id.startsWith("lk-");
  });
  return <RecordingParticipantBanner {...props} aiAssistantConnected={aiAssistantConnected} />;
}
