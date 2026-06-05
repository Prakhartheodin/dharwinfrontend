"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRoomContext } from "@livekit/components-react";
import * as livekitApi from "@/shared/lib/api/livekit";
import {
  reconcileRecordingState,
  IDLE_RECORDING_STATE,
  type RecordingUiState,
} from "./recording-state";

interface RecordingButtonProps {
  roomName: string;
  hostEmail?: string;
  controlBar?: boolean;
  onRecordingStarted?: () => void;
}

export function RecordingButton({ roomName, hostEmail, controlBar = false, onRecordingStarted }: RecordingButtonProps) {
  useRoomContext();
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [egressId, setEgressId] = useState<string | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  // Source of truth for the poll reducer. The 5s interval closure can't see the
  // latest React state, so it reads/writes this ref; applyState mirrors it to state.
  const stateRef = useRef<RecordingUiState>(IDLE_RECORDING_STATE);

  const applyState = (next: RecordingUiState) => {
    stateRef.current = next;
    setIsRecording(next.isRecording);
    setEgressId(next.egressId);
    setRecordingStartTime(next.startTime);
  };

  const getStatus = () =>
    hostEmail
      ? livekitApi.getRecordingStatusPublic(roomName)
      : livekitApi.getRecordingStatus(roomName);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const data = await getStatus();
        applyState(reconcileRecordingState(stateRef.current, data, Date.now()));
      } catch (err) {
        console.error("Error checking recording status:", err);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, hostEmail]);

  useEffect(() => {
    const anchor = recordingStartTime;
    if (!isRecording || anchor == null || !Number.isFinite(anchor)) {
      setElapsedSeconds(0);
      return;
    }
    const tick = () => {
      const elapsed = Math.floor((Date.now() - anchor) / 1000);
      setElapsedSeconds(Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isRecording, recordingStartTime]);

  const formatDuration = (totalSeconds: number) => {
    const sec = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleStartRecording = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = hostEmail
        ? await livekitApi.startRecordingPublic(roomName, hostEmail)
        : await livekitApi.startRecording(roomName);
      applyState({ isRecording: true, egressId: data.egressId, startTime: Date.now(), missCount: 0 });
      onRecordingStarted?.();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message || e?.message || "Failed to start recording");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopRecording = async () => {
    if (!egressId) {
      setError("No active recording found");
      return;
    }
    setShowStopConfirm(false);
    setIsLoading(true);
    setError(null);
    try {
      if (hostEmail) {
        await livekitApi.stopRecordingPublic(egressId, roomName, hostEmail);
      } else {
        await livekitApi.stopRecording(egressId, roomName);
      }
      applyState(IDLE_RECORDING_STATE);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message || e?.message || "Failed to stop recording");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      setShowStopConfirm(true);
    } else {
      handleStartRecording();
    }
  };

  const recordIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="8" />
    </svg>
  );

  const buttonContent = (
    <>
      {isRecording ? (
        <>
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", backgroundColor: controlBar ? "#f87171" : "#fff", flexShrink: 0, animation: "pulse 2s infinite" }} />
          {controlBar && (
            <span style={{ fontSize: "0.75rem", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
              REC {formatDuration(elapsedSeconds)}
            </span>
          )}
          {!controlBar && <span>Stop Recording</span>}
        </>
      ) : (
        <>
          {recordIcon}
          {!controlBar && <span>Record</span>}
        </>
      )}
    </>
  );

  if (controlBar) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
        <button
          type="button"
          onClick={handleToggleRecording}
          disabled={isLoading}
          className="lk-button"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.375rem",
            padding: "0.625rem 0.75rem",
            border: "none",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.6 : 1,
            backgroundColor: isRecording ? "rgba(239,68,68,0.2)" : undefined,
            color: isRecording ? "#f87171" : undefined,
            whiteSpace: "nowrap",
            fontSize: "inherit",
            lineHeight: "inherit",
          }}
          title={isRecording ? "Stop Recording" : "Start Recording"}
          aria-label={isRecording ? "Stop Recording" : "Start Recording"}
        >
          {buttonContent}
        </button>
        {error && (
          <span style={{ color: "#f87171", fontSize: "0.75rem", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={error}>
            {error}
          </span>
        )}
        <StopRecordingDialog
          open={showStopConfirm}
          loading={isLoading}
          onCancel={() => setShowStopConfirm(false)}
          onConfirm={handleStopRecording}
        />
      </div>
    );
  }

  return (
    <div className="recording-control">
      <button
        type="button"
        onClick={handleToggleRecording}
        disabled={isLoading}
        className={`ti-btn inline-flex items-center gap-2 ${isRecording ? "ti-btn-danger" : "ti-btn-primary"} ${isLoading ? "opacity-60" : ""}`}
        title={isRecording ? "Stop Recording" : "Start Recording"}
      >
        {buttonContent}
      </button>
      <StopRecordingDialog
        open={showStopConfirm}
        loading={isLoading}
        onCancel={() => setShowStopConfirm(false)}
        onConfirm={handleStopRecording}
      />
      {error && (
        <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-xs">
          {error}
        </div>
      )}
    </div>
  );
}

