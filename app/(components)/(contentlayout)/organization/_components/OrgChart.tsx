"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSelector } from "react-redux";
import ReactECharts from "echarts-for-react";
import type { ECharts } from "echarts";
import Swal from "sweetalert2";
import {
  exportOrgComplianceReport,
  listOrgUnits,
  reparentOrgUnitFromChart,
  searchOrgChart,
  type OrgChartSearchResult,
  type OrgTree,
  type OrgUnitNode,
} from "@/shared/lib/api/org-structure";
import { useAuth } from "@/shared/contexts/auth-context";
import {
  ORG_UNIT_TYPE_META,
  OrgChartLegend,
  OrgEmptyState,
  OrgLinkButton,
  OrgPrimaryButton,
  OrgSecondaryButton,
  OrgTypeBadge,
} from "./org-ui";
import { useFeaturePermissions } from "@/shared/hooks/use-feature-permissions";
import { canReparentOrgUnit, type OrgUnitPlacement } from "@/shared/lib/org-tree.pure";
const AssignToDepartmentModal = dynamic(() => import("./AssignToDepartmentModal"), { ssr: false });

const truncate = (s: string, max = 28) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

const treeDepth = (nodes: OrgUnitNode[], d = 1): number =>
  (nodes ?? []).reduce((m, n) => {
    const childD = n.children?.length ? treeDepth(n.children, d + 1) : d;
    const empD = n.employees?.length ? d + 1 : d;
    return Math.max(m, childD, empD);
  }, d);

const countLeaves = (nodes: OrgUnitNode[]): number =>
  (nodes ?? []).reduce((acc, n) => {
    const childLeaves = n.children?.length ? countLeaves(n.children) : 0;
    const empLeaves = n.employees?.length ?? 0;
    const ownLeaf = !n.children?.length && !n.employees?.length ? 1 : 0;
    return acc + childLeaves + empLeaves + ownLeaf;
  }, 0);

const flattenUnits = (nodes: OrgUnitNode[], acc: OrgUnitNode[] = []): OrgUnitNode[] => {
  for (const n of nodes ?? []) {
    acc.push(n);
    if (n.children?.length) flattenUnits(n.children, acc);
  }
  return acc;
};

const spanTooltipLine = (n: OrgUnitNode) => {
  if (n.spanDirect == null && !n.spanBand) return null;
  const band = n.spanBand && n.spanBand !== "ok" ? ` (${n.spanBand})` : "";
  return `Span: ${n.spanDirect ?? 0} direct${band}`;
};

const nodeTooltip = (n: OrgUnitNode) => {
  const lines = [`${ORG_UNIT_TYPE_META[n.type]?.label ?? n.type}: ${n.name}`];
  if (n.headEmployee?.fullName) lines.push(`Head: ${n.headEmployee.fullName}`);
  if (n.memberCount) lines.push(`Members: ${n.memberCount}`);
  const spanLine = spanTooltipLine(n);
  if (spanLine) lines.push(spanLine);
  return lines.join("<br/>");
};

const highlightStyle = (unitId: string, highlightIds: Set<string>) => {
  if (!highlightIds.has(unitId)) return {};
  return {
    borderColor: "#6366f1",
    borderWidth: 2,
    shadowBlur: 10,
    shadowColor: "rgba(99, 102, 241, 0.45)",
  };
};

const nodeLabel = (n: OrgUnitNode) => {
  const count = n.memberCount ? ` (${n.memberCount})` : "";
  return `${truncate(n.name)}${count}`;
};

const hexToRgba = (hex: string, alpha: number) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// ECharts rich-text uses {tag|...} markup; strip braces/pipes so unit/head
// names can't break the label parser.
// ponytail: simple strip is enough — names are already length-capped by truncate().
const richSafe = (s: string) => s.replace(/[{}|]/g, "");

