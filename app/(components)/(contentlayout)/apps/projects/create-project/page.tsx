"use client";

import React, { Fragment, useState, useCallback, useEffect, useRef } from "react";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import DynamicProjectForm, {
  type ProjectFormValues,
} from "@/shared/components/forms/DynamicProjectForm";
import {
  createProject,
  type CreateProjectPayload,
  type Project,
  type ProjectStatus,
  type ProjectPriority,
} from "@/shared/lib/api/projects";
import { createTeamGroup, listTeamGroups } from "@/shared/lib/api/projectTeams";
import { listUsers } from "@/shared/lib/api/users";
import { PROJECT_STATUS_OPTIONS, PROJECT_PRIORITY_OPTIONS } from "@/shared/data/apps/projects/projectFormConfig";
import type { SelectOption } from "@/shared/data/apps/projects/projectFormConfig";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { AiTaskBreakdownModal } from "@/shared/components/pm/AiTaskBreakdownModal";
import { AiBootstrapProgressOverlay } from "@/shared/components/pm/AiBootstrapProgressOverlay";
import { bootstrapSmartTeam } from "@/shared/lib/api/pmAssistant";
import { runAssignmentGenerationWithUi } from "@/shared/lib/pm/runAssignmentGenerationWithUi";
import { isPmAssistantUiEnabled } from "@/shared/lib/pm/featureFlags";
import { composeProjectDescriptionPlainFromParts } from "@/shared/lib/apps/composeProjectDescriptionPlain";

type AfterCreateAiMode = "ask" | "smart_team" | "tasks" | "assign";

const initialFormValues: ProjectFormValues = {
  name: "",
  projectManager: "",
  clientStakeholder: "",
  description: "",
  intakeSuccess: "",
  intakeConstraints: "",
  intakeMilestones: "",
  startDate: null,
  endDate: null,
  status: PROJECT_STATUS_OPTIONS[0],
  priority: PROJECT_PRIORITY_OPTIONS[0],
  assignedTeams: [],
  assignedUsers: [],
  tags: [],
};

