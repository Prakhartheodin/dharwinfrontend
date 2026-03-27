"use client";

import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Seo from "@/shared/layout-components/seo/seo";
import { useAuth } from "@/shared/contexts/auth-context";
import type { ActivityLog } from "@/shared/lib/types";
import * as activityLogsApi from "@/shared/lib/api/activity-logs";
import {
  ACTIVITY_LOG_ACTIONS,
  ACTIVITY_LOG_ENTITY_TYPES,
  getActionDisplay,
  getActivityActionDisplayForRow,
  getEntityTypeDisplay,
  getRoleActivityEntitySummary,
  getUserActivityEntitySummary,
  getImpersonationEntitySummary,
} from "@/shared/lib/activity-log-catalog";
import {
  canOpenActivityLogEntity,
  getActivityLogEntityHref,
} from "@/shared/lib/activity-log-entity-routes";
import { AxiosError } from "axios";
import { parseUserAgentDetails } from "@/shared/lib/parse-user-agent";
import { ActivityLogLocationCell } from "@/shared/components/activity-log-location-cell";
import {
  formatActivityLogClientGeoLine,
  formatActivityLogIpGeoLine,
} from "@/shared/lib/activity-log-location-display";
import { useClientGeoAndIp } from "@/shared/hooks/use-client-geo-and-ip";
import {
  fetchIpGeoFromIp,
  isLocalhostIp,
  type IpGeoResult,
} from "@/shared/lib/activity-log-client-geo";

const DENSITY_STORAGE_KEY = "activity-logs-table-density";
const EXPORT_CAP_HINT = 50000;

type TimePreset = "24h" | "7d" | "30d" | "month-utc" | null;

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

function rollingRangeIso(hours: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

function thisMonthUtcRangeIso(): { startDate: string; endDate: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const startDate = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0)).toISOString();
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const endDate = new Date(Date.UTC(y, m, lastDay, 23, 59, 59, 999)).toISOString();
  return { startDate, endDate };
}

function LogClientDeviceBlock({ userAgent }: { userAgent?: string | null }) {
  const parsed = parseUserAgentDetails(userAgent);
  if (!parsed) {
    return <p className="mt-1 text-[0.75rem] text-defaulttextcolor/60">—</p>;
  }
  return (
    <>
      <div className="mt-2 grid gap-2 sm:grid-cols-3 sm:gap-4">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-defaulttextcolor/50">Browser</p>
          <p className="mt-0.5 text-[0.8rem] text-defaulttextcolor">{parsed.browser}</p>
        </div>
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-defaulttextcolor/50">OS</p>
          <p className="mt-0.5 text-[0.8rem] text-defaulttextcolor">{parsed.os}</p>
        </div>
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-defaulttextcolor/50">Device</p>
          <p className="mt-0.5 text-[0.8rem] text-defaulttextcolor">{parsed.device}</p>
        </div>
      </div>
      {userAgent ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-[0.7rem] text-primary hover:underline">Raw User-Agent string</summary>
          <p className="mt-1 rounded border border-defaultborder bg-white/50 p-2 font-mono text-[0.65rem] text-defaulttextcolor/80 break-all dark:bg-black/20">
            {userAgent}
          </p>
        </details>
      ) : null}
    </>
  );
}

function MetadataBlock({ metadata }: { metadata: Record<string, unknown> | null | undefined }) {
  const text = useMemo(() => JSON.stringify(metadata ?? {}, null, 2), [metadata]);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-defaulttextcolor/50">Metadata</span>
        <button
          type="button"
          className="ti-btn ti-btn-xs ti-btn-soft-primary !py-0 !px-2 !text-[0.65rem]"
          onClick={copy}
        >
          {copied ? "Copied" : "Copy JSON"}
        </button>
      </div>
      <pre className="mt-1 max-h-48 overflow-auto rounded border border-defaultborder bg-white/50 p-2 font-mono text-[0.65rem] text-defaulttextcolor/90 dark:bg-black/20">
        {text}
      </pre>
    </div>
  );
}

