"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { IBM_Plex_Sans } from "next/font/google";
import Seo from "@/shared/layout-components/seo/seo";
import {
  listCandidateSopTemplates,
  getActiveCandidateSopTemplate,
  createCandidateSopTemplate,
  updateCandidateSopTemplate,
  setActiveCandidateSopTemplate,
  getCandidateSopStatus,
  getSopOpenOverview,
  postSopRemindersDispatch,
  type CandidateSopTemplate,
  type SopTemplateStep,
  type CandidateSopStatus,
  type SopOpenOverview,
  type SopOpenOverviewRow,
} from "@/shared/lib/api/candidateSop";
import { getCandidate, listCandidates, type CandidateListItem } from "@/shared/lib/api/candidates";
import { AxiosError } from "axios";
import { useAuth } from "@/shared/contexts/auth-context";
import { canAssignCandidateAgent, canAssignTrainingCourseFromSop } from "@/shared/lib/candidate-permissions";
import AssignAgentSopModal from "../../../ats/employees/_components/AssignAgentSopModal";
import AssignTrainingCourseSopModal from "../../../ats/employees/_components/AssignTrainingCourseSopModal";

/** Accent for preview panel title only — matches candidate edit “Next step” strip direction. */
const sopPreviewHeadline = IBM_Plex_Sans({
  weight: ["600"],
  subsets: ["latin"],
  display: "swap",
});

/** Open-tasks dashboard title + labels (same family as checklist preview, slightly wider weights). */
const sopOpenTasksFont = IBM_Plex_Sans({
  weight: ["500", "600"],
  subsets: ["latin"],
  display: "swap",
});

type SopPreviewResolved = { id: string; fullName: string; employeeId: string | null };

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase() || "?";
}

