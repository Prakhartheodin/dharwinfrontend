"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSelector } from "react-redux";
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
import styles from "./OrgChart.module.css";
const AssignToDepartmentModal = dynamic(() => import("./AssignToDepartmentModal"), { ssr: false });

const flattenUnits = (nodes: OrgUnitNode[], acc: OrgUnitNode[] = []): OrgUnitNode[] => {
  for (const n of nodes ?? []) {
    acc.push(n);
    if (n.children?.length) flattenUnits(n.children, acc);
  }
  return acc;
};

// Avatar colours rotate per member; department auto-colours hash off a stable key so
// each department is visually distinct even when no colour was picked.
const AVATAR_PALETTE = ["#6366f1", "#0ea5e9", "#f59e0b", "#22c55e", "#ec4899", "#14b8a6", "#f43f5e", "#8b5cf6", "#84cc16", "#06b6d4"];
const AUTO_PALETTE = ["#22c55e", "#0ea5e9", "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f59e0b", "#14b8a6", "#84cc16", "#64748b"];

const initials = (name: string) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase() || "?";

const hashColor = (key: string, palette: string[]) => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
};

const resolveNodeColor = (n: OrgUnitNode) => {
  if (n.type === "department") return n.color || hashColor(n.id || n.name, AUTO_PALETTE);
  return ORG_UNIT_TYPE_META[n.type]?.chartColor ?? hashColor(n.id || n.name, AUTO_PALETTE);
};

const nodeTitle = (n: OrgUnitNode) => {
  const lines = [`${ORG_UNIT_TYPE_META[n.type]?.label ?? n.type}: ${n.name}`];
  if (n.headEmployee?.fullName) lines.push(`Head: ${n.headEmployee.fullName}`);
  if (n.memberCount) lines.push(`Members: ${n.memberCount}`);
  if (n.spanDirect != null || n.spanBand) {
    const band = n.spanBand && n.spanBand !== "ok" ? ` (${n.spanBand})` : "";
    lines.push(`Span: ${n.spanDirect ?? 0} direct${band}`);
  }
  return lines.join("\n");
};

// Ids of every unit that has children, with its depth — drives "collapse to level 2".
const collectCollapsibles = (nodes: OrgUnitNode[], depth = 0, acc: { id: string; depth: number }[] = []) => {
  for (const n of nodes ?? []) {
    if (n.children?.length) {
      acc.push({ id: n.id, depth });
      collectCollapsibles(n.children, depth + 1, acc);
    }
  }
  return acc;
};

type NodeCtx = {
  collapsedIds: Set<string>;
  highlightIds: Set<string>;
  toggle: (id: string) => void;
};

