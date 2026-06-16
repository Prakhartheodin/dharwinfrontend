"use client";

import { useEffect, useState } from "react";
import { getCallRecordings, fetchRecordingObjectUrl } from "@/shared/lib/api/bolna";

function Unavailable({ reason }: { reason?: string }) {
  return (
    <p className="text-xs text-defaulttextcolor/60">
      —{reason ? <span className="block mt-0.5 italic">{reason}</span> : null}
    </p>
  );
}

export default function CallRecordings({ executionId }: { executionId: string }) {
  const [agentUrl, setAgentUrl] = useState<string | null>(null);
  const [fullUrl, setFullUrl] = useState<string | null>(null);
  const [agentReason, setAgentReason] = useState<string | undefined>();
  const [plivoReason, setPlivoReason] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let revoked: string[] = [];
    let cancelled = false;
    (async () => {
      try {
        const meta = await getCallRecordings(executionId);
        if (cancelled) return;

        setAgentReason(meta.recordings.bolna.available ? undefined : meta.recordings.bolna.reason);
        setPlivoReason(meta.recordings.plivo.available ? undefined : meta.recordings.plivo.reason);

        if (meta.recordings.bolna.available && meta.recordings.bolna.streamUrl) {
          try {
            const u = await fetchRecordingObjectUrl(meta.recordings.bolna.streamUrl);
            if (!cancelled) {
              setAgentUrl(u);
              revoked.push(u);
            } else {
              URL.revokeObjectURL(u);
            }
          } catch {
            if (!cancelled) setAgentReason("Recording exists but playback failed (try sync or refresh)");
          }
        }

        if (meta.recordings.plivo.available && meta.recordings.plivo.streamUrl) {
          try {
            const u = await fetchRecordingObjectUrl(meta.recordings.plivo.streamUrl);
            if (!cancelled) {
              setFullUrl(u);
              revoked.push(u);
            } else {
              URL.revokeObjectURL(u);
            }
          } catch {
            if (!cancelled) setPlivoReason("Plivo recording found but playback failed");
          }
        }
      } catch {
        if (!cancelled) setError("Could not load recordings");
      }
    })();
    return () => {
      cancelled = true;
      revoked.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [executionId]);

  if (error) return <p className="text-xs text-defaulttextcolor/60">{error}</p>;

  return (
    <div className="space-y-2 text-sm">
      <div>
        <p className="mb-1 font-medium">Bolna</p>
        {agentUrl ? (
          <audio controls src={agentUrl} className="w-full" preload="metadata" />
        ) : (
          <Unavailable reason={agentReason} />
        )}
      </div>
      <div>
        <p className="mb-1 font-medium">Plivo</p>
        {fullUrl ? (
          <audio controls src={fullUrl} className="w-full" preload="metadata" />
        ) : (
          <Unavailable reason={plivoReason} />
        )}
      </div>
    </div>
  );
}
