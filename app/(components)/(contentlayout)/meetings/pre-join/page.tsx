"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  const [audioLevel, setAudioLevel] = useState(0);
  const permissionRequestedOnLoadRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Start video preview when we have a video stream
  useEffect(() => {
    if (!videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    video.srcObject = stream;
    return () => {
      video.srcObject = null;
    };
  }, [videoPermissionGranted, videoEnabled]);

  // Audio level meter using AnalyserNode
  useEffect(() => {
    if (!audioEnabled || !streamRef.current) {
      setAudioLevel(0);
      return;
    }
    const stream = streamRef.current;
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack || audioTrack.muted) {
      setAudioLevel(0);
      return;
    }
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setAudioLevel(normalized);
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
      return () => {
        cancelAnimationFrame(animationFrameRef.current);
        audioContext.close();
        audioContextRef.current = null;
        analyserRef.current = null;
      };
    } catch {
      setAudioLevel(0);
    }
  }, [audioEnabled, audioPermissionGranted]);

  const requestMedia = useCallback(async () => {
    setRequestingPermissions(true);
    setPermissionError(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    let audioGranted = false;
    let videoGranted = false;
    let combinedStream: MediaStream | null = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
      });
      combinedStream = stream;
      audioGranted = stream.getAudioTracks().length > 0;
      videoGranted = stream.getVideoTracks().length > 0;
      streamRef.current = stream;
      setAudioPermissionGranted(audioGranted);
      setVideoPermissionGranted(videoGranted);
      setAudioEnabled(audioGranted);
      setVideoEnabled(videoGranted);
    } catch (err) {
      console.error("Media permission error:", err);
      const error = err as Error;
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setPermissionError(
          "Camera and microphone access was denied. Please allow access in your browser to join."
        );
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        setPermissionError("No camera or microphone found. Please connect a device.");
      } else {
        setPermissionError("Could not access camera or microphone. Check your device settings.");
      }
      setAudioPermissionGranted(false);
      setVideoPermissionGranted(false);
    }

    setRequestingPermissions(false);
  }, []);

  useEffect(() => {
    if (permissionRequestedOnLoadRef.current) return;
    permissionRequestedOnLoadRef.current = true;
    requestMedia();
  }, [requestMedia]);

  const handleAudioToggle = async () => {
    if (audioEnabled) {
      setAudioEnabled(false);
      streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = false));
      return;
    }
    if (audioPermissionGranted) {
      setAudioEnabled(true);
      streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = true));
      setPermissionError(null);
      return;
    }
    await requestMedia();
  };

  const handleVideoToggle = async () => {
    if (videoEnabled) {
      setVideoEnabled(false);
      streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = false));
      return;
    }
    if (videoPermissionGranted) {
      setVideoEnabled(true);
      streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = true));
      setPermissionError(null);
      return;
    }
    await requestMedia();
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
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
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

  const canJoin = (audioPermissionGranted || videoPermissionGranted) && !requestingPermissions;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f12] dark:bg-[#0a0a0c] p-4">
      <div className="w-full max-w-lg bg-[#1a1a1f] dark:bg-[#141418] rounded-2xl shadow-2xl border border-white/5 overflow-hidden">
        {/* Header */}
        <div className="text-center pt-8 pb-4 px-6">
          <h1 className="text-2xl font-bold text-white">
            Join Meeting
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Set up your camera and mic, then join the room
          </p>
        </div>

        {/* Camera preview */}
        <div className="relative aspect-video bg-black mx-4 rounded-xl overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
            style={{ transform: "scaleX(-1)" }}
          />
          {!videoPermissionGranted && !requestingPermissions && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
              <div className="text-center">
                <i className="ti ti-video-off text-4xl text-gray-500 mb-2 block" />
                <p className="text-sm text-gray-400">Camera off or not available</p>
              </div>
            </div>
          )}
          {requestingPermissions && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
            </div>
          )}
          {/* Mic level bars overlay */}
          {audioPermissionGranted && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-end gap-0.5 h-6">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={`w-1 rounded-full transition-all duration-100 ${
                    audioEnabled && audioLevel > i * 20 ? "bg-primary" : "bg-white/30"
                  }`}
                  style={{ height: `${(i + 1) * 20}%` }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Icon-style mic/camera controls */}
        <div className="flex justify-center gap-4 py-4">
          <button
            type="button"
            onClick={handleAudioToggle}
            disabled={requestingPermissions}
            title={audioEnabled ? "Mute microphone" : "Unmute microphone"}
            className={`flex items-center justify-center w-14 h-14 rounded-full border-2 transition-all ${
              audioEnabled
                ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
                : "bg-red-500/20 border-red-500/50 text-red-400"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {audioEnabled ? (
              <i className="ti ti-microphone text-xl" />
            ) : (
              <i className="ti ti-microphone-off text-xl" />
            )}
          </button>
          <button
            type="button"
            onClick={handleVideoToggle}
            disabled={requestingPermissions}
            title={videoEnabled ? "Turn off camera" : "Turn on camera"}
            className={`flex items-center justify-center w-14 h-14 rounded-full border-2 transition-all ${
              videoEnabled
                ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
                : "bg-red-500/20 border-red-500/50 text-red-400"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {videoEnabled ? (
              <i className="ti ti-video text-xl" />
            ) : (
              <i className="ti ti-video-off text-xl" />
            )}
          </button>
        </div>

        <form onSubmit={handleJoinRoom} className="p-6 pt-0 space-y-4">
          <div>
            <label htmlFor="participantName" className="block text-xs font-medium text-gray-400 mb-1.5">
              Your name
            </label>
            <input
              id="participantName"
              type="text"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Enter your name"
              required
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="roomName" className="block text-xs font-medium text-gray-400 mb-1.5">
              Room name
            </label>
            <div className="flex gap-2">
              <input
                id="roomName"
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Enter room name"
                required
                className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleCreateRoom}
                className="px-4 py-2.5 rounded-lg bg-white/10 text-gray-300 hover:bg-white/15 text-sm font-medium shrink-0"
              >
                Random
              </button>
            </div>
          </div>

          {requestingPermissions && (
            <p className="text-sm text-primary">Requesting camera and microphone…</p>
          )}
          {permissionError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-300">{permissionError}</p>
              <button
                type="button"
                onClick={requestMedia}
                className="mt-2 text-xs text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={!canJoin}
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {requestingPermissions ? "Requesting…" : "Join room"}
          </button>
        </form>
      </div>
    </div>
  );
}