function OrgNode({ node, ctx }: { node: OrgUnitNode; ctx: NodeCtx }) {
  const [open, setOpen] = useState(false);
  const isDept = node.type === "department";
  const color = resolveNodeColor(node);
  const employees = node.employees ?? [];
  const memberCount = node.memberCount ?? employees.length;
  const hasChildren = (node.children?.length ?? 0) > 0;
  const collapsed = ctx.collapsedIds.has(node.id);
  const highlighted = ctx.highlightIds.has(node.id);

  return (
    <li className={collapsed ? styles.collapsed : undefined}>
      <div className={`${styles.card} ${highlighted ? styles.highlight : ""}`} title={nodeTitle(node)}>
        <div className={styles.head} style={{ background: color }}>
          <span className={styles.title}>{node.name}</span>
          <span className={styles.typeTag}>{ORG_UNIT_TYPE_META[node.type]?.label ?? node.type}</span>
        </div>
        <div className={styles.body}>
          {node.headEmployee?.fullName ? <div className={styles.headName}>{node.headEmployee.fullName}</div> : null}
          {isDept ? (
            <>
              <div
                className={styles.memberLine}
                onClick={() => employees.length && setOpen((o) => !o)}
                role={employees.length ? "button" : undefined}
              >
                <strong>{memberCount}</strong>&nbsp;member{memberCount === 1 ? "" : "s"}
                {employees.length ? ` · ${open ? "hide" : "show"}` : ""}
              </div>
              {employees.length ? (
                <div className={styles.cluster} onClick={() => setOpen((o) => !o)} role="button" aria-label="Toggle members">
                  {employees.slice(0, 4).map((e, i) => (
                    <span key={e.id} className={styles.ava} style={{ background: AVATAR_PALETTE[i % AVATAR_PALETTE.length] }}>
                      {initials(e.fullName)}
                    </span>
                  ))}
                  {employees.length > 4 ? <span className={styles.more}>+{employees.length - 4}</span> : null}
                </div>
              ) : null}
              {open && employees.length ? (
                <div className={styles.emps}>
                  {employees.map((e, i) => (
                    <Link key={e.id} href={`/ats/employees/edit?id=${e.id}`} className={styles.emp} title={`Open ${e.fullName}`}>
                      <span className={styles.dot} style={{ background: AVATAR_PALETTE[i % AVATAR_PALETTE.length] }}>
                        {initials(e.fullName)}
                      </span>
                      <span className="truncate">{e.fullName}</span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
        {hasChildren ? (
          <button
            type="button"
            className={styles.toggle}
            onClick={() => ctx.toggle(node.id)}
            aria-label={collapsed ? `Expand ${node.name}` : `Collapse ${node.name}`}
          >
            {collapsed ? "+" : "−"}
          </button>
        ) : null}
      </div>
      {hasChildren ? (
        <ul>
          {node.children.map((c) => (
            <OrgNode key={c.id} node={c} ctx={ctx} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

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
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const [unassignedFilter, setUnassignedFilter] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const canExport = useMemo(() => {
    if (isPlatformSuperUser) return true;
    // Backend structure.export alias includes structure.manage; matrix uses create/edit/delete on structure.
    return canEditStructure || canCreateStructure || canDeleteStructure;
  }, [isPlatformSuperUser, canEditStructure, canCreateStructure, canDeleteStructure]);

  const collapsibles = useMemo(() => collectCollapsibles(tree.roots), [tree]);

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

  // Highlight a path and make sure its ancestors are expanded so the target is visible.
  const selectSearchHit = useCallback((pathIds: string[]) => {
    setHighlightPathIds(pathIds);
    setCollapsedIds((prev) => {
      if (!pathIds.length) return prev;
      const next = new Set(prev);
      for (const id of pathIds) next.delete(id);
      return next;
    });
  }, []);

  const goToHit = (pathIds: string[]) => {
    selectSearchHit(pathIds);
    setSearchOpen(false);
    setActiveIndex(-1);
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const clearSearch = () => {
    setSearchInput("");
    setHighlightPathIds([]);
    setActiveIndex(-1);
    setSearchOpen(false);
  };

  const toggle = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const collapseToLevel = () =>
    setCollapsedIds(new Set(collapsibles.filter((c) => c.depth >= 1).map((c) => c.id)));
  const expandAll = () => setCollapsedIds(new Set());

  const nodeCtx = useMemo<NodeCtx>(() => ({ collapsedIds, highlightIds, toggle }), [collapsedIds, highlightIds, toggle]);

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (searchInput) clearSearch();
      else setSearchOpen(false);
      return;
    }
    if (debouncedQ.length < 2 || !searchRows.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSearchOpen(true);
      setActiveIndex((i) => {
        const next = Math.min(searchRows.length - 1, i + 1);
        document.getElementById(`org-search-opt-${next}`)?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => {
        const next = Math.max(0, i - 1);
        document.getElementById(`org-search-opt-${next}`)?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const row = searchRows[activeIndex];
      if (row?.pathIds.length) goToHit(row.pathIds);
    }
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

  // Rasterise the unscaled tree (not the zoomed wrapper) so exports are always full-resolution.
  const captureChartPng = async (): Promise<string> => {
    const node = captureRef.current;
    if (!node) throw new Error("Chart not ready");
    const { toPng } = await import("html-to-image");
    return toPng(node, {
      pixelRatio: 2,
      cacheBust: true,
      // Avoid SecurityError when reading cssRules from cross-origin stylesheets (Google Fonts, CDN).
      skipFonts: true,
      backgroundColor: isDark ? "#0f172a" : "#ffffff",
    });
  };

  const clampZoom = (z: number) => Math.min(2, Math.max(0.4, Math.round(z * 10) / 10));
  const zoomIn = () => setZoom((z) => clampZoom(z + 0.1));
  const zoomOut = () => setZoom((z) => clampZoom(z - 0.1));
  const resetView = () => {
    setZoom(1);
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    });
  };
  const fitWidth = () => {
    const el = scrollRef.current;
    const cap = captureRef.current;
    if (el && cap && cap.scrollWidth > 0) setZoom(clampZoom(el.clientWidth / cap.scrollWidth));
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
      const url = await captureChartPng();
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
      const url = await captureChartPng();
      const img = new Image();
      img.src = url;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = Math.min((pageW - 32) / img.width, (pageH - 32) / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      pdf.addImage(url, "PNG", (pageW - w) / 2, 16, w, h);
      pdf.save(`org-chart-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      await Swal.fire({ icon: "error", title: "Export failed", text: "Could not generate PDF." });
    } finally {
      setExporting(null);
    }
  };

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
    // Only surface hits that map to a node on the chart — an employee with no
    // department path can't be highlighted, so drop it rather than show a dead row.
    return rows.filter((r) => r.pathIds.length > 0);
  }, [searchResult]);

  const filteredUnassigned = useMemo(() => {
    const q = unassignedFilter.trim().toLowerCase();
    if (!q) return tree.unassigned;
    return tree.unassigned.filter((e) => e.fullName.toLowerCase().includes(q));
  }, [tree.unassigned, unassignedFilter]);

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

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="relative min-w-[14rem] flex-1 max-w-md">
          <label htmlFor="org-chart-search" className="form-label !text-[0.75rem] mb-1">
            Search chart
          </label>
          <div className="relative">
            <i className="ri-search-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-defaulttextcolor/45" aria-hidden />
            <input
              id="org-chart-search"
              type="text"
              autoComplete="off"
              className="form-control !ps-9 !pe-9 !py-2 !text-[0.8125rem]"
              placeholder="Find unit or employee…"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setActiveIndex(-1);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setSearchOpen(false)}
              onKeyDown={onSearchKeyDown}
              role="combobox"
              aria-expanded={searchOpen && debouncedQ.length >= 2}
              aria-controls="org-chart-search-results"
              aria-activedescendant={activeIndex >= 0 ? `org-search-opt-${activeIndex}` : undefined}
              aria-describedby="org-chart-search-hint"
            />
            <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center">
              {searchLoading ? (
                <span className="ti-spinner !h-4 !w-4 text-primary" role="status" aria-label="Searching" />
              ) : searchInput ? (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={clearSearch}
                  aria-label="Clear search"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-defaulttextcolor/50 transition-colors hover:bg-light/70 hover:text-defaulttextcolor dark:hover:bg-white/[0.06]"
                >
                  <i className="ri-close-line text-base leading-none" aria-hidden />
                </button>
              ) : null}
            </span>
            {searchOpen && debouncedQ.length >= 2 ? (
              <div
                id="org-chart-search-results"
                role="listbox"
                className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-lg border border-defaultborder/70 bg-white shadow-lg dark:bg-bodybg"
              >
                {searchLoading ? (
                  <div className="flex items-center gap-2 px-3 py-3 text-[0.8125rem] text-defaulttextcolor/60">
                    <span className="ti-spinner !h-3.5 !w-3.5" aria-hidden />
                    Searching…
                  </div>
                ) : !searchRows.length ? (
                  <p className="mb-0 px-3 py-3 text-[0.8125rem] text-defaulttextcolor/60">No matches for “{debouncedQ}”.</p>
                ) : (
                  <ul className="py-1">
                    {searchRows.map((row, i) => (
                      <li key={row.key} id={`org-search-opt-${i}`} role="option" aria-selected={i === activeIndex}>
                        <button
                          type="button"
                          disabled={!row.pathIds.length}
                          onMouseDown={(e) => e.preventDefault()}
                          onMouseEnter={() => setActiveIndex(i)}
                          onClick={() => goToHit(row.pathIds)}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[0.8125rem] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                            i === activeIndex ? "bg-primary/10 text-primary" : "hover:bg-light/70 dark:hover:bg-white/[0.04]"
                          }`}
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
          </div>
          <div id="org-chart-search-hint" className="mt-1 flex min-h-[1.25rem] items-center gap-2">
            {highlightPathIds.length ? (
              <button
                type="button"
                onClick={() => setHighlightPathIds([])}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[0.7rem] font-medium text-primary transition-colors hover:bg-primary/20"
              >
                <i className="ri-focus-3-line" aria-hidden />
                Highlight active
                <i className="ri-close-line" aria-hidden />
              </button>
            ) : (
              <p className="mb-0 text-[0.75rem] text-defaulttextcolor/55">
                {searchLoading ? "Searching…" : "Type 2+ characters · ↑↓ to navigate · Enter to highlight"}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-1 rounded-lg border border-defaultborder/60 bg-light/30 p-1 dark:bg-white/[0.02]"
            role="group"
            aria-label="Tree view controls"
          >
            <OrgSecondaryButton type="button" title="Collapse to level 2" disabled={!!exporting} onClick={collapseToLevel}>
              <i className="ri-contract-up-down-line text-base" aria-hidden />
              Collapse
            </OrgSecondaryButton>
            <OrgSecondaryButton type="button" title="Expand all levels" disabled={!!exporting} onClick={expandAll}>
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
          className={`${styles.viewport} ${isDark ? styles.dark : ""} max-h-[70vh] overflow-auto rounded-xl border border-defaultborder/70 bg-white outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:bg-bodybg`}
          tabIndex={0}
          role="application"
          aria-label="Organization chart. Use plus and minus keys to zoom, zero to reset."
          onKeyDown={onChartKeyDown}
        >
          <div className={styles.stage} style={{ transform: `scale(${zoom})` }}>
            <div className={styles.tree} ref={captureRef}>
              <ul>
                {tree.roots.map((r) => (
                  <OrgNode key={r.id} node={r} ctx={nodeCtx} />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <p className="mb-0 mt-3 text-[0.75rem] text-defaulttextcolor/55">
        CEO at the top, then managers, supervisors, departments, and their members. Each department uses its own colour (set it on the Departments page). Click a department to expand its members, or use the toggle under a node to collapse a branch.
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
