"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Seo from "@/shared/layout-components/seo/seo";
import Swal from "sweetalert2";
import {
  getAssignmentRun,
  patchAssignmentRun,
  approveAssignmentRun,
  applyAssignmentRun,
  submitAssignmentRunFeedback,
  type AssignmentGenerationMeta,
  type AssignmentApplyTeamSync,
  type RecommendedJobDraft,
} from "@/shared/lib/api/pmAssistant";
import type { AssignmentFeedbackItem } from "@/shared/types/pmAssistant";
import { listCandidates, type CandidateListItem } from "@/shared/lib/api/candidates";
import { useAuth } from "@/shared/contexts/auth-context";
import { JobFromAssignmentGapModal } from "@/shared/components/pm/JobFromAssignmentGapModal";
import styles from "./assignmentRunReview.module.css";

const Select = dynamic(() => import("react-select"), { ssr: false });

type Row = {
  _id?: string;
  id?: string;
  taskId?: { title?: string; _id?: string; id?: string };
  recommendedCandidateId?: { _id?: string; id?: string; fullName?: string; email?: string } | string | null;
  gap?: boolean;
  notes?: string;
  recommendedJobDraft?: unknown;
};

type Run = {
  _id?: string;
  id?: string;
  status?: string;
  supervisorValue?: string;
  projectId?: { name?: string; _id?: string; projectManager?: string; clientStakeholder?: string };
  generationMeta?: AssignmentGenerationMeta;
};

type CandidatePickOption = { value: string; label: string; candidate: CandidateListItem };

function rowKey(r: Row): string {
  return String(r._id ?? r.id ?? "");
}

