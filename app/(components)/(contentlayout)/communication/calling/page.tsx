"use client";

import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import React, { Fragment, useCallback, useEffect, useState } from "react";
import {
  deleteBolnaCallRecord,
  getBolnaCallRecords,
  syncBolnaCallRecords,
  type CallRecord,
} from "@/shared/lib/api/bolna";

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
];

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
    unknown: "Unknown",
  };
  return map[s] || s;
}

function statusBadgeClass(s?: string): string {
  const x = (s || "").toLowerCase();
  if (x === "completed") return "bg-success/10 text-success";
  if (x === "failed" || x === "error") return "bg-danger/10 text-danger";
  if (x === "call_disconnected" || x === "call-disconnected") return "bg-warning/10 text-warning";
  if (x === "busy") return "bg-warning/10 text-warning";
  if (x === "no_answer") return "bg-warning/10 text-warning";
  if (x === "in_progress" || x === "initiated") return "bg-info/10 text-info";
  return "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/70";
}

const Calling = () => {
  const [records, setRecords] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchSubmitted, setSearchSubmitted] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<CallRecord | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBolnaCallRecords({
        page,
        limit: pageSize,
        search: searchSubmitted || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        sortBy: "createdAt",
        order: "desc",
      });
      setRecords(data.records || []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (e) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setError(msg || (e instanceof Error ? e.message : "Failed to load call records"));
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchSubmitted, statusFilter]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

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

  const handleDelete = async (id: string) => {
    const ok = window.confirm("Delete this call record?");
    if (!ok) return;
    setDeletingId(id);
    try {
      await deleteBolnaCallRecord(id);
      if (selectedRecord?._id === id) setSelectedRecord(null);
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
      <Pageheader currentpage="Calling" activepage="Communication" mainpage="Calling" />

      <div className="grid grid-cols-12 gap-6">
        <div className="xl:col-span-8 col-span-12">
          <div className="box custom-box">
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
                  Sync Missing Data
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
              <div className="grid grid-cols-12 gap-3 mb-4">
                <div className="col-span-12 md:col-span-5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search by phone/business"
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
                  Total: {total}
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-sm">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="py-10 text-center text-defaulttextcolor/70">Loading call records...</div>
              ) : records.length === 0 ? (
                <div className="py-10 text-center text-defaulttextcolor/70">No call records found</div>
              ) : (
                <div className="table-responsive">
                  <table className="table whitespace-nowrap min-w-full">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>To</th>
                        <th>From</th>
                        <th>Business</th>
                        <th>Status</th>
                        <th>Duration</th>
                        <th>Recording</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r) => {
                        const id = r._id || r.id || "";
                        return (
                          <tr key={id}>
                            <td>{formatDate(r.createdAt)}</td>
                            <td>{r.toPhoneNumber || r.recipientPhoneNumber || r.phone || "–"}</td>
                            <td>{r.fromPhoneNumber || r.userNumber || "–"}</td>
                            <td>{r.businessName || "–"}</td>
                            <td>
                              <span className={`badge ${statusBadgeClass(r.status)}`}>
                                {statusToLabel(r.status)}
                              </span>
                            </td>
                            <td>{r.duration != null ? `${r.duration}s` : "–"}</td>
                            <td>
                              {r.recordingUrl ? (
                                <a
                                  href={r.recordingUrl}
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
                            <td>
                              <div className="flex items-center gap-2 whitespace-nowrap">
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-sm ti-btn-outline-primary !py-1 !px-2 !w-auto !min-w-fit whitespace-nowrap overflow-visible"
                                  onClick={() => setSelectedRecord(r)}
                                >
                                  Details
                                </button>
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-sm ti-btn-danger !py-1 !px-2 !w-auto !min-w-fit whitespace-nowrap"
                                  disabled={deletingId === id}
                                  onClick={() => handleDelete(id)}
                                >
                                  {deletingId === id ? (
                                    <i className="ri-loader-4-line animate-spin" />
                                  ) : (
                                    <i className="ri-delete-bin-line" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <span className="text-[0.8125rem] text-defaulttextcolor/70">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="ti-btn ti-btn-sm ti-btn-outline-primary"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      className="ti-btn ti-btn-sm ti-btn-outline-primary"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 col-span-12">
          <div className="box custom-box">
            <div className="box-header">
              <div className="box-title">Call Details</div>
            </div>
            <div className="box-body">
              {!selectedRecord ? (
                <div className="text-center py-8 text-defaulttextcolor/60">
                  Select a record to view details
                </div>
              ) : (
                <div className="space-y-3 text-[0.8125rem]">
                  <div>
                    <p className="text-defaulttextcolor/60 mb-1">Execution ID</p>
                    <p className="break-all">{selectedRecord.executionId || "–"}</p>
                  </div>
                  <div>
                    <p className="text-defaulttextcolor/60 mb-1">Status</p>
                    <p>{statusToLabel(selectedRecord.status)}</p>
                  </div>
                  <div>
                    <p className="text-defaulttextcolor/60 mb-1">To</p>
                    <p>{selectedRecord.toPhoneNumber || selectedRecord.recipientPhoneNumber || selectedRecord.phone || "–"}</p>
                  </div>
                  <div>
                    <p className="text-defaulttextcolor/60 mb-1">From</p>
                    <p>{selectedRecord.fromPhoneNumber || selectedRecord.userNumber || "–"}</p>
                  </div>
                  <div>
                    <p className="text-defaulttextcolor/60 mb-1">Business</p>
                    <p>{selectedRecord.businessName || "–"}</p>
                  </div>
                  <div>
                    <p className="text-defaulttextcolor/60 mb-1">Transcript</p>
                    <div className="p-3 rounded-md bg-light dark:bg-black/20 max-h-64 overflow-auto whitespace-pre-wrap">
                      {selectedRecord.transcript || selectedRecord.conversationTranscript || "No transcript available"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default Calling;
