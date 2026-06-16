"use client";

import { useEffect, useState } from "react";
import { getCallRecordings, fetchRecordingObjectUrl } from "@/shared/lib/api/bolna";

export default function CallRecordings({ executionId }: { executionId: string }) {
  const [agentUrl, setAgentUrl] = useState<string | null>(null);
  const [fullUrl, setFullUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let revoked: string[] = [];
    let cancelled = false;
    (async () => {
      try {
        const meta = await getCallRecordings(executionId);
        if (cancelled) return;
        if (meta.recordings.bolna.available && meta.recordings.bolna.streamUrl) {
          const u = await fetchRecordingObjectUrl(meta.recordings.bolna.streamUrl);
          if (!cancelled) { setAgentUrl(u); revoked.push(u); } else URL.revokeObjectURL(u);
        }
        if (meta.recordings.plivo.available && meta.recordings.plivo.streamUrl) {
          const u = await fetchRecordingObjectUrl(meta.recordings.plivo.streamUrl);
          if (!cancelled) { setFullUrl(u); revoked.push(u); } else URL.revokeObjectURL(u);
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
        <p className="mb-1 font-medium">Agent only (Bolna)</p>
        {agentUrl ? <audio controls src={agentUrl} className="w-full" /> : <p className="text-xs text-defaulttextcolor/60">—</p>}
      </div>
      <div>
        <p className="mb-1 font-medium">Full call — both voices (Plivo)</p>
        {fullUrl ? <audio controls src={fullUrl} className="w-full" /> : <p className="text-xs text-defaulttextcolor/60">—</p>}
      </div>
    </div>
  );
}
