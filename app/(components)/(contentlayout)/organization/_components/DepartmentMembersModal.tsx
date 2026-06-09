"use client";

import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { listAssignableHeads } from "@/shared/lib/api/org-structure";
import { listCandidates, updateCandidate, type CandidateListItem } from "@/shared/lib/api/employees";
import {
  OrgFormField,
  OrgLoadingBlock,
  OrgModal,
  OrgModalCancelButton,
  OrgTableAction,
} from "./org-ui";

type Member = { id: string; name: string };

type Props = {
  open: boolean;
  departmentId: string | null;
  departmentName: string;
  onClose: () => void;
  onChanged?: () => void;
};

const idOf = (c: CandidateListItem) => String(c.id ?? c._id ?? "");
const deptIdOf = (c: CandidateListItem): string | null => {
  const d = c.departmentId;
  if (!d) return null;
  return typeof d === "string" ? d : d.id ?? d._id ?? null;
};

export default function DepartmentMembersModal({ open, departmentId, departmentName, onClose, onChanged }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<CandidateListItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    if (!departmentId) return;
    setLoadingMembers(true);
    try {
      setMembers(await listAssignableHeads(departmentId));
    } catch {
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, [departmentId]);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setDebounced("");
    setResults([]);
    void loadMembers();
  }, [open, loadMembers]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!open || !debounced) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    listCandidates({ fullName: debounced, limit: 20, ownerUserRole: "employee" })
      .then((res) => {
        if (!cancelled) setResults(res.results ?? []);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, debounced]);

  const memberIds = new Set(members.map((m) => m.id));

  const setEmployeeDept = async (empId: string, deptId: string | null, label: string) => {
    setBusyId(empId);
    try {
      await updateCandidate(empId, { departmentId: deptId });
      await loadMembers();
      onChanged?.();
      await Swal.fire({
        icon: "success",
        title: label,
        toast: true,
        position: "top-end",
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ??
        (err as { message?: string })?.message ??
        "Update failed";
      await Swal.fire({ icon: "error", title: "Couldn't update", text: msg });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <OrgModal
      open={open && !!departmentId}
      size="lg"
      title="Manage members"
      subtitle={`Employees in "${departmentName}" appear under this department on the org chart.`}
      onClose={onClose}
      footer={
        <OrgModalCancelButton type="button" onClick={onClose}>
          Done
        </OrgModalCancelButton>
      }
    >
      <div className="space-y-5 px-5 py-5">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[0.8125rem] font-medium text-defaulttextcolor">Current members</span>
            <span className="rounded-full bg-light px-2 py-0.5 text-[0.6875rem] font-semibold text-defaulttextcolor/70 dark:bg-white/[0.06]">
              {members.length}
            </span>
          </div>
          {loadingMembers ? (
            <OrgLoadingBlock label="Loading members…" />
          ) : members.length === 0 ? (
            <p className="mb-0 rounded-lg border border-dashed border-defaultborder/70 px-3 py-3 text-[0.8125rem] text-defaulttextcolor/60">
              No employees in this department yet. Search below to add some.
            </p>
          ) : (
            <ul className="mb-0 max-h-52 space-y-1.5 overflow-y-auto">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-defaultborder/50 px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2 text-[0.8125rem]">
                    <i className="ri-user-3-line text-defaulttextcolor/45" aria-hidden />
                    <span className="truncate text-defaulttextcolor">{m.name}</span>
                  </span>
                  <OrgTableAction
                    tone="danger"
                    title={`Remove ${m.name} from ${departmentName}`}
                    disabled={busyId === m.id}
                    onClick={() => setEmployeeDept(m.id, null, "Removed from department")}
                  >
                    <i className="ri-close-line text-[0.875rem]" aria-hidden />
                    Remove
                  </OrgTableAction>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-defaultborder/50 pt-4">
          <OrgFormField
            id="member-search"
            label="Add an employee"
            hint="Adding an employee already in another department moves them here."
          >
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-defaulttextcolor/45" aria-hidden />
              <input
                id="member-search"
                type="search"
                className="form-control !ps-9"
                placeholder="Search employees by name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </OrgFormField>

          {searching ? (
            <p className="mb-0 mt-3 text-[0.8125rem] text-defaulttextcolor/55">Searching…</p>
          ) : debounced && results.length === 0 ? (
            <p className="mb-0 mt-3 text-[0.8125rem] text-defaulttextcolor/55">No employees match “{debounced}”.</p>
          ) : results.length > 0 ? (
            <ul className="mb-0 mt-3 max-h-52 space-y-1.5 overflow-y-auto">
              {results.map((c) => {
                const id = idOf(c);
                const inThisDept = memberIds.has(id) || deptIdOf(c) === departmentId;
                const otherDept = c.department?.trim();
                return (
                  <li
                    key={id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-defaultborder/50 px-3 py-2"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[0.8125rem] text-defaulttextcolor">{c.fullName}</span>
                      {otherDept && !inThisDept ? (
                        <span className="text-[0.7rem] text-defaulttextcolor/55">Currently in {otherDept}</span>
                      ) : null}
                    </span>
                    {inThisDept ? (
                      <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[0.7rem] font-medium text-success">
                        Member
                      </span>
                    ) : (
                      <OrgTableAction
                        tone="primary"
                        title={`Add ${c.fullName} to ${departmentName}`}
                        disabled={busyId === id}
                        onClick={() => setEmployeeDept(id, departmentId, "Added to department")}
                      >
                        <i className="ri-add-line text-[0.875rem]" aria-hidden />
                        Add
                      </OrgTableAction>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>
    </OrgModal>
  );
}
