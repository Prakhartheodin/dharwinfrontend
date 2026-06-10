"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { queryEmployeeDirectory } from "@/shared/lib/api/org-structure";
import { OrgEmptyState, OrgErrorState, OrgNavButton, OrgLoadingBlock, OrgPageLayout, OrgSecondaryButton } from "../_components/org-ui";
import type { DirectoryEmployee } from "../_components/DirectoryProfileModal";

// Read-only quick view — lazy so opening a profile doesn't compile the heavy ATS editor.
const DirectoryProfileModal = dynamic(() => import("../_components/DirectoryProfileModal"), { ssr: false });

const PAGE_SIZE = 20;

export default function OrgDirectoryPage() {
  const [rows, setRows] = useState<
    { id: string; fullName: string; email: string; designation: string; departmentName: string }[]
  >([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [profileEmp, setProfileEmp] = useState<DirectoryEmployee | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await queryEmployeeDirectory({
        page,
        limit: PAGE_SIZE,
        ...(debouncedSearch ? { q: debouncedSearch } : {}),
      });
      setRows(res.results);
      setTotalPages(Math.max(1, res.totalPages || 1));
    } catch {
      setError(true);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <OrgPageLayout
      seoTitle="Employee Directory"
      currentpage="Directory"
      subtitle="Read-only employee lookup across departments. Open a profile from the chart or ATS when you need to edit."
      headerActions={
        <OrgNavButton href="/organization/chart" variant="secondary">
          <i className="ri-organization-chart text-base" aria-hidden />
          Org chart
        </OrgNavButton>
      }
    >
      <div className="mb-4 max-w-md">
        <label htmlFor="org-directory-search" className="form-label !text-[0.75rem] mb-1">
          Search employees
        </label>
        <input
          id="org-directory-search"
          type="search"
          className="form-control !py-2 !text-[0.8125rem]"
          placeholder="Name, email, department…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <OrgLoadingBlock label="Loading directory…" />
      ) : error ? (
        <OrgErrorState onRetry={() => void load()} />
      ) : !rows.length ? (
        <OrgEmptyState
          icon="ri-contacts-book-2-line"
          title="No employees found"
          description={debouncedSearch ? "Try a different search term." : "No active employees are available yet."}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-defaultborder/70 bg-white dark:bg-bodybg">
          <div className="table-responsive">
            <table className="table min-w-full mb-0">
              <thead className="bg-light/60 dark:bg-white/[0.03]">
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Designation</th>
                  <th scope="col">Department</th>
                  <th scope="col" className="text-end">
                    Profile
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-defaultborder/50">
                    <td className="font-medium">{row.fullName}</td>
                    <td className="text-defaulttextcolor/70">{row.email || "—"}</td>
                    <td className="text-defaulttextcolor/70">{row.designation || "—"}</td>
                    <td className="text-defaulttextcolor/70">{row.departmentName || "—"}</td>
                    <td className="text-end">
                      <button
                        type="button"
                        onClick={() => setProfileEmp(row)}
                        className="ti-btn ti-btn-light !py-1.5 !px-3 !text-[0.75rem] !mb-0 inline-flex items-center gap-1"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-2 border-t border-defaultborder/60 px-4 py-3">
              <OrgSecondaryButton type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Previous
              </OrgSecondaryButton>
              <span className="text-[0.75rem] text-defaulttextcolor/60">
                Page {page} of {totalPages}
              </span>
              <OrgSecondaryButton
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </OrgSecondaryButton>
            </div>
          ) : null}
        </div>
      )}

      {profileEmp ? (
        <DirectoryProfileModal open employee={profileEmp} onClose={() => setProfileEmp(null)} />
      ) : null}
    </OrgPageLayout>
  );
}
