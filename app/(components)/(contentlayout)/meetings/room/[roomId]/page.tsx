"use client";

import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { ConnectionState, DisconnectReason, RoomEvent } from "livekit-client";
import { RecordingButton } from "@/shared/components/livekit/recording-button";
import * as livekitApi from "@/shared/lib/api/livekit";

const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 10000; // 10 seconds

function RoomContent({
  onLeave,
  onReconnect,
  initialAudioEnabled,
  initialVideoEnabled,
  hasPermissionError,
  roomName,
}: {
  onLeave: () => void;
  onReconnect: () => void;
  initialAudioEnabled: boolean;
  initialVideoEnabled: boolean;
  hasPermissionError: boolean;
  roomName: string;
}) {
  const room = useRoomContext();
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManuallyLeavingRef = useRef(false);
  const connectionStateRef = useRef<ConnectionState>(room.state);
  const appliedInitialMediaRef = useRef(false);
  const initialMediaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    const handleDisconnect = (reason?: DisconnectReason) => {
      if (isManuallyLeavingRef.current) {
        console.log("Manual disconnect, not reconnecting");
        return;
      }

      if (reason === DisconnectReason.CLIENT_INITIATED) {
        console.log("Client initiated disconnect, not reconnecting");
        isManuallyLeavingRef.current = true;
        setTimeout(() => onLeave(), 500);
        return;
      }

      if (hasPermissionError) {
        console.log("Permission error detected, not reconnecting");
        return;
      }

      console.log("Unexpected disconnect, reason:", reason);

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        setReconnecting(true);
        const delay = Math.min(
          INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts),
          MAX_RECONNECT_DELAY
        );

        console.log(
          `Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`
        );

        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempts((prev) => prev + 1);
          onReconnect();
        }, delay);
      } else {
        console.error("Max reconnection attempts reached");
        setReconnecting(false);
        setTimeout(() => {
          if (!isManuallyLeavingRef.current) {
            onLeave();
          }
        }, 2000);
      }
    };

    const handleConnectionStateChange = (state: ConnectionState) => {
      const previousState = connectionStateRef.current;
      console.log("Connection state changed:", state, "Previous:", previousState);
      connectionStateRef.current = state;

      if (state === ConnectionState.Connected) {
        setReconnecting(false);
        setReconnectAttempts(0);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      } else if (state === ConnectionState.Disconnected) {
        if (previousState !== ConnectionState.Disconnected) {
          handleDisconnect();
        }
      } else if (state === ConnectionState.Reconnecting) {
        setReconnecting(true);
      }
    };

    room.on("disconnected", handleDisconnect);
    room.on("connectionStateChanged", handleConnectionStateChange);

    if (
      room.state === ConnectionState.Disconnected &&
      !isManuallyLeavingRef.current
    ) {
      handleDisconnect();
    }

    return () => {
      room.off("disconnected", handleDisconnect);
      room.off("connectionStateChanged", handleConnectionStateChange);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [room, reconnectAttempts, onLeave, onReconnect, hasPermissionError]);

  useEffect(() => {
    const handleConnected = () => {
      if (appliedInitialMediaRef.current) return;
      appliedInitialMediaRef.current = true;
      const localP = room.localParticipant;
      initialMediaTimeoutRef.current = setTimeout(() => {
        if (initialAudioEnabled === false) {
          localP.setMicrophoneEnabled(false).catch(() => {});
        }
        if (initialVideoEnabled === false) {
          localP.setCameraEnabled(false).catch(() => {});
        }
        initialMediaTimeoutRef.current = null;
      }, 150);
    };
    room.on(RoomEvent.Connected, handleConnected);
    return () => {
      room.off(RoomEvent.Connected, handleConnected);
      if (initialMediaTimeoutRef.current)
        clearTimeout(initialMediaTimeoutRef.current);
    };
  }, [room, initialAudioEnabled, initialVideoEnabled]);

  return (
    <div className="room-meeting-container" style={{ position: "relative" }}>
      <VideoConference />
      <RoomAudioRenderer />
      <div
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          zIndex: 1000,
        }}
      >
        <RecordingButton roomName={roomName} />
      </div>
      {reconnecting && (
        <div
          className="absolute inset-0 bg-black/50 flex items-center justify-center z-50"
          style={{ position: "absolute" }}
        >
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Reconnecting...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MeetingRoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [reconnectKey, setReconnectKey] = useState(0);
  const [hasPermissionError, setHasPermissionError] = useState(false);

  const roomId = params.roomId as string;
  const participantName = useMemo(() => {
    return (
      searchParams.get("name") || `user-${Math.random().toString(36).substr(2, 9)}`
    );
  }, [searchParams]);

  const audioEnabled = useMemo(
    () => searchParams.get("audio") !== "0",
    [searchParams]
  );
  const videoEnabled = useMemo(
    () => searchParams.get("video") !== "0",
    [searchParams]
  );

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  const fetchToken = useCallback(async () => {
    if (!livekitUrl) {
      setError("LiveKit URL not configured");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      const roomName = decodeURIComponent(roomId);
      const data = await livekitApi.getLiveKitToken(roomName, participantName);
      setToken(data.token);
    } catch (err: any) {
      console.error("Error fetching token:", err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to connect to room";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, participantName, livekitUrl]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken, reconnectKey]);

  const handleLeave = useCallback(() => {
    router.push("/meetings/pre-join/");
  }, [router]);

  const handleDisconnect = useCallback(() => {
    console.log("Disconnected from room - RoomContent will handle reconnection");
  }, []);

  const handleError = useCallback((error: Error) => {
    console.error("LiveKit connection error:", error);
    const errorMessage = error.message.toLowerCase();
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
      return;
    }
  }, []);

  const handleReconnect = useCallback(async () => {
    try {
      setIsLoading(true);
      const roomName = decodeURIComponent(roomId);
      const data = await livekitApi.getLiveKitToken(roomName, participantName);
      setToken(data.token);
      setReconnectKey((prev) => prev + 1);
    } catch (err) {
      console.error("Error fetching token during reconnect:", err);
      setTimeout(() => handleReconnect(), INITIAL_RECONNECT_DELAY);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, participantName]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Connecting to room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-red-900 border border-red-700 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-white mb-2">Connection Error</h2>
          <p className="text-red-200 mb-4">{error}</p>
          <div className="flex gap-2">
            <button
              onClick={fetchToken}
              className="ti-btn ti-btn-primary"
            >
              Retry
            </button>
            <button
              onClick={handleLeave}
              className="ti-btn ti-btn-danger"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return null;
  }

  return (
    <LiveKitRoom
      key={reconnectKey}
      video={videoEnabled}
      audio={audioEnabled}
      token={token}
      serverUrl={livekitUrl}
      onDisconnected={handleDisconnect}
      onError={handleError}
      onMediaDeviceFailure={(failure, kind) => {
        console.error("Media device failure:", failure, kind);
        if (failure) {
          setError(
            `Failed to access ${kind || "media device"}. Please check your browser permissions.`
          );
        }
      }}
      options={{
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: {
          videoSimulcastLayers: [],
        },
      }}
      data-lk-theme="default"
      className="room-page h-screen"
    >
      <RoomContent
        onLeave={handleLeave}
        onReconnect={handleReconnect}
        initialAudioEnabled={audioEnabled}
        initialVideoEnabled={videoEnabled}
        hasPermissionError={hasPermissionError}
        roomName={decodeURIComponent(roomId)}
      />
    </LiveKitRoom>
  );
}
