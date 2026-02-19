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
}

export function WaitingRoom({ 
  participantName, 
  roomName, 
  participantIdentity,
  onAdmitted 
}: WaitingRoomProps) {
  const router = useRouter();
  const room = useRoomContext();
  const [isChecking, setIsChecking] = useState(false);
  const checkingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!participantIdentity || !onAdmitted) return;

    // Poll to check if participant has been admitted
    // When admitted, requesting a new token will give us full permissions
    const checkAdmissionStatus = async () => {
      if (isChecking) return;
      
      try {
        setIsChecking(true);
        
        // Request a new token - if we've been admitted, it will have full permissions
        // The backend tracks admitted participants and grants full permissions
        const tokenResponse = await livekitApi.getLiveKitToken(roomName, participantName);
        
        // If we get a token with host status, we've been admitted
        if (tokenResponse.isHost) {
          // We've been admitted! Reconnect with the new token
          onAdmitted(tokenResponse.token);
          return;
        }
      } catch (err: any) {
        // If error, we'll keep waiting
        // Don't log errors as this is expected while waiting
      } finally {
        setIsChecking(false);
      }
    };

    // Poll every 3 seconds to check admission status
    checkingIntervalRef.current = setInterval(checkAdmissionStatus, 3000);
    
    // Also check immediately
    checkAdmissionStatus();

    return () => {
      if (checkingIntervalRef.current) {
        clearInterval(checkingIntervalRef.current);
      }
    };
  }, [roomName, participantIdentity, participantName, onAdmitted, isChecking]);

  const handleLeave = () => {
    router.push("/meetings/pre-join/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="bg-gray-800 rounded-xl p-8 shadow-xl max-w-md w-full text-center">
        <div className="mb-6">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Waiting to be admitted</h2>
          <p className="text-gray-400">
            You're in the waiting room. The host will admit you shortly.
          </p>
        </div>

        <div className="mb-6 p-4 bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-300 mb-1">Room:</p>
          <p className="text-white font-medium">{roomName}</p>
          <p className="text-sm text-gray-300 mt-3 mb-1">Your name:</p>
          <p className="text-white font-medium">{participantName}</p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleLeave}
            className="ti-btn ti-btn-danger w-full"
          >
            Leave Waiting Room
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          You can see and hear the meeting, but you won't be able to speak or share video until the host admits you.
        </p>
      </div>
    </div>
  );
}
