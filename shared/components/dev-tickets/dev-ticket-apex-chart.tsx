"use client";

import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import React, { useMemo } from "react";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export const DEV_TICKET_CHART_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#8b5cf6",
  "#f97316",
  "#64748b",
];

const BASE_CHART: NonNullable<ApexOptions["chart"]> = {
  fontFamily: "inherit",
  parentHeightOffset: 0,
  toolbar: { show: false },
  animations: { enabled: false },
};

/** ApexCharts reads plotOptions.pie.offsetY during layout — must be explicit. */
const PIE_LAYOUT: NonNullable<ApexOptions["plotOptions"]>["pie"] = {
  offsetX: 0,
  offsetY: 0,
};

/**
 * ApexCharts pathMouseLeave reads config.states.active.filter on every segment.
 * Omitting states (or passing undefined) wipes library defaults and crashes on load/hover.
 */
const DEFAULT_CHART_STATES: NonNullable<ApexOptions["states"]> = {
  hover: { filter: { type: "lighten", value: 0.04 } },
  active: { allowMultipleDataPointsSelection: false, filter: { type: "none" } },
};

const INTERACTIVE_CHART_STATES: NonNullable<ApexOptions["states"]> = {
  hover: { filter: { type: "darken", value: 0.08 } },
  active: { allowMultipleDataPointsSelection: false, filter: { type: "darken", value: 0.12 } },
};

export function buildDevTicketDonutOptions(
  labels: string[],
  colors: string[],
  centerTotal: number,
  centerLabel: string,
): ApexOptions {
  return {
    chart: { ...BASE_CHART, type: "donut" },
    labels,
    colors,
    legend: {
      show: true,
      position: "bottom",
      horizontalAlign: "center",
      fontSize: "12px",
      fontWeight: 500,
      offsetX: 0,
      offsetY: 0,
      markers: { size: 6, strokeWidth: 0, offsetX: -2, offsetY: 0 },
      itemMargin: { horizontal: 10, vertical: 6 },
    },
    dataLabels: {
      enabled: true,
      offsetX: 0,
      offsetY: 0,
      formatter: (val: number) => (val >= 4 ? `${Math.round(val)}%` : ""),
      dropShadow: { enabled: false },
      style: { fontSize: "11px", fontWeight: 600 },
    },
    stroke: { width: 3, colors: ["var(--custom-white)"] },
    plotOptions: {
      pie: {
        ...PIE_LAYOUT,
        donut: {
          size: "68%",
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: "11px",
              fontWeight: 500,
              offsetY: -6,
              color: "#64748b",
            },
            value: {
              show: true,
              fontSize: "22px",
              fontWeight: 700,
              offsetY: 4,
              formatter: (val: string) => val,
            },
            total: {
              show: true,
              showAlways: true,
              label: centerLabel,
              fontSize: "11px",
              fontWeight: 500,
              color: "#64748b",
              formatter: () => String(centerTotal),
            },
          },
        },
      },
    },
    tooltip: { y: { formatter: (v: number) => `${v} ticket${v === 1 ? "" : "s"}` } },
    states: DEFAULT_CHART_STATES,
  };
}

function hashStringToColorIndex(value: string, modulo: number): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash % modulo;
}

export function getDevTicketBarColors(
  categories: string[],
  colorKey?: (category: string) => string,
): string[] {
  return categories.map((category, index) => {
    const key = (colorKey?.(category) ?? category).trim().toLowerCase();
    const colorIndex = key
      ? hashStringToColorIndex(key, DEV_TICKET_CHART_COLORS.length)
      : index % DEV_TICKET_CHART_COLORS.length;
    return DEV_TICKET_CHART_COLORS[colorIndex];
  });
}

export function buildDevTicketBarOptions(
  categories: string[],
  horizontal = false,
  opts?: { colorKey?: (category: string) => string },
): ApexOptions {
  const barColors = getDevTicketBarColors(categories, opts?.colorKey);

  return {
    chart: { ...BASE_CHART, type: "bar" },
    plotOptions: {
      bar: {
        horizontal,
        borderRadius: 4,
        distributed: true,
        dataLabels: { position: "top" as const, offsetX: 0, offsetY: 0 },
      },
    },
    colors: barColors,
    dataLabels: { enabled: false, offsetX: 0, offsetY: 0 },
    xaxis: {
      categories,
      labels: { offsetX: 0, offsetY: 0, style: { fontSize: "11px" } },
      axisBorder: { offsetX: 0, offsetY: 0 },
      axisTicks: { offsetX: 0, offsetY: 0 },
    },
    yaxis: {
      labels: { offsetX: 0, offsetY: 0, style: { fontSize: "11px" } },
    },
    legend: { show: false },
    grid: { padding: { top: 0, right: 8, bottom: 0, left: 8 } },
    tooltip: { y: { formatter: (v: number) => `${v} ticket${v === 1 ? "" : "s"}` } },
    states: DEFAULT_CHART_STATES,
  };
}