function exportLogsCsvPage(rows: ActivityLog[]) {
  const headers = [
    "id",
    "createdAt",
    "actorName",
    "actorId",
    "action",
    "entityType",
    "entityId",
    "location",
    "browserGeo",
    "ip",
    "userAgent",
  ];
  const lines = [headers.join(",")];
  for (const log of rows) {
    const loc = formatActivityLogIpGeoLine(log.geo);
    const bg = formatActivityLogClientGeoLine(log.clientGeo).replace(/^Browser: /, "");
    const cells = [
      log.id,
      log.createdAt ?? "",
      (log.actor?.name ?? "").replaceAll('"', '""'),
      log.actor?.id ?? "",
      log.action,
      log.entityType ?? "",
      log.entityId ?? "",
      loc.replaceAll('"', '""'),
      bg.replaceAll('"', '""'),
      log.ip ?? "",
      (log.userAgent ?? "").replaceAll('"', '""'),
    ];
    lines.push(cells.map((c) => `"${String(c)}"`).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function GeoLocationBanner({
  geoStatus,
  storedGeo,
  requestGeo,
}: {
  geoStatus: ReturnType<typeof useClientGeoAndIp>["geoStatus"];
  storedGeo: ReturnType<typeof useClientGeoAndIp>["storedGeo"];
  requestGeo: () => void;
}) {
  if (geoStatus === "unavailable") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/8 px-4 py-3 text-[0.8125rem] text-warning mb-4">
        <i className="ri-map-pin-2-line mt-0.5" aria-hidden />
        <span>Browser geolocation is not supported. Location will not be captured for future log entries.</span>
      </div>
    );
  }
  if (geoStatus === "denied") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/8 px-4 py-3 text-[0.8125rem] text-danger mb-4">
        <i className="ri-map-pin-off-line mt-0.5" aria-hidden />
        <span>
          Location permission was denied. Future actions won&apos;t include GPS coordinates. Allow location in your
          browser settings, then reload.
        </span>
      </div>
    );
  }
  if (geoStatus === "granted" && storedGeo) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/8 px-4 py-2.5 text-[0.8125rem] text-success mb-4">
        <i className="ri-map-pin-2-fill" aria-hidden />
        <span>
          Location tracking enabled —
          <span className="font-mono ms-1">
            {storedGeo.lat.toFixed(5)}, {storedGeo.lng.toFixed(5)}
          </span>
          {storedGeo.accuracy > 0 && (
            <span className="ms-1 opacity-70">±{Math.round(storedGeo.accuracy)} m</span>
          )}
        </span>
      </div>
    );
  }
  // idle / requesting
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-[0.8125rem] mb-4">
      <i className="ri-map-pin-2-line text-primary" aria-hidden />
      <span className="flex-1 text-defaulttextcolor/80">
        Enable location tracking so future activity log entries include your real GPS coordinates.
      </span>
      <button
        type="button"
        className="ti-btn ti-btn-sm ti-btn-primary !py-1 !px-3 !text-[0.75rem]"
        disabled={geoStatus === "requesting"}
        onClick={requestGeo}
      >
        {geoStatus === "requesting" ? (
          <><i className="ri-loader-4-line animate-spin me-1" aria-hidden />Requesting…</>
        ) : (
          <><i className="ri-map-pin-2-line me-1" aria-hidden />Enable location tracking</>
        )}
      </button>
    </div>
  );
}

