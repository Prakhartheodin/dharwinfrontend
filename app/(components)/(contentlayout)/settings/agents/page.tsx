"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { components as RSComponents, type MultiValue, type OptionProps } from "react-select";
import Seo from "@/shared/layout-components/seo/seo";
import * as candidatesApi from "@/shared/lib/api/candidates";
import type { AgentOption, StudentAgentAssignmentRow } from "@/shared/lib/api/candidates";
import AssignAgentSopModal from "../../ats/employees/_components/AssignAgentSopModal";
import { AxiosError } from "axios";

const Select = dynamic(() => import("react-select"), { ssr: false });

type AssignOption = { value: string; label: string; row: StudentAgentAssignmentRow };

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function CheckboxOption(props: OptionProps<AssignOption, true>) {
  return (
    <RSComponents.Option {...props}>
      <span className="flex items-start gap-3 w-full py-0.5">
        <input
          type="checkbox"
          readOnly
          checked={props.isSelected}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-defaultborder/80 text-primary focus:ring-primary/30"
          tabIndex={-1}
          aria-hidden
        />
        <span className="text-[0.8125rem] leading-snug text-defaulttextcolor">{props.label}</span>
      </span>
    </RSComponents.Option>
  );
}

export default function SettingsAgentsPage() {
  const [students, setStudents] = useState<StudentAgentAssignmentRow[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [pendingByAgent, setPendingByAgent] = useState<Record<string, AssignOption[]>>({});
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [bulkTargetAgentId, setBulkTargetAgentId] = useState("");
  const [reassignModal, setReassignModal] = useState<StudentAgentAssignmentRow | null>(null);
  const [showUnassignedList, setShowUnassignedList] = useState(false);
  /** Agent rows in this list are expanded; default empty = all folded on load. */
  const [expandedAgentIds, setExpandedAgentIds] = useState<string[]>([]);
  const agentCardsRef = useRef<HTMLDivElement | null>(null);
  const unassignedSectionRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const data = await candidatesApi.getStudentAgentAssignments();
      setStudents(data.students);
      setAgents(data.agents);
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? (e.response?.data as { message?: string })?.message ?? e.message
          : "Failed to load assignments";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const studentsByAgentId = useMemo(() => {
    const map = new Map<string, StudentAgentAssignmentRow[]>();
    for (const s of students) {
      const aid = s.assignedAgent?.id;
      if (!aid) continue;
      const key = String(aid);
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.fullName.localeCompare(b.fullName, undefined, { sensitivity: "base" }));
    }
    return map;
  }, [students]);

  const filteredAgents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter((a) => {
      const name = (a.name ?? "").toLowerCase();
      const email = (a.email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [agents, search]);

  const unassignedCount = useMemo(() => students.filter((s) => !s.assignedAgent).length, [students]);

  const assignmentSelectOptions = useMemo((): AssignOption[] => {
    const unassigned = students.filter((s) => !s.assignedAgent);
    const sorted = [...unassigned].sort((a, b) =>
      a.fullName.localeCompare(b.fullName, undefined, { sensitivity: "base" })
    );
    return sorted.map((row) => ({
      value: row.id,
      label: `${row.fullName} (${row.ownerRoleLabel ?? "—"})`,
      row,
    }));
  }, [students]);

  const unassignedStudents = useMemo(
    () =>
      [...students]
        .filter((student) => !student.assignedAgent)
        .sort((a, b) => a.fullName.localeCompare(b.fullName, undefined, { sensitivity: "base" })),
    [students]
  );

  const validOptionIds = useMemo(() => new Set(assignmentSelectOptions.map((o) => o.value)), [assignmentSelectOptions]);

  useEffect(() => {
    setPendingByAgent((prev) => {
      let changed = false;
      const next: Record<string, AssignOption[]> = { ...prev };
      for (const key of Object.keys(next)) {
        const filtered = (next[key] ?? []).filter((o) => validOptionIds.has(o.value));
        if (filtered.length !== (next[key]?.length ?? 0)) {
          changed = true;
          next[key] = filtered;
        }
      }
      return changed ? next : prev;
    });
  }, [validOptionIds]);

  useEffect(() => {
    setSelectedCandidateIds((prev) =>
      prev.filter((id) => students.some((s) => s.id === id && s.assignedAgent))
    );
  }, [students]);

  useEffect(() => {
    if (!showUnassignedList) return;
    requestAnimationFrame(() => {
      unassignedSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [showUnassignedList]);

  const assignManyToAgent = useCallback(
    async (agentId: string, opts: AssignOption[]) => {
      if (opts.length === 0) return;
      setSavingKey(`batch:${agentId}`);
      setError("");
      try {
        await Promise.all(opts.map((o) => candidatesApi.assignAgentToStudent(o.row.id, agentId)));
        const picked = agents.find((a) => a.id === agentId);
        const assignee = picked
          ? { id: picked.id, name: picked.name, email: picked.email }
          : null;
        const ids = new Set(opts.map((o) => o.value));
        setStudents((prev) =>
          prev.map((s) => (ids.has(s.id) && assignee ? { ...s, assignedAgent: assignee } : s))
        );
        setPendingByAgent((prev) => ({ ...prev, [agentId]: [] }));
      } catch (e) {
        const msg =
          e instanceof AxiosError
            ? (e.response?.data as { message?: string })?.message ?? e.message
            : "Could not update assignments";
        setError(msg);
      } finally {
        setSavingKey(null);
      }
    },
    [agents]
  );

  const runAssign = async (student: StudentAgentAssignmentRow, agentId: string | null) => {
    const key = `${student.id}:${agentId ?? "none"}`;
    setSavingKey(key);
    setError("");
    try {
      await candidatesApi.assignAgentToStudent(student.id, agentId);
      setStudents((prev) =>
        prev.map((s) => {
          if (s.id !== student.id) return s;
          if (!agentId) return { ...s, assignedAgent: null };
          const picked = agents.find((a) => a.id === agentId);
          return {
            ...s,
            assignedAgent: picked ? { id: picked.id, name: picked.name, email: picked.email } : null,
          };
        })
      );
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? (e.response?.data as { message?: string })?.message ?? e.message
          : "Could not update assignment";
      setError(msg);
    } finally {
      setSavingKey(null);
    }
  };

  const selectedCandidates = useMemo(
    () => students.filter((s) => selectedCandidateIds.includes(s.id) && s.assignedAgent),
    [students, selectedCandidateIds]
  );

  const toggleCandidateSelection = useCallback((candidateId: string) => {
    setSelectedCandidateIds((prev) =>
      prev.includes(candidateId) ? prev.filter((id) => id !== candidateId) : [...prev, candidateId]
    );
  }, []);

  const clearSelectedCandidates = useCallback(() => {
    setSelectedCandidateIds([]);
    setBulkTargetAgentId("");
  }, []);

  const scrollToAgentCards = useCallback(() => {
    agentCardsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const openUnassignedList = useCallback(() => {
    if (unassignedStudents.length === 0) return;
    setShowUnassignedList(true);
  }, [unassignedStudents.length]);

  const toggleAgentFold = useCallback((agentId: string) => {
    setExpandedAgentIds((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    );
  }, []);

  const runBulkReassign = useCallback(async () => {
    if (!bulkTargetAgentId || selectedCandidates.length === 0) return;
    setSavingKey(`bulk-reassign:${bulkTargetAgentId}`);
    setError("");
    try {
      await Promise.all(
        selectedCandidates.map((candidate) =>
          candidatesApi.assignAgentToStudent(candidate.id, bulkTargetAgentId)
        )
      );
      const picked = agents.find((agent) => agent.id === bulkTargetAgentId);
      setStudents((prev) =>
        prev.map((student) =>
          selectedCandidateIds.includes(student.id)
            ? {
                ...student,
                assignedAgent: picked
                  ? { id: picked.id, name: picked.name, email: picked.email }
                  : student.assignedAgent,
              }
            : student
        )
      );
      clearSelectedCandidates();
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? (e.response?.data as { message?: string })?.message ?? e.message
          : "Could not reassign selected candidates";
      setError(msg);
    } finally {
      setSavingKey(null);
    }
  }, [agents, bulkTargetAgentId, clearSelectedCandidates, selectedCandidateIds, selectedCandidates]);

  return (
    <>
      <Seo title="Agents" />
      <div className="box-body space-y-6 pb-2">
        {/* Page header */}
        <div className="relative overflow-hidden rounded-2xl border border-defaultborder/60 bg-gradient-to-br from-slate-50/90 via-white to-white dark:from-white/[0.04] dark:via-bodybg dark:to-bodybg">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/[0.06] blur-3xl dark:bg-primary/[0.08]"
            aria-hidden
          />
          <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <span
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/10 dark:ring-primary/20"
                aria-hidden
              >
                <i className="ri-shield-user-line text-2xl" />
              </span>
              <div>
                <h4 className="box-title mb-1.5 text-lg tracking-tight">Agent assignments</h4>
                <p className="mb-0 max-w-2xl text-[0.8125rem] leading-relaxed text-defaulttextcolor/65">
                  Pair agents with students and candidates. One person → one agent. Select several names in the field below,
                  then <span className="font-medium text-defaulttextcolor/85">Assign selected</span>.
                </p>
              </div>
            </div>
            {!loading && agents.length > 0 && (
              <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={scrollToAgentCards}
                  className="inline-flex items-center gap-1.5 rounded-full border border-defaultborder/60 bg-white/80 px-3 py-1 text-xs font-medium text-defaulttextcolor/80 transition-colors hover:border-primary/30 hover:bg-primary/[0.06] hover:text-primary dark:bg-white/5"
                >
                  <i className="ri-team-line text-primary" aria-hidden />
                  {agents.length} agent{agents.length === 1 ? "" : "s"}
                </button>
                <button
                  type="button"
                  onClick={openUnassignedList}
                  disabled={unassignedCount === 0}
                  className="inline-flex items-center gap-1.5 rounded-full border border-defaultborder/60 bg-white/80 px-3 py-1 text-xs font-medium text-defaulttextcolor/80 transition-colors hover:border-primary/30 hover:bg-primary/[0.06] hover:text-primary disabled:cursor-default disabled:opacity-60 dark:bg-white/5"
                >
                  <i className="ri-user-unfollow-line text-defaulttextcolor/50" aria-hidden />
                  {unassignedCount} unassigned
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div
            className="flex gap-3 rounded-xl border border-danger/25 bg-danger/[0.07] px-4 py-3 text-sm text-danger dark:bg-danger/10"
            role="alert"
          >
            <i className="ri-error-warning-line mt-0.5 shrink-0 text-lg" aria-hidden />
            <span>{error}</span>
          </div>
        )}

        {/* Search — explicit padding so global .form-control cannot overlap the icon */}
        <div className="relative max-w-lg">
          <label className="sr-only" htmlFor="agents-search">
            Search agents
          </label>
          <span
            className="pointer-events-none absolute left-3.5 top-1/2 z-[1] flex h-8 w-8 -translate-y-1/2 items-center justify-center text-defaulttextcolor/45"
            aria-hidden
          >
            <i className="ri-search-line text-lg leading-none" />
          </span>
          <input
            id="agents-search"
            type="search"
            placeholder="Filter agents by name or email…"
            autoComplete="off"
            className="h-10 w-full rounded-xl border border-defaultborder/80 bg-white py-2 pl-12 pr-3 text-sm text-defaulttextcolor shadow-sm placeholder:text-defaulttextcolor/45 transition-[box-shadow,border-color] focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-white/15 dark:bg-bodybg dark:placeholder:text-white/35"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {selectedCandidates.length > 0 && (
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.05] px-4 py-4 shadow-sm dark:bg-primary/[0.08]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="mb-1 text-sm font-semibold text-defaulttextcolor dark:text-white">
                  {selectedCandidates.length} candidate{selectedCandidates.length === 1 ? "" : "s"} selected
                </p>
                <p className="mb-0 text-xs text-defaulttextcolor/60 dark:text-white/55">
                  Choose another agent and move all selected candidates in one action.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={bulkTargetAgentId}
                  onChange={(e) => setBulkTargetAgentId(e.target.value)}
                  disabled={savingKey !== null}
                  className="h-10 min-w-[14rem] rounded-xl border border-defaultborder/70 bg-white px-3 text-sm text-defaulttextcolor shadow-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-white/15 dark:bg-bodybg dark:text-white"
                >
                  <option value="">Select target agent</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.email})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="ti-btn ti-btn-primary-full inline-flex min-h-[2.5rem] items-center justify-center gap-2 rounded-xl border-0 px-4 py-2 text-sm font-semibold text-white disabled:pointer-events-none disabled:opacity-55"
                  disabled={!bulkTargetAgentId || savingKey !== null}
                  onClick={() => void runBulkReassign()}
                >
                  <i className="ri-user-shared-line text-base" aria-hidden />
                  Reassign selected
                </button>
                <button
                  type="button"
                  className="ti-btn inline-flex min-h-[2.5rem] items-center justify-center rounded-xl border border-defaultborder/70 bg-white px-4 py-2 text-sm font-semibold text-defaulttextcolor/70 shadow-sm hover:bg-slate-50 dark:border-white/15 dark:bg-transparent dark:text-white/75 dark:hover:bg-white/5"
                  disabled={savingKey !== null}
                  onClick={clearSelectedCandidates}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && showUnassignedList && (
          <section
            ref={unassignedSectionRef}
            className="rounded-2xl border border-defaultborder/70 bg-white shadow-sm dark:border-white/10 dark:bg-bodybg"
          >
            <div className="flex flex-col gap-3 border-b border-defaultborder/45 bg-slate-50/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/[0.02]">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                onClick={() => setShowUnassignedList((prev) => !prev)}
              >
                <div>
                  <h3 className="mb-1 text-base font-semibold text-defaulttextcolor dark:text-white">
                    Unassigned candidates
                  </h3>
                  <p className="mb-0 text-xs text-defaulttextcolor/55">
                    {unassignedStudents.length} candidate{unassignedStudents.length === 1 ? "" : "s"} currently have no assigned agent.
                  </p>
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-defaultborder/70 bg-white text-defaulttextcolor/65 shadow-sm dark:border-white/15 dark:bg-transparent dark:text-white/70">
                  <i className={`ri-arrow-${showUnassignedList ? "up" : "down"}-s-line text-lg`} aria-hidden />
                </span>
              </button>
            </div>
            {showUnassignedList && unassignedStudents.length > 0 ? (
              <ul className="divide-y divide-defaultborder/35 dark:divide-white/10">
                {unassignedStudents.map((student) => (
                  <li
                    key={student.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-medium text-defaulttextcolor dark:text-white">{student.fullName}</span>
                        <span className="rounded-md bg-defaultborder/25 px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-defaulttextcolor/70 dark:bg-white/10 dark:text-white/70">
                          {student.ownerRoleLabel ?? "—"}
                        </span>
                      </div>
                      <p className="mb-0 mt-0.5 truncate text-xs text-defaulttextcolor/50">{student.email}</p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/[0.06] px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/[0.1]"
                      disabled={savingKey !== null}
                      onClick={() => setReassignModal(student)}
                    >
                      <i className="ri-user-add-line text-base" aria-hidden />
                      Assign agent
                    </button>
                  </li>
                ))}
              </ul>
            ) : showUnassignedList ? (
              <div className="px-5 py-8 text-sm text-defaulttextcolor/55">
                Everyone is assigned right now.
              </div>
            ) : null}
          </section>
        )}

        {agents.length === 0 && !loading && (
          <div className="rounded-xl border border-dashed border-defaultborder/70 bg-slate-50/50 px-6 py-12 text-center dark:bg-white/[0.02]">
            <i className="ri-user-settings-line mb-3 text-4xl text-defaulttextcolor/25" aria-hidden />
            <p className="mb-1 text-sm font-medium text-defaulttextcolor">No agent users yet</p>
            <p className="mb-0 text-sm text-defaulttextcolor/55">
              Grant the Agent role under <span className="font-medium text-defaulttextcolor/80">Settings → Users</span>.
            </p>
          </div>
        )}

        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-defaultborder/50 bg-white p-6 dark:bg-bodybg"
              >
                <div className="mb-4 flex gap-3">
                  <div className="h-11 w-11 rounded-xl bg-defaultborder/30" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 rounded bg-defaultborder/30" />
                    <div className="h-3 w-56 rounded bg-defaultborder/20" />
                  </div>
                </div>
                <div className="h-20 rounded-lg bg-defaultborder/15" />
              </div>
            ))}
          </div>
        ) : filteredAgents.length === 0 && agents.length > 0 ? (
          <div className="rounded-xl border border-defaultborder/60 bg-slate-50/40 px-6 py-10 text-center text-sm text-defaulttextcolor/60 dark:bg-white/[0.02]">
            No agents match your search.
          </div>
        ) : (
          !loading &&
          filteredAgents.length > 0 && (
            <div ref={agentCardsRef} className="grid gap-5">
              {filteredAgents.map((agent) => {
                const agentKey = String(agent.id);
                const assigned = studentsByAgentId.get(agentKey) ?? [];
                const pending = pendingByAgent[agentKey] ?? [];
                const busy = savingKey !== null;
                const isCollapsed = !expandedAgentIds.includes(agentKey);

                return (
                  <article
                    key={agent.id}
                    className="overflow-hidden rounded-2xl border border-defaultborder/70 bg-white shadow-sm shadow-black/[0.03] transition-shadow duration-200 hover:shadow-md hover:shadow-black/[0.05] dark:border-white/10 dark:bg-bodybg dark:shadow-none"
                  >
                    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-defaultborder/45 bg-slate-50/40 px-5 py-4 dark:border-white/10 dark:bg-white/[0.02]">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        onClick={() => toggleAgentFold(agentKey)}
                      >
                        <span
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 text-sm font-semibold tracking-tight text-defaulttextcolor ring-1 ring-defaultborder/40 dark:from-white/10 dark:to-white/5 dark:text-white/90"
                          aria-hidden
                        >
                          {getInitials(agent.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="mb-0 truncate text-base font-semibold text-defaulttextcolor dark:text-white">
                            {agent.name}
                          </h3>
                          <p className="mb-0 truncate text-xs text-defaulttextcolor/55">{agent.email}</p>
                        </div>
                      </button>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full bg-primary/[0.09] px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/15">
                          {assigned.length} assigned
                        </span>
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-defaultborder/70 bg-white text-defaulttextcolor/65 shadow-sm hover:bg-slate-50 dark:border-white/15 dark:bg-transparent dark:text-white/70 dark:hover:bg-white/5"
                          onClick={() => toggleAgentFold(agentKey)}
                          aria-label={isCollapsed ? `Expand ${agent.name}` : `Collapse ${agent.name}`}
                        >
                          <i className={`ri-arrow-${isCollapsed ? "down" : "up"}-s-line text-lg`} aria-hidden />
                        </button>
                      </div>
                    </header>

                    {!isCollapsed && (
                    <div className="px-5 py-4">
                      {assigned.length > 0 ? (
                        <ul className="mb-0 divide-y divide-defaultborder/35 rounded-xl border border-defaultborder/40 bg-slate-50/30 dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.02]">
                          {assigned.map((s) => (
                            <li
                              key={s.id}
                              className="flex flex-col gap-2 py-3 pl-4 pr-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                            >
                              <div className="min-w-0 flex flex-1 gap-3">
                                <input
                                  type="checkbox"
                                  checked={selectedCandidateIds.includes(s.id)}
                                  onChange={() => toggleCandidateSelection(s.id)}
                                  disabled={busy}
                                  className="mt-1 h-4 w-4 shrink-0 rounded border-defaultborder/80 text-primary focus:ring-primary/30"
                                  aria-label={`Select ${s.fullName} for bulk reassignment`}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-baseline gap-2">
                                  <span className="font-medium text-defaulttextcolor dark:text-white">{s.fullName}</span>
                                  <span className="rounded-md bg-defaultborder/25 px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-defaulttextcolor/70 dark:bg-white/10 dark:text-white/70">
                                    {s.ownerRoleLabel ?? "—"}
                                  </span>
                                  </div>
                                  <p className="mb-0 mt-0.5 truncate text-xs text-defaulttextcolor/50">{s.email}</p>
                                </div>
                              </div>
                              <div className="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-center">
                                <button
                                  type="button"
                                  className="rounded-lg border border-primary/20 bg-primary/[0.06] px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/[0.1]"
                                  disabled={busy}
                                  title="Reassign candidate to another agent"
                                  onClick={() => setReassignModal(s)}
                                >
                                  <span className="inline-flex items-center gap-1.5">
                                    <i className="ri-user-shared-line text-base" aria-hidden />
                                    Reassign
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-defaulttextcolor/55 transition-colors hover:bg-danger/10 hover:text-danger"
                                  disabled={busy}
                                  title="Remove from this agent"
                                  onClick={() => void runAssign(s, null)}
                                >
                                  <span className="inline-flex items-center gap-1.5">
                                    <i className="ri-close-circle-line text-base" aria-hidden />
                                    Remove
                                  </span>
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-defaultborder/55 bg-slate-50/40 py-10 text-center dark:bg-white/[0.02]">
                          <i className="ri-inbox-line mb-2 text-3xl text-defaulttextcolor/25" aria-hidden />
                          <p className="mb-0 text-sm font-medium text-defaulttextcolor/45">Nobody assigned yet</p>
                          <p className="mt-1 mb-0 max-w-xs text-xs text-defaulttextcolor/40">
                            Use the field below to add students or candidates.
                          </p>
                        </div>
                      )}
                    </div>
                    )}

                    {!isCollapsed && (
                    <footer className="border-t border-defaultborder/45 bg-slate-50/50 px-5 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                      <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-defaulttextcolor/45">
                        Add people
                      </p>
                      <div className="max-w-xl rounded-xl border border-defaultborder/70 bg-white shadow-inner dark:border-white/10 dark:bg-white/[0.04]">
                        <Select<AssignOption, true>
                          instanceId={`agent-assign-${agent.id}`}
                          options={assignmentSelectOptions}
                          value={pending}
                          inputId={`add-student-input-${agent.id}`}
                          placeholder={
                            assignmentSelectOptions.length === 0
                              ? "Everyone is assigned"
                              : "Search and select people…"
                          }
                          isMulti
                          isSearchable
                          isClearable
                          hideSelectedOptions={false}
                          closeMenuOnSelect={false}
                          blurInputOnSelect={false}
                          components={{ Option: CheckboxOption }}
                          isDisabled={assignmentSelectOptions.length === 0 || busy}
                          onChange={(val: MultiValue<AssignOption>) => {
                            setPendingByAgent((prev) => ({
                              ...prev,
                              [agentKey]: val ? [...val] : [],
                            }));
                          }}
                          className="react-select-container agents-assign-select"
                          classNamePrefix="react-select"
                          menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                          menuPosition="fixed"
                          styles={{
                            menuPortal: (base) => ({ ...base, zIndex: 10050 }),
                            menu: (base) => ({
                              ...base,
                              borderRadius: "0.75rem",
                              boxShadow: "0 12px 40px rgba(15, 23, 42, 0.12)",
                              border: "1px solid rgba(148, 163, 184, 0.35)",
                            }),
                            option: (base, state) => ({
                              ...base,
                              backgroundColor: state.isFocused ? "rgba(99, 102, 241, 0.08)" : "transparent",
                              color: "inherit",
                            }),
                            clearIndicator: (base) => ({
                              ...base,
                              color: "#64748b",
                              ":hover": { color: "#334155" },
                            }),
                            dropdownIndicator: (base) => ({
                              ...base,
                              color: "#64748b",
                              ":hover": { color: "#334155" },
                            }),
                            indicatorSeparator: () => ({ display: "none" }),
                          }}
                        />
                      </div>
                      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-stretch">
                        {/*
                          Use ti-btn-primary-full: base .ti-btn-primary is bg-primary/10 + text-primary;
                          we had forced white text on children → illegible until hover. Full = solid primary + white.
                        */}
                        <button
                          type="button"
                          className="ti-btn ti-btn-primary-full inline-flex min-h-[2.5rem] w-full shrink-0 items-center justify-center gap-2.5 whitespace-nowrap rounded-xl border-0 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-[transform,box-shadow,background-color] hover:bg-primary/90 hover:shadow-lg active:scale-[0.99] disabled:pointer-events-none disabled:opacity-55 sm:w-auto sm:min-w-[12rem]"
                          disabled={busy || pending.length === 0 || assignmentSelectOptions.length === 0}
                          onClick={() => void assignManyToAgent(agentKey, pending)}
                        >
                          <i className="ri-user-add-line shrink-0 text-[1.125rem] leading-none opacity-95" aria-hidden />
                          <span className="leading-none">Assign selected</span>
                          {pending.length > 0 ? (
                            <span className="ml-0.5 rounded-md bg-black/20 px-2 py-0.5 text-xs font-bold tabular-nums">
                              {pending.length}
                            </span>
                          ) : null}
                        </button>
                        {pending.length > 0 && (
                          <button
                            type="button"
                            className="ti-btn inline-flex min-h-[2.5rem] w-full shrink-0 items-center justify-center whitespace-nowrap rounded-xl border-2 border-primary/50 bg-white px-4 py-2.5 text-sm font-semibold text-primary shadow-sm transition-colors hover:border-primary hover:bg-primary/5 sm:w-auto dark:border-primary/60 dark:bg-transparent dark:hover:bg-primary/10"
                            disabled={busy}
                            onClick={() =>
                              setPendingByAgent((prev) => ({
                                ...prev,
                                [agentKey]: [],
                              }))
                            }
                          >
                            Clear selection
                          </button>
                        )}
                      </div>
                    </footer>
                    )}
                  </article>
                );
              })}
            </div>
          )
        )}
      </div>
      <style jsx>{`
        .agents-assign-select :global(.react-select__control) {
          min-height: 2.75rem;
          border: 1px solid rgba(148, 163, 184, 0.5) !important;
          background: #fff;
          box-shadow: none;
          font-size: 0.8125rem;
        }
        :global(.dark) .agents-assign-select :global(.react-select__control) {
          background: rgba(30, 41, 59, 0.6);
          border-color: rgba(148, 163, 184, 0.35) !important;
        }
        .agents-assign-select :global(.react-select__control:hover) {
          border-color: rgba(100, 116, 139, 0.6) !important;
        }
        .agents-assign-select :global(.react-select__control--is-focused) {
          border-color: rgba(99, 102, 241, 0.55) !important;
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
        }
        .agents-assign-select :global(.react-select__placeholder),
        .agents-assign-select :global(.react-select__single-value),
        .agents-assign-select :global(.react-select__input-container) {
          color: inherit;
        }
        .agents-assign-select :global(.react-select__value-container) {
          padding: 0.25rem 0.625rem;
          gap: 0.35rem;
        }
        .agents-assign-select :global(.react-select__multi-value) {
          font-size: 0.75rem;
          border-radius: 0.375rem;
        }
        .agents-assign-select :global(.react-select__indicator) {
          padding: 0.35rem 0.5rem;
          color: #64748b;
        }
        .agents-assign-select :global(.react-select__indicator:hover) {
          color: #334155;
        }
      `}</style>
      <AssignAgentSopModal
        open={!!reassignModal}
        candidateId={reassignModal?.id ?? ""}
        candidateName={reassignModal?.fullName}
        currentAgent={reassignModal?.assignedAgent ?? null}
        onClose={() => setReassignModal(null)}
        onAssigned={() => void load()}
      />
    </>
  );
}
