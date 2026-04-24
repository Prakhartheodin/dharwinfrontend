"use client";

import { useState, useEffect, useRef } from "react";
import { useRoomContext } from "@livekit/components-react";
import * as livekitApi from "@/shared/lib/api/livekit";

/** Parse API / LiveKit startedAt to epoch ms (handles ns bigint-as-string, ISO, ms). */
function parseRecordingStartedAtMs(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw > 1e15 ? Math.floor(raw / 1e6) : Math.floor(raw);
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    if (/^\d+$/.test(s)) {
      if (s.length > 15) {
        try {
          return Number(BigInt(s) / 1000000n);
        } catch {
          return null;
        }
      }
      const ms = Number(s);
      return Number.isFinite(ms) ? Math.floor(ms) : null;
    }
    const t = Date.parse(s);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

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
  const localAnchorRef = useRef<number | null>(null);

  const getStatus = () =>
    hostEmail
      ? livekitApi.getRecordingStatusPublic(roomName)
      : livekitApi.getRecordingStatus(roomName);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const data = await getStatus();
        setIsRecording(data.isRecording);
        if (data.recordings && data.recordings.length > 0) {
          setEgressId(data.recordings[0].egressId);
          const startedMs = parseRecordingStartedAtMs(data.recordings[0].startedAt);
          if (startedMs != null && Number.isFinite(startedMs)) {
            setRecordingStartTime(startedMs);
          } else if (data.isRecording && localAnchorRef.current != null) {
            setRecordingStartTime(localAnchorRef.current);
          }
        } else {
          setRecordingStartTime(null);
          localAnchorRef.current = null;
        }
      } catch (err) {
        console.error("Error checking recording status:", err);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
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
      setIsRecording(true);
      setEgressId(data.egressId);
      const now = Date.now();
      localAnchorRef.current = now;
      setRecordingStartTime(now);
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
      setIsRecording(false);
      setEgressId(null);
      setRecordingStartTime(null);
      localAnchorRef.current = null;
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
        {showStopConfirm && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-[#1a1a1f] rounded-xl p-5 shadow-xl max-w-sm w-full border border-white/10">
              <p className="text-white font-medium mb-1">Stop recording?</p>
              <p className="text-gray-400 text-sm mb-4">The recording will be saved and available in the recordings list.</p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowStopConfirm(false)}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStopRecording}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50"
                >
                  {isLoading ? "Stopping…" : "Stop recording"}
                </button>
              </div>
            </div>
          </div>
        )}
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
      {showStopConfirm && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[#1a1a1f] rounded-xl p-5 shadow-xl max-w-sm w-full border border-white/10">
            <p className="text-white font-medium mb-1">Stop recording?</p>
            <p className="text-gray-400 text-sm mb-4">The recording will be saved and available in the recordings list.</p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowStopConfirm(false)}
                className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStopRecording}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50"
              >
                {isLoading ? "Stopping…" : "Stop recording"}
              </button>
            </div>
          </div>
        </div>
      )}
      {error && (
        <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-xs">
          {error}
        </div>
      )}
    </div>
  );
}
