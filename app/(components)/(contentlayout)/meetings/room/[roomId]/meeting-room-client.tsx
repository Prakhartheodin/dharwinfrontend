"use client";

import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useRoomContext,
  useParticipants,
} from "@livekit/components-react";
import { createPortal } from "react-dom";
import "@livekit/components-styles";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { ConnectionState, DisconnectReason, RoomEvent } from "livekit-client";
import { RecordingButton } from "@/shared/components/livekit/recording-button";
import { WaitingRoom } from "@/shared/components/livekit/waiting-room";
import { WaitingParticipantsPanel } from "@/shared/components/livekit/waiting-participants-panel";
import * as livekitApi from "@/shared/lib/api/livekit";
import { updateMeeting } from "@/shared/lib/api/meetings";
import { endCallByRoom, updateCall } from "@/shared/lib/api/chat";
import { useAuth } from "@/shared/contexts/auth-context";

const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 3000;
const MAX_RECONNECT_DELAY = 20000; // 10 seconds

/** Registers current user on ChatCall when they connect to a chat LiveKit room (see roomJoinedUserIds). */
function RecordChatCallJoin({ callId }: { callId: string | null }) {
  const room = useRoomContext();
  const reportedRef = useRef(false);

  useEffect(() => {
    if (!callId) return;
    const report = () => {
      if (reportedRef.current) return;
      reportedRef.current = true;
      updateCall(callId, { recordRoomJoin: true }).catch(() => {});
    };
    if (room.state === ConnectionState.Connected) report();
    room.on(RoomEvent.Connected, report);
    return () => {
      room.off(RoomEvent.Connected, report);
    };
  }, [room, callId]);

  return null;
}

