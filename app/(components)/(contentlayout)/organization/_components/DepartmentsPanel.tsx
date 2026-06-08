"use client";

import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { deactivateDepartment, listDepartments, type Department } from "@/shared/lib/api/departments";
import DepartmentModal from "./DepartmentModal";
import {
  OrgEmptyState,
  OrgLoadingBlock,
  OrgPrimaryButton,
  OrgTableAction,
} from "./org-ui";
import { useFeaturePermissions } from "@/shared/hooks/use-feature-permissions";

export default function DepartmentsPanel() {
  const { canCreate, canEdit, canDelete } = useFeaturePermissions("organization.departments");
  const [rows, setRows] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listDepartments());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (row: Department) => {
    setEditing(row);
    setModalOpen(true);
  };

  const handleDeactivate = async (row: Department) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Deactivate department?",
      text: `"${row.name}" will be marked inactive and hidden from new assignments.`,
      showCancelButton: true,
      confirmButtonText: "Deactivate",
      cancelButtonText: "Keep active",
      confirmButtonColor: "#e6533c",
      reverseButtons: true,
    });
    if (!confirm.isConfirmed) return;
    try {
      await deactivateDepartment(row.id);
      await load();
      await Swal.fire({
        icon: "success",
        title: "Department deactivated",
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

  if (loading) return <OrgLoadingBlock label="Loading departments…" />;

  if (!rows.length) {
    return (
      <>
        <OrgEmptyState
          icon="ri-building-2-line"
          title="No departments yet"
          description="Create your first department to standardize HRMS records and link org structure nodes."
          action={
            canCreate ? (
              <OrgPrimaryButton onClick={openCreate}>
                <i className="ri-add-line text-base" aria-hidden />
                Add department
              </OrgPrimaryButton>
            ) : undefined
          }
        />
        <DepartmentModal
          open={modalOpen}
          department={editing}
          onClose={() => setModalOpen(false)}
          onSaved={load}
        />
      </>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="mb-0 text-[0.8125rem] text-defaulttextcolor/65">
          <span className="font-semibold text-defaulttextcolor">{rows.length}</span> department
          {rows.length === 1 ? "" : "s"} configured
        </p>
        {canCreate ? (
          <OrgPrimaryButton onClick={openCreate}>
            <i className="ri-add-line text-base" aria-hidden />
            Add department
          </OrgPrimaryButton>
        ) : null}
      </div>

      <div className="table-responsive rounded-lg border border-defaultborder/60">
        <table className="table whitespace-nowrap min-w-full mb-0">
          <thead className="bg-light/60 dark:bg-white/[0.03]">
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Code</th>
              <th scope="col">Status</th>
              <th scope="col" className="text-end">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-defaultborder/50">
                <td className="font-medium">{row.name}</td>
                <td className="text-defaulttextcolor/70">{row.code?.trim() || "—"}</td>
                <td>
                  {row.isActive === false ? (
                    <span className="badge bg-secondary/10 text-secondary">Inactive</span>
                  ) : (
                    <span className="badge bg-success/10 text-success">Active</span>
                  )}
                </td>
                <td className="text-end">
                  <div className="inline-flex flex-wrap justify-end gap-1.5">
                    {canEdit ? (
                      <OrgTableAction tone="primary" title="Edit department" onClick={() => openEdit(row)}>
                        <i className="ri-pencil-line" aria-hidden />
                        Edit
                      </OrgTableAction>
                    ) : null}
                    {canDelete && row.isActive !== false ? (
                      <OrgTableAction tone="danger" title="Deactivate department" onClick={() => handleDeactivate(row)}>
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

      <DepartmentModal open={modalOpen} department={editing} onClose={() => setModalOpen(false)} onSaved={load} />
    </>
  );
}
