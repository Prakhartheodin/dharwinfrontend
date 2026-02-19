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
import { RecordingButton } from "@/shared/components/livekit/recording-button";
import { WaitingRoom } from "@/shared/components/livekit/waiting-room";
import { WaitingParticipantsPanel } from "@/shared/components/livekit/waiting-participants-panel";
import * as livekitApi from "@/shared/lib/api/livekit";
import { useAuth } from "@/shared/contexts/auth-context";

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

  const participants = useParticipants();

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
    // Poll every 3 seconds to get updated waiting list
    const interval = setInterval(fetchWaitingParticipants, 3000);
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
        ${waitingParticipantsCSS}
      `}} />
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
      {isHost && (
        <div
          style={{
            position: "absolute",
            top: "16px",
            left: "16px",
            zIndex: 1000,
            maxWidth: "400px",
          }}
        >
          <WaitingParticipantsPanel
            roomName={roomName}
            onParticipantAdmitted={(identity) => {
              console.log("Participant admitted:", identity);
              // Remove from waiting list immediately when admitted
              setWaitingIds((prev) => prev.filter(id => id !== identity));
              setFetchedWaitingIds((prev) => prev.filter(id => id !== identity));
            }}
            onWaitingParticipantsChange={(identities) => {
              setWaitingIds(identities);
              // Also update fetched list
              setFetchedWaitingIds(identities);
            }}
          />
        </div>
      )}
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

  // Try to get user from auth context
  let user = null;
  try {
    const authContext = useAuth();
    user = authContext?.user || null;
  } catch {
    // Not in auth context, user will be null
  }

  const roomId = params.roomId as string;
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
        className="room-page h-screen"
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
        isHost={isHost}
      />
    </LiveKitRoom>
  );
}