function getChartLabels(type: "area" | "bar" | "donut", options: ApexOptions): string[] {
  if (type === "donut") return (options.labels as string[] | undefined) ?? [];
  const categories = options.xaxis?.categories;
  return Array.isArray(categories) ? (categories as string[]) : [];
}

export function buildDevTicketTrendOptions(
  categories: string[],
  isoDates: string[] = [],
  opts?: {
    yMax?: number;
    seriesData?: number[][];
    seriesColors?: string[];
  },
): ApexOptions {
  const labelStride = categories.length > 14 ? 5 : categories.length > 7 ? 3 : 1;
  const seriesData = opts?.seriesData ?? [];
  const seriesColors = opts?.seriesColors ?? ["#6366f1", "#f59e0b", "#10b981", "#94a3b8"];
  const seriesCount = Math.max(1, seriesData.length);
  const stacked = seriesCount > 1;
  const fillOpacityFrom = stacked ? 0.55 : seriesCount > 2 ? 0.22 : 0.4;
  const fillOpacityTo = stacked ? 0.12 : seriesCount > 2 ? 0.02 : 0.04;

  const discreteMarkers: {
    seriesIndex: number;
    dataPointIndex: number;
    size: number;
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
  }[] = [];
  seriesData.forEach((data, seriesIndex) => {
    data.forEach((val, dataPointIndex) => {
      if (val > 0) {
        discreteMarkers.push({
          seriesIndex,
          dataPointIndex,
          size: stacked ? 0 : 6,
          fillColor: seriesColors[seriesIndex] ?? seriesColors[0],
          strokeColor: "#ffffff",
          strokeWidth: 2,
        });
      }
    });
  });

  return {
    chart: { ...BASE_CHART, type: "area", stacked, zoom: { enabled: false } },
    colors: seriesColors,
    stroke: { curve: "smooth", width: stacked ? 1.5 : 2.5, lineCap: "round" },
    plotOptions: {
      area: {
        fillTo: "end",
      },
    },
    markers: {
      size: 0,
      strokeWidth: 2,
      hover: { size: 7, sizeOffset: 2 },
      discrete: discreteMarkers,
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 0.35,
        opacityFrom: fillOpacityFrom,
        opacityTo: fillOpacityTo,
        stops: [0, 85, 100],
      },
    },
    dataLabels: { enabled: false, offsetX: 0, offsetY: 0 },
    xaxis: {
      type: "category",
      categories: isoDates.length === categories.length ? isoDates : categories,
      tickAmount: Math.min(8, categories.length),
      labels: {
        rotate: 0,
        offsetX: 0,
        offsetY: 0,
        hideOverlappingLabels: true,
        style: { fontSize: "10px", colors: "#94a3b8" },
        formatter: (_val: string, _ts: number, opts?: { i?: number }) => {
          const idx = opts?.i ?? 0;
          if (idx < 0 || idx % labelStride !== 0) return "";
          return categories[idx] ?? "";
        },
      },
      axisBorder: { show: false, offsetX: 0, offsetY: 0 },
      axisTicks: { show: false, offsetX: 0, offsetY: 0 },
      crosshairs: {
        show: true,
        position: "front",
        stroke: { color: "#cbd5e1", width: 1, dashArray: 4 },
      },
      tooltip: { enabled: false },
    },
    yaxis: {
      min: 0,
      max: opts?.yMax,
      forceNiceScale: true,
      tickAmount: 4,
      labels: {
        offsetX: 0,
        offsetY: 0,
        style: { fontSize: "10px", colors: "#94a3b8" },
        formatter: (v: number) => (Number.isInteger(v) ? String(v) : ""),
      },
    },
    grid: {
      borderColor: "#e2e8f0",
      strokeDashArray: 4,
      padding: { top: 8, right: 12, bottom: 0, left: 8 },
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    legend: { show: false },
    tooltip: {
      shared: true,
      intersect: false,
      followCursor: true,
      fixed: { enabled: false },
      theme: "light",
      style: { fontSize: "12px" },
      x: {
        show: true,
        formatter: (_val: string, opts?: { dataPointIndex?: number }) => {
          const idx = opts?.dataPointIndex ?? 0;
          const iso = isoDates[idx];
          if (!iso) return _val;
          const d = new Date(`${iso}T12:00:00`);
          return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
        },
      },
      y: {
        formatter: (v: number, opts?: { seriesIndex?: number; w?: { globals?: { seriesNames?: string[] } } }) => {
          const name = opts?.w?.globals?.seriesNames?.[opts?.seriesIndex ?? 0] ?? "Stage";
          return `${v} in ${name}`;
        },
      },
    },
    states: DEFAULT_CHART_STATES,
  };
}

