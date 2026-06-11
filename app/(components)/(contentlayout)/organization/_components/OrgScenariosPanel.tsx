"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  applyOrgScenario,
  cloneOrgScenario,
  createOrgScenario,
  deleteOrgScenario,
  diffOrgScenario,
  getOrgScenarioTree,
  listOrgScenarios,
  reparentScenarioUnit,
  type OrgScenario,
  type OrgScenarioDiff,
} from "@/shared/lib/api/org-scenario";
import type { OrgTree, OrgUnitNode } from "@/shared/lib/api/org-structure";
import { canReparentOrgUnit, type OrgUnitPlacement } from "@/shared/lib/org-tree.pure";
import { OrgEmptyState, OrgErrorState, OrgLoadingBlock, OrgPrimaryButton, OrgSecondaryButton } from "./org-ui";
import { useFeaturePermissions } from "@/shared/hooks/use-feature-permissions";

function flattenUnits(nodes: OrgUnitNode[], out: OrgUnitNode[] = []) {
  for (const n of nodes || []) {
    out.push(n);
    flattenUnits(n.children, out);
  }
  return out;
}

export default function OrgScenariosPanel() {
  const { canCreate, canEdit, canDelete } = useFeaturePermissions("organization.scenarios");
  const [scenarios, setScenarios] = useState<OrgScenario[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tree, setTree] = useState<OrgTree | null>(null);
  const [diff, setDiff] = useState<OrgScenarioDiff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dragUnitId, setDragUnitId] = useState<string | null>(null);
  const [reparenting, setReparenting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await listOrgScenarios({ limit: 50 });
      setScenarios(res.results.map((s) => ({ ...s, id: s.id || String(s._id) })));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const flat = useMemo(() => (tree ? flattenUnits(tree.roots) : []), [tree]);

  // Same shape + rules the backend validates against, so invalid drops never hit the API.
  const placementUnits = useMemo<OrgUnitPlacement[]>(
    () =>
      flat.map((u) => ({
        id: u.id,
        type: u.type,
        parentId: u.parentId ?? null,
        departmentId: u.departmentId ?? null,
        directToCeo: u.directToCeo,
      })),
    [flat]
  );

  const selectedStatus = scenarios.find((s) => s.id === selectedId)?.status;
  const editable = canEdit && selectedStatus === "draft";

  const canDropOn = useCallback(
    (targetId: string | null) => {
      if (!dragUnitId || targetId === dragUnitId) return false;
      const dragged = placementUnits.find((u) => u.id === dragUnitId);
      // Hide the node's current parent — reparenting to it is a no-op.
      if (dragged && (dragged.parentId ?? null) === (targetId ?? null)) return false;
      return canReparentOrgUnit(placementUnits, dragUnitId, targetId).ok;
    },
    [dragUnitId, placementUnits]
  );

  const canMoveToRoot = useMemo(() => {
    if (!dragUnitId) return false;
    const dragged = placementUnits.find((u) => u.id === dragUnitId);
    // Already at top level → nothing to do.
    if (dragged && (dragged.parentId ?? null) === null) return false;
    return canReparentOrgUnit(placementUnits, dragUnitId, null).ok;
  }, [dragUnitId, placementUnits]);

  const loadScenarioDetail = async (id: string) => {
    setSelectedId(id);
    const [t, d] = await Promise.all([getOrgScenarioTree(id), diffOrgScenario(id)]);
    setTree(t);
    setDiff(d);
  };

  const handleCreate = async () => {
    const { value: name } = await Swal.fire({
      title: "New scenario",
      input: "text",
      inputPlaceholder: "Q3 reorg draft",
      showCancelButton: true,
    });
    if (!name) return;
    const s = await createOrgScenario({ name: String(name) });
    await cloneOrgScenario(s.id || String(s._id));
    await load();
    await Swal.fire({ icon: "success", title: "Scenario created", timer: 1800, showConfirmButton: false });
  };

  const handleDelete = async (s: OrgScenario) => {
    const confirm = await Swal.fire({
      title: `Delete “${s.name}”?`,
      text: "Removes the scenario and its sandbox units. This cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });
    if (!confirm.isConfirmed) return;
    try {
      await deleteOrgScenario(s.id);
      if (selectedId === s.id) {
        setSelectedId(null);
        setTree(null);
        setDiff(null);
      }
      await load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Could not delete scenario.";
      await Swal.fire({ icon: "error", title: "Delete failed", text: msg });
    }
  };

  const handleApply = async (id: string) => {
    const applicable = diff?.applicableCount ?? 0;
    if (applicable === 0) {
      await Swal.fire({
        icon: "info",
        title: "Nothing to apply",
        text: "This scenario has no reparent changes to commit to the live org.",
      });
      return;
    }
    const confirm = await Swal.fire({
      title: "Apply scenario to live org?",
      text: `${applicable} reparent change(s) will be written to production with a batch audit id.`,
      icon: "warning",
      showCancelButton: true,
    });
    if (!confirm.isConfirmed) return;
    try {
      await applyOrgScenario(id);
      await loadScenarioDetail(id);
      await load();
      await Swal.fire({ icon: "success", title: "Scenario applied" });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Could not apply scenario.";
      await Swal.fire({ icon: "error", title: "Apply failed", text: msg });
    }
  };

  // Single reparent path used by both row-drop and the "Move to top level" button.
  const reparentTo = async (unitId: string, parentId: string | null) => {
    if (!selectedId || unitId === parentId) return;
    const verdict = canReparentOrgUnit(placementUnits, unitId, parentId);
    if (!verdict.ok) {
      await Swal.fire({ icon: "error", title: "Move failed", text: verdict.reason });
      return;
    }
    setReparenting(true);
    try {
      const updated = await reparentScenarioUnit(selectedId, unitId, parentId);
      setTree(updated);
      setDiff(await diffOrgScenario(selectedId));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "That move isn't allowed in the hierarchy.";
      await Swal.fire({ icon: "error", title: "Move failed", text: msg });
    } finally {
      setReparenting(false);
    }
  };

  const handleDropOn = async (targetId: string | null) => {
    if (!dragUnitId) return;
    const unitId = dragUnitId;
    setDragUnitId(null);
    await reparentTo(unitId, targetId);
  };

  if (loading) return <OrgLoadingBlock label="Loading scenarios…" />;
  if (error) return <OrgErrorState onRetry={() => void load()} />;

  const changeCount = diff?.changeCount ?? 0;
  const applicableCount = diff?.applicableCount ?? 0;
  const driftCount = Math.max(0, changeCount - applicableCount);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(14rem,22rem)_1fr]">
      <aside className="rounded-xl border border-defaultborder/60 p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h6 className="mb-0 text-[0.875rem] font-semibold">Scenarios</h6>
          {canCreate ? (
            <OrgPrimaryButton onClick={() => void handleCreate()}>
              <i className="ri-add-line" aria-hidden /> New
            </OrgPrimaryButton>
          ) : null}
        </div>
        {scenarios.length === 0 ? (
          <p className="text-[0.8125rem] text-defaulttextcolor/60">No scenarios yet.</p>
        ) : (
          <ul className="mb-0 space-y-1">
            {scenarios.map((s) => (
              <li key={s.id} className="group flex items-center gap-1">
                <button
                  type="button"
                  className={`flex-1 rounded-lg px-3 py-2 text-left text-[0.8125rem] ${
                    selectedId === s.id ? "bg-primary/10 text-primary" : "hover:bg-light/60"
                  }`}
                  onClick={() => void loadScenarioDetail(s.id)}
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="ml-2 text-[0.6875rem] uppercase text-defaulttextcolor/50">{s.status}</span>
                </button>
                {canDelete && s.status !== "applied" ? (
                  <button
                    type="button"
                    aria-label={`Delete scenario ${s.name}`}
                    title="Delete scenario"
                    className="rounded-lg p-2 text-defaulttextcolor/45 hover:bg-danger/10 hover:text-danger"
                    onClick={() => void handleDelete(s)}
                  >
                    <i className="ri-delete-bin-line" aria-hidden />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="rounded-xl border border-defaultborder/60 p-4">
        {!selectedId || !tree ? (
          <OrgEmptyState
            icon="ri-git-branch-line"
            title="Select a scenario"
            description="Clone live org into a draft sandbox, drag units to reparent, review diff, then apply."
          />
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="mb-0 text-[0.8125rem] text-defaulttextcolor/70">
                {applicableCount} reparent change(s) will apply
                {driftCount > 0 ? (
                  <span className="ml-1 text-defaulttextcolor/45">
                    ({driftCount} live-drift change(s) shown for reference, not applied)
                  </span>
                ) : null}
              </p>
              {canEdit ? (
                <OrgPrimaryButton onClick={() => void handleApply(selectedId)}>Apply to live</OrgPrimaryButton>
              ) : null}
            </div>

            {editable ? (
              <p className="mb-2 text-[0.75rem] text-defaulttextcolor/60">
                Drag a unit onto a valid parent: CEO → Manager → Supervisor → Department. Invalid targets are
                disabled while dragging. Drops only change the sandbox until you apply.
              </p>
            ) : (
              <p className="mb-2 text-[0.75rem] text-defaulttextcolor/55">
                This scenario is read-only (only draft scenarios can be edited).
              </p>
            )}

            <div className="overflow-hidden rounded-lg border border-defaultborder/50">
              <div className="table-responsive max-h-[28rem] overflow-auto">
                <table className="table min-w-full mb-0 whitespace-nowrap text-[0.8125rem]">
                  <thead className="bg-light/60 dark:bg-white/[0.03]">
                    <tr>
                      <th scope="col">Unit</th>
                      <th scope="col">Type</th>
                      <th scope="col" className="text-end">
                        Drop target
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {flat.map((u) => {
                      const dropAllowed = canDropOn(u.id);
                      return (
                        <tr
                          key={u.id}
                          draggable={editable && !reparenting}
                          onDragStart={() => editable && setDragUnitId(u.id)}
                          onDragEnd={() => setDragUnitId(null)}
                          onDragOver={(e) => {
                            if (dropAllowed) e.preventDefault();
                          }}
                          onDrop={() => {
                            if (dropAllowed) void handleDropOn(u.id);
                          }}
                          className={
                            dragUnitId === u.id
                              ? "bg-primary/5"
                              : dropAllowed
                                ? "bg-success/5"
                                : undefined
                          }
                        >
                          <td className="font-medium">{u.name}</td>
                          <td className="text-defaulttextcolor/70">{u.type}</td>
                          <td className="text-end text-[0.75rem] text-defaulttextcolor/55">
                            {dropAllowed ? "Drop to reparent here" : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {editable ? (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-defaultborder/60 px-4 py-3">
                  <p className="mb-0 text-[0.75rem] text-defaulttextcolor/60">
                    {dragUnitId
                      ? canMoveToRoot
                        ? "Drop on a highlighted row to set parent, or move to top level."
                        : "Drop on a highlighted row to set parent (only CEO can sit at top level)."
                      : "Drag a row to begin."}
                  </p>
                  <OrgSecondaryButton
                    type="button"
                    disabled={!canMoveToRoot || reparenting}
                    onClick={() => void handleDropOn(null)}
                  >
                    Move to top level
                  </OrgSecondaryButton>
                </div>
              ) : null}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
