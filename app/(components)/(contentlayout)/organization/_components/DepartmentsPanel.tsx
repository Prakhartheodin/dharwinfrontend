"use client";

import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import {
  deactivateDepartment,
  deleteDepartment,
  queryDepartments,
  reactivateDepartment,
  type Department,
} from "@/shared/lib/api/departments";
import DepartmentModal from "./DepartmentModal";
import DepartmentMembersModal from "./DepartmentMembersModal";
import {
  OrgEmptyState,
  OrgErrorState,
  OrgLoadingBlock,
  OrgPrimaryButton,
  OrgTableAction,
  OrgTableActions,
} from "./org-ui";
import { useFeaturePermissions } from "@/shared/hooks/use-feature-permissions";

const PAGE_SIZE = 10;
type StatusFilter = "active" | "all";

export default function DepartmentsPanel() {
  const { canCreate, canEdit, canDelete } = useFeaturePermissions("organization.departments");
  // Managing members mutates employee records, so gate it on employee-edit permission.
  const { canEdit: canManageEmployees } = useFeaturePermissions("ats.employees");
  const [rows, setRows] = useState<Department[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [membersDept, setMembersDept] = useState<Department | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await queryDepartments({
        search: debouncedSearch || undefined,
        page,
        limit: PAGE_SIZE,
        sortBy: "name:asc",
        ...(status === "active" ? { isActive: true } : {}),
      });
      setRows(res.results);
      setTotalPages(res.totalPages || 1);
    } catch {
      setError(true);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, status]);

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
      text: `"${row.name}" will be marked inactive and hidden from new assignments. Linked units and employees must be reassigned first.`,
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

  const handleReactivate = async (row: Department) => {
    try {
      await reactivateDepartment(row.id);
      await load();
      await Swal.fire({
        icon: "success",
        title: "Department reactivated",
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

  const handleDelete = async (row: Department) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Delete department permanently?",
      html: `"<b>${row.name}</b>" will be permanently deleted. This cannot be undone.`,
      showCancelButton: true,
      confirmButtonText: "Delete permanently",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      reverseButtons: true,
    });
    if (!confirm.isConfirmed) return;
    try {
      await deleteDepartment(row.id);
      await load();
      await Swal.fire({
        icon: "success",
        title: "Department deleted",
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

  const hasFilters = debouncedSearch.length > 0 || status !== "active";

  if (loading) return <OrgLoadingBlock label="Loading departments…" />;
  if (error) return <OrgErrorState onRetry={() => void load()} />;

  if (!rows.length && !hasFilters) {
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
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-defaulttextcolor/45" aria-hidden />
            <input
              type="search"
              className="form-control !ps-9 !py-2 !text-[0.8125rem]"
              placeholder="Search departments…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search departments"
            />
          </div>
          <select
            className="form-control !py-2 !text-[0.8125rem] !w-auto"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            aria-label="Filter by status"
          >
            <option value="active">Active only</option>
            <option value="all">All statuses</option>
          </select>
        </div>
        {canCreate ? (
          <OrgPrimaryButton onClick={openCreate}>
            <i className="ri-add-line text-base" aria-hidden />
            Add department
          </OrgPrimaryButton>
        ) : null}
      </div>

      {!rows.length ? (
        <OrgEmptyState
          icon="ri-search-line"
          title="No departments match"
          description="No departments match your search or filter. Try a different term or clear the filters."
        />
      ) : (
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
              {rows.map((row) => {
                const inactive = row.isActive === false;
                return (
                  <tr key={row.id} className="border-defaultborder/50">
                    <td className="font-medium">{row.name}</td>
                    <td className="text-defaulttextcolor/70">{row.code?.trim() || "—"}</td>
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
                              <OrgTableAction tone="primary" title="Reactivate department" onClick={() => handleReactivate(row)}>
                                <i className="ri-refresh-line text-[0.875rem]" aria-hidden />
                                Reactivate
                              </OrgTableAction>
                              <OrgTableAction tone="danger" title="Delete department permanently" onClick={() => handleDelete(row)}>
                                <i className="ri-delete-bin-line text-[0.875rem]" aria-hidden />
                                Delete
                              </OrgTableAction>
                            </>
                          ) : null
                        ) : (
                          <>
                            {canManageEmployees ? (
                              <OrgTableAction tone="info" title="Manage department members" onClick={() => setMembersDept(row)}>
                                <i className="ri-team-line text-[0.875rem]" aria-hidden />
                                Members
                              </OrgTableAction>
                            ) : null}
                            {canEdit ? (
                              <OrgTableAction tone="primary" title="Edit department details" onClick={() => openEdit(row)}>
                                <i className="ri-pencil-line text-[0.875rem]" aria-hidden />
                                Edit
                              </OrgTableAction>
                            ) : null}
                            {canDelete ? (
                              <span className={canEdit ? "inline-flex shrink-0 border-s border-defaultborder/60 ps-2" : "inline-flex shrink-0"}>
                                <OrgTableAction tone="danger" title="Deactivate department" onClick={() => handleDeactivate(row)}>
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
      )}

      {totalPages > 1 ? (
        <nav className="mt-4 flex items-center justify-between gap-2" aria-label="Departments pagination">
          <button
            type="button"
            className="ti-btn ti-btn-light !py-1.5 !px-3 !text-[0.8125rem] disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
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
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next <i className="ri-arrow-right-s-line" aria-hidden />
          </button>
        </nav>
      ) : null}

      <DepartmentModal open={modalOpen} department={editing} onClose={() => setModalOpen(false)} onSaved={load} />
      <DepartmentMembersModal
        open={!!membersDept}
        departmentId={membersDept?.id ?? null}
        departmentName={membersDept?.name ?? ""}
        onClose={() => setMembersDept(null)}
      />
    </>
  );
}
