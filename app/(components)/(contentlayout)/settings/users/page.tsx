"use client";

import React, { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import Seo from "@/shared/layout-components/seo/seo";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import { ROUTES } from "@/shared/lib/constants";
import { useTable, useSortBy, usePagination } from "react-table";

interface User {
  id: string;
  userName: string;
  role: string;
  permissions: string[];
}

const USERS_DATA: User[] = [
  { id: "1", userName: "John Doe", role: "Administrator", permissions: ["Full Access", "User Management", "Role Management", "Settings"] },
  { id: "2", userName: "Jane Smith", role: "Manager", permissions: ["View Reports", "User Management", "Edit Content"] },
  { id: "3", userName: "Bob Wilson", role: "Editor", permissions: ["Edit Content", "View Reports"] },
  { id: "4", userName: "Alice Brown", role: "Viewer", permissions: ["View Content", "View Reports"] },
  { id: "5", userName: "Charlie Davis", role: "Guest", permissions: ["View Content"] },
];

export default function SettingsUsersPage() {
  const [users, setUsers] = useState<User[]>(USERS_DATA);

  const columns = useMemo(
    () => [
      {
        Header: "User Name",
        accessor: "userName",
      },
      {
        Header: "Role",
        accessor: "role",
      },
      {
        Header: "Permissions",
        accessor: "permissions",
        disableSortBy: true,
        Cell: ({ row }: { row: any }) => {
          const permissions = row.original.permissions;
          if (!permissions?.length) return null;
          return (
            <div className="flex flex-wrap gap-1">
              {permissions.slice(0, 3).map((p: string, idx: number) => (
                <span
                  key={idx}
                  className="badge bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full text-xs font-medium"
                >
                  {p}
                </span>
              ))}
              {permissions.length > 3 && (
                <span className="badge bg-light text-default px-2 py-0.5 rounded-full text-xs">
                  +{permissions.length - 3}
                </span>
              )}
            </div>
          );
        },
      },
      {
        Header: "Action",
        accessor: "id",
        disableSortBy: true,
        Cell: ({ row }: { row: any }) => (
          <div className="flex items-center gap-2">
            <div className="hs-tooltip ti-main-tooltip">
              <button
                type="button"
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-success"
                aria-label="View user"
              >
                <i className="ri-eye-line"></i>
                <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700" role="tooltip">
                  View
                </span>
              </button>
            </div>
            <Link
              href={ROUTES.settingsUsersEdit(row.original.id)}
              className="ti-btn ti-btn-icon ti-btn-sm ti-btn-info hs-tooltip-toggle"
              aria-label={`Edit ${row.original.userName}`}
            >
              <i className="ri-pencil-line"></i>
              <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700" role="tooltip">
                Edit User
              </span>
            </Link>
            <div className="hs-tooltip ti-main-tooltip">
              <button
                type="button"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this user?")) {
                    setUsers((prev) => prev.filter((u) => u.id !== row.original.id));
                  }
                }}
                className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-danger"
              >
                <i className="ri-delete-bin-line"></i>
                <span className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700" role="tooltip">
                  Delete User
                </span>
              </button>
            </div>
          </div>
        ),
      },
    ],
    []
  );

  const tableInstance: any = useTable(
    {
      columns,
      data: users,
      initialState: { pageIndex: 0, pageSize: 10 },
    },
    useSortBy,
    usePagination
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    state,
    page,
    nextPage,
    previousPage,
    canNextPage,
    canPreviousPage,
    pageOptions,
    gotoPage,
    setPageSize,
  } = tableInstance;

  const { pageIndex, pageSize } = state;

  return (
    <Fragment>
      <Seo title="Users" />
      <div className="flex items-center justify-between flex-wrap gap-4 mb-4 px-4 pt-4">
        <h5 className="box-title mb-0">
          Users
          <span className="badge bg-light text-default rounded-full ms-1 text-[0.75rem] align-middle">
            {users.length}
          </span>
        </h5>
        <div className="flex flex-wrap gap-2">
          <select
            className="form-control !w-auto !py-1 !px-4 !text-[0.75rem] me-2"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                Show {size}
              </option>
            ))}
          </select>
          <Link
            href={ROUTES.settingsUsersAdd}
            className="ti-btn ti-btn-primary !py-1.5 !px-3 !text-[0.8125rem]"
          >
            <i className="ri-add-line me-1 align-middle"></i>Add User
          </Link>
        </div>
      </div>
      <div className="table-responsive flex-1 overflow-y-auto px-4" style={{ minHeight: 0 }}>
        <table
          {...getTableProps()}
          className="table whitespace-nowrap min-w-full table-striped table-hover table-bordered border-gray-300 dark:border-gray-600"
        >
          <thead>
            {headerGroups.map((headerGroup: any) => (
              <tr
                {...headerGroup.getHeaderGroupProps()}
                className="bg-primary/10 dark:bg-primary/20 border-b border-gray-300 dark:border-gray-600"
                key={headerGroup.getHeaderGroupProps().key}
              >
                {headerGroup.headers.map((column: any) => (
                  <th
                    {...column.getHeaderProps(column.getSortByToggleProps?.() || column.getHeaderProps())}
                    scope="col"
                    className="text-start sticky top-0 z-10 bg-gray-50 dark:bg-black/20 px-4 py-2.5"
                    key={column.getHeaderProps().key}
                  >
                    <div className="flex items-center gap-2">
                      <span className="tabletitle font-semibold">{column.render("Header")}</span>
                      {column.isSorted && (
                        <span>
                          {column.isSortedDesc ? (
                            <i className="ri-arrow-down-s-line text-[0.875rem]"></i>
                          ) : (
                            <i className="ri-arrow-up-s-line text-[0.875rem]"></i>
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()}>
            {page.map((row: any) => {
              prepareRow(row);
              return (
                <tr
                  {...row.getRowProps()}
                  className="border-b border-gray-300 dark:border-gray-600"
                  key={row.getRowProps().key}
                >
                  {row.cells.map((cell: any) => (
                    <td {...cell.getCellProps()} className="px-4 py-2.5 align-middle" key={cell.getCellProps().key}>
                      {cell.render("Cell")}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="box-footer !border-t-0 px-4 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-defaultborder">
          <p className="text-[0.8125rem] text-defaulttextcolor/70 mb-0">
            Showing {pageIndex * pageSize + 1} to {Math.min((pageIndex + 1) * pageSize, users.length)} of {users.length} entries
          </p>
          <nav aria-label="Page navigation" className="pagination-style-4">
            <ul className="ti-pagination mb-0 flex items-center gap-1">
              <li className={`page-item ${!canPreviousPage ? "disabled" : ""}`}>
                <button
                  type="button"
                  className="page-link px-3 py-[0.375rem]"
                  onClick={() => previousPage()}
                  disabled={!canPreviousPage}
                >
                  Prev
                </button>
              </li>
              {pageOptions.map((p: number) => (
                <li key={p} className={`page-item ${pageIndex === p ? "active" : ""}`}>
                  <button
                    type="button"
                    className="page-link px-3 py-[0.375rem]"
                    onClick={() => gotoPage(p)}
                  >
                    {p + 1}
                  </button>
                </li>
              ))}
              <li className={`page-item ${!canNextPage ? "disabled" : ""}`}>
                <button
                  type="button"
                  className="page-link px-3 py-[0.375rem] text-primary"
                  onClick={() => nextPage()}
                  disabled={!canNextPage}
                >
                  Next
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </Fragment>
  );
}
