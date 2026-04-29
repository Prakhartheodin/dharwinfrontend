"use client";

import { useEffect } from "react";
import { getLogger, LoggerNames } from "livekit-client";

/**
 * The JS SDK can receive an RTP track before the RemoteParticipant is in the room map (signaling
 * order). It logs an error and skips that frame; the next negotiation usually recovers. Next.js
 * devtools treat console.error as an app error — we downgrade only these known lines.
 *
 * RTCEngine also logs `Unknown DataChannel error on lossy|reliable` when the browser fires a
 * DataChannel error without `ErrorEvent.error` (common on reconnect/teardown). That uses
 * {@link LoggerNames.Engine}, not Room.
 */
export function useLiveKitBenignErrorSuppression(): void {
  useEffect(() => {
    const roomLogger = getLogger(LoggerNames.Room);
    const engineLogger = getLogger(LoggerNames.Engine);
    const roomOrig = roomLogger.error.bind(roomLogger);
    const engineOrig = engineLogger.error.bind(engineLogger);

    roomLogger.error = (msg: string, context?: object) => {
      if (typeof msg === "string") {
        if (msg.includes("Tried to add a track for a participant, that's not present")) {
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console -- intentional debug for benign WebRTC race
            console.debug("[LiveKit] track arrived before participant (benign):", msg, context);
          }
          return;
        }
        if (msg.includes("Tried to add a track whose 'sid' could not be found for a participant")) {
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console -- intentional debug for benign WebRTC race
            console.debug("[LiveKit] track sid not resolved yet (benign):", msg, context);
          }
          return;
        }
      }
      roomOrig(msg, context);
    };

    engineLogger.error = (msg: string, context?: object) => {
      if (typeof msg === "string" && msg.includes("Unknown DataChannel error on ")) {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console -- benign WebRTC DataChannel edge (see RTCEngine.handleDataError)
          console.debug("[LiveKit] DataChannel error event without detail (often reconnect/teardown):", msg, context);
        }
        return;
      }
      engineOrig(msg, context);
    };

    return () => {
      roomLogger.error = roomOrig;
      engineLogger.error = engineOrig;
    };
  }, []);
}
