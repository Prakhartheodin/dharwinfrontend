"use client";

import React, { Fragment, useState, useCallback, useEffect } from "react";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import DynamicProjectForm, {
  type ProjectFormValues,
} from "@/shared/components/forms/DynamicProjectForm";
import {
  getProjectById,
  updateProject,
  type Project,
  type UpdateProjectPayload,
  type ProjectStatus,
  type ProjectPriority,
} from "@/shared/lib/api/projects";
import { createTeamGroup, listTeamGroups } from "@/shared/lib/api/projectTeams";
import { listUsers } from "@/shared/lib/api/users";
import { PROJECT_STATUS_OPTIONS, PROJECT_PRIORITY_OPTIONS } from "@/shared/data/apps/projects/projectFormConfig";
import type { SelectOption } from "@/shared/data/apps/projects/projectFormConfig";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";
import { isPmAssistantUiEnabled } from "@/shared/lib/pm/featureFlags";
import { runAssignmentGenerationWithUi } from "@/shared/lib/pm/runAssignmentGenerationWithUi";
import { composeProjectDescriptionPlainFromParts } from "@/shared/lib/apps/composeProjectDescriptionPlain";

/** Strip HTML tags to plain text */
function stripHtmlToText(html: string): string {
  if (!html || typeof html !== "string") return "";
  const div = typeof document !== "undefined" ? document.createElement("div") : null;
  if (div) {
    div.innerHTML = html;
    return (div.textContent ?? div.innerText ?? "").trim();
  }
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function projectToFormValues(project: Project): ProjectFormValues {
  const statusOption =
    PROJECT_STATUS_OPTIONS.find((o) => o.value === project.status) ??
    PROJECT_STATUS_OPTIONS[0];
  const priorityOption =
    PROJECT_PRIORITY_OPTIONS.find((o) => o.value === project.priority) ??
    PROJECT_PRIORITY_OPTIONS[0];
  const assignedTeams: SelectOption[] = (project.assignedTeams ?? []).map((t) => {
    const teamId = (t as { _id?: string; id?: string })._id ?? (t as { id?: string }).id ?? t._id;
    return { value: teamId, label: t.name ?? teamId };
  });
  const assignedUsers: SelectOption[] = (project.assignedTo ?? []).map((u) => {
    const uid = (u as { _id?: string; id?: string })._id ?? (u as { id?: string }).id ?? "";
    const label = [u.name, u.email].filter(Boolean).join(" — ") || uid;
    return { value: uid, label };
  });
  const tags: SelectOption[] = (project.tags ?? []).map((t) => ({
    value: t,
    label: t,
  }));

  return {
    name: project.name,
    projectManager: project.projectManager ?? "",
    clientStakeholder: project.clientStakeholder ?? "",
    description: project.description ?? "",
    intakeSuccess: "",
    intakeConstraints: "",
    intakeMilestones: "",
    startDate: project.startDate ? new Date(project.startDate) : null,
    endDate: project.endDate ? new Date(project.endDate) : null,
    status: statusOption,
    priority: priorityOption,
    assignedTeams,
    assignedUsers,
    tags,
  };
}

export interface EditProjectClientProps {
  projectId: string;
}

export function EditProjectClient({ projectId }: EditProjectClientProps) {
  const router = useRouter();

  const [values, setValues] = useState<ProjectFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [assignedToOptions, setAssignedToOptions] = useState<SelectOption[]>([]);
  const [assignedUserOptions, setAssignedUserOptions] = useState<SelectOption[]>([]);
  const [assignmentStarting, setAssignmentStarting] = useState(false);

  useEffect(() => {
    listTeamGroups({ limit: 200 })
      .then((res) => {
        const options: SelectOption[] = (res.results ?? []).map((t) => {
          const teamId = (t as { id?: string }).id ?? t._id;
          return { value: teamId, label: t.name || teamId };
        });
        setAssignedToOptions(options);
      })
      .catch(() => setAssignedToOptions([]));
    listUsers({ limit: 200, status: "active" })
      .then((res) => {
        setAssignedUserOptions(
          (res.results ?? []).map((u) => ({
            value: String(u.id ?? "").trim(),
            label: [u.name, u.email].filter(Boolean).join(" — ") || u.id,
          }))
        );
      })
      .catch(() => setAssignedUserOptions([]));
  }, []);

  useEffect(() => {
    if (!projectId) return;
    getProjectById(projectId)
      .then((project) => setValues(projectToFormValues(project)))
      .catch(() => {
        setErrors({ submit: "Project not found" });
        setValues(null);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleChange = useCallback((name: string, value: unknown) => {
    setValues((prev) => (prev ? { ...prev, [name]: value } : null));
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

  const buildPayload = (): UpdateProjectPayload => {
    if (!values) return {};
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
      .filter((id) => id !== "undefined" && /^[0-9a-fA-F]{24}$/.test(id));
    const selectedUsers = (values.assignedUsers as SelectOption[]) ?? [];
    const assignedUserIds: string[] = selectedUsers
      .map((o) => (o?.value != null ? String(o.value) : ""))
      .filter((id) => id !== "undefined" && /^[0-9a-fA-F]{24}$/.test(id));
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

    const payload: UpdateProjectPayload = {
      name: String(values.name ?? "").trim(),
      projectManager: String(values.projectManager ?? "").trim() || undefined,
      clientStakeholder: String(values.clientStakeholder ?? "").trim() || undefined,
      description: descriptionPlain,
      status: (statusVal as ProjectStatus) ?? undefined,
      priority: (priorityVal as ProjectPriority) ?? undefined,
      assignedTeams: assignedTeamIds,
      assignedTo: assignedUserIds,
      tags,
    };
    if (values.startDate) {
      payload.startDate =
        values.startDate instanceof Date
          ? values.startDate.toISOString()
          : new Date(values.startDate as string).toISOString();
    }
    if (values.endDate) {
      payload.endDate =
        values.endDate instanceof Date
          ? values.endDate.toISOString()
          : new Date(values.endDate as string).toISOString();
    }
    return payload;
  };

  const handleSubmit = async () => {
    if (!projectId || !values) return;
    if (!String(values.name ?? "").trim()) {
      setErrors({ name: "Project name is required" });
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      await updateProject(projectId, buildPayload());
      await Swal.fire({
        icon: "success",
        title: "Project updated",
        text: "The project has been updated successfully.",
      });
      router.push("/apps/projects/project-list/");
    } catch (err: unknown) {
      const message =
        (err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined) ?? "Failed to update project.";
      setErrors({ submit: message });
      Swal.fire({ icon: "error", title: "Error", text: message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartAssignmentRun = async () => {
    if (!projectId) return;
    setAssignmentStarting(true);
    try {
      await runAssignmentGenerationWithUi(projectId, router);
    } finally {
      setAssignmentStarting(false);
    }
  };

  if (loading) {
    return (
      <Fragment>
        <Seo title="Edit Project" />
        <Pageheader currentpage="Edit Project" activepage="Projects" mainpage="Edit Project" />
        <div className="box custom-box">
          <div className="box-body p-6 text-center text-[#8c9097]">Loading project...</div>
        </div>
      </Fragment>
    );
  }

  if (!values) {
    return (
      <Fragment>
        <Seo title="Edit Project" />
        <Pageheader currentpage="Edit Project" activepage="Projects" mainpage="Edit Project" />
        <div className="box custom-box">
          <div className="box-body p-6 text-center text-danger">
            Project not found. <Link href="/apps/projects/project-list/">Back to list</Link>
          </div>
        </div>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Seo title="Edit Project" />
      <Pageheader
        currentpage="Edit Project"
        activepage="Projects"
        mainpage="Edit Project"
      />
      <div className="grid grid-cols-12 gap-6">
        <div className="xl:col-span-12 col-span-12">
          <div className="box custom-box">
            <div className="box-header">
              <div className="box-title">Edit Project</div>
            </div>
            <div className="box-body">
              <DynamicProjectForm
                values={values}
                onChange={handleChange}
                errors={errors}
                assignedToOptions={assignedToOptions}
                assignedUserOptions={assignedUserOptions}
                onCreateTeamGroup={handleCreateTeamGroup}
                briefAiEnhanceEnabled={isPmAssistantUiEnabled()}
              />
              {errors.submit && (
                <div className="text-danger mt-2">{errors.submit}</div>
              )}
            </div>
            <div className="box-footer">
              <Link
                href="/apps/projects/project-list/"
                className="ti-btn ti-btn-light btn-wave me-2"
              >
                Cancel
              </Link>
              {isPmAssistantUiEnabled() && (
                <button
                  type="button"
                  className="ti-btn ti-btn-success btn-wave me-2"
                  onClick={() => void handleStartAssignmentRun()}
                  disabled={submitting || assignmentStarting}
                >
                  {assignmentStarting ? "Generating…" : "AI employee assignment"}
                </button>
              )}
              <button
                type="button"
                className="ti-btn ti-btn-primary btn-wave"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Save Project"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}
