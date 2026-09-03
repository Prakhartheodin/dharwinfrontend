"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Swal from "sweetalert2";
import {
  deactivateOrgUnit,
  deleteOrgUnit,
  getOrgCoverage,
  getOrgTree,
  listOrgUnits,
  listOrgUnitsPaged,
  reactivateOrgUnit,
  updateOrgUnit,
  type OrgCoverageSummary,
  type OrgUnitNode,
  type OrgUnitType,
} from "@/shared/lib/api/org-structure";
// Modals only render on interaction — lazy-load them so the page compiles without
// pulling their (employees/sweetalert2) dependency graphs upfront.
const OrgUnitModal = dynamic(() => import("./OrgUnitModal"), { ssr: false });
const AssignHeadModal = dynamic(() => import("./AssignHeadModal"), { ssr: false });
const AssignToDepartmentModal = dynamic(() => import("./AssignToDepartmentModal"), { ssr: false });
const ReparentUnitModal = dynamic(() => import("./ReparentUnitModal"), { ssr: false });
import StructureHistoryPanel from "./StructureHistoryPanel";
import {
  OrgEmptyState,
  OrgErrorState,
  OrgLoadingBlock,
  OrgPrimaryButton,
  OrgTableAction,
  OrgTableActions,
  OrgTypeBadge,
  ORG_UNIT_TYPE_META,
} from "./org-ui";
import { useFeaturePermissions } from "@/shared/hooks/use-feature-permissions";

const PAGE_SIZE = 10;
const CHECKLIST_DISMISS_KEY = "org-setup-checklist-dismissed";
type StructureTab = "units" | "history";

type ChecklistCta = { label: string; onClick?: () => void; href?: string };
type ChecklistItem = {
  key: string;
  label: string;
  done: boolean;
  gap?: number;
  why: string;
  cta?: ChecklistCta;
  /** Remix glyph for the Action required row. */
  icon?: string;
  /** Names the outstanding problem. The checklist states the goal ("All departments
   *  linked"), which reads as satisfied when listed under a heading of open work. */
  actionLabel?: string;
};

const CHECKLIST_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
const CHECKLIST_ROW_CLASS = "flex min-h-11 min-w-0 w-full items-center gap-2 text-[0.8125rem]";