/**
 * Stop-recording confirmation. Portaled to document.body so it escapes
 * the control-bar's `backdrop-filter` containing block (which would otherwise
 * anchor `position: fixed` to the bar instead of the viewport, parking the
 * dialog at the bottom of the screen).
 */
function StopRecordingDialog({
  open,
  loading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 3000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(6,7,10,0.72)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        animation: "obsFade 160ms ease-out",
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(420px, calc(100vw - 2rem))",
          padding: "1.75rem",
          background: "rgba(20,23,26,0.92)",
          backdropFilter: "blur(24px) saturate(140%)",
          WebkitBackdropFilter: "blur(24px) saturate(140%)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "18px",
          boxShadow: "0 30px 80px -20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)",
          fontFamily: "var(--obs-font-body, 'Manrope', system-ui, sans-serif)",
          color: "#f4f5f6",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "5px 10px",
            background: "rgba(255,82,82,0.1)",
            border: "1px solid rgba(255,82,82,0.28)",
            borderRadius: "999px",
            fontFamily: "var(--obs-font-mono, ui-monospace, monospace)",
            fontSize: "10px",
            letterSpacing: "0.16em",
            color: "#ff8a8a",
            marginBottom: "1rem",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#ff5252",
              boxShadow: "0 0 8px #ff5252",
              animation: "obsPulse 1.4s ease-in-out infinite",
            }}
          />
          RECORDING ACTIVE
        </div>
        <h3
          style={{
            fontFamily: "var(--obs-font-display, 'Fraunces', serif)",
            fontSize: "1.6rem",
            fontWeight: 500,
            letterSpacing: "-0.02em",
            margin: "0 0 0.5rem",
            lineHeight: 1.1,
          }}
        >
          Stop the recording?
        </h3>
        <p style={{ fontSize: "13px", color: "#a8acb1", lineHeight: 1.55, margin: "0 0 1.5rem" }}>
          The file will be saved and added to the recordings list. You can start a new recording at any time.
        </p>
        <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "0.7rem 1.2rem",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: "10px",
              color: "#a8acb1",
              fontSize: "13px",
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
              letterSpacing: "-0.005em",
            }}
          >
            Keep recording
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: "0.7rem 1.2rem",
              background: loading
                ? "rgba(120,30,30,0.5)"
                : "linear-gradient(180deg, #ff5252, #d62a2a)",
              border: "1px solid rgba(255,120,120,0.4)",
              borderRadius: "10px",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: "-0.005em",
              boxShadow: loading ? "none" : "0 8px 24px -8px rgba(255,82,82,0.5)",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Stopping…" : "Stop recording"}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes obsFade { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>,
    document.body
  );
}