// Card-style pill rendered as the node label so each unit reads as a labelled box,
// not bare text floating above a speck. Two rich lines: unit name + head name.
const unitLabel = (baseColor: string, highlighted: boolean, isDark: boolean) => {
  const text = isDark ? "#e2e8f0" : "#1e293b";
  const headText = isDark ? "#94a3b8" : "#64748b";
  const bg = highlighted ? hexToRgba(baseColor, isDark ? 0.28 : 0.16) : isDark ? "#1e293b" : "#ffffff";
  return {
    backgroundColor: bg,
    borderColor: baseColor,
    borderWidth: highlighted ? 2 : 1.25,
    borderRadius: 8,
    padding: [6, 10] as [number, number],
    color: text,
    fontSize: 11.5,
    fontWeight: 600,
    shadowBlur: 6,
    shadowColor: isDark ? "rgba(0, 0, 0, 0.45)" : "rgba(15, 23, 42, 0.08)",
    shadowOffsetY: 1,
    rich: {
      name: { color: text, fontSize: 11.5, fontWeight: 600, lineHeight: 16 },
      head: { color: headText, fontSize: 9.5, fontWeight: 400, lineHeight: 13 },
    },
  };
};

const toEChartsNode = (n: OrgUnitNode, highlightIds: Set<string>, isDark: boolean): Record<string, unknown> => {
  const unitChildren = (n.children ?? []).map((c) => toEChartsNode(c, highlightIds, isDark));
  const employeeChildren = (n.employees ?? []).map((e) => ({
    name: truncate(e.fullName, 22),
    symbol: "circle",
    symbolSize: 9,
    itemStyle: { color: isDark ? "#475569" : "#cbd5e1", borderColor: isDark ? "#1e293b" : "#ffffff", borderWidth: 1.5 },
    lineStyle: { color: isDark ? "#334155" : "#e2e8f0" },
    label: {
      backgroundColor: isDark ? "#334155" : "#f8fafc",
      borderColor: isDark ? "#475569" : "#e2e8f0",
      borderWidth: 1,
      borderRadius: 6,
      padding: [3, 7],
      color: isDark ? "#cbd5e1" : "#475569",
      fontSize: 10,
      fontWeight: 500,
    },
    tooltip: { formatter: `${e.fullName}<br/><a href="/ats/employees/edit?id=${e.id}">Open employee</a>` },
    _employeeId: e.id,
  }));
  const baseColor = ORG_UNIT_TYPE_META[n.type]?.chartColor ?? "#94a3b8";
  const highlighted = highlightIds.has(n.id);
  const line1 = richSafe(nodeLabel(n));
  const head = n.headEmployee?.fullName ? richSafe(truncate(n.headEmployee.fullName, 22)) : "";
  return {
    name: nodeLabel(n),
    _unitId: n.id,
    symbolSize: highlighted ? 18 : 15,
    tooltip: { formatter: nodeTooltip(n) },
    itemStyle: {
      color: baseColor,
      borderColor: isDark ? "#0f172a" : "#ffffff",
      borderWidth: 2.5,
      borderRadius: 5,
      shadowBlur: highlighted ? 12 : 5,
      shadowColor: highlighted ? "rgba(99, 102, 241, 0.45)" : hexToRgba(baseColor, 0.35),
      ...highlightStyle(n.id, highlightIds),
    },
    label: {
      ...unitLabel(baseColor, highlighted, isDark),
      formatter: head ? `{name|${line1}}\n{head|${head}}` : `{name|${line1}}`,
    },
    lineStyle: highlighted ? { color: "#6366f1", width: 2 } : undefined,
    children: [...unitChildren, ...employeeChildren],
  };
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function OrgChart({ tree, onChanged }: { tree: OrgTree; onChanged?: () => void }) {
  const { canEdit: canAssignEmployees } = useFeaturePermissions("ats.employees");
  const { canEdit: canEditStructure, canCreate: canCreateStructure, canDelete: canDeleteStructure } =
    useFeaturePermissions("organization.structure");
  const { isPlatformSuperUser } = useAuth();
  const isDark = useSelector((s: any) => s.class) === "dark";
  const chartRef = useRef<ReactECharts>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<OrgChartSearchResult | null>(null);
  const [highlightPathIds, setHighlightPathIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState<"csv" | "png" | "pdf" | null>(null);
  const [flatUnits, setFlatUnits] = useState<OrgUnitNode[]>([]);
  const [dragUnitId, setDragUnitId] = useState<string | null>(null);
  const [reparenting, setReparenting] = useState(false);
  const [initialTreeDepth, setTreeDepth] = useState<number>(-1);
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [unassignedFilter, setUnassignedFilter] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const canExport = useMemo(() => {
    if (isPlatformSuperUser) return true;
    // Backend structure.export alias includes structure.manage; matrix uses create/edit/delete on structure.
    return canEditStructure || canCreateStructure || canDeleteStructure;
  }, [isPlatformSuperUser, canEditStructure, canCreateStructure, canDeleteStructure]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!canEditStructure) return;
    let cancelled = false;
    listOrgUnits()
      .then((units) => {
        if (!cancelled) setFlatUnits(units);
      })
      .catch(() => {
        if (!cancelled) setFlatUnits(flattenUnits(tree.roots));
      });
    return () => {
      cancelled = true;
    };
  }, [canEditStructure, tree]);

  const placementUnits = useMemo<OrgUnitPlacement[]>(
    () =>
      flatUnits.map((u) => ({
        id: u.id,
        type: u.type,
        parentId: u.parentId ?? null,
        departmentId: u.departmentId ?? null,
        directToCeo: u.directToCeo,
      })),
    [flatUnits]
  );

  const canDropOn = useCallback(
    (targetUnitId: string | null) => {
      if (!dragUnitId) return false;
      if (targetUnitId === dragUnitId) return false;
      return canReparentOrgUnit(placementUnits, dragUnitId, targetUnitId).ok;
    },
    [dragUnitId, placementUnits]
  );

  const canMoveDraggedToRoot = useMemo(
    () => (dragUnitId ? canReparentOrgUnit(placementUnits, dragUnitId, null).ok : false),
    [dragUnitId, placementUnits]
  );

  const showReparentError = async (reason: string) => {
    await Swal.fire({ icon: "error", title: "Move failed", text: reason });
  };

  const handleLiveReparent = async (targetUnitId: string) => {
    if (!dragUnitId || dragUnitId === targetUnitId) return;
    const verdict = canReparentOrgUnit(placementUnits, dragUnitId, targetUnitId);
    if (!verdict.ok) {
      await showReparentError(verdict.reason);
      return;
    }
    setReparenting(true);
    try {
      await reparentOrgUnitFromChart(dragUnitId, targetUnitId);
      setDragUnitId(null);
      onChanged?.();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Could not move unit.";
      await Swal.fire({ icon: "error", title: "Move failed", text: msg });
    } finally {
      setReparenting(false);
    }
  };

  const handleLiveReparentToRoot = async () => {
    if (!dragUnitId) return;
    const verdict = canReparentOrgUnit(placementUnits, dragUnitId, null);
    if (!verdict.ok) {
      await showReparentError(verdict.reason);
      return;
    }
    setReparenting(true);
    try {
      await reparentOrgUnitFromChart(dragUnitId, null);
      setDragUnitId(null);
      onChanged?.();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Could not move unit.";
      await Swal.fire({ icon: "error", title: "Move failed", text: msg });
    } finally {
      setReparenting(false);
    }
  };

  useEffect(() => {
    if (debouncedQ.length < 2) {
      setSearchResult(null);
      setHighlightPathIds([]);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    searchOrgChart(debouncedQ)
      .then((res) => {
        if (!cancelled) setSearchResult(res);
      })
      .catch(() => {
        if (!cancelled) setSearchResult({ units: [], employees: [], paths: [] });
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQ]);

  const highlightIds = useMemo(() => new Set(highlightPathIds), [highlightPathIds]);

  const selectSearchHit = useCallback((pathIds: string[]) => {
    setHighlightPathIds(pathIds);
  }, []);

  // Highlight a hit from the inline dropdown and bring the chart into view so the
  // user sees the result immediately (the chart can be taller than the viewport).
  const goToHit = (pathIds: string[]) => {
    selectSearchHit(pathIds);
    setSearchOpen(false);
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleExportCsv = async () => {
    setExporting("csv");
    try {
      const blob = await exportOrgComplianceReport("csv");
      downloadBlob(blob as Blob, `org-structure-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Could not export CSV.";
      await Swal.fire({ icon: "error", title: "Export failed", text: msg });
    } finally {
      setExporting(null);
    }
  };

  const getChartInstance = (): ECharts | undefined => chartRef.current?.getEchartsInstance();

  const clampZoom = (z: number) => Math.min(2, Math.max(0.5, Math.round(z * 10) / 10));
  const zoomIn = () => setZoom((z) => clampZoom(z + 0.1));
  const zoomOut = () => setZoom((z) => clampZoom(z - 0.1));
  const resetView = () => {
    setZoom(1);
    // Recenter after the scale=1 re-render lands, else scrollWidth is still the zoomed value.
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    });
  };
  const fitWidth = () => {
    const el = scrollRef.current;
    if (el) setZoom(clampZoom(el.clientWidth / minChartWidth));
  };
  const onChartKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      zoomIn();
    } else if (e.key === "-") {
      e.preventDefault();
      zoomOut();
    } else if (e.key === "0") {
      e.preventDefault();
      resetView();
    }
  };

  const handleExportPng = async () => {
    setExporting("png");
    try {
      const inst = getChartInstance();
      if (!inst) throw new Error("Chart not ready");
      const url = inst.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#ffffff" });
      const a = document.createElement("a");
      a.href = url;
      a.download = `org-chart-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
    } catch {
      await Swal.fire({ icon: "error", title: "Export failed", text: "Could not capture chart image." });
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async () => {
    setExporting("pdf");
    try {
      const inst = getChartInstance();
      if (!inst) throw new Error("Chart not ready");
      const url = inst.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#ffffff" });
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      pdf.addImage(url, "PNG", 16, 16, pageW - 32, pageH - 32);
      pdf.save(`org-chart-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      await Swal.fire({ icon: "error", title: "Export failed", text: "Could not generate PDF." });
    } finally {
      setExporting(null);
    }
  };

  if (!tree.roots.length) {
    return (
      <OrgEmptyState
        icon="ri-organization-chart"
        title="No organization defined yet"
        description="Start by adding a CEO node and building your hierarchy in Structure. Once units exist, the chart will render here automatically."
        action={
          <>
            <OrgLinkButton href="/organization/structure">
              <i className="ri-add-line text-base" aria-hidden />
              Build structure
            </OrgLinkButton>
            <OrgLinkButton href="/organization/departments" variant="secondary">
              <i className="ri-building-2-line text-base" aria-hidden />
              Add departments
            </OrgLinkButton>
          </>
        }
      />
    );
  }

  const rootNodes = tree.roots.map((r) => toEChartsNode(r, highlightIds, isDark));
  const data =
    rootNodes.length === 1
      ? rootNodes
      : [
          {
            name: "Organization",
            children: rootNodes.map((r) => ({ ...r, lineStyle: { opacity: 0 } })),
            itemStyle: { opacity: 0 },
            label: { show: false },
          },
        ];

  const option = {
    tooltip: {
      trigger: "item",
      triggerOn: "mousemove",
      backgroundColor: "rgba(15, 23, 42, 0.92)",
      borderWidth: 0,
      textStyle: { color: "#f8fafc", fontSize: 12 },
    },
    series: [
      {
        type: "tree",
        data,
        top: "12%",
        bottom: "14%",
        left: "3%",
        right: "3%",
        roam: true,
        layout: "orthogonal",
        orient: "TB",
        symbol: "roundRect",
        symbolSize: 15,
        nodePadding: 28,
        expandAndCollapse: true,
        initialTreeDepth: initialTreeDepth,
        animationDuration: 250,
        animationDurationUpdate: 200,
        lineStyle: { color: isDark ? "#475569" : "#cbd5e1", width: 1.5, curveness: 0.12 },
        label: {
          position: "top",
          verticalAlign: "bottom",
          align: "center",
          distance: 10,
          fontSize: 11.5,
          color: isDark ? "#e2e8f0" : "#1e293b",
        },
        leaves: {
          label: {
            position: "bottom",
            verticalAlign: "top",
            align: "center",
            distance: 10,
          },
        },
        emphasis: {
          focus: "descendant",
          lineStyle: { color: "#94a3b8", width: 2 },
          itemStyle: { shadowBlur: 10, shadowColor: "rgba(99, 102, 241, 0.3)" },
        },
      },
    ],
  };

  const chartHeight = Math.min(Math.max(460, (treeDepth(tree.roots) + 1) * 150), 1600);
  const minChartWidth = Math.max(640, countLeaves(tree.roots) * 120);

  const searchRows = useMemo(() => {
    if (!searchResult) return [];
    const rows: {
      key: string;
      kind: "unit" | "employee";
      label: string;
      sublabel?: string;
      pathIds: string[];
      href?: string;
    }[] = [];
    for (const u of searchResult.units) {
      const path = searchResult.paths.find((p) => p.kind === "unit" && p.id === u.id);
      rows.push({
        key: `unit-${u.id}`,
        kind: "unit",
        label: u.name,
        sublabel: ORG_UNIT_TYPE_META[u.type]?.label ?? u.type,
        pathIds: path?.pathIds ?? [],
      });
    }
    for (const e of searchResult.employees) {
      const path = searchResult.paths.find((p) => p.kind === "employee" && p.id === e.id);
      rows.push({
        key: `emp-${e.id}`,
        kind: "employee",
        label: e.fullName,
        sublabel: "Employee",
        pathIds: path?.pathIds ?? [],
        href: `/ats/employees/edit?id=${e.id}`,
      });
    }
    return rows;
  }, [searchResult]);

  const filteredUnassigned = useMemo(() => {
    const q = unassignedFilter.trim().toLowerCase();
    if (!q) return tree.unassigned;
    return tree.unassigned.filter((e) => e.fullName.toLowerCase().includes(q));
  }, [tree.unassigned, unassignedFilter]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="relative min-w-[14rem] flex-1 max-w-md">
          <label htmlFor="org-chart-search" className="form-label !text-[0.75rem] mb-1">
            Search chart
          </label>
          <i className="ri-search-line absolute left-3 top-[2.35rem] -translate-y-1/2 text-defaulttextcolor/45" aria-hidden />
          <input
            id="org-chart-search"
            type="search"
            className="form-control !ps-9 !py-2 !text-[0.8125rem]"
            placeholder="Find unit or employee…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setSearchOpen(false)}
            role="combobox"
            aria-expanded={searchOpen && debouncedQ.length >= 2}
            aria-controls="org-chart-search-results"
            aria-describedby="org-chart-search-hint"
          />
          {searchOpen && debouncedQ.length >= 2 ? (
            <div
              id="org-chart-search-results"
              role="listbox"
              className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-lg border border-defaultborder/70 bg-white shadow-lg dark:bg-bodybg"
            >
              {searchLoading ? (
                <p className="mb-0 px-3 py-3 text-[0.8125rem] text-defaulttextcolor/60">Searching…</p>
              ) : !searchRows.length ? (
                <p className="mb-0 px-3 py-3 text-[0.8125rem] text-defaulttextcolor/60">No matches for “{debouncedQ}”.</p>
              ) : (
                <ul className="py-1">
                  {searchRows.map((row) => (
                    <li key={row.key} role="option" aria-selected={false}>
                      <button
                        type="button"
                        disabled={!row.pathIds.length}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => goToHit(row.pathIds)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[0.8125rem] transition-colors hover:bg-light/70 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/[0.04]"
                      >
                        <i
                          className={`${row.kind === "employee" ? "ri-user-3-line" : "ri-node-tree"} shrink-0 text-defaulttextcolor/45`}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate font-medium">{row.label}</span>
                        <span className="shrink-0 text-[0.7rem] text-defaulttextcolor/55">{row.sublabel}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
          <p id="org-chart-search-hint" className="mb-0 mt-1 text-[0.75rem] text-defaulttextcolor/55">
            {searchLoading ? "Searching…" : "Type at least 2 characters, then pick a result to highlight it"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-1 rounded-lg border border-defaultborder/60 bg-light/30 p-1 dark:bg-white/[0.02]"
            role="group"
            aria-label="Tree view controls"
          >
            <OrgSecondaryButton
              type="button"
              title="Collapse to level 2"
              disabled={!!exporting}
              onClick={() => setTreeDepth(2)}
            >
              <i className="ri-contract-up-down-line text-base" aria-hidden />
              Collapse
            </OrgSecondaryButton>
            <OrgSecondaryButton type="button" title="Expand all levels" disabled={!!exporting} onClick={() => setTreeDepth(-1)}>
              <i className="ri-expand-up-down-line text-base" aria-hidden />
              Expand
            </OrgSecondaryButton>
          </div>
          {canExport ? (
            <div
              className="flex items-center gap-1 rounded-lg border border-defaultborder/60 bg-light/30 p-1 dark:bg-white/[0.02]"
              role="group"
              aria-label="Export chart"
            >
              <span className="ps-2 pe-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-defaulttextcolor/50">
                <i className="ri-download-2-line align-middle text-sm" aria-hidden />
              </span>
              <OrgSecondaryButton type="button" title="Export as CSV" disabled={!!exporting} onClick={() => void handleExportCsv()}>
                {exporting === "csv" ? "…" : "CSV"}
              </OrgSecondaryButton>
              <OrgSecondaryButton type="button" title="Export as PNG image" disabled={!!exporting} onClick={() => void handleExportPng()}>
                {exporting === "png" ? "…" : "PNG"}
              </OrgSecondaryButton>
              <OrgSecondaryButton type="button" title="Export as PDF" disabled={!!exporting} onClick={() => void handleExportPdf()}>
                {exporting === "pdf" ? "…" : "PDF"}
              </OrgSecondaryButton>
            </div>
          ) : null}
        </div>
      </div>

      <OrgChartLegend />
      <div className="relative">
        <div
          className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-lg border border-defaultborder/70 bg-white/90 p-1 shadow-sm backdrop-blur dark:bg-bodybg/90"
          role="group"
          aria-label="Chart zoom controls"
        >
          <OrgSecondaryButton type="button" aria-label="Zoom out" onClick={zoomOut}>
            <i className="ri-subtract-line" aria-hidden />
          </OrgSecondaryButton>
          <OrgSecondaryButton type="button" aria-label="Zoom in" onClick={zoomIn}>
            <i className="ri-add-line" aria-hidden />
          </OrgSecondaryButton>
          <OrgSecondaryButton type="button" aria-label="Fit chart to width" onClick={fitWidth}>
            Fit
          </OrgSecondaryButton>
          <OrgSecondaryButton type="button" aria-label="Reset zoom and recenter" onClick={resetView}>
            Reset
          </OrgSecondaryButton>
        </div>
        <div
          ref={scrollRef}
          className="overflow-auto rounded-xl border border-defaultborder/70 bg-white outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:bg-bodybg"
          tabIndex={0}
          role="application"
          aria-label="Organization chart. Use plus and minus keys to zoom, zero to reset."
          onKeyDown={onChartKeyDown}
        >
          <div
            style={{
              minWidth: minChartWidth,
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
              transition: "transform 120ms ease-out",
            }}
          >
            <ReactECharts
              key={`org-depth-${initialTreeDepth}`}
              ref={chartRef}
              option={option}
              style={{ height: chartHeight, width: "100%" }}
              opts={{ renderer: "canvas" }}
            />
          </div>
        </div>
      </div>
      <p className="mb-0 mt-3 text-[0.75rem] text-defaulttextcolor/55">
        CEO at the top, then managers, supervisors, departments, and their members. Select a search result to highlight its path. Collapse and Expand all reset the current expansion state.
      </p>

      {debouncedQ.length >= 2 ? (
        <div className="mt-5 overflow-hidden rounded-xl border border-defaultborder/60">
          <div className="border-b border-defaultborder/60 bg-light/40 px-4 py-3 dark:bg-white/[0.02]">
            <h6 className="mb-0 text-[0.875rem] font-semibold">Search results (accessible list)</h6>
            <p className="mb-0 mt-1 text-[0.75rem] text-defaulttextcolor/60">
              Keyboard-friendly fallback for the chart. Highlight updates the tree above.
            </p>
          </div>
          {!searchRows.length ? (
            <p className="mb-0 px-4 py-6 text-[0.8125rem] text-defaulttextcolor/65">No matches for “{debouncedQ}”.</p>
          ) : (
            <div className="table-responsive">
              <table className="table min-w-full mb-0">
                <thead className="bg-light/60 dark:bg-white/[0.03]">
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Kind</th>
                    <th scope="col" className="text-end">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {searchRows.map((row) => (
                    <tr key={row.key} className="border-defaultborder/50">
                      <td className="font-medium">{row.label}</td>
                      <td className="text-defaulttextcolor/70">{row.sublabel}</td>
                      <td className="text-end">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {row.pathIds.length ? (
                            <OrgSecondaryButton type="button" onClick={() => selectSearchHit(row.pathIds)}>
                              Highlight
                            </OrgSecondaryButton>
                          ) : null}
                          {row.href ? (
                            <Link
                              href={row.href}
                              className="ti-btn ti-btn-light !py-1.5 !px-3 !text-[0.75rem] !mb-0 inline-flex items-center gap-1"
                            >
                              Open employee
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {tree.unassigned.length > 0 ? (
        <div className="mt-5 overflow-hidden rounded-xl border border-warning/25 bg-warning/[0.04]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-warning/15 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-warning/15 text-warning">
                <i className="ri-user-unfollow-line" aria-hidden />
              </span>
              <div>
                <h6 className="mb-0 text-[0.875rem] font-semibold">Unassigned employees</h6>
                <p className="mb-0 text-[0.75rem] text-defaulttextcolor/60">
                  Active employees not linked to a department node
                </p>
              </div>
            </div>
            <span className="badge bg-warning/15 text-warning">{tree.unassigned.length}</span>
          </div>
          {tree.unassigned.length > 12 ? (
            <div className="relative border-b border-warning/15 px-4 py-3">
              <i className="ri-search-line absolute left-7 top-1/2 -translate-y-1/2 text-defaulttextcolor/45" aria-hidden />
              <input
                type="search"
                className="form-control !ps-9 !py-2 !text-[0.8125rem]"
                placeholder={`Filter ${tree.unassigned.length} unassigned employees…`}
                value={unassignedFilter}
                onChange={(e) => setUnassignedFilter(e.target.value)}
                aria-label="Filter unassigned employees"
              />
            </div>
          ) : null}
          {filteredUnassigned.length ? (
            <div className="flex max-h-72 flex-wrap content-start gap-2 overflow-auto p-4">
              {filteredUnassigned.map((e) => (
                <Link
                  key={e.id}
                  href={`/ats/employees/edit?id=${e.id}`}
                  title={`Open ${e.fullName}`}
                  className="inline-flex min-h-[2rem] items-center rounded-full border border-defaultborder/60 bg-white px-3 py-1.5 text-[0.8125rem] font-medium text-defaulttextcolor transition-colors hover:border-primary/50 hover:text-primary dark:bg-bodybg"
                >
                  <i className="ri-user-3-line me-1.5 text-defaulttextcolor/45" aria-hidden />
                  {e.fullName}
                </Link>
              ))}
            </div>
          ) : (
            <p className="mb-0 px-4 py-6 text-[0.8125rem] text-defaulttextcolor/65">
              No unassigned employee matches “{unassignedFilter}”.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-warning/15 px-4 py-3">
            <p className="mb-0 text-[0.75rem] text-defaulttextcolor/60">
              {unassignedFilter.trim()
                ? `Showing ${filteredUnassigned.length} of ${tree.unassigned.length}. `
                : ""}
              Assign these employees to a department to place them on the chart.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {canAssignEmployees ? (
                <OrgPrimaryButton onClick={() => setAssignOpen(true)}>
                  <i className="ri-user-add-line text-base" aria-hidden />
                  Assign to department
                </OrgPrimaryButton>
              ) : null}
              <OrgLinkButton href="/ats/employees" variant="secondary">
                <i className="ri-team-line text-base" aria-hidden />
                Open employees
              </OrgLinkButton>
            </div>
          </div>
        </div>
      ) : null}

      {canEditStructure && flatUnits.length ? (
        <div className="mt-5 overflow-hidden rounded-xl border border-defaultborder/60">
          <div className="border-b border-defaultborder/60 bg-light/40 px-4 py-3 dark:bg-white/[0.02]">
            <h6 className="mb-0 text-[0.875rem] font-semibold">Live hierarchy edits</h6>
            <p className="mb-0 mt-1 text-[0.75rem] text-defaulttextcolor/60">
              Drag a unit onto a valid parent: CEO → Manager → Supervisor → Department. Invalid targets are
              disabled while dragging. Changes are audited immediately.
            </p>
          </div>
          <div className="table-responsive max-h-96 overflow-auto">
            <table className="table min-w-full mb-0">
              <thead className="sticky top-0 z-10 bg-light/80 backdrop-blur dark:bg-bodybg/80">
                <tr>
                  <th scope="col" className="!w-10" aria-label="Drag handle" />
                  <th scope="col">Unit</th>
                  <th scope="col">Type</th>
                  <th scope="col" className="text-end">
                    Drop target
                  </th>
                </tr>
              </thead>
              <tbody>
                {flatUnits.map((u) => {
                  const dropAllowed = canDropOn(u.id);
                  const dragging = dragUnitId === u.id;
                  return (
                    <tr
                      key={u.id}
                      draggable={!reparenting}
                      onDragStart={() => setDragUnitId(u.id)}
                      onDragEnd={() => setDragUnitId(null)}
                      onDragOver={(e) => {
                        if (dropAllowed) e.preventDefault();
                      }}
                      onDrop={() => {
                        if (dropAllowed) void handleLiveReparent(u.id);
                      }}
                      title={`Drag ${u.name} onto a valid parent`}
                      className={`transition-colors ${reparenting ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"} ${
                        dragging
                          ? "bg-primary/10 ring-1 ring-inset ring-primary/30"
                          : dropAllowed
                            ? "bg-success/10 ring-1 ring-inset ring-success/30"
                            : "hover:bg-light/60 dark:hover:bg-white/[0.03]"
                      }`}
                    >
                      <td className="text-defaulttextcolor/35">
                        <i className="ri-draggable text-base" aria-hidden />
                      </td>
                      <td className="font-medium">{u.name}</td>
                      <td>
                        <OrgTypeBadge type={u.type} />
                      </td>
                      <td className="text-end">
                        {dropAllowed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-[0.75rem] font-medium text-success">
                            <i className="ri-arrow-down-line" aria-hidden />
                            Drop here
                          </span>
                        ) : (
                          <span className="text-[0.75rem] text-defaulttextcolor/40">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-defaultborder/60 px-4 py-3">
            <p className="mb-0 text-[0.75rem] text-defaulttextcolor/60">
              {dragUnitId
                ? canMoveDraggedToRoot
                  ? "Drop on a highlighted row to set parent, or move to top level."
                  : "Drop on a highlighted row to set parent (only CEO can sit at top level)."
                : "Drag a row to begin."}
            </p>
            <OrgSecondaryButton
              type="button"
              disabled={!canMoveDraggedToRoot || reparenting}
              onClick={() => void handleLiveReparentToRoot()}
            >
              Move to top level
            </OrgSecondaryButton>
          </div>
        </div>
      ) : null}

      {assignOpen ? (
        <AssignToDepartmentModal
          open
          employees={tree.unassigned}
          onClose={() => setAssignOpen(false)}
          onAssigned={() => onChanged?.()}
        />
      ) : null}
    </div>
  );
}
