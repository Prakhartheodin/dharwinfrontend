"use client";

import Seo from "@/shared/layout-components/seo/seo";
import React, { useCallback, useEffect, useState } from "react";
import {
  listAllRecordings,
  type RecordingWithMeeting,
  type RecordingsListResponse,
} from "@/shared/lib/api/meetings";
import { useRouter } from "next/navigation";

const PAGE_SIZES = [10, 25, 50];

export default function RecordingsPage() {
  const router = useRouter();
  const [recordings, setRecordings] = useState<RecordingWithMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchRecordings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: RecordingsListResponse = await listAllRecordings({
        page,
        limit: pageSize,
      });
      setRecordings(data.results || []);
      setTotalResults(data.totalResults ?? 0);
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
  }, [page, pageSize]);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  const formatDate = (iso?: string | null) => {
    if (!iso) return "–";
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "–";
      return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return "–";
    }
  };

  const getFilename = (rec: RecordingWithMeeting) => {
    const parts = rec.filePath?.split("/").pop() || `recording-${rec.meetingId}`;
    return parts.endsWith(".mp4") ? parts : `${parts}.mp4`;
  };

  return (
    <>
      <Seo title="Recordings" />
      <div className="mt-5 grid grid-cols-12 gap-6 sm:mt-6">
        <div className="xl:col-span-12 col-span-12">
          <div className="box custom-box">
            <div className="box-header flex flex-wrap items-center justify-between gap-2">
              <div className="box-title">Meeting Recordings</div>
              <p className="text-[0.8125rem] text-defaulttextcolor/70 mb-0">
                Recordings are saved from LiveKit meetings. Use the Record button in a meeting room to start.
              </p>
            </div>
            <div className="box-body">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <label className="text-[0.8125rem] text-defaulttextcolor/70">Rows:</label>
                  <select
                    className="form-control !w-24"
                    value={pageSize}
                    onChange={(e) => {
                      setPage(1);
                      setPageSize(Number(e.target.value));
                    }}
                  >
                    {PAGE_SIZES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-[0.8125rem] text-defaulttextcolor/70">
                  Total: {totalResults}
                </span>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-sm">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="py-10 text-center text-defaulttextcolor/70">
                  <span className="animate-spin inline-block me-2 w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                  Loading recordings...
                </div>
              ) : recordings.length === 0 ? (
                <div className="py-10 text-center text-defaulttextcolor/70">
                  No recordings yet. Start a meeting and use the Record button to save recordings.
                  <div className="mt-3">
                    <button
                      type="button"
                      className="ti-btn ti-btn-sm ti-btn-primary"
                      onClick={() => router.push("/ats/interviews")}
                    >
                      Go to Interviews
                    </button>
                  </div>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table whitespace-nowrap min-w-full">
                    <thead>
                      <tr>
                        <th>Meeting</th>
                        <th>Started</th>
                        <th>Status</th>
                        <th className="text-end">Play / Save</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recordings.map((rec) => (
                        <tr key={rec.id}>
                          <td>
                            <span className="font-medium text-defaulttextcolor dark:text-white">
                              {rec.meetingTitle || rec.meetingId || "–"}
                            </span>
                          </td>
                          <td>{formatDate(rec.startedAt)}</td>
                          <td>
                            <span
                              className={`badge ${
                                rec.status === "completed"
                                  ? "bg-success/10 text-success"
                                  : "bg-warning/10 text-warning"
                              }`}
                            >
                              {rec.status === "completed" ? "Completed" : "Recording"}
                            </span>
                          </td>
                          <td className="text-end">
                            {rec.status === "completed" && (rec.playbackUrl || rec.playbackError) ? (
                              <div className="flex items-center justify-end gap-2">
                                {rec.playbackUrl ? (
                                  <>
                                    <a
                                      href={rec.playbackUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center justify-center gap-1.5 rounded-md bg-success text-white !py-1.5 !px-3 !text-xs font-medium whitespace-nowrap hover:bg-success/90"
                                    >
                                      <i className="ri-play-line" />
                                      <span>Play</span>
                                    </a>
                                    <a
                                      href={rec.playbackUrl}
                                      download={getFilename(rec)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center justify-center gap-1.5 rounded-md border border-primary text-primary !py-1.5 !px-3 !text-xs font-medium whitespace-nowrap hover:bg-primary/10"
                                    >
                                      <i className="ri-download-line" />
                                      <span>Save</span>
                                    </a>
                                  </>
                                ) : (
                                  <span className="text-xs text-danger">
                                    {rec.playbackError || "Playback unavailable"}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-defaulttextcolor/60 text-sm">–</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-defaultborder dark:border-defaultborder/10">
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
      </div>
    </>
  );
}
