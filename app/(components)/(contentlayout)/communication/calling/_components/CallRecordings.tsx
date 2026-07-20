"use client";

import { useEffect, useState } from "react";
import { getCallRecordings } from "@/shared/lib/api/bolna";
import InlineRecordingPlayer from "./InlineRecordingPlayer";

// Reserve the channel layout while availability metadata loads — shimmer over a
// blocking spinner, no layout shift when the real controls swap in.
function RecordingsSkeleton() {
  return (
    <div className="space-y-2 text-sm" aria-hidden>
      {/* Neutral shimmer — channel names aren't known until metadata resolves,
          so no provider labels here (a dialer call has one channel, not two). */}
      <div>
        <div className="mb-1.5 h-3 w-24 rounded bg-defaulttextcolor/10 animate-pulse motion-reduce:animate-none" />
        <div className="h-[34px] w-full rounded-md bg-defaulttextcolor/10 animate-pulse motion-reduce:animate-none" />
      </div>
    </div>
  );
}

type Channel = { available?: boolean; streamUrl?: string; reason?: string };

// Friendly labels + display order. Twilio = browser/bridge dialer calls; Plivo/Bolna
// = candidate-verification legs. A call only records on one provider, so we show the
// channel(s) that actually have audio and drop the empty ones.
const CHANNEL_LABELS: Record<string, string> = {
  twilio: "Call recording",
  plivo: "Full call (Plivo)",
  bolna: "Agent leg (Bolna)",
};
const CHANNEL_ORDER = ["twilio", "plivo", "bolna"];

type CallRecordingsProps = {
  executionId: string;
  /** When provided, only one recording can be active across the detail panel. */
  activeKey?: string | null;
  onActivate?: (key: string) => void;
  /** After metadata loads, auto-play the first available channel (table → detail handoff). */
  autoPlayFirst?: boolean;
  onAutoPlayDone?: () => void;
};

export default function CallRecordings({
  executionId,
  activeKey: controlledActiveKey,
  onActivate: controlledOnActivate,
  autoPlayFirst = false,
  onAutoPlayDone,
}: CallRecordingsProps) {
  const [recs, setRecs] = useState<Record<string, Channel> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [internalActiveKey, setInternalActiveKey] = useState<string | null>(null);

  const activeKey = controlledOnActivate ? (controlledActiveKey ?? null) : internalActiveKey;
  const onActivate = controlledOnActivate ?? setInternalActiveKey;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { recordings } = await getCallRecordings(executionId);
        if (cancelled) return;
        setRecs(recordings as Record<string, Channel>);
      } catch {
        if (!cancelled) setError("Could not load recordings");
      }
    })();
    return () => { cancelled = true; };
  }, [executionId]);

  useEffect(() => {
    if (!autoPlayFirst || !recs) return;
    const playable = CHANNEL_ORDER.filter((k) => recs[k]?.streamUrl);
    if (playable.length > 0) {
      onActivate(`${executionId}-${playable[0]}`);
    }
    onAutoPlayDone?.();
  }, [autoPlayFirst, recs, executionId, onActivate, onAutoPlayDone]);

  if (error) return <p className="text-xs text-defaulttextcolor/60">{error}</p>;
  if (!recs) return <RecordingsSkeleton />;

  const playable = CHANNEL_ORDER.filter((k) => recs[k]?.streamUrl);
  if (playable.length === 0) {
    return <p className="text-xs text-defaulttextcolor/60">No recording available for this call yet.</p>;
  }

  return (
    <div className="space-y-2 text-sm">
      {/* key includes executionId: switching calls remounts each player so its
          cached blob URL resets instead of replaying the previous call's audio */}
      {playable.map((k) => {
        const channel = recs[k];
        const label = CHANNEL_LABELS[k] ?? k;
        const playerKey = `${executionId}-${k}`;
        return (
          <div key={playerKey}>
            <p className="mb-1 font-medium">{label}</p>
            {channel?.streamUrl ? (
              <InlineRecordingPlayer
                recordingUrl={channel.streamUrl}
                playerKey={playerKey}
                activeKey={activeKey}
                onActivate={onActivate}
                variant="outline"
                buttonLabel="Play recording"
                audioClassName="w-full"
              />
            ) : (
              <p className="text-xs text-defaulttextcolor/60">
                —{channel?.reason ? <span className="block mt-0.5 italic">{channel.reason}</span> : null}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
