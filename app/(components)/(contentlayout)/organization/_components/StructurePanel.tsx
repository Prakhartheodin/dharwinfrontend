"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Swal from "sweetalert2";
import {
  deactivateOrgUnit,
  deleteOrgUnit,
  getOrgCoverage,
  getOrgTree,
  listOrgUnitsPaged,
  reactivateOrgUnit,
  reparentOrgUnit,
  updateOrgUnit,
  type OrgCoverageSummary,
  type OrgUnitNode,
  type OrgUnitType,
} from "@/shared/lib/api/org-structure";
import OrgUnitModal from "./OrgUnitModal";
import AssignHeadModal from "./AssignHeadModal";
import AssignToDepartmentModal from "./AssignToDepartmentModal";
import {
  OrgEmptyState,
  OrgErrorState,
  OrgLoadingBlock,
  OrgPrimaryButton,
  OrgTableAction,
  OrgTableActions,
  OrgTypeBadge,
} from "./org-ui";
import { useFeaturePermissions } from "@/shared/hooks/use-feature-permissions";

const PAGE_SIZE = 10;
const CHECKLIST_DISMISS_KEY = "org-setup-checklist-dismissed";

type ChecklistCta = { label: string; onClick?: () => void; href?: string };
type ChecklistItem = {
  key: string;
  label: string;
  done: boolean;
  gap?: number;
  why: string;
  cta?: ChecklistCta;
};

