"use client";

import Seo from "@/shared/layout-components/seo/seo";
import DevTicketAccessDenied from "@/shared/components/dev-tickets/dev-ticket-access-denied";
import DevTicketTabBar from "@/shared/components/dev-tickets/dev-ticket-tab-bar";
import DevTicketApexChart, {
  DEV_TICKET_CHART_COLORS,
  buildDevTicketBarOptions,
  buildDevTicketDonutOptions,
} from "@/shared/components/dev-tickets/dev-ticket-apex-chart";
import { formatDevTicketModuleLabel } from "@/shared/components/dev-tickets/dev-ticket-modules";
import DevTicketDetailDrawer from "@/shared/components/dev-tickets/dev-ticket-detail-drawer";
import DevTicketDrillPanel, {
  type DevTicketDrillDimension,
  type DevTicketDrillSelection,
} from "@/shared/components/dev-tickets/dev-ticket-drill-panel";
import DevTicketTrendPanel from "@/shared/components/dev-tickets/dev-ticket-trend-panel";
import { canEditDevTicket } from "@/shared/components/dev-tickets/dev-ticket-config";
import {
  getDevTicket,
  getDevTicketAnalytics,
  hasDevTicketsView,
  type DevTicket,
  type DevTicketAnalytics,
} from "@/shared/lib/api/devTickets";
import { useAuth } from "@/shared/contexts/auth-context";
import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react";

function StatCard({ title, value, icon, iconBg }: { title: string; value: string | number; icon: string; iconBg: string }) {
  return (
    <div className="col-span-12 sm:col-span-6 xl:col-span-3">
      <div className="box custom-box overflow-hidden rounded-xl border border-defaultborder/80 shadow-sm dark:border-white/10">
        <div className="box-body flex items-center justify-between">
          <div>
            <p className="mb-1 text-[0.75rem] uppercase tracking-wide text-muted">{title}</p>
            <h4 className="mb-0 text-[1.35rem] font-semibold tabular-nums">{value}</h4>
          </div>
          <span className={`avatar avatar-md ${iconBg} p-2 text-white`}><i className={`${icon} text-[1.1rem]`} /></span>
        </div>
      </div>
    </div>
  );
}

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return "—";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

