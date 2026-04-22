"use client";

import React, { Fragment, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import dynamic from "next/dynamic";
import Link from "next/link";
import Swal from "sweetalert2";
import { usePmRefetchOnFocus, emitPmDataMutated } from "@/shared/hooks/usePmRefetchOnFocus";
import { isPmAssistantUiEnabled } from "@/shared/lib/pm/featureFlags";
import { AiTaskBreakdownModal } from "@/shared/components/pm/AiTaskBreakdownModal";
import { runAssignmentGenerationWithUi } from "@/shared/lib/pm/runAssignmentGenerationWithUi";
import {
  listProjects,
  deleteProject,
  getProjectById,
  getProjectProgress,
  type Project,
  type ProjectsListParams,
} from "@/shared/lib/api/projects";
import { listTeamMembers, type TeamMember } from "@/shared/lib/api/teams";
import { useAuth } from "@/shared/contexts/auth-context";
import { sanitizeRichHtml } from "@/shared/lib/sanitize-html";

const Select = dynamic(() => import("react-select"), { ssr: false });

const SORT_OPTIONS = [
  { value: "createdAt:desc", label: "Newest" },
  { value: "createdAt:asc", label: "Oldest" },
  { value: "name:asc", label: "A - Z" },
  { value: "name:desc", label: "Z - A" },
  { value: "endDate:asc", label: "Due date (earliest)" },
  { value: "endDate:desc", label: "Due date (latest)" },
];

const PAGE_SIZE = 12;

/** Keeps react-select menu aligned (portaled + fixed) — avoids clipped/mispositioned menus under overflow/transform ancestors. */
const SORT_SELECT_STYLES = {
  menuPortal: (base: React.CSSProperties) => ({ ...base, zIndex: 200 }),
};

/** Not `hs-dropdown` — global Preline autoInit() binds to that and can swallow menu clicks. */
const PROJECT_CARD_DROPDOWN_MENU_CLASS = "project-card-dropdown-panel";

function priorityBadgeClass(priority: string): string {
  switch (priority) {
    case "High":
      return "bg-danger/10 text-danger";
    case "Medium":
      return "bg-info/10 text-info";
    case "Low":
      return "bg-success/10 text-success";
    default:
      return "bg-secondary/10 text-secondary";
  }
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function stripHtml(html: string): string {
  if (!html) return "";
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.slice(0, 80);
}

const SKELETON_PLACEHOLDERS = 8;

function ProjectCardSkeleton() {
  return (
    <div className="xxl:col-span-3 xl:col-span-4 md:col-span-6 col-span-12">
      <div className="box custom-box flex h-full flex-col overflow-hidden rounded-xl border border-defaultborder/70 shadow-sm dark:border-white/10">
        <div className="flex flex-1 flex-col gap-4 border-b border-defaultborder/60 p-5 dark:border-white/10">
          <div className="flex items-start gap-3">
            <div
              className="h-11 w-11 shrink-0 rounded-xl bg-defaultborder/55 motion-safe:animate-pulse motion-reduce:animate-none"
              aria-hidden
            />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 max-w-[12rem] rounded-md bg-defaultborder/55 motion-safe:animate-pulse motion-reduce:animate-none" />
              <div className="h-3 w-28 rounded-md bg-defaultborder/45 motion-safe:animate-pulse motion-reduce:animate-none" />
            </div>
            <div className="h-8 w-8 shrink-0 rounded-lg bg-defaultborder/45 motion-safe:animate-pulse motion-reduce:animate-none" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full rounded-md bg-defaultborder/40 motion-safe:animate-pulse motion-reduce:animate-none" />
            <div className="h-3 w-[88%] rounded-md bg-defaultborder/35 motion-safe:animate-pulse motion-reduce:animate-none" />
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-defaultborder/40 dark:bg-white/10">
            <div className="h-full w-[35%] rounded-full bg-primary/25 motion-safe:animate-pulse motion-reduce:animate-none" />
          </div>
        </div>
        <div className="flex justify-between px-5 py-4">
          <div className="h-3 w-24 rounded-md bg-defaultborder/45 motion-safe:animate-pulse motion-reduce:animate-none" />
          <div className="h-3 w-24 rounded-md bg-defaultborder/45 motion-safe:animate-pulse motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}

function getProjectId(project: Project): string {
  return (project as Project & { id?: string })._id ?? (project as Project & { id?: string }).id ?? "";
}

interface ProjectDetailModalProps {
  open: boolean;
  projectData: Project | null;
  loading: boolean;
  error: string | null;
  /** Members per team id (from listTeamMembers by teamId) */
  membersByTeamId?: Record<string, TeamMember[]>;
  onClose: () => void;
}

function getTeamIdFromTeamRef(t: { _id?: string; id?: string }): string {
  return (t as { id?: string }).id ?? t._id ?? "";
}

function ProjectDetailModal({
  open,
  projectData,
  loading,
  error,
  membersByTeamId = {},
  onClose,
}: ProjectDetailModalProps) {
  if (!open) return null;

  const progress = projectData ? getProjectProgress(projectData) : 0;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px] motion-safe:transition-opacity motion-reduce:backdrop-blur-none"
      onClick={onClose}
    >
      <div
        className="bg-bodybg border border-defaultborder/80 flex max-h-[92vh] w-[96vw] max-w-4xl flex-col overflow-hidden rounded-2xl shadow-2xl motion-safe:animate-pm-panel-in motion-reduce:animate-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-defaultborder/60 bg-gradient-to-r from-slate-50/90 to-white px-5 py-4 dark:border-white/10 dark:from-white/[0.04] dark:to-transparent">
          <h5 className="font-semibold mb-0 text-[1rem]">Project Details</h5>
          <button
            type="button"
            className="ti-btn ti-btn-light !py-1 !px-2"
            onClick={onClose}
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 min-h-0">
          {loading ? (
            <div className="text-center py-10 text-muted dark:text-white/50">
              Loading project details...
            </div>
          ) : error ? (
            <div className="text-center py-10 text-danger">{error}</div>
          ) : !projectData ? (
            <div className="text-center py-10 text-muted dark:text-white/50">
              Project not found.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="box custom-box">
                <div className="box-header">
                  <div className="box-title">{projectData.name}</div>
                  <span
                    className={`badge ${priorityBadgeClass(projectData.priority)}`}
                  >
                    {projectData.priority}
                  </span>
                </div>
                <div className="box-body">
                  <div className="grid grid-cols-12 gap-3 text-[0.8125rem]">
                    <div className="xl:col-span-6 col-span-12">
                      <span className="text-muted dark:text-white/50">Project Manager: </span>
                      <span className="text-defaulttextcolor">
                        {projectData.projectManager || "—"}
                      </span>
                    </div>
                    <div className="xl:col-span-6 col-span-12">
                      <span className="text-muted dark:text-white/50">Client / Stakeholder: </span>
                      <span className="text-defaulttextcolor">
                        {projectData.clientStakeholder || "—"}
                      </span>
                    </div>
                    <div className="xl:col-span-6 col-span-12">
                      <span className="text-muted dark:text-white/50">Status: </span>
                      <span className="text-defaulttextcolor">{projectData.status}</span>
                    </div>
                    <div className="xl:col-span-6 col-span-12">
                      <span className="text-muted dark:text-white/50">Progress: </span>
                      <span className="text-defaulttextcolor">
                        {projectData.completedTasks ?? 0}/{projectData.totalTasks ?? 0} tasks ({progress}%)
                      </span>
                    </div>
                    <div className="xl:col-span-6 col-span-12">
                      <span className="text-muted dark:text-white/50">Start Date: </span>
                      <span className="text-defaulttextcolor">
                        {formatDate(projectData.startDate)}
                      </span>
                    </div>
                    <div className="xl:col-span-6 col-span-12">
                      <span className="text-muted dark:text-white/50">Due Date: </span>
                      <span className="text-defaulttextcolor">
                        {formatDate(projectData.endDate)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {projectData.description ? (
                <div className="box custom-box">
                  <div className="box-header">
                    <div className="box-title">Description</div>
                  </div>
                  <div
                    className="box-body prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(projectData.description) }}
                  />
                </div>
              ) : null}

              <div className="box custom-box">
                <div className="box-header">
                  <div className="box-title">Teams &amp; Members</div>
                </div>
                <div className="box-body space-y-4">
                  {(projectData.assignedTeams ?? []).length === 0 ? (
                    <div className="text-muted dark:text-white/50 text-[0.8125rem]">
                      No team assigned.
                    </div>
                  ) : (
                    (projectData.assignedTeams ?? []).map((t) => {
                      const teamId = getTeamIdFromTeamRef(t);
                      const teamName = t.name ?? (teamId || "—");
                      const members = membersByTeamId[teamId] ?? [];
                      return (
                        <div key={teamId} className="border border-defaultborder rounded-lg p-3">
                          <div className="font-semibold text-[0.875rem] text-primary mb-2">
                            {teamName}
                          </div>
                          {members.length === 0 ? (
                            <div className="text-muted dark:text-white/50 text-[0.8125rem]">
                              No members in this team.
                            </div>
                          ) : (
                            <ul className="list-none mb-0 space-y-1.5">
                              {members.map((m) => (
                                <li
                                  key={(m as TeamMember & { id?: string }).id ?? m._id}
                                  className="flex items-center gap-2 text-[0.8125rem]"
                                >
                                  <span className="avatar avatar-xs avatar-rounded bg-primary/10 text-primary shrink-0">
                                    {(m.name ?? m.email ?? "?").slice(0, 1).toUpperCase()}
                                  </span>
                                  <div className="min-w-0">
                                    <span className="font-medium text-defaulttextcolor">
                                      {m.name || "—"}
                                    </span>
                                    {m.email ? (
                                      <span className="text-muted dark:text-white/50 ms-1">
                                        ({m.email})
                                      </span>
                                    ) : null}
                                    {m.position ? (
                                      <span className="block text-[0.75rem] text-muted dark:text-white/50">
                                        {m.position}
                                      </span>
                                    ) : null}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {(projectData.tags ?? []).length > 0 ? (
                <div className="box custom-box">
                  <div className="box-header">
                    <div className="box-title">Tags</div>
                  </div>
                  <div className="box-body flex flex-wrap gap-1">
                    {(projectData.tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex px-2 py-0.5 rounded text-[0.75rem] bg-defaultborder text-defaulttextcolor"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-defaultborder">
          {projectData?._id ? (
            <Link
              href={`/apps/projects/edit/${projectData._id}`}
              className="ti-btn ti-btn-primary !mb-0"
            >
              <i className="ri-edit-line me-1" /> Edit Project
            </Link>
          ) : null}
          <button
            type="button"
            className="ti-btn ti-btn-light !mb-0"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface ProjectCardProps {
  project: Project;
  onDelete: (id: string) => void;
  onView: (projectId: string) => void;
  onAiTaskBreakdown?: (project: Project) => void;
  onAiCandidateAssignment?: (project: Project) => void;
  /** Staggered list entrance (transform/opacity only — see `animate-pm-panel-in`). */
  staggerIndex?: number;
}

function ProjectCard({
  project,
  onDelete,
  onView,
  onAiTaskBreakdown,
  onAiCandidateAssignment,
  staggerIndex = 0,
}: ProjectCardProps) {
  const projectId = getProjectId(project);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const progress = getProjectProgress(project);
  const descriptionSnippet = stripHtml(project.description ?? "");
  const assignedTeams = project.assignedTeams ?? [];
  const displayCount = 3;
  const extraCount = assignedTeams.length > displayCount ? assignedTeams.length - displayCount : 0;

  const handleDelete = () => {
    Swal.fire({
      title: "Delete project?",
      text: `"${project.name}" will be permanently deleted.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Yes, delete",
    }).then((result) => {
      if (result.isConfirmed) {
        onDelete(projectId);
      }
    });
  };

  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dropdownRef.current) return;
    const menu = dropdownRef.current.querySelector(
      `.${PROJECT_CARD_DROPDOWN_MENU_CLASS}`
    ) as HTMLElement;
    const button = dropdownRef.current.querySelector("button") as HTMLElement;
    if (!menu || !button) return;

    const isHidden = menu.classList.contains("hidden");

    // Close all other dropdowns
    document.querySelectorAll(`.${PROJECT_CARD_DROPDOWN_MENU_CLASS}`).forEach((otherMenu) => {
      if (otherMenu !== menu) {
        const otherMenuEl = otherMenu as HTMLElement;
        otherMenuEl.classList.add("hidden");
        otherMenuEl.style.cssText =
          "opacity: 0 !important; pointer-events: none !important; display: none !important;";
        const otherButton = otherMenuEl
          .closest("[data-project-card-dropdown]")
          ?.querySelector("button");
        if (otherButton) {
          otherButton.setAttribute("aria-expanded", "false");
        }
      }
    });

    // Toggle current dropdown
    if (isHidden) {
      menu.classList.remove("hidden");
      menu.style.cssText =
        "opacity: 1 !important; pointer-events: auto !important; display: block !important;";
      button.setAttribute("aria-expanded", "true");
    } else {
      menu.classList.add("hidden");
      menu.style.cssText =
        "opacity: 0 !important; pointer-events: none !important; display: none !important;";
      button.setAttribute("aria-expanded", "false");
    }
  };

  const handleView = () => {
    closeDropdown();
    onView(projectId);
  };

  const closeDropdown = () => {
    if (!dropdownRef.current) return;
    const menu = dropdownRef.current.querySelector(
      `.${PROJECT_CARD_DROPDOWN_MENU_CLASS}`
    ) as HTMLElement;
    const button = dropdownRef.current.querySelector("button") as HTMLElement;
    if (menu) {
      menu.classList.add("hidden");
      menu.style.cssText =
        "opacity: 0 !important; pointer-events: none !important; display: none !important;";
    }
    if (button) {
      button.setAttribute("aria-expanded", "false");
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        const menu = dropdownRef.current.querySelector(
          `.${PROJECT_CARD_DROPDOWN_MENU_CLASS}`
        ) as HTMLElement;
        const button = dropdownRef.current.querySelector("button") as HTMLElement;
        if (menu) {
          menu.classList.add("hidden");
          menu.style.cssText =
            "opacity: 0 !important; pointer-events: none !important; display: none !important;";
          if (button) {
            button.setAttribute("aria-expanded", "false");
          }
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      className="xxl:col-span-3 xl:col-span-4 md:col-span-6 col-span-12 motion-safe:animate-pm-panel-in motion-reduce:animate-none"
      style={{ animationDelay: `${Math.min(staggerIndex, 24) * 48}ms` }}
    >
      <div className="box custom-box group flex h-full flex-col overflow-visible rounded-xl border border-defaultborder/70 shadow-sm transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-md hover:border-primary/20 dark:border-white/10 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-2 gap-y-1 border-b border-defaultborder/50 bg-[rgb(var(--default-background))]/35 px-[1.25rem] py-4 font-medium dark:border-white/10 dark:bg-white/[0.02]">
          <div className="shrink-0 pt-0.5">
            <span className="avatar avatar-rounded flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 p-0 ring-1 ring-primary/10">
              <i className="ri-folder-line text-xl text-primary" />
            </span>
          </div>
          <div className="min-w-0">
            <Link
              href={projectId ? `/apps/projects/edit/${projectId}` : "#"}
              title={project.name}
              className="project-list-title block break-words text-[0.875rem] font-semibold leading-snug text-defaulttextcolor transition-colors duration-200 hover:text-primary line-clamp-3"
            >
              {project.name}
            </Link>
            <span className="mt-0.5 block text-[0.75rem] text-muted dark:text-white/50">
              Total{" "}
              <strong className="text-defaulttextcolor">
                {project.completedTasks ?? 0}/{project.totalTasks ?? 0}
              </strong>{" "}
              tasks completed
            </span>
          </div>
          <div
            className="ti-dropdown relative w-auto shrink-0 justify-self-end pt-0.5"
            ref={dropdownRef}
            data-project-card-dropdown
          >
            <button
              type="button"
              id={`dropdown-menu-${projectId || "project"}`}
              className="ti-btn ti-btn-sm ti-btn-light !mb-0 rounded-lg transition-colors hover:border-primary/25 hover:text-primary"
              aria-expanded="false"
              onClick={toggleDropdown}
            >
              <i className="fe fe-more-vertical" />
            </button>
            <ul
              className={`ti-dropdown-menu absolute right-0 top-full z-50 mt-1 hidden min-w-[180px] rounded-xl border border-defaultborder/80 bg-bodybg shadow-lg motion-safe:transition-[opacity,transform] motion-safe:duration-200 ${PROJECT_CARD_DROPDOWN_MENU_CLASS}`}
              aria-labelledby={`dropdown-menu-${projectId || "project"}`}
            >
              {onAiTaskBreakdown ? (
                <li>
                  <button
                    type="button"
                    className="ti-dropdown-item w-full text-left"
                    onClick={() => {
                      closeDropdown();
                      onAiTaskBreakdown(project);
                    }}
                  >
                    <i className="ri-sparkling-line align-middle me-1 inline-flex" /> AI task breakdown
                  </button>
                </li>
              ) : null}
              {onAiCandidateAssignment ? (
                <li>
                  <button
                    type="button"
                    className="ti-dropdown-item w-full text-left"
                    onClick={() => {
                      closeDropdown();
                      onAiCandidateAssignment(project);
                    }}
                  >
                    <i className="ri-user-shared-line align-middle me-1 inline-flex" /> AI employee assignment
                  </button>
                </li>
              ) : null}
              <li>
                <button
                  type="button"
                  className="ti-dropdown-item w-full text-left"
                  onClick={handleView}
                >
                  <i className="ri-eye-line align-middle me-1 inline-flex" /> View
                </button>
              </li>
              <li>
                <Link
                  className="ti-dropdown-item w-full text-left"
                  href={projectId ? `/apps/projects/edit/${projectId}` : "#"}
                  onClick={closeDropdown}
                >
                  <i className="ri-edit-line align-middle me-1 inline-flex" /> Edit
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  className="ti-dropdown-item w-full text-left text-danger"
                  onClick={handleDelete}
                >
                  <i className="ri-delete-bin-line me-1 align-middle inline-flex" /> Delete
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div className="box-body flex flex-1 flex-col">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1 text-[0.6875rem] font-medium uppercase tracking-wide text-defaulttextcolor/60 dark:text-white/50">
                Team
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {assignedTeams.length === 0 ? (
                  <span className="text-[0.75rem] text-muted dark:text-white/50">No team assigned</span>
                ) : (
                  <>
                    {assignedTeams.slice(0, displayCount).map((t) => {
                      const teamId = (t as { id?: string }).id ?? t._id;
                      const teamName = t.name ?? teamId ?? "—";
                      return (
                        <span
                          key={teamId}
                          className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[0.75rem]"
                          title={teamName}
                        >
                          {teamName}
                        </span>
                      );
                    })}
                    {extraCount > 0 && (
                      <span className="avatar avatar-sm bg-primary avatar-rounded text-white">
                        +{extraCount}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="shrink-0 text-end">
              <div className="mb-1 text-[0.6875rem] font-medium uppercase tracking-wide text-defaulttextcolor/60 dark:text-white/50">
                Priority
              </div>
              <span
                className={`badge ${priorityBadgeClass(project.priority)}`}
              >
                {project.priority}
              </span>
            </div>
          </div>
          <div className="mb-1 text-[0.6875rem] font-medium uppercase tracking-wide text-defaulttextcolor/60 dark:text-white/50">
            Description
          </div>
          <p className="mb-3 line-clamp-2 text-[0.8125rem] text-muted dark:text-white/50">
            {descriptionSnippet || "No description."}
          </p>
          <div className="mt-auto">
            <div className="mb-1 text-[0.6875rem] font-medium uppercase tracking-wide text-defaulttextcolor/60 dark:text-white/50">
              Status
            </div>
            <div>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-defaultborder/50 dark:bg-white/10"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary/85 motion-safe:transition-[width] motion-safe:duration-500 motion-safe:ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-1.5 text-[0.8125rem]">
                <span className="font-semibold text-primary">{progress}%</span>{" "}
                <span className="text-muted dark:text-white/50">completed</span>
              </div>
            </div>
          </div>
        </div>
        <div className="box-footer mt-auto flex items-center justify-between border-t border-defaultborder/60 bg-[rgb(var(--default-background))]/25 dark:border-white/10 dark:bg-white/[0.02]">
          <div>
            <span className="mb-0.5 block text-[0.6875rem] text-muted dark:text-white/50">
              Assigned
            </span>
            <span className="block text-[0.8125rem] font-semibold text-defaulttextcolor">
              {formatDate(project.startDate)}
            </span>
          </div>
          <div className="text-end">
            <span className="mb-0.5 block text-[0.6875rem] text-muted dark:text-white/50">
              Due
            </span>
            <span className="block text-[0.8125rem] font-semibold text-defaulttextcolor">
              {formatDate(project.endDate)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const Projectlist = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { roleNames, isAdministrator, permissionsLoaded } = useAuth();
  const isCandidateSpecialistListViewer =
    permissionsLoaded &&
    !isAdministrator &&
    roleNames.some((n) => n.toLowerCase() === "candidate");
  const mineOnly =
    searchParams.get("mine") === "1" ||
    searchParams.get("mine") === "true" ||
    searchParams.get("mine") === "yes";
  const showPmAi = isPmAssistantUiEnabled();

  const urlSearchKey = searchParams.get("search") ?? "";

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(() => urlSearchKey.trim());
  const [searchQuery, setSearchQuery] = useState(() => urlSearchKey.trim());
  const [sortBy, setSortBy] = useState("createdAt:desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedProjectDetail, setSelectedProjectDetail] = useState<Project | null>(null);
  const [membersByTeamId, setMembersByTeamId] = useState<Record<string, TeamMember[]>>({});
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiProject, setAiProject] = useState<Project | null>(null);
  const [sortMenuPortalEl, setSortMenuPortalEl] = useState<HTMLElement | null>(null);
  const lastSyncedUrlSearchRef = useRef<string | null>(null);

  useEffect(() => {
    setSortMenuPortalEl(document.body);
  }, []);

  /** When `?search=` changes from navigation (back/forward, link), refetch; skip first paint (state already seeded). */
  useEffect(() => {
    if (lastSyncedUrlSearchRef.current === null) {
      lastSyncedUrlSearchRef.current = urlSearchKey;
      return;
    }
    if (urlSearchKey !== lastSyncedUrlSearchRef.current) {
      lastSyncedUrlSearchRef.current = urlSearchKey;
      const q = urlSearchKey.trim();
      setSearchInput(q);
      setSearchQuery(q);
      setPage(1);
    }
  }, [urlSearchKey]);

  const handleAiCandidateAssignment = useCallback(
    async (p: Project) => {
      const id = getProjectId(p);
      if (!id) {
        await Swal.fire({
          icon: "warning",
          title: "AI employee assignment",
          text: "Could not read this project’s id from the list. Refresh the page or open the project from Edit and try again.",
        });
        return;
      }
      await runAssignmentGenerationWithUi(id, router);
    },
    [router]
  );

  const fetchProjects = useCallback(
    async (params?: Partial<ProjectsListParams>) => {
      setLoading(true);
      try {
        const result = await listProjects({
          ...params,
          search: searchQuery.trim() || undefined,
          sortBy: sortBy || undefined,
          page: params?.page ?? page,
          limit: PAGE_SIZE,
          ...(mineOnly ? { mine: true } : {}),
        });
        setProjects(result.results ?? []);
        setTotalPages(result.totalPages ?? 0);
        setTotalResults(result.totalResults ?? 0);
        if (params?.page !== undefined) setPage(params.page);
      } catch {
        setProjects([]);
        setTotalPages(0);
        setTotalResults(0);
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, sortBy, page, mineOnly]
  );

  useEffect(() => {
    fetchProjects({ page });
  }, [fetchProjects, page]);

  usePmRefetchOnFocus(
    useCallback(() => {
      fetchProjects({ page });
    }, [fetchProjects, page])
  );

  const handleSearch = () => {
    const term = searchInput.trim();
    setSearchQuery(term);
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    if (term) params.set("search", term);
    else params.delete("search");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    lastSyncedUrlSearchRef.current = term ? term : "";
  };

  const handleSortChange = (opt: { value: string; label: string } | null) => {
    if (opt) {
      setSortBy(opt.value);
      setPage(1);
    }
  };

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteProject(id);
        emitPmDataMutated();
        await Swal.fire("Deleted", "Project has been deleted.", "success");
        fetchProjects({ page });
      } catch {
        Swal.fire("Error", "Failed to delete project.", "error");
      }
    },
    [fetchProjects, page]
  );

  const handleView = useCallback(async (projectId: string) => {
    setDetailModalOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setSelectedProjectDetail(null);
    setMembersByTeamId({});
    try {
      const projectData = await getProjectById(projectId);
      setSelectedProjectDetail(projectData);
      const teams = projectData.assignedTeams ?? [];
      if (teams.length > 0) {
        const teamIds = teams.map((t) => (t as { id?: string }).id ?? t._id).filter(Boolean);
        const results = await Promise.all(
          teamIds.map((tid) =>
            listTeamMembers({ teamId: tid, limit: 100 }).then((r) => ({ teamId: tid, members: r.results ?? [] }))
          )
        );
        const byTeam: Record<string, TeamMember[]> = {};
        results.forEach(({ teamId, members }) => {
          byTeam[teamId] = members;
        });
        setMembersByTeamId(byTeam);
      }
    } catch {
      setDetailError("Failed to load project details.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetailModal = useCallback(() => {
    setDetailModalOpen(false);
  }, []);

  useEffect(() => {
    if (!detailModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDetailModal();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [detailModalOpen, closeDetailModal]);

  const currentSortOption =
    SORT_OPTIONS.find((o) => o.value === sortBy) ?? SORT_OPTIONS[0];

  return (
    <Fragment>
      <Seo title={mineOnly ? "My projects" : "Project List"} />
      <div className="mt-5 grid grid-cols-12 gap-6 sm:mt-6">
        <div className="col-span-12 xl:col-span-12">
          <div className="box custom-box motion-safe:animate-pm-panel-in motion-reduce:animate-none rounded-xl border border-defaultborder/80 shadow-sm dark:border-white/10">
            <div className="border-b border-defaultborder/60 bg-gradient-to-r from-slate-50/90 via-white to-slate-50/40 px-4 py-4 sm:px-5 dark:border-white/10 dark:from-white/[0.04] dark:via-transparent dark:to-transparent">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="newproject flex flex-wrap items-center gap-2">
                  {!mineOnly ? (
                    <Link
                      href="/apps/projects/create-project/"
                      className="ti-btn ti-btn-primary-full !mb-0 shadow-sm transition-transform duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
                    >
                      <i className="ri-add-line me-1 align-middle font-semibold" />
                      New Project
                    </Link>
                  ) : null}
                  <div className="min-w-[10.5rem] rounded-xl border border-defaultborder/70 bg-white/90 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
                    <Select
                      name="sort"
                      options={SORT_OPTIONS}
                      className="w-full min-w-[10.5rem]"
                      classNamePrefix="Select2"
                      menuPlacement="auto"
                      menuPosition="fixed"
                      menuPortalTarget={sortMenuPortalEl}
                      styles={SORT_SELECT_STYLES}
                      placeholder="Sort By"
                      value={currentSortOption}
                      onChange={(opt) => handleSortChange(opt as { value: string; label: string } | null)}
                    />
                  </div>
                </div>
                <div
                  className="flex w-full flex-col gap-2 sm:flex-row sm:items-stretch lg:max-w-xl"
                  role="search"
                >
                  <div className="flex min-w-0 flex-1 items-stretch overflow-hidden rounded-xl border border-defaultborder/80 bg-white shadow-sm dark:border-white/15 dark:bg-black/20">
                    <span
                      className="flex items-center border-e border-defaultborder/60 bg-defaultbackground/40 px-3 text-muted dark:border-white/10 dark:bg-white/[0.03]"
                      aria-hidden
                    >
                      <i className="ri-search-line text-base" />
                    </span>
                    <input
                      className="form-control !rounded-none border-0 shadow-none focus:ring-0"
                      type="search"
                      placeholder="Search projects"
                      aria-label="Search projects"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                  </div>
                  <button
                    className="ti-btn ti-btn-primary !mb-0 shrink-0 sm:px-5"
                    type="button"
                    onClick={handleSearch}
                  >
                    Search
                  </button>
                </div>
              </div>
              {!loading && totalResults > 0 ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-defaultborder/40 pt-3 text-[0.75rem] text-muted dark:border-white/10 dark:text-white/55">
                  <span>
                    {totalPages > 1
                      ? `Page ${page} of ${totalPages} · `
                      : null}
                    {totalResults} project{totalResults === 1 ? "" : "s"}
                  </span>
                  {mineOnly ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[0.6875rem] font-medium text-primary ring-1 ring-primary/15">
                      <i className="ri-user-smile-line" aria-hidden />
                      My projects
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-12 gap-x-6 gap-y-6">
          {Array.from({ length: SKELETON_PLACEHOLDERS }, (_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-x-6 gap-y-6">
          {projects.map((project, index) => (
            <ProjectCard
              key={getProjectId(project)}
              staggerIndex={index}
              project={project}
              onDelete={handleDelete}
              onView={handleView}
              onAiTaskBreakdown={
                showPmAi
                  ? (p) => {
                      setAiProject(p);
                      setAiModalOpen(true);
                    }
                  : undefined
              }
              onAiCandidateAssignment={showPmAi ? handleAiCandidateAssignment : undefined}
            />
          ))}
        </div>
      )}

      {!loading && projects.length === 0 && (
        <div className="box custom-box overflow-hidden rounded-xl border border-dashed border-defaultborder/80 dark:border-white/15">
          <div className="box-body flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
              <i className="ri-folder-open-line text-2xl" aria-hidden />
            </span>
            <div>
              <p className="mb-1 text-[0.9375rem] font-semibold text-defaulttextcolor">No projects found</p>
              {isCandidateSpecialistListViewer && mineOnly ? (
                <p className="mb-0 max-w-lg text-[0.8125rem] text-muted dark:text-white/50">
                  This view lists projects you created and projects where you have at least one task assigned (any
                  type). Tasks must be linked to a project to appear here. Try another search, or open{" "}
                  <Link href="/task/my-tasks" className="text-primary underline-offset-2 hover:underline">
                    My Tasks
                  </Link>{" "}
                  to review assignments.
                </p>
              ) : isCandidateSpecialistListViewer ? (
                <p className="mb-0 max-w-lg text-[0.8125rem] text-muted dark:text-white/50">
                  On the main Projects list, projects you did not create only appear when you are assigned to a task
                  tagged for one of these workflows:{" "}
                  <strong className="text-defaulttextcolor">feature-engineer</strong>,{" "}
                  <strong className="text-defaulttextcolor">feasibility-reviewer</strong>, or{" "}
                  <strong className="text-defaulttextcolor">orchestrating-swarms</strong> (as a tag, required skill, or
                  task code). Use{" "}
                  <Link href="/apps/projects/my-projects" className="text-primary underline-offset-2 hover:underline">
                    My Projects
                  </Link>{" "}
                  for everything you are assigned to, or open{" "}
                  <Link href="/task/my-tasks" className="text-primary underline-offset-2 hover:underline">
                    My Tasks
                  </Link>
                  .
                </p>
              ) : mineOnly ? (
                <p className="mb-0 max-w-md text-[0.8125rem] text-muted dark:text-white/50">
                  Try another search, or open the full{" "}
                  <Link href="/apps/projects/project-list" className="text-primary underline-offset-2 hover:underline">
                    project list
                  </Link>{" "}
                  if you have access to create projects there.
                </p>
              ) : (
                <p className="mb-0 max-w-md text-[0.8125rem] text-muted dark:text-white/50">
                  Try another search or create a project with <strong className="text-defaulttextcolor">New Project</strong>.
                </p>
              )}
            </div>
            {isCandidateSpecialistListViewer && mineOnly ? (
              <Link href="/task/my-tasks" className="ti-btn ti-btn-primary-full !mb-0 mt-1">
                <i className="ri-task-line me-1 align-middle" aria-hidden />
                My Tasks
              </Link>
            ) : isCandidateSpecialistListViewer ? (
              <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                <Link href="/apps/projects/my-projects" className="ti-btn ti-btn-primary-full !mb-0">
                  <i className="ri-folder-user-line me-1 align-middle" aria-hidden />
                  My Projects
                </Link>
                <Link href="/task/my-tasks" className="ti-btn ti-btn-light !mb-0 border border-defaultborder/80">
                  <i className="ri-task-line me-1 align-middle" aria-hidden />
                  My Tasks
                </Link>
              </div>
            ) : mineOnly ? (
              <Link
                href="/apps/projects/project-list"
                className="ti-btn ti-btn-primary-full !mb-0 mt-1"
              >
                <i className="ri-folder-line me-1 align-middle" aria-hidden />
                All projects
              </Link>
            ) : (
              <Link
                href="/apps/projects/create-project/"
                className="ti-btn ti-btn-primary-full !mb-0 mt-1"
              >
                <i className="ri-add-line me-1 align-middle" />
                Create project
              </Link>
            )}
          </div>
        </div>
      )}

      <ProjectDetailModal
        open={detailModalOpen}
        projectData={selectedProjectDetail}
        loading={detailLoading}
        error={detailError}
        membersByTeamId={membersByTeamId}
        onClose={closeDetailModal}
      />

      {showPmAi && aiProject && (
        <AiTaskBreakdownModal
          open={aiModalOpen}
          projectId={getProjectId(aiProject)}
          projectName={aiProject.name}
          onClose={() => {
            setAiModalOpen(false);
            setAiProject(null);
          }}
          onApplied={() => fetchProjects({ page })}
        />
      )}

      {totalPages > 1 && (
        <nav aria-label="Page navigation" className="mt-4">
          <ul className="ti-pagination ltr:float-right rtl:float-left mb-4">
            <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
              <button
                type="button"
                className="page-link px-3 py-[0.375rem]"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </button>
            </li>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <li key={p} className={`page-item ${p === page ? "active" : ""}`}>
                <button
                  type="button"
                  className="page-link px-3 py-[0.375rem]"
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              </li>
            ))}
            <li className={`page-item ${page >= totalPages ? "disabled" : ""}`}>
              <button
                type="button"
                className="page-link px-3 py-[0.375rem]"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      )}
    </Fragment>
  );
};

export default Projectlist;
