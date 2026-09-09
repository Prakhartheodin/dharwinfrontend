"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  useTracks,
  useSpeakingParticipants,
  ParticipantTile,
  ChatIcon,
  ChatToggle,
  ControlBar,
  ConnectionStateToast,
  LayoutContextProvider,
  isTrackReference,
  type TrackReferenceOrPlaceholder,
  type WidgetState,
  useConnectionState,
  useCreateLayoutContext,
  useMaybeLayoutContext,
} from "@livekit/components-react";
import { MeetingChat } from "./meeting-chat";
import { MeetingHandToastStack } from "./meeting-hand-toast";
import { MeetingControlBarRaiseHand } from "./raise-hand-button";
import {
  participantDisplayName,
  useMeetingRaiseHand,
} from "@/shared/hooks/use-meeting-raise-hand";
import { ConnectionState, Track } from "livekit-client";
import { MEETING_CONTROL_BAR_RESPONSIVE_CSS } from "./meeting-control-bar-responsive.css";
import { MeetingTileHandInMetadata } from "./meeting-tile-hand-badge";
import {
  BADGE_COUNT_CAP,
  formatBadgeCount,
  formatCountLocale,
} from "@/shared/lib/format-badge-count";

/** ControlBar chat is disabled — we inject ChatToggle beside screen share instead. */
export const MEETING_CONTROL_BAR_CONTROLS = {
  microphone: true,
  camera: true,
  screenShare: true,
  chat: false,
  leave: true,
} as const;

export const MEETING_CHAT_BUTTON_SLOT_ID = "chat-button-slot";

/** Count pill shows at this unread minimum (header bell uses the same ≥1 rule). */
export const MEETING_CHAT_UNREAD_BADGE_THRESHOLD = 1;

const LEAVE_BUTTON_SELECTOR =
  ".lk-disconnect-button, [data-lk-disconnect], button[aria-label*='Leave'], button[aria-label*='Disconnect']";

/** Portals ChatToggle into `.lk-control-bar` (after screen share, before leave). */
function MeetingControlBarChatToggle({ narrow }: { narrow: boolean }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const prevUnreadRef = useRef(0);
  const layoutContext = useMaybeLayoutContext();
  const chatOpen = layoutContext?.widget.state?.showChat === true;
  const unreadCount = layoutContext?.widget.state?.unreadMessages ?? 0;
  const hasUnread = !chatOpen && unreadCount > 0;
  const unreadLabel =
    unreadCount > BADGE_COUNT_CAP
      ? "99+ unread messages"
      : `${formatCountLocale(unreadCount)} unread message${unreadCount === 1 ? "" : "s"}`;
  const chatToggleLabel = chatOpen
    ? "Close chat"
    : hasUnread
      ? `Open chat, ${unreadLabel}`
      : "Open chat";

  useEffect(() => {
    if (chatOpen || unreadCount <= 0) {
      prevUnreadRef.current = unreadCount;
      setLiveAnnouncement("");
      return;
    }
    if (unreadCount > prevUnreadRef.current) {
      setLiveAnnouncement(
        unreadCount > BADGE_COUNT_CAP
          ? "99+ new chat messages"
          : `${formatCountLocale(unreadCount)} new chat message${unreadCount === 1 ? "" : "s"}`
      );
    }
    prevUnreadRef.current = unreadCount;
  }, [chatOpen, unreadCount]);

  useEffect(() => {
    const tryInject = () => {
      const bar = document.querySelector(
        ".lk-video-conference > .lk-control-bar"
      ) as HTMLElement | null;
      if (!bar) return false;

      let chatSlot = document.getElementById(MEETING_CHAT_BUTTON_SLOT_ID);
      if (!chatSlot) {
        chatSlot = document.createElement("div");
        chatSlot.id = MEETING_CHAT_BUTTON_SLOT_ID;
        chatSlot.style.cssText =
          "display:flex;align-items:center;order:80;flex-shrink:0;";
        const leaveBtn = bar.querySelector(LEAVE_BUTTON_SELECTOR);
        if (leaveBtn) {
          bar.insertBefore(chatSlot, leaveBtn);
        } else {
          bar.appendChild(chatSlot);
        }
      }
      setSlot(chatSlot);
      return true;
    };

    if (tryInject()) return;
    const timer = window.setInterval(() => {
      if (tryInject()) window.clearInterval(timer);
    }, 300);
    return () => window.clearInterval(timer);
  }, []);

  if (!slot) return null;

  return createPortal(
    <>
      <span className="meeting-sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </span>
      <ChatToggle aria-label={chatToggleLabel} aria-pressed={chatOpen}>
        <ChatIcon />
        {!narrow && <span className="meeting-chat-toggle-label">Chat</span>}
        {hasUnread && unreadCount >= MEETING_CHAT_UNREAD_BADGE_THRESHOLD && (
          <span className="meeting-chat-unread-badge-anchor" aria-hidden="true">
            <span className="meeting-chat-unread-badge">
              {formatBadgeCount(unreadCount)}
            </span>
          </span>
        )}
      </ChatToggle>
    </>,
    slot
  );
}

