"use client";

import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Seo from "@/shared/layout-components/seo/seo";
import { useAuth } from "@/shared/contexts/auth-context";
import { useFeaturePermissions } from "@/shared/hooks/use-feature-permissions";
import type { ActivityLog } from "@/shared/lib/types";
import * as activityLogsApi from "@/shared/lib/api/activity-logs";
import { AxiosError } from "axios";
import {
  getActionDisplay,
  getActivityActionDisplayForRow,
  getCandidateActivityEntitySummary,
  getDepartmentActivityEntitySummary,
  getEmployeeOrgActivityEntitySummary,
  getEntityTypeDisplay,
  getGroupedActionOptions,
  getGroupedEntityTypeOptions,
  getImpersonationEntitySummary,
  getJobActivityEntitySummary,
  getOrgMutateDeniedEntitySummary,
  getOrgStructureActivityEntitySummary,
  getOrgUnitActivityEntitySummary,
  getRoleActivityEntitySummary,
  getUserActivityEntitySummary,
} from "@/shared/lib/activity-log-catalog";
import { ActivityLogFilterSelect } from "@/shared/components/activity-log-filter-select";
import { ActivityLogLocationCell } from "@/shared/components/activity-log-location-cell";
import ListPagination from "@/shared/components/ListPagination";
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
  // ponytail: preset ranges use local YMD (toLocalYmd); bounds here are UTC. Full tz alignment deferred.
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

type DatePreset = "7d" | "30d" | "3m" | "all" | "custom";

type LogRowModel = {
  actionDisp: ReturnType<typeof getActivityActionDisplayForRow>;
  entityDisp: ReturnType<typeof getEntityTypeDisplay>;
  entityRich: ReturnType<typeof getOrgMutateDeniedEntitySummary>;
  entityHref: string | null;
  canOpenEntity: boolean;
};

function buildLogRowModel(
  log: ActivityLog,
  permissions: string[],
  isAdministrator: boolean,
  isPlatformSuperUser: boolean
): LogRowModel {
  return {
    actionDisp: getActivityActionDisplayForRow(log),
    entityDisp: getEntityTypeDisplay(log.entityType),
    entityRich:
      getOrgMutateDeniedEntitySummary(log) ??
      getOrgUnitActivityEntitySummary(log) ??
      getDepartmentActivityEntitySummary(log) ??
      getOrgStructureActivityEntitySummary(log) ??
      getEmployeeOrgActivityEntitySummary(log) ??
      getCandidateActivityEntitySummary(log) ??
      getJobActivityEntitySummary(log) ??
      getRoleActivityEntitySummary(log) ??
      getUserActivityEntitySummary(log) ??
      getImpersonationEntitySummary(log),
    entityHref: getActivityLogEntityHref(log.entityType, log.entityId),
    canOpenEntity: canOpenActivityLogEntity(
      log.entityType,
      log.entityId,
      permissions,
      isAdministrator,
      isPlatformSuperUser
    ),
  };
}

function ActivityLogEntityCell({
  log,
  model,
}: {
  log: ActivityLog;
  model: LogRowModel;
}) {
  const { entityDisp, entityRich, entityHref, canOpenEntity } = model;
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
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
  );
}