function SopChecklistPreviewPanel({
  resolved,
  status,
}: {
  resolved: SopPreviewResolved;
  status: CandidateSopStatus;
}) {
  const summary = `${status.completedCount} of ${status.totalCount} complete`;
  const pct =
    status.totalCount > 0 ? Math.round((100 * status.completedCount) / status.totalCount) : 0;

  if (status.skipped) {
    return (
      <div
        className="rounded-lg border border-defaultborder/80 bg-gray-50/90 px-4 py-3 text-sm text-gray-600 dark:border-defaultborder/25 dark:bg-bgdark/40 dark:text-gray-400"
        role="status"
      >
        <p className={`${sopPreviewHeadline.className} text-base text-gray-900 dark:text-white`}>
          Checklist preview
        </p>
        <p className="mt-1">
          <span className="font-medium">{resolved.fullName}</span>
          {resolved.employeeId ? (
            <span className="text-gray-500 dark:text-gray-500"> · {resolved.employeeId}</span>
          ) : null}
        </p>
        <p className="mt-2">No onboarding checklist for this employee (inactive or resigned).</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border-t-2 border-primary/25 border-x border-b border-defaultborder/70 bg-gray-50/95 px-4 py-4 shadow-[inset_0_1px_0_0_rgba(0,0,0,0.05)] dark:border-defaultborder/20 dark:bg-bgdark/45"
      aria-labelledby="sop-preview-heading"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3
            id="sop-preview-heading"
            className={`${sopPreviewHeadline.className} text-lg tracking-tight text-gray-900 dark:text-white`}
          >
            Checklist preview
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-800 dark:text-gray-200">{resolved.fullName}</span>
            {resolved.employeeId ? (
              <span className="text-gray-500"> · {resolved.employeeId}</span>
            ) : null}
            <span className="text-gray-400 dark:text-gray-500"> · Template v{status.templateVersion}</span>
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm text-gray-700 dark:text-gray-300" aria-live="polite" aria-atomic="true">
        <span className="sr-only">Progress: </span>
        {summary}
        {status.nextStep && !status.nextStep.done ? (
          <>
            <span className="mx-1 text-gray-400" aria-hidden>
              ·
            </span>
            <span className="font-medium">Next: {status.nextStep.label}</span>
          </>
        ) : status.completedCount >= status.totalCount && status.totalCount > 0 ? (
          <span className="ml-1 font-medium text-green-700 dark:text-green-400">· All done</span>
        ) : null}
      </p>

      <div
        className="mt-2 h-1.5 w-full max-w-lg overflow-hidden rounded-full bg-gray-200 dark:bg-white/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={status.totalCount}
        aria-valuenow={status.completedCount}
        aria-label="Onboarding checklist progress"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {status.nextStep && !status.nextStep.done && status.nextStep.link ? (
        <div className="mt-3">
          <Link
            href={status.nextStep.link}
            className="ti-btn bg-primary text-white !py-2 !px-4 !rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            Go to: {status.nextStep.label}
          </Link>
        </div>
      ) : null}

      <ul
        className="mt-4 space-y-0 divide-y divide-defaultborder/50 dark:divide-defaultborder/15 border-t border-defaultborder/50 dark:border-defaultborder/15"
        aria-label="Setup steps"
      >
        {status.steps.map((s, idx) => (
          <li
            key={`${s.checkerKey}-${idx}`}
            className="flex gap-3 py-2.5 first:pt-3 transition-opacity duration-200"
          >
            <div className="flex shrink-0 items-start pt-0.5">
              <input
                type="checkbox"
                readOnly
                checked={s.done}
                tabIndex={-1}
                className="form-check-input h-4 w-4 rounded border-gray-400 text-primary focus:ring-primary/30"
                aria-label={`${s.label}, ${s.done ? "complete" : "not complete"}`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div
                className={`text-sm font-medium ${
                  s.done
                    ? "text-gray-500 line-through dark:text-gray-500"
                    : "text-gray-900 dark:text-gray-100"
                }`}
              >
                {s.label}
              </div>
              {!s.done && s.link ? (
                <Link href={s.link} className="mt-1 inline-block text-xs font-medium text-primary hover:underline">
                  Open link
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function norm(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Resolve a single candidate from list API results. Either name or employeeId may be filled; both narrows disambiguation.
 */
function resolveCandidateForPreview(
  results: CandidateListItem[],
  nameRaw: string,
  empRaw: string
): { row: CandidateListItem | null; error: string | null } {
  const name = nameRaw.trim();
  const emp = empRaw.trim();
  const hasName = Boolean(name);
  const hasEmp = Boolean(emp);

  if (hasName && hasEmp) {
    const row = results.find(
      (c) =>
        norm(c.fullName || "") === norm(name) && norm(String(c.employeeId ?? "")) === norm(emp)
    );
    if (!row) {
      return {
        row: null,
        error:
          "No employee matches that full name and employee ID together. Check spelling or try only one field.",
      };
    }
    return { row, error: null };
  }

  if (hasEmp && !hasName) {
    const matches = results.filter((c) => norm(String(c.employeeId ?? "")) === norm(emp));
    if (matches.length === 0) {
      return { row: null, error: "No employee found with that employee ID." };
    }
    if (matches.length > 1) {
      return {
        row: null,
        error: "Multiple rows match that employee ID; add full name to pick one.",
      };
    }
    return { row: matches[0], error: null };
  }

  if (hasName && !hasEmp) {
    const matches = results.filter((c) => norm(c.fullName || "") === norm(name));
    if (matches.length === 0) {
      return { row: null, error: "No employee found with that exact full name." };
    }
    if (matches.length > 1) {
      return {
        row: null,
        error: "Several employees share that name; add employee ID to pick one.",
      };
    }
    return { row: matches[0], error: null };
  }

  return { row: null, error: null };
}

const CHECKER_OPTIONS = [
  "profile_complete",
  "shift_assigned",
  "weekoff_assigned",
  "holiday_assigned",
  "agent_assigned",
  "training_assigned",
  "project_assigned",
] as const;

const CHECKER_LABELS: Record<string, string> = {
  profile_complete: "Profile complete",
  shift_assigned: "Shift assigned",
  weekoff_assigned: "Week-off assigned",
  holiday_assigned: "Holiday assigned",
  agent_assigned: "Agent assigned",
  training_assigned: "Training assigned",
  project_assigned: "Project assigned",
};

/** Default deep-link per rule (matches backend DEFAULT_SOP_STEPS); used when checker changes or new step added. */
const DEFAULT_LINK_TEMPLATE_BY_CHECKER: Record<string, string> = {
  profile_complete: "/ats/employees/edit?id={{candidateId}}",
  agent_assigned: "/ats/employees/edit?id={{candidateId}}&assignAgent=1",
  shift_assigned:
    "/settings/attendance/assign-shift?candidateId={{candidateId}}&candidateName={{candidateName}}&studentId={{studentId}}",
  weekoff_assigned:
    "/settings/attendance/week-off?candidateId={{candidateId}}&candidateName={{candidateName}}&studentId={{studentId}}",
  holiday_assigned:
    "/settings/attendance/assign-holidays?candidateId={{candidateId}}&candidateName={{candidateName}}&studentId={{studentId}}",
  training_assigned: "/ats/employees/edit?id={{candidateId}}&assignCourse=1",
  project_assigned: "/projects",
};

function sortSteps(steps: SopTemplateStep[]): SopTemplateStep[] {
  return [...steps].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export default function SettingsCandidateSopPage() {
  const { permissions, permissionsLoaded, isPlatformSuperUser } = useAuth();
  const canAssignAgent = useMemo(
    () => canAssignCandidateAgent(permissions, isPlatformSuperUser),
    [permissions, isPlatformSuperUser]
  );
  const canAssignCourse = useMemo(
    () => canAssignTrainingCourseFromSop(permissions, isPlatformSuperUser),
    [permissions, isPlatformSuperUser]
  );

  const [templates, setTemplates] = useState<CandidateSopTemplate[]>([]);
  const [active, setActive] = useState<CandidateSopTemplate | null>(null);
  const [draft, setDraft] = useState<SopTemplateStep[]>([]);
  const [draftName, setDraftName] = useState("Onboarding");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [previewFullName, setPreviewFullName] = useState("");
  const [previewEmployeeId, setPreviewEmployeeId] = useState("");
  const [previewPayload, setPreviewPayload] = useState<{
    resolved: SopPreviewResolved;
    status: CandidateSopStatus;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sopOverview, setSopOverview] = useState<SopOpenOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState("");
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [dispatchMessage, setDispatchMessage] = useState("");
  const [workspaceOpen, setWorkspaceOpen] = useState(true);
  const [assignAgentModal, setAssignAgentModal] = useState<{
    candidateId: string;
    candidateName: string;
    currentAgent: { id: string; name: string; email?: string } | null;
  } | null>(null);
  const [assignAgentOpeningId, setAssignAgentOpeningId] = useState<string | null>(null);
  const [assignCourseModal, setAssignCourseModal] = useState<{
    candidateId: string;
    candidateName: string;
  } | null>(null);

  const openAssignAgentFromOverview = useCallback(async (row: SopOpenOverviewRow) => {
    setAssignAgentOpeningId(row.candidateId);
    try {
      const c = await getCandidate(row.candidateId);
      setAssignAgentModal({
        candidateId: row.candidateId,
        candidateName: (row.fullName || row.email || "").trim() || "Employee",
        currentAgent: c.assignedAgent
          ? {
              id: c.assignedAgent.id,
              name: c.assignedAgent.name,
              email: c.assignedAgent.email,
            }
          : null,
      });
    } catch {
      /* keep user on page; Link fallback still available if step re-renders with link */
    } finally {
      setAssignAgentOpeningId(null);
    }
  }, []);

  const openAssignCourseFromOverview = useCallback((row: SopOpenOverviewRow) => {
    setAssignCourseModal({
      candidateId: row.candidateId,
      candidateName: (row.fullName || row.email || "").trim() || "Employee",
    });
  }, []);

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [list, act] = await Promise.all([
        listCandidateSopTemplates(),
        getActiveCandidateSopTemplate(),
      ]);
      setTemplates(list);
      setActive(act);
      const steps = sortSteps(act.steps ?? []);
      setDraft(steps.map((s, i) => ({ ...s, sortOrder: i })));
      setDraftName(act.name || "Onboarding");
      setEditingId(act.id ?? act._id ?? null);
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? (e.response?.data as { message?: string })?.message ?? e.message
          : "Failed to load templates";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadOpenOverview = useCallback(async () => {
    setOverviewError("");
    setOverviewLoading(true);
    try {
      const data = await getSopOpenOverview({ limit: 300 });
      setSopOverview(data);
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? (e.response?.data as { message?: string })?.message ?? e.message
          : "Failed to load open tasks";
      setOverviewError(msg);
      setSopOverview(null);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const dispatchSopNotifications = useCallback(async () => {
    setDispatchMessage("");
    setDispatchLoading(true);
    try {
      const out = await postSopRemindersDispatch({ limit: 200 });
      if (out.skipped) {
        setDispatchMessage(out.reason ?? "SOP reminders are disabled (NOTIFY_SOP_REMINDERS).");
      } else {
        setDispatchMessage(
          `Queued reminders for ${out.queued} candidate(s) with open steps (scanned ${out.scanned ?? "—"}, ${out.withOpen ?? out.queued} with gaps). Check Notifications — you need candidates.manage. Dedupe may skip if nothing changed since today.`
        );
      }
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? (e.response?.data as { message?: string })?.message ?? e.message
          : "Dispatch failed";
      setDispatchMessage(msg);
    } finally {
      setDispatchLoading(false);
    }
  }, []);

  const moveStep = (index: number, dir: -1 | 1) => {
    setDraft((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next.map((s, i) => ({ ...s, sortOrder: i }));
    });
  };

  const updateStep = (index: number, patch: Partial<SopTemplateStep>) => {
    setDraft((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const addStep = () => {
    setDraft((prev) => [
      ...prev,
      {
        checkerKey: "profile_complete",
        label: "New step",
        description: "",
        sortOrder: prev.length,
        enabled: true,
        linkTemplate: DEFAULT_LINK_TEMPLATE_BY_CHECKER.profile_complete,
      },
    ]);
  };

  const removeStep = (index: number) => {
    setDraft((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, sortOrder: i })));
  };

  const saveAsNewVersion = async () => {
    setSaving(true);
    setError("");
    try {
      await createCandidateSopTemplate({ name: draftName, steps: draft, activate: false });
      await load();
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? (e.response?.data as { message?: string })?.message ?? e.message
          : "Save failed";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const activateFromList = async (id: string) => {
    setSaving(true);
    setError("");
    try {
      await setActiveCandidateSopTemplate(id);
      await load();
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? (e.response?.data as { message?: string })?.message ?? e.message
          : "Failed to activate";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const runPreview = async () => {
    const name = previewFullName.trim();
    const emp = previewEmployeeId.trim();
    if (!name && !emp) {
      setError(
        "Enter full name or employee ID (e.g. DBS70). Either is enough; use both if several people could match."
      );
      setPreviewPayload(null);
      return;
    }
    setError("");
    setPreviewLoading(true);
    try {
      const params: Parameters<typeof listCandidates>[0] = {
        employmentStatus: "all",
        limit: 50,
        page: 1,
      };
      if (name && emp) {
        params.fullName = name;
        params.employeeId = emp;
      } else if (emp) {
        params.employeeId = emp;
      } else {
        params.fullName = name;
      }

      const { results } = await listCandidates(params);
      const { row, error: resolveErr } = resolveCandidateForPreview(results, name, emp);
      if (!row) {
        setPreviewPayload(null);
        setError(
          resolveErr ??
            "No employee found. Check spelling and that you can see this person in Employees (permissions / filters)."
        );
        return;
      }
      const id = String(row.id ?? row._id ?? "");
      if (!id) {
        setPreviewPayload(null);
        setError("Employee record has no id.");
        return;
      }
      const s = await getCandidateSopStatus(id);
      setPreviewPayload({
        resolved: {
          id,
          fullName: row.fullName ?? "",
          employeeId: row.employeeId ?? null,
        },
        status: s,
      });
    } catch (e) {
      setPreviewPayload(null);
      const msg =
        e instanceof AxiosError
          ? (e.response?.data as { message?: string })?.message ?? e.message
          : "Preview failed";
      setError(msg);
    } finally {
      setPreviewLoading(false);
    }
  };

  const selectTemplateForEdit = (t: CandidateSopTemplate) => {
    const tid = t.id ?? t._id ?? "";
    setEditingId(tid || null);
    setDraft(sortSteps(t.steps ?? []).map((s, i) => ({ ...s, sortOrder: i })));
    setDraftName(t.name || "Onboarding");
  };

  const editingTemplate = editingId
    ? templates.find((t) => String(t.id ?? t._id) === String(editingId))
    : null;
  const canPatchDraft = Boolean(editingId && editingTemplate && !editingTemplate.isActive);
  const activeTemplateId = active ? String(active.id ?? active._id ?? "") : "";
  const previewUsesActiveOnly =
    Boolean(activeTemplateId && editingId && String(editingId) !== activeTemplateId);

  return (
    <>
      <Seo title="Employee onboarding SOP" />
      <div className="grid grid-cols-12 gap-6 pt-6 sm:pt-8">
        <div className="xl:col-span-12 col-span-12">
          <div className="w-full max-w-none space-y-6">
          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          ) : null}

          <section
            className="overflow-hidden rounded-xl border border-defaultborder/70 bg-white shadow-sm ring-1 ring-black/[0.03] dark:border-defaultborder/25 dark:bg-bgdark/40 dark:ring-white/[0.05]"
            aria-labelledby="sop-versions-heading"
          >
            <div className="flex flex-col gap-4 border-b border-defaultborder/50 bg-gradient-to-br from-slate-50 via-white to-slate-50/90 px-5 pt-5 pb-7 dark:border-defaultborder/20 dark:from-bgdark dark:via-bgdark/95 dark:to-bgdark/80 sm:flex-row sm:items-center sm:justify-between sm:pt-6 sm:pb-8">
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className="mt-0.5 h-10 w-1 shrink-0 rounded-full bg-gradient-to-b from-teal-600 via-primary to-primary/70"
                  aria-hidden
                />
                <div className="min-w-0">
                  <h2
                    id="sop-versions-heading"
                    className={`${sopOpenTasksFont.className} text-lg font-semibold tracking-tight text-gray-900 dark:text-white`}
                  >
                    Template versions
                  </h2>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                    Only the <strong className="font-medium text-gray-800 dark:text-gray-200">active</strong> version
                    drives ATS checklists and reminders. Everything else is a draft until you activate it.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="ti-btn inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border-2 border-primary/20 bg-white px-4 text-sm font-semibold text-primary shadow-sm transition hover:border-primary hover:bg-primary hover:text-white dark:border-primary/35 dark:bg-bgdark/60 dark:hover:bg-primary"
                disabled={loading || saving}
                onClick={() => {
                  setEditingId(null);
                  setDraftName("New template");
                  setDraft([]);
                }}
              >
                <i className="ti ti-file-plus text-lg" aria-hidden />
                <span className="whitespace-nowrap">New draft</span>
              </button>
            </div>
            <div className="px-4 pb-5 pt-12 sm:px-5 sm:pb-6 sm:pt-16">
              {loading ? (
                <div className="flex items-center gap-3 py-8 text-sm text-gray-500">
                  <span
                    className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-primary"
                    aria-hidden
                  />
                  Loading templates…
                </div>
              ) : templates.length === 0 ? (
                <p className="rounded-lg border border-dashed border-defaultborder/60 bg-gray-50/80 py-8 text-center text-sm text-gray-600 dark:border-defaultborder/25 dark:bg-white/[0.02] dark:text-gray-400">
                  No versions yet. Start with <strong>New draft</strong>, add steps, then save.
                </p>
              ) : (
                <ul className="m-0 list-none space-y-3 p-0">
                  {templates.map((t) => {
                    const tid = String(t.id ?? t._id ?? "");
                    const editing = String(editingId) === tid;
                    return (
                      <li
                        key={tid}
                        className={`rounded-xl border px-4 py-3 transition-colors sm:px-5 sm:py-4 ${
                          editing
                            ? "border-primary/35 bg-primary/[0.06] ring-1 ring-primary/15 dark:bg-primary/10"
                            : "border-defaultborder/60 bg-gray-50/40 dark:border-defaultborder/20 dark:bg-black/15"
                        }`}
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                          <div className="flex min-w-0 items-start gap-3">
                            <span
                              className={`${sopOpenTasksFont.className} inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                                t.isActive
                                  ? "bg-gradient-to-br from-emerald-500/15 to-teal-600/10 text-emerald-800 dark:text-emerald-200"
                                  : "bg-gradient-to-br from-slate-200/80 to-slate-100 text-slate-700 dark:from-white/10 dark:to-white/5 dark:text-gray-200"
                              }`}
                            >
                              v{t.version}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                                <span className="min-w-0 truncate font-medium text-gray-900 dark:text-white">
                                  {t.name}
                                </span>
                                {t.isActive ? (
                                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                                    <i className="ti ti-circle-check text-[0.85rem]" aria-hidden />
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-500/12 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:bg-white/10 dark:text-slate-200">
                                    <i className="ti ti-file-pencil text-[0.85rem]" aria-hidden />
                                    Draft
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-500">
                                {(t.steps ?? []).length} step{(t.steps ?? []).length === 1 ? "" : "s"} in this version
                              </p>
                            </div>
                          </div>
                          <div
                            className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-nowrap sm:items-stretch sm:justify-end"
                            role="group"
                            aria-label={`Actions for version ${t.version}`}
                          >
                            <button
                              type="button"
                              className="ti-btn order-1 inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-defaultborder/90 bg-white px-4 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-primary/30 hover:bg-gray-50 dark:border-defaultborder/40 dark:bg-bgdark dark:text-gray-100 dark:hover:bg-white/5 sm:w-auto sm:min-w-[10.5rem]"
                              onClick={() => selectTemplateForEdit(t)}
                            >
                              <i className="ti ti-pencil text-[1rem] text-primary" aria-hidden />
                              <span className="whitespace-nowrap">Edit in workspace</span>
                            </button>
                            {!t.isActive ? (
                              <button
                                type="button"
                                className="ti-btn order-2 inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-60 sm:w-auto sm:min-w-[9.5rem]"
                                disabled={saving}
                                onClick={() => activateFromList(tid)}
                              >
                                <i className="ti ti-bolt text-[1rem]" aria-hidden />
                                <span className="whitespace-nowrap">Set active</span>
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          <section
            className="overflow-hidden rounded-xl border border-defaultborder/70 bg-white shadow-sm ring-1 ring-black/[0.03] dark:border-defaultborder/25 dark:bg-bgdark/40 dark:ring-white/[0.05]"
            aria-labelledby="sop-editor-heading"
          >
            <div className="border-b border-defaultborder/50 bg-gradient-to-br from-slate-50 via-white to-slate-50/90 px-5 py-4 dark:border-defaultborder/20 dark:from-bgdark dark:via-bgdark/95 dark:to-bgdark/80">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div
                    className="mt-1 h-9 w-1 shrink-0 rounded-full bg-gradient-to-b from-primary to-teal-600"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2
                        id="sop-editor-heading"
                        className={`${sopOpenTasksFont.className} text-lg font-semibold tracking-tight text-gray-900 dark:text-white`}
                      >
                        Checklist workspace
                      </h2>
                      <button
                        type="button"
                        id="sop-workspace-toggle"
                        className="group -me-1 -mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-defaultborder/60 bg-white/90 text-gray-600 shadow-sm transition hover:border-primary/35 hover:bg-primary/5 hover:text-primary dark:border-defaultborder/40 dark:bg-bgdark/80 dark:text-gray-300 dark:hover:border-primary/40 dark:hover:bg-primary/10 dark:hover:text-white"
                        aria-expanded={workspaceOpen}
                        aria-controls="sop-workspace-panel"
                        onClick={() => setWorkspaceOpen((o) => !o)}
                      >
                        <i
                          className={`ti ti-chevron-down text-xl transition-transform duration-200 ${workspaceOpen ? "rotate-180" : ""}`}
                          aria-hidden
                        />
                        <span className="sr-only">{workspaceOpen ? "Collapse checklist workspace" : "Expand checklist workspace"}</span>
                      </button>
                    </div>
                    <p className="mt-0.5 max-w-2xl text-xs text-gray-600 dark:text-gray-400">
                      Each card is one step. Reorder with the arrows, tune copy for agents, and paste link templates
                      (placeholders below).
                    </p>
                  </div>
                </div>
                <div className="shrink-0 sm:max-w-[min(100%,20rem)] sm:text-end">
                  {editingTemplate ? (
                    <p className={`${sopOpenTasksFont.className} text-xs font-medium text-gray-500 dark:text-gray-400`}>
                      Editing{" "}
                      <span className="text-gray-800 dark:text-gray-200">
                        v{editingTemplate.version} · {editingTemplate.name}
                      </span>
                      {editingTemplate.isActive ? (
                        <span className="mt-1 inline-block rounded-md bg-amber-500/15 px-1.5 py-0.5 text-amber-900 dark:text-amber-100 sm:ml-2 sm:mt-0">
                          Active — use “Save as new version”
                        </span>
                      ) : null}
                    </p>
                  ) : (
                    <p className="text-xs font-medium text-primary">New unsaved draft</p>
                  )}
                </div>
              </div>
            </div>

            <div
              id="sop-workspace-panel"
              role="region"
              aria-labelledby="sop-editor-heading"
              {...(!workspaceOpen ? { "aria-hidden": true } : {})}
              className={workspaceOpen ? "pointer-events-auto space-y-5 p-4 sm:p-5" : "hidden"}
            >
              <label className="block max-w-xl">
                <span
                  className={`${sopOpenTasksFont.className} mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400`}
                >
                  Template name
                </span>
                <input
                  className="form-control rounded-lg border-defaultborder/80 text-base"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="e.g. Default onboarding"
                />
              </label>

              {draft.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-defaultborder/50 bg-gray-50/60 px-6 py-12 text-center dark:border-defaultborder/25 dark:bg-white/[0.02]">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <i className="ti ti-list-details text-2xl" aria-hidden />
                  </div>
                  <p className={`${sopOpenTasksFont.className} font-semibold text-gray-900 dark:text-white`}>
                    No steps yet
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-gray-600 dark:text-gray-400">
                    Add your first checklist step, pick a checker, and wire a link template. You can reorder anytime.
                  </p>
                  <button
                    type="button"
                    className="ti-btn mt-5 bg-primary px-5 py-2.5 text-white hover:bg-primary/90"
                    onClick={addStep}
                  >
                    <i className="ti ti-plus me-1.5" aria-hidden />
                    Add first step
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {draft.map((row, i) => (
                    <article
                      key={i}
                      className="min-w-0 rounded-xl border border-defaultborder/70 bg-gray-50/30 p-4 shadow-sm dark:border-defaultborder/20 dark:bg-black/20 sm:p-5"
                    >
                      <div className="flex flex-col gap-3 border-b border-defaultborder/40 pb-4 dark:border-white/10">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                            <span
                              className={`${sopOpenTasksFont.className} inline-flex h-10 min-w-[2.5rem] shrink-0 items-center justify-center rounded-lg bg-white px-2.5 text-sm font-semibold text-gray-800 shadow-sm ring-1 ring-defaultborder/40 dark:bg-bgdark dark:text-gray-100 dark:ring-white/10`}
                            >
                              {i + 1}
                            </span>
                            <div
                              className="inline-flex shrink-0 overflow-hidden rounded-lg border border-defaultborder/80 shadow-sm dark:border-defaultborder/35"
                              role="group"
                              aria-label="Reorder step"
                            >
                              <button
                                type="button"
                                className="inline-flex h-10 w-10 shrink-0 items-center justify-center border-0 border-e border-defaultborder/60 bg-white text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-bgdark dark:text-gray-200 dark:hover:bg-white/5"
                                aria-label="Move step up"
                                disabled={i === 0}
                                onClick={() => moveStep(i, -1)}
                              >
                                <i className="ti ti-chevron-up text-lg" aria-hidden />
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-10 w-10 shrink-0 items-center justify-center border-0 bg-white text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-bgdark dark:text-gray-200 dark:hover:bg-white/5"
                                aria-label="Move step down"
                                disabled={i === draft.length - 1}
                                onClick={() => moveStep(i, 1)}
                              >
                                <i className="ti ti-chevron-down text-lg" aria-hidden />
                              </button>
                            </div>
                            <label className="inline-flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg border border-transparent px-1 py-1 text-sm text-gray-700 dark:text-gray-300">
                              <input
                                type="checkbox"
                                className="form-check-input h-[1.125rem] w-[1.125rem] shrink-0 rounded border-gray-400 text-primary"
                                checked={row.enabled !== false}
                                onChange={(e) => updateStep(i, { enabled: e.target.checked })}
                              />
                              <span className="whitespace-nowrap font-semibold">Enabled</span>
                            </label>
                          </div>
                          <button
                            type="button"
                            className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-red-300/90 bg-white px-4 text-sm font-semibold text-red-700 shadow-sm transition hover:border-red-400 hover:bg-red-50 sm:w-auto sm:min-w-[9.5rem] dark:border-red-800/60 dark:bg-red-950/20 dark:text-red-200 dark:hover:bg-red-950/40"
                            onClick={() => removeStep(i)}
                          >
                            <i className="ti ti-trash shrink-0 text-lg" aria-hidden />
                            <span className="whitespace-nowrap">Remove step</span>
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 max-w-xl">
                        <label className="block min-w-0">
                          <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                            Checker <span className="font-normal text-gray-400">(rule)</span>
                          </span>
                          <select
                            className="form-control rounded-lg"
                            value={row.checkerKey}
                            onChange={(e) => {
                              const key = e.target.value;
                              const prev = row.checkerKey;
                              updateStep(i, {
                                checkerKey: key,
                                linkTemplate:
                                  key === prev
                                    ? row.linkTemplate
                                    : DEFAULT_LINK_TEMPLATE_BY_CHECKER[key] ??
                                      "/ats/employees/edit?id={{candidateId}}",
                              });
                            }}
                          >
                            {CHECKER_OPTIONS.map((k) => (
                              <option key={k} value={k}>
                                {CHECKER_LABELS[k] ?? k}
                              </option>
                            ))}
                          </select>
                          <p className="mt-1.5 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                            The checklist picks a default “next step” link from this rule. Change the rule to switch
                            destination; custom URL editing was removed to avoid broken templates.
                          </p>
                        </label>
                      </div>

                      <div className="mt-4 space-y-3">
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                            Step title
                          </span>
                          <input
                            className="form-control rounded-lg font-medium"
                            value={row.label}
                            onChange={(e) => updateStep(i, { label: e.target.value })}
                            placeholder="Shown in UI and notifications"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                            Description <span className="font-normal text-gray-400">(optional)</span>
                          </span>
                          <textarea
                            className="form-control rounded-lg text-sm"
                            rows={2}
                            placeholder="Short hint for recruiters / agents"
                            value={row.description ?? ""}
                            onChange={(e) => updateStep(i, { description: e.target.value })}
                          />
                        </label>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <div className="pointer-events-auto flex flex-col gap-4 border-t border-defaultborder/50 pt-4 dark:border-defaultborder/20">
                {editingTemplate?.isActive ? (
                  <p
                    className="rounded-lg border border-amber-200/90 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/45 dark:bg-amber-950/35 dark:text-amber-100"
                    role="status"
                  >
                    <strong className="font-semibold">Active template</strong> — &quot;Update draft&quot; stays off so live
                    checklists don&apos;t change mid-flight. Use <strong>Save as new version</strong>, then{" "}
                    <strong>Set active</strong> on that row in Template versions.
                  </p>
                ) : null}
                <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:gap-2">
                  <button
                    type="button"
                    className="inline-flex h-11 w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-defaultborder/90 bg-white px-4 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 dark:border-defaultborder/40 dark:bg-bgdark dark:text-gray-100 dark:hover:bg-white/5 sm:w-auto sm:min-w-[9rem]"
                    onClick={() => addStep()}
                  >
                    <i className="ti ti-row-insert-bottom text-lg" aria-hidden />
                    <span className="whitespace-nowrap">Add step</span>
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-11 w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 sm:w-auto sm:min-w-[11rem]"
                    disabled={saving || draft.length === 0}
                    onClick={() => void saveAsNewVersion()}
                  >
                    <i className="ti ti-versions text-lg" aria-hidden />
                    <span className="whitespace-nowrap">Save as new version</span>
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-11 w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-50 dark:bg-slate-600 dark:hover:bg-slate-500 sm:w-auto sm:min-w-[10rem]"
                    disabled={saving || !canPatchDraft}
                    title={
                      !canPatchDraft && editingTemplate?.isActive
                        ? "Active templates cannot be patched in place — save a new version first."
                        : !editingId
                          ? "Load a template from Template versions (Edit in workspace) to enable updates."
                          : undefined
                    }
                    onClick={async () => {
                      if (!editingId || !canPatchDraft) return;
                      setSaving(true);
                      setError("");
                      try {
                        await updateCandidateSopTemplate(editingId, { name: draftName, steps: draft });
                        await load();
                      } catch (e) {
                        const msg =
                          e instanceof AxiosError
                            ? (e.response?.data as { message?: string })?.message ?? e.message
                            : "Update failed";
                        setError(msg);
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    <i className="ti ti-device-floppy text-lg" aria-hidden />
                    <span className="whitespace-nowrap">Update draft</span>
                  </button>
                </div>
                <p className="max-w-md text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                  Active templates cannot be edited in place — save a <strong>new version</strong>, then{" "}
                  <strong>Set active</strong> on that row.
                </p>
                </div>
              </div>
            </div>
          </section>

          <section
            className="box custom-box overflow-hidden !p-0 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.06]"
            aria-labelledby="sop-open-tasks-heading"
            aria-busy={overviewLoading || dispatchLoading}
          >
            <div className="relative border-b border-defaultborder/50 bg-gradient-to-br from-slate-50 via-white to-slate-50/80 px-5 py-5 dark:border-defaultborder/20 dark:from-bgdark dark:via-bgdark/95 dark:to-bgdark/80">
              <div
                className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary via-primary/70 to-teal-600/80"
                aria-hidden
              />
              <div className="relative flex flex-col gap-5 pl-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <h2
                    id="sop-open-tasks-heading"
                    className={`${sopOpenTasksFont.className} text-xl font-semibold tracking-tight text-gray-900 dark:text-white`}
                  >
                    Open onboarding tasks
                  </h2>
                  <p className={`${sopOpenTasksFont.className} mt-1.5 max-w-2xl text-sm font-medium text-gray-600 dark:text-gray-400`}>
                    Live view of <strong className="font-semibold text-gray-800 dark:text-gray-200">current</strong>{" "}
                    candidates who still have gaps on the active checklist — same rules as the ATS list (up to 300
                    rows, name order).
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    className="ti-btn inline-flex items-center justify-center gap-2 bg-primary px-5 py-2.5 text-white shadow-sm transition hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-55"
                    disabled={overviewLoading}
                    onClick={() => void loadOpenOverview()}
                  >
                    {overviewLoading ? (
                      <>
                        <span
                          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                          aria-hidden
                        />
                        <span>Scanning candidates…</span>
                      </>
                    ) : sopOverview ? (
                      <>
                        <i className="ti ti-refresh text-base" aria-hidden />
                        Refresh scan
                      </>
                    ) : (
                      <>
                        <i className="ti ti-users text-base" aria-hidden />
                        Load open tasks
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="ti-btn inline-flex items-center justify-center gap-2 border border-defaultborder/80 bg-white/90 px-4 py-2.5 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 dark:border-defaultborder/30 dark:bg-bgdark/60 dark:text-gray-100 dark:hover:bg-bgdark disabled:opacity-50"
                    disabled={dispatchLoading}
                    onClick={() => void dispatchSopNotifications()}
                    title="Enqueue in-app notifications for users with candidates.manage (and stakeholders on each candidate)"
                  >
                    {dispatchLoading ? (
                      <>
                        <span
                          className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-primary dark:border-white/20"
                          aria-hidden
                        />
                        Notifying…
                      </>
                    ) : (
                      <>
                        <i className="ti ti-bell-ringing text-base text-primary" aria-hidden />
                        Push to notifications
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4 px-5 py-5">
              <details className="group rounded-lg border border-dashed border-defaultborder/60 bg-gray-50/50 px-4 py-3 dark:border-defaultborder/25 dark:bg-white/[0.02]">
                <summary
                  className={`${sopOpenTasksFont.className} cursor-pointer list-none text-sm font-medium text-gray-700 outline-none marker:hidden hover:text-primary dark:text-gray-300 [&::-webkit-details-marker]:hidden`}
                >
                  <span className="inline-flex items-center gap-2">
                    <i className="ti ti-info-circle text-gray-400 transition group-open:rotate-0 dark:text-gray-500" />
                    How scanning &amp; notifications work
                    <i className="ti ti-chevron-down text-xs text-gray-400 transition group-open:rotate-180" aria-hidden />
                  </span>
                </summary>
                <div className="mt-3 space-y-2 border-l-2 border-primary/25 pl-4 text-xs leading-relaxed text-gray-600 dark:border-primary/35 dark:text-gray-400">
                  <p>
                    Only the <strong>active</strong> SOP template is evaluated. Candidates with no remaining steps are
                    hidden. Resigned or inactive profiles are skipped.
                  </p>
                  <p>
                    <strong>Push to notifications</strong> queues in-app alerts for everyone with{" "}
                    <strong>candidates.manage</strong>, plus each record&apos;s admin, assigned agent, and recruiter.
                    Duplicate alerts the same day are suppressed when nothing changed.
                  </p>
                </div>
              </details>

              {(overviewLoading || dispatchLoading) && (
                <div
                  className="relative h-1 w-full overflow-hidden rounded-full bg-gray-200/80 dark:bg-white/10"
                  aria-live="polite"
                  aria-label={overviewLoading ? "Loading candidate overview" : "Sending notifications"}
                >
                  <div className="absolute inset-y-0 left-0 w-[38%] min-w-[5rem] rounded-full bg-gradient-to-r from-primary/50 via-primary to-teal-600 shadow-sm animate-external-jobs-shimmer" />
                </div>
              )}

              {dispatchMessage ? (
                <div
                  className={`rounded-lg border px-4 py-3 text-sm ${
                    dispatchMessage.includes("disabled") || dispatchMessage.toLowerCase().includes("fail")
                      ? "border-amber-200/80 bg-amber-50 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100"
                      : "border-emerald-200/80 bg-emerald-50 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-100"
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  {dispatchMessage}
                </div>
              ) : null}

              {overviewError ? (
                <div
                  className="rounded-lg border border-red-200/90 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100"
                  role="alert"
                >
                  {overviewError}
                </div>
              ) : null}

              {!sopOverview && !overviewLoading && !overviewError && (
                <div className="rounded-xl border-2 border-dashed border-defaultborder/50 bg-gradient-to-b from-gray-50/80 to-white px-6 py-12 text-center dark:border-defaultborder/25 dark:from-bgdark/40 dark:to-bgdark/20">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/20">
                    <i className="ti ti-list-check text-2xl" aria-hidden />
                  </div>
                  <p className={`${sopOpenTasksFont.className} text-base font-semibold text-gray-900 dark:text-white`}>
                    Ready when you are
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-gray-600 dark:text-gray-400">
                    Run a scan to see candidates with incomplete onboarding steps. Use{" "}
                    <span className="font-medium text-gray-800 dark:text-gray-200">Push to notifications</span> after a
                    scan if you want the bell icon populated for your team.
                  </p>
                  <button
                    type="button"
                    className="ti-btn mt-6 bg-primary px-6 py-2.5 text-white hover:bg-primary/90"
                    onClick={() => void loadOpenOverview()}
                  >
                    <i className="ti ti-player-play me-1.5 inline text-lg align-middle" aria-hidden />
                    Start scan
                  </button>
                </div>
              )}

              {sopOverview ? (
                <div className="space-y-5">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-defaultborder/60 bg-white px-3 py-1 text-xs font-medium text-gray-800 shadow-sm dark:border-defaultborder/25 dark:bg-bgdark/50 dark:text-gray-200">
                      <i className="ti ti-versions text-primary" aria-hidden />
                      Template v{sopOverview.activeSopVersion ?? "—"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-defaultborder/60 bg-white px-3 py-1 text-xs font-medium text-gray-800 shadow-sm dark:border-defaultborder/25 dark:bg-bgdark/50 dark:text-gray-200">
                      <i className="ti ti-scan text-gray-500 dark:text-gray-400" aria-hidden />
                      Scanned {sopOverview.scannedCount} / {sopOverview.totalCurrentCandidates}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
                        sopOverview.withOpenStepsCount > 0
                          ? "border border-amber-200/90 bg-amber-50 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100"
                          : "border border-emerald-200/90 bg-emerald-50 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-100"
                      }`}
                    >
                      <i className="ti ti-alert-circle" aria-hidden />
                      {sopOverview.withOpenStepsCount} open
                    </span>
                  </div>

                  {sopOverview.results.length === 0 ? (
                    <div className="rounded-xl border border-defaultborder/50 bg-gray-50/50 px-5 py-8 text-center dark:border-defaultborder/20 dark:bg-white/[0.03]">
                      <i className="ti ti-circle-check mb-3 inline-block text-3xl text-emerald-600 dark:text-emerald-400" />
                      <p className={`${sopOpenTasksFont.className} font-semibold text-gray-900 dark:text-white`}>
                        All clear in this batch
                      </p>
                      <p className="mx-auto mt-1 max-w-lg text-sm text-gray-600 dark:text-gray-400">
                        No current candidates in the scanned set still have open checklist items — or they&apos;re excluded
                        (inactive / resigned).
                      </p>
                    </div>
                  ) : (
                    <ul className="m-0 list-none space-y-3 p-0">
                      {sopOverview.results.map((row) => {
                        const pct =
                          row.totalCount > 0 ? Math.round((100 * row.completedCount) / row.totalCount) : 0;
                        return (
                          <li
                            key={row.candidateId}
                            className="overflow-hidden rounded-xl border border-defaultborder/60 bg-white shadow-sm transition hover:border-primary/25 hover:shadow-md dark:border-defaultborder/20 dark:bg-bgdark/50 dark:hover:border-primary/30"
                          >
                            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch">
                              <div className="flex min-w-0 flex-1 gap-3">
                                <div
                                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-teal-600/10 text-sm font-bold text-primary dark:from-primary/25 dark:to-teal-500/10"
                                  aria-hidden
                                >
                                  {initialsFromName(row.fullName || row.email || "?")}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <Link
                                    href={`/ats/employees/edit?id=${encodeURIComponent(row.candidateId)}`}
                                    className={`${sopOpenTasksFont.className} text-base font-semibold text-gray-900 hover:text-primary dark:text-white dark:hover:text-primary`}
                                  >
                                    {row.fullName || "Unnamed employee"}
                                  </Link>
                                  <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                                    {row.employeeId ? (
                                      <span className="inline-flex items-center gap-1">
                                        <i className="ti ti-id" aria-hidden />
                                        {row.employeeId}
                                      </span>
                                    ) : null}
                                    {row.email ? (
                                      <span className="inline-flex min-w-0 items-center gap-1 truncate">
                                        <i className="ti ti-mail" aria-hidden />
                                        <span className="truncate">{row.email}</span>
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="mt-3">
                                    <div className="mb-1 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                      <span>Checklist progress</span>
                                      <span>
                                        {row.completedCount}/{row.totalCount} · v{row.templateVersion}
                                      </span>
                                    </div>
                                    <div
                                      className="h-2 overflow-hidden rounded-full bg-gray-200/90 dark:bg-white/10"
                                      role="progressbar"
                                      aria-valuemin={0}
                                      aria-valuemax={row.totalCount}
                                      aria-valuenow={row.completedCount}
                                      aria-label={`${row.completedCount} of ${row.totalCount} steps complete`}
                                    >
                                      <div
                                        className="h-full rounded-full bg-gradient-to-r from-primary to-teal-600 transition-[width] duration-500 ease-out"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="min-w-0 flex-1 rounded-lg bg-gray-50/90 px-3 py-2 dark:bg-black/20 sm:max-w-md sm:border-l sm:border-defaultborder/40 sm:pl-4 dark:sm:border-white/10">
                                <p
                                  className={`${sopOpenTasksFont.className} mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400`}
                                >
                                  Still to do
                                </p>
                                <ul className="m-0 list-none space-y-2 p-0">
                                  {row.openSteps.map((s, si) => (
                                    <li
                                      key={`${row.candidateId}-open-${si}`}
                                      className="flex flex-col gap-1 rounded-md border border-transparent bg-white/60 px-2 py-1.5 text-sm dark:bg-bgdark/30"
                                    >
                                      <div className="flex flex-wrap items-start justify-between gap-2">
                                        <span className="font-medium text-gray-900 dark:text-gray-100">{s.label}</span>
                                        {s.link &&
                                        permissionsLoaded &&
                                        canAssignAgent &&
                                        (s.checkerKey === "agent_assigned" ||
                                          s.link.includes("assignAgent=1")) ? (
                                          <button
                                            type="button"
                                            className="shrink-0 text-xs font-semibold text-primary hover:underline disabled:cursor-wait disabled:opacity-60"
                                            disabled={assignAgentOpeningId === row.candidateId}
                                            onClick={() => void openAssignAgentFromOverview(row)}
                                          >
                                            {assignAgentOpeningId === row.candidateId ? "Opening…" : "Open →"}
                                          </button>
                                        ) : s.link &&
                                          permissionsLoaded &&
                                          canAssignCourse &&
                                          (s.checkerKey === "training_assigned" ||
                                            s.link.includes("assignCourse=1")) ? (
                                          <button
                                            type="button"
                                            className="shrink-0 text-xs font-semibold text-primary hover:underline"
                                            onClick={() => openAssignCourseFromOverview(row)}
                                          >
                                            Open →
                                          </button>
                                        ) : s.link ? (
                                          <Link
                                            href={s.link}
                                            className="shrink-0 text-xs font-semibold text-primary hover:underline"
                                          >
                                            Open →
                                          </Link>
                                        ) : null}
                                      </div>
                                      {s.description ? (
                                        <p className="text-xs leading-snug text-gray-600 dark:text-gray-400">
                                          {s.description}
                                        </p>
                                      ) : null}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          </section>

          <section
            className="overflow-hidden rounded-xl border border-defaultborder/70 bg-white shadow-sm ring-1 ring-black/[0.03] dark:border-defaultborder/25 dark:bg-bgdark/40 dark:ring-white/[0.05]"
            aria-labelledby="sop-preview-run-heading"
          >
            <div className="border-b border-defaultborder/50 px-5 py-4 dark:border-defaultborder/20">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-8 w-1 shrink-0 rounded-full bg-gradient-to-b from-teal-600 to-primary" aria-hidden />
                <div>
                  <h2
                    id="sop-preview-run-heading"
                    className={`${sopOpenTasksFont.className} text-lg font-semibold tracking-tight text-gray-900 dark:text-white`}
                  >
                    Preview checklist
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                    Resolve a candidate and render the <strong>active</strong> template against live data.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3 p-4 sm:p-5">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Enter <strong>either</strong> full name <strong>or</strong> employee ID (e.g. DBS70). Both together disambiguate duplicates. Names are matched exactly after normalizing spaces and case.
              </p>
              {previewUsesActiveOnly ? (
                <p
                  className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
                  role="status"
                >
                  Preview always uses the <strong>active</strong> template (currently v{active?.version}). You are
                  editing a different saved version in the editor — steps like &quot;Assign Agent&quot; only appear in
                  preview if that active template includes them. Activate this version after saving, or edit the
                  active row via <strong>Edit in workspace</strong> on the active version.
                </p>
              ) : null}
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex min-w-[12rem] max-w-xs flex-1 flex-col gap-1 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Full name (optional if ID known)</span>
                  <input
                    className="form-control"
                    placeholder="e.g. Jane Doe"
                    value={previewFullName}
                    onChange={(e) => setPreviewFullName(e.target.value)}
                    autoComplete="off"
                    disabled={previewLoading}
                  />
                </label>
                <label className="flex min-w-[8rem] max-w-[10rem] flex-col gap-1 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Employee ID (optional)</span>
                  <input
                    className="form-control"
                    placeholder="e.g. DBS70"
                    value={previewEmployeeId}
                    onChange={(e) => setPreviewEmployeeId(e.target.value)}
                    autoComplete="off"
                    disabled={previewLoading}
                  />
                </label>
                <button
                  type="button"
                  className="ti-btn inline-flex min-w-[10.5rem] items-center justify-center gap-2 bg-primary text-white hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-85"
                  onClick={() => void runPreview()}
                  disabled={previewLoading}
                  aria-busy={previewLoading}
                  aria-label={previewLoading ? "Loading checklist preview" : "Run checklist preview"}
                >
                  {previewLoading ? (
                    <>
                      <span
                        className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/35 border-t-white"
                        aria-hidden
                      />
                      Loading…
                    </>
                  ) : (
                    <>
                      <i className="ti ti-player-play text-base" aria-hidden />
                      Run preview
                    </>
                  )}
                </button>
              </div>
              {previewPayload ? (
                <SopChecklistPreviewPanel resolved={previewPayload.resolved} status={previewPayload.status} />
              ) : null}
            </div>
          </section>
          </div>
        </div>
      </div>
      {assignAgentModal ? (
        <AssignAgentSopModal
          open
          candidateId={assignAgentModal.candidateId}
          candidateName={assignAgentModal.candidateName}
          currentAgent={assignAgentModal.currentAgent}
          onClose={() => setAssignAgentModal(null)}
          onAssigned={() => void loadOpenOverview()}
        />
      ) : null}
      {assignCourseModal ? (
        <AssignTrainingCourseSopModal
          open
          candidateId={assignCourseModal.candidateId}
          candidateName={assignCourseModal.candidateName}
          onClose={() => setAssignCourseModal(null)}
          onAssigned={() => void loadOpenOverview()}
        />
      ) : null}
    </>
  );
}
