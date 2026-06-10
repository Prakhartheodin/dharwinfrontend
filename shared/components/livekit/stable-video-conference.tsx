"use client";

import { useMemo } from "react";
import {
  useTracks,
  ParticipantTile,
  ControlBar,
  ConnectionStateToast,
  isTrackReference,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { Track } from "livekit-client";

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
 * Markup parity is preserved (`.lk-video-conference`, `.lk-grid-layout`,
 * `ParticipantTile`, `.lk-control-bar`) so the page's control-bar slot injection
 * and waiting-participant tile-hiding keep working unchanged.
 *
 * RoomAudioRenderer is intentionally NOT rendered here — the parent already
 * mounts one.
 */

/** Stable, sid-independent identity for a tile. */
function tileKey(ref: TrackReferenceOrPlaceholder): string {
  const source = ref.source ?? ref.publication?.source ?? "unknown";
  return `${ref.participant.identity}__${source}`;
}

export function StableVideoConference() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const screenShareTracks = useMemo(
    () =>
      tracks.filter(
        (t) => t.source === Track.Source.ScreenShare && isTrackReference(t)
      ),
    [tracks]
  );

  const cameraTracks = useMemo(
    () => tracks.filter((t) => t.source === Track.Source.Camera),
    [tracks]
  );

  const hasFocus = screenShareTracks.length > 0;

  return (
    <div className="lk-video-conference">
      <div className="lk-video-conference-inner">
        {hasFocus ? (
          <div className="lk-focus-layout">
            <div className="lk-focus-layout-main">
              {screenShareTracks.map((ref) => (
                <ParticipantTile key={tileKey(ref)} trackRef={ref} />
              ))}
            </div>
            <aside className="lk-grid-layout lk-camera-strip">
              {cameraTracks.map((ref) => (
                <ParticipantTile key={tileKey(ref)} trackRef={ref} />
              ))}
            </aside>
          </div>
        ) : (
          <div className="lk-grid-layout">
            {cameraTracks.map((ref) => (
              <ParticipantTile key={tileKey(ref)} trackRef={ref} />
            ))}
          </div>
        )}
      </div>
      <ControlBar />
      <ConnectionStateToast />
    </div>
  );
}
