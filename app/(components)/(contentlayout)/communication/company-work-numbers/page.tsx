"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { useAuth } from "@/shared/contexts/auth-context";
import { hasPermission } from "@/shared/lib/permissions";
import {
  listCompanyPhoneNumbers,
  syncCompanyPhoneNumbers,
  updateCompanyPhoneNumber,
  type CompanyPhoneNumberRow,
} from "@/shared/lib/api/companyPhoneNumbers";
import { listUsers, type User } from "@/shared/lib/api/users";
import { listDepartments } from "@/shared/lib/api/departments";
import { listTeamGroups } from "@/shared/lib/api/projectTeams";
import CompanyWorkNumberPanel from "@/app/(components)/(contentlayout)/settings/company-email/_components/CompanyWorkNumberPanel";
import { AxiosError } from "axios";

function apiErr(e: unknown, fallback: string): string {
  if (e instanceof AxiosError) {
    return (e.response?.data as { message?: string })?.message || e.message || fallback;
  }
  return e instanceof Error ? e.message : fallback;
}

function assigneeId(row: CompanyPhoneNumberRow): string {
  if (!row.assignedTo) return "";
  if (typeof row.assignedTo === "string") return row.assignedTo;
  return row.assignedTo._id || row.assignedTo.id || "";
}

function assigneeLabel(row: CompanyPhoneNumberRow): string {
  if (!row.assignedTo || typeof row.assignedTo === "string") return "—";
  const name = row.assignedTo.name?.trim();
  const email = row.assignedTo.email?.trim();
  if (name && email) return `${name} · ${email}`;
  return name || email || "—";
}

function refId(
  value: { _id?: string; id?: string } | string | null | undefined,
): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id || value.id || "";
}

