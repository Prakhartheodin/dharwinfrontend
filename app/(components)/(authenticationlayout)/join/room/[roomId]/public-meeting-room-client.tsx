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
import * as livekitApi from "@/shared/lib/api/livekit";
import { endMeetingPublic } from "@/shared/lib/api/meetings";
import { useAuth } from "@/shared/contexts/auth-context";
import { WaitingParticipantsPanel } from "@/shared/components/livekit/waiting-participants-panel";
import { RecordingButton } from "@/shared/components/livekit/recording-button";

const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 3000;  // Longer initial delay to let network stabilize
const MAX_RECONNECT_DELAY = 20000;

const LOBBY_AUDIO_BAR_COUNT = 5;

/** Live camera preview + mic level meters for the public join waiting room */
function LobbyDevicePreview({
  enabled,
  showVideo,
  showAudio,
}: {
  enabled: boolean;
  showVideo: boolean;
  showAudio: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const freqDataRef = useRef<Uint8Array | null>(null);

  const stopAll = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    analyserRef.current = null;
    freqDataRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const v = videoRef.current;
    if (v) {
      v.srcObject = null;
    }
    for (let i = 0; i < LOBBY_AUDIO_BAR_COUNT; i++) {
      const el = barRefs.current[i];
      if (el) el.style.transform = "scaleY(0.12)";
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopAll();
      return;
    }
    if (!showVideo && !showAudio) {
      stopAll();
      return;
    }

    let cancelled = false;

    const runBars = () => {
      const analyser = analyserRef.current;
      const data = freqDataRef.current;
      if (!analyser || !data) return;
      analyser.getByteFrequencyData(data);
      const step = Math.max(1, Math.floor(data.length / LOBBY_AUDIO_BAR_COUNT));
      for (let i = 0; i < LOBBY_AUDIO_BAR_COUNT; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) sum += data[i * step + j] ?? 0;
        const avg = sum / step / 255;
        const scale = 0.12 + avg * 0.88;
        const el = barRefs.current[i];
        if (el) el.style.transform = `scaleY(${Math.min(1, scale)})`;
      }
      rafRef.current = requestAnimationFrame(runBars);
    };

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: showVideo ? { facingMode: "user" } : false,
          audio: showAudio || false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        stopAll();
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const v = videoRef.current;
        if (showVideo && v) {
          v.srcObject = stream;
          v.muted = true;
          await v.play().catch(() => {});
        } else if (v) {
          v.srcObject = null;
        }

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          stopAll();
          return;
        }

        if (showAudio && stream.getAudioTracks().length > 0) {
          const ctx = new AudioContext();
          await ctx.resume().catch(() => {});
          audioCtxRef.current = ctx;
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.65;
          const src = ctx.createMediaStreamSource(stream);
          src.connect(analyser);
          sourceRef.current = src;
          analyserRef.current = analyser;
          freqDataRef.current = new Uint8Array(analyser.frequencyBinCount);
          rafRef.current = requestAnimationFrame(runBars);
        }
      } catch {
        stopAll();
      }
    })();

    return () => {
      cancelled = true;
      stopAll();
    };
  }, [enabled, showVideo, showAudio, stopAll]);

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Preview</p>
      <div
        className="relative w-full overflow-hidden rounded-xl border border-gray-600 bg-black aspect-video"
        aria-label="Camera preview"
      >
        <video
          ref={videoRef}
          className={`h-full w-full object-cover ${showVideo ? "block" : "hidden"} [transform:scaleX(-1)]`}
          playsInline
          muted
          autoPlay
        />
        {!showVideo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500">
            <i className="ri-camera-off-line text-4xl" aria-hidden />
            <span className="text-sm">Camera off</span>
          </div>
        )}
        {showVideo && enabled && (
          <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/55 px-2 py-0.5 text-[0.65rem] text-gray-300">
            Mirror preview
          </div>
        )}
      </div>
      <div>
        <p className="mb-2 text-xs text-gray-500">Microphone level</p>
        <div
          className="flex h-10 items-end justify-center gap-1.5 rounded-lg border border-gray-600 bg-gray-900/80 px-3 py-2"
          aria-label="Microphone level preview"
        >
          {Array.from({ length: LOBBY_AUDIO_BAR_COUNT }, (_, i) => (
            <div
              key={i}
              ref={(el) => {
                barRefs.current[i] = el;
              }}
              className="w-2 origin-bottom rounded-full bg-primary/90 transition-[transform] duration-75"
              style={{ height: "100%", transform: "scaleY(0.12)" }}
            />
          ))}
        </div>
        {!showAudio && (
          <p className="mt-1.5 text-xs text-gray-600">Turn the microphone on to see level activity.</p>
        )}
      </div>
    </div>
  );
}

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
        setMeetingEndedToast(true);
        setTimeout(() => onLeave(), 2000);
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
        setMeetingEndedToast(true);
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
  const [recordingSlot, setRecordingSlot] = useState<HTMLElement | null>(null);
  const [recordingToast, setRecordingToast] = useState(false);
  const [meetingEndedToast, setMeetingEndedToast] = useState(false);

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
    // Poll every 5 seconds (reduces API load and potential reconnect triggers)
    const interval = setInterval(fetchWaitingParticipants, 5000);
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
        #recording-button-slot .lk-button {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
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
          .room-meeting-container .lk-grid-layout {
            grid-gap: 0.25rem;
            padding: 0.25rem;
          }
        }
      `}} />
      <div className="room-meeting-container relative flex flex-col h-full min-h-0 w-full">
        <VideoConference />
        <RoomAudioRenderer />
        {recordingSlot &&
          createPortal(
            <RecordingButton
              roomName={roomName}
              hostEmail={participantEmail || undefined}
              controlBar
              onRecordingStarted={() => setRecordingToast(true)}
            />,
            recordingSlot
          )}
        {recordingToast && (
          <div
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[2000] px-4 py-3 rounded-lg bg-success/95 text-white text-sm font-medium shadow-lg"
            role="alert"
          >
            <span className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse" />
              Recording has started in meeting
            </span>
          </div>
        )}
        {meetingEndedToast && (
          <div
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[2000] px-4 py-3 rounded-lg bg-gray-700/95 text-white text-sm font-medium shadow-lg"
            role="alert"
          >
            <span className="flex items-center gap-2">
              <i className="ri-checkbox-circle-line text-lg" />
              Meeting ended
            </span>
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

function tokenGrantsPublishAccess(data: { isHost?: boolean; canPublish?: boolean }): boolean {
  return data.isHost === true || data.canPublish === true;
}

function displayNameFromUser(user: { name?: string; email?: string } | null): string {
  if (!user) return "";
  const n = typeof user.name === "string" ? user.name.trim() : "";
  if (n) return n;
  const em = typeof user.email === "string" ? user.email.trim() : "";
  if (em) {
    const local = em.split("@")[0]?.trim();
    if (local) return local;
  }
  return "";
}

export default function PublicMeetingRoomClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user: authUser, isChecked: authChecked } = useAuth();
  /** Prefer ?room= (invite links / static export); path [roomId] may be placeholder "_" */
  const roomId = (() => {
    const q = searchParams?.get("room")?.trim() || "";
    const p = (params?.roomId as string)?.trim() || "";
    if (q) return q;
    if (p && p !== "_") return p;
    return p || "";
  })();
  const nameFromQuery = searchParams.get("name")?.trim();
  const emailFromQuery = searchParams.get("email")?.trim();
  /** If only email is in the link, use local-part as display name so join still works */
  const nameDerivedFromEmail =
    !nameFromQuery && emailFromQuery
      ? emailFromQuery.split("@")[0]?.trim() || ""
      : "";
  const emailFromSession = authChecked ? (authUser?.email?.trim() ?? "") : "";

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
  const participantIdentityRef = useRef<string | null>(null);

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
  /** User must pass the lobby (editable name, read-only email) before we request a LiveKit token */
  const [preJoinCommitted, setPreJoinCommitted] = useState(false);

  const participantName = preJoinCommitted ? preJoinName.trim() : "";
  const participantEmail = preJoinCommitted ? preJoinEmail.trim() : "";

  useEffect(() => {
    participantIdentityRef.current = participantIdentity;
  }, [participantIdentity]);

  // Lobby: prefill name/email from invite link, prefill_* params, or signed-in user (email is not editable in UI)
  useEffect(() => {
    if (preJoinCommitted) return;
    if (!authChecked && !emailFromQuery && !nameFromQuery) return;

    const prefillNameQ =
      nameFromQuery ||
      nameDerivedFromEmail ||
      searchParams.get("prefill_name")?.trim() ||
      searchParams.get("name")?.trim() ||
      "";
    const prefillEmailQ =
      emailFromQuery ||
      searchParams.get("prefill_email")?.trim() ||
      searchParams.get("email")?.trim() ||
      "";

    const sessionDisplay = displayNameFromUser(authUser);
    const sessionEmail = authUser?.email?.trim() ?? "";
    const derivedFromEmail =
      !prefillNameQ && prefillEmailQ
        ? prefillEmailQ.split("@")[0]?.trim() || ""
        : "";

    setPreJoinName((prev) => {
      if (prev.trim()) return prev;
      if (prefillNameQ) return prefillNameQ;
      if (derivedFromEmail) return derivedFromEmail;
      return sessionDisplay;
    });
    setPreJoinEmail((prev) => {
      if (prev.trim()) return prev;
      if (prefillEmailQ) return prefillEmailQ;
      return sessionEmail;
    });
  }, [preJoinCommitted, authChecked, authUser, searchParams, emailFromQuery, nameFromQuery, nameDerivedFromEmail]);

  const audioEnabled = useMemo(() => {
    if (!preJoinCommitted) return preJoinAudio;
    if (searchParams.get("audio") === "0") return false;
    return preJoinAudio;
  }, [preJoinCommitted, preJoinAudio, searchParams]);
  const videoEnabled = useMemo(() => {
    if (!preJoinCommitted) return preJoinVideo;
    if (searchParams.get("video") === "0") return false;
    return preJoinVideo;
  }, [preJoinCommitted, preJoinVideo, searchParams]);

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  // Request browser audio/video permission when lobby opens (before join), like L5-working
  useEffect(() => {
    if (preJoinCommitted) return;
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
  }, [preJoinCommitted]);

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
      setPreJoinCommitted(true);
    },
    [preJoinName, preJoinAudio, preJoinVideo, audioPermissionGranted, videoPermissionGranted]
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
      const pid = data.participantIdentity ?? null;
      setParticipantIdentity(pid);
      participantIdentityRef.current = pid;
      setIsHost(tokenGrantsPublishAccess(data));
      if (tokenGrantsPublishAccess(data)) {
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

  // Poll for admission when normal participant is waiting (must send same participantIdentity or server mints a new guest id)
  useEffect(() => {
    if (!waitingForAdmission || !participantName || !livekitUrl || !roomId || !participantIdentity) return;

    const roomName = decodeURIComponent(roomId);
    let pollCount = 0;
    const maxPolls = 300;

    const checkAdmission = async () => {
      pollCount++;
      const identity = participantIdentityRef.current;
      if (!identity) return;

      if (pollCount > maxPolls) {
        console.warn("Admission polling stopped after max attempts");
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
          identity
        );

        if (tokenGrantsPublishAccess(data)) {
          if (admissionPollRef.current) {
            clearInterval(admissionPollRef.current);
            admissionPollRef.current = null;
          }
          setToken(data.token);
          if (data.participantIdentity) {
            setParticipantIdentity(data.participantIdentity);
            participantIdentityRef.current = data.participantIdentity;
          }
          setIsHost(true);
          setWaitingForAdmission(false);
          setShowRoom(true);
          setReconnectKey((k) => k + 1);
        }
      } catch (err: unknown) {
        const errorMsg = String((err as { message?: string })?.message || "").toLowerCase();
        if (errorMsg.includes("network") || errorMsg.includes("failed")) {
          console.error("Error checking admission status:", err);
        }
      }
    };

    admissionPollRef.current = setInterval(checkAdmission, 1500);
    checkAdmission();

    return () => {
      if (admissionPollRef.current) {
        clearInterval(admissionPollRef.current);
        admissionPollRef.current = null;
      }
    };
  }, [waitingForAdmission, participantName, participantEmail, participantIdentity, livekitUrl, roomId]);

  const handleLeave = useCallback(() => {
    if (isHost && participantEmail) {
      const roomName = decodeURIComponent(roomId);
      endMeetingPublic(roomName, participantEmail).catch(() => {});
    }
    setPreJoinCommitted(false);
    setToken("");
    setParticipantIdentity(null);
    participantIdentityRef.current = null;
    setShowRoom(false);
    setWaitingForAdmission(false);
    router.push(`/join/room?room=${encodeURIComponent(roomId)}`);
  }, [router, roomId, isHost, participantEmail]);

  const handleReconnect = useCallback(async () => {
    if (!participantName || !roomId) return;
    try {
      setIsLoading(true);
      const roomName = decodeURIComponent(roomId);
      const data = await livekitApi.getPublicLiveKitToken(
        roomName,
        participantName,
        participantEmail || undefined,
        participantIdentityRef.current ?? participantIdentity ?? undefined
      );
      setToken(data.token);
      if (data.participantIdentity) {
        setParticipantIdentity(data.participantIdentity);
        participantIdentityRef.current = data.participantIdentity;
      }
      setReconnectKey((prev) => prev + 1);
    } catch (err) {
      console.error("Error fetching token during reconnect:", err);
      setTimeout(() => handleReconnect(), INITIAL_RECONNECT_DELAY);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, participantName, participantEmail, participantIdentity]);

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

  if (!nameFromQuery && !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="text-center text-gray-300">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto mb-3" />
          <p className="text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  // Waiting room / lobby: always before connecting; name editable, email prefilled and read-only
  if (!preJoinCommitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="w-full max-w-md bg-gray-800 rounded-xl p-6 shadow-xl">
          <h1 className="text-xl font-semibold text-white mb-2">Waiting room</h1>
          <p className="text-gray-400 text-sm mb-6">
            Check how you&apos;ll appear in the meeting. You can change your display name. Your email comes from your invite link or account and can&apos;t be changed here. Allow microphone and/or camera — you can mute or turn video off inside the call. At least one is required to join.
          </p>
          <form onSubmit={handlePreJoinSubmit} className="space-y-4">
            <div>
              <label htmlFor="join-name" className="block text-sm font-medium text-gray-300 mb-1">
                Display name <span className="text-red-400">*</span>
              </label>
              <input
                id="join-name"
                type="text"
                value={preJoinName}
                onChange={(e) => setPreJoinName(e.target.value)}
                placeholder="e.g. John Doe"
                className="form-control !py-2 w-full border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-primary"
                required
                autoComplete="name"
              />
            </div>
            <div>
              <label htmlFor="join-email" className="block text-sm font-medium text-gray-300 mb-1">
                Email <span className="text-gray-500 text-xs font-normal">(from invite / account — read only)</span>
              </label>
              <input
                id="join-email"
                type="email"
                readOnly
                aria-readonly="true"
                value={preJoinEmail}
                placeholder="—"
                className="form-control !py-2 w-full border border-gray-600 rounded-lg bg-gray-900/60 text-gray-300 placeholder-gray-600 cursor-not-allowed focus:ring-0 focus:border-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                Used to recognize hosts. If this is empty, you join as a guest (host may need to admit you).
              </p>
            </div>
            <LobbyDevicePreview
              enabled
              showVideo={preJoinVideo && videoPermissionGranted}
              showAudio={preJoinAudio && audioPermissionGranted}
            />
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
                Join meeting
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
              {(participantName || participantEmail) && (
                <p className="text-gray-500 text-xs text-center -mt-4 mb-4 px-2">
                  <span className="text-gray-400">Joining as </span>
                  {participantName || "Guest"}
                  {participantEmail ? (
                    <span className="text-gray-500"> · {participantEmail}</span>
                  ) : null}
                </p>
              )}
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
                    participantIdentityRef.current = null;
                    setPreJoinCommitted(false);
                    router.push(`/join/room?room=${encodeURIComponent(roomId)}`);
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
