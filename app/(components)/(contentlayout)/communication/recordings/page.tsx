"use client";

import Seo from "@/shared/layout-components/seo/seo";
import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  listAllRecordings,
  syncRecordingsFromLiveKit,
  type RecordingWithMeeting,
  type RecordingsListResponse,
} from "@/shared/lib/api/meetings";
import { useRouter } from "next/navigation";
import TranscriptModal from "./_components/TranscriptModal";

type SourceFilter = "" | "interview" | "meeting";
type SearchField = "title" | "attendeeName" | "attendeeEmail";

const PAGE_SIZES = [10, 25, 50, 100];

type ViewMode = "table" | "grid";
type StatusKey =
  | "all"
  | "completed"
  | "live"
  | "aborted"
  | "failed"
  | "missing"
  | "expired";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  recording: "Recording",
  stopping: "Stopping",
  finalizing: "Finalizing",
  completed: "Completed",
  aborted: "Aborted",
  failed: "Failed",
  missing: "Missing",
  expired: "Expired",
};

/**
 * Aligned with meetings page status pills — bordered chip on tinted background.
 * Live states (recording / stopping / finalizing) share the amber treatment so
 * the eye can immediately separate "in flight" from "terminal".
 */
const STATUS_CLASS: Record<string, string> = {
  pending: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  recording: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  stopping: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  finalizing: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  aborted: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
  failed: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
  missing: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
  expired: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30",
};

const LIVE_STATUSES = new Set(["pending", "recording", "stopping", "finalizing"]);

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return "—";
  }
}

function formatDateOnly(iso?: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

function formatTimeOnly(iso?: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  } catch {
    return "—";
  }
}

