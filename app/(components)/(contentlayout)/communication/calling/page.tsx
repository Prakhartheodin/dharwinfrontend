"use client";

import Seo from "@/shared/layout-components/seo/seo";
import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  deleteBolnaCallRecord,
  syncBolnaCallRecords,
  type CallRecord,
} from "@/shared/lib/api/bolna";
import type { ChatCall } from "@/shared/lib/api/chat";
import { listUnifiedCalls, type UnifiedCallResult } from "@/shared/lib/api/communication";
import { useAuth } from "@/shared/contexts/auth-context";
import { useChatSocket, type CallUpdateData } from "@/shared/contexts/ChatSocketContext";

type SourceFilter = "all" | "telephony" | "in_app";
type PurposeFilter = "all" | "job_recruiter" | "student_candidate";

type UnifiedCall =
  | { source: "telephony"; data: CallRecord }
  | { source: "in_app"; data: ChatCall };

/** Map server unified row to UI union type. */
function mapUnifiedResult(row: UnifiedCallResult): UnifiedCall {
  if (row.source === "telephony" && row.telephony) {
    return { source: "telephony", data: row.telephony };
  }
  return { source: "in_app", data: (row.chatCall || {}) as ChatCall };
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "call_disconnected", label: "Call Disconnected" },
  { value: "busy", label: "Busy" },
  { value: "no_answer", label: "No Answer" },
  { value: "initiated", label: "Initiated" },
  { value: "in_progress", label: "In Progress" },
  { value: "unknown", label: "Unknown" },
  { value: "ongoing", label: "Ongoing" },
  { value: "missed", label: "Missed" },
  { value: "declined", label: "Declined" },
];

const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: "all", label: "All Calls" },
  { value: "telephony", label: "Telephony" },
  { value: "in_app", label: "In-App" },
];

const PURPOSE_OPTIONS: { value: PurposeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "job_recruiter", label: "Job/Recruiter" },
  { value: "student_candidate", label: "Student/Candidate" },
];

function purposeToCategory(purpose?: string | null, displayCategory?: string | null): "Job/Recruiter" | "Student/Candidate" | "Other" {
  if (displayCategory === "Job/Recruiter" || displayCategory === "Student/Candidate") return displayCategory;
  if (!purpose || !purpose.trim()) return "Other";
  const p = purpose.toLowerCase();
  if (p.includes("job_application_verification") || p.includes("application_verification"))
    return "Student/Candidate";
  if (
    p.includes("job_verification") ||
    p.includes("job_posting_verification") ||
    p.includes("recruiter")
  )
    return "Job/Recruiter";
  return "Other";
}

function categoryMatchesPurposeFilter(
  category: "Job/Recruiter" | "Student/Candidate" | "Other",
  filter: PurposeFilter
): boolean {
  if (filter === "all") return true;
  if (filter === "job_recruiter") return category === "Job/Recruiter";
  if (filter === "student_candidate") return category === "Student/Candidate";
  return true;
}

function getTelephonyName(record: CallRecord): string {
  const category = purposeToCategory(record.purpose, record.displayCategory);
  const resolvedName = (record.displayName || record.businessName || "").trim();
  const resolvedPhone =
    (record.toPhoneNumber || record.recipientPhoneNumber || record.phone || "").trim();

  if (category === "Job/Recruiter") {
    return resolvedName || resolvedPhone || "–";
  }
  if (category === "Student/Candidate") {
    return resolvedName || resolvedPhone || "–";
  }
  return resolvedName || resolvedPhone || "–";
}

const PAGE_SIZES = [10, 25, 50, 100];

function statusToLabel(s?: string): string {
  if (!s) return "–";
  const map: Record<string, string> = {
    completed: "Completed",
    failed: "Failed",
    call_disconnected: "Call Disconnected",
    busy: "Busy",
    no_answer: "No Answer",
    initiated: "Initiated",
    in_progress: "In Progress",
    ongoing: "Ongoing",
    missed: "Missed",
    declined: "Declined",
    ringing: "Ringing",
    unknown: "Unknown",
  };
  return map[s] || s;
}

/**
 * Bordered + tinted chip palette matching recordings/meetings pages so calling
 * doesn't visually drift from siblings. Live states (in_progress, ringing,
 * initiated, ongoing) get amber + animated ping dot — same convention as
 * recordings.
 */
function statusBadgeClass(s?: string): string {
  const x = (s || "").toLowerCase();
  if (x === "completed")
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
  if (x === "failed" || x === "error")
    return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30";
  if (x === "call_disconnected" || x === "call-disconnected")
    return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30";
  if (x === "missed" || x === "declined")
    return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
  if (x === "busy" || x === "no_answer")
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
  if (x === "in_progress" || x === "initiated" || x === "ongoing" || x === "ringing")
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
  return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30";
}

const LIVE_CALL_STATUSES = new Set([
  "in_progress",
  "initiated",
  "ongoing",
  "ringing",
]);