// Local calendar date (YYYY-MM-DD), NOT toISOString() — avoids UTC day-drift near midnight.
function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function presetToRange(preset: DatePreset): { start: string; end: string } {
  if (preset === "all" || preset === "custom") return { start: "", end: "" };
  const now = new Date();
  const end = toLocalYmd(now);
  const startDate = new Date(now);
  if (preset === "7d") startDate.setDate(now.getDate() - 6);
  else if (preset === "30d") startDate.setDate(now.getDate() - 29);
  else if (preset === "3m") startDate.setMonth(now.getMonth() - 3);
  return { start: toLocalYmd(startDate), end };
}

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "3m", label: "Last 3 months" },
  { key: "all", label: "All time" },
  { key: "custom", label: "Custom…" },
];

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
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string>("");
  const [forbidden, setForbidden] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("7d");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const fetchIdRef = useRef(0);
  const customDateIncomplete = datePreset === "custom" && (!startDate || !endDate);

  const canFilter =
    isPlatformSuperUser ||
    logsActivityFeature.canDelete ||
    (logsActivityFeature.canCreate && logsActivityFeature.canEdit);

  const hasActiveFilters =
    q.trim() || action.trim() || entityType.trim() || datePreset !== "7d";

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchLogs = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    setError("");
    setForbidden(false);

    const range =
      datePreset === "custom"
        ? { start: startDate, end: endDate }
        : presetToRange(datePreset);

    const params: activityLogsApi.ListActivityLogsParams = {
      action: action.trim() || undefined,
      entityType: entityType.trim() || undefined,
      q: q.trim() || undefined,
      startDate: toIsoStartOfDay(range.start || null) ?? undefined,
      endDate: toIsoEndOfDay(range.end || null) ?? undefined,
      sortBy: "createdAt:desc",
      page,
      limit,
    };

    try {
      const res = await activityLogsApi.listActivityLogs(params);
      if (fetchId !== fetchIdRef.current) return;
      setLogs(res.results ?? []);
      setTotalPages(res.totalPages ?? 1);
      setTotalResults(res.totalResults ?? 0);
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return;
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
      if (fetchId !== fetchIdRef.current) return;
      setLoading(false);
    }
  }, [action, entityType, q, datePreset, startDate, endDate, page, limit]);

  useEffect(() => {
    if (!permissionsLoaded || !canReadActivityLogs) {
      return;
    }
    if (customDateIncomplete) {
      setLoading(false);
      setLogs([]);
      setTotalResults(0);
      setTotalPages(1);
      setError("");
      return;
    }
    fetchLogs();
  }, [
    permissionsLoaded,
    canReadActivityLogs,
    customDateIncomplete,
    fetchLogs,
  ]);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const buildExportParams = useCallback((): activityLogsApi.ExportActivityLogsParams => {
    const range =
      datePreset === "custom"
        ? { start: startDate, end: endDate }
        : presetToRange(datePreset);
    return {
      action: action.trim() || undefined,
      entityType: entityType.trim() || undefined,
      q: q.trim() || undefined,
      startDate: toIsoStartOfDay(range.start || null) ?? undefined,
      endDate: toIsoEndOfDay(range.end || null) ?? undefined,
    };
  }, [action, entityType, q, datePreset, startDate, endDate]);

  const handleExportExcel = async () => {
    if (customDateIncomplete) return;
    setExporting(true);
    setError("");
    try {
      await activityLogsApi.downloadActivityLogsExcel(buildExportParams());
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 404) {
        setError("No activity logs match the selected filters.");
        return;
      }
      let msg = "Export failed.";
      if (err instanceof AxiosError && err.response?.data) {
        const d = err.response.data;
        if (d instanceof Blob) {
          try {
            const t = await d.text();
            const j = JSON.parse(t) as { message?: string };
            msg = j.message ?? msg;
          } catch {
            msg = String(d);
          }
        } else if (typeof d === "object" && d != null && "message" in d) {
          msg = String((d as { message: string }).message);
        }
      }
      setError(msg);
    } finally {
      setExporting(false);
    }
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setQ("");
    setAction("");
    setEntityType("");
    setDatePreset("7d");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const accessLoading = !permissionsLoaded;

  const showPagination = !loading && !customDateIncomplete && (logs.length > 0 || hasActiveFilters);

  return (
    <Fragment>
      <Seo title="Activity Logs" />
      <div className="mt-5 grid grid-cols-12 gap-6 h-[calc(100vh-8rem)] sm:mt-6">
        <div className="xl:col-span-12 col-span-12 h-full min-h-0 flex flex-col">
          <div className="box custom-box h-full min-h-0 flex flex-col overflow-hidden">
            <div className="box-header shrink-0 flex flex-col gap-3 !px-5 !py-3 sm:!py-4 bg-white dark:bg-bodybg">
              <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4">
              <div className="box-title mb-0">
                Activity Logs
                <span className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle">
                  {totalResults}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
                {isDesignatedSuperadmin && (
                  <Link
                    href="/logs/logs-activity/platform"
                    className="ti-btn ti-btn-soft-primary !py-1 !px-3 !text-[0.75rem]"
                  >
                    Platform audit console
                  </Link>
                )}
                <select
                  className="form-control select-show-page-size !w-auto !py-1 !px-4 !text-[0.75rem]"
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  aria-label="Results per page"
                >
                  {[10, 20, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      Show {size}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="ti-btn ti-btn-soft-primary !py-1 !px-3 !text-[0.75rem] !mb-0"
                  onClick={handleExportExcel}
                  disabled={loading || exporting || customDateIncomplete}
                  aria-label="Export activity logs as Excel"
                  aria-busy={exporting}
                >
                  {exporting ? (
                    <i className="ri-loader-4-line animate-spin motion-reduce:animate-none me-1" aria-hidden />
                  ) : (
                    <i className="ri-download-2-line me-1" aria-hidden />
                  )}
                  {exporting ? "Exporting..." : "Export Excel"}
                </button>
                {currentUser && (
                  <span className="text-[0.75rem] text-defaulttextcolor/70">
                    Viewing as: <span className="font-medium">{currentUser.name ?? currentUser.email}</span>
                  </span>
                )}
              </div>
              </div>

              {canFilter && !accessLoading && canReadActivityLogs && !forbidden && (
                <div className="w-full p-4 rounded-lg border border-defaultborder bg-gray-50/50 dark:bg-gray-800/30">
                  <div className="mb-3">
                    <label htmlFor="logs-search" className="form-label !text-[0.75rem] mb-1">
                      Search
                    </label>
                    <input
                      id="logs-search"
                      type="search"
                      className="form-control !py-2 !text-[0.8125rem] w-full"
                      placeholder="Search by person name, email, or what changed…"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                    />
                  </div>

                  <div className="mb-3">
                    <label id="logs-when-label" className="form-label !text-[0.75rem] mb-1">
                      When
                    </label>
                    <div
                      className="flex flex-wrap items-center gap-2"
                      role="group"
                      aria-labelledby="logs-when-label"
                    >
                      {DATE_PRESETS.map((p) => (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => {
                            setDatePreset(p.key);
                            setPage(1);
                          }}
                          className={
                            "ti-btn !py-1 !px-3 !text-[0.75rem] !mb-0 " +
                            (datePreset === p.key ? "ti-btn-primary" : "ti-btn-light")
                          }
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-end gap-3">
                    <div className="w-full sm:min-w-[14rem] sm:w-auto sm:flex-1">
                      <label htmlFor="logs-action" className="form-label !text-[0.75rem] mb-1">
                        Action
                      </label>
                      <ActivityLogFilterSelect
                        inputId="logs-action"
                        groups={getGroupedActionOptions()}
                        value={action}
                        onChange={(next) => {
                          setAction(next);
                          setPage(1);
                        }}
                        placeholder="Any action"
                        noOptionsMessage="No matching actions"
                      />
                    </div>
                    <div className="w-full sm:min-w-[14rem] sm:w-auto sm:flex-1">
                      <label htmlFor="logs-entity-type" className="form-label !text-[0.75rem] mb-1">
                        Entity type
                      </label>
                      <ActivityLogFilterSelect
                        inputId="logs-entity-type"
                        groups={getGroupedEntityTypeOptions()}
                        value={entityType}
                        onChange={(next) => {
                          setEntityType(next);
                          setPage(1);
                        }}
                        placeholder="Any entity"
                        noOptionsMessage="No matching entity types"
                      />
                    </div>

                    {datePreset === "custom" && (
                      <>
                        <div className="w-full sm:min-w-[10rem] sm:w-auto">
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
                        <div className="w-full sm:min-w-[10rem] sm:w-auto">
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
                      </>
                    )}
                  </div>

                  {customDateIncomplete && (
                    <p className="mt-3 mb-0 text-[0.8125rem] text-warning">
                      Select both start and end dates to load custom range results.
                    </p>
                  )}

                  {hasActiveFilters && (
                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-defaultborder">
                      <span className="text-[0.7rem] uppercase tracking-wide text-defaulttextcolor/50">
                        Active
                      </span>
                      {datePreset !== "7d" && (
                        <span className="inline-flex items-center gap-1 text-[0.75rem] px-2 py-1 rounded bg-primary/10 text-primary">
                          {DATE_PRESETS.find((p) => p.key === datePreset)?.label}
                          <button
                            type="button"
                            aria-label="Remove date range filter"
                            onClick={() => {
                              setDatePreset("7d");
                              setPage(1);
                            }}
                          >
                            ✕
                          </button>
                        </span>
                      )}
                      {action.trim() && (
                        <span className="inline-flex items-center gap-1 text-[0.75rem] px-2 py-1 rounded bg-primary/10 text-primary">
                          {getActionDisplay(action).title}
                          <button
                            type="button"
                            aria-label="Remove action filter"
                            onClick={() => {
                              setAction("");
                              setPage(1);
                            }}
                          >
                            ✕
                          </button>
                        </span>
                      )}
                      {entityType.trim() && (
                        <span className="inline-flex items-center gap-1 text-[0.75rem] px-2 py-1 rounded bg-primary/10 text-primary">
                          {getEntityTypeDisplay(entityType).title}
                          <button
                            type="button"
                            aria-label="Remove entity type filter"
                            onClick={() => {
                              setEntityType("");
                              setPage(1);
                            }}
                          >
                            ✕
                          </button>
                        </span>
                      )}
                      {q.trim() && (
                        <span className="inline-flex items-center gap-1 text-[0.75rem] px-2 py-1 rounded bg-primary/10 text-primary">
                          “{q.trim()}”
                          <button
                            type="button"
                            aria-label="Remove search filter"
                            onClick={() => {
                              setSearchInput("");
                              setQ("");
                              setPage(1);
                            }}
                          >
                            ✕
                          </button>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="ti-btn ti-btn-light !py-1 !px-3 !text-[0.75rem] !mb-0"
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="box-body !p-0 flex-1 flex flex-col overflow-hidden min-h-0">
              {error && (
                <div className="shrink-0 p-4 mx-3 sm:mx-4 mt-3 mb-0 bg-danger/10 border border-danger/30 text-danger rounded-md text-sm">
                  {error}
                </div>
              )}

              {accessLoading ? (
                <div className="flex flex-1 min-h-[40vh] items-center justify-center">
                  <div className="ti-btn ti-btn-primary ti-btn-loading">Checking access...</div>
                </div>
              ) : !canReadActivityLogs ? (
                <div className="shrink-0 p-4 mx-3 sm:mx-4 mt-3 bg-warning/10 border border-warning/30 text-warning rounded-md text-sm">
                  You need the <span className="font-semibold">logs.activity:view</span> permission (or Administrator /
                  platform access) to view activity logs.
                </div>
              ) : forbidden ? null : customDateIncomplete ? (
                <div className="flex flex-1 items-center justify-center px-4 py-10 text-center text-defaulttextcolor/70 text-sm">
                  Choose start and end dates above to view activity logs for a custom range.
                </div>
              ) : loading ? (
                <>
                  <div className="lg:hidden divide-y divide-defaultborder rounded-lg border border-defaultborder overflow-hidden mx-3 sm:mx-4 mt-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={`m-sk-${i}`} className="p-3 sm:p-4 space-y-2">
                        <div className="h-4 w-2/3 bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
                        <div className="h-4 w-1/2 bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
                        <div className="h-3 w-full bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                  <div className="hidden lg:block overflow-x-auto overscroll-x-contain mx-3 sm:mx-4 mt-3 rounded-lg border border-defaultborder">
                    <table className="table table-bordered border-defaultborder min-w-[56rem] w-full mb-0">
                      <tbody>
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-defaulttextcolor/70">
                            Loading activity logs...
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              ) : logs.length === 0 ? (
                <div className="flex flex-1 items-center justify-center mx-3 sm:mx-4 mt-3 rounded-lg border border-defaultborder px-4 py-10 text-center text-defaulttextcolor/70 text-sm">
                  {hasActiveFilters ? "No logs match your filters." : "No activity logs found yet."}
                </div>
              ) : (
                <>
                  <div className="lg:hidden flex-1 min-h-0 overflow-y-auto divide-y divide-defaultborder rounded-lg border border-defaultborder mx-3 sm:mx-4 mt-3 mb-3">
                    {logs.map((log) => {
                      const model = buildLogRowModel(
                        log,
                        permissions,
                        !!isAdministrator,
                        !!isPlatformSuperUser
                      );
                      const displayIp = getActivityLogDisplayIp(log);
                      return (
                        <article key={log.id} className="p-3 sm:p-4 space-y-2.5 bg-white dark:bg-bodybg">
                          <time className="block text-[0.75rem] text-defaulttextcolor/70">
                            {formatDateTime(log.createdAt)}
                          </time>

                          <div className="grid grid-cols-1 gap-2.5 text-[0.8125rem]">
                            <div>
                              <span className="text-[0.65rem] uppercase tracking-wide text-defaulttextcolor/50">
                                Actor
                              </span>
                              <p className="font-medium mb-0">{log.actor?.name || "—"}</p>
                              {log.actor?.id && (
                                <p className="text-[0.7rem] text-defaulttextcolor/60 font-mono break-all mb-0">
                                  {log.actor.id}
                                </p>
                              )}
                            </div>

                            <div>
                              <span className="text-[0.65rem] uppercase tracking-wide text-defaulttextcolor/50">
                                Action
                              </span>
                              <p className="font-medium mb-0">{model.actionDisp.title}</p>
                              <p className="text-[0.7rem] font-mono text-defaulttextcolor/60 mb-0">
                                {log.action}
                              </p>
                            </div>

                            <div>
                              <span className="text-[0.65rem] uppercase tracking-wide text-defaulttextcolor/50">
                                Entity
                              </span>
                              <ActivityLogEntityCell log={log} model={model} />
                            </div>

                            <div>
                              <span className="text-[0.65rem] uppercase tracking-wide text-defaulttextcolor/50">
                                Location
                              </span>
                              <div className="mt-0.5">
                                <ActivityLogLocationCell log={log} />
                              </div>
                            </div>
                          </div>

                          <details className="rounded-md border border-defaultborder/70 bg-gray-50/60 dark:bg-gray-800/30 px-3 py-2 text-[0.75rem]">
                            <summary className="cursor-pointer font-medium text-primary select-none">
                              Device details
                            </summary>
                            <div className="mt-2 space-y-2">
                              <div>
                                <span className="text-[0.65rem] uppercase tracking-wide text-defaulttextcolor/50">
                                  IP
                                </span>
                                <p className="font-mono break-all mb-0">{displayIp}</p>
                              </div>
                              <div>
                                <span className="text-[0.65rem] uppercase tracking-wide text-defaulttextcolor/50">
                                  User Agent
                                </span>
                                <p className="break-words mb-0 text-defaulttextcolor/80">
                                  {log.userAgent ?? "—"}
                                </p>
                              </div>
                            </div>
                          </details>
                        </article>
                      );
                    })}
                  </div>

                  <div className="hidden lg:block flex-1 overflow-y-auto overflow-x-auto overscroll-x-contain mx-3 sm:mx-4 mt-3 mb-3 rounded-lg border border-defaultborder" style={{ minHeight: 0 }}>
                    <table className="table table-bordered border-defaultborder min-w-[56rem] w-full mb-0">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10">
                          <th className="px-4 py-2.5 text-start font-semibold min-w-[9.5rem] whitespace-nowrap sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/50">
                            Timestamp
                          </th>
                          <th className="px-4 py-2.5 text-start font-semibold min-w-[8.5rem] sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/50">Actor</th>
                          <th className="px-4 py-2.5 text-start font-semibold min-w-[9rem] sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/50">Action</th>
                          <th className="px-4 py-2.5 text-start font-semibold min-w-[12rem] sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/50">Entity</th>
                          <th
                            className="px-4 py-2.5 text-start font-semibold min-w-[8rem] sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/50"
                            title="Device place (GPS) when allowed; IP-based location is approximate."
                          >
                            Location
                          </th>
                          <th className="px-4 py-2.5 text-start font-semibold min-w-[7rem] whitespace-nowrap sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/50">
                            IP
                          </th>
                          <th className="px-4 py-2.5 text-start font-semibold min-w-[14rem] sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/50">User Agent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => {
                          const model = buildLogRowModel(
                            log,
                            permissions,
                            !!isAdministrator,
                            !!isPlatformSuperUser
                          );
                          return (
                            <tr key={log.id} className="border-b border-defaultborder">
                              <td className="px-4 py-2.5 align-middle text-[0.8125rem] whitespace-nowrap">
                                {formatDateTime(log.createdAt)}
                              </td>
                              <td className="px-4 py-2.5 align-middle text-[0.8125rem]">
                                <div className="flex flex-col min-w-[7.5rem]">
                                  <span className="font-medium">{log.actor?.name || "—"}</span>
                                  <span className="text-[0.7rem] text-defaulttextcolor/70 break-all">
                                    {log.actor?.id ?? "—"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 align-middle text-[0.8125rem]">
                                <div className="flex flex-col gap-0.5 min-w-[8rem]">
                                  <span className="font-medium">{model.actionDisp.title}</span>
                                  <span className="font-mono text-[0.7rem] text-defaulttextcolor/60">
                                    {log.action}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 align-middle text-[0.8125rem]">
                                <ActivityLogEntityCell log={log} model={model} />
                              </td>
                              <td className="px-4 py-2.5 align-middle text-[0.8125rem]">
                                <ActivityLogLocationCell log={log} />
                              </td>
                              <td className="px-4 py-2.5 align-middle text-[0.8125rem] font-mono text-[0.75rem] whitespace-nowrap">
                                {getActivityLogDisplayIp(log)}
                              </td>
                              <td
                                className="px-4 py-2.5 align-middle text-[0.75rem] text-defaulttextcolor/80 max-w-[18rem]"
                                title={log.userAgent ?? undefined}
                              >
                                <span className="line-clamp-3 break-words">{log.userAgent ?? "—"}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {showPagination && (
              <div className="box-footer shrink-0 !border-t-0 bg-white dark:bg-bodybg">
                <ListPagination
                  page={page}
                  totalPages={totalPages}
                  totalResults={totalResults}
                  pageSize={limit}
                  onPageChange={setPage}
                  ariaLabel="Activity logs page navigation"
                  gotoInputId="activity-logs-goto-page"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </Fragment>
  );
}
