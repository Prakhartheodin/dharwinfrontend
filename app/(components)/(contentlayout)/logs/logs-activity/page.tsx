"use client";

import React, { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Seo from "@/shared/layout-components/seo/seo";
import { useAuth } from "@/shared/contexts/auth-context";
import { useFeaturePermissions } from "@/shared/hooks/use-feature-permissions";
import type { ActivityLog } from "@/shared/lib/types";
import * as activityLogsApi from "@/shared/lib/api/activity-logs";
import { AxiosError } from "axios";
import {
  ACTIVITY_LOG_ACTIONS,
  ACTIVITY_LOG_ENTITY_TYPES,
  getActionDisplay,
  getActivityActionDisplayForRow,
  getCandidateActivityEntitySummary,
  getEntityTypeDisplay,
  getImpersonationEntitySummary,
  getJobActivityEntitySummary,
  getRoleActivityEntitySummary,
  getUserActivityEntitySummary,
} from "@/shared/lib/activity-log-catalog";
import { ActivityLogLocationCell } from "@/shared/components/activity-log-location-cell";
import { getActivityLogDisplayIp } from "@/shared/lib/activity-log-location-display";
import {
  canOpenActivityLogEntity,
  getActivityLogEntityHref,
} from "@/shared/lib/activity-log-entity-routes";

function formatDateTime(isoString: string | undefined): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
}

function toIsoStartOfDay(date: string | null): string | undefined {
  if (!date) return undefined;
  try {
    return new Date(`${date}T00:00:00.000Z`).toISOString();
  } catch {
    return undefined;
  }
}

function toIsoEndOfDay(date: string | null): string | undefined {
  if (!date) return undefined;
  try {
    return new Date(`${date}T23:59:59.999Z`).toISOString();
  } catch {
    return undefined;
  }
}