function formatRunStatus(status?: string): string {
  if (!status) return "—";
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function taskIdFromRow(r: Row): string | null {
  const t = r.taskId;
  if (t && typeof t === "object") {
    const raw = (t as { _id?: unknown; id?: unknown })._id ?? (t as { id?: unknown }).id;
    if (raw != null) {
      if (typeof raw === "object" && raw !== null && "$oid" in (raw as object)) {
        return String((raw as { $oid: string }).$oid);
      }
      return String(raw);
    }
  }
  return null;
}

function candidateIdFromRow(r: Row): string | null {
  const x = r.recommendedCandidateId;
  if (x == null || x === "") return null;
  if (typeof x === "string") return x.trim() || null;
  if (typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  if (typeof o.$oid === "string") return o.$oid;
  const raw = o._id ?? o.id;
  if (raw == null) return null;
  if (typeof raw === "object" && raw !== null && "$oid" in (raw as object)) {
    return String((raw as { $oid: string }).$oid);
  }
  return String(raw);
}

function parseRecommendedJobDraft(r: Row): RecommendedJobDraft | null {
  const raw = r.recommendedJobDraft;
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : "";
  const descriptionOutline = typeof o.descriptionOutline === "string" ? o.descriptionOutline.trim() : "";
  if (!title || !descriptionOutline) return null;
  const mustHaveSkills = Array.isArray(o.mustHaveSkills)
    ? o.mustHaveSkills.map((s) => String(s).trim()).filter(Boolean)
    : [];
  const seniority = typeof o.seniority === "string" ? o.seniority.trim() : "";
  return { title, descriptionOutline, mustHaveSkills, seniority };
}

function notesLookLikeNoMatch(n?: string): boolean {
  if (!n?.trim()) return false;
  const s = n.toLowerCase();
  return (
    /no\s+(suitable\s+)?candidates?/.test(s) ||
    /no\s+suitable\s+candidate/.test(s) ||
    /no\s+eligible\s+candidates?/.test(s) ||
    s.includes("no ats match") ||
    s.includes("no active candidates") ||
    s.includes("no matcher row") ||
    s.includes("gap: assign")
  );
}

function isRowEligibleForInternalJob(r: Row): boolean {
  if (candidateIdFromRow(r)) return false;
  return !!(r.gap || parseRecommendedJobDraft(r) != null || notesLookLikeNoMatch(r.notes));
}

function serializeRowsSnapshot(rows: Row[]): string {
  return JSON.stringify(
    rows.map((r) => ({
      i: rowKey(r),
      g: !!r.gap,
      n: (r.notes ?? "").trim(),
      c: candidateIdFromRow(r) ?? "",
    }))
  );
}

/** Build option for a row’s assignee when they may not be in the main shortlist (react-select needs value ∈ options). */
function syntheticOptionForAssignedRow(r: Row, id: string): CandidatePickOption {
  const obj =
    typeof r.recommendedCandidateId === "object" && r.recommendedCandidateId
      ? (r.recommendedCandidateId as { fullName?: string; email?: string })
      : null;
  const name = obj?.fullName?.trim() || "Assigned candidate";
  const c: CandidateListItem = {
    _id: id,
    id,
    fullName: name,
    email: obj?.email ?? "",
    phoneNumber: "",
  };
  return {
    value: id,
    label: `${name}${obj?.email ? ` · ${obj.email}` : ""}`,
    candidate: c,
  };
}

export default function AssignmentRunPage() {
  const params = useParams();
  const router = useRouter();
  const runId = String(params?.runId ?? "");
  const [run, setRun] = useState<Run | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [baseline, setBaseline] = useState("");
  const [candidateOptions, setCandidateOptions] = useState<CandidatePickOption[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { permissions, isAdministrator, isPlatformSuperUser } = useAuth();
  const [jobGapModal, setJobGapModal] = useState<{
    rowKey: string;
    seed: RecommendedJobDraft | null;
    taskTitle: string;
  } | null>(null);

  /** First-load snapshot to compute apply-time feedback (approve / replace / reject). */
  const assignmentFeedbackBaseline = useRef<Map<string, { taskId: string; suggestedId: string | null }> | null>(
    null
  );

  const hasJobsManage = useMemo(() => {
    if (isAdministrator || isPlatformSuperUser) return true;
    return permissions.some((p) => {
      if (p === "jobs.manage" || p.startsWith("jobs.manage")) return true;
      const [key, actionsPart] = p.split(":");
      if (key !== "ats.jobs" || !actionsPart) return false;
      return actionsPart
        .split(",")
        .some((a) => ["create", "edit", "delete"].includes(a.trim().toLowerCase()));
    });
  }, [permissions, isAdministrator, isPlatformSuperUser]);

  const projectMeta = useMemo(() => {
    if (run?.projectId && typeof run.projectId === "object") {
      const p = run.projectId;
      return {
        name: p.name ?? "",
        projectManager: p.projectManager ?? "",
        clientStakeholder: p.clientStakeholder ?? "",
      };
    }
    return { name: "", projectManager: "", clientStakeholder: "" };
  }, [run]);

  const loadCandidateOptions = useCallback(async () => {
    setCandidatesLoading(true);
    try {
      const res = await listCandidates({
        page: 1,
        limit: 250,
        employmentStatus: "current",
        sortBy: "fullName:asc",
      });
      const opts: CandidatePickOption[] = (res.results ?? [])
        .map((c) => {
          const id = String(c._id ?? c.id ?? "");
          if (!id) return null;
          const label = `${c.fullName ?? "—"}${c.email ? ` · ${c.email}` : ""}`;
          return { value: id, label, candidate: c };
        })
        .filter((o): o is CandidatePickOption => o != null);
      setCandidateOptions(opts);
    } catch {
      setCandidateOptions([]);
    } finally {
      setCandidatesLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    if (!runId) return;
    setLoading(true);
    try {
      const data = await getAssignmentRun(runId);
      const runObj = (data.run as Run) ?? null;
      const nextRows = (data.rows as Row[]) ?? [];
      setRun(runObj);
      setRows(nextRows);
      setBaseline(serializeRowsSnapshot(nextRows));
      const m = new Map<string, { taskId: string; suggestedId: string | null }>();
      for (const r of nextRows) {
        const tid = taskIdFromRow(r);
        if (!tid) continue;
        m.set(rowKey(r), { taskId: tid, suggestedId: candidateIdFromRow(r) });
      }
      assignmentFeedbackBaseline.current = m;
      if (runObj?.status === "ready_for_review") {
        void loadCandidateOptions();
      }
    } catch {
      setRun(null);
      setRows([]);
      setBaseline("");
    } finally {
      setLoading(false);
    }
  }, [runId, loadCandidateOptions]);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = useMemo(() => {
    if (!baseline) return false;
    return serializeRowsSnapshot(rows) !== baseline;
  }, [rows, baseline]);

  /** Task-level counts: total vs staffed (not gap, has a candidate) vs remaining. */
  const taskRunMetrics = useMemo(() => {
    const total = rows.length;
    const assignedToEmployees = rows.filter((r) => !r.gap && candidateIdFromRow(r)).length;
    const gaps = total - assignedToEmployees;
    return { total, assignedToEmployees, gaps };
  }, [rows]);

  /** Includes assignees on this run who are outside the paginated shortlist — required for react-select controlled value. */
  const mergedCandidateOptions = useMemo(() => {
    const map = new Map<string, CandidatePickOption>();
    for (const o of candidateOptions) {
      map.set(o.value, o);
    }
    for (const r of rows) {
      const id = candidateIdFromRow(r);
      if (!id || map.has(id)) continue;
      map.set(id, syntheticOptionForAssignedRow(r, id));
    }
    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
    );
  }, [candidateOptions, rows]);

  const persistRows = useCallback(async () => {
    const data = await patchAssignmentRun(
      runId,
      rows.map((r) => ({
        id: rowKey(r),
        gap: !!r.gap,
        notes: r.notes ?? "",
        recommendedCandidateId: candidateIdFromRow(r),
      }))
    );
    const nextRows = (data.rows as Row[]) ?? [];
    setRun((data.run as Run) ?? null);
    setRows(nextRows);
    setBaseline(serializeRowsSnapshot(nextRows));
  }, [runId, rows]);

  const handleSaveEdits = async () => {
    setSaving(true);
    try {
      await persistRows();
      await Swal.fire("Saved", "Preview changes were saved to this run.", "success");
    } catch {
      Swal.fire("Error", "Could not save changes.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    const ok = await Swal.fire({
      title: "Approve run?",
      text: dirty
        ? "Unsaved preview edits will be saved first, then the run will be approved."
        : "You can still go back before applying to tasks.",
      icon: "question",
      showCancelButton: true,
    });
    if (!ok.isConfirmed) return;
    setSaving(true);
    try {
      if (dirty) {
        await persistRows();
      }
      await approveAssignmentRun(runId);
      await Swal.fire("Approved", "", "success");
      await load();
    } catch {
      Swal.fire("Error", "Approve failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleApply = async () => {
    const ok = await Swal.fire({
      title: "Apply assignments?",
      text: "Tasks and project fields will be updated.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Apply",
    });
    if (!ok.isConfirmed) return;
    const projectIdForFeedback =
      run?.projectId && typeof run.projectId === "object"
        ? String((run.projectId as { _id?: string })._id ?? "")
        : "";
    setSaving(true);
    try {
      const feedbackItems: AssignmentFeedbackItem[] = [];
      for (const r of rows) {
        const key = rowKey(r);
        const base = assignmentFeedbackBaseline.current?.get(key);
        const taskId = base?.taskId || taskIdFromRow(r);
        const original = base?.suggestedId ?? null;
        const current = candidateIdFromRow(r);
        if (!taskId || !original) continue;
        if (original === current) {
          feedbackItems.push({
            taskId,
            suggestedEmployeeId: original,
            outcome: "approved",
          });
        } else if (!current && original) {
          feedbackItems.push({
            taskId,
            suggestedEmployeeId: original,
            outcome: "rejected",
          });
        } else if (current && original && current !== original) {
          feedbackItems.push({
            taskId,
            suggestedEmployeeId: original,
            outcome: "replaced",
            replacedWithEmployeeId: current,
          });
        }
      }
      if (feedbackItems.length > 0 && projectIdForFeedback) {
        try {
          await submitAssignmentRunFeedback(projectIdForFeedback, runId, {
            items: feedbackItems,
            submittedAt: new Date().toISOString(),
          });
        } catch {
          /* non-fatal: apply still runs */
        }
      }
      const applyRes = (await applyAssignmentRun(runId)) as {
        teamSync?: AssignmentApplyTeamSync;
      };
      const ts = applyRes?.teamSync;
      let appliedText = "Assignments saved.";
      if (ts?.syncError) {
        appliedText += ` Team roster sync issue: ${ts.syncError}`;
      } else if (ts?.teamGroupId) {
        const where = ts.usedExistingTeam
          ? "Staffed people were added to your project’s existing team (first linked group)."
          : "A project team was linked and staffed people were added as members.";
        appliedText += ` ${where} New roster rows: ${ts.membersAdded ?? 0}.`;
      }
      await Swal.fire("Applied", appliedText, ts?.syncError ? "warning" : "success");
      const pid =
        run?.projectId && typeof run.projectId === "object"
          ? String((run.projectId as { _id?: string })._id ?? "")
          : "";
      if (pid) router.push(`/apps/projects/edit/${pid}`);
      else router.push("/apps/projects/project-list");
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Apply failed.";
      Swal.fire("Error", typeof msg === "string" ? msg : "Apply failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  const pid =
    run?.projectId && typeof run.projectId === "object"
      ? String((run.projectId as { _id?: string })._id ?? "")
      : "";

  const seoTitle =
    run?.projectId && typeof run.projectId === "object" && run.projectId.name
      ? `Assignment — ${run.projectId.name}`
      : "Assignment review";

  return (
    <>
      <Seo title={seoTitle} />
      <div className={styles.page}>
        <div className="mt-5 grid grid-cols-12 gap-6 sm:mt-6">
          <div className="col-span-12 flex flex-col gap-6">
            <div className="box custom-box motion-safe:animate-pm-panel-in motion-reduce:animate-none rounded-xl border border-defaultborder/80 shadow-sm dark:border-white/10">
              <div className="border-b border-defaultborder/60 bg-gradient-to-r from-slate-50/90 via-white to-slate-50/40 px-4 py-4 sm:px-5 dark:border-white/10 dark:from-white/[0.04] dark:via-transparent dark:to-transparent">
                <div className={`${styles.toolbar} gap-2`}>
                  <Link
                    href={pid ? `/apps/projects/edit/${pid}` : "/apps/projects/project-list"}
                    className={`${styles.btn} ${styles.btnGhost}`}
                  >
                    Back to project
                  </Link>
                  {run?.status === "ready_for_review" ? (
                    <>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnOutline}`}
                        disabled={saving}
                        onClick={() => void handleSaveEdits()}
                      >
                        Save preview
                      </button>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        disabled={saving}
                        onClick={() => void handleApprove()}
                      >
                        Approve
                      </button>
                    </>
                  ) : null}
                  {run?.status === "approved" ? (
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnSuccess}`}
                      disabled={saving}
                      onClick={() => void handleApply()}
                    >
                      Apply to tasks
                    </button>
                  ) : null}
                </div>
                {run?.status === "ready_for_review" ? (
                  <p className={`${styles.hint} mb-0 mt-3`}>
                    Edit <strong>candidate</strong>, <strong>gap</strong>, or <strong>notes</strong> below, then save. Approving saves
                    unsaved preview changes automatically, then locks the run until you apply.
                  </p>
                ) : null}
                {dirty && run?.status === "ready_for_review" ? (
                  <div className={`${styles.unsaved} mt-3`} role="status">
                    <strong>Unsaved preview edits</strong> — click <strong>Save preview</strong>, or use <strong>Approve</strong> to save
                    and approve in one flow.
                  </div>
                ) : null}
              </div>
            </div>

            {loading ? (
              <div
                className="motion-safe:animate-pm-panel-in motion-reduce:animate-none"
                role="presentation"
              >
                <div className={styles.loadingPanel} role="status" aria-busy="true" aria-label="Loading assignment run">
                  <div className={styles.loadingShimmer} aria-hidden />
                  <div className="font-medium text-defaulttextcolor dark:text-white/80">Loading assignment run…</div>
                  <div className={styles.loadingLines} aria-hidden>
                    <div className={styles.loadingLine} />
                    <div className={styles.loadingLine} />
                  </div>
                </div>
              </div>
            ) : !run ? (
              <div className="motion-safe:animate-pm-panel-in motion-reduce:animate-none rounded-xl border border-danger/25 bg-danger/5 px-4 py-6 text-center text-danger dark:border-danger/30 dark:bg-danger/10">
                Run not found.
              </div>
            ) : (
              <div className={`${styles.card} motion-safe:animate-pm-panel-in motion-reduce:animate-none`}>
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle}>
                {run.projectId && typeof run.projectId === "object" ? run.projectId.name : "Project"}
              </h2>
              <span className={styles.statusPill} data-status={run.status ?? ""}>
                {formatRunStatus(run.status)}
              </span>
            </div>
            <div className={styles.cardBody}>
              {taskRunMetrics.total > 0 ? (
                <div className={styles.taskRunStats} role="status" aria-label="Task assignment summary">
                  <div className={styles.statsLabel}>Tasks (this run)</div>
                  <p className={`${styles.hint} mb-2`}>
                    Total project tasks in this table, and how many have an <strong>employee</strong> (ATS candidate) selected
                    for the row. Remaining rows are gaps or unassigned.
                  </p>
                  <div className={styles.taskRunStatsGrid}>
                    <div className={styles.stat}>
                      <div className={styles.statK}>Total tasks</div>
                      <div className={styles.statV}>{taskRunMetrics.total}</div>
                    </div>
                    <div className={styles.stat}>
                      <div className={styles.statK}>Assigned to employees</div>
                      <div className={styles.statVAccent}>{taskRunMetrics.assignedToEmployees}</div>
                    </div>
                    <div className={styles.stat}>
                      <div className={styles.statK}>Gaps / unassigned</div>
                      <div className={styles.statV}>{taskRunMetrics.gaps}</div>
                    </div>
                  </div>
                </div>
              ) : null}
              {run.generationMeta?.rosterFetched != null ? (
                <div className={styles.stats} role="status">
                  <div className={styles.statsLabel}>Roster screening (this run)</div>
                  {run.generationMeta.rosterScope === "admin_capacity_filtered" ? (
                    <p className={styles.statsScope}>
                      AI roster: <strong>assignees’ candidates</strong> (always) plus{" "}
                      <strong>
                        {run.generationMeta.rosterPoolMode === "admin"
                          ? "candidates with the project owner’s adminId"
                          : run.generationMeta.rosterPoolOwnerScope === "candidate_role"
                            ? "ATS employees (Employee user role) + current employment (resigned excluded)"
                            : "all active ATS candidates"}
                      </strong>{" "}
                      (total cap {run.generationMeta.rosterQueryLimit ?? "—"}), then <strong>capacity filter</strong>{" "}
                      (2+ other active projects as assignee). Assignee users: {run.generationMeta.projectAssigneeCount ?? 0}.
                      {run.generationMeta.candidateRoleOwnerCount != null ? (
                        <>
                          {" "}
                          Candidate-role users (active/pending) in directory:{" "}
                          <strong>{run.generationMeta.candidateRoleOwnerCount}</strong>
                          {" — "}
                          <span className={styles.statsHint}>
                            “In pool” can differ: assignee-linked profiles, multiple profiles per user, or users without a
                            Candidate doc are not counted here.
                          </span>
                        </>
                      ) : null}
                    </p>
                  ) : run.generationMeta.rosterScope === "project_assignees" ? (
                    <p className={styles.statsScope}>
                      <strong>Legacy run:</strong> roster was limited to project assignees only (
                      {run.generationMeta.projectAssigneeCount ?? 0} user(s)).
                    </p>
                  ) : run.generationMeta.rosterScope === "admin_fallback" ? (
                    <p className={styles.statsScope}>
                      <strong>Legacy run:</strong> capped admin shortlist (limit{" "}
                      {run.generationMeta.adminFallbackLimit ?? "—"}).
                    </p>
                  ) : null}
                  <div className={styles.statsGrid}>
                    <div className={styles.stat}>
                      <div className={styles.statK}>In pool</div>
                      <div className={styles.statV}>{run.generationMeta.rosterFetched}</div>
                    </div>
                    <div className={styles.stat}>
                      <div className={styles.statK}>Sent to AI</div>
                      <div className={styles.statVAccent}>{run.generationMeta.eligibleForAi ?? 0}</div>
                    </div>
                    <div className={styles.stat}>
                      <div className={styles.statK}>Skipped (2+ projects)</div>
                      <div className={styles.statV}>{run.generationMeta.excludedAtCapacity ?? 0}</div>
                    </div>
                    <div className={styles.stat}>
                      <div className={styles.statK}>Skipped (no user)</div>
                      <div className={styles.statV}>{run.generationMeta.excludedMissingOwner ?? 0}</div>
                    </div>
                  </div>
                  {run.generationMeta.assignmentAllTasksSingleRequest ? (
                    <p className={styles.hint} style={{ marginTop: "0.5rem" }}>
                      All{" "}
                      <strong>
                        {run.generationMeta.assignmentTotalTaskCount ?? "—"}
                      </strong>{" "}
                      project tasks were sent to the matcher in <strong>one</strong> request (same candidate roster for
                      every row). Assigned rows should include rationale notes; empty notes get a short system summary.
                    </p>
                  ) : run.generationMeta.assignmentBatchCount != null && run.generationMeta.assignmentBatchCount > 1 ? (
                    <p className={styles.hint} style={{ marginTop: "0.5rem" }}>
                      Legacy run: matcher used{" "}
                      <strong>{run.generationMeta.assignmentBatchCount}</strong> batch(es) (max{" "}
                      {run.generationMeta.assignmentTaskBatchSize ?? "—"} tasks per call).
                    </p>
                  ) : null}
                  {run.generationMeta.assignmentTotalTaskCount != null ? (
                    <p className={styles.hint} style={{ marginTop: "0.35rem" }}>
                      Tasks in this table: <strong>{run.generationMeta.assignmentTotalTaskCount}</strong>
                      {run.generationMeta.assignmentBackfilledTaskCount ? (
                        <>
                          {" "}
                          — <strong>{run.generationMeta.assignmentBackfilledTaskCount}</strong> still had no model row
                          after all batches; they appear as gaps — assign someone or use the job draft to hire.
                        </>
                      ) : null}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {run.supervisorValue ? (
                <p className={styles.supervisor}>
                  <span className={styles.supervisorMuted}>Suggested supervisor: </span>
                  {run.supervisorValue}
                </p>
              ) : null}
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead className={styles.thead}>
                    <tr>
                      <th className={styles.th}>Task</th>
                      <th className={styles.th}>Gap</th>
                      <th className={styles.th}>Candidate</th>
                      <th className={styles.th}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                  {rows.map((r, rowIndex) => {
                    const tid = typeof r.taskId === "object" && r.taskId ? r.taskId.title ?? "—" : "—";
                    const rk = rowKey(r);
                    const cid = candidateIdFromRow(r);
                    const selectedOption = cid ? mergedCandidateOptions.find((o) => o.value === cid) ?? null : null;
                    const candRead =
                      typeof r.recommendedCandidateId === "object" && r.recommendedCandidateId
                        ? (r.recommendedCandidateId as { fullName?: string }).fullName ?? "—"
                        : cid ?? "—";
                    return (
                      <tr
                        key={rk}
                        className={styles.row}
                        style={{ "--ar-i": rowIndex } as React.CSSProperties}
                      >
                        <td className={`${styles.td} ${styles.tdTask}`}>{tid}</td>
                        <td className={`${styles.td} ${styles.tdGap}`}>
                          {run.status === "ready_for_review" ? (
                            <label className={styles.gapWrap}>
                              <input
                                type="checkbox"
                                className={styles.gapInput}
                                checked={!!r.gap}
                                aria-label={`Mark gap for ${tid}`}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setRows((prev) =>
                                    prev.map((x) =>
                                      rowKey(x) === rk
                                        ? {
                                            ...x,
                                            gap: checked,
                                            recommendedCandidateId: checked ? null : x.recommendedCandidateId,
                                          }
                                        : x
                                    )
                                  );
                                }}
                              />
                            </label>
                          ) : (
                            <span>{r.gap ? "Yes" : "No"}</span>
                          )}
                        </td>
                        <td className={`${styles.td} ${styles.tdCand}`}>
                          {run.status === "ready_for_review" ? (
                            <Select
                              instanceId={`assign-cand-${rk}`}
                              classNamePrefix="Select2"
                              className={styles.selectWrap}
                              isClearable
                              isSearchable
                              isDisabled={!!r.gap}
                              getOptionValue={(o) => (o as CandidatePickOption).value}
                              getOptionLabel={(o) => (o as CandidatePickOption).label}
                              placeholder={
                                r.gap
                                  ? "Gap — clear gap to assign"
                                  : candidatesLoading
                                    ? "Loading candidates…"
                                    : "Search or pick candidate…"
                              }
                              menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                              styles={{
                                menuPortal: (base) => ({ ...base, zIndex: 13050 }),
                                control: (base) => ({ ...base, minHeight: 34 }),
                              }}
                              options={mergedCandidateOptions}
                              value={selectedOption}
                              onChange={(opt) => {
                                const o = opt as CandidatePickOption | null;
                                setRows((prev) =>
                                  prev.map((x) => {
                                    if (rowKey(x) !== rk) return x;
                                    if (!o) {
                                      return { ...x, recommendedCandidateId: null };
                                    }
                                    const c = o.candidate;
                                    const id = String(c._id ?? c.id ?? "");
                                    return {
                                      ...x,
                                      gap: false,
                                      recommendedCandidateId: {
                                        _id: id,
                                        id,
                                        fullName: c.fullName,
                                        email: c.email,
                                      },
                                    };
                                  })
                                );
                              }}
                            />
                          ) : (
                            <span className="whitespace-normal">{candRead}</span>
                          )}
                        </td>
                        <td className={`${styles.td} ${styles.tdNotes}`}>
                          <div className={styles.notesStack}>
                            {run.status === "ready_for_review" ? (
                              <input
                                className={styles.noteInput}
                                value={r.notes ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setRows((prev) =>
                                    prev.map((x) => (rowKey(x) === rk ? { ...x, notes: v } : x))
                                  );
                                }}
                              />
                            ) : (
                              <span className="text-[0.8125rem] whitespace-normal">{r.notes}</span>
                            )}
                            {isRowEligibleForInternalJob(r) ? (
                              <button
                                type="button"
                                className={`${styles.btn} ${styles.btnOutline} ${styles.jobFromGapBtn}`}
                                onClick={() =>
                                  setJobGapModal({
                                    rowKey: rk,
                                    seed: parseRecommendedJobDraft(r),
                                    taskTitle: tid,
                                  })
                                }
                              >
                                Internal job from gap…
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
            )}
          </div>
        </div>
      </div>
      {jobGapModal ? (
        <JobFromAssignmentGapModal
          key={jobGapModal.rowKey}
          open
          onClose={() => setJobGapModal(null)}
          runId={runId}
          rowId={jobGapModal.rowKey}
          taskTitle={jobGapModal.taskTitle}
          seedDraft={jobGapModal.seed}
          projectName={projectMeta.name}
          projectManager={projectMeta.projectManager}
          clientStakeholder={projectMeta.clientStakeholder}
          hasJobsManage={hasJobsManage}
        />
      ) : null}
    </>
  );
}