export default function PlatformAuditLogsPage() {
  const {
    user: currentUser,
    permissions,
    permissionsLoaded,
    isPlatformSuperUser,
    isAdministrator,
    isDesignatedSuperadmin,
  } = useAuth();

  const canReadActivityLogs = isDesignatedSuperadmin;

  const { realIp, ipLoading, geoStatus, storedGeo, requestGeo } = useClientGeoAndIp();

  // Resolve city/country from the real IP once it's available
  const [realIpGeo, setRealIpGeo] = useState<IpGeoResult | null>(null);
  useEffect(() => {
    if (!realIp) return;
    fetchIpGeoFromIp(realIp).then((geo) => {
      if (geo) setRealIpGeo(geo);
    });
  }, [realIp]);

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  const [loading, setLoading] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [error, setError] = useState<string>("");
  const [forbidden, setForbidden] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [actorId, setActorId] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [timePreset, setTimePreset] = useState<TimePreset>(null);
  const [includeAttendance, setIncludeAttendance] = useState(false);
  const [ipFilter, setIpFilter] = useState("");
  const [searchQ, setSearchQ] = useState("");

  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

  useEffect(() => {
    try {
      const v = localStorage.getItem(DENSITY_STORAGE_KEY);
      if (v === "compact" || v === "comfortable") setDensity(v);
    } catch {
      /* ignore */
    }
  }, []);

  const setDensityPersist = (d: "comfortable" | "compact") => {
    setDensity(d);
    try {
      localStorage.setItem(DENSITY_STORAGE_KEY, d);
    } catch {
      /* ignore */
    }
  };

  const resolveDateRangeForApi = useCallback(() => {
    if (timePreset === "24h") return rollingRangeIso(24);
    if (timePreset === "7d") return rollingRangeIso(24 * 7);
    if (timePreset === "30d") return rollingRangeIso(24 * 30);
    if (timePreset === "month-utc") return thisMonthUtcRangeIso();
    return {
      startDate: toIsoStartOfDay(startDate) ?? undefined,
      endDate: toIsoEndOfDay(endDate) ?? undefined,
    };
  }, [timePreset, startDate, endDate]);

  const buildListParams = useCallback((): activityLogsApi.ListActivityLogsParams => {
    const { startDate: sd, endDate: ed } = resolveDateRangeForApi();
    return {
      actor: actorId.trim() || undefined,
      action: action.trim() || undefined,
      entityType: entityType.trim() || undefined,
      entityId: entityId.trim() || undefined,
      startDate: sd,
      endDate: ed,
      ip: ipFilter.trim() || undefined,
      q: searchQ.trim() || undefined,
      includeAttendance: includeAttendance || undefined,
      sortBy: "createdAt:desc",
      page,
      limit,
    };
  }, [
    actorId,
    action,
    entityType,
    entityId,
    resolveDateRangeForApi,
    ipFilter,
    searchQ,
    includeAttendance,
    page,
    limit,
  ]);

  const buildExportParams = useCallback((): activityLogsApi.ExportActivityLogsParams => {
    const { startDate: sd, endDate: ed } = resolveDateRangeForApi();
    return {
      actor: actorId.trim() || undefined,
      action: action.trim() || undefined,
      entityType: entityType.trim() || undefined,
      entityId: entityId.trim() || undefined,
      startDate: sd,
      endDate: ed,
      ip: ipFilter.trim() || undefined,
      q: searchQ.trim() || undefined,
      includeAttendance: includeAttendance || undefined,
    };
  }, [
    actorId,
    action,
    entityType,
    entityId,
    resolveDateRangeForApi,
    ipFilter,
    searchQ,
    includeAttendance,
  ]);

  const hasActiveFilters =
    actorId.trim() ||
    action.trim() ||
    entityType.trim() ||
    entityId.trim() ||
    startDate ||
    endDate ||
    timePreset != null ||
    includeAttendance ||
    ipFilter.trim() ||
    searchQ.trim();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    setForbidden(false);

    const params = buildListParams();

    try {
      const res = await activityLogsApi.listActivityLogs(params);
      setLogs(res.results ?? []);
      setTotalPages(res.totalPages ?? 1);
      setTotalResults(res.totalResults ?? 0);
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 403) {
        setForbidden(true);
        setError("This console is restricted to the designated platform account.");
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
  }, [buildListParams]);

  useEffect(() => {
    if (!permissionsLoaded || !canReadActivityLogs) {
      return;
    }
    fetchLogs();
  }, [permissionsLoaded, canReadActivityLogs, fetchLogs]);

  const handleClearFilters = () => {
    setActorId("");
    setAction("");
    setEntityType("");
    setEntityId("");
    setStartDate("");
    setEndDate("");
    setTimePreset(null);
    setIncludeAttendance(false);
    setIpFilter("");
    setSearchQ("");
    setPage(1);
  };

  const handleExportAll = async () => {
    setExportingAll(true);
    setError("");
    try {
      const blob = await activityLogsApi.exportActivityLogsCsv(buildExportParams());
      if (blob.type.includes("json")) {
        const text = await blob.text();
        try {
          const j = JSON.parse(text) as { message?: string };
          setError(j.message ?? "Export failed.");
        } catch {
          setError(text || "Export failed.");
        }
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `activity-logs-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
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
      setExportingAll(false);
    }
  };

  const start = totalResults === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, totalResults);

  const accessLoading = !permissionsLoaded;

  const cellY = density === "compact" ? "py-1.5" : "py-2.5";
  const cellText = density === "compact" ? "text-[0.75rem]" : "text-[0.8125rem]";

  const presetBtn = (active: boolean) =>
    `ti-btn !py-1 !px-2 !text-[0.7rem] ${active ? "ti-btn-primary" : "ti-btn-light"}`;

  return (
    <Fragment>
      <Seo title="Platform audit logs" />
      <div className="flex items-center justify-between flex-wrap gap-4 mb-4 px-4 pt-4">
        <h5 className="box-title mb-0">
          Platform audit logs
          <span className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle">
            {totalResults}
          </span>
        </h5>
        <div className="flex flex-wrap gap-2 items-center">
          <Link
            href="/logs/logs-activity"
            className="ti-btn ti-btn-soft-light !py-1 !px-3 !text-[0.75rem]"
          >
            Standard activity logs
          </Link>
          <select
            className="form-control !w-auto !py-1 !px-4 !text-[0.75rem]"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            aria-label="Rows per page"
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                Show {size}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="ti-btn ti-btn-soft-secondary !py-1 !px-3 !text-[0.75rem]"
            onClick={() => setDensityPersist(density === "compact" ? "comfortable" : "compact")}
            aria-pressed={density === "compact"}
            title="Toggle compact table density"
          >
            {density === "compact" ? "Comfortable density" : "Compact density"}
          </button>
          {currentUser && canReadActivityLogs && !forbidden && (
            <>
              <button
                type="button"
                className="ti-btn ti-btn-soft-secondary !py-1 !px-3 !text-[0.75rem]"
                disabled={loading || logs.length === 0}
                onClick={() => exportLogsCsvPage(logs)}
              >
                Export CSV (this page)
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-soft-primary !py-1 !px-3 !text-[0.75rem]"
                disabled={loading || exportingAll}
                onClick={handleExportAll}
                title={`Server export with extended columns, up to ${EXPORT_CAP_HINT} rows`}
              >
                {exportingAll ? "Exporting…" : `Export all (≤${EXPORT_CAP_HINT})`}
              </button>
            </>
          )}
          {currentUser && (
            <span className="text-[0.75rem] text-defaulttextcolor/70">
              Viewing as: <span className="font-medium">{currentUser.name ?? currentUser.email}</span>
            </span>
          )}
          {/* Real public IP badge */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.72rem] font-mono ${
              ipLoading
                ? "border-defaultborder text-defaulttextcolor/50"
                : realIp
                ? "border-success/40 bg-success/8 text-success"
                : "border-warning/40 bg-warning/8 text-warning/80"
            }`}
            title="Your real outbound IP (fetched client-side from api.ipify.org)"
          >
            <i className="ri-global-line text-[0.8rem]" aria-hidden />
            {ipLoading ? "Detecting IP…" : realIp ? `Your IP: ${realIp}` : "IP unavailable"}
          </span>
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
            The platform audit console is only available to the designated platform account. Use{" "}
            <Link href="/logs/logs-activity" className="font-semibold underline">
              standard activity logs
            </Link>{" "}
            if you have logs.activity access.
          </div>
        ) : (
          !forbidden && (
            <>
              {/* Geolocation permission banner */}
              <GeoLocationBanner geoStatus={geoStatus} storedGeo={storedGeo} requestGeo={requestGeo} />
              <div className="mb-4 p-4 rounded-lg border border-defaultborder bg-gray-50/50 dark:bg-gray-800/30 flex flex-col gap-3">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex items-center gap-2 text-defaulttextcolor/80">
                    <i className="ri-filter-3-line text-[1.25rem]" aria-hidden />
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
                  <div className="min-w-[12rem]">
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
                      <option value="">Any</option>
                      {ACTIVITY_LOG_ACTIONS.map((a) => {
                        const d = getActionDisplay(a);
                        return (
                          <option key={a} value={a} title={`${d.description} (${a})`}>
                            {d.title} ({a})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="min-w-[11rem]">
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
                      <option value="">Any</option>
                      {ACTIVITY_LOG_ENTITY_TYPES.map((t) => {
                        const d = getEntityTypeDisplay(t);
                        return (
                          <option key={t} value={t} title={`${d.description} (${t})`}>
                            {d.title} ({t})
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
                    <label htmlFor="logs-ip" className="form-label !text-[0.75rem] mb-1">
                      IP (prefix ok)
                    </label>
                    <input
                      id="logs-ip"
                      type="text"
                      className="form-control !py-1.5 !text-[0.8125rem]"
                      placeholder="e.g. 203.0.113"
                      value={ipFilter}
                      onChange={(e) => {
                        setIpFilter(e.target.value);
                        setPage(1);
                      }}
                      maxLength={45}
                    />
                  </div>
                  <div className="min-w-[12rem] flex-1">
                    <label htmlFor="logs-q" className="form-label !text-[0.75rem] mb-1">
                      Search (action, entity, id)
                    </label>
                    <input
                      id="logs-q"
                      type="search"
                      className="form-control !py-1.5 !text-[0.8125rem]"
                      placeholder="Keyword…"
                      value={searchQ}
                      onChange={(e) => {
                        setSearchQ(e.target.value);
                        setPage(1);
                      }}
                      maxLength={200}
                    />
                  </div>
                  <div className="min-w-[10rem]">
                    <label htmlFor="logs-start-date" className="form-label !text-[0.75rem] mb-1">
                      Start date (UTC)
                    </label>
                    <input
                      id="logs-start-date"
                      type="date"
                      className="form-control !py-1.5 !text-[0.8125rem]"
                      disabled={timePreset != null}
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setTimePreset(null);
                        setPage(1);
                      }}
                    />
                  </div>
                  <div className="min-w-[10rem]">
                    <label htmlFor="logs-end-date" className="form-label !text-[0.75rem] mb-1">
                      End date (UTC)
                    </label>
                    <input
                      id="logs-end-date"
                      type="date"
                      className="form-control !py-1.5 !text-[0.8125rem]"
                      disabled={timePreset != null}
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setTimePreset(null);
                        setPage(1);
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2 min-w-[12rem]">
                    <input
                      id="logs-include-attendance"
                      type="checkbox"
                      className="form-checkbox"
                      checked={includeAttendance}
                      onChange={(e) => {
                        setIncludeAttendance(e.target.checked);
                        setPage(1);
                      }}
                    />
                    <label htmlFor="logs-include-attendance" className="form-label !mb-0 !text-[0.75rem]">
                      Include attendance events
                    </label>
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

                <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Time range presets">
                  <span className="text-[0.7rem] text-defaulttextcolor/60 me-1">Presets:</span>
                  <button
                    type="button"
                    className={presetBtn(timePreset === "24h")}
                    onClick={() => {
                      setTimePreset("24h");
                      setStartDate("");
                      setEndDate("");
                      setPage(1);
                    }}
                  >
                    Last 24 hours
                  </button>
                  <button
                    type="button"
                    className={presetBtn(timePreset === "7d")}
                    onClick={() => {
                      setTimePreset("7d");
                      setStartDate("");
                      setEndDate("");
                      setPage(1);
                    }}
                  >
                    Last 7 days
                  </button>
                  <button
                    type="button"
                    className={presetBtn(timePreset === "30d")}
                    onClick={() => {
                      setTimePreset("30d");
                      setStartDate("");
                      setEndDate("");
                      setPage(1);
                    }}
                  >
                    Last 30 days
                  </button>
                  <button
                    type="button"
                    className={presetBtn(timePreset === "month-utc")}
                    onClick={() => {
                      setTimePreset("month-utc");
                      setStartDate("");
                      setEndDate("");
                      setPage(1);
                    }}
                  >
                    This month (UTC)
                  </button>
                  {timePreset != null && (
                    <button
                      type="button"
                      className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.7rem]"
                      onClick={() => setTimePreset(null)}
                    >
                      Clear preset
                    </button>
                  )}
                </div>

                <p className="text-[0.7rem] text-defaulttextcolor/65 mb-0 max-w-4xl">
                  <strong>Time semantics:</strong> Last 24 hours, 7 days, and 30 days are rolling windows ending{" "}
                  <em>now</em> (UTC clock on the server). <strong>This month (UTC)</strong> is the current calendar
                  month in UTC (first 00:00 through last day 23:59:59.999Z). Custom date fields use whole UTC calendar
                  days (00:00:00.000Z–23:59:59.999Z).
                </p>
              </div>

              <div className="max-h-[min(70vh,56rem)] overflow-auto rounded-md border border-defaultborder">
                <table className="table min-w-full table-bordered border-defaultborder mb-0">
                  <thead className="sticky top-0 z-[1] shadow-sm">
                    <tr className="bg-gray-50 dark:bg-gray-800/90">
                      <th
                        className={`px-2 ${cellY} w-10 bg-gray-50 dark:bg-gray-800/90`}
                        scope="col"
                        aria-label="Expand row"
                      />
                      <th
                        className={`px-4 ${cellY} text-start font-semibold bg-gray-50 dark:bg-gray-800/90`}
                        scope="col"
                      >
                        Timestamp
                      </th>
                      <th
                        className={`px-4 ${cellY} text-start font-semibold bg-gray-50 dark:bg-gray-800/90`}
                        scope="col"
                      >
                        Actor
                      </th>
                      <th
                        className={`px-4 ${cellY} text-start font-semibold bg-gray-50 dark:bg-gray-800/90`}
                        scope="col"
                      >
                        Action
                      </th>
                      <th
                        className={`px-4 ${cellY} text-start font-semibold bg-gray-50 dark:bg-gray-800/90`}
                        scope="col"
                      >
                        Entity
                      </th>
                      <th
                        className={`px-4 ${cellY} text-start font-semibold bg-gray-50 dark:bg-gray-800/90`}
                        scope="col"
                      >
                        Location
                      </th>
                      <th
                        className={`px-4 ${cellY} text-start font-semibold bg-gray-50 dark:bg-gray-800/90`}
                        scope="col"
                      >
                        IP
                      </th>
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
                          {hasActiveFilters
                            ? "No logs match your filters."
                            : "No activity logs found yet."}
                        </td>
                      </tr>
                    ) : (
                      logs.map((log, idx) => {
                        const open = expandedId === log.id;
                        const detailId = `activity-log-detail-${log.id}`;
                        const actionDisp = getActivityActionDisplayForRow(log);
                        const entityDisp = getEntityTypeDisplay(log.entityType);
                        const unknownAction = !ACTIVITY_LOG_ACTIONS.includes(log.action);
                        const unknownEntity =
                          log.entityType != null &&
                          log.entityType !== "" &&
                          !ACTIVITY_LOG_ENTITY_TYPES.includes(log.entityType);
                        const zebra = idx % 2 === 1 ? "bg-gray-50/40 dark:bg-gray-900/25" : "";
                        const href = getActivityLogEntityHref(log.entityType, log.entityId);
                        const canOpen = canOpenActivityLogEntity(
                          log.entityType,
                          log.entityId,
                          permissions,
                          !!isAdministrator,
                          !!isPlatformSuperUser
                        );
                        const entityRichSummary =
                          getRoleActivityEntitySummary(log) ??
                          getUserActivityEntitySummary(log) ??
                          getImpersonationEntitySummary(log);
                        const clientGeoLine = formatActivityLogClientGeoLine(log.clientGeo);
                        return (
                          <Fragment key={log.id}>
                            <tr className={`border-b border-defaultborder ${zebra}`}>
                              <td className={`px-2 ${cellY} align-middle text-center`}>
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-sm ti-btn-icon ti-btn-soft-primary !rounded-full"
                                  aria-expanded={open}
                                  aria-controls={detailId}
                                  aria-label={open ? "Collapse details" : "Expand details"}
                                  onClick={() => setExpandedId(open ? null : log.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      setExpandedId(open ? null : log.id);
                                    }
                                  }}
                                >
                                  <i className={`ri-arrow-${open ? "up" : "down"}-s-line`} aria-hidden />
                                </button>
                              </td>
                              <td className={`px-4 ${cellY} align-middle ${cellText}`}>
                                {formatDateTime(log.createdAt)}
                              </td>
                              <td className={`px-4 ${cellY} align-middle ${cellText}`}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{log.actor?.name || "—"}</span>
                                  <span className="text-[0.7rem] text-defaulttextcolor/70">
                                    {log.actor?.id ?? "—"}
                                  </span>
                                </div>
                              </td>
                              <td className={`px-4 ${cellY} align-middle ${cellText}`}>
                                <span
                                  title={`${actionDisp.description}\nKey: ${log.action}`}
                                  className="cursor-help"
                                >
                                  <span className="font-medium">{actionDisp.title}</span>
                                  {unknownAction ? (
                                    <code className="ms-1 rounded bg-defaultbackground px-1 font-mono text-[0.7rem]">
                                      {log.action}
                                    </code>
                                  ) : null}
                                </span>
                              </td>
                              <td className={`px-4 ${cellY} align-middle ${cellText}`}>
                                <div className="flex flex-col gap-1">
                                  {entityRichSummary ? (
                                    <>
                                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                        <span
                                          title={entityDisp.description}
                                          className="text-[0.65rem] uppercase tracking-wide text-defaulttextcolor/50 cursor-help"
                                        >
                                          {entityDisp.title}
                                        </span>
                                        <span className="font-semibold text-defaulttextcolor">
                                          {entityRichSummary.headline}
                                        </span>
                                      </div>
                                      {entityRichSummary.detailLines.map((line, di) => (
                                        <p
                                          key={di}
                                          className="text-[0.72rem] text-defaulttextcolor/80 m-0 leading-snug"
                                        >
                                          {line}
                                        </p>
                                      ))}
                                    </>
                                  ) : (
                                    <span
                                      title={`${entityDisp.description}\nKey: ${log.entityType ?? ""}`}
                                      className="cursor-help"
                                    >
                                      <span className="font-medium">{entityDisp.title}</span>
                                      {unknownEntity ? (
                                        <code className="ms-1 rounded bg-defaultbackground px-1 font-mono text-[0.7rem]">
                                          {log.entityType}
                                        </code>
                                      ) : null}
                                    </span>
                                  )}
                                  {entityRichSummary ? (
                                    <span
                                      className="text-[0.65rem] text-defaulttextcolor/45 font-mono break-all"
                                      title="Database id (reference)"
                                    >
                                      {log.entityId ?? "—"}
                                    </span>
                                  ) : (
                                    <span className="text-[0.7rem] text-defaulttextcolor/70 break-all">
                                      {log.entityId ?? "—"}
                                    </span>
                                  )}
                                  {href && canOpen ? (
                                    <Link
                                      href={href}
                                      className="text-[0.7rem] text-primary hover:underline w-fit"
                                      prefetch={false}
                                    >
                                      Open in app →
                                    </Link>
                                  ) : null}
                                </div>
                              </td>
                              <td className={`px-4 ${cellY} align-middle ${cellText}`}>
                                {/* If stored geo is localhost, show real IP geo fallback */}
                                {isLocalhostIp(log.ip) && (realIpGeo?.display || realIp) ? (
                                  <div className="flex flex-col gap-0.5">
                                    {realIpGeo?.display ? (
                                      <span className="font-medium text-defaulttextcolor">{realIpGeo.display}</span>
                                    ) : (
                                      <span className="text-defaulttextcolor/50 text-[0.75rem]">Resolving location…</span>
                                    )}
                                    {/* Still show browser GPS line if available */}
                                    {formatActivityLogClientGeoLine(log.clientGeo) ? (
                                      <span className="text-[0.7rem] text-defaulttextcolor/55">
                                        {formatActivityLogClientGeoLine(log.clientGeo)}
                                      </span>
                                    ) : null}
                                  </div>
                                ) : (
                                  <ActivityLogLocationCell log={log} />
                                )}
                              </td>
                              <td className={`px-4 ${cellY} align-middle break-all max-w-[8rem] ${cellText}`}>
                                {/* Replace 127.0.0.1 / localhost with real IP */}
                                {isLocalhostIp(log.ip) && realIp ? (
                                  <span className="font-mono">{realIp}</span>
                                ) : (
                                  log.ip ?? "—"
                                )}
                              </td>
                            </tr>
                            {open && (
                              <tr
                                id={detailId}
                                className="bg-gray-50/80 dark:bg-gray-900/40 border-b border-defaultborder"
                              >
                                <td colSpan={7} className={`px-4 py-3 ${cellText}`}>
                                  <div className="space-y-2">
                                    <div>
                                      <span className="font-semibold text-defaulttextcolor/80">HTTP request</span>
                                      <p className="mt-1 font-mono text-[0.75rem] text-defaulttextcolor/90 break-all">
                                        {(log.httpMethod ?? "—") + " "}
                                        <span className="text-defaulttextcolor/80">{log.httpPath ?? "—"}</span>
                                      </p>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-defaulttextcolor/80">Client / device</span>
                                      <LogClientDeviceBlock userAgent={log.userAgent} />
                                    </div>
                                    {clientGeoLine ? (
                                      <div>
                                        <span className="font-semibold text-defaulttextcolor/80">
                                          Browser-reported position
                                        </span>
                                        <p className="mt-1 font-mono text-[0.75rem] text-defaulttextcolor/90">
                                          {clientGeoLine}
                                        </p>
                                      </div>
                                    ) : null}
                                    <MetadataBlock metadata={log.metadata} />
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
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
                      aria-label="Previous page"
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
                      aria-label="Next page"
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