/** Strip HTML tags and decode entities to plain text */
function stripHtmlToText(html: string): string {
  if (!html || typeof html !== "string") return "";
  const div = typeof document !== "undefined" ? document.createElement("div") : null;
  if (div) {
    div.innerHTML = html;
    return (div.textContent ?? div.innerText ?? "").trim();
  }
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

const MONGO_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/** Read post-create checkboxes from the Swal popup DOM (not document — IDs live inside the modal). */
function readPostCreateAiChoices(popup: HTMLElement | null): {
  smart: boolean;
  suggestTasks: boolean;
  suggestAssignments: boolean;
} {
  if (!popup) {
    return { smart: false, suggestTasks: false, suggestAssignments: false };
  }
  const smartEl = popup.querySelector<HTMLInputElement>("#pm-post-create-smart");
  const tasksEl = popup.querySelector<HTMLInputElement>("#pm-post-create-tasks");
  const assignEl = popup.querySelector<HTMLInputElement>("#pm-post-create-assign");
  const smart = !!smartEl?.checked;
  return {
    smart,
    suggestTasks: smart ? false : !!tasksEl?.checked,
    suggestAssignments: smart ? false : !!assignEl?.checked,
  };
}

function getCreatedProjectId(project: Project): string {
  return (project as Project & { id?: string })._id ?? (project as Project & { id?: string }).id ?? "";
}

const Createproject = () => {
  const router = useRouter();
  const [values, setValues] = useState<ProjectFormValues>(initialFormValues);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [assignedToOptions, setAssignedToOptions] = useState<SelectOption[]>([]);
  const [assignedUserOptions, setAssignedUserOptions] = useState<SelectOption[]>([]);
  const [teamOptionsError, setTeamOptionsError] = useState<string | null>(null);
  const [userOptionsError, setUserOptionsError] = useState<string | null>(null);
  const [aiTaskModalOpen, setAiTaskModalOpen] = useState(false);
  const [aiTaskProjectId, setAiTaskProjectId] = useState("");
  const [aiTaskProjectName, setAiTaskProjectName] = useState("");
  /** After task breakdown apply, start assignment run (swarm-style pipeline: tasks then staffing). */
  const [runAssignmentAfterTasks, setRunAssignmentAfterTasks] = useState(false);
  /** When true, `onClose` should not navigate (handled in `onApplied` or already routed). */
  const skipNavigateOnModalCloseRef = useRef(false);
  /** Chosen on the form: what to do after a successful create (when PM assistant UI is enabled). */
  const [afterCreateAiMode, setAfterCreateAiMode] = useState<AfterCreateAiMode>("ask");
  /** When opening task breakdown from the form, optionally chain candidate assignment after apply. */
  const [afterTasksOpenAssignment, setAfterTasksOpenAssignment] = useState(false);
  /** Full-screen staged progress while `bootstrapSmartTeam` runs (replaces Swal loading). */
  const [aiBootstrapLoading, setAiBootstrapLoading] = useState(false);

  const runSmartSetupFlow = useCallback(async (projectId: string) => {
    setAiBootstrapLoading(true);
    try {
      const result = await bootstrapSmartTeam(projectId, {});
      if (result.staffed === false) {
        const reviewUrl = `/apps/projects/assignment/${encodeURIComponent(result.assignmentRunId)}`;
        await Swal.fire({
          icon: "info",
          title: "Tasks created — staffing needs review",
          html: `<p class="text-start text-sm">${result.message ?? "No automatic candidate matches were produced."} You can match candidates on the assignment screen.</p><p class="text-start text-sm mb-0"><a href="${reviewUrl}" class="text-primary">Open AI assignment review</a></p>`,
        });
        return;
      }
      await Swal.fire({
        icon: "success",
        title: "Team created & students assigned",
        text: "A new team was created for this project, matched students/candidates were added to it, tasks were created, task owners were set from smart assignment, and the team was linked on the project under Project team(s).",
      });
    } catch (err: unknown) {
      const message =
        (err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined) ??
        "Smart team setup failed. The project still exists—open it to add tasks or a team manually.";
      await Swal.fire({ icon: "warning", title: "AI team & assignment", text: message });
    } finally {
      setAiBootstrapLoading(false);
    }
  }, []);

  useEffect(() => {
    setTeamOptionsError(null);
    listTeamGroups({ limit: 200 })
      .then((res) => {
        const options: SelectOption[] = (res.results ?? []).map((t) => {
          const teamId = (t as { id?: string }).id ?? t._id;
          return { value: teamId, label: t.name || teamId };
        });
        setAssignedToOptions(options);
      })
      .catch(() => {
        setAssignedToOptions([]);
        setTeamOptionsError("Could not load teams. Check permissions or try again.");
      });
  }, []);

  useEffect(() => {
    setUserOptionsError(null);
    listUsers({ limit: 200, status: "active" })
      .then((res) => {
        const options: SelectOption[] = (res.results ?? []).map((u) => {
          const id = String(u.id ?? "").trim();
          const label = [u.name, u.email].filter(Boolean).join(" — ") || id;
          return { value: id, label };
        });
        setAssignedUserOptions(options);
      })
      .catch(() => {
        setAssignedUserOptions([]);
        setUserOptionsError("Could not load users for assignment.");
      });
  }, []);

  const handleChange = useCallback((name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const handleCreateTeamGroup = useCallback(async (name: string) => {
    const trimmed = name.trim();
    const created = await createTeamGroup({ name: trimmed });
    const id = String((created as { id?: string }).id ?? created._id ?? "").trim();
    const label = created.name?.trim() || trimmed || id;
    const opt: SelectOption = { value: id, label };
    setAssignedToOptions((prev) => {
      if (prev.some((o) => String(o.value) === id)) return prev;
      return [...prev, opt].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
    });
    return opt;
  }, []);

  const buildPayload = (): CreateProjectPayload => {
    const statusVal =
      typeof values.status === "object" && values.status !== null && "value" in values.status
        ? (values.status as SelectOption).value
        : values.status;
    const priorityVal =
      typeof values.priority === "object" && values.priority !== null && "value" in values.priority
        ? (values.priority as SelectOption).value
        : values.priority;
    const selectedTeams = (values.assignedTeams as SelectOption[]) ?? [];
    const assignedTeamIds: string[] = selectedTeams
      .map((o) => (o?.value != null ? String(o.value) : ""))
      .filter((id) => id !== "undefined" && MONGO_ID_REGEX.test(id));
    const selectedUsers = (values.assignedUsers as SelectOption[]) ?? [];
    const assignedUserIds: string[] = selectedUsers
      .map((o) => (o?.value != null ? String(o.value) : ""))
      .filter((id) => id !== "undefined" && MONGO_ID_REGEX.test(id));
    const tagsRaw = (values.tags as SelectOption[] | undefined) ?? [];
    const tags: string[] = tagsRaw
      .map((t) => (typeof t === "string" ? t : (t && (t as SelectOption).value != null ? String((t as SelectOption).value) : "")))
      .map((s) => (typeof s === "string" ? s : "").trim())
      .filter((s) => s.length > 0);

    const descriptionPlain = composeProjectDescriptionPlainFromParts({
      mainPlain: stripHtmlToText(String(values.description ?? "")).trim(),
      intakeSuccess: String(values.intakeSuccess ?? ""),
      intakeConstraints: String(values.intakeConstraints ?? ""),
      intakeMilestones: String(values.intakeMilestones ?? ""),
    });

    return {
      name: String(values.name ?? "").trim(),
      projectManager: String(values.projectManager ?? "").trim() || undefined,
      clientStakeholder: String(values.clientStakeholder ?? "").trim() || undefined,
      description: descriptionPlain,
      startDate:
        values.startDate instanceof Date
          ? values.startDate.toISOString()
          : values.startDate
            ? new Date(values.startDate as string).toISOString()
            : undefined,
      endDate:
        values.endDate instanceof Date
          ? values.endDate.toISOString()
          : values.endDate
            ? new Date(values.endDate as string).toISOString()
            : undefined,
      status: (statusVal as ProjectStatus) ?? "Inprogress",
      priority: (priorityVal as ProjectPriority) ?? "Medium",
      assignedTeams: assignedTeamIds,
      assignedTo: assignedUserIds,
      tags,
    };
  };

  const handleSubmit = async () => {
    if (!String(values.name ?? "").trim()) {
      setErrors({ name: "Project name is required" });
      return;
    }
    const start =
      values.startDate instanceof Date
        ? values.startDate
        : values.startDate
          ? new Date(values.startDate as string)
          : null;
    const end =
      values.endDate instanceof Date
        ? values.endDate
        : values.endDate
          ? new Date(values.endDate as string)
          : null;
    if (
      start &&
      end &&
      !Number.isNaN(start.getTime()) &&
      !Number.isNaN(end.getTime()) &&
      end < start
    ) {
      setErrors({ endDate: "End date must be on or after the start date." });
      return;
    }
    const payload = buildPayload();
    setSubmitting(true);
    setErrors({});
    try {
      const created = await createProject(payload);
      const projectId = getCreatedProjectId(created);
      const projectName = String(created.name ?? payload.name ?? "Project").trim() || "Project";

      if (!projectId) {
        await Swal.fire({
          icon: "success",
          title: "Project created",
          text: "The project has been created successfully.",
        });
        router.push("/apps/projects/project-list/");
        return;
      }

      const showPmAi = isPmAssistantUiEnabled();

      if (!showPmAi) {
        await Swal.fire({
          icon: "success",
          title: "Project created",
          text: "The project has been created successfully.",
        });
        router.push("/apps/projects/project-list/");
        return;
      }

      if (afterCreateAiMode === "smart_team") {
        await runSmartSetupFlow(projectId);
        router.push("/apps/projects/project-list/");
        return;
      }

      if (afterCreateAiMode === "tasks") {
        setRunAssignmentAfterTasks(afterTasksOpenAssignment);
        setAiTaskProjectId(projectId);
        setAiTaskProjectName(projectName);
        setAiTaskModalOpen(true);
        return;
      }

      if (afterCreateAiMode === "assign") {
        await runAssignmentGenerationWithUi(projectId, router, {
          afterError: () => router.push("/apps/projects/project-list/"),
        });
        return;
      }

      const choice = await Swal.fire<{
        smart: boolean;
        suggestTasks: boolean;
        suggestAssignments: boolean;
      }>({
        icon: "success",
        title: "Project created",
        html: `
          <div class="text-start rounded-lg border border-violet-500/35 bg-violet-500/[0.07] p-3 mb-3">
            <label class="flex items-start gap-3 cursor-pointer text-[0.875rem] leading-snug">
              <input type="checkbox" id="pm-post-create-smart" class="mt-0.5 shrink-0" />
              <span>
                <strong class="text-defaulttextcolor">New AI team + smart student assignment</strong>
                <span class="block text-[#8c9097] dark:text-white/55 mt-1">
                  Creates tasks with GPT, runs smart candidate matching, <strong>creates a new team</strong> for this project, <strong>adds matched students/candidates</strong> to that team roster, sets task owners, and links the team here — one automated run (often 30–90 seconds).
                </span>
              </span>
            </label>
          </div>
          <p class="text-start text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-2">Or pick manual steps (you review before saving):</p>
          <div class="text-start space-y-2 text-[0.875rem]">
            <label class="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" id="pm-post-create-tasks" class="mt-1" />
              <span><strong>Suggest tasks</strong> — open the editor to preview/edit before creating tasks.</span>
            </label>
            <label class="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" id="pm-post-create-assign" class="mt-1" />
              <span><strong>Assignments only</strong> — open the assignment review screen (needs existing tasks).</span>
            </label>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: "Continue",
        cancelButtonText: "Not now",
        focusCancel: false,
        width: 560,
        didOpen: (popup) => {
          const smart = popup.querySelector<HTMLInputElement>("#pm-post-create-smart");
          const tasks = popup.querySelector<HTMLInputElement>("#pm-post-create-tasks");
          const assign = popup.querySelector<HTMLInputElement>("#pm-post-create-assign");
          const sync = () => {
            Swal.resetValidationMessage();
            const s = !!smart?.checked;
            if (tasks) {
              tasks.disabled = s;
              if (s) tasks.checked = false;
            }
            if (assign) {
              assign.disabled = s;
              if (s) assign.checked = false;
            }
          };
          smart?.addEventListener("change", sync);
          tasks?.addEventListener("change", () => {
            if (tasks?.checked && smart) smart.checked = false;
            sync();
          });
          assign?.addEventListener("change", () => {
            if (assign?.checked && smart) smart.checked = false;
            sync();
          });
          sync();
        },
        preConfirm: () => {
          const popup = Swal.getPopup();
          const { smart, suggestTasks, suggestAssignments } = readPostCreateAiChoices(popup);
          if (!smart && !suggestTasks && !suggestAssignments) {
            Swal.showValidationMessage(
              "Choose <strong>New AI team</strong>, <strong>Suggest tasks</strong>, and/or <strong>Assignments only</strong> — or click <strong>Not now</strong> to skip."
            );
            return false;
          }
          return { smart, suggestTasks, suggestAssignments };
        },
      });

      if (!choice.isConfirmed || !choice.value) {
        router.push("/apps/projects/project-list/");
        return;
      }

      const { smart, suggestTasks, suggestAssignments } = choice.value;

      if (!smart && !suggestTasks && !suggestAssignments) {
        router.push("/apps/projects/project-list/");
        return;
      }

      if (smart) {
        await runSmartSetupFlow(projectId);
        router.push("/apps/projects/project-list/");
        return;
      }

      if (suggestTasks) {
        setRunAssignmentAfterTasks(suggestAssignments);
        setAiTaskProjectId(projectId);
        setAiTaskProjectName(projectName);
        setAiTaskModalOpen(true);
        return;
      }

      if (suggestAssignments) {
        await runAssignmentGenerationWithUi(projectId, router, {
          afterError: () => router.push("/apps/projects/project-list/"),
        });
        return;
      }

      router.push("/apps/projects/project-list/");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Failed to create project.";
      const msg = typeof message === "string" ? message : "Failed to create project.";
      setErrors({ submit: msg });
      Swal.fire({
        icon: "error",
        title: "Error",
        text: msg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Fragment>
      <AiBootstrapProgressOverlay open={aiBootstrapLoading} />
      <Seo title="Create Project" />
      <Pageheader
        currentpage="Create Project"
        activepage="Projects"
        mainpage="Create Project"
      />
      <div className="grid grid-cols-12 gap-6">
        <div className="xl:col-span-12 col-span-12">
          <div className="box custom-box">
            <div className="box-header">
              <div className="box-title">Create Project</div>
            </div>
            <div className="box-body">
              {teamOptionsError ? (
                <div className="alert alert-warning text-[0.8125rem] mb-3" role="status">
                  {teamOptionsError}
                </div>
              ) : null}
              {userOptionsError ? (
                <div className="alert alert-light border text-[0.8125rem] mb-3" role="status">
                  {userOptionsError}
                </div>
              ) : null}
              <DynamicProjectForm
                values={values}
                onChange={handleChange}
                errors={errors}
                assignedToOptions={assignedToOptions}
                assignedUserOptions={assignedUserOptions}
                onCreateTeamGroup={handleCreateTeamGroup}
                briefAiEnhanceEnabled={isPmAssistantUiEnabled()}
              />

              {isPmAssistantUiEnabled() ? (
                <section
                  className="mt-8 rounded-xl border border-slate-200/95 bg-gradient-to-b from-slate-50/90 to-white px-4 py-5 shadow-defaultshadow motion-safe:animate-pm-section-in motion-reduce:animate-none dark:border-white/10 dark:from-slate-950/40 dark:to-bodybg2/30 sm:px-5"
                  style={{ animationDelay: "380ms" }}
                  aria-labelledby="pm-after-create-ai-heading"
                >
                  <div className="mb-4 flex flex-col gap-2 border-s-[3px] border-indigo-500 ps-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                        <i className="ri-sparkling-2-line text-xl" aria-hidden />
                      </span>
                      <div>
                        <h2
                          id="pm-after-create-ai-heading"
                          className="m-0 text-[0.9375rem] font-semibold text-defaulttextcolor"
                        >
                          After you create
                        </h2>
                        <p className="m-0 text-[0.75rem] text-[#8c9097] dark:text-white/45">
                          One tap after <strong className="text-defaulttextcolor">Create Project</strong> — you can still change course in the next step.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 text-start">
                    <label
                      className={`group flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-all duration-200 ease-out motion-reduce:transition-none ${
                        afterCreateAiMode === "ask"
                          ? "border-primary/50 bg-primary/[0.07] shadow-[0_0_0_1px_rgba(var(--primary-rgb),0.12)] ring-1 ring-primary/15"
                          : "border-defaultborder bg-[rgb(var(--default-background))]/60 hover:border-primary/25 hover:shadow-sm dark:bg-black/15"
                      }`}
                    >
                      <input
                        type="radio"
                        name="after-create-ai"
                        className="mt-1.5 shrink-0"
                        checked={afterCreateAiMode === "ask"}
                        onChange={() => setAfterCreateAiMode("ask")}
                      />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 font-semibold text-defaulttextcolor">
                          <i className="ri-chat-3-line text-indigo-500/90" aria-hidden />
                          Ask me first
                        </span>
                        <span className="mt-1 block text-[0.8125rem] leading-snug text-[#8c9097] dark:text-white/50">
                          Show choices: AI team + assign, task breakdown, or candidate assignment.
                        </span>
                      </span>
                    </label>

                    <label
                      className={`group flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-all duration-200 ease-out motion-reduce:transition-none ${
                        afterCreateAiMode === "smart_team"
                          ? "border-primary/50 bg-primary/[0.07] shadow-[0_0_0_1px_rgba(var(--primary-rgb),0.12)] ring-1 ring-primary/15"
                          : "border-defaultborder bg-[rgb(var(--default-background))]/60 hover:border-primary/25 hover:shadow-sm dark:bg-black/15"
                      }`}
                    >
                      <input
                        type="radio"
                        name="after-create-ai"
                        className="mt-1.5 shrink-0"
                        checked={afterCreateAiMode === "smart_team"}
                        onChange={() => setAfterCreateAiMode("smart_team")}
                      />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 font-semibold text-defaulttextcolor">
                          <i className="ri-rocket-2-line text-indigo-500/90" aria-hidden />
                          AI team + auto-assign
                        </span>
                        <span className="mt-1 block text-[0.8125rem] leading-snug text-[#8c9097] dark:text-white/50">
                          One run: draft tasks, match candidates, create a project team, set owners, link the team.
                        </span>
                        <details className="mt-2 text-[0.72rem] text-[#8c9097] dark:text-white/45">
                          <summary className="cursor-pointer select-none text-indigo-600/90 underline-offset-2 hover:underline dark:text-indigo-300">
                            Required permissions
                          </summary>
                          <p className="mt-1.5 mb-0 font-mono text-[0.7rem] leading-relaxed">
                            projects.manage · tasks.manage · teams.manage · candidates.read
                          </p>
                        </details>
                      </span>
                    </label>

                    <label
                      className={`group flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-all duration-200 ease-out motion-reduce:transition-none ${
                        afterCreateAiMode === "tasks"
                          ? "border-primary/50 bg-primary/[0.07] shadow-[0_0_0_1px_rgba(var(--primary-rgb),0.12)] ring-1 ring-primary/15"
                          : "border-defaultborder bg-[rgb(var(--default-background))]/60 hover:border-primary/25 hover:shadow-sm dark:bg-black/15"
                      }`}
                    >
                      <input
                        type="radio"
                        name="after-create-ai"
                        className="mt-1.5 shrink-0"
                        checked={afterCreateAiMode === "tasks"}
                        onChange={() => setAfterCreateAiMode("tasks")}
                      />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 font-semibold text-defaulttextcolor">
                          <i className="ri-task-line text-indigo-500/90" aria-hidden />
                          AI task breakdown
                        </span>
                        <span className="mt-1 block text-[0.8125rem] leading-snug text-[#8c9097] dark:text-white/50">
                          Preview and edit suggested tasks before they are saved.
                        </span>
                      </span>
                    </label>

                    <label
                      className={`group flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-all duration-200 ease-out motion-reduce:transition-none ${
                        afterCreateAiMode === "assign"
                          ? "border-primary/50 bg-primary/[0.07] shadow-[0_0_0_1px_rgba(var(--primary-rgb),0.12)] ring-1 ring-primary/15"
                          : "border-defaultborder bg-[rgb(var(--default-background))]/60 hover:border-primary/25 hover:shadow-sm dark:bg-black/15"
                      }`}
                    >
                      <input
                        type="radio"
                        name="after-create-ai"
                        className="mt-1.5 shrink-0"
                        checked={afterCreateAiMode === "assign"}
                        onChange={() => setAfterCreateAiMode("assign")}
                      />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 font-semibold text-defaulttextcolor">
                          <i className="ri-user-search-line text-indigo-500/90" aria-hidden />
                          AI candidate assignment
                        </span>
                        <span className="mt-1 block text-[0.8125rem] leading-snug text-[#8c9097] dark:text-white/50">
                          Match candidates to tasks — best when the project already has tasks.
                        </span>
                      </span>
                    </label>
                  </div>

                  {afterCreateAiMode === "tasks" ? (
                    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-dashed border-primary/25 bg-primary/[0.03] p-3 text-[0.8125rem] motion-safe:animate-pm-panel-in motion-reduce:animate-none dark:border-primary/30 dark:bg-primary/[0.06]">
                      <input
                        type="checkbox"
                        className="mt-0.5 shrink-0"
                        checked={afterTasksOpenAssignment}
                        onChange={(e) => setAfterTasksOpenAssignment(e.target.checked)}
                      />
                      <span className="text-[#8c9097] dark:text-white/55">
                        After tasks are created, open <strong className="text-defaulttextcolor">candidate assignment</strong> review automatically.
                      </span>
                    </label>
                  ) : null}
                </section>
              ) : null}

              {errors.submit && (
                <div className="text-danger mt-2">{errors.submit}</div>
              )}
            </div>
            <div className="box-footer flex flex-wrap items-center justify-end gap-2 border-t border-gray-200/80 pt-4 dark:border-white/10">
              <button
                type="button"
                className="ti-btn ti-btn-primary btn-wave ms-auto inline-flex min-w-[10.5rem] items-center justify-center gap-2 transition-transform duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
                onClick={handleSubmit}
                disabled={submitting}
                aria-busy={submitting}
              >
                {submitting ? (
                  <>
                    <span
                      className="inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none"
                      aria-hidden
                    />
                    Creating…
                  </>
                ) : (
                  "Create Project"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {aiTaskProjectId ? (
        <AiTaskBreakdownModal
          open={aiTaskModalOpen}
          projectId={aiTaskProjectId}
          projectName={aiTaskProjectName}
          onClose={() => {
            setAiTaskModalOpen(false);
            setAiTaskProjectId("");
            setAiTaskProjectName("");
            setRunAssignmentAfterTasks(false);
            if (!skipNavigateOnModalCloseRef.current) {
              router.push("/apps/projects/project-list/");
            }
            skipNavigateOnModalCloseRef.current = false;
          }}
          onApplied={async () => {
            skipNavigateOnModalCloseRef.current = true;
            if (!runAssignmentAfterTasks) {
              router.push("/apps/projects/project-list/");
              return;
            }
            await runAssignmentGenerationWithUi(aiTaskProjectId, router, {
              afterError: () => {
                void Swal.fire({
                  icon: "info",
                  title: "Tasks saved",
                  text: "Tasks were created. Starting candidate assignment failed — open the project and use “AI candidate assignment” when ready.",
                });
                router.push("/apps/projects/project-list/");
              },
            });
          }}
        />
      ) : null}
    </Fragment>
  );
};

export default Createproject;
