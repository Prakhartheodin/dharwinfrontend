"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  useTracks,
  useSpeakingParticipants,
  ParticipantTile,
  ControlBar,
  ConnectionStateToast,
  isTrackReference,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { MEETING_CONTROL_BAR_RESPONSIVE_CSS } from "./meeting-control-bar-responsive.css";

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
  onTogglePin,
}: {
  trackRef: TrackReferenceOrPlaceholder;
  pinned: boolean;
  onTogglePin: () => void;
}) {
  return (
    <div
      className="lk-cam-tile"
      data-pinned={pinned ? "true" : undefined}
      data-lk-participant-identity={trackRef.participant.identity}
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

  // Memoize the control bar so re-renders from pin / spotlight / active-speaker
  // state never reconcile <ControlBar>. The page injects #recording-button-slot
  // into .lk-control-bar via raw DOM; a parent-driven reconcile would wipe that
  // foreign node and the host's recording button would vanish.
  const controls = useMemo(
    () => (
      <>
        <ControlBar
          variation={narrowControlBar ? "minimal" : "verbose"}
          controls={{ microphone: true, camera: true, screenShare: true, leave: true }}
        />
        <ConnectionStateToast />
      </>
    ),
    [narrowControlBar]
  );

  return (
    <div className="lk-video-conference">
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
                onTogglePin={() => togglePin(mainCam.participant.identity)}
              />
            </div>
            <aside className="lk-grid-layout lk-camera-strip">
              {stripCams.map((ref) => (
                <CamTile
                  key={tileKey(ref)}
                  trackRef={ref}
                  pinned={ref.participant.identity === pinnedIdentity}
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
                onTogglePin={() => togglePin(ref.participant.identity)}
              />
            ))}
          </div>
        )}
      </div>
      {controls}
    </div>
  );
}

/* Self-contained styling for the pin control, layout toggle, spotlight strip
 * and entrance transitions. Scoped under our own classnames so it doesn't
 * disturb either meeting-room page's existing LiveKit overrides. */
const SVC_CSS = `
.lk-video-conference-inner { position: relative; }

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

@media (prefers-reduced-motion: reduce) {
  .lk-cam-tile { animation: none; }
  .lk-pin-btn { transition: none; }
}

${MEETING_CONTROL_BAR_RESPONSIVE_CSS}
`;