export default function CompanyWorkNumbersPage() {
  const auth = useAuth();
  const canManage = hasPermission(auth, "manage_company_number");
  const canView = hasPermission(auth, "view_company_number");

  const [numbers, setNumbers] = useState<CompanyPhoneNumberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterUnassigned, setFilterUnassigned] = useState(false);
  const [filterInactive, setFilterInactive] = useState(false);
  const [filterDepartmentId, setFilterDepartmentId] = useState("");
  const [filterTeamId, setFilterTeamId] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<{ _id: string; name: string }[]>([]);
  const [teams, setTeams] = useState<{ _id: string; name: string }[]>([]);

  const loadNumbers = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await listCompanyPhoneNumbers({
        q: search.trim() || undefined,
        unassigned: filterUnassigned ? "true" : undefined,
        isActive: filterInactive ? "false" : undefined,
        departmentId: filterDepartmentId || undefined,
        teamId: filterTeamId || undefined,
      });
      setNumbers(res.numbers || []);
    } catch (e) {
      setError(apiErr(e, "Failed to load company work numbers"));
    } finally {
      setLoading(false);
    }
  }, [search, filterUnassigned, filterInactive, filterDepartmentId, filterTeamId]);

  useEffect(() => {
    if (!canView) return;
    void loadNumbers();
  }, [canView, loadNumbers]);

  useEffect(() => {
    if (!canView) return;
    (async () => {
      try {
        const [d, t] = await Promise.all([listDepartments(), listTeamGroups({ limit: 200 })]);
        setDepartments(d.map((x) => ({ _id: x._id || x.id || "", name: x.name })));
        setTeams((t.results || []).map((x) => ({ _id: x._id || x.id || "", name: x.name })));
      } catch {
        /* dropdowns optional */
      }
    })();
  }, [canView]);

  useEffect(() => {
    if (!canManage) return;
    (async () => {
      try {
        const u = await listUsers({ limit: 200, status: "active" });
        setUsers(u.results || []);
      } catch {
        /* assignee dropdown optional */
      }
    })();
  }, [canManage]);

  const handleSync = async () => {
    setSyncing(true);
    setError("");
    try {
      await syncCompanyPhoneNumbers();
      await loadNumbers();
    } catch (e) {
      setError(apiErr(e, "Sync failed"));
    } finally {
      setSyncing(false);
    }
  };

  const patchRow = async (
    id: string,
    body: {
      assignedTo?: string | null;
      departmentId?: string | null;
      teamId?: string | null;
      isActive?: boolean;
      friendlyName?: string;
    },
  ) => {
    setSavingId(id);
    setError("");
    try {
      const res = await updateCompanyPhoneNumber(id, body);
      setNumbers((prev) => prev.map((n) => (n._id === id ? { ...n, ...res.number } : n)));
    } catch (e) {
      setError(apiErr(e, "Update failed"));
    } finally {
      setSavingId(null);
    }
  };

  const filteredCount = useMemo(() => numbers.length, [numbers]);

  if (!canView) {
    return (
      <div className="p-6">
        <p className="text-sm text-defaulttextcolor/70">You do not have permission to view company work numbers.</p>
      </div>
    );
  }

  return (
    <>
      <Seo title="Company Work Numbers" />
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-defaulttextcolor dark:text-white">Company work numbers</h1>
            <p className="mt-1 text-sm text-defaulttextcolor/65 dark:text-white/55 max-w-2xl">
              Manage Twilio numbers, assign owners for inbound routing, and purchase new lines. Incoming PSTN calls ring
              the assigned employee&apos;s browser dialer (<code className="text-xs">user_&lt;id&gt;</code>).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="ti-btn ti-btn-light !py-1.5 !px-3"
              onClick={() => void loadNumbers()}
              disabled={loading}
            >
              <i className="ri-restart-line me-1" />
              Refresh
            </button>
            {canManage ? (
              <button
                type="button"
                className="ti-btn ti-btn-primary-full !py-1.5 !px-3 disabled:opacity-60"
                onClick={() => void handleSync()}
                disabled={syncing}
              >
                {syncing ? (
                  <>
                    <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full me-1.5" />
                    Syncing…
                  </>
                ) : (
                  <>
                    <i className="ri-cloud-line me-1" />
                    Sync from Twilio
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
        ) : null}

        <div className="box custom-box">
          <div className="box-header flex flex-wrap items-center justify-between gap-3">
            <div className="box-title">Registered numbers ({filteredCount})</div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                className="form-control !py-1 !text-sm !w-48"
                placeholder="Search number or label…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <label className="inline-flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={filterUnassigned} onChange={(e) => setFilterUnassigned(e.target.checked)} />
                Unassigned only
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={filterInactive} onChange={(e) => setFilterInactive(e.target.checked)} />
                Inactive only
              </label>
              <select
                className="form-select !py-1 !text-xs !w-36"
                value={filterDepartmentId}
                onChange={(e) => setFilterDepartmentId(e.target.value)}
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
              <select
                className="form-select !py-1 !text-xs !w-36"
                value={filterTeamId}
                onChange={(e) => setFilterTeamId(e.target.value)}
              >
                <option value="">All teams</option>
                {teams.map((t) => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="box-body p-0">
            {loading ? (
              <p className="p-4 text-sm text-defaulttextcolor/60">Loading…</p>
            ) : numbers.length === 0 ? (
              <p className="p-4 text-sm text-defaulttextcolor/60">
                No numbers in the registry yet. Sync from Twilio or buy a number below.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table min-w-full whitespace-nowrap mb-0">
                  <thead>
                    <tr>
                      <th>Number</th>
                      <th>Assigned to</th>
                      <th>Department</th>
                      <th>Team</th>
                      <th>Status</th>
                      {canManage ? <th className="text-end">Actions</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {numbers.map((row) => {
                      const id = row._id || row.id || "";
                      return (
                        <tr key={id}>
                          <td>
                            <div className="font-mono text-sm">{row.phoneNumber}</div>
                            <div className="text-xs text-defaulttextcolor/55">{row.friendlyName || "—"}</div>
                          </td>
                          <td className="text-sm">{assigneeLabel(row)}</td>
                          <td className="text-sm">
                            {typeof row.departmentId === "object" ? row.departmentId?.name || "—" : "—"}
                          </td>
                          <td className="text-sm">
                            {typeof row.teamId === "object" ? row.teamId?.name || "—" : "—"}
                          </td>
                          <td>
                            <span
                              className={`badge ${row.isActive ? "bg-success/15 text-success" : "bg-default/10 text-defaulttextcolor/60"}`}
                            >
                              {row.isActive ? "Active" : "Disabled"}
                            </span>
                          </td>
                          {canManage ? (
                            <td className="text-end">
                              <div className="flex flex-wrap justify-end gap-2 items-center">
                                <select
                                  className="form-select !py-1 !text-xs !w-40"
                                  value={assigneeId(row)}
                                  disabled={savingId === id}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    void patchRow(id, { assignedTo: v || null });
                                  }}
                                >
                                  <option value="">Unassigned</option>
                                  {users.map((u) => {
                                    const uid = u._id || u.id || "";
                                    return (
                                      <option key={uid} value={uid}>
                                        {u.name || u.email} ({u.email})
                                      </option>
                                    );
                                  })}
                                </select>
                                <select
                                  className="form-select !py-1 !text-xs !w-32"
                                  value={refId(row.departmentId)}
                                  disabled={savingId === id}
                                  onChange={(e) => {
                                    void patchRow(id, { departmentId: e.target.value || null });
                                  }}
                                >
                                  <option value="">No department</option>
                                  {departments.map((d) => (
                                    <option key={d._id} value={d._id}>{d.name}</option>
                                  ))}
                                </select>
                                <select
                                  className="form-select !py-1 !text-xs !w-32"
                                  value={refId(row.teamId)}
                                  disabled={savingId === id}
                                  onChange={(e) => {
                                    void patchRow(id, { teamId: e.target.value || null });
                                  }}
                                >
                                  <option value="">No team</option>
                                  {teams.map((t) => (
                                    <option key={t._id} value={t._id}>{t.name}</option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-sm ti-btn-light"
                                  disabled={savingId === id}
                                  onClick={() => void patchRow(id, { isActive: !row.isActive })}
                                >
                                  {row.isActive ? "Disable" : "Enable"}
                                </button>
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {canManage ? (
          <div>
            <h2 className="text-base font-semibold mb-3">Purchase &amp; search numbers</h2>
            <CompanyWorkNumberPanel onPurchased={() => void loadNumbers()} />
          </div>
        ) : null}
      </div>
    </>
  );
}
