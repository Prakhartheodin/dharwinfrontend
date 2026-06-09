"use client";

import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import {
  applyOrgScenario,
  cloneOrgScenario,
  createOrgScenario,
  diffOrgScenario,
  getOrgScenarioTree,
  listOrgScenarios,
  reparentScenarioUnit,
  type OrgScenario,
  type OrgScenarioDiff,
} from "@/shared/lib/api/org-scenario";
import type { OrgTree, OrgUnitNode } from "@/shared/lib/api/org-structure";
import { OrgEmptyState, OrgErrorState, OrgLoadingBlock, OrgPrimaryButton } from "./org-ui";
import { useFeaturePermissions } from "@/shared/hooks/use-feature-permissions";

function flattenUnits(nodes: OrgUnitNode[], out: OrgUnitNode[] = []) {
  for (const n of nodes || []) {
    out.push(n);
    flattenUnits(n.children, out);
  }
  return out;
}

export default function OrgScenariosPanel() {
  const { canCreate, canEdit } = useFeaturePermissions("organization.scenarios");
  const [scenarios, setScenarios] = useState<OrgScenario[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tree, setTree] = useState<OrgTree | null>(null);
  const [diff, setDiff] = useState<OrgScenarioDiff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dragUnitId, setDragUnitId] = useState<string | null>(null);

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

  const handleApply = async (id: string) => {
    const confirm = await Swal.fire({
      title: "Apply scenario to live org?",
      text: "Changes will be written to production structure with batch audit.",
      icon: "warning",
      showCancelButton: true,
    });
    if (!confirm.isConfirmed) return;
    await applyOrgScenario(id);
    await loadScenarioDetail(id);
    await Swal.fire({ icon: "success", title: "Scenario applied" });
  };

  const handleDropOn = async (targetId: string | null) => {
    if (!selectedId || !dragUnitId || dragUnitId === targetId) {
      setDragUnitId(null);
      return;
    }
    try {
      const updated = await reparentScenarioUnit(selectedId, dragUnitId, targetId);
      setTree(updated);
      setDiff(await diffOrgScenario(selectedId));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "That move isn't allowed in the hierarchy.";
      await Swal.fire({ icon: "error", title: "Cannot move unit", text: msg });
    } finally {
      setDragUnitId(null);
    }
  };

  if (loading) return <OrgLoadingBlock label="Loading scenarios…" />;
  if (error) return <OrgErrorState onRetry={() => void load()} />;

  const flat = tree ? flattenUnits(tree.roots) : [];

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
              <li key={s.id}>
                <button
                  type="button"
                  className={`w-full rounded-lg px-3 py-2 text-left text-[0.8125rem] ${
                    selectedId === s.id ? "bg-primary/10 text-primary" : "hover:bg-light/60"
                  }`}
                  onClick={() => void loadScenarioDetail(s.id)}
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="ml-2 text-[0.6875rem] uppercase text-defaulttextcolor/50">{s.status}</span>
                </button>
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
                {diff?.changeCount ?? 0} change(s) vs live
              </p>
              {canEdit ? (
                <OrgPrimaryButton onClick={() => void handleApply(selectedId)}>Apply to live</OrgPrimaryButton>
              ) : null}
            </div>
            <p className="mb-2 text-[0.75rem] text-defaulttextcolor/55">
              Sandbox drag-drop: drag a unit row onto a new parent (keyboard: use Structure reparent for WCAG).
            </p>
            <div className="max-h-[28rem] overflow-auto rounded-lg border border-defaultborder/50">
              <table className="table mb-0 whitespace-nowrap text-[0.8125rem]">
                <thead>
                  <tr>
                    <th>Unit</th>
                    <th>Type</th>
                    <th>Drop target</th>
                  </tr>
                </thead>
                <tbody>
                  {flat.map((u) => (
                    <tr
                      key={u.id}
                      draggable={canEdit && scenarios.find((s) => s.id === selectedId)?.status === "draft"}
                      onDragStart={() => setDragUnitId(u.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => void handleDropOn(u.id)}
                    >
                      <td>{u.name}</td>
                      <td>{u.type}</td>
                      <td>
                        <button
                          type="button"
                          className="text-primary text-[0.75rem] hover:underline"
                          onClick={() => void handleDropOn(u.id)}
                          disabled={!canEdit}
                        >
                          Reparent here
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
