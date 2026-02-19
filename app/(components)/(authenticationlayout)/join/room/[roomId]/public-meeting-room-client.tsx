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
import * as livekitApi from "@/shared/lib/api/livekit";

const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 10000;

function PublicRoomContent({
  onLeave,
  onReconnect,
  initialAudioEnabled,
  initialVideoEnabled,
  hasPermissionError,
}: {
  onLeave: () => void;
  onReconnect: () => void;
  initialAudioEnabled: boolean;
  initialVideoEnabled: boolean;
  hasPermissionError: boolean;
}) {
  const room = useRoomContext();
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManuallyLeavingRef = useRef(false);
  const connectionStateRef = useRef<ConnectionState>(room.state);
  const appliedInitialMediaRef = useRef(false);
  const initialMediaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleDisconnect = (reason?: DisconnectReason) => {
      if (isManuallyLeavingRef.current) return;
      if (reason === DisconnectReason.CLIENT_INITIATED) {
        isManuallyLeavingRef.current = true;
        setTimeout(() => onLeave(), 500);
        return;
      }
      if (hasPermissionError) return;
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
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
        setTimeout(() => {
          if (!isManuallyLeavingRef.current) onLeave();
        }, 2000);
      }
    };

    const handleConnectionStateChange = (state: ConnectionState) => {
      const previousState = connectionStateRef.current;
      connectionStateRef.current = state;
      if (state === ConnectionState.Connected) {
        setReconnecting(false);
        setReconnectAttempts(0);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      } else if (state === ConnectionState.Disconnected) {
        if (previousState !== ConnectionState.Disconnected) handleDisconnect();
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
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [room, reconnectAttempts, onLeave, onReconnect, hasPermissionError]);

  useEffect(() => {
    const handleConnected = () => {
      if (appliedInitialMediaRef.current) return;
      appliedInitialMediaRef.current = true;
      const localP = room.localParticipant;
      initialMediaTimeoutRef.current = setTimeout(() => {
        if (initialAudioEnabled === false) localP.setMicrophoneEnabled(false).catch(() => {});
        if (initialVideoEnabled === false) localP.setCameraEnabled(false).catch(() => {});
        initialMediaTimeoutRef.current = null;
      }, 150);
    };
    room.on(RoomEvent.Connected, handleConnected);
    return () => {
      room.off(RoomEvent.Connected, handleConnected);
      if (initialMediaTimeoutRef.current) clearTimeout(initialMediaTimeoutRef.current);
    };
  }, [room, initialAudioEnabled, initialVideoEnabled]);

  return (
    <>
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
          background: #202124;
        }
        .room-meeting-container .lk-video-conference {
          flex: 1;
          min-height: 0;
        }
        .room-meeting-container .lk-video-conference-inner {
          flex: 1;
          min-height: 0;
        }
        .room-meeting-container .lk-focus-layout-wrapper,
        .room-meeting-container .lk-grid-layout-wrapper {
          flex: 1;
          min-height: 0;
        }
        .room-meeting-container .lk-grid-layout {
          min-height: 0;
        }
        .room-meeting-container .lk-control-bar {
          flex-shrink: 0;
          background: #202124;
          border-top-color: rgba(255,255,255,0.12);
        }
        .room-meeting-container .lk-participant-tile {
          min-height: 120px;
        }
        @media (max-width: 640px) {
          .room-meeting-container .lk-control-bar {
            padding-left: max(0.75rem, env(safe-area-inset-left));
            padding-right: max(0.75rem, env(safe-area-inset-right));
            padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
          }
          .room-meeting-container .lk-grid-layout {
            grid-gap: 0.25rem;
            padding: 0.25rem;
          }
        }
      `}} />
      <div className="room-meeting-container relative flex flex-col h-full min-h-0 w-full">
        <VideoConference />
        <RoomAudioRenderer />
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

export default function PublicMeetingRoomClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = (params?.roomId as string) || "";
  const nameFromQuery = searchParams.get("name")?.trim();

  const [showRoom, setShowRoom] = useState(false);
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [reconnectKey, setReconnectKey] = useState(0);
  const [hasPermissionError, setHasPermissionError] = useState(false);

  // Pre-join form state (when no name in URL)
  const [preJoinName, setPreJoinName] = useState("");
  const [preJoinAudio, setPreJoinAudio] = useState(false);
  const [preJoinVideo, setPreJoinVideo] = useState(false);
  const [preJoinError, setPreJoinError] = useState("");
  const [preJoinRequesting, setPreJoinRequesting] = useState(false);
  const [audioPermissionGranted, setAudioPermissionGranted] = useState(false);
  const [videoPermissionGranted, setVideoPermissionGranted] = useState(false);
  const permissionRequestedOnLoadRef = useRef(false);

  const participantName = useMemo(() => nameFromQuery || "", [nameFromQuery]);
  const audioEnabled = useMemo(
    () => (nameFromQuery ? searchParams.get("audio") !== "0" : preJoinAudio),
    [nameFromQuery, searchParams, preJoinAudio]
  );
  const videoEnabled = useMemo(
    () => (nameFromQuery ? searchParams.get("video") !== "0" : preJoinVideo),
    [nameFromQuery, searchParams, preJoinVideo]
  );

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  // Request browser audio/video permission when pre-join page opens (before join), like L5-working
  useEffect(() => {
    if (participantName) return; // Already in room or past pre-join
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
  }, [participantName]);

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
      setPreJoinError("");
      const params = new URLSearchParams();
      params.set("name", name);
      params.set("audio", preJoinAudio ? "1" : "0");
      params.set("video", preJoinVideo ? "1" : "0");
      router.push(`/join/room/${encodeURIComponent(roomId)}?${params.toString()}`);
    },
    [roomId, router, preJoinName, preJoinAudio, preJoinVideo, audioPermissionGranted, videoPermissionGranted]
  );

  const fetchToken = useCallback(async () => {
    if (!livekitUrl || !participantName) {
      setShowRoom(false);
      return;
    }
    try {
      setIsLoading(true);
      setError("");
      const roomName = decodeURIComponent(roomId);
      const data = await livekitApi.getPublicLiveKitToken(roomName, participantName);
      setToken(data.token);
      setShowRoom(true);
    } catch (err: any) {
      console.error("Error fetching token:", err);
      setError(
        err?.response?.data?.message || err?.message || "Failed to connect to room"
      );
    } finally {
      setIsLoading(false);
    }
  }, [roomId, participantName, livekitUrl]);

  useEffect(() => {
    if (participantName && livekitUrl && !showRoom && !token) {
      fetchToken();
    }
  }, [participantName, livekitUrl, showRoom, token, fetchToken]);

  const handleLeave = useCallback(() => {
    router.push(`/join/room/${encodeURIComponent(roomId)}`);
  }, [router, roomId]);

  const handleReconnect = useCallback(async () => {
    if (!participantName || !roomId) return;
    try {
      setIsLoading(true);
      const roomName = decodeURIComponent(roomId);
      const data = await livekitApi.getPublicLiveKitToken(roomName, participantName);
      setToken(data.token);
      setReconnectKey((prev) => prev + 1);
    } catch (err) {
      console.error("Error fetching token during reconnect:", err);
      setTimeout(() => handleReconnect(), INITIAL_RECONNECT_DELAY);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, participantName]);

  const handleError = useCallback((error: Error) => {
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
    }
  }, []);

  // No name in URL: show pre-join form
  if (!participantName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="w-full max-w-md bg-gray-800 rounded-xl p-6 shadow-xl">
          <h1 className="text-xl font-semibold text-white mb-2">Join Meeting</h1>
          <p className="text-gray-400 text-sm mb-6">
            Enter your name. Browser will ask for microphone and camera permission when this page opens. At least one (audio or video) is required to join. In the meeting you can mute/unmute and turn video on/off.
          </p>
          <form onSubmit={handlePreJoinSubmit} className="space-y-4">
            <div>
              <label htmlFor="join-name" className="block text-sm font-medium text-gray-300 mb-1">
                Your name <span className="text-red-400">*</span>
              </label>
              <input
                id="join-name"
                type="text"
                value={preJoinName}
                onChange={(e) => setPreJoinName(e.target.value)}
                placeholder="e.g. John Doe"
                className="form-control !py-2 w-full border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-primary"
                required
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center justify-end gap-2 sm:justify-between">
                <i
                  className={`text-lg ${preJoinAudio ? "ri-mic-line text-primary" : "ri-mic-off-line text-gray-500"}`}
                  title={preJoinAudio ? "Unmuted" : "Muted"}
                  aria-hidden
                />
                <button
                  type="button"
                  role="switch"
                  aria-checked={preJoinAudio}
                  aria-label={preJoinAudio ? "Microphone on" : "Microphone off"}
                  disabled={preJoinRequesting}
                  onClick={handleAudioToggle}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed ${
                    preJoinAudio ? "bg-primary" : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                      preJoinAudio ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-end gap-2 sm:justify-between">
                <i
                  className={`text-lg ${preJoinVideo ? "ri-vidicon-line text-primary" : "ri-camera-off-line text-gray-500"}`}
                  title={preJoinVideo ? "Video on" : "Video off"}
                  aria-hidden
                />
                <button
                  type="button"
                  role="switch"
                  aria-checked={preJoinVideo}
                  aria-label={preJoinVideo ? "Camera on" : "Camera off"}
                  disabled={preJoinRequesting}
                  onClick={handleVideoToggle}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed ${
                    preJoinVideo ? "bg-primary" : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                      preJoinVideo ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
            {preJoinRequesting && (
              <p className="text-blue-400 text-sm">Requesting camera/microphone permissions…</p>
            )}
            {preJoinError && (
              <div className="p-3 rounded-lg bg-red-900/20 border border-red-700/50">
                <p className="text-red-400 text-sm">{preJoinError}</p>
                {!audioPermissionGranted && !videoPermissionGranted && (
                  <p className="text-xs text-red-400/80 mt-2">
                    Please allow at least one permission (audio or video) in your browser to join. You can turn a device on again above to be asked again.
                  </p>
                )}
                {(audioPermissionGranted || videoPermissionGranted) &&
                  (!audioPermissionGranted || !videoPermissionGranted) && (
                    <p className="text-xs text-blue-400 mt-2">
                      {audioPermissionGranted && !videoPermissionGranted && "You can join with audio. Toggle camera to request video permission again."}
                      {!audioPermissionGranted && videoPermissionGranted && "You can join with video. Toggle microphone to request audio permission again."}
                    </p>
                  )}
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <a
                href="/"
                className="ti-btn ti-btn-light !py-2 !px-4 flex-1 text-center"
              >
                Cancel
              </a>
              <button
                type="submit"
                disabled={preJoinRequesting || (!audioPermissionGranted && !videoPermissionGranted)}
                className="ti-btn ti-btn-primary !py-2 !px-4 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Join
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Loading token
  if (isLoading && !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Connecting to room...</p>
        </div>
      </div>
    );
  }

  // Token error
  if (error && !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-red-900 border border-red-700 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-white mb-2">Connection Error</h2>
          <p className="text-red-200 mb-4">{error}</p>
          <div className="flex gap-2">
            <button onClick={fetchToken} className="ti-btn ti-btn-primary">
              Retry
            </button>
            <button onClick={handleLeave} className="ti-btn ti-btn-danger">
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!token || !showRoom) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#202124]">
      <LiveKitRoom
        key={reconnectKey}
        video={videoEnabled}
        audio={audioEnabled}
        token={token}
        serverUrl={livekitUrl}
        onDisconnected={() => {}}
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
          onReconnect={handleReconnect}
          initialAudioEnabled={audioEnabled}
          initialVideoEnabled={videoEnabled}
          hasPermissionError={hasPermissionError}
        />
      </LiveKitRoom>
    </div>
  );
}