function useNarrowControlBar(breakpointPx = 760) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${breakpointPx}px)`);
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpointPx]);
  return narrow;
}

/**
 * Drop-in replacement for LiveKit's prebuilt <VideoConference>.
 *
 * The prebuilt component (and GridLayout / CarouselLayout) route tracks through
 * `useVisualStableUpdate`, which snapshots the tile list and then `indexOf`s the
 * old entries against the new list. When a camera *placeholder* tile
 * (`<id>_camera_placeholder`) is replaced by the real published track
 * (`<id>_camera_TR_xxx`) the placeholder id is no longer in the new array, so it
 * throws `Element not part of the array`.
 *
 * We avoid that path entirely: tiles are keyed by `identity + source` (NOT the
 * track sid), so the placeholder -> real swap reconciles the SAME React element
 * in place — no re-sort, no visual-stable-update, no throw, no remount flicker.
 *
 * Layout modes (Google-Meet style):
 *   - Grid     : equal tiles, default.
 *   - Spotlight: one big main tile + side strip. Triggered by screenshare,
 *                a pinned participant, or the user toggling Spotlight. In
 *                spotlight the main tile follows: pin > active speaker > first.
 *
 * Markup parity is preserved (`.lk-video-conference`, `.lk-grid-layout`,
 * `.lk-focus-layout`, `ParticipantTile`, `.lk-control-bar`) so the page's
 * control-bar slot injection and waiting-participant tile-hiding keep working.
 *
 * RoomAudioRenderer is intentionally NOT rendered here — the parent already
 * mounts one.
 */

/** Stable, sid-independent identity for a tile. */
function tileKey(ref: TrackReferenceOrPlaceholder): string {
  const source = ref.source ?? ref.publication?.source ?? "unknown";
  return `${ref.participant.identity}__${source}`;
}

/**
 * Google-Meet-style column count. Our custom grid replaces LiveKit's
 * <GridLayout>, which is the only thing that sets the `--lk-col-count` var the
 * default `.lk-grid-layout` CSS relies on. Without it the grid collapses to a
 * single column (tiles stack vertically, each full width). We compute columns
 * ourselves so every participant shares the space evenly.
 */
function gridColumns(count: number): number {
  if (count <= 1) return 1;
  if (count <= 4) return 2;
  if (count <= 9) return 3;
  if (count <= 16) return 4;
  return Math.ceil(Math.sqrt(count));
}

/** Camera tile + hover pin control. Wrapper carries the identity attribute so
 *  the page's waiting-participant hiding CSS still collapses the whole cell. */
function CamTile({
  trackRef,
  pinned,
  handRaised,
  onTogglePin,
}: {
  trackRef: TrackReferenceOrPlaceholder;
  pinned: boolean;
  handRaised?: boolean;
  onTogglePin: () => void;
}) {
  const tileRef = useRef<HTMLDivElement>(null);
  const displayName = participantDisplayName(trackRef.participant);
  const tileLabel = [
    displayName,
    handRaised ? "hand raised" : null,
    trackRef.participant.isSpeaking ? "speaking" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      ref={tileRef}
      className="lk-cam-tile"
      data-pinned={pinned ? "true" : undefined}
      data-hand-raised={handRaised ? "true" : undefined}
      data-lk-participant-identity={trackRef.participant.identity}
      role="group"
      aria-label={tileLabel}
    >
      <ParticipantTile trackRef={trackRef} />
      <button
        type="button"
        className="lk-pin-btn"
        aria-label={pinned ? "Unpin participant" : "Pin participant"}
        aria-pressed={pinned}
        title={pinned ? "Unpin" : "Pin to main"}
        onClick={(e) => {
          e.stopPropagation();
          onTogglePin();
        }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          {pinned ? (
            <path
              fill="currentColor"
              d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"
            />
          ) : (
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"
            />
          )}
        </svg>
      </button>
      <MeetingTileHandInMetadata
        active={Boolean(handRaised)}
        containerRef={tileRef}
      />
    </div>
  );
}

function LayoutToggle({
  spotlight,
  onToggle,
}: {
  spotlight: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="lk-layout-toggle"
      onClick={onToggle}
      aria-pressed={spotlight}
      title={spotlight ? "Switch to grid view" : "Switch to spotlight view"}
      aria-label={spotlight ? "Switch to grid view" : "Switch to spotlight view"}
    >
      {spotlight ? (
        // grid icon -> action returns to grid
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" />
        </svg>
      ) : (
        // spotlight icon
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <rect x="3" y="4" width="13" height="16" rx="1.5" fill="currentColor" />
          <rect x="18" y="4" width="3" height="5" rx="1" fill="currentColor" />
          <rect x="18" y="11" width="3" height="4.5" rx="1" fill="currentColor" />
          <rect x="18" y="17.5" width="3" height="2.5" rx="1" fill="currentColor" />
        </svg>
      )}
      <span className="lk-layout-toggle__label">
        {spotlight ? "Grid" : "Spotlight"}
      </span>
    </button>
  );
}

export function StableVideoConference() {
  const [widgetState, setWidgetState] = useState<WidgetState>({
    showChat: false,
    unreadMessages: 0,
    showSettings: false,
  });
  const layoutContext = useCreateLayoutContext();

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const speaking = useSpeakingParticipants();

  const [pinnedIdentity, setPinnedIdentity] = useState<string | null>(null);
  const [spotlightMode, setSpotlightMode] = useState(false);
  // Debounced active speaker so the main tile doesn't flicker between people.
  const [activeIdentity, setActiveIdentity] = useState<string | null>(null);

  // Hide bots from the grid. Dispatched agents (the meeting-summary / assistant
  // agents) join the room as audio-only participants with kind=AGENT. useTracks'
  // `withPlaceholder` mints a camera placeholder for every participant that has
  // no camera track — including the agent — so without this filter the agent
  // surfaces as an empty tile the moment recording starts. `participant.isAgent`
  // reflects LiveKit's server-assigned AGENT kind.
  const screenShareTracks = useMemo(
    () =>
      tracks.filter(
        (t) =>
          t.source === Track.Source.ScreenShare &&
          isTrackReference(t) &&
          !t.participant.isAgent
      ),
    [tracks]
  );

  const cameraTracks = useMemo(
    () =>
      tracks.filter(
        (t) => t.source === Track.Source.Camera && !t.participant.isAgent
      ),
    [tracks]
  );

  const loudestIdentity = speaking[0]?.identity ?? null;

  // Promote a new speaker to the main tile only after they hold the floor
  // briefly; silence keeps the last speaker centered (no snap back to nobody).
  useEffect(() => {
    if (!loudestIdentity) return;
    const t = setTimeout(() => setActiveIdentity(loudestIdentity), 600);
    return () => clearTimeout(t);
  }, [loudestIdentity]);

  // Drop a stale pin if that participant left.
  useEffect(() => {
    if (
      pinnedIdentity &&
      !cameraTracks.some((t) => t.participant.identity === pinnedIdentity)
    ) {
      setPinnedIdentity(null);
    }
  }, [pinnedIdentity, cameraTracks]);

  const hasScreenShare = screenShareTracks.length > 0;

  // Which camera is the main tile when spotlighting cameras.
  const mainIdentity =
    pinnedIdentity ??
    (activeIdentity &&
    cameraTracks.some((t) => t.participant.identity === activeIdentity)
      ? activeIdentity
      : cameraTracks[0]?.participant.identity ?? null);

  // Spotlight engages on screenshare, an explicit pin, or the user's toggle —
  // but only meaningful with 2+ cameras.
  const cameraSpotlight =
    !hasScreenShare &&
    (pinnedIdentity != null || spotlightMode) &&
    cameraTracks.length >= 2 &&
    mainIdentity != null;

  const mainCam = cameraSpotlight
    ? cameraTracks.find((t) => t.participant.identity === mainIdentity) ?? null
    : null;
  const stripCams = cameraSpotlight
    ? cameraTracks.filter((t) => t.participant.identity !== mainIdentity)
    : [];

  const togglePin = (identity: string) =>
    setPinnedIdentity((cur) => (cur === identity ? null : identity));

  // Even, Google-Meet-style grid. We set the columns (and the `--lk-col-count`
  // var LiveKit's own CSS reads) ourselves because we don't use <GridLayout>.
  const cols = gridColumns(cameraTracks.length);
  const rows = Math.max(1, Math.ceil(cameraTracks.length / cols));
  const gridStyle: CSSProperties & Record<string, string | number> = {
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    gridAutoRows: "minmax(0, 1fr)",
    gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
    height: "100%",
    width: "100%",
    placeItems: "stretch",
    "--lk-col-count": cols,
  };

  const narrowControlBar = useNarrowControlBar();
  const { participants, handStates } = useMeetingRaiseHand();

  // Chat is a right-anchored drawer over the stage. It stays mounted while
  // closed so `useChat`'s in-memory history and the unread counter survive a
  // close/open cycle — LiveKit does not persist messages, unmounting loses them.
  const chatOpen = widgetState.showChat === true;
  const chatPanelRef = useRef<HTMLElement>(null);

  // Opening the drawer means the user intends to type. Sending focus straight
  // to the input saves a click and lands after the slide-in.
  useEffect(() => {
    if (!chatOpen) return;
    const input = chatPanelRef.current?.querySelector<HTMLInputElement>(
      ".lk-chat-form-input"
    );
    const t = setTimeout(() => input?.focus(), 280);
    return () => clearTimeout(t);
  }, [chatOpen]);

  // LiveKit's <Chat> submit handler awaits send() with no catch, so submitting
  // while the room is down rejects with `UnexpectedConnectionState: PC manager
  // is closed` — an unhandled rejection that shows the dev error overlay and,
  // in production, drops the message with no feedback at all. Intercept submit
  // in the CAPTURE phase (before React's handler) whenever we're not connected:
  // the typed text stays in the input and the drawer says why it didn't send.
  // ponytail: guards the disconnected case only; other send rejections still
  // belong to the prefab. Owning the markup via useChat is the upgrade path.
  const connectionState = useConnectionState();
  const chatOffline = connectionState !== ConnectionState.Connected;

  useEffect(() => {
    const panel = chatPanelRef.current;
    if (!panel || !chatOffline) return;
    const blockSubmit = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    panel.addEventListener("submit", blockSubmit, true);
    return () => panel.removeEventListener("submit", blockSubmit, true);
  }, [chatOffline]);

  // Memoize the control bar so re-renders from pin / spotlight / active-speaker
  // state never reconcile <ControlBar>. The page injects #recording-button-slot
  // into .lk-control-bar via raw DOM; a parent-driven reconcile would wipe that
  // foreign node and the host's recording button would vanish.
  const controls = useMemo(
    () => (
      <>
        <ControlBar
          variation={narrowControlBar ? "minimal" : "verbose"}
          controls={MEETING_CONTROL_BAR_CONTROLS}
        />
        <ConnectionStateToast />
      </>
    ),
    [narrowControlBar]
  );

  return (
    <LayoutContextProvider
      value={layoutContext}
      onWidgetChange={setWidgetState}
    >
    <div
      className="lk-video-conference"
      data-chat-open={chatOpen ? "true" : undefined}
      data-unread={
        !chatOpen && (widgetState.unreadMessages ?? 0) > 0 ? "true" : undefined
      }
    >
      <style>{SVC_CSS}</style>
      <div className="lk-video-conference-inner">
        {/* Layout toggle hidden when screensharing (forced spotlight) or <2 cams. */}
        {!hasScreenShare && cameraTracks.length >= 2 && (
          <LayoutToggle
            spotlight={spotlightMode || pinnedIdentity != null}
            onToggle={() => {
              if (pinnedIdentity) setPinnedIdentity(null);
              setSpotlightMode((v) => !v);
            }}
          />
        )}

        {hasScreenShare ? (
          <div className="lk-focus-layout">
            <div className="lk-focus-layout-main">
              {screenShareTracks.map((ref) => (
                <ParticipantTile key={tileKey(ref)} trackRef={ref} />
              ))}
            </div>
            <aside className="lk-grid-layout lk-camera-strip">
              {cameraTracks.map((ref) => (
                <CamTile
                  key={tileKey(ref)}
                  trackRef={ref}
                  pinned={ref.participant.identity === pinnedIdentity}
                  handRaised={handStates[ref.participant.identity] ?? false}
                  onTogglePin={() => togglePin(ref.participant.identity)}
                />
              ))}
            </aside>
          </div>
        ) : cameraSpotlight && mainCam ? (
          <div className="lk-focus-layout">
            <div className="lk-focus-layout-main">
              <CamTile
                key={tileKey(mainCam)}
                trackRef={mainCam}
                pinned={mainCam.participant.identity === pinnedIdentity}
                handRaised={handStates[mainCam.participant.identity] ?? false}
                onTogglePin={() => togglePin(mainCam.participant.identity)}
              />
            </div>
            <aside className="lk-grid-layout lk-camera-strip">
              {stripCams.map((ref) => (
                <CamTile
                  key={tileKey(ref)}
                  trackRef={ref}
                  pinned={ref.participant.identity === pinnedIdentity}
                  handRaised={handStates[ref.participant.identity] ?? false}
                  onTogglePin={() => togglePin(ref.participant.identity)}
                />
              ))}
            </aside>
          </div>
        ) : (
          <div className="lk-grid-layout" style={gridStyle}>
            {cameraTracks.map((ref) => (
              <CamTile
                key={tileKey(ref)}
                trackRef={ref}
                pinned={ref.participant.identity === pinnedIdentity}
                handRaised={handStates[ref.participant.identity] ?? false}
                onTogglePin={() => togglePin(ref.participant.identity)}
              />
            ))}
          </div>
        )}

        <MeetingHandToastStack participants={participants} />

        <aside
          ref={chatPanelRef}
          className="lk-chat-panel"
          data-open={chatOpen ? "true" : undefined}
          data-offline={chatOffline ? "true" : undefined}
          aria-label="Meeting chat"
          inert={!chatOpen ? true : undefined}
        >
          <MeetingChat chatOpen={chatOpen} />
          {chatOffline && (
            <p className="lk-chat-offline" role="status">
              {connectionState === ConnectionState.Reconnecting
                ? "Reconnecting. Messages you send now won't go through."
                : "You're not connected to the meeting. Rejoin to send messages."}
            </p>
          )}
        </aside>
      </div>
      {controls}
      <MeetingControlBarRaiseHand narrow={narrowControlBar} />
      <MeetingControlBarChatToggle narrow={narrowControlBar} />
    </div>
    </LayoutContextProvider>
  );
}

