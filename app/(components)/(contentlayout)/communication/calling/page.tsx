"use client";

import Seo from "@/shared/layout-components/seo/seo";
import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  deleteBolnaCallRecord,
  getBolnaCallRecords,
  syncBolnaCallRecords,
  type CallRecord,
} from "@/shared/lib/api/bolna";
import { listCalls as listChatCalls, type ChatCall } from "@/shared/lib/api/chat";
import { useAuth } from "@/shared/contexts/auth-context";

type SourceFilter = "all" | "telephony" | "in_app";
type PurposeFilter = "all" | "job_recruiter" | "student_candidate";

type UnifiedCall =
  | { source: "telephony"; data: CallRecord }
  | { source: "in_app"; data: ChatCall };

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

function statusBadgeClass(s?: string): string {
  const x = (s || "").toLowerCase();
  if (x === "completed") return "bg-success/10 text-success";
  if (x === "failed" || x === "error") return "bg-danger/10 text-danger";
  if (x === "call_disconnected" || x === "call-disconnected" || x === "missed" || x === "declined")
    return "bg-warning/10 text-warning";
  if (x === "busy" || x === "no_answer") return "bg-warning/10 text-warning";
  if (x === "in_progress" || x === "initiated" || x === "ongoing" || x === "ringing")
    return "bg-info/10 text-info";
  return "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/70";
}

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
  const [telephonyRecords, setTelephonyRecords] = useState<CallRecord[]>([]);
  const [chatCalls, setChatCalls] = useState<ChatCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchSubmitted, setSearchSubmitted] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [telephonyTotal, setTelephonyTotal] = useState(0);
  const [telephonyPages, setTelephonyPages] = useState(0);
  const [chatTotal, setChatTotal] = useState(0);
  const [chatPages, setChatPages] = useState(0);
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

  const fetchTelephony = useCallback(async () => {
    const data = await getBolnaCallRecords({
      page,
      limit: pageSize,
      search: searchSubmitted || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      sortBy: "createdAt",
      order: "desc",
    });
    return { records: data.records || [], total: data.total ?? 0, totalPages: data.totalPages ?? 1 };
  }, [page, pageSize, searchSubmitted, statusFilter]);

  const fetchChatCalls = useCallback(async () => {
    const data = await listChatCalls({ page: 1, limit: 500 });
    return {
      results: data.results || [],
      total: (data.results || []).length,
      totalPages: data.totalPages ?? 1,
    };
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchTelephonyNeeded = sourceFilter === "all" || sourceFilter === "telephony";
      const fetchChatNeeded = sourceFilter === "all" || sourceFilter === "in_app";

      const [telephonyRes, chatRes] = await Promise.all([
        fetchTelephonyNeeded ? fetchTelephony() : Promise.resolve(null),
        fetchChatNeeded ? fetchChatCalls() : Promise.resolve(null),
      ]);

      if (telephonyRes) {
        setTelephonyRecords(telephonyRes.records);
        setTelephonyTotal(telephonyRes.total);
        setTelephonyPages(telephonyRes.totalPages);
      } else {
        setTelephonyRecords([]);
        setTelephonyTotal(0);
        setTelephonyPages(0);
      }

      if (chatRes) {
        setChatCalls(chatRes.results);
        setChatTotal(chatRes.total);
        setChatPages(chatRes.totalPages);
      } else {
        setChatCalls([]);
        setChatTotal(0);
        setChatPages(0);
      }
    } catch (e) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setError(msg || (e instanceof Error ? e.message : "Failed to load call records"));
      setTelephonyRecords([]);
      setChatCalls([]);
    } finally {
      setLoading(false);
    }
  }, [sourceFilter, fetchTelephony, fetchChatCalls]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const mergedCalls = useMemo((): UnifiedCall[] => {
    const list: UnifiedCall[] = [];
    if (sourceFilter === "telephony" || sourceFilter === "all") {
      telephonyRecords.forEach((r) => list.push({ source: "telephony", data: r }));
    }
    if (sourceFilter === "in_app" || sourceFilter === "all") {
      chatCalls.forEach((c) => list.push({ source: "in_app", data: c }));
    }
    let filtered = list;
    if (statusFilter !== "all") {
      filtered = filtered.filter((u) => {
        const s = (getUnifiedStatus(u) || "").toLowerCase();
        return s === statusFilter.toLowerCase().replace(/-/g, "_");
      });
    }
    if (isAdministrator && purposeFilter !== "all" && (sourceFilter === "telephony" || sourceFilter === "all")) {
      filtered = filtered.filter((u) => {
        if (u.source === "in_app") return true;
        const r = u.data as CallRecord;
        const cat = purposeToCategory(r.purpose, r.displayCategory);
        return categoryMatchesPurposeFilter(cat, purposeFilter);
      });
    }
    filtered.sort((a, b) => {
      const da = new Date(getUnifiedDate(a) || 0).getTime();
      const db = new Date(getUnifiedDate(b) || 0).getTime();
      return db - da;
    });
    return filtered;
  }, [sourceFilter, telephonyRecords, chatCalls, statusFilter, isAdministrator, purposeFilter]);

  const paginatedCalls = useMemo(() => {
    const start = (page - 1) * pageSize;
    return mergedCalls.slice(start, start + pageSize);
  }, [mergedCalls, page, pageSize]);

  const totalMerged = mergedCalls.length;
  const totalPagesMerged = Math.ceil(totalMerged / pageSize) || 1;
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
      */}
      <div className="mt-5 flex w-full min-w-0 flex-col gap-6 sm:mt-6 xl:flex-row xl:items-stretch xl:gap-6">
        <div className="w-full min-w-0 max-w-full flex-1 basis-full xl:min-w-0">
          <div className="box custom-box w-full max-w-full min-w-0">
            <div className="box-header justify-between flex-wrap gap-3">
              <div className="box-title">Call Records</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="ti-btn ti-btn-primary !py-1.5 !px-3 !text-[0.8125rem]"
                  disabled={syncing}
                  onClick={handleSync}
                >
                  <i className={`${syncing ? "ri-loader-4-line animate-spin" : "ri-refresh-line"} me-1`} />
                  Sync Telephony
                </button>
                <button
                  type="button"
                  className="ti-btn ti-btn-outline-primary !py-1.5 !px-3 !text-[0.8125rem]"
                  onClick={fetchRecords}
                >
                  <i className="ri-restart-line me-1" />
                  Refresh
                </button>
              </div>
            </div>

            <div className="box-body">
              <div className="flex flex-wrap gap-2 mb-4">
                {SOURCE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    className={`ti-btn !py-1.5 !px-3 !text-[0.8125rem] ${
                      sourceFilter === o.value
                        ? "ti-btn-primary"
                        : "ti-btn-outline-primary"
                    }`}
                    onClick={() => {
                      setSourceFilter(o.value);
                      setPage(1);
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-12 gap-3 mb-4">
                <div className="col-span-12 md:col-span-5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search (phone/business – telephony only)"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setPage(1);
                          setSearchSubmitted(search);
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="ti-btn ti-btn-outline-primary"
                      onClick={() => {
                        setPage(1);
                        setSearchSubmitted(search);
                      }}
                    >
                      <i className="ri-search-line" />
                    </button>
                  </div>
                </div>
                <div className="col-span-6 md:col-span-3">
                  <select
                    className="form-control"
                    value={statusFilter}
                    onChange={(e) => {
                      setPage(1);
                      setStatusFilter(e.target.value);
                    }}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                {isAdministrator && (sourceFilter === "telephony" || sourceFilter === "all") && (
                  <div className="col-span-6 md:col-span-3">
                    <select
                      className="form-control"
                      value={purposeFilter}
                      onChange={(e) => {
                        setPage(1);
                        setPurposeFilter(e.target.value as PurposeFilter);
                      }}
                    >
                      {PURPOSE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="col-span-6 md:col-span-2">
                  <select
                    className="form-control"
                    value={pageSize}
                    onChange={(e) => {
                      setPage(1);
                      setPageSize(Number(e.target.value));
                    }}
                  >
                    {PAGE_SIZES.map((n) => (
                      <option key={n} value={n}>
                        {n} rows
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-12 md:col-span-2 text-end text-[0.8125rem] text-defaulttextcolor/70 pt-2">
                  Total: {totalMerged}
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-sm">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="py-10 text-center text-defaulttextcolor/70">Loading call records...</div>
              ) : paginatedCalls.length === 0 ? (
                <div className="py-10 text-center text-defaulttextcolor/70">No call records found</div>
              ) : (
                <div className="table-responsive w-full min-w-0">
                  {/*
                    w-full: stretch the table to the card width when viewport > min-width; without it,
                    the table stays ~1180px and leaves empty space on the right.
                  */}
                  <table className="table w-full min-w-[1180px] align-middle">
                    <thead>
                      <tr>
                        <th className="text-nowrap">Source</th>
                        {(sourceFilter === "telephony" || sourceFilter === "all") && (
                          <th className="text-nowrap">Category</th>
                        )}
                        <th className="text-nowrap">Date</th>
                        <th className="min-w-[220px]">To / Caller</th>
                        <th className="min-w-[170px]">From / Participants</th>
                        <th className="text-nowrap">Type</th>
                        <th className="text-nowrap">Status</th>
                        <th className="text-nowrap">Duration</th>
                        <th className="text-nowrap">Recording</th>
                        <th className="text-nowrap min-w-[130px]">Actions</th>
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
                        return (
                          <tr key={`${u.source}-${id}`}>
                            <td className="text-nowrap">
                              <span
                                className={`badge ${
                                  isTelephony ? "bg-primary/10 text-primary" : "bg-info/10 text-info"
                                }`}
                              >
                                {isTelephony ? "Telephony" : "In-App"}
                              </span>
                            </td>
                            {(sourceFilter === "telephony" || sourceFilter === "all") && (
                              <td className="text-nowrap">
                                {isTelephony ? telephonyCategory : "–"}
                              </td>
                            )}
                            <td className="text-nowrap">{formatDate(getUnifiedDate(u))}</td>
                            <td className="min-w-[220px]">
                              {isTelephony ? (
                                <div className="leading-tight">
                                  <div className="font-medium break-words">{getTelephonyName(r as CallRecord)}</div>
                                  <div className="text-[0.75rem] text-defaulttextcolor/60 break-all">
                                    {telephonyPhone || "–"}
                                  </div>
                                </div>
                              ) : (
                                (r as ChatCall).caller?.name || "–"
                              )}
                            </td>
                            <td className="min-w-[170px] break-words">
                              {isTelephony
                                ? (r as CallRecord).fromPhoneNumber || (r as CallRecord).userNumber || "–"
                                : (r as ChatCall).participants
                                    ?.map((p) => p?.name)
                                    .filter(Boolean)
                                    .join(", ") || "–"}
                            </td>
                            <td className="text-nowrap">
                              {isTelephony
                                ? "Phone"
                                : (r as ChatCall).callType === "video"
                                  ? "Video"
                                  : "Audio"}
                            </td>
                            <td className="text-nowrap">
                              <span className={`badge ${statusBadgeClass(getUnifiedStatus(u))}`}>
                                {statusToLabel(getUnifiedStatus(u))}
                              </span>
                            </td>
                            <td className="text-nowrap">
                              {(r as CallRecord).duration != null
                                ? `${(r as CallRecord).duration}s`
                                : (r as ChatCall).duration != null
                                  ? `${(r as ChatCall).duration}s`
                                  : "–"}
                            </td>
                            <td className="text-nowrap">
                              {((isTelephony ? (r as CallRecord).recordingUrl : (r as ChatCall).recordingUrl) ||
                                null) ? (
                                <a
                                  href={
                                    (isTelephony
                                      ? (r as CallRecord).recordingUrl
                                      : (r as ChatCall).recordingUrl) || "#"
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ti-btn ti-btn-sm ti-btn-success !py-1 !px-2 !w-auto !min-w-fit whitespace-nowrap inline-flex items-center"
                                >
                                  <i className="ri-play-line me-1" />
                                  Play
                                </a>
                              ) : (
                                "–"
                              )}
                            </td>
                            <td className="text-nowrap min-w-[130px]">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-sm ti-btn-outline-primary !py-1 !px-2 !w-auto !min-w-fit whitespace-nowrap overflow-visible"
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
                                  Details
                                </button>
                                {isTelephony && (
                                  <button
                                    type="button"
                                    className="ti-btn ti-btn-sm ti-btn-danger !py-1 !px-2 !w-auto !min-w-fit whitespace-nowrap"
                                    disabled={deletingId === id}
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
              )}

              {totalMerged > 0 && (
                <nav
                  className="mt-6 rounded-xl border border-defaultborder/60 bg-gradient-to-b from-slate-50/90 to-white dark:from-white/[0.04] dark:to-black/20 px-4 py-4 sm:px-5"
                  aria-label="Call records pagination"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                      <p className="flex items-start gap-2.5 text-sm text-defaulttextcolor/80">
                        <span
                          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                          aria-hidden
                        >
                          <i className="ri-stack-line text-lg leading-none" />
                        </span>
                        <span className="leading-snug pt-0.5">
                          <span className="font-medium text-defaulttextcolor">Showing </span>
                          <span className="tabular-nums font-semibold text-defaulttextcolor">{rangeStart}</span>
                          <span className="text-defaulttextcolor/60">–</span>
                          <span className="tabular-nums font-semibold text-defaulttextcolor">{rangeEnd}</span>
                          <span className="font-medium text-defaulttextcolor"> of </span>
                          <span className="tabular-nums font-semibold text-defaulttextcolor">{totalMerged}</span>
                          <span className="font-medium text-defaulttextcolor"> calls</span>
                        </span>
                      </p>
                      {totalPagesMerged > 1 && (
                        <p className="text-xs text-defaulttextcolor/55 sm:border-s sm:border-defaultborder/50 sm:ps-4 tabular-nums">
                          Page {page} / {totalPagesMerged}
                        </p>
                      )}
                    </div>

                    {totalPagesMerged > 1 && (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                        <div
                          className="inline-flex w-full max-w-full overflow-hidden rounded-xl border border-defaultborder/70 bg-white shadow-sm dark:border-white/10 dark:bg-black/30 sm:w-auto"
                          role="group"
                          aria-label="Page navigation"
                        >
                          <button
                            type="button"
                            className="min-h-[2.5rem] flex-1 sm:flex-none px-3 text-sm font-medium text-defaulttextcolor transition-colors hover:bg-defaultborder/15 focus:z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-white/5"
                            disabled={loading || page <= 1}
                            onClick={() => setPage(1)}
                            aria-label="First page"
                          >
                            <span className="hidden sm:inline">First</span>
                            <span className="sm:hidden">
                              <i className="ri-skip-back-mini-line text-lg" aria-hidden />
                            </span>
                          </button>
                          <button
                            type="button"
                            className="min-h-[2.5rem] flex-1 sm:flex-none border-s border-defaultborder/60 px-3 text-sm font-medium text-defaulttextcolor transition-colors hover:bg-defaultborder/15 focus:z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/5"
                            disabled={loading || page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            aria-label="Previous page"
                          >
                            <span className="inline-flex items-center justify-center gap-1">
                              <i className="ri-arrow-left-s-line text-base" aria-hidden />
                              <span className="hidden sm:inline">Prev</span>
                            </span>
                          </button>
                          <div className="flex min-h-[2.5rem] max-w-[11rem] flex-shrink-0 items-stretch overflow-x-auto border-s border-defaultborder/60 sm:max-w-none dark:border-white/10">
                            {pageItems.map((item, idx) =>
                              item === "gap" ? (
                                <span
                                  key={`gap-${idx}`}
                                  className="flex min-w-[2.25rem] items-center justify-center border-e border-defaultborder/60 px-1 text-xs text-defaulttextcolor/45 dark:border-white/10"
                                  aria-hidden
                                >
                                  …
                                </span>
                              ) : (
                                <button
                                  key={item}
                                  type="button"
                                  className={`min-w-[2.5rem] border-e border-defaultborder/60 px-2.5 text-sm font-semibold tabular-nums transition-colors last:border-e-0 focus:z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset dark:border-white/10 ${
                                    page === item
                                      ? "bg-primary text-white hover:bg-primary"
                                      : "text-defaulttextcolor hover:bg-defaultborder/15 dark:hover:bg-white/5"
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
                          </div>
                          <button
                            type="button"
                            className="min-h-[2.5rem] flex-1 sm:flex-none border-s border-defaultborder/60 px-3 text-sm font-medium text-defaulttextcolor transition-colors hover:bg-defaultborder/15 focus:z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/5"
                            disabled={loading || page >= totalPagesMerged}
                            onClick={() => setPage((p) => Math.min(totalPagesMerged, p + 1))}
                            aria-label="Next page"
                          >
                            <span className="inline-flex items-center justify-center gap-1">
                              <span className="hidden sm:inline">Next</span>
                              <i className="ri-arrow-right-s-line text-base" aria-hidden />
                            </span>
                          </button>
                          <button
                            type="button"
                            className="min-h-[2.5rem] flex-1 sm:flex-none border-s border-defaultborder/60 px-3 text-sm font-medium text-defaulttextcolor transition-colors hover:bg-defaultborder/15 focus:z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/5"
                            disabled={loading || page >= totalPagesMerged}
                            onClick={() => setPage(totalPagesMerged)}
                            aria-label="Last page"
                          >
                            <span className="hidden sm:inline">Last</span>
                            <span className="sm:hidden">
                              <i className="ri-skip-forward-mini-line text-lg" aria-hidden />
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </nav>
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
              <div className="box-title mb-0" id="call-details-title">
                Call Details
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
                <div className="text-center py-8 text-defaulttextcolor/60">
                  Select a record to view details
                </div>
              ) : selectedCall.source === "telephony" ? (
                <div className="space-y-3 text-[0.8125rem]">
                  <div>
                    <span className="badge bg-primary/10 text-primary me-2">Telephony</span>
                  </div>
                  <div>
                    <p className="text-defaulttextcolor/60 mb-1">Execution ID</p>
                    <p className="break-all">{selectedCall.data.executionId || "–"}</p>
                  </div>
                  <div>
                    <p className="text-defaulttextcolor/60 mb-1">Status</p>
                    <p>{statusToLabel(selectedCall.data.status)}</p>
                  </div>
                  <div>
                    <p className="text-defaulttextcolor/60 mb-1">To</p>
                    <p>
                      {selectedCall.data.toPhoneNumber ||
                        selectedCall.data.recipientPhoneNumber ||
                        selectedCall.data.phone ||
                        "–"}
                    </p>
                  </div>
                  <div>
                    <p className="text-defaulttextcolor/60 mb-1">From</p>
                    <p>{selectedCall.data.fromPhoneNumber || selectedCall.data.userNumber || "–"}</p>
                  </div>
                  <div>
                    <p className="text-defaulttextcolor/60 mb-1">Business</p>
                    <p>{selectedCall.data.businessName || "–"}</p>
                  </div>
                  <div>
                    <p className="text-defaulttextcolor/60 mb-1">Transcript</p>
                    <div className="p-3 rounded-md bg-light dark:bg-black/20 max-h-64 overflow-auto whitespace-pre-wrap">
                      {selectedCall.data.transcript ||
                        selectedCall.data.conversationTranscript ||
                        "No transcript available"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-[0.8125rem]">
                  <div>
                    <span className="badge bg-info/10 text-info me-2">In-App</span>
                  </div>
                  <div>
                    <p className="text-defaulttextcolor/60 mb-1">Call Type</p>
                    <p>{(selectedCall.data as ChatCall).callType === "video" ? "Video" : "Audio"}</p>
                  </div>
                  <div>
                    <p className="text-defaulttextcolor/60 mb-1">Status</p>
                    <p>{statusToLabel((selectedCall.data as ChatCall).status)}</p>
                  </div>
                  <div>
                    <p className="text-defaulttextcolor/60 mb-1">Caller</p>
                    <p>{(selectedCall.data as ChatCall).caller?.name || "–"}</p>
                  </div>
                  <div>
                    <p className="text-defaulttextcolor/60 mb-1">Participants</p>
                    <p>
                      {(selectedCall.data as ChatCall).participants
                        ?.map((p) => p?.name)
                        .filter(Boolean)
                        .join(", ") || "–"}
                    </p>
                  </div>
                  <div>
                    <p className="text-defaulttextcolor/60 mb-1">Duration</p>
                    <p>
                      {(selectedCall.data as ChatCall).duration != null
                        ? `${(selectedCall.data as ChatCall).duration}s`
                        : "–"}
                    </p>
                  </div>
                  {(selectedCall.data as ChatCall).recordingUrl && (
                    <div>
                      <a
                        href={(selectedCall.data as ChatCall).recordingUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ti-btn ti-btn-sm ti-btn-success !py-1 !px-2"
                      >
                        <i className="ri-play-line me-1" />
                        Play Recording
                      </a>
                    </div>
                  )}
                  <div>
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
                      className="ti-btn ti-btn-sm ti-btn-outline-primary !py-1 !px-2"
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
