"use client";

import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import {
  deactivateOrgUnit,
  listOrgUnits,
  reparentOrgUnit,
  type OrgUnitNode,
} from "@/shared/lib/api/org-structure";
import OrgUnitModal from "./OrgUnitModal";
import AssignHeadModal from "./AssignHeadModal";
import {
  OrgEmptyState,
  OrgLoadingBlock,
  OrgPrimaryButton,
  OrgTableAction,
  OrgTypeBadge,
} from "./org-ui";
import { useFeaturePermissions } from "@/shared/hooks/use-feature-permissions";

export default function StructurePanel() {
  const { canCreate, canEdit, canDelete } = useFeaturePermissions("organization.structure");
  const [rows, setRows] = useState<OrgUnitNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [editing, setEditing] = useState<OrgUnitNode | null>(null);
  const [headUnit, setHeadUnit] = useState<OrgUnitNode | null>(null);
  const [coverage, setCoverage] = useState<OrgCoverageSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listOrgUnits());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const parentLabel = (parentId: string | null) => {
    if (!parentId) return "—";
    return rows.find((r) => r.id === parentId)?.name ?? parentId;
  };

  const openCreate = () => {
    setEditing(null);
    setUnitModalOpen(true);
  };

  const openEdit = (row: OrgUnitNode) => {
    setEditing(row);
    setUnitModalOpen(true);
  };

  const handleReparent = async (row: OrgUnitNode) => {
    const { value: parentId } = await Swal.fire({
      title: `Reparent "${row.name}"`,
      input: "select",
      inputOptions: Object.fromEntries([
        ["", "None (root)"],
        ...rows.filter((u) => u.id !== row.id).map((u) => [u.id, `${u.name} (${u.type})`]),
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
      text: `"${row.name}" will be marked inactive and removed from the live chart.`,
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
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Deactivate failed";
      await Swal.fire({ icon: "error", title: "Cannot deactivate", text: msg });
    }
  };

  if (loading) return <OrgLoadingBlock label="Loading org units…" />;

  if (!rows.length) {
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
        <OrgUnitModal open={unitModalOpen} unit={editing} onClose={() => setUnitModalOpen(false)} onSaved={load} />
      </>
    );
  }

  return (
    <>
      {coverage ? (
        <div className="mb-4 overflow-hidden rounded-xl border border-defaultborder/60 bg-light/30 p-4 dark:bg-white/[0.02]">
          <h6 className="mb-3 text-[0.875rem] font-semibold">Setup checklist</h6>
          <ul className="mb-0 grid gap-2 sm:grid-cols-2">
            {[
              ["Create CEO node", coverage.checklist.hasCeo],
              ["Add manager chain", coverage.checklist.hasManagers],
              ["Add supervisors", coverage.checklist.hasSupervisors],
              ["Link department nodes", coverage.checklist.hasDepartmentNodes],
              ["All departments linked", coverage.checklist.allDepartmentsLinked],
              ["Assign leadership heads", coverage.checklist.allLeadershipHeadsAssigned],
              ["No unassigned employees", coverage.checklist.noUnassignedEmployees],
            ].map(([label, done]) => (
              <li key={String(label)} className="flex items-center gap-2 text-[0.8125rem]">
                <i className={done ? "ri-checkbox-circle-fill text-success" : "ri-checkbox-blank-circle-line text-defaulttextcolor/45"} aria-hidden />
                <span className={done ? "text-defaulttextcolor" : "text-defaulttextcolor/70"}>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="mb-0 text-[0.8125rem] text-defaulttextcolor/65">
          <span className="font-semibold text-defaulttextcolor">{rows.length}</span> org unit
          {rows.length === 1 ? "" : "s"} in hierarchy
        </p>
        {canCreate ? (
          <OrgPrimaryButton onClick={openCreate}>
            <i className="ri-add-line text-base" aria-hidden />
            Add unit
          </OrgPrimaryButton>
        ) : null}
      </div>

      <div className="table-responsive rounded-lg border border-defaultborder/60">
        <table className="table whitespace-nowrap min-w-full mb-0">
          <thead className="bg-light/60 dark:bg-white/[0.03]">
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Type</th>
              <th scope="col">Parent</th>
              <th scope="col" className="text-end">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-defaultborder/50">
                <td className="font-medium">{row.name}</td>
                <td>
                  <OrgTypeBadge type={row.type} />
                </td>
                <td className="text-defaulttextcolor/75">{parentLabel(row.parentId)}</td>
                <td className="text-end">
                  <div className="inline-flex max-w-[18rem] flex-wrap justify-end gap-1.5">
                    {canEdit ? (
                      <>
                        <OrgTableAction tone="primary" title="Edit unit" onClick={() => openEdit(row)}>
                          <i className="ri-pencil-line" aria-hidden />
                          Edit
                        </OrgTableAction>
                        <OrgTableAction tone="secondary" title="Change parent" onClick={() => handleReparent(row)}>
                          <i className="ri-drag-move-2-line" aria-hidden />
                          Reparent
                        </OrgTableAction>
                        <OrgTableAction tone="info" title="Assign head" onClick={() => setHeadUnit(row)}>
                          <i className="ri-user-star-line" aria-hidden />
                          Head
                        </OrgTableAction>
                      </>
                    ) : null}
                    {canDelete ? (
                      <OrgTableAction tone="danger" title="Deactivate unit" onClick={() => handleDeactivate(row)}>
                        <i className="ri-forbid-line" aria-hidden />
                        Deactivate
                      </OrgTableAction>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <OrgUnitModal open={unitModalOpen} unit={editing} onClose={() => setUnitModalOpen(false)} onSaved={load} />
      <AssignHeadModal
        open={!!headUnit}
        unitId={headUnit?.id ?? null}
        unitName={headUnit?.name ?? ""}
        currentHeadId={headUnit?.headEmployeeId}
        onClose={() => setHeadUnit(null)}
        onSaved={load}
      />
    </>
  );
}