function ChecklistCtaButton({ cta, variant }: { cta: ChecklistCta; variant: "primary" | "link" }) {
  const cls =
    variant === "primary"
      ? "ti-btn ti-btn-primary-full !py-1.5 !px-3 !text-[0.75rem] inline-flex items-center gap-1 !mb-0 shrink-0"
      : "inline-flex items-center gap-1 text-[0.75rem] font-medium text-primary hover:underline shrink-0";
  const inner = (
    <>
      {cta.label}
      <i className="ri-arrow-right-line" aria-hidden />
    </>
  );
  if (cta.href) {
    return (
      <Link href={cta.href} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={cta.onClick} className={cls}>
      {inner}
    </button>
  );
}

function SetupChecklist({ items }: { items: ChecklistItem[] }) {
  const total = items.length;
  const doneCount = items.filter((i) => i.done).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const allDone = total > 0 && doneCount === total;
  const nextItem = items.find((i) => !i.done && i.cta);

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
          className="text-[0.75rem] font-medium text-defaulttextcolor/60 hover:text-defaulttextcolor"
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
          <span className="text-[0.8125rem] text-defaulttextcolor/80">
            <span className="font-semibold text-defaulttextcolor">Next:</span> {nextItem.label}
            {nextItem.gap ? <span className="text-defaulttextcolor/60"> — {nextItem.gap} remaining</span> : null}
          </span>
          {nextItem.cta ? <ChecklistCtaButton cta={nextItem.cta} variant="primary" /> : null}
        </div>
      ) : null}

      <ul className="mb-0 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item.key}
            className="flex items-center justify-between gap-2 text-[0.8125rem]"
            title={item.why}
          >
            <span className="flex min-w-0 items-center gap-2">
              <i
                className={
                  item.done
                    ? "ri-checkbox-circle-fill text-success shrink-0"
                    : "ri-checkbox-blank-circle-line text-defaulttextcolor/45 shrink-0"
                }
                aria-hidden
              />
              <span className="sr-only">{item.done ? "Done:" : "To do:"}</span>
              <span className={`truncate ${item.done ? "text-defaulttextcolor" : "text-defaulttextcolor/70"}`}>
                {item.label}
              </span>
              {!item.done && item.gap ? (
                <span className="shrink-0 rounded-full bg-warning/15 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-warning">
                  {item.gap}
                </span>
              ) : null}
            </span>
            {!item.done && item.cta ? <ChecklistCtaButton cta={item.cta} variant="link" /> : null}
          </li>
        ))}
      </ul>

      {allDone ? (
        <div className="mt-3 text-end">
          <button
            type="button"
            onClick={dismiss}
            className="text-[0.75rem] font-medium text-defaulttextcolor/55 hover:text-defaulttextcolor"
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
  const [masterUnits, setMasterUnits] = useState<OrgUnitNode[]>([]);
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

  // Debounce the search box so we don't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 whenever the filters change.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, includeInactive]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      // Pull the whole set once; ordering/search/pagination happen client-side so the
      // table can render the real hierarchy (parents above their children).
      const [all, coverageSummary, tree] = await Promise.all([
        listOrgUnitsPaged({ includeInactive: true, limit: 10000 }),
        getOrgCoverage().catch(() => null),
        getOrgTree().catch(() => null),
      ]);
      setMasterUnits(all.results);
      setCoverage(coverageSummary);
      setUnassigned(tree?.unassigned ?? []);
    } catch {
      setError(true);
      setMasterUnits([]);
      setCoverage(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Active units drive the reorder / reparent / sibling logic.
  const allUnits = useMemo(() => masterUnits.filter((u) => u.isActive !== false), [masterUnits]);

  // Id → unit lookup for parent names (all units, so inactive parents still resolve).
  const unitsById = useMemo(() => new Map(masterUnits.map((u) => [u.id, u])), [masterUnits]);

  // Rows in hierarchy order with depth for indentation. Searching falls back to a flat
  // filtered list (a filtered subset has no meaningful tree shape).
  const orderedRows = useMemo(() => {
    const pool = includeInactive ? masterUnits : masterUnits.filter((u) => u.isActive !== false);
    const q = debouncedSearch.toLowerCase();
    if (q) {
      return pool.filter((u) => u.name.toLowerCase().includes(q)).map((u) => ({ unit: u, depth: 0 }));
    }
    const ids = new Set(pool.map((u) => u.id));
    const childrenOf = new Map<string, OrgUnitNode[]>();
    for (const u of pool) {
      const key = u.parentId && ids.has(u.parentId) ? u.parentId : "__root__";
      const arr = childrenOf.get(key);
      if (arr) arr.push(u);
      else childrenOf.set(key, [u]);
    }
    for (const arr of childrenOf.values()) {
      arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
    }
    const out: { unit: OrgUnitNode; depth: number }[] = [];
    const walk = (key: string, depth: number) => {
      for (const u of childrenOf.get(key) ?? []) {
        out.push({ unit: u, depth });
        walk(u.id, depth + 1);
      }
    };
    walk("__root__", 0);
    return out;
  }, [masterUnits, includeInactive, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(orderedRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = orderedRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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

  const parentLabel = (parentId: string | null) => {
    if (!parentId) return "—";
    return unitsById.get(parentId)?.name ?? "— (inactive)";
  };

  // All descendant ids of a unit, so reparent can't offer an illegal (cycle) target.
  const descendantIds = useCallback(
    (unitId: string) => {
      const childrenOf = new Map<string, OrgUnitNode[]>();
      for (const u of allUnits) {
        const key = u.parentId ?? "__root__";
        if (!childrenOf.has(key)) childrenOf.set(key, []);
        childrenOf.get(key)!.push(u);
      }
      const out = new Set<string>();
      const walk = (id: string) => {
        for (const child of childrenOf.get(id) ?? []) {
          if (!out.has(child.id)) {
            out.add(child.id);
            walk(child.id);
          }
        }
      };
      walk(unitId);
      return out;
    },
    [allUnits]
  );

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

  const handleReparent = async (row: OrgUnitNode) => {
    const blocked = descendantIds(row.id);
    const { value: parentId } = await Swal.fire({
      title: `Reparent "${row.name}"`,
      input: "select",
      inputOptions: Object.fromEntries([
        ["", "None (root)"],
        ...allUnits
          .filter((u) => u.id !== row.id && !blocked.has(u.id))
          .map((u) => [u.id, `${u.name} (${u.type})`]),
      ]),
      inputValue: row.parentId ?? "",
      showCancelButton: true,
      confirmButtonText: "Move unit",
      cancelButtonText: "Cancel",
    });
    if (parentId === undefined) return;
    try {
      await reparentOrgUnit(row.id, parentId || null);
      await load();
      await Swal.fire({
        icon: "success",
        title: "Unit moved",
        text: `"${row.name}" was reparented successfully.`,
        toast: true,
        position: "top-end",
        timer: 2500,
        showConfirmButton: false,
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Reparent failed";
      await Swal.fire({ icon: "error", title: "Cannot reparent", text: msg });
    }
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
      await load();
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
      await load();
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
      await load();
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
      await load();
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
          label: "Create CEO node",
          done: coverage.checklist.hasCeo,
          why: "The CEO is the single root of the hierarchy.",
          cta: canCreate ? { label: "Add CEO", onClick: () => openCreateWithType("ceo") } : undefined,
        },
        {
          key: "managers",
          label: "Add manager chain",
          done: coverage.checklist.hasManagers,
          why: "Managers report to the CEO and own teams.",
          cta: canCreate ? { label: "Add manager", onClick: () => openCreateWithType("manager") } : undefined,
        },
        {
          key: "supervisors",
          label: "Add supervisors",
          done: coverage.checklist.hasSupervisors,
          why: "Supervisors sit under managers and lead departments.",
          cta: canCreate ? { label: "Add supervisor", onClick: () => openCreateWithType("supervisor") } : undefined,
        },
        {
          key: "deptNodes",
          label: "Link department nodes",
          done: coverage.checklist.hasDepartmentNodes,
          why: "Department nodes place employees on the chart.",
          cta: canCreate ? { label: "Add department node", onClick: () => openCreateWithType("department") } : undefined,
        },
        {
          key: "allLinked",
          label: "All departments linked",
          done: coverage.checklist.allDepartmentsLinked,
          gap: coverage.departmentsWithoutNode,
          why: "Every department record should have a node in the structure.",
          cta: canCreate ? { label: "Add department node", onClick: () => openCreateWithType("department") } : undefined,
        },
        {
          key: "heads",
          label: "Assign leadership heads",
          done: coverage.checklist.allLeadershipHeadsAssigned,
          gap: coverage.unitsMissingHead,
          why: "Each leadership unit should name a head employee.",
          cta: canEdit ? { label: "Assign a head", onClick: assignFirstHeadless } : undefined,
        },
        {
          key: "unassigned",
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
  if (!orderedRows.length && !hasFilters) {
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
        <OrgUnitModal open={unitModalOpen} unit={editing} initialType={initialType} onClose={() => setUnitModalOpen(false)} onSaved={load} />
      </>
    );
  }

  return (
    <>
      {coverage ? <SetupChecklist items={checklistItems} /> : null}

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

      {!orderedRows.length ? (
        <OrgEmptyState
          icon="ri-search-line"
          title="No units match"
          description="No org units match your search or filter. Try a different term or clear the filters."
        />
      ) : (
        <>
          {canEdit ? (
            <p className="mb-2 text-[0.75rem] text-defaulttextcolor/55">
              Rows follow the org hierarchy (parents above their children). Use ↑ / ↓ to order siblings.
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
                <th scope="col">Status</th>
                <th scope="col" className="min-w-[17rem] text-end">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(({ unit: row, depth }) => {
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
                    <td className="max-w-[10rem] truncate text-defaulttextcolor/75" title={parentLabel(row.parentId)}>
                      {parentLabel(row.parentId)}
                    </td>
                    <td className="max-w-[10rem] truncate text-defaulttextcolor/75" title={headLabel(row)}>
                      {headLabel(row)}
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
            onClick={() => setPage(Math.max(1, safePage - 1))}
            disabled={safePage <= 1}
          >
            <i className="ri-arrow-left-s-line" aria-hidden /> Prev
          </button>
          <span className="text-[0.8125rem] text-defaulttextcolor/65">
            Page <span className="font-semibold text-defaulttextcolor">{safePage}</span> of {totalPages}
          </span>
          <button
            type="button"
            className="ti-btn ti-btn-light !py-1.5 !px-3 !text-[0.8125rem] disabled:opacity-50"
            onClick={() => setPage(Math.min(totalPages, safePage + 1))}
            disabled={safePage >= totalPages}
          >
            Next <i className="ri-arrow-right-s-line" aria-hidden />
          </button>
        </nav>
      ) : null}

      <OrgUnitModal open={unitModalOpen} unit={editing} initialType={initialType} onClose={() => setUnitModalOpen(false)} onSaved={load} />
      <AssignHeadModal
        open={!!headUnit}
        unitId={headUnit?.id ?? null}
        unitName={headUnit?.name ?? ""}
        unitType={headUnit?.type}
        departmentId={headUnit?.departmentId}
        currentHeadId={headUnit?.headEmployeeId}
        onClose={() => setHeadUnit(null)}
        onSaved={load}
      />
      <AssignToDepartmentModal
        open={assignOpen}
        employees={unassigned}
        onClose={() => setAssignOpen(false)}
        onAssigned={load}
      />
    </>
  );
}