export default function LogsActivityPage() {
  const {
    user: currentUser,
    permissions,
    permissionsLoaded,
    isPlatformSuperUser,
    isAdministrator,
    isDesignatedSuperadmin,
  } = useAuth();
  const logsActivityFeature = useFeaturePermissions("logs.activity");

  const canReadActivityLogs = useMemo(() => {
    if (isDesignatedSuperadmin) return true;
    if (isPlatformSuperUser) return true;
    if (isAdministrator) return true;
    if (permissions.some((p) => p === "activityLogs.read" || p === "activity.read")) return true;
    return logsActivityFeature.canView;
  }, [
    isDesignatedSuperadmin,
    isPlatformSuperUser,
    isAdministrator,
    permissions,
    logsActivityFeature.canView,
  ]);

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [forbidden, setForbidden] = useState(false);

  const [actorId, setActorId] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const hasActiveFilters =
    actorId.trim() ||
    action.trim() ||
    entityType.trim() ||
    entityId.trim() ||
    startDate ||
    endDate;

  const fetchLogs = async () => {
    setLoading(true);
    setError("");
    setForbidden(false);

    const params: activityLogsApi.ListActivityLogsParams = {
      actor: actorId.trim() || undefined,
      action: action.trim() || undefined,
      entityType: entityType.trim() || undefined,
      entityId: entityId.trim() || undefined,
      startDate: toIsoStartOfDay(startDate) ?? undefined,
      endDate: toIsoEndOfDay(endDate) ?? undefined,
      sortBy: "createdAt:desc",
      page,
      limit,
    };

    try {
      const res = await activityLogsApi.listActivityLogs(params);
      setLogs(res.results ?? []);
      setTotalPages(res.totalPages ?? 1);
      setTotalResults(res.totalResults ?? 0);
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 403) {
        setForbidden(true);
        setError(
          "You do not have permission to view activity logs. Ask an admin to grant logs.activity:view (or equivalent)."
        );
        setLogs([]);
      } else {
        const msg =
          err instanceof AxiosError && err.response?.data?.message
            ? String(err.response.data.message)
            : "Failed to load activity logs.";
        setError(msg);
        setLogs([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!permissionsLoaded || !canReadActivityLogs) {
      return;
    }
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    permissionsLoaded,
    canReadActivityLogs,
    page,
    limit,
    actorId,
    action,
    entityType,
    entityId,
    startDate,
    endDate,
  ]);

  const handleClearFilters = () => {
    setActorId("");
    setAction("");
    setEntityType("");
    setEntityId("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const start = totalResults === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, totalResults);

  const accessLoading = !permissionsLoaded;

  return (
    <Fragment>
      <Seo title="Activity Logs" />
      <div className="flex items-center justify-between flex-wrap gap-4 mb-4 px-4 pt-4">
        <h5 className="box-title mb-0">
          Activity Logs
          <span className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle">
            {totalResults}
          </span>
        </h5>
        <div className="flex flex-wrap gap-2 items-center">
          {isDesignatedSuperadmin && (
            <Link
              href="/logs/logs-activity/platform"
              className="ti-btn ti-btn-soft-primary !py-1 !px-3 !text-[0.75rem]"
            >
              Platform audit console
            </Link>
          )}
          <select
            className="form-control !w-auto !py-1 !px-4 !text-[0.75rem]"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                Show {size}
              </option>
            ))}
          </select>
          {currentUser && (
            <span className="text-[0.75rem] text-defaulttextcolor/70">
              Viewing as: <span className="font-medium">{currentUser.name ?? currentUser.email}</span>
            </span>
          )}
        </div>
      </div>

      <div className="box-body px-4 pb-4">
        {error && (
          <div className="p-4 mb-4 bg-danger/10 border border-danger/30 text-danger rounded-md text-sm">
            {error}
          </div>
        )}

        {accessLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="ti-btn ti-btn-primary ti-btn-loading">Checking access...</div>
          </div>
        ) : !canReadActivityLogs ? (
          <div className="p-4 mb-4 bg-warning/10 border border-warning/30 text-warning rounded-md text-sm">
            You need the <span className="font-semibold">logs.activity:view</span> permission (or Administrator /
            platform access) to view activity logs.
          </div>
        ) : (
          !forbidden && (
            <>
              <div className="mb-4 p-4 rounded-lg border border-defaultborder bg-gray-50/50 dark:bg-gray-800/30 flex flex-wrap items-end gap-3">
                <div className="flex items-center gap-2 text-defaulttextcolor/80">
                  <i className="ri-filter-3-line text-[1.25rem]"></i>
                  <span className="text-[0.8125rem] font-medium">Filter logs</span>
                </div>
                <div className="min-w-[10rem]">
                  <label htmlFor="logs-actor" className="form-label !text-[0.75rem] mb-1">
                    Actor user ID
                  </label>
                  <input
                    id="logs-actor"
                    type="text"
                    className="form-control !py-1.5 !text-[0.8125rem]"
                    placeholder="Actor id..."
                    value={actorId}
                    onChange={(e) => {
                      setActorId(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <div className="min-w-[10rem]">
                  <label htmlFor="logs-action" className="form-label !text-[0.75rem] mb-1">
                    Action
                  </label>
                  <select
                    id="logs-action"
                    className="form-control !py-1.5 !text-[0.8125rem]"
                    value={action}
                    onChange={(e) => {
                      setAction(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Any action</option>
                    {ACTIVITY_LOG_ACTIONS.map((actionKey) => {
                      const display = getActionDisplay(actionKey);
                      return (
                        <option key={actionKey} value={actionKey} title={display.description}>
                          {display.title} ({actionKey})
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="min-w-[10rem]">
                  <label htmlFor="logs-entity-type" className="form-label !text-[0.75rem] mb-1">
                    Entity type
                  </label>
                  <select
                    id="logs-entity-type"
                    className="form-control !py-1.5 !text-[0.8125rem]"
                    value={entityType}
                    onChange={(e) => {
                      setEntityType(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Any entity</option>
                    {ACTIVITY_LOG_ENTITY_TYPES.map((typeKey) => {
                      const display = getEntityTypeDisplay(typeKey);
                      return (
                        <option key={typeKey} value={typeKey} title={display.description}>
                          {display.title} ({typeKey})
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="min-w-[10rem]">
                  <label htmlFor="logs-entity-id" className="form-label !text-[0.75rem] mb-1">
                    Entity ID
                  </label>
                  <input
                    id="logs-entity-id"
                    type="text"
                    className="form-control !py-1.5 !text-[0.8125rem]"
                    placeholder="Entity id..."
                    value={entityId}
                    onChange={(e) => {
                      setEntityId(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <div className="min-w-[10rem]">
                  <label htmlFor="logs-start-date" className="form-label !text-[0.75rem] mb-1">
                    Start date
                  </label>
                  <input
                    id="logs-start-date"
                    type="date"
                    className="form-control !py-1.5 !text-[0.8125rem]"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <div className="min-w-[10rem]">
                  <label htmlFor="logs-end-date" className="form-label !text-[0.75rem] mb-1">
                    End date
                  </label>
                  <input
                    id="logs-end-date"
                    type="date"
                    className="form-control !py-1.5 !text-[0.8125rem]"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="ti-btn ti-btn-light !py-1.5 !px-3 !text-[0.8125rem]"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              <div className="table-responsive overflow-x-auto">
                <table className="table min-w-full table-bordered border-defaultborder">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <th className="px-4 py-2.5 text-start font-semibold">Timestamp</th>
                      <th className="px-4 py-2.5 text-start font-semibold">Actor</th>
                      <th className="px-4 py-2.5 text-start font-semibold">Action</th>
                      <th className="px-4 py-2.5 text-start font-semibold">Entity</th>
                      <th
                        className="px-4 py-2.5 text-start font-semibold"
                        title="Device place (GPS) when allowed; IP-based location is approximate."
                      >
                        Location
                      </th>
                      <th className="px-4 py-2.5 text-start font-semibold">IP</th>
                      <th className="px-4 py-2.5 text-start font-semibold">User Agent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-defaulttextcolor/70">
                          Loading activity logs...
                        </td>
                      </tr>
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-defaulttextcolor/70">
                          {hasActiveFilters ? "No logs match your filters." : "No activity logs found yet."}
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => {
                        const actionDisp = getActivityActionDisplayForRow(log);
                        const entityDisp = getEntityTypeDisplay(log.entityType);
                        const entityRich =
                          getCandidateActivityEntitySummary(log) ??
                          getJobActivityEntitySummary(log) ??
                          getRoleActivityEntitySummary(log) ??
                          getUserActivityEntitySummary(log) ??
                          getImpersonationEntitySummary(log);
                        const entityHref = getActivityLogEntityHref(log.entityType, log.entityId);
                        const canOpenEntity = canOpenActivityLogEntity(
                          log.entityType,
                          log.entityId,
                          permissions,
                          !!isAdministrator,
                          !!isPlatformSuperUser
                        );
                        return (
                        <tr key={log.id} className="border-b border-defaultborder">
                          <td className="px-4 py-2.5 align-middle text-[0.8125rem]">
                            {formatDateTime(log.createdAt)}
                          </td>
                          <td className="px-4 py-2.5 align-middle text-[0.8125rem]">
                            <div className="flex flex-col">
                              <span className="font-medium">{log.actor?.name || "—"}</span>
                              <span className="text-[0.7rem] text-defaulttextcolor/70">{log.actor?.id ?? "—"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 align-middle text-[0.8125rem]">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium">{actionDisp.title}</span>
                              <span className="font-mono text-[0.7rem] text-defaulttextcolor/60">{log.action}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 align-middle text-[0.8125rem]">
                            <div className="flex flex-col gap-0.5">
                              {entityRich ? (
                                <>
                                  <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                                    <span className="text-[0.65rem] uppercase tracking-wide text-defaulttextcolor/50">
                                      {entityDisp.title}
                                    </span>
                                    <span className="font-semibold text-defaulttextcolor text-[0.8125rem]">
                                      {entityRich.headline}
                                    </span>
                                  </div>
                                  {entityRich.detailLines.map((line, i) => (
                                    <span key={i} className="text-[0.7rem] text-defaulttextcolor/75">
                                      {line}
                                    </span>
                                  ))}
                                </>
                              ) : (
                                <span>{log.entityType ?? "—"}</span>
                              )}
                              {entityHref && canOpenEntity ? (
                                <Link
                                  href={entityHref}
                                  className={
                                    entityRich
                                      ? "text-[0.65rem] text-primary font-mono break-all hover:underline"
                                      : "text-[0.7rem] text-primary break-all hover:underline"
                                  }
                                  title="Open linked entity"
                                >
                                  {log.entityId ?? "—"}
                                </Link>
                              ) : (
                                <span
                                  className={
                                    entityRich
                                      ? "text-[0.65rem] text-defaulttextcolor/45 font-mono break-all"
                                      : "text-[0.7rem] text-defaulttextcolor/70 break-all"
                                  }
                                  title={entityRich ? "Database id (reference)" : undefined}
                                >
                                  {log.entityId ?? "—"}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 align-middle text-[0.8125rem]">
                            <ActivityLogLocationCell log={log} />
                          </td>
                          <td className="px-4 py-2.5 align-middle text-[0.8125rem] font-mono text-[0.75rem]">
                            {getActivityLogDisplayIp(log)}
                          </td>
                          <td className="px-4 py-2.5 align-middle text-[0.75rem] text-defaulttextcolor/80 break-all">
                            {log.userAgent ?? "—"}
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {!loading && (logs.length > 0 || hasActiveFilters) && (
                <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-defaultborder">
                  <p className="text-[0.8125rem] text-defaulttextcolor/70 mb-0">
                    Showing {start} to {end} of {totalResults} entries
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="ti-btn ti-btn-sm ti-btn-soft-primary"
                    >
                      Prev
                    </button>
                    <span className="px-2 py-1 text-[0.8125rem]">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="ti-btn ti-btn-sm ti-btn-soft-primary"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )
        )}
      </div>
    </Fragment>
  );
}
