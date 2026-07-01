"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getBolnaCallRecords, type CallRecord } from "@/shared/lib/api/bolna";
import { useChatSocket } from "@/shared/contexts/ChatSocketContext";
import RecentCallCard from "./RecentCallCard";
import { callId, matchesSearch, filterRecents, isMissed, missedCount, sortWithPins, groupByDate, type RecentFilter } from "../_lib/recentCalls";

const PIN_KEY = "dialer_pinned_recents";
const CHIPS: RecentFilter[] = ["all", "inbound", "outbound", "recorded"];

type Props = {
  activeView: "recent" | "missed";
  selectedCallId: string | null;
  onSelectCall: (r: CallRecord) => void;
  onDialCall: (r: CallRecord) => void;
  searchRef: React.Ref<HTMLInputElement>;
  onMissedCount: (n: number) => void;
};

function loadPins(): string[] {
  try { return JSON.parse(localStorage.getItem(PIN_KEY) || "[]"); } catch { return []; }
}

export default function RecentCallsList({ activeView, selectedCallId, onSelectCall, onDialCall, searchRef, onMissedCount }: Props) {
  const [records, setRecords] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RecentFilter>("all");
  const [pins, setPins] = useState<string[]>([]);
  const { onCallUpdate } = useChatSocket();

  const load = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(null); setForbidden(false); }
    try {
      // P2: replace with a virtualized list if this grows beyond ~200 records.
      // channel:"dialer" → only this user's own dialer-placed calls (no candidate/job calls).
      const res = await getBolnaCallRecords({ limit: 50, sortBy: "createdAt", order: "desc", channel: "dialer" });
      setRecords(res.records || []);
    } catch (e) {
      if (silent) return; // transient poll/socket blip: keep showing the existing calls
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) setForbidden(true);
      else setError(e instanceof Error ? e.message : "Failed to load calls");
    } finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => { setPins(loadPins()); void load(); }, [load]);
  // Live refresh: backend callSync emits call:update as calls complete/record.
  useEffect(() => onCallUpdate(() => void load(true)), [onCallUpdate, load]);
  // Fallback poll: dialer calls finalize via HMAC-gated Plivo webhooks that don't emit
  // call:update, so the socket alone misses them. Silently refresh every 20s while the
  // tab is visible (and immediately on re-focus). ponytail: swap for a socket emit on the
  // dialer webhook path if the poll load ever matters.
  useEffect(() => {
    const tick = () => { if (!document.hidden) void load(true); };
    const id = setInterval(tick, 20000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [load]);

  const togglePin = useCallback((id: string) => {
    setPins((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev];
      try { localStorage.setItem(PIN_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const missed = useMemo(() => missedCount(records), [records]);
  useEffect(() => { onMissedCount(missed); }, [missed, onMissedCount]);

  const visible = useMemo(() => {
    const base = activeView === "missed" ? records.filter(isMissed) : filterRecents(records, filter);
    return base.filter((r) => matchesSearch(r, query));
  }, [records, activeView, filter, query]);

  const { pinned, rest } = useMemo(
    () => (activeView === "recent" ? sortWithPins(visible, pins) : { pinned: [] as CallRecord[], rest: visible }),
    [visible, pins, activeView]
  );
  const groups = useMemo(() => groupByDate(rest, new Date()), [rest]);

  const card = (r: CallRecord) => (
    <RecentCallCard key={callId(r)} record={r} selected={selectedCallId === callId(r)}
      pinned={pins.includes(callId(r))} onSelect={() => onSelectCall(r)}
      onDial={() => onDialCall(r)} onTogglePin={() => togglePin(callId(r))} />
  );

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <div className="flex items-center gap-2 rounded-lg border border-defaultborder/70 bg-white px-3 py-2 dark:border-white/10 dark:bg-black/20">
          <i className="ri-search-line text-defaulttextcolor/40" aria-hidden />
          <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search calls" aria-label="Search calls"
            className="w-full min-w-0 bg-transparent text-sm focus:outline-none dark:text-white" />
        </div>
      </div>
      {activeView === "recent" ? (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2">
          {CHIPS.map((c) => (
            <button key={c} type="button" onClick={() => setFilter(c)}
              className={`rounded-full px-2.5 py-1 text-[0.7rem] font-semibold capitalize ${
                filter === c ? "bg-primary text-white" : "bg-black/[0.04] text-defaulttextcolor/60 dark:bg-white/5 dark:text-white/50"
              }`}>{c}</button>
          ))}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {loading ? (
          <div className="space-y-2" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-black/[0.06] dark:bg-white/10" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-black/[0.06] dark:bg-white/10" />
                  <div className="h-2.5 w-1/2 animate-pulse rounded bg-black/[0.05] dark:bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : forbidden ? (
          <p className="px-2 py-8 text-center text-sm text-defaulttextcolor/45">
            You don&rsquo;t have permission to view call history.
          </p>
        ) : error ? (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-3 text-xs text-danger">
            {error}{" "}
            <button type="button" onClick={() => void load()} className="font-semibold underline">Retry</button>
          </div>
        ) : visible.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-defaulttextcolor/45">
            {activeView === "missed" ? "No missed calls" : "No recent calls yet"}
          </p>
        ) : (
          <>
            {pinned.length > 0 ? (
              <section className="mb-3">
                <p className="mb-1 px-1 text-[0.66rem] font-semibold uppercase tracking-wide text-defaulttextcolor/40">Pinned</p>
                <div className="space-y-1">{pinned.map(card)}</div>
              </section>
            ) : null}
            {groups.map((g) => (
              <section key={g.group} className="mb-3">
                <p className="mb-1 px-1 text-[0.66rem] font-semibold uppercase tracking-wide text-defaulttextcolor/40">{g.group}</p>
                <div className="space-y-1">{g.records.map(card)}</div>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
