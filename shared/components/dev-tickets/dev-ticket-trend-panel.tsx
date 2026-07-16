"use client";

import type { ApexOptions } from "apexcharts";
import DevTicketApexChart, { buildDevTicketTrendOptions } from "@/shared/components/dev-tickets/dev-ticket-apex-chart";
import { BOARD_COLUMNS, STATUS_CONFIG } from "@/shared/components/dev-tickets/dev-ticket-config";
import React, { useMemo } from "react";

export type TrendPoint = {
  date: string;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
};

const TREND_DAYS = 30;

const STAGE_KEYS = ["open", "inProgress", "resolved", "closed"] as const;
type StageKey = (typeof STAGE_KEYS)[number];

const STAGE_LABELS: Record<StageKey, string> = {
  open: "Open",
  inProgress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

const STAGE_PILL_CLASSES: Record<StageKey, string> = {
  open: "border-indigo-200/80 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300",
  inProgress: "border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  resolved: "border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  closed: "border-slate-200/80 bg-slate-50 text-slate-600 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-300",
};

function formatShortDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Local calendar date (YYYY-MM-DD) — matches how users perceive "today" in tooltips. */
function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Fill every day in the last 30 days so the chart reads as a timeline, not a single dot. */
export function normalizeTrendSeries(trend: TrendPoint[] | undefined) {
  const byDate = new Map((trend ?? []).map((row) => [row.date, row]));
  const end = new Date();
  end.setHours(12, 0, 0, 0);

  const points: {
    iso: string;
    label: string;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
  }[] = [];
  for (let offset = TREND_DAYS - 1; offset >= 0; offset -= 1) {
    const d = new Date(end);
    d.setDate(d.getDate() - offset);
    const iso = toLocalIsoDate(d);
    const row = byDate.get(iso);
    points.push({
      iso,
      label: formatShortDate(d),
      open: row?.open ?? 0,
      inProgress: row?.inProgress ?? 0,
      resolved: row?.resolved ?? 0,
      closed: row?.closed ?? 0,
    });
  }

  const totals: Record<StageKey, number> = {
    open: points.reduce((sum, p) => sum + p.open, 0),
    inProgress: points.reduce((sum, p) => sum + p.inProgress, 0),
    resolved: points.reduce((sum, p) => sum + p.resolved, 0),
    closed: points.reduce((sum, p) => sum + p.closed, 0),
  };
  const hasActivity = STAGE_KEYS.some((key) => totals[key] > 0);
  const peak = Math.max(1, ...points.flatMap((p) => STAGE_KEYS.map((key) => p[key])));
  const stackPeak = Math.max(
    1,
    ...points.map((p) => STAGE_KEYS.reduce((sum, key) => sum + p[key], 0)),
  );
  const activeDays = points.filter((p) => STAGE_KEYS.some((key) => p[key] > 0)).length;

  return {
    categories: points.map((p) => p.label),
    isoDates: points.map((p) => p.iso),
    seriesData: STAGE_KEYS.map((key) => points.map((p) => p[key])),
    seriesColors: BOARD_COLUMNS.map((stage) => STATUS_CONFIG[stage]?.color ?? "#6366f1"),
    totals,
    hasActivity,
    peak,
    stackPeak,
    activeDays,
    rangeLabel: `${points[0]?.label ?? ""} – ${points[points.length - 1]?.label ?? ""}`,
  };
}

type DevTicketTrendPanelProps = {
  trend: TrendPoint[] | undefined;
  /** Current board counts — pills match kanban columns. */
  statusCounts?: Record<string, number>;
};

export default function DevTicketTrendPanel({ trend, statusCounts }: DevTicketTrendPanelProps) {
  const normalized = useMemo(() => normalizeTrendSeries(trend), [trend]);

  const currentTotals = useMemo(
    () =>
      STAGE_KEYS.reduce(
        (acc, key) => {
          acc[key] = statusCounts?.[STAGE_LABELS[key]] ?? 0;
          return acc;
        },
        {} as Record<StageKey, number>,
      ),
    [statusCounts],
  );

  const trendOptions = useMemo(
    () =>
      buildDevTicketTrendOptions(normalized.categories, normalized.isoDates, {
        yMax: normalized.stackPeak <= 4 ? Math.max(4, normalized.stackPeak) : undefined,
        seriesData: normalized.seriesData,
        seriesColors: normalized.seriesColors,
      }),
    [normalized.categories, normalized.isoDates, normalized.stackPeak, normalized.seriesData, normalized.seriesColors],
  );

  const ariaSummary = STAGE_KEYS.map((key) => `${currentTotals[key]} ${STAGE_LABELS[key].toLowerCase()}`).join(", ");

  return (
    <div className="mb-6">
      <div className="box custom-box rounded-xl border border-defaultborder/80 shadow-sm dark:border-white/10">
        <div className="box-header flex flex-wrap items-start justify-between gap-3 border-b border-defaultborder/60 bg-slate-50/80 px-4 py-3.5 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="min-w-0">
            <h5 className="box-title mb-0 text-[0.9375rem] font-semibold">Ticket flow by stage</h5>
            <p className="mb-0 mt-1 text-[0.6875rem] text-defaulttextcolor/50">
              Tickets in each stage per day · Last {TREND_DAYS} days · {normalized.rangeLabel}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {STAGE_KEYS.map((key) => (
              <span
                key={key}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6875rem] font-medium ${STAGE_PILL_CLASSES[key]}`}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: STATUS_CONFIG[STAGE_LABELS[key]]?.color }}
                  aria-hidden
                />
                <span className="whitespace-nowrap">{STAGE_LABELS[key]}</span>
                <span className="font-semibold tabular-nums">{currentTotals[key]}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="box-body px-3 pb-4 pt-2 sm:px-4">
          {!normalized.hasActivity ? (
            <div
              className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-defaultborder/60 bg-slate-50/50 px-6 py-12 text-center dark:border-white/10 dark:bg-white/[0.02]"
              role="status"
            >
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-white/10 dark:text-white/40">
                <i className="ri-line-chart-line text-[1.35rem]" aria-hidden />
              </span>
              <p className="mb-1 text-[0.875rem] font-medium text-defaulttextcolor">No ticket activity yet</p>
              <p className="mb-0 max-w-sm text-[0.8125rem] leading-relaxed text-defaulttextcolor/55">
                When tickets exist in each stage, daily snapshots will appear here as trend lines.
              </p>
            </div>
          ) : (
            <div
              className="relative z-0 w-full min-h-[300px] overflow-visible [&_.apexcharts-canvas]:overflow-visible [&_.apexcharts-tooltip]:!z-[5]"
              role="img"
              aria-label={`Trend chart: ${ariaSummary} in the last ${TREND_DAYS} days`}
            >
              <DevTicketApexChart
                chartKey={`trend-${normalized.isoDates.join("|")}`}
                type="area"
                height={300}
                series={STAGE_KEYS.map((key, idx) => ({
                  name: STAGE_LABELS[key],
                  data: normalized.seriesData[idx],
                }))}
                options={trendOptions}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