function getUnifiedId(u: UnifiedCall): string {
  if (u.source === "telephony") return (u.data._id || u.data.id || "") as string;
  return u.data.id || "";
}

function getUnifiedDate(u: UnifiedCall): string | undefined {
  return u.data.createdAt;
}

function getUnifiedStatus(u: UnifiedCall): string {
  if (u.source === "telephony") return (u.data as CallRecord).status || "unknown";
  return (u.data as ChatCall).status || "–";
}

/** Compact page list with gaps for ellipsis (1-based page indices). */
function visiblePageIndices(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set<number>([1, total]);
  for (let i = current - 1; i <= current + 1; i++) {
    if (i >= 1 && i <= total) set.add(i);
  }
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev > 0 && p - prev > 1) out.push("gap");
    out.push(p);
    prev = p;
  }
  return out;
}

const Calling = () => {
  const { isAdministrator: authIsAdministrator, isPlatformSuperUser } = useAuth();
  const isAdministrator = isPlatformSuperUser || authIsAdministrator;

  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [purposeFilter, setPurposeFilter] = useState<PurposeFilter>("all");
  const [unifiedCalls, setUnifiedCalls] = useState<UnifiedCall[]>([]);
  const [totalCalls, setTotalCalls] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sourceCounts, setSourceCounts] = useState({ all: 0, telephony: 0, in_app: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchSubmitted, setSearchSubmitted] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [syncing, setSyncing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedCall, setSelectedCall] = useState<UnifiedCall | null>(null);
  /** Panel visibility (animated). Content may linger until transition ends — see effect below. */
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(false);

  const PANEL_TRANSITION_MS = 320;

  const openCallDetails = useCallback((u: UnifiedCall) => {
    setSelectedCall(u);
    setDetailsPanelOpen(true);
  }, []);

  const closeCallDetails = useCallback(() => {
    setDetailsPanelOpen(false);
  }, []);

  useEffect(() => {
    if (!detailsPanelOpen && selectedCall) {
      const id = window.setTimeout(() => setSelectedCall(null), PANEL_TRANSITION_MS);
      return () => window.clearTimeout(id);
    }
  }, [detailsPanelOpen, selectedCall]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const mq = window.matchMedia("(max-width: 1279px)");
    const applyOverflow = () => {
      if (!detailsPanelOpen) {
        document.body.style.overflow = "";
        return;
      }
      document.body.style.overflow = mq.matches ? "hidden" : "";
    };
    applyOverflow();
    mq.addEventListener("change", applyOverflow);
    return () => {
      mq.removeEventListener("change", applyOverflow);
      document.body.style.overflow = "";
    };
  }, [detailsPanelOpen]);

  useEffect(() => {
    if (!detailsPanelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCallDetails();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailsPanelOpen, closeCallDetails]);

  const fetchSourceCounts = useCallback(async () => {
    try {
      const [allRes, telRes, appRes] = await Promise.all([
        listUnifiedCalls({ source: "all", page: 1, limit: 1 }),
        listUnifiedCalls({ source: "telephony", page: 1, limit: 1 }),
        listUnifiedCalls({ source: "in_app", page: 1, limit: 1 }),
      ]);
      setSourceCounts({
        all: allRes.total,
        telephony: telRes.total,
        in_app: appRes.total,
      });
    } catch {
      /* counts are non-blocking */
    }
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listUnifiedCalls({
        page,
        limit: pageSize,
        source: sourceFilter,
        search: searchSubmitted || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        purpose: isAdministrator && purposeFilter !== "all" ? purposeFilter : undefined,
        sortBy: "createdAt",
        order: "desc",
      });
      setUnifiedCalls((data.results || []).map(mapUnifiedResult));
      setTotalCalls(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (e) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setError(msg || (e instanceof Error ? e.message : "Failed to load call records"));
      setUnifiedCalls([]);
      setTotalCalls(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sourceFilter, searchSubmitted, statusFilter, isAdministrator, purposeFilter]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    fetchSourceCounts();
  }, [fetchSourceCounts, syncing]);

  // Live updates from backend callSync.service.js. Admin sees every call:update;
  // non-admins receive only deltas they're scoped to (candidate/job rooms).
  // Strategy: patch the row in place if known; otherwise refetch first page so
  // newly-created records pick up enrichment (displayCategory, displayName).
  const { onCallUpdate } = useChatSocket();
  useEffect(() => {
    const off = onCallUpdate((evt: CallUpdateData) => {
      if (!evt?.executionId) return;
      let matched = false;
      setUnifiedCalls((prev) => {
        const idx = prev.findIndex(
          (u) => u.source === "telephony" && (u.data as CallRecord).executionId === evt.executionId
        );
        if (idx === -1) return prev;
        matched = true;
        const next = prev.slice();
        const record = next[idx].data as CallRecord;
        next[idx] = {
          source: "telephony",
          data: {
            ...record,
            status: evt.status ?? record.status,
            duration: evt.duration ?? record.duration,
            recordingUrl: evt.recordingUrl ?? record.recordingUrl,
            fromPhoneNumber: evt.fromPhoneNumber ?? record.fromPhoneNumber,
            toPhoneNumber: evt.toPhoneNumber ?? record.toPhoneNumber,
            recipientPhoneNumber: evt.recipientPhoneNumber ?? record.recipientPhoneNumber,
            phone: evt.phone ?? record.phone,
            businessName: evt.businessName ?? record.businessName,
            purpose: evt.purpose ?? record.purpose,
            errorMessage: evt.errorMessage ?? record.errorMessage,
            completedAt: evt.completedAt ?? record.completedAt,
          },
        };
        return next;
      });
      if (!matched) {
        fetchRecords();
      }
    });
    return off;
  }, [onCallUpdate, fetchRecords]);

  const paginatedCalls = unifiedCalls;
  const totalMerged = totalCalls;
  const totalPagesMerged = totalPages;
  const rangeStart = totalMerged === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalMerged);
  const pageItems = useMemo(
    () => visiblePageIndices(page, totalPagesMerged),
    [page, totalPagesMerged]
  );

  const formatDate = (iso?: string) => {
    if (!iso) return "–";
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "–";
      return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "medium" });
    } catch {
      return "–";
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncBolnaCallRecords();
      await fetchRecords();
      await fetchSourceCounts();
    } catch (e) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setError(msg || (e instanceof Error ? e.message : "Sync failed"));
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id: string, source: "telephony" | "in_app") => {
    if (source !== "telephony") return;
    const ok = window.confirm("Delete this call record?");
    if (!ok) return;
    setDeletingId(id);
    try {
      await deleteBolnaCallRecord(id);
      if (selectedCall?.source === "telephony" && (selectedCall.data._id || selectedCall.data.id) === id) {
        setDetailsPanelOpen(false);
        setSelectedCall(null);
      }
      await fetchRecords();
    } catch (e) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setError(msg || (e instanceof Error ? e.message : "Delete failed"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Fragment>
      <Seo title={"Calling"} />
      {/*
        Desktop (xl+): flex row — details column animates width 0→28rem so the main table eases into
        the freed space (no overlap). Mobile: main stays full width; details stays fixed slide-over.
        Shell mirrors recordings/meetings: full-height card with header chip-row + body + footer.
      */}
      <div className="mt-5 flex w-full min-w-0 flex-col gap-6 sm:mt-6 xl:flex-row xl:items-stretch xl:gap-6 xl:h-[calc(100vh-8rem)]">
        <div className="w-full min-w-0 max-w-full flex-1 basis-full xl:min-w-0 xl:h-full xl:flex xl:flex-col">
          <div className="box custom-box w-full max-w-full min-w-0 xl:h-full xl:flex xl:flex-col">
            <div className="box-header relative z-20 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="box-title">
                  Call Records
                  <span className="badge bg-light text-default rounded-full ms-2 text-[0.75rem] align-middle">
                    {totalMerged}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-[0.85rem] text-defaulttextcolor/50 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search phone or business…"
                    className="form-control !py-1 !pl-8 !pr-3 !text-[0.75rem] !w-[14rem]"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setPage(1);
                        setSearchSubmitted(search);
                      }
                    }}
                  />
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
                <button
                  type="button"
                  className="ti-btn ti-btn-light !py-1 !px-2.5 !text-[0.75rem]"
                  onClick={fetchRecords}
                  title="Refresh records"
                >
                  <i className="ri-restart-line align-middle me-1" />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={syncing}
                  title="Pull latest call records from Bolna telephony"
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
                      Sync Telephony
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Source filter chip row — mirrors recordings status filters */}
            <div className="px-4 py-3 border-b border-defaultborder/60 dark:border-white/5 flex flex-wrap items-center gap-2">
              {SOURCE_OPTIONS.map((o) => {
                const active = sourceFilter === o.value;
                const tone =
                  o.value === "telephony"
                    ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/30"
                    : o.value === "in_app"
                      ? "bg-sky-500/10 text-sky-600 border-sky-500/30"
                      : "bg-primary/10 text-primary border-primary/30";
                const count = sourceCounts[o.value] ?? 0;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => {
                      setSourceFilter(o.value);
                      setPage(1);
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[0.7rem] font-medium transition-colors ${
                      active
                        ? tone
                        : "bg-transparent text-defaulttextcolor/70 border-defaultborder/60 hover:bg-gray-50 dark:hover:bg-white/5"
                    }`}
                  >
                    {o.label}
                    <span
                      className={`inline-flex items-center justify-center min-w-[1.25rem] px-1 rounded-full text-[0.65rem] font-semibold ${
                        active ? "bg-white/40 dark:bg-black/20" : "bg-gray-100 dark:bg-white/10"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}

              <div className="ms-auto flex flex-wrap items-center gap-2">
                <div className="relative">
                  <i className="ri-pulse-line absolute left-2.5 top-1/2 -translate-y-1/2 text-[0.8rem] text-defaulttextcolor/50 pointer-events-none" />
                  <select
                    aria-label="Status filter"
                    style={{ appearance: "none", WebkitAppearance: "none", MozAppearance: "none", backgroundImage: "none" }}
                    className="rounded-md border border-defaultborder bg-white dark:bg-black/20 dark:border-white/10 !py-1 !pl-7 !pr-7 !text-[0.7rem] font-medium text-defaulttextcolor focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 hover:border-primary/40 transition-colors cursor-pointer"
                    value={statusFilter}
                    onChange={(e) => {
                      setPage(1);
                      setStatusFilter(e.target.value);
                    }}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <i className="ri-arrow-down-s-line absolute right-1.5 top-1/2 -translate-y-1/2 text-[0.85rem] text-defaulttextcolor/60 pointer-events-none" />
                </div>
                {isAdministrator && (sourceFilter === "telephony" || sourceFilter === "all") && (
                  <div className="relative">
                    <i className="ri-briefcase-line absolute left-2.5 top-1/2 -translate-y-1/2 text-[0.8rem] text-defaulttextcolor/50 pointer-events-none" />
                    <select
                      aria-label="Purpose filter"
                      style={{ appearance: "none", WebkitAppearance: "none", MozAppearance: "none", backgroundImage: "none" }}
                      className="rounded-md border border-defaultborder bg-white dark:bg-black/20 dark:border-white/10 !py-1 !pl-7 !pr-7 !text-[0.7rem] font-medium text-defaulttextcolor focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 hover:border-primary/40 transition-colors cursor-pointer"
                      value={purposeFilter}
                      onChange={(e) => {
                        setPage(1);
                        setPurposeFilter(e.target.value as PurposeFilter);
                      }}
                    >
                      {PURPOSE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <i className="ri-arrow-down-s-line absolute right-1.5 top-1/2 -translate-y-1/2 text-[0.85rem] text-defaulttextcolor/60 pointer-events-none" />
                  </div>
                )}
                <span className="text-[0.7rem] text-defaulttextcolor/50">
                  Showing {paginatedCalls.length} of {totalMerged}
                </span>
              </div>
            </div>

            <div className="box-body relative z-0 !p-0 flex-1 flex flex-col overflow-hidden">
              {error && (
                <div className="px-4 pt-3">
                  <div className="p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-xs flex items-start gap-2">
                    <i className="ri-error-warning-line text-base mt-0.5" />
                    <span className="flex-1">{error}</span>
                    <button type="button" onClick={fetchRecords} className="text-xs font-medium underline">Retry</button>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-16 px-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent mb-4" />
                  <p className="text-sm text-gray-500">Loading call records…</p>
                </div>
              ) : paginatedCalls.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <i className="ri-phone-line text-3xl text-primary" />
                  </div>
                  <h4 className="text-base font-semibold mb-1">No call records found</h4>
                  <p className="text-sm text-defaulttextcolor/60 mb-4 max-w-sm">
                    Try a different status, source, or clear the search box to see all calls.
                  </p>
                  <button
                    type="button"
                    className="ti-btn ti-btn-light !py-2 !px-4 !text-sm"
                    onClick={() => {
                      setSourceFilter("all");
                      setStatusFilter("all");
                      setPurposeFilter("all");
                      setSearch("");
                      setSearchSubmitted("");
                      setPage(1);
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="min-h-0 flex-1 overflow-auto">
                    <div className="table-responsive">
                      <table className="table table-hover whitespace-nowrap min-w-full align-middle">
                        <thead>
                          <tr>
                            <th className="!text-[0.75rem]">Source</th>
                            {(sourceFilter === "telephony" || sourceFilter === "all") && (
                              <th className="!text-[0.75rem]">Category</th>
                            )}
                            <th className="!text-[0.75rem]">Date</th>
                            <th className="!text-[0.75rem] min-w-[220px]">To / Caller</th>
                            <th className="!text-[0.75rem] min-w-[170px]">From / Participants</th>
                            <th className="!text-[0.75rem]">Type</th>
                            <th className="!text-[0.75rem]">Status</th>
                            <th className="!text-[0.75rem]">Duration</th>
                            <th className="!text-[0.75rem]">Recording</th>
                            <th className="!text-[0.75rem] text-center min-w-[130px]">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedCalls.map((u) => {
                            const id = getUnifiedId(u);
                            const isTelephony = u.source === "telephony";
                            const r = isTelephony ? (u.data as CallRecord) : (u.data as ChatCall);
                            const telephonyCategory = isTelephony
                              ? purposeToCategory((r as CallRecord).purpose, (r as CallRecord).displayCategory)
                              : "–";
                            const telephonyPhone = isTelephony
                              ? ((r as CallRecord).toPhoneNumber ||
                                  (r as CallRecord).recipientPhoneNumber ||
                                  (r as CallRecord).phone ||
                                  "")
                              : "";
                            const status = getUnifiedStatus(u);
                            const isLive = LIVE_CALL_STATUSES.has((status || "").toLowerCase());
                            const recordingUrl =
                              (isTelephony
                                ? (r as CallRecord).recordingUrl
                                : (r as ChatCall).recordingUrl) || null;
                            return (
                              <tr
                                key={`${u.source}-${id}`}
                                className={isLive ? "bg-amber-500/[0.025]" : ""}
                              >
                                <td className="!text-[0.8125rem] align-middle">
                                  <span
                                    className={`inline-flex items-center gap-1 border px-2 py-0.5 rounded-md text-[0.7rem] font-medium ${
                                      isTelephony
                                        ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30"
                                        : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30"
                                    }`}
                                  >
                                    <i
                                      className={`${
                                        isTelephony ? "ri-phone-line" : "ri-chat-voice-line"
                                      } text-[0.8rem]`}
                                    />
                                    {isTelephony ? "Telephony" : "In-App"}
                                  </span>
                                </td>
                                {(sourceFilter === "telephony" || sourceFilter === "all") && (
                                  <td className="!text-[0.8125rem] align-middle">
                                    {isTelephony
                                      ? telephonyCategory
                                      : (() => {
                                          const c = r as ChatCall;
                                          const isGroup =
                                            Array.isArray(c.participants) && c.participants.length > 1;
                                          const kind = c.callType === "video" ? "Video Chat" : "Audio Chat";
                                          return `${isGroup ? "Group" : "Direct"} ${kind}`;
                                        })()}
                                  </td>
                                )}
                                <td className="!text-[0.8125rem] align-middle">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                      <i className="ri-calendar-line text-primary text-[0.85rem]" />
                                      {formatDate(getUnifiedDate(u))}
                                    </span>
                                  </div>
                                </td>
                                <td className="!text-[0.8125rem] align-middle min-w-[220px]">
                                  {isTelephony ? (
                                    <div className="leading-tight">
                                      <div className="font-semibold text-gray-800 dark:text-white break-words">
                                        {getTelephonyName(r as CallRecord)}
                                      </div>
                                      <div className="text-[0.7rem] text-defaulttextcolor/60 font-mono break-all">
                                        {telephonyPhone || "–"}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="leading-tight">
                                      <div className="font-semibold text-gray-800 dark:text-white break-words">
                                        {(r as ChatCall).caller?.name || "–"}
                                      </div>
                                      {(r as ChatCall).caller?.email && (
                                        <div className="text-[0.7rem] text-defaulttextcolor/60 break-all">
                                          {(r as ChatCall).caller.email}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="!text-[0.8125rem] align-middle min-w-[170px] break-words">
                                  {isTelephony ? (
                                    <span className="font-mono text-[0.8rem]">
                                      {(r as CallRecord).fromPhoneNumber || (r as CallRecord).userNumber || "–"}
                                    </span>
                                  ) : (() => {
                                    const ps = (r as ChatCall).participants ?? [];
                                    if (!ps.length) return "–";
                                    return (
                                      <ul className="leading-tight space-y-1">
                                        {ps.map((p, idx) => (
                                          <li key={p?.id || idx}>
                                            <div className="font-medium">{p?.name || "Unknown"}</div>
                                            {p?.email && (
                                              <div className="text-[0.7rem] text-defaulttextcolor/60 break-all">
                                                {p.email}
                                              </div>
                                            )}
                                          </li>
                                        ))}
                                      </ul>
                                    );
                                  })()}
                                </td>
                                <td className="!text-[0.8125rem] align-middle">
                                  <span className="inline-flex items-center gap-1 text-[0.75rem] text-defaulttextcolor/80">
                                    <i
                                      className={
                                        isTelephony
                                          ? "ri-phone-line text-indigo-500"
                                          : (r as ChatCall).callType === "video"
                                            ? "ri-vidicon-line text-emerald-500"
                                            : "ri-mic-line text-sky-500"
                                      }
                                    />
                                    {isTelephony
                                      ? "Phone"
                                      : (r as ChatCall).callType === "video"
                                        ? "Video"
                                        : "Audio"}
                                  </span>
                                </td>
                                <td className="!text-[0.8125rem] align-middle">
                                  <span
                                    className={`inline-flex items-center gap-1 border px-2 py-0.5 rounded-md text-[0.7rem] font-medium ${statusBadgeClass(status)}`}
                                  >
                                    {isLive && (
                                      <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-60" />
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
                                      </span>
                                    )}
                                    {statusToLabel(status)}
                                  </span>
                                </td>
                                <td className="!text-[0.8125rem] align-middle tabular-nums font-medium">
                                  {(r as CallRecord).duration != null
                                    ? `${(r as CallRecord).duration}s`
                                    : (r as ChatCall).duration != null
                                      ? `${(r as ChatCall).duration}s`
                                      : "–"}
                                </td>
                                <td className="!text-[0.8125rem] align-middle">
                                  {recordingUrl ? (
                                    <a
                                      href={recordingUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="ti-btn ti-btn-icon ti-btn-sm ti-btn-success"
                                      title="Play recording"
                                    >
                                      <i className="ri-play-line" />
                                    </a>
                                  ) : (
                                    <span className="text-defaulttextcolor/40 text-sm">—</span>
                                  )}
                                </td>
                                <td className="!text-[0.8125rem] align-middle text-center min-w-[130px]">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      type="button"
                                      className="ti-btn ti-btn-icon ti-btn-sm ti-btn-light"
                                      title="Call details"
                                      aria-controls="call-details-panel"
                                      aria-expanded={
                                        Boolean(
                                          detailsPanelOpen &&
                                            selectedCall &&
                                            getUnifiedId(selectedCall) === id
                                        )
                                      }
                                      onClick={() => openCallDetails(u)}
                                    >
                                      <i className="ri-eye-line" />
                                    </button>
                                    {isTelephony && (
                                      <button
                                        type="button"
                                        className="ti-btn ti-btn-icon ti-btn-sm ti-btn-danger"
                                        disabled={deletingId === id}
                                        title="Delete record"
                                        onClick={() => handleDelete(id, "telephony")}
                                      >
                                        {deletingId === id ? (
                                          <i className="ri-loader-4-line animate-spin" />
                                        ) : (
                                          <i className="ri-delete-bin-line" />
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {totalMerged > 0 && (
                    <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-defaultborder px-4 py-3 dark:border-defaultborder/10">
                      <span className="text-xs text-defaulttextcolor/70 tabular-nums">
                        Showing <span className="font-semibold text-defaulttextcolor">{rangeStart}</span>–
                        <span className="font-semibold text-defaulttextcolor">{rangeEnd}</span> of{" "}
                        <span className="font-semibold text-defaulttextcolor">{totalMerged}</span>
                        {totalPagesMerged > 1 && (
                          <span className="ms-3 text-defaulttextcolor/55">
                            Page {page} / {totalPagesMerged}
                          </span>
                        )}
                      </span>
                      {totalPagesMerged > 1 && (
                        <nav aria-label="Call records pagination" className="shrink-0">
                          <div className="m-0 inline-flex flex-nowrap items-center gap-1 rounded-lg border border-defaultborder/70 bg-white p-1 shadow-sm dark:border-defaultborder/20 dark:bg-black/20">
                            <button
                              type="button"
                              className="inline-flex min-w-[2.25rem] items-center justify-center rounded-md px-2.5 py-1.5 text-xs font-medium text-defaulttextcolor transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-white/80 dark:hover:bg-white/10"
                              disabled={loading || page <= 1}
                              onClick={() => setPage((p) => Math.max(1, p - 1))}
                              aria-label="Previous page"
                            >
                              <i className="ri-arrow-left-s-line align-middle me-0.5" />
                              Prev
                            </button>
                            {pageItems.map((item, idx) =>
                              item === "gap" ? (
                                <span
                                  key={`gap-${idx}`}
                                  className="inline-flex min-w-[1.5rem] items-center justify-center px-1 text-xs text-defaulttextcolor/45"
                                  aria-hidden
                                >
                                  …
                                </span>
                              ) : (
                                <button
                                  key={item}
                                  type="button"
                                  className={`inline-flex min-w-[2rem] items-center justify-center rounded-md px-2.5 py-1.5 text-xs font-semibold tabular-nums transition-colors ${
                                    page === item
                                      ? "bg-primary text-white shadow-sm"
                                      : "text-defaulttextcolor hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/10"
                                  }`}
                                  disabled={loading}
                                  onClick={() => setPage(item)}
                                  aria-label={`Page ${item}`}
                                  aria-current={page === item ? "page" : undefined}
                                >
                                  {item}
                                </button>
                              )
                            )}
                            <button
                              type="button"
                              className="inline-flex min-w-[2.25rem] items-center justify-center rounded-md px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
                              disabled={loading || page >= totalPagesMerged}
                              onClick={() => setPage((p) => Math.min(totalPagesMerged, p + 1))}
                              aria-label="Next page"
                            >
                              Next
                              <i className="ri-arrow-right-s-line align-middle ms-0.5" />
                            </button>
                          </div>
                        </nav>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile: dim + dismiss; desktop uses in-flow width animation instead */}
        <div
          className={`fixed inset-0 z-[95] bg-black/25 backdrop-blur-[1px] transition-opacity duration-300 ease-out motion-reduce:transition-none md:bg-black/20 xl:hidden ${
            detailsPanelOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden={!detailsPanelOpen}
          onClick={closeCallDetails}
        />
        <aside
          id="call-details-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="call-details-title"
          aria-hidden={!detailsPanelOpen}
          className={[
            "flex min-h-0 flex-col overflow-hidden border-defaultborder/80 bg-white dark:bg-bodybg",
            /* Mobile / tablet: fixed drawer — transform slide */
            "max-xl:fixed max-xl:right-0 max-xl:top-[3.75rem] max-xl:z-[100] max-xl:h-[calc(100vh-3.75rem)] max-xl:w-full max-xl:max-w-md max-xl:border-l max-xl:shadow-[-12px_0_40px_rgba(15,23,42,0.12)] dark:max-xl:shadow-[-12px_0_40px_rgba(0,0,0,0.45)]",
            "max-xl:transition-transform max-xl:duration-300 max-xl:ease-[cubic-bezier(0.32,0.72,0,1)] max-xl:motion-reduce:transition-none",
            detailsPanelOpen
              ? "max-xl:translate-x-0"
              : "max-xl:pointer-events-none max-xl:translate-x-full",
            /* Desktop: when closed, remove panel from layout entirely (w-0 still left a gutter in flex). When open, fixed 28rem column. */
            detailsPanelOpen
              ? "xl:relative xl:top-auto xl:z-auto xl:mt-0 xl:flex xl:w-[28rem] xl:max-w-[28rem] xl:min-w-0 xl:shrink-0 xl:self-stretch xl:rounded-xl xl:border xl:border-defaultborder/80 xl:shadow-[-8px_0_28px_rgba(15,23,42,0.07)] dark:xl:shadow-[-8px_0_28px_rgba(0,0,0,0.35)]"
              : "xl:hidden",
          ].join(" ")}
        >
          <div className="box custom-box mb-0 flex h-full max-h-[calc(100vh-3.75rem)] min-h-0 w-full min-w-0 max-w-full flex-1 flex-col border-0 shadow-none max-xl:max-w-md xl:max-h-[calc(100vh-6rem)]">
            <div className="box-header shrink-0 justify-between gap-2 !flex-row">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                  aria-hidden
                >
                  <i className="ri-information-line text-lg leading-none" />
                </span>
                <div className="box-title mb-0 truncate" id="call-details-title">
                  Call Details
                </div>
              </div>
              <button
                type="button"
                className="ti-btn ti-btn-icon ti-btn-sm ti-btn-ghost text-defaulttextcolor/70 hover:text-danger"
                aria-label="Close call details"
                onClick={closeCallDetails}
              >
                <i className="ri-close-line text-lg" aria-hidden />
              </button>
            </div>
            <div className="box-body min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {!selectedCall ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                    <i className="ri-cursor-line text-2xl text-primary" />
                  </div>
                  <p className="text-sm text-defaulttextcolor/60">
                    Select a record to view details
                  </p>
                </div>
              ) : selectedCall.source === "telephony" ? (
                <div className="space-y-4 text-[0.8125rem]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 border px-2 py-0.5 rounded-md text-[0.7rem] font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30">
                      <i className="ri-phone-line text-[0.8rem]" />
                      Telephony
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 border px-2 py-0.5 rounded-md text-[0.7rem] font-medium ${statusBadgeClass(selectedCall.data.status)}`}
                    >
                      {LIVE_CALL_STATUSES.has((selectedCall.data.status || "").toLowerCase()) && (
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-60" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
                        </span>
                      )}
                      {statusToLabel(selectedCall.data.status)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-defaultborder/60 dark:border-white/10 p-3">
                      <p className="text-[0.7rem] uppercase tracking-wide text-defaulttextcolor/60 mb-1">To</p>
                      <p className="font-medium font-mono text-[0.8rem] break-all">
                        {selectedCall.data.toPhoneNumber ||
                          selectedCall.data.recipientPhoneNumber ||
                          selectedCall.data.phone ||
                          "–"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-defaultborder/60 dark:border-white/10 p-3">
                      <p className="text-[0.7rem] uppercase tracking-wide text-defaulttextcolor/60 mb-1">From</p>
                      <p className="font-medium font-mono text-[0.8rem] break-all">
                        {selectedCall.data.fromPhoneNumber || selectedCall.data.userNumber || "–"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-defaulttextcolor/60 mb-1">Business</p>
                    <p className="font-medium">{selectedCall.data.businessName || "–"}</p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-defaulttextcolor/60 mb-1 flex items-center gap-1">
                      <i className="ri-fingerprint-line text-info" />
                      Execution ID
                    </p>
                    <p className="break-all font-mono text-[0.75rem] text-defaulttextcolor/80">
                      {selectedCall.data.executionId || "–"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-defaulttextcolor/60 mb-1.5 flex items-center gap-1">
                      <i className="ri-quill-pen-line text-info" />
                      Transcript
                    </p>
                    <div className="p-3 rounded-lg border border-defaultborder/60 dark:border-white/10 bg-light/50 dark:bg-black/20 max-h-64 overflow-auto whitespace-pre-wrap text-[0.8rem] leading-relaxed">
                      {selectedCall.data.transcript ||
                        selectedCall.data.conversationTranscript ||
                        <span className="text-defaulttextcolor/50 italic">No transcript available</span>}
                    </div>
                  </div>
                  {selectedCall.data.recordingUrl && (
                    <a
                      href={selectedCall.data.recordingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ti-btn ti-btn-success-full !py-1.5 !px-3 !text-[0.8125rem] inline-flex items-center"
                    >
                      <i className="ri-play-line me-1" />
                      Play Recording
                    </a>
                  )}
                </div>
              ) : (
                <div className="space-y-4 text-[0.8125rem]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 border px-2 py-0.5 rounded-md text-[0.7rem] font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30">
                      <i className="ri-chat-voice-line text-[0.8rem]" />
                      In-App
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 border px-2 py-0.5 rounded-md text-[0.7rem] font-medium ${statusBadgeClass((selectedCall.data as ChatCall).status)}`}
                    >
                      {LIVE_CALL_STATUSES.has(((selectedCall.data as ChatCall).status || "").toLowerCase()) && (
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-60" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
                        </span>
                      )}
                      {statusToLabel((selectedCall.data as ChatCall).status)}
                    </span>
                    <span className="inline-flex items-center gap-1 border px-2 py-0.5 rounded-md text-[0.7rem] font-medium bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30">
                      <i
                        className={
                          (selectedCall.data as ChatCall).callType === "video"
                            ? "ri-vidicon-line"
                            : "ri-mic-line"
                        }
                      />
                      {(selectedCall.data as ChatCall).callType === "video" ? "Video" : "Audio"}
                    </span>
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-defaulttextcolor/60 mb-1">Category</p>
                    <p className="font-medium">
                      {(() => {
                        const c = selectedCall.data as ChatCall;
                        const isGroup = Array.isArray(c.participants) && c.participants.length > 1;
                        const kind = c.callType === "video" ? "Video Chat" : "Audio Chat";
                        return `${isGroup ? "Group" : "Direct"} ${kind}`;
                      })()}
                    </p>
                  </div>
                  <div className="rounded-lg border border-defaultborder/60 dark:border-white/10 p-3">
                    <p className="text-[0.7rem] uppercase tracking-wide text-defaulttextcolor/60 mb-1.5">Caller</p>
                    <p className="font-semibold">{(selectedCall.data as ChatCall).caller?.name || "–"}</p>
                    {(selectedCall.data as ChatCall).caller?.email && (
                      <p className="text-[0.75rem] text-defaulttextcolor/60 break-all mt-0.5">
                        {(selectedCall.data as ChatCall).caller.email}
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg border border-defaultborder/60 dark:border-white/10 p-3">
                    <p className="text-[0.7rem] uppercase tracking-wide text-defaulttextcolor/60 mb-1.5">Participants</p>
                    {(() => {
                      const ps = (selectedCall.data as ChatCall).participants ?? [];
                      if (!ps.length) return <p className="text-defaulttextcolor/50">–</p>;
                      return (
                        <ul className="space-y-2">
                          {ps.map((p, idx) => (
                            <li
                              key={p?.id || idx}
                              className="flex items-start gap-2"
                            >
                              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[0.65rem] font-semibold">
                                {(p?.name || "?").charAt(0).toUpperCase()}
                              </span>
                              <div className="min-w-0">
                                <p className="font-medium truncate">{p?.name || "Unknown"}</p>
                                {p?.email && (
                                  <p className="text-[0.7rem] text-defaulttextcolor/60 break-all">{p.email}</p>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      );
                    })()}
                  </div>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-defaulttextcolor/60 mb-1">Duration</p>
                    <p className="font-medium tabular-nums">
                      {(selectedCall.data as ChatCall).duration != null
                        ? `${(selectedCall.data as ChatCall).duration}s`
                        : "–"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(selectedCall.data as ChatCall).recordingUrl && (
                      <a
                        href={(selectedCall.data as ChatCall).recordingUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ti-btn ti-btn-success-full !py-1.5 !px-3 !text-[0.8125rem] inline-flex items-center"
                      >
                        <i className="ri-play-line me-1" />
                        Play Recording
                      </a>
                    )}
                    <Link
                      href={
                        (() => {
                          const conv = (selectedCall.data as ChatCall).conversation;
                          const convId =
                            typeof conv === "string"
                              ? conv
                              : (conv as { id?: string; _id?: string })?.id ||
                                (conv as { id?: string; _id?: string })?._id?.toString?.();
                          return convId
                            ? `/communication/chats?conv=${encodeURIComponent(convId)}`
                            : "/communication/chats";
                        })()
                      }
                      className="ti-btn ti-btn-light !py-1.5 !px-3 !text-[0.8125rem]"
                    >
                      <i className="ri-chat-3-line me-1" />
                      Open in Chats
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </Fragment>
  );
};

export default Calling;
