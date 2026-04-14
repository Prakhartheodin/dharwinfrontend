"use client";

import React, { Fragment, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import dynamic from "next/dynamic";
import Link from "next/link";
import Swal from "sweetalert2";
import { usePmRefetchOnFocus } from "@/shared/hooks/usePmRefetchOnFocus";
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
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-bodybg border border-defaultborder rounded-lg shadow-xl w-[96vw] max-w-4xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-defaultborder">
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
            <div className="text-center py-10 text-[#8c9097] dark:text-white/50">
              Loading project details...
            </div>
          ) : error ? (
            <div className="text-center py-10 text-danger">{error}</div>
          ) : !projectData ? (
            <div className="text-center py-10 text-[#8c9097] dark:text-white/50">
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
                      <span className="text-[#8c9097] dark:text-white/50">Project Manager: </span>
                      <span className="text-defaulttextcolor">
                        {projectData.projectManager || "—"}
                      </span>
                    </div>
                    <div className="xl:col-span-6 col-span-12">
                      <span className="text-[#8c9097] dark:text-white/50">Client / Stakeholder: </span>
                      <span className="text-defaulttextcolor">
                        {projectData.clientStakeholder || "—"}
                      </span>
                    </div>
                    <div className="xl:col-span-6 col-span-12">
                      <span className="text-[#8c9097] dark:text-white/50">Status: </span>
                      <span className="text-defaulttextcolor">{projectData.status}</span>
                    </div>
                    <div className="xl:col-span-6 col-span-12">
                      <span className="text-[#8c9097] dark:text-white/50">Progress: </span>
                      <span className="text-defaulttextcolor">
                        {projectData.completedTasks ?? 0}/{projectData.totalTasks ?? 0} tasks ({progress}%)
                      </span>
                    </div>
                    <div className="xl:col-span-6 col-span-12">
                      <span className="text-[#8c9097] dark:text-white/50">Start Date: </span>
                      <span className="text-defaulttextcolor">
                        {formatDate(projectData.startDate)}
                      </span>
                    </div>
                    <div className="xl:col-span-6 col-span-12">
                      <span className="text-[#8c9097] dark:text-white/50">Due Date: </span>
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
                    dangerouslySetInnerHTML={{ __html: projectData.description }}
                  />
                </div>
              ) : null}

              <div className="box custom-box">
                <div className="box-header">
                  <div className="box-title">Teams &amp; Members</div>
                </div>
                <div className="box-body space-y-4">
                  {(projectData.assignedTeams ?? []).length === 0 ? (
                    <div className="text-[#8c9097] dark:text-white/50 text-[0.8125rem]">
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
                            <div className="text-[#8c9097] dark:text-white/50 text-[0.8125rem]">
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
                                      <span className="text-[#8c9097] dark:text-white/50 ms-1">
                                        ({m.email})
                                      </span>
                                    ) : null}
                                    {m.position ? (
                                      <span className="block text-[0.75rem] text-[#8c9097] dark:text-white/50">
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
}

function ProjectCard({
  project,
  onDelete,
  onView,
  onAiTaskBreakdown,
  onAiCandidateAssignment,
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
    <div className="xxl:col-span-3 xl:col-span-4 md:col-span-6 col-span-12">
      <div className="box custom-box">
        <div className="box-header items-center !justify-start flex-wrap !flex">
          <div className="me-2">
            <span className="avatar avatar-rounded p-1 bg-primary/10">
              <i className="ri-folder-line text-primary text-xl" />
            </span>
          </div>
          <div className="flex-grow min-w-0">
            <Link
              href={projectId ? `/apps/projects/edit/${projectId}` : "#"}
              className="font-semibold text-[.875rem] block text-truncate project-list-title"
            >
              {project.name}
            </Link>
            <span className="text-[#8c9097] dark:text-white/50 block text-[0.75rem]">
              Total{" "}
              <strong className="text-defaulttextcolor">
                {project.completedTasks ?? 0}/{project.totalTasks ?? 0}
              </strong>{" "}
              tasks completed
            </span>
          </div>
          <div className="ti-dropdown relative" ref={dropdownRef} data-project-card-dropdown>
            <button
              type="button"
              id={`dropdown-menu-${projectId || "project"}`}
              className="ti-btn ti-btn-sm ti-btn-light !mb-0"
              aria-expanded="false"
              onClick={toggleDropdown}
            >
              <i className="fe fe-more-vertical" />
            </button>
            <ul
              className={`ti-dropdown-menu hidden absolute right-0 top-full mt-1 z-50 min-w-[160px] bg-bodybg border border-defaultborder rounded-md shadow-lg ${PROJECT_CARD_DROPDOWN_MENU_CLASS}`}
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
                    <i className="ri-user-shared-line align-middle me-1 inline-flex" /> AI candidate assignment
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
        <div className="box-body">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-semibold mb-1">Team :</div>
              <div className="flex flex-wrap gap-1.5 items-center">
                {assignedTeams.length === 0 ? (
                  <span className="text-[#8c9097] text-[0.75rem]">No team assigned</span>
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
            <div className="text-end">
              <div className="font-semibold mb-1">Priority :</div>
              <span
                className={`badge ${priorityBadgeClass(project.priority)}`}
              >
                {project.priority}
              </span>
            </div>
          </div>
          <div className="font-semibold mb-1">Description :</div>
          <p className="text-[#8c9097] dark:text-white/50 mb-3">
            {descriptionSnippet || "No description."}
          </p>
          <div className="font-semibold mb-1">Status :</div>
          <div>
            <div className="progress progress-xs progress-animate" role="progressbar">
              <div
                className="progress-bar bg-primary"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1">
              <span className="text-primary font-semibold">{progress}%</span> Completed
            </div>
          </div>
        </div>
        <div className="box-footer flex items-center justify-between">
          <div>
            <span className="text-[#8c9097] dark:text-white/50 text-[0.6875rem] block">
              Assigned Date :
            </span>
            <span className="font-semibold block">
              {formatDate(project.startDate)}
            </span>
          </div>
          <div className="text-end">
            <span className="text-[#8c9097] dark:text-white/50 text-[0.6875rem] block">
              Due Date :
            </span>
            <span className="font-semibold block">
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
  const searchParams = useSearchParams();
  const mineOnly =
    searchParams.get("mine") === "1" ||
    searchParams.get("mine") === "true" ||
    searchParams.get("mine") === "yes";
  const showPmAi = isPmAssistantUiEnabled();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
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

  const handleAiCandidateAssignment = useCallback(
    async (p: Project) => {
      const id = getProjectId(p);
      if (!id) {
        await Swal.fire({
          icon: "warning",
          title: "AI candidate assignment",
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
          search: searchQuery || undefined,
          sortBy: sortBy || undefined,
          page: params?.page ?? page,
          limit: PAGE_SIZE,
          ...(mineOnly ? { mine: true } : {}),
          ...params,
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
    setSearchQuery(searchInput.trim());
    setPage(1);
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
      <Pageheader
        currentpage={mineOnly ? "My projects" : "Project List"}
        activepage="Projects"
        mainpage={mineOnly ? "My projects" : "Project List"}
      />
      <div className="grid grid-cols-12 gap-6">
        <div className="xl:col-span-12 col-span-12">
          <div className="box custom-box">
            <div className="box-body p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex flex-wrap gap-1 newproject">
                  <Link
                    href="/apps/projects/create-project/"
                    className="ti-btn ti-btn-primary-full me-2 !mb-0"
                  >
                    <i className="ri-add-line me-1 font-semibold align-middle" />
                    New Project
                  </Link>
                  <Select
                    name="sort"
                    options={SORT_OPTIONS}
                    className="!w-40"
                    menuPlacement="auto"
                    classNamePrefix="Select2"
                    placeholder="Sort By"
                    value={currentSortOption}
                    onChange={(opt) => handleSortChange(opt as { value: string; label: string } | null)}
                  />
                </div>
                <div className="flex" role="search">
                  <input
                    className="form-control me-2"
                    type="search"
                    placeholder="Search Project"
                    aria-label="Search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <button
                    className="ti-btn ti-btn-light !mb-0"
                    type="button"
                    onClick={handleSearch}
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="box custom-box">
          <div className="box-body p-6 text-center text-[#8c9097]">
            Loading projects...
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-x-6">
          {projects.map((project) => (
            <ProjectCard
              key={getProjectId(project)}
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
        <div className="box custom-box">
          <div className="box-body p-6 text-center text-[#8c9097]">
            No projects found. Create one with &quot;New Project&quot;.
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
