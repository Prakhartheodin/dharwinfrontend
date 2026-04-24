"use client";

import { useEffect } from "react";
import { getLogger, LoggerNames } from "livekit-client";

/**
 * The JS SDK can receive an RTP track before the RemoteParticipant is in the room map (signaling
 * order). It logs an error and skips that frame; the next negotiation usually recovers. Next.js
 * devtools treat console.error as an app error — we downgrade only these known lines.
 */
export function useLiveKitBenignErrorSuppression(): void {
  useEffect(() => {
    const logger = getLogger(LoggerNames.Room);
    const orig = logger.error.bind(logger);
    logger.error = (msg: string, context?: object) => {
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
      orig(msg, context);
    };
    return () => {
      logger.error = orig;
    };
  }, []);
}
