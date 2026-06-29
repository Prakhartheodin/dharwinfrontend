"use client";

import { useEffect, useState } from "react";
import { getCallRecordings, fetchRecordingObjectUrl } from "@/shared/lib/api/bolna";

// One channel (Bolna or Plivo). Bytes are fetched only when the user clicks play —
// audio routes are JWT-protected, so we can't stream via a plain <audio src>; the
// blob fetch stays, but it no longer runs eagerly on panel open.
function Recording({ label, streamUrl, reason }: { label: string; streamUrl?: string; reason?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | undefined>(reason);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  async function load() {
    if (!streamUrl || loading) return;
    setLoading(true);
    try {
      setUrl(await fetchRecordingObjectUrl(streamUrl));
    } catch {
      setErr("Recording found but playback failed (try sync or refresh)");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p className="mb-1 font-medium">{label}</p>
      {url ? (
        <audio controls autoPlay src={url} className="w-full" />
      ) : streamUrl ? (
        <button
          onClick={load}
          disabled={loading}
          aria-label={`Load ${label} recording`}
          className="inline-flex min-h-[34px] items-center gap-1.5 rounded-md border border-defaultborder/60 px-2.5 py-1.5 text-xs font-medium text-defaulttextcolor/80 transition-colors hover:bg-light/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:hover:bg-white/5"
        >
          {loading ? (
            <>
              <i className="ri-loader-4-line animate-spin motion-reduce:animate-none" />
              Loading…
            </>
          ) : (
            <>
              <i className="ri-play-circle-line text-sm" />
              Load recording
            </>
          )}
        </button>
      ) : (
        <p className="text-xs text-defaulttextcolor/60">
          —{err ? <span className="block mt-0.5 italic">{err}</span> : null}
        </p>
      )}
    </div>
  );
}

// Reserve the channel layout while availability metadata loads — shimmer over a
// blocking spinner, no layout shift when the real controls swap in.
function RecordingsSkeleton() {
  return (
    <div className="space-y-2 text-sm" aria-hidden>
      {["Bolna", "Plivo"].map((label) => (
        <div key={label}>
          <p className="mb-1 font-medium text-defaulttextcolor/70">{label}</p>
          <div className="h-[34px] w-full rounded-md bg-defaulttextcolor/10 animate-pulse motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}

type Channel = { streamUrl?: string; reason?: string };

export default function CallRecordings({ executionId }: { executionId: string }) {
  const [recs, setRecs] = useState<{ bolna: Channel; plivo: Channel } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { recordings } = await getCallRecordings(executionId);
        if (cancelled) return;
        setRecs({
          bolna: {
            streamUrl: recordings.bolna.available ? recordings.bolna.streamUrl : undefined,
            reason: recordings.bolna.reason,
          },
          plivo: {
            streamUrl: recordings.plivo.available ? recordings.plivo.streamUrl : undefined,
            reason: recordings.plivo.reason,
          },
        });
      } catch {
        if (!cancelled) setError("Could not load recordings");
      }
    })();
    return () => { cancelled = true; };
  }, [executionId]);

  if (error) return <p className="text-xs text-defaulttextcolor/60">{error}</p>;
  if (!recs) return <RecordingsSkeleton />;

  return (
    <div className="space-y-2 text-sm">
      <Recording label="Bolna" streamUrl={recs.bolna.streamUrl} reason={recs.bolna.reason} />
      <Recording label="Plivo" streamUrl={recs.plivo.streamUrl} reason={recs.plivo.reason} />
    </div>
  );
}