function ChartPanel({ title, subtitle, children, empty, emptyHint, selected }: { title: string; subtitle?: string; children: React.ReactNode; empty?: boolean; emptyHint?: string; selected?: boolean }) {
  return (
    <div className="col-span-12 xl:col-span-6">
      <div className={`box custom-box flex h-full flex-col rounded-xl border shadow-sm dark:border-white/10 ${selected ? "border-primary/40 ring-1 ring-primary/20" : "border-defaultborder/80"}`}>
        <div className="box-header border-b border-defaultborder/60 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
          <h5 className="box-title mb-0 text-[0.875rem] font-semibold">{title}</h5>
          {subtitle && <span className="text-[0.6875rem] text-defaulttextcolor/45">{subtitle}</span>}
        </div>
        <div className="box-body flex min-h-[280px] flex-1 items-center justify-center px-4 pb-4 pt-2">
          {empty ? (
            <div className="flex flex-col items-center px-4 py-10 text-center" role="status">
              <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-white/10 dark:text-white/35">
                <i className="ri-pie-chart-2-line text-[1.1rem]" aria-hidden />
              </span>
              <p className="mb-0 text-[0.8125rem] font-medium text-defaulttextcolor/70">No data yet</p>
              {emptyHint && <p className="mb-0 mt-1 max-w-xs text-[0.75rem] text-defaulttextcolor/50">{emptyHint}</p>}
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}

export default function DevTicketsAnalyticsPage() {
  const { user, permissions, isPlatformSuperUser, isAdministrator, permissionsLoaded } = useAuth();
  const canView = hasDevTicketsView(permissions, isPlatformSuperUser);
  const isAdmin = Boolean(isAdministrator || isPlatformSuperUser);
  const userId = user?.id ?? "";

  const [data, setData] = useState<DevTicketAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drillSelection, setDrillSelection] = useState<DevTicketDrillSelection | null>(null);
  const [drawerTicket, setDrawerTicket] = useState<DevTicket | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    try {
      setData(await getDevTicketAnalytics());
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message ?? e?.message ?? "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const statusChart = useMemo(() => {
    if (!data) return { labels: [], series: [] };
    const labels = Object.keys(data.statusCounts);
    return { labels, series: labels.map((l) => data.statusCounts[l] ?? 0) };
  }, [data]);

  const severityChart = useMemo(() => {
    if (!data) return { labels: [], series: [] };
    const labels = Object.keys(data.severityCounts);
    return { labels, series: [{ name: "Tickets", data: labels.map((l) => data.severityCounts[l] ?? 0) }] };
  }, [data]);

  const priorityChart = useMemo(() => {
    if (!data) return { labels: [], series: [] };
    const labels = Object.keys(data.priorityCounts);
    return { labels, series: labels.map((l) => data.priorityCounts[l] ?? 0) };
  }, [data]);

  const envChart = useMemo(() => {
    if (!data) return { labels: [], series: [] };
    const labels = Object.keys(data.environmentCounts);
    return { labels, series: [{ name: "Tickets", data: labels.map((l) => data.environmentCounts[l] ?? 0) }] };
  }, [data]);

  const trendChart = useMemo(() => data?.trend ?? [], [data]);

  const modulesChart = useMemo(() => {
    if (!data?.topModules?.length) return { labels: [], series: [] };
    const top = data.topModules.slice(0, 10);
    return {
      labels: top.map((m) => formatDevTicketModuleLabel(m.module) || m.module),
      series: [{ name: "Tickets", data: top.map((m) => m.count) }],
    };
  }, [data]);

  const assigneeChart = useMemo(() => {
    if (!data?.openByAssignee?.length) return { labels: [], series: [] };
    return {
      labels: data.openByAssignee.map((a) => a.name),
      series: [{ name: "Open", data: data.openByAssignee.map((a) => a.count) }],
    };
  }, [data]);

  const statusDonutOptions = useMemo(
    () => buildDevTicketDonutOptions(statusChart.labels, DEV_TICKET_CHART_COLORS, data?.totals.total ?? 0, "Total"),
    [statusChart.labels, data?.totals.total],
  );
  const statusBarOptions = useMemo(
    () => buildDevTicketBarOptions(statusChart.labels, true),
    [statusChart.labels],
  );
  const severityOptions = useMemo(
    () => buildDevTicketBarOptions(severityChart.labels),
    [severityChart.labels],
  );
  const priorityDonutOptions = useMemo(
    () => buildDevTicketDonutOptions(priorityChart.labels, DEV_TICKET_CHART_COLORS, data?.totals.total ?? 0, "Total"),
    [priorityChart.labels, data?.totals.total],
  );
  const priorityBarOptions = useMemo(
    () => buildDevTicketBarOptions(priorityChart.labels, true),
    [priorityChart.labels],
  );
  const envOptions = useMemo(
    () => buildDevTicketBarOptions(envChart.labels),
    [envChart.labels],
  );
  const modulesOptions = useMemo(
    () =>
      buildDevTicketBarOptions(modulesChart.labels, true, {
        colorKey: (label) => formatDevTicketModuleLabel(label) || label,
      }),
    [modulesChart.labels],
  );
  const assigneeOptions = useMemo(
    () => buildDevTicketBarOptions(assigneeChart.labels, true),
    [assigneeChart.labels],
  );

  const openDrill = useCallback((dimension: DevTicketDrillDimension, label: string, count: number) => {
    setDrillSelection({ dimension, label, count });
  }, []);

  const handleTicketClick = useCallback(async (ticket: DevTicket) => {
    const dbId = String(ticket.id ?? ticket._id ?? "");
    if (!dbId) return;
    try {
      const full = await getDevTicket(dbId);
      setDrawerTicket(full);
      setDrawerOpen(true);
    } catch {
      setDrawerTicket(ticket);
      setDrawerOpen(true);
    }
  }, []);

  const handleTicketUpdated = useCallback((updated: DevTicket) => {
    setDrawerTicket(updated);
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (!permissionsLoaded) {
    return <div className="container-fluid pt-6 py-16 text-center text-[#8c9097]">Loading…</div>;
  }

  if (!canView) {
    return (
      <Fragment>
        <Seo title="Analytics — Help & Support" />
        <DevTicketAccessDenied />
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Seo title="Analytics — Help & Support" />

      <div className="container-fluid pt-6 pb-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-[1.125rem] font-semibold">
            <i className="ri-bar-chart-2-line text-primary" /> Analytics
          </h1>
          <button type="button" onClick={fetchAnalytics} disabled={loading} className="ti-btn ti-btn-sm ti-btn-light">
            <i className={`ri-refresh-line ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        <DevTicketTabBar />

        {error && (
          <div className="mb-4 flex items-center justify-between rounded-md border border-danger/30 bg-danger/5 px-4 py-3">
            <span className="text-danger text-[0.8125rem]">{error}</span>
            <button type="button" onClick={fetchAnalytics} className="ti-btn ti-btn-sm ti-btn-danger">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-12 gap-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="col-span-12 sm:col-span-6 xl:col-span-3 h-24 animate-pulse rounded-xl bg-black/5 dark:bg-white/10" />
            ))}
            <div className="col-span-12 h-80 animate-pulse rounded-xl bg-black/5 dark:bg-white/10" />
          </div>
        ) : data ? (
          <>
            <div className="mb-6 grid grid-cols-12 gap-x-2 gap-y-4">
              <StatCard title="Total" value={data.totals.total} icon="ri-stack-line" iconBg="bg-primary" />
              <StatCard title="Open" value={data.totals.open} icon="ri-radio-button-line" iconBg="bg-warning" />
              <StatCard title="Resolved" value={data.totals.resolved} icon="ri-checkbox-circle-line" iconBg="bg-success" />
              <StatCard title="Avg resolution" value={formatDuration(data.totals.avgResolutionMs)} icon="ri-time-line" iconBg="bg-info" />
              <StatCard title="Reopen rate" value={`${Math.round((data.reopen.rate ?? 0) * 100)}%`} icon="ri-loop-left-line" iconBg="bg-danger" />
            </div>

            <DevTicketTrendPanel trend={trendChart} statusCounts={data.statusCounts} />

            <div className="mb-6 grid grid-cols-12 gap-x-3 gap-y-4">
              <ChartPanel
                title="By Status"
                subtitle={`${data.totals.total} total`}
                empty={statusChart.series.every((v) => v === 0)}
                selected={drillSelection?.dimension === "status"}
              >
                {statusChart.labels.length <= 6 ? (
                  <DevTicketApexChart
                    chartKey={`status-donut-${statusChart.labels.join(",")}`}
                    type="donut"
                    series={statusChart.series}
                    options={statusDonutOptions}
                    interactive
                    onDataPointSelect={(index, label) => openDrill("status", label, statusChart.series[index] ?? 0)}
                    ariaLabel={`Status breakdown chart. ${statusChart.labels.length} categories.`}
                  />
                ) : (
                  <DevTicketApexChart
                    chartKey={`status-bar-${statusChart.labels.join(",")}`}
                    type="bar"
                    series={[{ name: "Tickets", data: statusChart.series }]}
                    options={statusBarOptions}
                    interactive
                    onDataPointSelect={(index, label) => openDrill("status", label, statusChart.series[index] ?? 0)}
                    ariaLabel={`Status breakdown chart. ${statusChart.labels.length} categories.`}
                  />
                )}
              </ChartPanel>

              <ChartPanel
                title="By Severity"
                empty={!severityChart.labels.length}
                selected={drillSelection?.dimension === "severity"}
              >
                <DevTicketApexChart
                  chartKey={`severity-${severityChart.labels.join(",")}`}
                  type="bar"
                  series={severityChart.series}
                  options={severityOptions}
                  interactive
                  onDataPointSelect={(index, label) =>
                    openDrill("severity", label, severityChart.series[0]?.data?.[index] ?? 0)
                  }
                  ariaLabel={`Severity breakdown chart. ${severityChart.labels.length} categories.`}
                />
              </ChartPanel>

              <ChartPanel
                title="By Priority"
                empty={priorityChart.series.every((v) => v === 0)}
                selected={drillSelection?.dimension === "priority"}
              >
                {priorityChart.labels.length <= 6 ? (
                  <DevTicketApexChart
                    chartKey={`priority-donut-${priorityChart.labels.join(",")}`}
                    type="donut"
                    series={priorityChart.series}
                    options={priorityDonutOptions}
                    interactive
                    onDataPointSelect={(index, label) => openDrill("priority", label, priorityChart.series[index] ?? 0)}
                    ariaLabel={`Priority breakdown chart. ${priorityChart.labels.length} categories.`}
                  />
                ) : (
                  <DevTicketApexChart
                    chartKey={`priority-bar-${priorityChart.labels.join(",")}`}
                    type="bar"
                    series={[{ name: "Tickets", data: priorityChart.series }]}
                    options={priorityBarOptions}
                    interactive
                    onDataPointSelect={(index, label) => openDrill("priority", label, priorityChart.series[index] ?? 0)}
                    ariaLabel={`Priority breakdown chart. ${priorityChart.labels.length} categories.`}
                  />
                )}
              </ChartPanel>

              <ChartPanel
                title="By Environment"
                empty={!envChart.labels.length}
                selected={drillSelection?.dimension === "environment"}
              >
                <DevTicketApexChart
                  chartKey={`env-${envChart.labels.join(",")}`}
                  type="bar"
                  series={envChart.series}
                  options={envOptions}
                  interactive
                  onDataPointSelect={(index, label) =>
                    openDrill("environment", label, envChart.series[0]?.data?.[index] ?? 0)
                  }
                  ariaLabel={`Environment breakdown chart. ${envChart.labels.length} categories.`}
                />
              </ChartPanel>
            </div>

            <div className="mb-6 grid grid-cols-12 gap-x-3 gap-y-4">
              <ChartPanel title="Top Modules" empty={!modulesChart.labels.length}>
                <DevTicketApexChart
                  chartKey={`modules-${modulesChart.labels.join(",")}`}
                  type="bar"
                  series={modulesChart.series}
                  options={modulesOptions}
                />
              </ChartPanel>

              <ChartPanel title="Open by Assignee" empty={!assigneeChart.labels.length}>
                <DevTicketApexChart
                  chartKey={`assignee-${assigneeChart.labels.join(",")}`}
                  type="bar"
                  series={assigneeChart.series}
                  options={assigneeOptions}
                />
              </ChartPanel>
            </div>

            <div className="grid grid-cols-12 gap-x-3 gap-y-4">
              <div className="col-span-12 xl:col-span-6">
                <div className="box custom-box h-full rounded-xl border border-defaultborder/80 shadow-sm dark:border-white/10">
                  <div className="box-header border-b"><h5 className="box-title mb-0">Resolver leaderboard (30d)</h5></div>
                  <div className="box-body">
                    {(data.resolverLeaderboard ?? []).length === 0 ? (
                      <p className="py-8 text-center text-[0.8125rem] text-defaulttextcolor/55">No resolvers yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {data.resolverLeaderboard.map((r, i) => (
                          <li key={r.name} className="flex items-center gap-3 rounded-lg border border-defaultborder/60 px-3 py-2 dark:border-white/10">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[0.75rem] font-bold text-primary">{i + 1}</span>
                            <span className="flex-1 text-[0.8125rem] font-medium">{r.name}</span>
                            <span className="badge bg-success/10 text-success">{r.count} resolved</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-span-12 xl:col-span-6">
                <div className="box custom-box h-full rounded-xl border border-defaultborder/80 shadow-sm dark:border-white/10">
                  <div className="box-header border-b"><h5 className="box-title mb-0">Oldest open tickets</h5></div>
                  <div className="box-body">
                    {(data.oldestOpen ?? []).length === 0 ? (
                      <p className="py-8 text-center text-[0.8125rem] text-defaulttextcolor/55">No open tickets.</p>
                    ) : (
                      <ul className="space-y-2">
                        {data.oldestOpen.map((t) => (
                          <li key={t.ticketId} className="rounded-lg border border-defaultborder/60 px-3 py-2 dark:border-white/10">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-[0.75rem] font-semibold text-primary">{t.ticketId}</span>
                              <span className={`badge ${t.ageDays > 28 ? "bg-rose-500/10 text-rose-600" : "bg-slate-100 text-slate-600"}`}>{t.ageDays}d</span>
                            </div>
                            <p className="mb-0 mt-1 truncate text-[0.8125rem]">{t.title}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>

      <DevTicketDrillPanel
        selection={drillSelection}
        onClose={() => setDrillSelection(null)}
        onTicketClick={handleTicketClick}
      />

      <DevTicketDetailDrawer
        open={drawerOpen}
        ticket={drawerTicket}
        onClose={() => {
          setDrawerOpen(false);
          setDrawerTicket(null);
        }}
        currentUserId={userId}
        isAdmin={isAdmin}
        canEdit={drawerTicket ? canEditDevTicket(drawerTicket, userId, isAdmin) : false}
        onTicketUpdated={handleTicketUpdated}
      />
    </Fragment>
  );
}
