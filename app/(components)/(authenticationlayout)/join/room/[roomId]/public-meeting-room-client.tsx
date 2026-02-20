"use client";

import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useRoomContext,
  useParticipants,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { ConnectionState, DisconnectReason, RoomEvent } from "livekit-client";
import * as livekitApi from "@/shared/lib/api/livekit";
import { WaitingParticipantsPanel } from "@/shared/components/livekit/waiting-participants-panel";
import { RecordingButton } from "@/shared/components/livekit/recording-button";

const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 10000;

function PublicRoomContent({
  onLeave,
  onReconnect,
  initialAudioEnabled,
  initialVideoEnabled,
  hasPermissionError,
  roomName,
  isHost,
  participantEmail,
  waitingParticipantIdentities,
}: {
  onLeave: () => void;
  onReconnect: () => void | Promise<void>;
  initialAudioEnabled: boolean;
  initialVideoEnabled: boolean;
  hasPermissionError: boolean;
  roomName: string;
  isHost: boolean;
  participantEmail?: string;
  waitingParticipantIdentities?: string[];
}) {
  const room = useRoomContext();
  const [waitingIds, setWaitingIds] = useState<string[]>(waitingParticipantIdentities || []);
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

  const participants = useParticipants();

  useEffect(() => {
    if (waitingParticipantIdentities) {
      setWaitingIds(waitingParticipantIdentities);
    }
  }, [waitingParticipantIdentities]);

  // Fetch waiting participants for ALL users (not just hosts) so everyone can hide them
  const [allWaitingParticipants, setAllWaitingParticipants] = useState<string[]>([]);
  
  useEffect(() => {
    // Fetch waiting participants for everyone, not just hosts
    const fetchWaitingParticipants = async () => {
      try {
        // Use public endpoint - now works for all participants (read-only)
        // Pass empty string for hostEmail since we don't need host verification for viewing
        const response = await livekitApi.getWaitingParticipantsPublic(roomName, '');
        const waitingIds = response.participants?.map(p => p.identity) || [];
        setAllWaitingParticipants(waitingIds);
      } catch (err) {
        // If it fails, use the waitingIds from props (for hosts) or empty array
        setAllWaitingParticipants(waitingIds.length > 0 ? waitingIds : []);
      }
    };

    fetchWaitingParticipants();
    // Poll every 3 seconds to get updated waiting list
    const interval = setInterval(fetchWaitingParticipants, 3000);
    return () => clearInterval(interval);
  }, [roomName, waitingIds]);

  // Combine waiting IDs: prefer props (for hosts) but use fetched list for all participants
  // When a participant is admitted, they should be removed from both lists
  const combinedWaitingIds = waitingIds.length > 0 ? waitingIds : allWaitingParticipants;

  // Hide waiting participants from DOM - check ALL participants and hide those without canPublish
  useEffect(() => {
    // Get all waiting participant identities
    const waitingIdentities = new Set(combinedWaitingIds);
    
    // Build a map of all participants that should be hidden
    const participantsToHide = new Set<string>();
    
    // Check all participants - hide those that are waiting AND don't have canPublish permission
    participants.forEach((p) => {
      // Skip local participant
      if (p.identity === room.localParticipant.identity) return;
      
      // Check if participant has canPublish permission
      // If they have canPublish, they're admitted and should NOT be hidden
      const hasCanPublish = p.permissions?.canPublish === true;
      
      // Only hide if they're in waiting list AND don't have canPublish
      if (waitingIdentities.has(p.identity) && !hasCanPublish) {
        participantsToHide.add(p.identity);
      }
      
      // Also check by name - but only if they don't have canPublish
      if (!hasCanPublish) {
        const participantName = (p.name || p.identity).toLowerCase().trim();
        combinedWaitingIds.forEach((waitingId) => {
          const waitingIdLower = waitingId.toLowerCase().trim();
          // Match by name if identity doesn't match
          if (participantName === waitingIdLower || 
              participantName.includes(waitingIdLower) || 
              waitingIdLower.includes(participantName)) {
            participantsToHide.add(p.identity);
          }
        });
      }
    });

    if (participantsToHide.size === 0) {
      // If no participants to hide, make sure we unhide any previously hidden participants
      // This handles the case where a participant was admitted and should now be visible
      try {
        document.querySelectorAll('[data-waiting-hidden="true"]').forEach((el) => {
          const htmlEl = el as HTMLElement;
          htmlEl.removeAttribute('data-waiting-hidden');
          htmlEl.style.removeProperty('display');
          htmlEl.style.removeProperty('visibility');
          htmlEl.style.removeProperty('opacity');
          htmlEl.style.removeProperty('height');
          htmlEl.style.removeProperty('width');
          htmlEl.style.removeProperty('overflow');
          htmlEl.style.removeProperty('pointer-events');
          htmlEl.style.removeProperty('position');
          htmlEl.style.removeProperty('left');
        });
      } catch (e) {
        // Ignore errors
      }
      return;
    }

    // Function to hide an element
    const hideElement = (el: HTMLElement) => {
      if (el.getAttribute('data-waiting-hidden') === 'true') return;
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.style.setProperty('opacity', '0', 'important');
      el.style.setProperty('height', '0', 'important');
      el.style.setProperty('width', '0', 'important');
      el.style.setProperty('overflow', 'hidden', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
      el.style.setProperty('position', 'absolute', 'important');
      el.style.setProperty('left', '-9999px', 'important');
      el.setAttribute('data-waiting-hidden', 'true');
    };

    // Throttled check function
    let lastCheckTime = 0;
    const throttleDelay = 300; // Check at most every 300ms
    
    const checkAndHide = () => {
      const now = Date.now();
      if (now - lastCheckTime < throttleDelay) return;
      lastCheckTime = now;

      try {
        // Get ALL participant tiles
        const allTiles = document.querySelectorAll(
          '.lk-participant-tile, [class*="participant"], [data-lk-participant-identity], [data-lk-participant], [class*="lk-participant"]'
        );

        allTiles.forEach((tile) => {
          const el = tile as HTMLElement;
          
          // Check by identity attributes
          const tileIdentity = el.getAttribute('data-lk-participant-identity') || 
                              el.getAttribute('data-lk-participant') ||
                              el.getAttribute('data-participant-identity');
          
          // Find the participant for this tile
          const participant = participants.find(p => p.identity === tileIdentity);
          
          // If participant has canPublish, they're admitted - make sure they're visible
          if (participant && participant.permissions?.canPublish === true) {
            if (el.getAttribute('data-waiting-hidden') === 'true') {
              // Unhide admitted participants
              el.removeAttribute('data-waiting-hidden');
              el.style.removeProperty('display');
              el.style.removeProperty('visibility');
              el.style.removeProperty('opacity');
              el.style.removeProperty('height');
              el.style.removeProperty('width');
              el.style.removeProperty('overflow');
              el.style.removeProperty('pointer-events');
              el.style.removeProperty('position');
              el.style.removeProperty('left');
            }
            return; // Don't hide admitted participants
          }
          
          // If already hidden, skip
          if (el.getAttribute('data-waiting-hidden') === 'true') return;
          
          // Check if this tile belongs to a waiting participant
          if (tileIdentity && participantsToHide.has(tileIdentity)) {
            hideElement(el);
            return;
          }

          // Also check by participant name in the tile
          const tileText = el.textContent || el.innerText || '';
          const tileName = el.getAttribute('aria-label') || 
                         el.querySelector('[class*="name"]')?.textContent ||
                         tileText.split('\n')[0]?.trim();
          
          // Check if any waiting participant matches this tile
          participants.forEach((p) => {
            // Skip if participant has canPublish (they're admitted)
            if (p.permissions?.canPublish === true) return;
            
            if (participantsToHide.has(p.identity)) {
              const pName = (p.name || p.identity).toLowerCase().trim();
              const normalizedTileName = (tileName || tileText).toLowerCase().trim();
              
              // If names match (exact or partial), hide the tile
              if (normalizedTileName && (
                normalizedTileName === pName ||
                normalizedTileName.includes(pName) ||
                pName.includes(normalizedTileName) ||
                tileIdentity === p.identity
              )) {
                hideElement(el);
              }
            }
          });
        });

        // Also use direct selectors for each waiting identity
        Array.from(participantsToHide).forEach((identity) => {
          try {
            const selectors = [
              `[data-lk-participant-identity="${identity}"]`,
              `[data-lk-participant="${identity}"]`,
              `[data-participant-identity="${identity}"]`,
            ];
            selectors.forEach((selector) => {
              document.querySelectorAll(selector).forEach((el) => {
                hideElement(el as HTMLElement);
              });
            });
          } catch (e) {
            // Ignore selector errors
          }
        });

        // Unhide participants who are NOT in the waiting list anymore (they've been admitted)
        // This ensures admitted participants become visible immediately
        participants.forEach((p) => {
          // Skip if participant doesn't have canPublish (they're still waiting)
          if (p.permissions?.canPublish !== true) return;
          
          // If participant has canPublish but is marked as hidden, unhide them
          const selectors = [
            `[data-lk-participant-identity="${p.identity}"]`,
            `[data-lk-participant="${p.identity}"]`,
          ];
          selectors.forEach((selector) => {
            try {
              document.querySelectorAll(selector).forEach((el) => {
                const htmlEl = el as HTMLElement;
                if (htmlEl.getAttribute('data-waiting-hidden') === 'true') {
                  // Unhide admitted participants
                  htmlEl.removeAttribute('data-waiting-hidden');
                  htmlEl.style.removeProperty('display');
                  htmlEl.style.removeProperty('visibility');
                  htmlEl.style.removeProperty('opacity');
                  htmlEl.style.removeProperty('height');
                  htmlEl.style.removeProperty('width');
                  htmlEl.style.removeProperty('overflow');
                  htmlEl.style.removeProperty('pointer-events');
                  htmlEl.style.removeProperty('position');
                  htmlEl.style.removeProperty('left');
                }
              });
            } catch (e) {
              // Ignore selector errors
            }
          });
        });
      } catch (error) {
        console.error('Error hiding waiting participants:', error);
      }
    };

    // Run immediately
    checkAndHide();

    // Use MutationObserver with debouncing
    let mutationTimeout: ReturnType<typeof setTimeout> | null = null;
    const observer = new MutationObserver(() => {
      if (mutationTimeout) clearTimeout(mutationTimeout);
      mutationTimeout = setTimeout(() => {
        checkAndHide();
      }, 150);
    });

    // Observe the room container
    const roomContainer = document.querySelector('.room-meeting-container, .lk-video-conference');
    if (roomContainer) {
      observer.observe(roomContainer, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-lk-participant-identity', 'data-lk-participant', 'class'],
      });
    }

    // Use interval as backup
    const interval = setInterval(checkAndHide, 500);

    return () => {
      observer.disconnect();
      clearInterval(interval);
      if (mutationTimeout) clearTimeout(mutationTimeout);
    };
  }, [combinedWaitingIds, participants, room]);

  // Generate CSS to hide waiting participants from video grid (backup to DOM manipulation)
  const waitingParticipantsCSS = waitingIds.length > 0
    ? waitingIds.map(identity => {
        // Escape special characters in identity for CSS selector
        const escapedIdentity = identity.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '\\$&');
        return `
          [data-lk-participant-identity="${identity}"] { display: none !important; visibility: hidden !important; opacity: 0 !important; height: 0 !important; width: 0 !important; overflow: hidden !important; }
          [data-lk-participant="${identity}"] { display: none !important; visibility: hidden !important; opacity: 0 !important; height: 0 !important; width: 0 !important; overflow: hidden !important; }
          .lk-participant-tile[data-lk-participant-identity="${identity}"] { display: none !important; visibility: hidden !important; opacity: 0 !important; height: 0 !important; width: 0 !important; overflow: hidden !important; }
          .lk-participant-tile[data-lk-participant="${identity}"] { display: none !important; visibility: hidden !important; opacity: 0 !important; height: 0 !important; width: 0 !important; overflow: hidden !important; }
          .lk-grid-layout [data-lk-participant-identity="${identity}"] { display: none !important; visibility: hidden !important; opacity: 0 !important; height: 0 !important; width: 0 !important; overflow: hidden !important; }
          .lk-focus-layout [data-lk-participant-identity="${identity}"] { display: none !important; visibility: hidden !important; opacity: 0 !important; height: 0 !important; width: 0 !important; overflow: hidden !important; }
        `;
      }).join('\n')
    : '';

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
        ${waitingParticipantsCSS}
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
        {isHost && (
          <div
            className="absolute top-4 right-4 z-[1000] flex flex-col gap-2"
            style={{ maxWidth: "400px" }}
          >
            <RecordingButton
              roomName={roomName}
              hostEmail={participantEmail || undefined}
            />
          </div>
        )}
        {isHost && (
          <div
            className="absolute top-4 left-4 z-[1000]"
            style={{
              maxWidth: "400px",
            }}
          >
            <WaitingParticipantsPanel
              roomName={roomName}
              hostEmail={participantEmail || undefined}
              onParticipantAdmitted={(identity) => {
                console.log("Participant admitted:", identity);
                // Remove from waiting list immediately when admitted
                setWaitingIds((prev) => prev.filter(id => id !== identity));
                setAllWaitingParticipants((prev) => prev.filter(id => id !== identity));
              }}
              onWaitingParticipantsChange={(identities) => {
                setWaitingIds(identities);
                // Also update fetched list
                setAllWaitingParticipants(identities);
              }}
            />
          </div>
        )}
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
  const emailFromQuery = searchParams.get("email")?.trim();

  const [showRoom, setShowRoom] = useState(false);
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [reconnectKey, setReconnectKey] = useState(0);
  const [hasPermissionError, setHasPermissionError] = useState(false);
  /** Normal participant waiting for host to admit; same page with message + loader */
  const [waitingForAdmission, setWaitingForAdmission] = useState(false);
  const [participantIdentity, setParticipantIdentity] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [waitingParticipantIdentities, setWaitingParticipantIdentities] = useState<string[]>([]);
  const admissionPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pre-join form state (when no name in URL)
  const [preJoinName, setPreJoinName] = useState("");
  const [preJoinEmail, setPreJoinEmail] = useState("");
  const [preJoinAudio, setPreJoinAudio] = useState(false);
  const [preJoinVideo, setPreJoinVideo] = useState(false);
  const [preJoinError, setPreJoinError] = useState("");
  const [preJoinRequesting, setPreJoinRequesting] = useState(false);
  const [audioPermissionGranted, setAudioPermissionGranted] = useState(false);
  const [videoPermissionGranted, setVideoPermissionGranted] = useState(false);
  const permissionRequestedOnLoadRef = useRef(false);

  const participantName = useMemo(() => nameFromQuery || "", [nameFromQuery]);
  const participantEmail = useMemo(() => emailFromQuery || "", [emailFromQuery]);
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
      if (preJoinEmail.trim()) {
        params.set("email", preJoinEmail.trim());
      }
      params.set("audio", preJoinAudio ? "1" : "0");
      params.set("video", preJoinVideo ? "1" : "0");
      router.push(`/join/room/${encodeURIComponent(roomId)}?${params.toString()}`);
    },
    [roomId, router, preJoinName, preJoinEmail, preJoinAudio, preJoinVideo, audioPermissionGranted, videoPermissionGranted]
  );

  const fetchToken = useCallback(async () => {
    if (!livekitUrl || !participantName) {
      setShowRoom(false);
      setWaitingForAdmission(false);
      return;
    }
    try {
      setIsLoading(true);
      setError("");
      const roomName = decodeURIComponent(roomId);
      const data = await livekitApi.getPublicLiveKitToken(
        roomName,
        participantName,
        participantEmail || undefined
      );
      setToken(data.token);
      setParticipantIdentity(data.participantIdentity ?? null);
      setIsHost(data.isHost || false);
      if (data.isHost) {
        setWaitingForAdmission(false);
        setShowRoom(true);
      } else {
        setWaitingForAdmission(true);
        setShowRoom(false);
      }
    } catch (err: any) {
      console.error("Error fetching token:", err);
      setError(
        err?.response?.data?.message || err?.message || "Failed to connect to room"
      );
    } finally {
      setIsLoading(false);
    }
  }, [roomId, participantName, participantEmail, livekitUrl]);

  useEffect(() => {
    if (participantName && livekitUrl && !showRoom && !token) {
      fetchToken();
    }
  }, [participantName, livekitUrl, showRoom, token, fetchToken]);

  // Poll for admission when normal participant is waiting
  useEffect(() => {
    if (!waitingForAdmission || !participantName || !livekitUrl || !roomId) return;
    
    const roomName = decodeURIComponent(roomId);
    let pollCount = 0;
    const maxPolls = 200; // Stop after ~10 minutes (200 * 3 seconds)
    
    const checkAdmission = async () => {
      pollCount++;
      
      // Stop polling after max attempts to prevent infinite loops
      if (pollCount > maxPolls) {
        console.warn('Admission polling stopped after max attempts');
        if (admissionPollRef.current) {
          clearInterval(admissionPollRef.current);
          admissionPollRef.current = null;
        }
        return;
      }

      try {
        const data = await livekitApi.getPublicLiveKitToken(
          roomName,
          participantName,
          participantEmail || undefined,
          participantIdentity ?? undefined
        );
        
        if (data.isHost) {
          if (admissionPollRef.current) {
            clearInterval(admissionPollRef.current);
            admissionPollRef.current = null;
          }
          setToken(data.token);
          setWaitingForAdmission(false);
          setShowRoom(true);
          setReconnectKey((k) => k + 1);
        }
      } catch (err: any) {
        // Log error but keep waiting (unless it's a critical error)
        const errorMsg = err?.message?.toLowerCase() || '';
        if (errorMsg.includes('network') || errorMsg.includes('failed')) {
          console.error('Error checking admission status:', err);
          // Don't stop polling on network errors, but log them
        }
        // For other errors, silently continue waiting
      }
    };
    
    // Start polling
    admissionPollRef.current = setInterval(checkAdmission, 3000);
    // Also check immediately
    checkAdmission();
    
    return () => {
      if (admissionPollRef.current) {
        clearInterval(admissionPollRef.current);
        admissionPollRef.current = null;
      }
    };
  }, [waitingForAdmission, participantName, participantEmail, participantIdentity, livekitUrl, roomId]);

  const handleLeave = useCallback(() => {
    router.push(`/join/room/${encodeURIComponent(roomId)}`);
  }, [router, roomId]);

  const handleReconnect = useCallback(async () => {
    if (!participantName || !roomId) return;
    try {
      setIsLoading(true);
      const roomName = decodeURIComponent(roomId);
      const data = await livekitApi.getPublicLiveKitToken(
        roomName,
        participantName,
        participantEmail || undefined
      );
      setToken(data.token);
      setReconnectKey((prev) => prev + 1);
    } catch (err) {
      console.error("Error fetching token during reconnect:", err);
      setTimeout(() => handleReconnect(), INITIAL_RECONNECT_DELAY);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, participantName, participantEmail]);

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
            Enter your name and email (if you're a host). Browser will ask for microphone and camera permission when this page opens. At least one (audio or video) is required to join. In the meeting you can mute/unmute and turn video on/off.
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
            <div>
              <label htmlFor="join-email" className="block text-sm font-medium text-gray-300 mb-1">
                Your email <span className="text-gray-500 text-xs">(optional, required for hosts)</span>
              </label>
              <input
                id="join-email"
                type="email"
                value={preJoinEmail}
                onChange={(e) => setPreJoinEmail(e.target.value)}
                placeholder="e.g. john@example.com"
                className="form-control !py-2 w-full border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <p className="text-xs text-gray-500 mt-1">
                If you're a host, enter the email address associated with this meeting to join immediately.
              </p>
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

  // Waiting for host to admit - connect to LiveKit with restricted permissions so host can see them
  if (waitingForAdmission && participantName && token) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#202124]">
        <LiveKitRoom
          key={reconnectKey}
          video={false}
          audio={false}
          token={token}
          serverUrl={livekitUrl}
          onDisconnected={() => {}}
          onError={handleError}
          options={{
            adaptiveStream: true,
            dynacast: true,
          }}
          data-lk-theme="default"
          className="room-page flex flex-col flex-1 min-h-0 w-full"
        >
          {/* Waiting overlay on top of LiveKit connection */}
          <div className="absolute inset-0 bg-gray-900/95 flex items-center justify-center z-[200]">
            <div className="w-full max-w-md bg-gray-800 rounded-xl p-6 shadow-xl mx-4">
              <h1 className="text-xl font-semibold text-white mb-2">Join Meeting</h1>
              <p className="text-gray-400 text-sm mb-6">
                Waiting for the host to admit you into the meeting.
              </p>
              <div className="flex flex-col items-center justify-center py-8">
                <div
                  className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent mb-4"
                  aria-hidden
                />
                <p className="text-gray-300 text-sm">Please wait…</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (admissionPollRef.current) {
                      clearInterval(admissionPollRef.current);
                      admissionPollRef.current = null;
                    }
                    setWaitingForAdmission(false);
                    setToken("");
                    setParticipantIdentity(null);
                    router.push(`/join/room/${encodeURIComponent(roomId)}`);
                  }}
                  className="ti-btn ti-btn-light !py-2 !px-4 flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </LiveKitRoom>
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

  // If no token but we have participant name, show loading
  if (!token) {
    if (participantName) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white">Connecting to room...</p>
          </div>
        </div>
      );
    }
    return null;
  }

  // If token exists but showRoom is false, we might be waiting
  if (!showRoom && token) {
    // This shouldn't happen normally, but show waiting state just in case
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Preparing room...</p>
        </div>
      </div>
    );
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
          roomName={decodeURIComponent(roomId)}
          isHost={isHost}
          participantEmail={participantEmail || undefined}
        />
      </LiveKitRoom>
    </div>
  );
}