/* Self-contained styling for the pin control, layout toggle, spotlight strip
 * and entrance transitions. Scoped under our own classnames so it doesn't
 * disturb either meeting-room page's existing LiveKit overrides. */
const SVC_CSS = `
/* LiveKit's .lk-video-conference is display:flex with the DEFAULT row direction
 * (its prebuilt nests the control bar inside .lk-video-conference-inner). We render
 * {controls} as a sibling of the inner column, so without forcing column the bar is
 * stretched to full height and its button-groups render as tall vertical bands with
 * the icons floating at mid-screen (broken on phones/tablets). Column = video fills,
 * bar pinned short at the bottom. The public room sets this on its own container; this
 * makes the component self-correct for every consumer (e.g. the authenticated room). */
.lk-video-conference { flex-direction: column; }
.lk-video-conference-inner { position: relative; flex: 1 1 auto; min-height: 0; }
.lk-video-conference > .lk-control-bar { margin-top: auto; }

.lk-cam-tile {
  position: relative;
  min-width: 0;
  min-height: 0;
  height: 100%;
  width: 100%;
  border-radius: 14px;
  overflow: hidden;
  animation: lkTileIn 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.lk-cam-tile > .lk-participant-tile {
  height: 100% !important;
  width: 100% !important;
}
.lk-cam-tile[data-pinned="true"] {
  outline: 2px solid var(--obs-accent, #00E6C3);
  outline-offset: -2px;
  box-shadow: 0 0 0 1px var(--obs-accent, #00E6C3), 0 8px 32px -6px rgba(0,230,195,0.3);
}

@keyframes lkTileIn {
  from { opacity: 0; transform: scale(0.985); }
  to   { opacity: 1; transform: scale(1); }
}

.lk-pin-btn {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 6;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.16);
  background: rgba(15,16,18,0.55);
  backdrop-filter: blur(8px);
  color: #fff;
  cursor: pointer;
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 160ms ease, transform 160ms ease, background 160ms ease;
}
.lk-cam-tile:hover .lk-pin-btn,
.lk-cam-tile:focus-within .lk-pin-btn,
.lk-cam-tile[data-pinned="true"] .lk-pin-btn {
  opacity: 1;
  transform: translateY(0);
}
.lk-pin-btn:hover { background: rgba(15,16,18,0.8); }

.meeting-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.meeting-hand-toast-stack {
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 25;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  width: min(420px, calc(100% - 2rem));
  pointer-events: none;
}
.meeting-hand-toast {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  max-width: 100%;
  padding: 0.65rem 1rem;
  border-radius: 12px;
  background: rgba(11,13,14,0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(0,230,195,0.35);
  box-shadow: 0 8px 32px -8px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(255,255,255,0.04);
  color: var(--obs-fg, #f4f5f6);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.35;
  animation: meetingHandToastIn 280ms cubic-bezier(0.2, 0.8, 0.2, 1);
  pointer-events: auto;
}
.meeting-hand-toast-icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(0,230,195,0.15);
  color: var(--obs-accent, #00E6C3);
  font-size: 14px;
  line-height: 1;
}
.meeting-hand-toast-message {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@keyframes meetingHandToastIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes meetingHandToastFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.meeting-tile-hand-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  background: rgba(0,230,195,0.18);
  border: 1px solid rgba(0,230,195,0.4);
  color: var(--obs-accent, #00E6C3);
  font-size: 11px;
  line-height: 1;
}
.lk-cam-tile .lk-participant-metadata .lk-participant-metadata-item:has(.meeting-tile-hand-badge) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  max-width: 100%;
}
.lk-cam-tile .lk-participant-metadata .lk-participant-metadata-item:has(.meeting-tile-hand-badge) .lk-participant-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lk-control-bar .meeting-raise-hand-btn .ri-hand {
  font-size: 16px;
  line-height: 1;
}
.lk-control-bar .meeting-raise-hand-btn:focus-visible,
.lk-control-bar .lk-button:focus-visible {
  outline: 2px solid var(--obs-accent, #00E6C3);
  outline-offset: 2px;
}

.lk-pin-btn[aria-pressed="true"] {
  background: var(--obs-accent, #00E6C3);
  border-color: var(--obs-accent, #00E6C3);
  color: #06231f;
}
/* Touch devices have no hover — keep the control discoverable. */
@media (hover: none) {
  .lk-pin-btn { opacity: 0.85; transform: none; }
}

.lk-layout-toggle {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 20;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(15,16,18,0.6);
  backdrop-filter: blur(10px);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease;
}
.lk-layout-toggle:hover { background: rgba(15,16,18,0.85); }
.lk-layout-toggle[aria-pressed="true"] {
  border-color: rgba(0,230,195,0.4);
  color: #d6fff6;
}
.lk-layout-toggle__label { line-height: 1; }
@media (max-width: 640px) {
  .lk-layout-toggle__label { display: none; }
  .lk-layout-toggle { padding: 0; width: 40px; justify-content: center; }
}

/* Spotlight: big main + scrollable strip. Reuses .lk-focus-layout so each
 * page's existing focus padding/gap applies; we just size the regions. */
.lk-focus-layout {
  display: flex;
  gap: 0.5rem;
  height: 100%;
  width: 100%;
  min-height: 0;
}
.lk-focus-layout .lk-focus-layout-main {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
}
.lk-focus-layout .lk-focus-layout-main > .lk-cam-tile,
.lk-focus-layout .lk-focus-layout-main > .lk-participant-tile {
  flex: 1 1 auto;
  height: 100% !important;
  width: 100% !important;
  border-radius: 16px;
  overflow: hidden;
}
.lk-camera-strip {
  flex: 0 0 220px;
  display: flex !important;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  padding: 0 !important;
  scrollbar-width: thin;
}
.lk-camera-strip > .lk-cam-tile {
  flex: 0 0 auto;
  height: 130px;
  width: 100%;
}
.lk-camera-strip::-webkit-scrollbar { width: 6px; }
.lk-camera-strip::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.18);
  border-radius: 999px;
}

/* On phones the strip sits below the main tile and scrolls horizontally. */
@media (max-width: 640px) {
  .lk-focus-layout { flex-direction: column; }
  .lk-camera-strip {
    flex: 0 0 96px;
    flex-direction: row;
    overflow-x: auto;
    overflow-y: hidden;
  }
  .lk-camera-strip > .lk-cam-tile {
    height: 100%;
    width: 130px;
    flex: 0 0 auto;
  }
}

/* Chat drawer --------------------------------------------------------------
 * Overlays the stage instead of shrinking it: the grid keeps its geometry, so
 * opening chat never re-lays-out tiles (no reflow, no visual-stable-update).
 * Animates transform/opacity only. Visibility (not display) toggles so the
 * closed panel leaves the tab order without killing the slide transition. */
.lk-chat-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: min(360px, 100%);
  padding: 0.75rem 0.75rem 0.75rem 0;
  transform: translateX(100%);
  opacity: 0;
  visibility: hidden;
  /* Exit is quicker than enter — dismissal should feel instant. */
  transition: transform 180ms cubic-bezier(0.4, 0, 1, 1),
    opacity 140ms linear,
    visibility 0s linear 180ms;
}
.lk-chat-panel[data-open="true"] {
  transform: translateX(0);
  opacity: 1;
  visibility: visible;
  transition: transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 180ms linear,
    visibility 0s;
}

/* The layout toggle lives under the drawer — slide it clear while chat is open. */
.lk-layout-toggle { transition: background 160ms ease, border-color 160ms ease, transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 160ms ease; }
.lk-video-conference[data-chat-open="true"] .lk-layout-toggle { transform: translateX(calc(-1 * min(360px, 100%))); }

.lk-chat-panel > .lk-chat {
  display: grid !important;
  grid-template-rows: auto minmax(0, 1fr) auto;
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  background: rgba(15, 17, 19, 0.82) !important;
  backdrop-filter: blur(24px) saturate(140%);
  -webkit-backdrop-filter: blur(24px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 16px !important;
  box-shadow: 0 12px 48px -12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05);
  overflow: hidden;
}

.lk-chat-panel .lk-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin: 0;
  padding: 0.5rem 0.5rem 0.5rem 0.875rem;
  font-family: var(--obs-font-mono, 'JetBrains Mono'), monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.6);
  border-bottom: 1px solid rgba(255,255,255,0.07);
}
.lk-chat-panel .lk-chat-header .lk-close-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: rgba(255,255,255,0.65);
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease;
}
.lk-chat-panel .lk-chat-header .lk-close-button:hover { background: rgba(255,255,255,0.08); color: #fff; }
.lk-chat-panel .lk-chat-header .lk-close-button:focus-visible {
  outline: 2px solid var(--obs-accent, #00E6C3);
  outline-offset: -2px;
}

.lk-chat-panel .lk-chat-messages {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 0;
  margin: 0;
  padding: 0.875rem;
  overflow-y: auto;
  overscroll-behavior: contain;
  list-style: none;
  scrollbar-width: thin;
}
.lk-chat-panel .lk-chat-messages::-webkit-scrollbar { width: 6px; }
.lk-chat-panel .lk-chat-messages::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.18);
  border-radius: 999px;
}
/* Empty state: an empty chat should invite a first message, not read as broken. */
.lk-chat-panel .lk-chat-messages:empty::after {
  content: "No messages yet. Say hello.";
  margin: auto;
  padding: 0 1rem;
  font-size: 12px;
  line-height: 1.6;
  text-align: center;
  color: rgba(255,255,255,0.35);
}

.lk-chat-panel .lk-chat-entry {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  width: fit-content;
  max-width: 88%;
  margin: 0;
  padding: 0.45rem 0.7rem;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  background: rgba(255,255,255,0.055);
  font-size: 13px;
  line-height: 1.5;
  color: rgba(255,255,255,0.92);
  overflow-wrap: anywhere;
  animation: lkChatIn 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.lk-chat-panel .lk-chat-entry[data-lk-message-origin="remote"] {
  align-self: flex-start;
}
.lk-chat-panel .lk-meta-data {
  flex-wrap: wrap;
  min-width: 0;
}
.lk-chat-panel .lk-chat-entry .lk-participant-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  min-width: 0;
  flex: 1 1 auto;
}
.lk-chat-panel .lk-timestamp { margin-left: auto; }
.lk-chat-panel .lk-message-body {
  width: auto;
  max-width: none;
  min-width: 2.5ch;
  margin: 0;
  padding: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  overflow-wrap: anywhere;
  word-break: normal;
}
.lk-chat-panel .lk-message-body .meeting-chat-link {
  color: var(--obs-accent, #00E6C3);
  text-decoration: none;
  text-underline-offset: 2px;
}
.lk-chat-panel .lk-message-body .meeting-chat-link:hover { text-decoration: underline; }
.lk-chat-panel .lk-message-body .meeting-chat-link:focus-visible {
  outline: 2px solid var(--obs-accent, #00E6C3);
  outline-offset: 2px;
  border-radius: 2px;
}

.lk-chat-panel .meeting-chat-form {
  position: relative;
  flex-wrap: wrap;
  align-items: center;
}
.lk-chat-panel .meeting-chat-composer {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex: 1 1 12rem;
  min-width: 0;
}
.lk-chat-panel .meeting-chat-form .meeting-chat-form-input-wrap {
  flex: 1 1 auto;
  min-width: 0;
}
.meeting-chat-form-input-wrap {
  display: flex;
  align-items: center;
  min-height: 44px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  background: rgba(255,255,255,0.05);
  padding: 0 0.75rem;
}
.meeting-chat-form-input-wrap:focus-within {
  outline: 2px solid var(--obs-accent, #00E6C3);
  outline-offset: 1px;
  border-color: transparent;
}
.lk-chat-panel .meeting-chat-form-input {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 44px;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  padding: 0 !important;
  box-shadow: none !important;
  color: #fff;
  font: inherit;
  font-size: 14px;
}
.lk-chat-panel .meeting-chat-form-input::placeholder { color: rgba(255,255,255,0.36); }
.lk-chat-panel .meeting-chat-form-input:focus,
.lk-chat-panel .meeting-chat-form-input:focus-visible {
  outline: none;
}

.meeting-emoji-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  flex-shrink: 0;
  font-size: 18px;
  line-height: 1;
  padding: 0;
}
.meeting-emoji-btn i {
  display: block;
  line-height: 1;
}
.meeting-emoji-btn:hover,
.meeting-emoji-btn[aria-expanded="true"] {
  background: rgba(255,255,255,0.08);
  color: #fff;
}
.meeting-emoji-btn:focus-visible {
  outline: 2px solid var(--obs-accent, #00E6C3);
  outline-offset: 1px;
}
.meeting-emoji-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.meeting-emoji-picker {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(100% + 0.35rem);
  z-index: 40;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: min(40vh, 220px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0.5rem;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(15,17,19,0.95);
  backdrop-filter: blur(16px);
  box-shadow: 0 12px 32px -8px rgba(0,0,0,0.65);
  scrollbar-width: thin;
}
.meeting-emoji-picker-row {
  display: grid;
  grid-template-columns: repeat(6, minmax(44px, 1fr));
  gap: 0.25rem;
}
.meeting-emoji-picker button {
  min-width: 44px;
  min-height: 44px;
  width: 100%;
  aspect-ratio: 1;
  border: 0;
  border-radius: 8px;
  background: transparent;
  font-size: 1.25rem;
  cursor: pointer;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.meeting-emoji-picker button:hover { background: rgba(255,255,255,0.08); }
.meeting-emoji-picker button:focus-visible {
  outline: 2px solid var(--obs-accent, #00E6C3);
  outline-offset: 1px;
  background: rgba(255,255,255,0.08);
}

.lk-chat-panel[data-offline="true"] .meeting-emoji-btn {
  opacity: 0.45;
  cursor: not-allowed;
}

#chat-button-slot .lk-button {
  position: relative;
  overflow: visible;
}
#chat-button-slot .lk-chat-toggle[data-lk-unread-msgs]:not([data-lk-unread-msgs="0"])::after {
  display: none;
  content: none;
}
.meeting-chat-unread-badge-anchor {
  pointer-events: none;
  position: absolute;
  top: 0;
  right: 0;
  transform: translate(20%, -10%);
  z-index: 2;
}
.meeting-chat-unread-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 999px;
  background: var(--obs-accent, #00E6C3);
  color: #06231f;
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.9),
    0 0 0 3px rgba(15,17,19,0.92);
}
.meeting-chat-toggle-label {
  line-height: 1;
}

.lk-chat-panel .lk-chat-entry[data-lk-message-origin="local"] {
  align-self: flex-end;
  background: rgba(0,230,195,0.13);
  border-color: rgba(0,230,195,0.26);
}
.lk-chat-panel .lk-meta-data {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  margin-bottom: 0.15rem;
}
/* The meeting pages style every .lk-participant-name as a mono glass tile badge.
 * Inside chat that treatment reads as a chip, not a sender — undo it here. */
.lk-chat-panel .lk-chat-entry .lk-participant-name {
  padding: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  font-family: inherit !important;
  font-size: 11px !important;
  font-weight: 600;
  letter-spacing: 0 !important;
  text-transform: none !important;
  color: var(--obs-accent, #00E6C3) !important;
}
.lk-chat-panel .lk-timestamp {
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  color: rgba(255,255,255,0.4);
}
.lk-chat-panel .lk-message-body { display: block; }

.lk-chat-panel .lk-chat-form {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-top: 1px solid rgba(255,255,255,0.07);
}
.lk-chat-panel .lk-chat-form-input:not(.meeting-chat-form-input) {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 44px;
  padding: 0 0.75rem;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  background: rgba(255,255,255,0.05);
  color: #fff;
  font: inherit;
  font-size: 14px;
}
.lk-chat-panel .lk-chat-form-input:not(.meeting-chat-form-input)::placeholder { color: rgba(255,255,255,0.36); }
.lk-chat-panel .lk-chat-form-input:not(.meeting-chat-form-input):focus-visible {
  outline: 2px solid var(--obs-accent, #00E6C3);
  outline-offset: 1px;
  border-color: transparent;
}
.lk-chat-panel .lk-chat-form-button {
  min-height: 44px;
  padding: 0 1rem;
  border: 0;
  border-radius: 12px;
  background: var(--obs-accent, #00E6C3);
  color: #06231f;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: filter 160ms ease;
}
.lk-chat-panel .lk-chat-form-button:hover:not(:disabled) { filter: brightness(1.08); }
.lk-chat-panel .lk-chat-form-input:disabled,
.lk-chat-panel .meeting-chat-form-input:disabled,
.lk-chat-panel .lk-chat-form-button:disabled { opacity: 0.5; cursor: not-allowed; }

/* Offline: submit is blocked upstream, so the form must not look ready to send. */
.lk-chat-panel[data-offline="true"] .lk-chat-form-input,
.lk-chat-panel[data-offline="true"] .meeting-chat-form-input,
.lk-chat-panel[data-offline="true"] .lk-chat-form-button {
  opacity: 0.45;
  cursor: not-allowed;
}
.lk-chat-offline {
  flex: 0 0 auto;
  margin: 0;
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(255,176,86,0.3);
  border-radius: 12px;
  background: rgba(255,176,86,0.12);
  color: #ffce9a;
  font-size: 12px;
  line-height: 1.45;
}

/* Unread dot when no count pill — chat only counts unreads while closed. */
.lk-video-conference[data-unread="true"] #chat-button-slot .lk-button:not(:has(.meeting-chat-unread-badge))::after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  transform: translate(20%, -10%);
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--obs-accent, #00E6C3);
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.9),
    0 0 0 3px rgba(15,17,19,0.92);
  pointer-events: none;
  z-index: 2;
}

@keyframes lkChatIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Phones: the drawer takes the full stage so the input is comfortably wide. */
@media (max-width: 640px) {

  .meeting-hand-toast-stack { top: 0.65rem; width: calc(100% - 1rem); }
  .meeting-hand-toast { font-size: 13px; padding: 0.55rem 0.85rem; }
  .meeting-emoji-picker { max-height: min(35vh, 200px); }
  .lk-chat-panel { width: 100%; padding: 0.5rem; }
  .lk-video-conference[data-chat-open="true"] .lk-layout-toggle {
    opacity: 0;
    pointer-events: none;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .lk-cam-tile { animation: none; }
  .lk-pin-btn { transition: none; }
  .lk-chat-panel,
  .lk-chat-panel[data-open="true"] {
    transform: none;
    transition: opacity 120ms linear, visibility 0s linear 120ms;
  }
  .lk-chat-panel[data-open="true"] { transition: opacity 120ms linear, visibility 0s; }
  .lk-chat-panel .lk-chat-entry { animation: none; }
  .lk-layout-toggle { transition: none; }
  .meeting-hand-toast { animation: meetingHandToastFadeIn 200ms linear; }

  .lk-video-conference[data-chat-open="true"] .lk-layout-toggle { transform: none; opacity: 0; pointer-events: none; }
}

${MEETING_CONTROL_BAR_RESPONSIVE_CSS}
`;