function formatDuration(ms?: number | null, startedAt?: string | null, completedAt?: string | null): string {
  // Cap at 24h. Old webhook bug stored completedAt as ns*1000 and produced
  // diffs of millions of hours — anything past 24h is bogus.
  const MAX_MS = 24 * 60 * 60 * 1000;
  let total = ms ?? null;
  if (total == null && startedAt && completedAt) {
    const diff = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    if (Number.isFinite(diff) && diff >= 0) total = diff;
  }
  if (total == null || !Number.isFinite(total) || total < 0 || total > MAX_MS) return "—";
  const totalSec = Math.floor(total / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatBytes(bytes?: number | null): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(n >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function getFilename(rec: RecordingWithMeeting): string {
  const parts = rec.filePath?.split("/").pop() || `recording-${rec.meetingId}`;
  return parts.endsWith(".mp4") ? parts : `${parts}.mp4`;
}

/**
 * Converts raw LiveKit / backend error strings into concise, user-friendly messages.
 * The raw strings look like:
 *   "EGRESS_ABORTED :: Start signal not received | code=412 | End reason: Source closed"
 *   "EGRESS_FAILED :: EGRESS_LIMIT_REACHED"
 *   "EGRESS_COMPLETE but zero bytes in S3"
 */
function humanizeRecordingError(raw?: string | null): string {
  if (!raw) return "Recording encountered an issue.";
  const s = raw.toLowerCase();

  // Source / room closed before recording could start
  if (s.includes("source closed") || s.includes("start signal not received") || s.includes("code=412")) {
    return "The session ended before the recording could start.";
  }
  // Egress limit
  if (s.includes("limit_reached") || s.includes("egress_limit")) {
    return "Recording limit reached on the server. Contact your admin.";
  }
  // Aborted (generic)
  if (s.includes("egress_aborted") || s.includes("aborted")) {
    return "Recording was stopped unexpectedly.";
  }
  // Failed
  if (s.includes("egress_failed") || s.includes("failed")) {
    return "Recording failed. The file may not have been saved.";
  }
  // S3 / storage issues
  if (s.includes("zero bytes") || s.includes("s3") || s.includes("storage")) {
    return "Recording completed but the file could not be found in storage.";
  }
  // Missing file path
  if (s.includes("without filepath") || s.includes("no filePath") || s.includes("no predicted key")) {
    return "Recording finished but no file was produced.";
  }
  // Backfill notices
  if (s.includes("backfill") || s.includes("backfilled")) {
    return "Recording status was recovered automatically. File may be incomplete.";
  }
  // S3 unreachable
  if (s.includes("s3 unreachable") || s.includes("s3 head failed")) {
    return "Could not verify the recording file. Try again later.";
  }
  // Fallback — strip internal prefixes and show a cleaner version
  const clean = raw
    .replace(/^EGRESS_[A-Z_]+\s*::\s*/i, "")
    .replace(/\s*\|\s*code=\d+/gi, "")
    .replace(/\s*\|\s*end reason:/gi, " —")
    .trim();
  return clean.length > 0 && clean.length < 120 ? clean : "Recording encountered an issue.";
}

export default function RecordingsPage() {
  const router = useRouter();
  const [recordings, setRecordings] = useState<RecordingWithMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [statusFilter, setStatusFilter] = useState<StatusKey>("all");
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState<SearchField>("title");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [transcriptTarget, setTranscriptTarget] = useState<{ id: string; title: string } | null>(null);

  const fetchRecordings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const serverStatus = statusFilter === "all" ? undefined : statusFilter === "live" ? "recording,stopping,finalizing" : statusFilter;
      // For title search, pass q to the server for server-side filtering.
      // For attendee name/email, the backend also supports q across those fields,
      // so we always pass q to leverage server-side filtering.
      const data: RecordingsListResponse = await listAllRecordings({
        page,
        limit: pageSize,
        status: serverStatus,
        q: search.trim() || undefined,
        source: sourceFilter || undefined,
      });
      const visible = (data.results || []).filter((r) => r.status !== "missing");
      const hiddenOnPage = (data.results?.length ?? 0) - visible.length;
      setRecordings(visible);
      setTotalResults(Math.max(0, (data.totalResults ?? 0) - hiddenOnPage));
      setTotalPages(data.totalPages ?? 1);
    } catch (e) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setError(msg || (e instanceof Error ? e.message : "Failed to load recordings"));
      setRecordings([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, search, sourceFilter]);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  const handleSync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await syncRecordingsFromLiveKit();
      const backfillNote =
        result.backfilled && result.backfilled > 0
          ? ` Backfilled ${result.backfilled} stuck row${result.backfilled === 1 ? "" : "s"}.`
          : "";
      setSyncMessage({
        type: "ok",
        text: `Synced ${result.upserted} of ${result.swept} egresses from LiveKit. Skipped ${result.skipped}.${backfillNote}`,
      });
      await fetchRecordings();
    } catch (e) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setSyncMessage({ type: "err", text: msg || (e instanceof Error ? e.message : "Sync failed") });
    } finally {
      setSyncing(false);
    }
  }, [syncing, fetchRecordings]);

  const handleCopy = useCallback(async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* noop */
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  }, []);

  /**
   * Client-side filter for status + search field narrowing.
   * Server-side already applied q + source; this narrows the visible page by
   * the selected search field for instant feedback without a round-trip.
   */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return recordings.filter((rec) => {
      if (statusFilter === "live" && !LIVE_STATUSES.has(rec.status)) return false;
      if (statusFilter !== "all" && statusFilter !== "live" && rec.status !== statusFilter) return false;
      if (!q) return true;

      // Narrow by the selected search field
      if (searchField === "title") {
        const hay = [rec.meetingTitle, rec.meetingId].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      }
      if (searchField === "attendeeName") {
        const names = (rec.attendees || []).map((a) => a.name || "").join(" ").toLowerCase();
        return names.includes(q);
      }
      if (searchField === "attendeeEmail") {
        const emails = (rec.attendees || []).map((a) => a.email || "").join(" ").toLowerCase();
        return emails.includes(q);
      }
      // Fallback: search all fields
      const hay = [
        rec.meetingTitle,
        rec.meetingId,
        ...(rec.attendees || []).map((a) => `${a.name || ""} ${a.email || ""}`),
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [recordings, statusFilter, search, searchField]);

  const counts = useMemo(() => {
    const c = { all: recordings.length, live: 0, completed: 0, aborted: 0, failed: 0, missing: 0, expired: 0 };
    for (const r of recordings) {
      if (LIVE_STATUSES.has(r.status)) c.live += 1;
      if (r.status === "completed") c.completed += 1;
      else if (r.status === "aborted") c.aborted += 1;
      else if (r.status === "failed") c.failed += 1;
      else if (r.status === "missing") c.missing += 1;
      else if (r.status === "expired") c.expired += 1;
    }
    return c;
  }, [recordings]);

  const totalDurationMs = useMemo(() => {
    let total = 0;
    for (const r of recordings) {
      if (r.status !== "completed") continue;
      const d = r.durationMs;
      if (d && Number.isFinite(d) && d > 0 && d < 24 * 60 * 60 * 1000) total += d;
    }
    return total;
  }, [recordings]);

  const totalBytes = useMemo(() => {
    let total = 0;
    for (const r of recordings) {
      if (r.bytes && Number.isFinite(r.bytes) && r.bytes > 0) total += r.bytes;
    }
    return total;
  }, [recordings]);

  const STATUS_FILTERS: { key: StatusKey; label: string; count: number; tone: string }[] = [
    { key: "all", label: "All", count: counts.all, tone: "bg-primary/10 text-primary border-primary/30" },
    { key: "live", label: "Live", count: counts.live, tone: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
    { key: "completed", label: "Completed", count: counts.completed, tone: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
    { key: "aborted", label: "Aborted", count: counts.aborted, tone: "bg-orange-500/10 text-orange-600 border-orange-500/30" },
    { key: "failed", label: "Failed", count: counts.failed, tone: "bg-red-500/10 text-red-600 border-red-500/30" },
  ];

  const renderStatusPill = (rec: RecordingWithMeeting) => {
    const cls = STATUS_CLASS[rec.status] || "bg-gray-500/10 text-gray-600 border-gray-500/30";
    const isLive = LIVE_STATUSES.has(rec.status);
    return (
      <span
        className={`inline-flex items-center gap-1 border px-2 py-1 rounded-md text-xs font-medium ${cls}`}
        title={rec.lastError ? humanizeRecordingError(rec.lastError) : undefined}
      >
        {isLive && <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-60" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
        </span>}
        {STATUS_LABEL[rec.status] || rec.status}
      </span>
    );
  };

  const renderActions = (rec: RecordingWithMeeting) => {
    const hasPlay = !!rec.playbackUrl;
    const hasErr = !hasPlay && !!rec.playbackError;
    // Show transcript action for any terminal row — backend returns
    // processing/empty notices for rows that don't have segments yet.
    const showTranscript = rec.status === "completed" || rec.status === "aborted";
    return (
      <div className="flex items-center justify-center gap-2">
        {hasPlay && (
          <a
            href={rec.playbackUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="ti-btn ti-btn-icon ti-btn-sm ti-btn-success"
            title="Play"
          >
            <i className="ri-play-line" />
          </a>
        )}
        {hasPlay && (
          <a
            href={rec.playbackUrl!}
            download={getFilename(rec)}
            target="_blank"
            rel="noopener noreferrer"
            className="ti-btn ti-btn-icon ti-btn-sm ti-btn-light"
            title="Download"
          >
            <i className="ri-download-line" />
          </a>
        )}
        {showTranscript && (
          <button
            type="button"
            onClick={() =>
              setTranscriptTarget({ id: rec.id, title: rec.meetingTitle || rec.meetingId || "" })
            }
            className="ti-btn ti-btn-icon ti-btn-sm ti-btn-info-light"
            title="View transcript"
          >
            <i className="ri-file-text-line" />
          </button>
        )}
        {rec.egressId && (
          <button
            type="button"
            onClick={() => handleCopy(rec.id, rec.egressId!)}
            className="ti-btn ti-btn-icon ti-btn-sm ti-btn-light"
            title={copiedId === rec.id ? "Copied!" : "Copy egress ID"}
          >
            {copiedId === rec.id ? <i className="ri-check-line text-success" /> : <i className="ri-file-copy-line" />}
          </button>
        )}
        {hasErr && (
          <button
            type="button"
            className="ti-btn ti-btn-icon ti-btn-sm ti-btn-danger"
            title={humanizeRecordingError(rec.playbackError)}
          >
            <i className="ri-error-warning-line" />
          </button>
        )}
        {!hasPlay && !hasErr && !rec.egressId && !showTranscript && (
          <span className="text-defaulttextcolor/40 text-sm">—</span>
        )}
      </div>
    );
  };

  return (
    <Fragment>
      <Seo title="Recordings" />
      <div className="mt-5 grid grid-cols-12 gap-6 h-[calc(100vh-8rem)] sm:mt-6">
        <div className="xl:col-span-12 col-span-12 h-full flex flex-col">
          <div className="box custom-box h-full flex flex-col">
            {/* Header — title + count + control cluster matching meetings page */}
            <div className="box-header relative z-20 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="box-title">
                  Recordings
                  <span className="badge bg-light text-default rounded-full ms-2 text-[0.75rem] align-middle">
                    {totalResults}
                  </span>
                </div>
                {totalDurationMs > 0 && (
                  <div className="hidden lg:flex items-center gap-3 ps-3 border-s border-defaultborder/60 dark:border-white/10">
                    <span className="inline-flex items-center gap-1.5 text-[0.75rem] text-defaulttextcolor/70">
                      <i className="ri-time-line text-info" />
                      {formatDuration(totalDurationMs)}
                    </span>
                    {totalBytes > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-[0.75rem] text-defaulttextcolor/70">
                        <i className="ri-hard-drive-2-line text-success" />
                        {formatBytes(totalBytes)}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Source type dropdown */}
                <div className="relative">
                  <i className="ri-video-line absolute left-2.5 top-1/2 -translate-y-1/2 text-[0.85rem] text-defaulttextcolor/50 pointer-events-none" />
                  <select
                    aria-label="Filter by recording type"
                    style={{ appearance: "none", WebkitAppearance: "none", MozAppearance: "none", backgroundImage: "none" }}
                    className="rounded-md border border-defaultborder bg-white dark:bg-black/20 dark:border-white/10 !py-1 !pl-7 !pr-7 !text-[0.75rem] font-medium text-defaulttextcolor focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 hover:border-primary/40 transition-colors cursor-pointer"
                    value={sourceFilter}
                    onChange={(e) => {
                      setPage(1);
                      setSourceFilter(e.target.value as SourceFilter);
                    }}
                  >
                    <option value="">All Types</option>
                    <option value="interview">Interview</option>
                    <option value="meeting">Meeting</option>
                  </select>
                  <i className="ri-arrow-down-s-line absolute right-1.5 top-1/2 -translate-y-1/2 text-[0.9rem] text-defaulttextcolor/60 pointer-events-none" />
                </div>
                {/* Search field selector + search input */}
                <div className="flex items-center rounded-md border border-defaultborder dark:border-white/10 overflow-hidden bg-white dark:bg-black/20">
                  <select
                    aria-label="Search by field"
                    style={{ appearance: "none", WebkitAppearance: "none", MozAppearance: "none", backgroundImage: "none" }}
                    className="!py-1 !pl-2.5 !pr-5 !text-[0.72rem] font-medium text-defaulttextcolor/70 bg-gray-50 dark:bg-white/5 border-r border-defaultborder dark:border-white/10 focus:outline-none cursor-pointer"
                    value={searchField}
                    onChange={(e) => setSearchField(e.target.value as SearchField)}
                  >
                    <option value="title">Title</option>
                    <option value="attendeeName">Attendee Name</option>
                    <option value="attendeeEmail">Email</option>
                  </select>
                  <div className="relative flex items-center">
                    <i className="ri-search-line absolute left-2 text-[0.85rem] text-defaulttextcolor/40 pointer-events-none" />
                    <input
                      type="text"
                      placeholder={
                        searchField === "title"
                          ? "Search by title…"
                          : searchField === "attendeeName"
                          ? "Search by attendee name…"
                          : "Search by email…"
                      }
                      value={search}
                      onChange={(e) => { setPage(1); setSearch(e.target.value); }}
                      className="!py-1 !pl-7 !pr-3 !text-[0.75rem] bg-transparent border-none focus:outline-none focus:ring-0 !w-[13rem]"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        className="absolute right-1.5 text-defaulttextcolor/40 hover:text-defaulttextcolor/70"
                        aria-label="Clear search"
                      >
                        <i className="ri-close-line text-[0.8rem]" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <i className="ri-list-check-2 absolute left-2.5 top-1/2 -translate-y-1/2 text-[0.85rem] text-defaulttextcolor/50 pointer-events-none" />
                  <select
                    aria-label="Rows per page"
                    style={{ appearance: "none", WebkitAppearance: "none", MozAppearance: "none", backgroundImage: "none" }}
                    className="rounded-md border border-defaultborder bg-white dark:bg-black/20 dark:border-white/10 !py-1 !pl-7 !pr-7 !text-[0.75rem] font-medium text-defaulttextcolor focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 hover:border-primary/40 transition-colors cursor-pointer"
                    value={pageSize}
                    onChange={(e) => {
                      setPage(1);
                      setPageSize(Number(e.target.value));
                    }}
                  >
                    {PAGE_SIZES.map((n) => (
                      <option key={n} value={n}>{n} rows</option>
                    ))}
                  </select>
                  <i className="ri-arrow-down-s-line absolute right-1.5 top-1/2 -translate-y-1/2 text-[0.9rem] text-defaulttextcolor/60 pointer-events-none" />
                </div>
                <div className="flex items-center rounded-lg border border-defaultborder dark:border-defaultborder/20 p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={`ti-btn !py-1 !px-2.5 !text-[0.75rem] rounded-md ${viewMode === "table" ? "ti-btn-primary" : "ti-btn-light"}`}
                  >
                    <i className="ri-table-line me-1" />Table
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`ti-btn !py-1 !px-2.5 !text-[0.75rem] rounded-md ${viewMode === "grid" ? "ti-btn-primary" : "ti-btn-light"}`}
                  >
                    <i className="ri-grid-line me-1" />Grid
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={syncing}
                  title="Pull every egress from LiveKit and refresh this list"
                  className="ti-btn ti-btn-primary-full !py-1 !px-2.5 !text-[0.75rem] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {syncing ? (
                    <>
                      <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full me-1.5" />
                      Syncing…
                    </>
                  ) : (
                    <>
                      <i className="ri-refresh-line font-semibold align-middle me-1" />
                      Sync from LiveKit
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Status filter chip row */}
            <div className="px-4 py-3 border-b border-defaultborder/60 dark:border-white/5 flex flex-wrap items-center gap-2">
              {STATUS_FILTERS.map((f) => {
                const active = statusFilter === f.key;
                const showCount = f.count > 0 || f.key === "all";
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setStatusFilter(f.key)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[0.7rem] font-medium transition-colors ${
                      active ? f.tone : "bg-transparent text-defaulttextcolor/70 border-defaultborder/60 hover:bg-gray-50 dark:hover:bg-white/5"
                    }`}
                  >
                    {f.label}
                    {showCount && (
                      <span className={`inline-flex items-center justify-center min-w-[1.25rem] px-1 rounded-full text-[0.65rem] font-semibold ${
                        active ? "bg-white/40 dark:bg-black/20" : "bg-gray-100 dark:bg-white/10"
                      }`}>{f.count}</span>
                    )}
                  </button>
                );
              })}
              <div className="ms-auto text-[0.7rem] text-defaulttextcolor/50">
                Showing {filtered.length} of {recordings.length} on this page
              </div>
            </div>

            {/* Body */}
            <div className="box-body relative z-0 !p-0 flex-1 flex flex-col overflow-hidden">
              {/* Banners */}
              {(error || syncMessage) && (
                <div className="px-4 pt-3 space-y-2">
                  {error && (
                    <div className="p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-xs flex items-start gap-2">
                      <i className="ri-error-warning-line text-base mt-0.5" />
                      <span className="flex-1">{error}</span>
                      <button type="button" onClick={() => fetchRecordings()} className="text-xs font-medium underline">Retry</button>
                    </div>
                  )}
                  {syncMessage && (
                    <div className={`p-3 rounded-md border text-xs flex items-center justify-between gap-3 ${
                      syncMessage.type === "ok"
                        ? "bg-success/10 border-success/20 text-success"
                        : "bg-danger/10 border-danger/20 text-danger"
                    }`}>
                      <div className="flex items-center gap-2">
                        <i className={syncMessage.type === "ok" ? "ri-checkbox-circle-line" : "ri-error-warning-line"} />
                        <span>{syncMessage.text}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSyncMessage(null)}
                        className="opacity-70 hover:opacity-100"
                        aria-label="Dismiss"
                      >
                        <i className="ri-close-line" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-16 px-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent mb-4" />
                  <p className="text-sm text-gray-500">Loading recordings…</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <i className="ri-vidicon-line text-3xl text-primary" />
                  </div>
                  <h4 className="text-base font-semibold mb-1">
                    {recordings.length === 0 ? "No recordings yet" : "No recordings match your filters"}
                  </h4>
                  <p className="text-sm text-defaulttextcolor/60 mb-4 max-w-sm">
                    {recordings.length === 0
                      ? "Start a meeting and use the Record button to capture a session. Recordings sync from LiveKit egress."
                      : "Try a different status filter or clear the search box."}
                  </p>
                  <div className="flex gap-2">
                    {recordings.length === 0 ? (
                      <>
                        <button
                          type="button"
                          className="ti-btn ti-btn-primary !py-2 !px-4 !text-sm"
                          onClick={() => router.push("/communication/meetings")}
                        >
                          <i className="ri-calendar-line me-1" />Schedule a meeting
                        </button>
                        <button
                          type="button"
                          className="ti-btn ti-btn-light !py-2 !px-4 !text-sm"
                          onClick={() => router.push("/ats/interviews")}
                        >
                          Go to Interviews
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="ti-btn ti-btn-light !py-2 !px-4 !text-sm"
                        onClick={() => { setStatusFilter("all"); setSearch(""); setSourceFilter(""); setSearchField("title"); }}
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </div>
              ) : viewMode === "table" ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="min-h-0 flex-1 overflow-auto">
                    <div className="table-responsive">
                      <table className="table table-hover whitespace-nowrap min-w-full">
                        <thead>
                          <tr>
                            <th className="!text-[0.75rem]">Recording</th>
                            <th className="!text-[0.75rem]">Started</th>
                            <th className="!text-[0.75rem]">Duration</th>
                            <th className="!text-[0.75rem]">Status</th>
                            <th className="!text-[0.75rem] text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((rec) => (
                            <tr key={rec.id} className={LIVE_STATUSES.has(rec.status) ? "bg-amber-500/[0.025]" : ""}>
                              <td className="!text-[0.8125rem] align-middle">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-gray-800 dark:text-white truncate max-w-[18rem]" title={rec.meetingTitle || rec.meetingId}>
                                      {rec.meetingTitle || rec.meetingId || "—"}
                                    </span>
                                    {rec.source && (
                                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.65rem] font-medium border ${
                                        rec.source === "interview"
                                          ? "bg-violet-500/10 text-violet-600 border-violet-400/30 dark:text-violet-400"
                                          : "bg-sky-500/10 text-sky-600 border-sky-400/30 dark:text-sky-400"
                                      }`}>
                                        <i className={rec.source === "interview" ? "ri-user-voice-line" : "ri-video-chat-line"} />
                                        {rec.source === "interview" ? "Interview" : "Meeting"}
                                      </span>
                                    )}
                                  </div>
                                  {rec.attendees && rec.attendees.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                      {rec.attendees.slice(0, 3).map((a, i) => (
                                        <span key={i} className="inline-flex items-center gap-1 text-[0.68rem] text-defaulttextcolor/60 bg-gray-100 dark:bg-white/5 rounded px-1.5 py-0.5" title={a.email || undefined}>
                                          <i className="ri-user-line text-[0.65rem]" />
                                          {a.name || a.email || "—"}
                                        </span>
                                      ))}
                                      {rec.attendees.length > 3 && (
                                        <span className="text-[0.68rem] text-defaulttextcolor/50 px-1">+{rec.attendees.length - 3} more</span>
                                      )}
                                    </div>
                                  )}
                                  {rec.egressId && (
                                    <div className="text-[0.7rem] text-defaulttextcolor/60 font-mono flex items-center gap-1">
                                      <i className="ri-fingerprint-line text-info" />
                                      <span className="truncate max-w-[14rem]">{rec.egressId}</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="!text-[0.8125rem] align-middle">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                    <i className="ri-calendar-line text-primary text-[0.85rem]" />
                                    {formatDateOnly(rec.startedAt)}
                                  </span>
                                  <span className="text-[0.7rem] text-defaulttextcolor/60 flex items-center gap-1">
                                    <i className="ri-time-line text-info text-[0.8rem]" />
                                    {formatTimeOnly(rec.startedAt)}
                                  </span>
                                </div>
                              </td>
                              <td className="!text-[0.8125rem] align-middle tabular-nums font-medium">
                                {formatDuration(rec.durationMs, rec.startedAt, rec.completedAt)}
                              </td>
                              <td className="!text-[0.8125rem] align-middle">{renderStatusPill(rec)}</td>
                              <td className="!text-[0.8125rem] align-middle text-center">{renderActions(rec)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <PaginationBar
                    page={page}
                    totalPages={totalPages}
                    onPrev={() => setPage((p) => Math.max(1, p - 1))}
                    onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
                    onGoto={(p) => setPage(p)}
                  />
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="min-h-0 flex-1 overflow-auto p-4">
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {filtered.map((rec) => {
                        const isLive = LIVE_STATUSES.has(rec.status);
                        const hasPlay = !!rec.playbackUrl;
                        return (
                          <div
                            key={rec.id}
                            className={`relative rounded-xl border bg-white dark:bg-black/20 overflow-hidden flex flex-col group transition-all hover:shadow-md ${
                              isLive
                                ? "border-amber-500/40 shadow-[0_0_0_2px_rgba(245,158,11,0.08)]"
                                : "border-defaultborder/70 dark:border-white/10"
                            }`}
                          >
                            {/* Thumbnail strip — gradient placeholder; play overlay if available */}
                            <div className={`relative aspect-video w-full overflow-hidden ${
                              hasPlay
                                ? "bg-gradient-to-br from-emerald-500/20 via-emerald-500/5 to-primary/10"
                                : isLive
                                ? "bg-gradient-to-br from-amber-500/25 via-amber-500/5 to-orange-500/15"
                                : "bg-gradient-to-br from-gray-200 to-gray-100 dark:from-white/5 dark:to-white/[0.02]"
                            }`}>
                              <div className="absolute inset-0 flex items-center justify-center">
                                {hasPlay ? (
                                  <a
                                    href={rec.playbackUrl!}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-12 h-12 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur flex items-center justify-center text-success text-xl shadow-lg transform group-hover:scale-110 transition-transform"
                                    title="Play"
                                  >
                                    <i className="ri-play-fill" />
                                  </a>
                                ) : isLive ? (
                                  <div className="flex flex-col items-center gap-2 text-amber-600">
                                    <span className="relative flex h-3 w-3">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-60" />
                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                                    </span>
                                    <span className="text-[0.7rem] font-semibold uppercase tracking-wider">Recording</span>
                                  </div>
                                ) : (
                                  <i className="ri-vidicon-off-line text-3xl text-defaulttextcolor/30" />
                                )}
                              </div>
                              <div className="absolute top-2 left-2">{renderStatusPill(rec)}</div>
                              {rec.durationMs != null && (
                                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-[0.65rem] font-medium tabular-nums">
                                  {formatDuration(rec.durationMs, rec.startedAt, rec.completedAt)}
                                </div>
                              )}
                            </div>
                            {/* Body */}
                            <div className="p-3 flex flex-col gap-2 flex-1">
                              <div className="flex items-start gap-2 flex-wrap">
                                <span className="font-semibold text-sm text-gray-800 dark:text-white line-clamp-2 leading-snug flex-1" title={rec.meetingTitle || rec.meetingId}>
                                  {rec.meetingTitle || rec.meetingId || "—"}
                                </span>
                                {rec.source && (
                                  <span className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.65rem] font-medium border ${
                                    rec.source === "interview"
                                      ? "bg-violet-500/10 text-violet-600 border-violet-400/30 dark:text-violet-400"
                                      : "bg-sky-500/10 text-sky-600 border-sky-400/30 dark:text-sky-400"
                                  }`}>
                                    <i className={rec.source === "interview" ? "ri-user-voice-line" : "ri-video-chat-line"} />
                                    {rec.source === "interview" ? "Interview" : "Meeting"}
                                  </span>
                                )}
                              </div>
                              {rec.attendees && rec.attendees.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {rec.attendees.slice(0, 2).map((a, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 text-[0.67rem] text-defaulttextcolor/60 bg-gray-100 dark:bg-white/5 rounded px-1.5 py-0.5" title={a.email || undefined}>
                                      <i className="ri-user-line text-[0.63rem]" />
                                      {a.name || a.email || "—"}
                                    </span>
                                  ))}
                                  {rec.attendees.length > 2 && (
                                    <span className="text-[0.67rem] text-defaulttextcolor/50 px-1">+{rec.attendees.length - 2}</span>
                                  )}
                                </div>
                              )}
                              <div className="flex items-center gap-3 text-[0.7rem] text-defaulttextcolor/60">
                                <span className="flex items-center gap-1">
                                  <i className="ri-calendar-line text-primary" />
                                  {formatDateOnly(rec.startedAt)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <i className="ri-time-line text-info" />
                                  {formatTimeOnly(rec.startedAt)}
                                </span>
                              </div>
                              {(rec.bytes || rec.egressId) && (
                                <div className="flex items-center gap-3 text-[0.7rem] text-defaulttextcolor/55">
                                  {rec.bytes != null && (
                                    <span className="flex items-center gap-1">
                                      <i className="ri-hard-drive-2-line" />
                                      {formatBytes(rec.bytes)}
                                    </span>
                                  )}
                                  {rec.egressId && (
                                    <span className="flex items-center gap-1 font-mono truncate" title={rec.egressId}>
                                      <i className="ri-fingerprint-line" />
                                      {rec.egressId.slice(0, 12)}…
                                    </span>
                                  )}
                                </div>
                              )}
                              {rec.lastError && (
                                <div className="text-[0.7rem] text-rose-600 dark:text-rose-400 line-clamp-2" title={rec.lastError}>
                                  <i className="ri-error-warning-line me-1" />
                                  {humanizeRecordingError(rec.lastError)}
                                </div>
                              )}
                              <div className="mt-auto pt-2 border-t border-defaultborder/50 dark:border-white/5 flex items-center justify-end gap-1.5">
                                {renderActions(rec)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <PaginationBar
                    page={page}
                    totalPages={totalPages}
                    onPrev={() => setPage((p) => Math.max(1, p - 1))}
                    onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
                    onGoto={(p) => setPage(p)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <TranscriptModal
        recordingId={transcriptTarget?.id ?? null}
        meetingTitle={transcriptTarget?.title}
        onClose={() => setTranscriptTarget(null)}
      />
    </Fragment>
  );
}

function PaginationBar({
  page,
  totalPages,
  onPrev,
  onNext,
  onGoto,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onGoto: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  // Compact page-list: show up to 7 numbered slots with ellipsis for the gaps,
  // mirroring the meetings page numbered pagination but bounded so the bar
  // doesn't blow up on 100-page result sets.
  const window: (number | "…")[] = [];
  const push = (v: number | "…") => {
    if (window[window.length - 1] !== v) window.push(v);
  };
  const add = (n: number) => { if (n >= 1 && n <= totalPages) push(n); };
  add(1);
  for (let i = page - 1; i <= page + 1; i++) {
    if (i > 1 && i < totalPages) {
      if (i === page - 1 && i > 2) push("…");
      add(i);
    }
  }
  if (page + 1 < totalPages - 1) push("…");
  add(totalPages);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-defaultborder px-4 py-3 dark:border-defaultborder/10">
      <span className="text-xs text-defaulttextcolor/70">
        Page {page} of {totalPages}
      </span>
      <nav aria-label="Page navigation" className="shrink-0">
        <div className="m-0 inline-flex flex-nowrap items-center gap-1 rounded-lg border border-defaultborder/70 bg-white p-1 shadow-sm dark:border-defaultborder/20 dark:bg-black/20">
          <button
            type="button"
            className="inline-flex min-w-[2.25rem] items-center justify-center rounded-md px-2.5 py-1.5 text-xs font-medium text-defaulttextcolor transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white/80 dark:hover:bg-white/10"
            onClick={onPrev}
            disabled={!canPrev}
          >
            Prev
          </button>
          {window.map((slot, i) =>
            slot === "…" ? (
              <span key={`gap-${i}`} className="px-2 text-xs text-defaulttextcolor/50">…</span>
            ) : (
              <button
                key={slot}
                type="button"
                className={`inline-flex min-w-[2rem] items-center justify-center rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  page === slot
                    ? "bg-primary text-white shadow-sm"
                    : "text-defaulttextcolor hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/10"
                }`}
                onClick={() => onGoto(slot)}
              >
                {slot}
              </button>
            )
          )}
          <button
            type="button"
            className="inline-flex min-w-[2.25rem] items-center justify-center rounded-md px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onNext}
            disabled={!canNext}
          >
            Next
          </button>
        </div>
      </nav>
    </div>
  );
}