function ChecklistCtaButton({ cta, variant }: { cta: ChecklistCta; variant: "primary" | "icon" }) {
  const isIcon = variant === "icon";
  // Filled, not tinted. `ti-btn-light` is `bg-light` -- the neutral *surface* token -- so on
  // a surface-coloured row the button matched its own background (1.04:1 light, 1.25:1 dark)
  // and vanished. No tinted variant of this purple clears 4.5:1 for 12px text either
  // (3.66:1 on the dark row); white on filled primary is 4.66:1 and, because the button
  // carries its own background, it cannot drift when a surface token changes.
  const cls = isIcon
    ? `inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md text-primary shrink-0 ${CHECKLIST_FOCUS}`
    : `ti-btn ti-btn-primary-full !py-1.5 !px-3 !text-[0.75rem] inline-flex cursor-pointer items-center gap-1 whitespace-nowrap !mb-0 shrink-0 ${CHECKLIST_FOCUS}`;
  const inner = isIcon ? (
    <i className="ri-arrow-right-line leading-none" aria-hidden />
  ) : (
    <>
      {cta.label}
      <i className="ri-arrow-right-line leading-none" aria-hidden />
    </>
  );
  if (cta.href) {
    return (
      <Link href={cta.href} className={cls} aria-label={isIcon ? cta.label : undefined}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={cta.onClick} className={cls} aria-label={isIcon ? cta.label : undefined}>
      {inner}
    </button>
  );
}

function ChecklistRowBody({ item, title }: { item: ChecklistItem; title: string }) {
  return (
    <>
      <i
        className={
          item.done
            ? "ri-checkbox-circle-fill leading-none self-center text-success shrink-0"
            : "ri-checkbox-blank-circle-line leading-none self-center text-defaulttextcolor/65 shrink-0"
        }
        aria-hidden
      />
      <span className="sr-only">{item.done ? "Done:" : "To do:"}</span>
      {!item.done && item.cta ? <ChecklistCtaButton cta={item.cta} variant="icon" /> : null}
      <span
        className={`min-w-0 truncate ${item.done ? "text-defaulttextcolor" : "text-defaulttextcolor/70"}`}
        title={title}
      >
        {item.label}
      </span>
      {!item.done && item.gap ? (
        <span className="self-center shrink-0 rounded-full bg-warning/15 px-1.5 py-0.5 text-[0.6875rem] font-semibold tabular-nums text-warning dark:bg-warning/25">
          {item.gap}
        </span>
      ) : null}
    </>
  );
}

function SetupChecklist({ items }: { items: ChecklistItem[] }) {
  const total = items.length;
  const doneCount = items.filter((i) => i.done).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const allDone = total > 0 && doneCount === total;
  const nextItem = items.find((i) => !i.done && i.cta);
  // Every item lands in exactly one of these two, so nothing can be dropped from the card.
  const doneItems = items.filter((i) => i.done);
  const todoItems = items.filter((i) => !i.done);

  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (allDone && typeof window !== "undefined") {
      setHidden(window.localStorage.getItem(CHECKLIST_DISMISS_KEY) === "1");
    } else {
      setHidden(false);
    }
  }, [allDone]);

  const dismiss = () => {
    if (typeof window !== "undefined") window.localStorage.setItem(CHECKLIST_DISMISS_KEY, "1");
    setHidden(true);
  };
  const reveal = () => {
    if (typeof window !== "undefined") window.localStorage.removeItem(CHECKLIST_DISMISS_KEY);
    setHidden(false);
  };

  if (allDone && hidden) {
    return (
      <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-success/30 bg-success/[0.05] px-4 py-2.5">
        <span className="flex items-center gap-2 text-[0.8125rem] font-medium text-success">
          <i className="ri-checkbox-circle-fill" aria-hidden /> Org setup complete
        </span>
        <button
          type="button"
          onClick={reveal}
          className={`inline-flex min-h-11 cursor-pointer items-center text-[0.75rem] font-medium text-defaulttextcolor/60 hover:text-defaulttextcolor ${CHECKLIST_FOCUS}`}
        >
          View checklist
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-defaultborder/60 bg-light/30 p-4 dark:bg-white/[0.02]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h6 className="mb-0 text-[0.875rem] font-semibold">Setup checklist</h6>
        <span className="text-[0.75rem] font-medium text-defaulttextcolor/65">
          {doneCount} of {total} complete · {pct}%
        </span>
      </div>

      <div
        className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-defaultborder/50"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Org setup progress"
      >
        <div className="h-full rounded-full bg-success transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>

      {nextItem ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/25 bg-primary/[0.05] px-3 py-2">
          <span className="flex min-w-0 items-center gap-2 text-[0.8125rem] text-defaulttextcolor/80">
            {/* A flag, not a sparkle: this is the next milestone in a manual setup, and a
                sparkle reads as "generated for you". Tinted rather than a filled tile, so the
                one filled primary shape in the row stays the button you are meant to press. */}
            <i className="ri-flag-line shrink-0 leading-none text-primary/70" aria-hidden />
            <span className="min-w-0">
              <span className="font-semibold text-defaulttextcolor">Next:</span> {nextItem.label}
              {nextItem.gap ? <span className="text-defaulttextcolor/60"> · {nextItem.gap} remaining</span> : null}
            </span>
          </span>
          {nextItem.cta ? <ChecklistCtaButton cta={nextItem.cta} variant="primary" /> : null}
        </div>
      ) : null}

      {doneItems.length > 0 ? (
        <ul className="mb-0 grid items-center gap-2 sm:grid-cols-2">
          {doneItems.map((item) => (
            <li key={item.key} className="flex min-h-11 min-w-0 items-center">
              <div className={CHECKLIST_ROW_CLASS}>
                <ChecklistRowBody item={item} title={`${item.label}. ${item.why}`} />
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Outstanding work is pulled out of the two-column grid: mixed in among ticked rows
          it reads as more of the same, and its counts and actions had nowhere to sit. */}
      {todoItems.length > 0 ? (
        <>
          <h6 className="mb-2 mt-4 text-[0.75rem] font-semibold uppercase tracking-[0.04em] text-defaulttextcolor/55">
            Action required
          </h6>
          <ul className="mb-0 grid gap-2">
            {todoItems.map((item) => (
              <li
                key={item.key}
                className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-defaultborder/60 bg-light/40 px-3 py-2 dark:bg-white/[0.03]"
                title={`${item.label}. ${item.why}`}
              >
                <i
                  className="ri-checkbox-blank-circle-line shrink-0 leading-none text-defaulttextcolor/45"
                  aria-hidden
                />
                <span className="sr-only">To do:</span>
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"
                  aria-hidden
                >
                  <i className={`${item.icon ?? "ri-focus-3-line"} leading-none`} />
                </span>
                {/* flex-1 with min-w-0 lets the label truncate so the button never gets
                    pushed off the card; flex-wrap drops it to its own line before that. */}
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="min-w-0 truncate text-[0.8125rem] text-defaulttextcolor">
                    {item.actionLabel ?? item.label}
                  </span>
                  {item.gap ? (
                    <span className="shrink-0 rounded-full bg-warning/15 px-1.5 py-0.5 text-[0.6875rem] font-semibold tabular-nums text-warning dark:bg-warning/25">
                      {item.gap}
                    </span>
                  ) : null}
                </span>
                {item.cta ? <ChecklistCtaButton cta={item.cta} variant="primary" /> : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {allDone ? (
        <div className="mt-3 text-end">
          <button
            type="button"
            onClick={dismiss}
            className={`inline-flex min-h-11 cursor-pointer items-center text-[0.75rem] font-medium text-defaulttextcolor/55 hover:text-defaulttextcolor ${CHECKLIST_FOCUS}`}
          >
            Dismiss checklist
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function StructurePanel() {
  const { canCreate, canEdit, canDelete } = useFeaturePermissions("organization.structure");
  const { canEdit: canAssignEmployees } = useFeaturePermissions("ats.employees");
  const [tab, setTab] = useState<StructureTab>("units");
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [pageRows, setPageRows] = useState<OrgUnitNode[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [allUnitsForReorder, setAllUnitsForReorder] = useState<OrgUnitNode[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [editing, setEditing] = useState<OrgUnitNode | null>(null);
  const [initialType, setInitialType] = useState<OrgUnitType | undefined>(undefined);
  const [headUnit, setHeadUnit] = useState<OrgUnitNode | null>(null);
  const [coverage, setCoverage] = useState<OrgCoverageSummary | null>(null);
  const [unassigned, setUnassigned] = useState<{ id: string; fullName: string }[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [reparentUnit, setReparentUnit] = useState<OrgUnitNode | null>(null);

  // Debounce the search box so we don't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 whenever the filters change.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, includeInactive]);

  const loadAllUnitsForReorder = useCallback(async () => {
    if (!canEdit) return;
    try {
      const all = await listOrgUnits();
      setAllUnitsForReorder(all.filter((u) => u.isActive !== false));
    } catch {
      /* reorder controls stay hidden if lookup fails */
    }
  }, [canEdit]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [paged, coverageSummary, tree] = await Promise.all([
        listOrgUnitsPaged({
          page,
          limit: PAGE_SIZE,
          q: debouncedSearch || undefined,
          includeInactive,
        }),
        getOrgCoverage().catch(() => null),
        getOrgTree().catch(() => null),
      ]);
      setPageRows(paged.results);
      setTotalPages(Math.max(1, paged.totalPages || 1));
      setTotalResults(paged.totalResults ?? paged.results.length);
      setCoverage(coverageSummary);
      setUnassigned(tree?.unassigned ?? []);
    } catch {
      setError(true);
      setPageRows([]);
      setCoverage(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, includeInactive, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (canEdit) void loadAllUnitsForReorder();
  }, [canEdit, loadAllUnitsForReorder]);

  const refreshAfterMutation = useCallback(async () => {
    await load();
    if (canEdit) await loadAllUnitsForReorder();
  }, [canEdit, load, loadAllUnitsForReorder]);

  const allUnits = allUnitsForReorder;

  const unitsById = useMemo(() => {
    const map = new Map<string, OrgUnitNode>();
    for (const u of pageRows) map.set(u.id, u);
    for (const u of allUnitsForReorder) map.set(u.id, u);
    return map;
  }, [allUnitsForReorder, pageRows]);

  const tableRows = useMemo(() => pageRows.map((unit) => ({ unit, depth: 0 })), [pageRows]);

  // Each active unit's position among its siblings (same parent), ordered the way
  // the chart renders them. Drives the ↑/↓ reorder controls.
  const siblingPos = useMemo(() => {
    const groups = new Map<string, OrgUnitNode[]>();
    for (const u of allUnits) {
      if (u.isActive === false) continue;
      const k = u.parentId ?? "__root__";
      const arr = groups.get(k);
      if (arr) arr.push(u);
      else groups.set(k, [u]);
    }
    const pos = new Map<string, { index: number; count: number }>();
    for (const arr of groups.values()) {
      arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
      arr.forEach((u, i) => pos.set(u.id, { index: i, count: arr.length }));
    }
    return pos;
  }, [allUnits]);

  const parentLabelForUnit = (unit: OrgUnitNode) => {
    if (!unit.parentId) {
      if (unit.type === "ceo") return ORG_UNIT_TYPE_META.ceo.label;
      return "—";
    }
    return unitsById.get(unit.parentId)?.name ?? "— (inactive)";
  };

  const openCreate = () => {
    setEditing(null);
    setInitialType(undefined);
    setUnitModalOpen(true);
  };

  const openCreateWithType = (t: OrgUnitType) => {
    setEditing(null);
    setInitialType(t);
    setUnitModalOpen(true);
  };

  // Open the head modal on the first leadership unit still missing a head.
  const assignFirstHeadless = () => {
    const target = allUnits.find((u) => u.type !== "department" && !u.headEmployeeId);
    if (target) setHeadUnit(target);
  };

  const openEdit = (row: OrgUnitNode) => {
    setEditing(row);
    setInitialType(undefined);
    setUnitModalOpen(true);
  };

  const handleReparent = (row: OrgUnitNode) => {
    setReparentUnit(row);
  };

  const handleDeactivate = async (row: OrgUnitNode) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Deactivate unit?",
      text: `"${row.name}" will be marked inactive and removed from the live chart. Child units must be reassigned first.`,
      showCancelButton: true,
      confirmButtonText: "Deactivate",
      cancelButtonText: "Keep active",
      confirmButtonColor: "#e6533c",
      reverseButtons: true,
    });
    if (!confirm.isConfirmed) return;
    try {
      await deactivateOrgUnit(row.id);
      await refreshAfterMutation();
      await Swal.fire({
        icon: "success",
        title: "Unit deactivated",
        toast: true,
        position: "top-end",
        timer: 2500,
        showConfirmButton: false,
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Deactivate failed";
      await Swal.fire({ icon: "error", title: "Cannot deactivate", text: msg });
    }
  };

  const handleReactivate = async (row: OrgUnitNode) => {
    try {
      await reactivateOrgUnit(row.id);
      await refreshAfterMutation();
      await Swal.fire({
        icon: "success",
        title: "Unit reactivated",
        toast: true,
        position: "top-end",
        timer: 2500,
        showConfirmButton: false,
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Reactivate failed";
      await Swal.fire({ icon: "error", title: "Cannot reactivate", text: msg });
    }
  };

  // Reorder a unit among its siblings: reindex the whole sibling set 0..n-1 so
  // orders are always distinct, then persist only the rows that changed.
  const moveUnit = async (row: OrgUnitNode, dir: "up" | "down") => {
    const siblings = allUnits
      .filter((u) => (u.parentId ?? "") === (row.parentId ?? "") && u.isActive !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
    const i = siblings.findIndex((u) => u.id === row.id);
    const j = dir === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= siblings.length) return;
    [siblings[i], siblings[j]] = [siblings[j], siblings[i]];
    try {
      await Promise.all(
        siblings
          .map((u, idx) => ((u.order ?? 0) !== idx ? updateOrgUnit(u.id, { order: idx }) : null))
          .filter(Boolean) as Promise<unknown>[]
      );
      await refreshAfterMutation();
      await Swal.fire({
        icon: "success",
        title: "Order updated",
        toast: true,
        position: "top-end",
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Reorder failed";
      await Swal.fire({ icon: "error", title: "Cannot reorder", text: msg });
    }
  };

  const handleDelete = async (row: OrgUnitNode) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Delete unit permanently?",
      html: `"<b>${row.name}</b>" will be permanently deleted. This cannot be undone.`,
      showCancelButton: true,
      confirmButtonText: "Delete permanently",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      reverseButtons: true,
    });
    if (!confirm.isConfirmed) return;
    try {
      await deleteOrgUnit(row.id);
      await refreshAfterMutation();
      await Swal.fire({
        icon: "success",
        title: "Unit deleted",
        toast: true,
        position: "top-end",
        timer: 2500,
        showConfirmButton: false,
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Delete failed";
      await Swal.fire({ icon: "error", title: "Cannot delete", text: msg });
    }
  };

  const headLabel = (row: OrgUnitNode) => row.headEmployee?.fullName?.trim() || "—";

  const hasFilters = debouncedSearch.length > 0 || includeInactive;

  const checklistItems: ChecklistItem[] = coverage
    ? [
        {
          key: "ceo",
          icon: "ri-user-star-line",
          label: "Create CEO node",
          done: coverage.checklist.hasCeo,
          why: "The CEO is the single root of the hierarchy.",
          cta: canCreate ? { label: "Add CEO", onClick: () => openCreateWithType("ceo") } : undefined,
        },
        {
          key: "managers",
          icon: "ri-team-line",
          label: "Add manager chain",
          done: coverage.checklist.hasManagers,
          why: "Managers report to the CEO and own teams.",
          cta: canCreate ? { label: "Add manager", onClick: () => openCreateWithType("manager") } : undefined,
        },
        {
          key: "supervisors",
          icon: "ri-user-follow-line",
          label: "Add supervisors",
          done: coverage.checklist.hasSupervisors,
          why: "Supervisors sit under managers and lead departments.",
          cta: canCreate ? { label: "Add supervisor", onClick: () => openCreateWithType("supervisor") } : undefined,
        },
        {
          key: "deptNodes",
          icon: "ri-node-tree",
          label: "Link department nodes",
          done: coverage.checklist.hasDepartmentNodes,
          why: "Department nodes place employees on the chart.",
          cta: canCreate ? { label: "Add department node", onClick: () => openCreateWithType("department") } : undefined,
        },
        {
          key: "allLinked",
          icon: "ri-building-line",
          actionLabel: "Unlinked departments",
          label: "All departments linked",
          done: coverage.checklist.allDepartmentsLinked,
          gap: coverage.departmentsWithoutNode,
          why: "Every department record should have a node in the structure.",
          cta: canCreate ? { label: "Add department node", onClick: () => openCreateWithType("department") } : undefined,
        },
        {
          key: "heads",
          icon: "ri-user-settings-line",
          actionLabel: "Units without a head",
          label: "Assign leadership heads",
          done: coverage.checklist.allLeadershipHeadsAssigned,
          gap: coverage.unitsMissingHead,
          why: "Each leadership unit should name a head employee.",
          cta: canEdit ? { label: "Assign a head", onClick: assignFirstHeadless } : undefined,
        },
        {
          key: "unassigned",
          icon: "ri-user-line",
          actionLabel: "Unassigned employees",
          label: "No unassigned employees",
          done: coverage.checklist.noUnassignedEmployees,
          gap: coverage.unassignedEmployees,
          why: "Assign each employee to a department so they appear on the chart.",
          cta: canAssignEmployees
            ? { label: "Assign to department", onClick: () => setAssignOpen(true) }
            : { label: "Manage employees", href: "/ats/employees" },
        },
      ]
    : [];

  if (loading) return <OrgLoadingBlock label="Loading org units…" />;
  if (error) return <OrgErrorState onRetry={() => void load()} />;

  // True empty state only when there are no units at all (no search, no filter).
  if (!pageRows.length && !hasFilters && totalResults === 0) {
    return (
      <>
        <OrgEmptyState
          icon="ri-node-tree"
          title="No org units yet"
          description="Add a CEO node first, then layer managers, supervisors, and department nodes beneath it."
          action={
            canCreate ? (
              <OrgPrimaryButton onClick={openCreate}>
                <i className="ri-add-line text-base" aria-hidden />
                Add first unit
              </OrgPrimaryButton>
            ) : undefined
          }
        />
        {unitModalOpen ? (
          <OrgUnitModal open unit={editing} initialType={initialType} onClose={() => setUnitModalOpen(false)} onSaved={refreshAfterMutation} />
        ) : null}
      </>
    );
  }

  const viewHistory = (unitId: string) => {
    setSelectedUnitId(unitId);
    setTab("history");
  };

  return (
    <>
      {coverage ? <SetupChecklist items={checklistItems} /> : null}

      <div
        className="mb-4 inline-flex rounded-lg border border-defaultborder/60 bg-light/30 p-1 dark:bg-white/[0.02]"
        role="tablist"
        aria-label="Structure views"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "units"}
          className={`rounded-md px-3 py-1.5 text-[0.8125rem] font-medium transition-colors ${
            tab === "units"
              ? "bg-white text-defaulttextcolor shadow-sm dark:bg-bodybg"
              : "text-defaulttextcolor/65 hover:text-defaulttextcolor"
          }`}
          onClick={() => setTab("units")}
        >
          Units
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "history"}
          className={`rounded-md px-3 py-1.5 text-[0.8125rem] font-medium transition-colors ${
            tab === "history"
              ? "bg-white text-defaulttextcolor shadow-sm dark:bg-bodybg"
              : "text-defaulttextcolor/65 hover:text-defaulttextcolor"
          }`}
          onClick={() => setTab("history")}
        >
          History
        </button>
      </div>

      {tab === "history" ? (
        <StructureHistoryPanel
          entityId={selectedUnitId}
          onSelectUnit={(id) => setSelectedUnitId(id)}
        />
      ) : (
        <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-defaulttextcolor/45" aria-hidden />
            <input
              type="search"
              className="form-control !ps-9 !py-2 !text-[0.8125rem]"
              placeholder="Search units by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search org units"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-[0.8125rem] text-defaulttextcolor/70">
            <input
              type="checkbox"
              className="form-check-input"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
            />
            Include inactive
          </label>
        </div>
        {canCreate ? (
          <OrgPrimaryButton onClick={openCreate}>
            <i className="ri-add-line text-base" aria-hidden />
            Add unit
          </OrgPrimaryButton>
        ) : null}
      </div>

      {!pageRows.length ? (
        <OrgEmptyState
          icon="ri-search-line"
          title="No units match"
          description="No org units match your search or filter. Try a different term or clear the filters."
        />
      ) : (
        <>
          {canEdit ? (
            <p className="mb-2 text-[0.75rem] text-defaulttextcolor/55">
              Server-paged unit list. Use reorder controls to change sibling order among active units.
            </p>
          ) : null}
          <div className="table-responsive rounded-lg border border-defaultborder/60">
          <table className="table whitespace-nowrap min-w-full mb-0">
            <thead className="bg-light/60 dark:bg-white/[0.03]">
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Type</th>
                <th scope="col">Parent</th>
                <th scope="col">Head</th>
                <th scope="col">Span</th>
                <th scope="col">Status</th>
                <th scope="col" className="min-w-[17rem] text-end">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map(({ unit: row, depth }) => {
                const inactive = row.isActive === false;
                return (
                  <tr key={row.id} className="border-defaultborder/50">
                    <td className="font-medium">
                      <span style={{ paddingInlineStart: depth ? `${depth * 1.25}rem` : undefined }}>
                        {depth > 0 ? <span className="text-defaulttextcolor/30">└ </span> : null}
                        {row.name}
                      </span>
                    </td>
                    <td>
                      <OrgTypeBadge type={row.type} />
                    </td>
                    <td className="max-w-[10rem] truncate text-defaulttextcolor/75" title={parentLabelForUnit(row)}>
                      {parentLabelForUnit(row)}
                    </td>
                    <td className="max-w-[10rem] truncate text-defaulttextcolor/75" title={headLabel(row)}>
                      {headLabel(row)}
                    </td>
                    <td>
                      {row.spanBand === "warn" || row.spanBand === "critical" ? (
                        <span
                          className={`badge ${
                            row.spanBand === "critical"
                              ? "bg-danger/10 text-danger"
                              : "bg-warning/10 text-warning"
                          }`}
                          title={`Direct reports: ${row.spanDirect ?? "?"}`}
                        >
                          Span {row.spanDirect ?? "?"}
                        </span>
                      ) : (
                        <span className="text-defaulttextcolor/40">—</span>
                      )}
                    </td>
                    <td>
                      {inactive ? (
                        <span className="badge bg-secondary/10 text-secondary">Inactive</span>
                      ) : (
                        <span className="badge bg-success/10 text-success">Active</span>
                      )}
                    </td>
                    <td className="text-end align-middle">
                      <OrgTableActions label={`Actions for ${row.name}`}>
                        {inactive ? (
                          canDelete ? (
                            <>
                              <OrgTableAction tone="primary" title="Reactivate org unit" onClick={() => handleReactivate(row)}>
                                <i className="ri-refresh-line text-[0.875rem]" aria-hidden />
                                Reactivate
                              </OrgTableAction>
                              <OrgTableAction tone="danger" title="Delete org unit permanently" onClick={() => handleDelete(row)}>
                                <i className="ri-delete-bin-line text-[0.875rem]" aria-hidden />
                                Delete
                              </OrgTableAction>
                            </>
                          ) : null
                        ) : (
                          <>
                            {canEdit
                              ? (() => {
                                  const sp = siblingPos.get(row.id);
                                  if (!sp || sp.count < 2) return null;
                                  return (
                                    <span className="inline-flex shrink-0 items-center gap-1">
                                      <OrgTableAction
                                        tone="secondary"
                                        title="Move up among siblings"
                                        disabled={sp.index === 0}
                                        onClick={() => moveUnit(row, "up")}
                                      >
                                        <i className="ri-arrow-up-line text-[0.875rem]" aria-hidden />
                                      </OrgTableAction>
                                      <OrgTableAction
                                        tone="secondary"
                                        title="Move down among siblings"
                                        disabled={sp.index === sp.count - 1}
                                        onClick={() => moveUnit(row, "down")}
                                      >
                                        <i className="ri-arrow-down-line text-[0.875rem]" aria-hidden />
                                      </OrgTableAction>
                                    </span>
                                  );
                                })()
                              : null}
                            {canEdit ? (
                              <>
                                <OrgTableAction tone="primary" title="Edit unit details" onClick={() => openEdit(row)}>
                                  <i className="ri-pencil-line text-[0.875rem]" aria-hidden />
                                  Edit
                                </OrgTableAction>
                                <OrgTableAction
                                  tone="secondary"
                                  title="View change history for this unit"
                                  onClick={() => viewHistory(row.id)}
                                >
                                  <i className="ri-history-line text-[0.875rem]" aria-hidden />
                                  History
                                </OrgTableAction>
                                <OrgTableAction
                                  tone="secondary"
                                  title="Move unit to a different parent"
                                  onClick={() => handleReparent(row)}
                                >
                                  <i className="ri-drag-move-2-line text-[0.875rem]" aria-hidden />
                                  Reparent
                                </OrgTableAction>
                                <OrgTableAction tone="info" title="Assign leadership head" onClick={() => setHeadUnit(row)}>
                                  <i className="ri-user-star-line text-[0.875rem]" aria-hidden />
                                  Head
                                </OrgTableAction>
                              </>
                            ) : null}
                            {canDelete ? (
                              <span className={canEdit ? "inline-flex shrink-0 border-s border-defaultborder/60 ps-2" : "inline-flex shrink-0"}>
                                <OrgTableAction tone="danger" title="Deactivate org unit" onClick={() => handleDeactivate(row)}>
                                  <i className="ri-forbid-line text-[0.875rem]" aria-hidden />
                                  Deactivate
                                </OrgTableAction>
                              </span>
                            ) : null}
                          </>
                        )}
                      </OrgTableActions>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </>
      )}

      {totalPages > 1 ? (
        <nav className="mt-4 flex items-center justify-between gap-2" aria-label="Org units pagination">
          <button
            type="button"
            className="ti-btn ti-btn-light !py-1.5 !px-3 !text-[0.8125rem] disabled:opacity-50"
            onClick={() => setPage(Math.max(1, page - 1))}
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
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            Next <i className="ri-arrow-right-s-line" aria-hidden />
          </button>
        </nav>
      ) : null}

      {unitModalOpen ? (
        <OrgUnitModal open unit={editing} initialType={initialType} onClose={() => setUnitModalOpen(false)} onSaved={refreshAfterMutation} />
      ) : null}
      {headUnit ? (
        <AssignHeadModal
          open
          unitId={headUnit.id}
          unitName={headUnit.name}
          unitType={headUnit.type}
          departmentId={headUnit.departmentId}
          currentHeadId={headUnit.headEmployeeId}
          onClose={() => setHeadUnit(null)}
          onSaved={refreshAfterMutation}
        />
      ) : null}
      {assignOpen ? (
        <AssignToDepartmentModal
          open
          employees={unassigned}
          onClose={() => setAssignOpen(false)}
          onAssigned={refreshAfterMutation}
        />
      ) : null}
      {reparentUnit ? (
        <ReparentUnitModal
          open
          unit={reparentUnit}
          units={allUnits}
          onClose={() => setReparentUnit(null)}
          onSaved={refreshAfterMutation}
        />
      ) : null}
        </>
      )}
    </>
  );
}