type DevTicketApexChartProps = {
  type: "area" | "bar" | "donut";
  height?: number;
  series: ApexOptions["series"];
  options: ApexOptions;
  chartKey: string;
  interactive?: boolean;
  onDataPointSelect?: (index: number, label: string) => void;
  ariaLabel?: string;
};

export default function DevTicketApexChart({
  type,
  height = 280,
  series,
  options,
  chartKey,
  interactive = false,
  onDataPointSelect,
  ariaLabel,
}: DevTicketApexChartProps) {
  const mergedOptions = useMemo(() => {
    const labels = getChartLabels(type, options);
    const canSelect = interactive && Boolean(onDataPointSelect) && labels.length > 0;

    const selectionEvents = canSelect
      ? {
          dataPointSelection: (
            _e: unknown,
            _chart: unknown,
            opts: { dataPointIndex?: number; seriesIndex?: number },
          ) => {
            const idx = opts.dataPointIndex ?? opts.seriesIndex ?? -1;
            const label = labels[idx];
            if (label) onDataPointSelect?.(idx, label);
          },
          ...(type === "donut"
            ? {
                legendClick: (_chart: unknown, seriesIndex: number) => {
                  const label = labels[seriesIndex];
                  if (label) onDataPointSelect?.(seriesIndex, label);
                },
              }
            : {}),
        }
      : undefined;

    const legendVisible = options.legend?.show !== false;

    return {
      ...options,
      chart: {
        ...BASE_CHART,
        ...options.chart,
        type,
        height,
        events: {
          ...options.chart?.events,
          ...selectionEvents,
        },
      },
      legend:
        canSelect && legendVisible
          ? {
              ...options.legend,
              onItemClick: { toggleDataSeries: false },
            }
          : options.legend,
      states: {
        ...DEFAULT_CHART_STATES,
        ...options.states,
        ...(canSelect ? INTERACTIVE_CHART_STATES : {}),
      },
    };
  }, [options, type, height, interactive, onDataPointSelect]);

  const safeSeries = series ?? [];

  if (type === "donut") {
    const donutSeries = safeSeries as number[];
    if (!donutSeries.length || donutSeries.every((v) => !v)) return null;
  } else if (type === "area") {
    const areaSeries = safeSeries as { data?: number[] }[];
    if (!areaSeries.length || areaSeries.every((s) => !s.data?.length)) return null;
  } else {
    const barSeries = safeSeries as { data?: number[] }[];
    if (!barSeries.length || barSeries.every((s) => !s.data?.length)) return null;
  }

  const interactiveHint = interactive && onDataPointSelect
    ? "Click a segment or legend item to view matching tickets."
    : undefined;

  return (
    <div
      className={`relative w-full overflow-visible ${interactive && onDataPointSelect ? "cursor-pointer [&_.apexcharts-legend-text]:cursor-pointer [&_.apexcharts-legend-marker]:cursor-pointer" : ""}`}
      role={interactive && onDataPointSelect ? "group" : undefined}
      aria-label={ariaLabel ?? interactiveHint}
    >
      {interactiveHint && (
        <p className="mb-2 text-center text-[0.6875rem] text-defaulttextcolor/45">{interactiveHint}</p>
      )}
      <ReactApexChart
        key={chartKey}
        type={type}
        height={height}
        width="100%"
        options={mergedOptions}
        series={safeSeries}
      />
    </div>
  );
}
