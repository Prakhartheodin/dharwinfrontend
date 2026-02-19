"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/shared/contexts/auth-context";

export default function PreJoinMeetingPage() {
  let user = null;
  try {
    const authContext = useAuth();
    user = authContext?.user || null;
  } catch {
    // Not in auth context, user will be null
  }
  const router = useRouter();
  const [roomName, setRoomName] = useState("");
  const [participantName, setParticipantName] = useState(
    user?.name || user?.email || ""
  );
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [requestingPermissions, setRequestingPermissions] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [audioPermissionGranted, setAudioPermissionGranted] = useState(false);
  const [videoPermissionGranted, setVideoPermissionGranted] = useState(false);
  const permissionRequestedOnLoadRef = useRef(false);

  // Request video/audio permission separately when participant visits the page
  useEffect(() => {
    if (permissionRequestedOnLoadRef.current) return;
    permissionRequestedOnLoadRef.current = true;

    const requestOnLoad = async () => {
      setRequestingPermissions(true);
      setPermissionError(null);

      // Request audio permission
      let audioGranted = false;
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        audioStream.getTracks().forEach((track) => track.stop());
        audioGranted = true;
        setAudioPermissionGranted(true);
      } catch (err) {
        console.error("Audio permission error:", err);
        setAudioPermissionGranted(false);
      }

      // Request video permission
      let videoGranted = false;
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        videoStream.getTracks().forEach((track) => track.stop());
        videoGranted = true;
        setVideoPermissionGranted(true);
      } catch (err) {
        console.error("Video permission error:", err);
        setVideoPermissionGranted(false);
      }

      // Set initial toggle states based on permissions
      setAudioEnabled(audioGranted);
      setVideoEnabled(videoGranted);

      // Check if at least one permission is granted
      if (!audioGranted && !videoGranted) {
        setPermissionError(
          "Camera and microphone permissions are required. Please allow at least one (audio or video) to join the meeting room."
        );
      } else if (!audioGranted) {
        setPermissionError(
          "Microphone permission denied. You can join with video only."
        );
      } else if (!videoGranted) {
        setPermissionError(
          "Camera permission denied. You can join with audio only."
        );
      } else {
        setPermissionError(null);
      }

      setRequestingPermissions(false);
    };

    requestOnLoad();
  }, []);

  // Handle audio toggle
  const handleAudioToggle = async () => {
    if (audioEnabled) {
      setAudioEnabled(false);
      return;
    }

    if (audioPermissionGranted) {
      setAudioEnabled(true);
      setPermissionError(null);
      return;
    }

    setRequestingPermissions(true);
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      audioStream.getTracks().forEach((track) => track.stop());
      setAudioPermissionGranted(true);
      setAudioEnabled(true);
      if (!videoPermissionGranted) {
        setPermissionError(
          "Camera permission denied. You can join with audio only."
        );
      } else {
        setPermissionError(null);
      }
    } catch (err: any) {
      console.error("Audio permission error:", err);
      setAudioPermissionGranted(false);
      setAudioEnabled(false);
      const error = err as Error;
      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        if (!videoPermissionGranted) {
          setPermissionError(
            "Camera and microphone permissions are required. Please allow at least one (audio or video) to join the meeting room."
          );
        } else {
          setPermissionError(
            "Microphone permission denied. You can join with video only."
          );
        }
      } else if (
        error.name === "NotFoundError" ||
        error.name === "DevicesNotFoundError"
      ) {
        setPermissionError("No microphone found. Please connect a microphone device.");
      } else {
        setPermissionError(
          "Failed to access microphone. Please check your device settings."
        );
      }
    } finally {
      setRequestingPermissions(false);
    }
  };

  // Handle video toggle
  const handleVideoToggle = async () => {
    if (videoEnabled) {
      setVideoEnabled(false);
      return;
    }

    if (videoPermissionGranted) {
      setVideoEnabled(true);
      setPermissionError(null);
      return;
    }

    setRequestingPermissions(true);
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      videoStream.getTracks().forEach((track) => track.stop());
      setVideoPermissionGranted(true);
      setVideoEnabled(true);
      if (!audioPermissionGranted) {
        setPermissionError(
          "Microphone permission denied. You can join with video only."
        );
      } else {
        setPermissionError(null);
      }
    } catch (err: any) {
      console.error("Video permission error:", err);
      setVideoPermissionGranted(false);
      setVideoEnabled(false);
      const error = err as Error;
      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        if (!audioPermissionGranted) {
          setPermissionError(
            "Camera and microphone permissions are required. Please allow at least one (audio or video) to join the meeting room."
          );
        } else {
          setPermissionError(
            "Camera permission denied. You can join with audio only."
          );
        }
      } else if (
        error.name === "NotFoundError" ||
        error.name === "DevicesNotFoundError"
      ) {
        setPermissionError("No camera found. Please connect a camera device.");
      } else {
        setPermissionError(
          "Failed to access camera. Please check your device settings."
        );
      }
    } finally {
      setRequestingPermissions(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (roomName.trim() && participantName.trim()) {
      if (!audioPermissionGranted && !videoPermissionGranted) {
        setPermissionError(
          "At least one permission (audio or video) is required to join the meeting room."
        );
        return;
      }

      const params = new URLSearchParams({
        name: participantName,
        audio: audioEnabled ? "1" : "0",
        video: videoEnabled ? "1" : "0",
      });
      router.push(`/meetings/room/${encodeURIComponent(roomName)}?${params.toString()}`);
    }
  };

  const handleCreateRoom = () => {
    const randomRoom = `room-${Math.random().toString(36).substr(2, 9)}`;
    setRoomName(randomRoom);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-bodybg">
      <div className="bg-white dark:bg-bodybg rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-900 dark:text-white">
          Join Meeting
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          Join or create a video call room
        </p>

        <form onSubmit={handleJoinRoom} className="space-y-4">
          <div>
            <label
              htmlFor="participantName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Your Name
            </label>
            <input
              id="participantName"
              type="text"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Enter your name"
              required
              className="ti-form-input w-full"
            />
          </div>

          <div>
            <label
              htmlFor="roomName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Room Name
            </label>
            <div className="flex gap-2">
              <input
                id="roomName"
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Enter room name"
                required
                className="ti-form-input flex-1"
              />
              <button
                type="button"
                onClick={handleCreateRoom}
                className="ti-btn ti-btn-secondary"
              >
                Random
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Join with (mute/unmute audio, video on/off)
            </span>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Microphone
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={audioEnabled}
                  onClick={handleAudioToggle}
                  disabled={requestingPermissions}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    audioEnabled ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                      audioEnabled ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Camera
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={videoEnabled}
                  onClick={handleVideoToggle}
                  disabled={requestingPermissions}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    videoEnabled ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                      videoEnabled ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
            {requestingPermissions && (
              <p className="text-sm text-primary">
                Requesting camera/microphone permissions...
              </p>
            )}
            {permissionError && (
              <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg">
                <p className="text-sm text-danger">{permissionError}</p>
                {!audioPermissionGranted && !videoPermissionGranted && (
                  <p className="text-xs text-danger mt-2">
                    Please allow at least one permission (audio or video) in
                    your browser settings to join the meeting.
                  </p>
                )}
                {(audioPermissionGranted || videoPermissionGranted) &&
                  (!audioPermissionGranted || !videoPermissionGranted) && (
                    <p className="text-xs text-primary mt-2">
                      {audioPermissionGranted &&
                        !videoPermissionGranted &&
                        "You can join with audio. Toggle camera to request video permission."}
                      {!audioPermissionGranted &&
                        videoPermissionGranted &&
                        "You can join with video. Toggle microphone to request audio permission."}
                    </p>
                  )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={
              requestingPermissions ||
              (!audioPermissionGranted && !videoPermissionGranted)
            }
            className="ti-btn ti-btn-primary w-full"
          >
            {requestingPermissions ? "Requesting Permissions..." : "Join Room"}
          </button>
        </form>
      </div>
    </div>
  );
}