function RoomContent({
  onLeave,
  onReconnect,
  initialAudioEnabled,
  initialVideoEnabled,
  hasPermissionError,
  roomName,
  isHost,
  waitingParticipantIdentities,
}: {
  onLeave: () => void;
  onReconnect: () => void;
  initialAudioEnabled: boolean;
  initialVideoEnabled: boolean;
  hasPermissionError: boolean;
  roomName: string;
  isHost: boolean;
  waitingParticipantIdentities?: string[];
}) {
  const room = useRoomContext();
  const [waitingIds, setWaitingIds] = useState<string[]>(waitingParticipantIdentities || []);
  const [fetchedWaitingIds, setFetchedWaitingIds] = useState<string[]>([]);
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
        isManuallyLeavingRef.current = true;
        setMeetingEndedToast(true);
        setTimeout(() => onLeave(), 800);
        return;
      }

      // Call ended by server (e.g. other person left in 1-on-1) – don't reconnect
      if (reason === DisconnectReason.PARTICIPANT_REMOVED || reason === DisconnectReason.ROOM_DELETED) {
        isManuallyLeavingRef.current = true;
        setMeetingEndedToast(true);
        setTimeout(() => onLeave(), 800);
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
        setMeetingEndedToast(true);
        setTimeout(() => {
          if (!isManuallyLeavingRef.current) {
            onLeave();
          }
        }, 800);
      }
    };

    const handleConnectionStateChange = (state: ConnectionState) => {
      connectionStateRef.current = state;
      if (state === ConnectionState.Connected) {
        setReconnecting(false);
        setReconnectAttempts(0);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      } else if (state === ConnectionState.Reconnecting) {
        setReconnecting(true);
      }
      // Do NOT call handleDisconnect on Disconnected - the "disconnected" event fires
      // with the reason; connectionStateChanged fires first without reason and would
      // incorrectly trigger reconnect logic when user intentionally leaves.
    };

    room.on("disconnected", handleDisconnect);
    room.on("connectionStateChanged", handleConnectionStateChange);

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

  const participants = useParticipants();
  const [recordingSlot, setRecordingSlot] = useState<HTMLElement | null>(null);
  const [recordingToast, setRecordingToast] = useState(false);
  const [meetingEndedToast, setMeetingEndedToast] = useState(false);
  const [meetingStartTime, setMeetingStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const participantCount = participants.length;

  useEffect(() => {
    if (room.state === ConnectionState.Connected && meetingStartTime === null) {
      setMeetingStartTime(Date.now());
    }
  }, [room.state, meetingStartTime]);

  useEffect(() => {
    if (meetingStartTime === null) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - meetingStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [meetingStartTime]);

  const formatDuration = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Inject recording button into control bar (beside the disconnect/leave button)
  useEffect(() => {
    const tryInject = () => {
      const bar = document.querySelector(".lk-control-bar");
      if (!bar) return false;
      let slot = document.getElementById("recording-button-slot");
      if (!slot) {
        slot = document.createElement("div");
        slot.id = "recording-button-slot";
        slot.style.cssText = "display:flex;align-items:center;order:90;";
        const leaveBtn = bar.querySelector(".lk-disconnect-button, [data-lk-disconnect], button[aria-label*='Leave'], button[aria-label*='Disconnect']");
        if (leaveBtn) {
          bar.insertBefore(slot, leaveBtn);
        } else {
          bar.appendChild(slot);
        }
      }
      setRecordingSlot(slot);
      return true;
    };
    if (tryInject()) return;
    const timer = setInterval(() => {
      if (tryInject()) clearInterval(timer);
    }, 300);
    return () => clearInterval(timer);
  }, []);

  // Recording started toast (auto-dismiss)
  useEffect(() => {
    if (!recordingToast) return;
    const t = setTimeout(() => setRecordingToast(false), 3000);
    return () => clearTimeout(t);
  }, [recordingToast]);

  useEffect(() => {
    if (waitingParticipantIdentities) {
      setWaitingIds(waitingParticipantIdentities);
    }
  }, [waitingParticipantIdentities]);

  // Fetch waiting participants for ALL users (not just hosts) so everyone can hide them
  useEffect(() => {
    const fetchWaitingParticipants = async () => {
      try {
        // Try to fetch waiting participants - works for authenticated users
        const response = await livekitApi.getWaitingParticipants(roomName);
        const ids = response.participants?.map(p => p.identity) || [];
        setFetchedWaitingIds(ids);
      } catch (err) {
        // If it fails, use empty array - the waitingIds from props will still work for hosts
        setFetchedWaitingIds([]);
      }
    };

    fetchWaitingParticipants();
    // Poll every 5 seconds
    const interval = setInterval(fetchWaitingParticipants, 5000);
    return () => clearInterval(interval);
  }, [roomName]);

  // Combine waiting IDs: prefer props (for hosts) but use fetched list for all participants
  const combinedWaitingIds = waitingIds.length > 0 ? waitingIds : fetchedWaitingIds;

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
        combinedWaitingIds.forEach((waitingId: string) => {
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
        .room-meeting-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          width: 100%;
          background: linear-gradient(180deg, #0f1012 0%, #181a1d 50%, #0f1012 100%);
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
          gap: 0.75rem;
          padding: 1rem;
        }
        .room-meeting-container .lk-participant-tile {
          min-height: 140px;
          border-radius: 12px;
          overflow: hidden;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .room-meeting-container .lk-participant-placeholder,
        .room-meeting-container [class*="placeholder"] {
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%) !important;
        }
        .room-meeting-container .lk-participant-placeholder svg,
        .room-meeting-container [class*="placeholder"] svg {
          width: 64px;
          height: 64px;
          opacity: 0.5;
        }
        .room-meeting-container .lk-control-bar {
          flex-shrink: 0;
          background: rgba(15,16,18,0.95);
          backdrop-filter: blur(12px);
          border-top: 1px solid rgba(255,255,255,0.08);
          padding: 1rem 1.5rem;
          gap: 0.5rem;
        }
        .room-meeting-container .lk-control-bar button {
          border-radius: 10px;
          transition: all 0.2s ease;
        }
        .room-meeting-container .lk-control-bar button:hover {
          background: rgba(255,255,255,0.1);
        }
        .room-meeting-container .lk-disconnect-button {
          background: rgba(239,68,68,0.2) !important;
          color: #f87171 !important;
        }
        .room-meeting-container .lk-disconnect-button:hover {
          background: rgba(239,68,68,0.35) !important;
        }
        #recording-button-slot .lk-button {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
        }
        .room-meeting-container .lk-participant-name {
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(8px);
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          font-size: 0.8rem;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        ${waitingParticipantsCSS}
        @media (max-width: 640px) {
          .room-meeting-container .lk-control-bar {
            padding-left: max(0.75rem, env(safe-area-inset-left));
            padding-right: max(0.75rem, env(safe-area-inset-right));
            padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
          }
        }
      `}} />
      <div className="room-meeting-container relative">
        {/* Top bar: call info */}
        <div className="absolute top-0 left-0 right-0 z-[100] flex items-center justify-between px-5 py-3 bg-gradient-to-b from-black/70 via-black/40 to-transparent pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md text-white text-sm font-medium tabular-nums border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <i className="ti ti-clock text-base opacity-90" />
              {formatDuration(elapsedSeconds)}
            </span>
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md text-white text-sm font-medium border border-white/10">
              <i className="ti ti-users text-base opacity-90" />
              {participantCount} {participantCount === 1 ? "participant" : "participants"}
            </span>
          </div>
        </div>

        <VideoConference />
        <RoomAudioRenderer />
        {recordingSlot &&
          createPortal(
            <RecordingButton
              roomName={roomName}
              controlBar
              onRecordingStarted={() => setRecordingToast(true)}
            />,
            recordingSlot
          )}
        {recordingToast && (
          <div
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[2000] px-4 py-3 rounded-xl bg-emerald-600/95 text-white text-sm font-medium shadow-xl flex items-center gap-2"
            role="alert"
          >
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            </span>
            <i className="ti ti-record text-base" />
            <span>Recording started</span>
          </div>
        )}
        {meetingEndedToast && (
          <div
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[2000] px-4 py-3 rounded-xl bg-gray-800/95 text-white text-sm font-medium shadow-xl flex items-center gap-2"
            role="alert"
          >
            <i className="ti ti-circle-check text-lg text-emerald-400" />
            <span>Meeting ended</span>
          </div>
        )}
      {isHost && (
        <WaitingParticipantsPanel
          roomName={roomName}
          onParticipantAdmitted={(identity) => {
            setWaitingIds((prev) => prev.filter(id => id !== identity));
            setFetchedWaitingIds((prev) => prev.filter(id => id !== identity));
          }}
          onWaitingParticipantsChange={(identities) => {
            setWaitingIds(identities);
            setFetchedWaitingIds(identities);
          }}
        />
      )}
      {reconnecting && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200]">
          <div className="text-center text-white max-w-sm px-8 py-8 rounded-2xl bg-white/5 border border-white/10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 border border-primary/40 mb-5">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
            <p className="text-lg font-semibold mb-1">Reconnecting…</p>
            <p className="text-sm text-gray-400 mb-6">
              Attempt {reconnectAttempts} of {MAX_RECONNECT_ATTEMPTS}
            </p>
            <button
              type="button"
              onClick={() => onReconnect()}
              className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Rejoin now
            </button>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

export default function MeetingRoomClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [reconnectKey, setReconnectKey] = useState(0);
  const [hasPermissionError, setHasPermissionError] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [isInWaitingRoom, setIsInWaitingRoom] = useState(false);
  const [participantIdentity, setParticipantIdentity] = useState<string | null>(null);
  const [mediaFailureKind, setMediaFailureKind] = useState<string | null>(null);

  // Try to get user from auth context
  let user = null;
  try {
    const authContext = useAuth();
    user = authContext?.user || null;
  } catch {
    // Not in auth context, user will be null
  }

  const roomId = params.roomId as string;
  const fromChat = searchParams.get("from") === "chat";
  const returnConvId = searchParams.get("conv") || null;
  const chatCallIdParam = searchParams.get("callId");
  const recordChatCallJoinId = useMemo(() => {
    if (!fromChat) return null;
    const name = decodeURIComponent(roomId);
    if (!name.startsWith("chat-")) return null;
    const id = chatCallIdParam?.trim();
    return id || null;
  }, [fromChat, roomId, chatCallIdParam]);
  const participantName = useMemo(() => {
    return (
      searchParams.get("name") || user?.name || user?.email || `user-${Math.random().toString(36).substr(2, 9)}`
    );
  }, [searchParams, user]);

  const participantEmail = useMemo(() => {
    return searchParams.get("email") || user?.email || null;
  }, [searchParams, user]);

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
      const data = await livekitApi.getLiveKitToken(roomName, participantName, participantEmail || undefined);
      setToken(data.token);
      setIsHost(data.isHost || false);
      setParticipantIdentity(data.participantIdentity);
      // If not a host, they're in waiting room (can subscribe but not publish)
      setIsInWaitingRoom(!data.isHost);
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
  }, [roomId, participantName, participantEmail, livekitUrl]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken, reconnectKey]);

  const handleLeave = useCallback(async () => {
    const roomName = decodeURIComponent(roomId);
    if (fromChat && roomName.startsWith("chat-")) {
      await endCallByRoom(roomName).catch(() => {});
      try {
        window.close();
      } catch {
        /* ignore */
      }
      const returnUrl = returnConvId
        ? `/communication/chats?conv=${encodeURIComponent(returnConvId)}`
        : "/communication/chats";
      router.push(returnUrl);
    } else {
      if (isHost) {
        updateMeeting(roomName, { status: "ended" }).catch(() => {});
      }
      router.push("/meetings/pre-join/");
    }
  }, [router, roomId, isHost, fromChat, returnConvId]);

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
      const data = await livekitApi.getLiveKitToken(roomName, participantName, participantEmail || undefined);
      setToken(data.token);
      setIsHost(data.isHost || false);
      setIsInWaitingRoom(!data.isHost);
      setReconnectKey((prev) => prev + 1);
    } catch (err) {
      console.error("Error fetching token during reconnect:", err);
      setTimeout(() => handleReconnect(), INITIAL_RECONNECT_DELAY);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, participantName, participantEmail]);

  const handleAdmitted = useCallback(async (newToken: string) => {
    // Participant was admitted, update token and reconnect
    setToken(newToken);
    setIsInWaitingRoom(false);
    setIsHost(true); // Admitted participants get host-like permissions
    setReconnectKey((prev) => prev + 1);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1012]">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 border border-primary/40 mb-5">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
          <p className="text-white font-medium">Connecting to call...</p>
          <p className="text-gray-400 text-sm mt-1">Please wait</p>
        </div>
      </div>
    );
  }

  if (error) {
    const isVideoPermissionError = mediaFailureKind === "videoinput";
    const tryAudioOnly = () => {
      setError("");
      setMediaFailureKind(null);
      setToken("");
      const url = new URL(window.location.href);
      url.searchParams.set("video", "0");
      window.location.href = url.toString();
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1012] p-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-md w-full">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-500/20 mb-6">
            <i className="ti ti-alert-circle text-2xl text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2 text-center">Connection Error</h2>
          <p className="text-gray-400 mb-6 text-center">{error}</p>
          <div className="space-y-3 text-sm text-gray-500 mb-6">
            <p className="font-medium text-gray-400">To fix camera/microphone access:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Click the lock or camera icon in your browser&apos;s address bar</li>
              <li>Allow camera and microphone for this site</li>
              <li>Reload the page and try again</li>
              <li>Ensure you&apos;re using HTTPS (required for media access)</li>
            </ul>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {isVideoPermissionError && (
              <button
                onClick={tryAudioOnly}
                className="ti-btn ti-btn-primary rounded-xl"
              >
                <i className="ti ti-microphone me-2" />
                Join with audio only
              </button>
            )}
            <button
              onClick={() => { setError(""); setMediaFailureKind(null); fetchToken(); }}
              className="ti-btn ti-btn-outline-primary rounded-xl"
            >
              Retry
            </button>
            <button
              onClick={handleLeave}
              className="ti-btn ti-btn-outline-secondary rounded-xl text-gray-300 hover:text-white border-white/20"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show waiting room for non-host participants
  if (isInWaitingRoom && token) {
    return (
      <LiveKitRoom
        key={reconnectKey}
        video={false}
        audio={false}
        token={token}
        serverUrl={livekitUrl}
        onDisconnected={handleDisconnect}
        onError={handleError}
        options={{
          adaptiveStream: true,
          dynacast: true,
        }}
        data-lk-theme="default"
        className="room-page !h-full !min-h-screen w-full"
      >
        <WaitingRoom
          participantName={participantName}
          roomName={decodeURIComponent(roomId)}
          participantIdentity={participantIdentity || undefined}
          onAdmitted={handleAdmitted}
        />
      </LiveKitRoom>
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
          setMediaFailureKind(kind || null);
          const deviceName = kind === "videoinput" ? "camera" : kind === "audioinput" ? "microphone" : "media device";
          setError(
            `Failed to access ${deviceName}. Please check your browser permissions or try joining with audio only.`
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
      className="room-page !h-full !min-h-screen w-full"
    >
      {recordChatCallJoinId ? <RecordChatCallJoin callId={recordChatCallJoinId} /> : null}
      <RoomContent
        onLeave={handleLeave}
        onReconnect={handleReconnect}
        initialAudioEnabled={audioEnabled}
        initialVideoEnabled={videoEnabled}
        hasPermissionError={hasPermissionError}
        roomName={decodeURIComponent(roomId)}
        isHost={isHost}
      />
    </LiveKitRoom>
  );
}
