"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useRoomContext } from "@livekit/components-react";
import * as livekitApi from "@/shared/lib/api/livekit";

interface WaitingRoomProps {
  participantName: string;
  roomName: string;
  participantIdentity?: string;
  onAdmitted?: (token: string) => void;
  /** Optional meeting title to show (e.g. "Interview with Acme Corp") */
  meetingTitle?: string;
  /** Optional host name to show */
  hostName?: string;
}

export function WaitingRoom({
  participantName,
  roomName,
  participantIdentity,
  onAdmitted,
  meetingTitle,
  hostName,
}: WaitingRoomProps) {
  const router = useRouter();
  const room = useRoomContext();
  const [isChecking, setIsChecking] = useState(false);
  const checkingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!participantIdentity || !onAdmitted) return;

    const checkAdmissionStatus = async () => {
      if (isChecking) return;
      try {
        setIsChecking(true);
        const tokenResponse = await livekitApi.getLiveKitToken(roomName, participantName);
        if (tokenResponse.isHost) {
          onAdmitted(tokenResponse.token);
          return;
        }
      } catch {
        // Keep waiting
      } finally {
        setIsChecking(false);
      }
    };

    checkingIntervalRef.current = setInterval(checkAdmissionStatus, 5000);
    checkAdmissionStatus();
    return () => {
      if (checkingIntervalRef.current) clearInterval(checkingIntervalRef.current);
    };
  }, [roomName, participantIdentity, participantName, onAdmitted, isChecking]);

  // Local preview stream for waiting room
  useEffect(() => {
    let stream: MediaStream | null = null;
    const startPreview = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setPreviewStream(stream);
      } catch {
        setPreviewStream(null);
      }
    };
    startPreview();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      setPreviewStream(null);
    };
  }, []);

  useEffect(() => {
    if (!videoRef.current || !previewStream) return;
    videoRef.current.srcObject = previewStream;
    return () => {
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [previewStream]);

  useEffect(() => {
    if (!previewStream) return;
    previewStream.getVideoTracks().forEach((t) => {
      t.enabled = videoEnabled;
    });
  }, [videoEnabled, previewStream]);

  useEffect(() => {
    if (!previewStream) return;
    previewStream.getAudioTracks().forEach((t) => {
      t.enabled = audioEnabled;
    });
  }, [audioEnabled, previewStream]);

  const handleLeave = () => {
    previewStream?.getTracks().forEach((t) => t.stop());
    router.push("/meetings/pre-join/");
  };

  const displayTitle = meetingTitle || roomName;
  const displaySubtitle = hostName ? `Host: ${hostName}` : "The host will admit you shortly.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f12] dark:bg-[#0a0a0c] p-4">
      <div className="w-full max-w-lg bg-[#1a1a1f] dark:bg-[#141418] rounded-2xl shadow-2xl border border-white/5 overflow-hidden">
        {/* Animated waiting indicator - pulsing rings */}
        <div className="flex justify-center pt-8 pb-2">
          <div className="relative flex items-center justify-center w-24 h-24">
            <span className="absolute w-full h-full rounded-full border-2 border-primary/30 animate-ping opacity-40" style={{ animationDuration: "2s" }} />
            <span className="absolute w-[80%] h-[80%] rounded-full border-2 border-primary/50 animate-ping opacity-60" style={{ animationDuration: "2.5s", animationDelay: "0.2s" }} />
            <span className="absolute w-[60%] h-[60%] rounded-full border-2 border-primary flex items-center justify-center">
              <i className="ti ti-user-wait text-2xl text-primary" />
            </span>
          </div>
        </div>

        <div className="text-center px-6 pb-4">
          <h2 className="text-xl font-bold text-white">Waiting to be admitted</h2>
          <p className="text-sm text-gray-400 mt-1">{displaySubtitle}</p>
        </div>

        {/* Camera self-preview */}
        <div className="relative aspect-video bg-black mx-4 rounded-xl overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
            style={{ transform: "scaleX(-1)" }}
          />
          {!videoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
              <i className="ti ti-video-off text-4xl text-gray-500" />
            </div>
          )}
          <div className="absolute bottom-2 left-2 right-2 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setAudioEnabled((a) => !a)}
              title={audioEnabled ? "Mute" : "Unmute"}
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                audioEnabled ? "bg-white/20 border-white/30 text-white" : "bg-red-500/30 border-red-500/50 text-red-400"
              }`}
            >
              {audioEnabled ? <i className="ti ti-microphone text-lg" /> : <i className="ti ti-microphone-off text-lg" />}
            </button>
            <button
              type="button"
              onClick={() => setVideoEnabled((v) => !v)}
              title={videoEnabled ? "Stop video" : "Start video"}
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                videoEnabled ? "bg-white/20 border-white/30 text-white" : "bg-red-500/30 border-red-500/50 text-red-400"
              }`}
            >
              {videoEnabled ? <i className="ti ti-video text-lg" /> : <i className="ti ti-video-off text-lg" />}
            </button>
          </div>
        </div>

        {/* Meeting info */}
        <div className="mx-4 mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Meeting</p>
          <p className="text-white font-medium truncate">{displayTitle}</p>
          <p className="text-xs text-gray-400 mt-2">You’re joining as</p>
          <p className="text-white font-medium truncate">{participantName}</p>
        </div>

        <div className="p-6 pt-4 flex flex-col gap-3">
          <button
            onClick={handleLeave}
            className="w-full py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-medium hover:bg-red-500/30 transition-colors"
          >
            Leave waiting room
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center px-6 pb-6">
          You’ll join the meeting once the host admits you. You can turn your camera and mic on or off while you wait.
        </p>
      </div>
    </div>
  );
}
