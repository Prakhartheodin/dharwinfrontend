"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import { useFeaturePermissions } from "@/shared/hooks/use-feature-permissions";
import { listActivityLogs } from "@/shared/lib/api/activity-logs";
import {
  getActionDisplay,
  getActivityActionDisplayForRow,
  getOrgUnitActivityEntitySummary,
} from "@/shared/lib/activity-log-catalog";
import type { ActivityLog } from "@/shared/lib/types";
import { OrgEmptyState, OrgErrorState, OrgLoadingBlock, OrgSecondaryButton } from "./org-ui";

const PAGE_SIZE = 20;

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

function actionSummary(log: ActivityLog): string {
  const display = getActivityActionDisplayForRow(log);
  const orgSummary = getOrgUnitActivityEntitySummary(log);
  if (orgSummary?.detailLines.length) {
    return `${display.title} — ${orgSummary.detailLines.join("; ")}`;
  }
  if (orgSummary?.headline && orgSummary.headline !== display.title) {
    return `${display.title} (${orgSummary.headline})`;
  }
  return display.title;
}

type StructureHistoryPanelProps = {
  entityId?: string | null;
  onSelectUnit?: (unitId: string | null) => void;
};

export default function StructureHistoryPanel({ entityId, onSelectUnit }: StructureHistoryPanelProps) {
  const {
    permissions,
    permissionsLoaded,
    isPlatformSuperUser,
    isAdministrator,
    isDesignatedSuperadmin,
  } = useAuth();
  const logsActivityFeature = useFeaturePermissions("logs.activity");

  const canReadActivityLogs = useMemo(() => {
    if (isDesignatedSuperadmin || isPlatformSuperUser || isAdministrator) return true;
    if (permissions.some((p) => p === "activityLogs.read" || p === "activity.read")) return true;
    return logsActivityFeature.canView;
  }, [
    isDesignatedSuperadmin,
    isPlatformSuperUser,
    isAdministrator,
    permissions,
    logsActivityFeature.canView,
  ]);

  const [rows, setRows] = useState<ActivityLog[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [entityId]);

  const load = useCallback(async () => {
    if (!canReadActivityLogs) {
      setLoading(false);
      setRows([]);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const res = await listActivityLogs({
        entityType: "OrgUnit",
        ...(entityId ? { entityId } : {}),
        page,
        limit: PAGE_SIZE,
        sortBy: "createdAt:desc",
      });
      setRows(res.results);
      setTotalPages(Math.max(1, res.totalPages || 1));
    } catch {
      setError(true);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [canReadActivityLogs, entityId, page]);

  useEffect(() => {
    if (!permissionsLoaded) return;
    void load();
  }, [load, permissionsLoaded]);

  if (!permissionsLoaded) {
    return <OrgLoadingBlock label="Checking permissions…" />;
  }

  if (!canReadActivityLogs) {
    return (
      <OrgEmptyState
        icon="ri-lock-line"
        title="Activity history unavailable"
        description="You need activity.read or activityLogs.read permission to view organization change history."
      />
    );
  }

  if (loading) return <OrgLoadingBlock label="Loading change history…" />;
  if (error) return <OrgErrorState onRetry={() => void load()} />;

  return (
    <>
      {entityId && onSelectUnit ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="mb-0 text-[0.8125rem] text-defaulttextcolor/70">Showing changes for one org unit.</p>
          <OrgSecondaryButton type="button" onClick={() => onSelectUnit(null)}>
            <i className="ri-filter-off-line text-base" aria-hidden />
            Show all org activity
          </OrgSecondaryButton>
        </div>
      ) : null}

      {!rows.length ? (
        <OrgEmptyState
          icon="ri-history-line"
          title={entityId ? "No changes recorded for this unit yet" : "No organization activity yet"}
          description={
            entityId
              ? "Updates to this unit will appear here after heads are assigned, reparents, or deactivations."
              : "Org unit create, update, reparent, and head changes will appear here."
          }
        />
      ) : (
        <div className="table-responsive rounded-lg border border-defaultborder/60">
          <table className="table whitespace-nowrap min-w-full mb-0">
            <thead className="bg-light/60 dark:bg-white/[0.03]">
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Actor</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((log) => {
                const actionDisplay = getActionDisplay(log.action);
                return (
                  <tr key={log.id} className="border-defaultborder/50">
                    <td className="text-[0.8125rem] text-defaulttextcolor/75">{formatDateTime(log.createdAt)}</td>
                    <td className="text-[0.8125rem]">{log.actor?.name?.trim() || "—"}</td>
                    <td className="text-[0.8125rem]" title={`${actionDisplay.description} (${log.action})`}>
                      {actionSummary(log)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <nav className="mt-4 flex items-center justify-between gap-2" aria-label="Org history pagination">
          <button
            type="button"
            className="ti-btn ti-btn-light !py-1.5 !px-3 !text-[0.8125rem] disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <i className="ri-arrow-left-s-line" aria-hidden /> Prev
          </button>
          <span className="text-[0.8125rem] text-defaulttextcolor/65">
            Page <span className="font-semibold text-defaulttextcolor">{page}</span> of {totalPages}
          </span>
          <button
            type="button"
            className="ti-btn ti-btn-light !py-1.5 !px-3 !text-[0.8125rem] disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next <i className="ri-arrow-right-s-line" aria-hidden />
          </button>
        </nav>
      ) : null}
    </>
  );
}
