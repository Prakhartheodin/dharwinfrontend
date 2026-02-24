"use client";

import { useState, useEffect } from "react";
import { useRoomContext } from "@livekit/components-react";
import * as livekitApi from "@/shared/lib/api/livekit";

interface RecordingButtonProps {
  roomName: string;
  /** When provided, use public recording API (for hosts joining without login) */
  hostEmail?: string;
  /** When true, renders compact style matching control bar (mic, camera, etc.) */
  controlBar?: boolean;
  /** Called when recording has successfully started */
  onRecordingStarted?: () => void;
}

export function RecordingButton({ roomName, hostEmail, controlBar = false, onRecordingStarted }: RecordingButtonProps) {
  const room = useRoomContext();
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [egressId, setEgressId] = useState<string | null>(null);

  const getStatus = () =>
    hostEmail
      ? livekitApi.getRecordingStatusPublic(roomName)
      : livekitApi.getRecordingStatus(roomName);

  // Check recording status on mount and periodically
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const data = await getStatus();
        setIsRecording(data.isRecording);
        if (data.recordings && data.recordings.length > 0) {
          setEgressId(data.recordings[0].egressId);
        }
      } catch (err) {
        console.error("Error checking recording status:", err);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);

    return () => clearInterval(interval);
  }, [roomName, hostEmail]);

  const handleStartRecording = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = hostEmail
        ? await livekitApi.startRecordingPublic(roomName, hostEmail)
        : await livekitApi.startRecording(roomName);
      setIsRecording(true);
      setEgressId(data.egressId);
      onRecordingStarted?.();
    } catch (err: any) {
      console.error("Error starting recording:", err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to start recording";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopRecording = async () => {
    if (!egressId) {
      setError("No active recording found");
      return;
    }

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
    } catch (err: any) {
      console.error("Error stopping recording:", err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to stop recording";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  };

  const buttonContent = (
    <>
      {isRecording ? (
        <>
          <span
            className="inline-block w-2 h-2 rounded-full bg-white animate-pulse flex-shrink-0"
            style={{ animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}
          />
          {!controlBar && <span>Stop Recording</span>}
        </>
      ) : (
        <>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="flex-shrink-0"
          >
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <circle cx="8" cy="8" r="3" fill="currentColor" />
          </svg>
          {!controlBar && <span>Record</span>}
        </>
      )}
    </>
  );

  if (controlBar) {
    return (
      <div className="recording-control-inline">
        <button
          onClick={handleToggleRecording}
          disabled={isLoading}
          className={`lk-button ${isRecording ? "recording-active" : ""}`}
          title={isRecording ? "Stop Recording" : "Start Recording"}
          aria-label={isRecording ? "Stop Recording" : "Start Recording"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.375rem",
            padding: "0.5rem 0.75rem",
            minWidth: "40px",
            height: "40px",
            background: isRecording ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.1)",
            color: isRecording ? "#f87171" : "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {buttonContent}
        </button>
        {error && (
          <span className="text-danger text-xs block mt-1" title={error}>
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="recording-control">
      <button
        onClick={handleToggleRecording}
        disabled={isLoading}
        className={`ti-btn ${isRecording ? "ti-btn-danger" : "ti-btn-primary"} ${isLoading ? "ti-btn-loading" : ""}`}
        title={isRecording ? "Stop Recording" : "Start Recording"}
        style={{ display: "flex", alignItems: "center", gap: "8px" }}
      >
        {buttonContent}
      </button>
      {error && (
        <div className="mt-2 p-2 bg-danger/10 border border-danger/20 rounded text-danger text-sm" style={{ fontSize: "12px" }}>
          {error}
        </div>
      )}
    </div>
  );
}
