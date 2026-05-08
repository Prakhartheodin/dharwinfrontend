"use client";

import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import Swal from "sweetalert2";
import { usePmRefetchOnFocus, emitPmDataMutated } from "@/shared/hooks/usePmRefetchOnFocus";
import { isPmAssistantUiEnabled } from "@/shared/lib/pm/featureFlags";
import { hasPermission } from "@/shared/lib/permissions";
import { AiTaskBreakdownModal } from "@/shared/components/pm/AiTaskBreakdownModal";
import { runAssignmentGenerationWithUi } from "@/shared/lib/pm/runAssignmentGenerationWithUi";
import {
  listProjects,
  deleteProject,
  getProjectById,
  getProjectProgress,
  updateProject,
  type Project,
  type ProjectStatus,
  type ProjectPriority,
  type ProjectsListParams,
} from "@/shared/lib/api/projects";
import { listTeamMembers, type TeamMember } from "@/shared/lib/api/teams";
import { useAuth } from "@/shared/contexts/auth-context";
import { sanitizeRichHtml } from "@/shared/lib/sanitize-html";

const PAGE_SIZE = 12;

const STATUS_LABEL: Record<ProjectStatus, string> = {
  Inprogress: "In progress",
  "On hold": "On hold",
  completed: "Completed",
};

const STATUS_STRIP: Record<ProjectStatus, string> = {
  Inprogress: "bg-info",
  "On hold": "bg-warning",
  completed: "bg-success",
};

const STATUS_TEXT: Record<ProjectStatus, string> = {
  Inprogress: "text-info",
  "On hold": "text-warning",
  completed: "text-success",
};

const PRIORITY_DOT: Record<ProjectPriority, string> = {
  High: "bg-danger",
  Medium: "bg-info",
  Low: "bg-success",
};

const PRIORITY_RING: Record<ProjectPriority, string> = {
  High: "ring-danger/30",
  Medium: "ring-info/30",
  Low: "ring-success/30",
};

const STATUS_FILTERS: Array<{ value: "" | ProjectStatus; label: string }> = [
  { value: "", label: "All" },
  { value: "Inprogress", label: "In progress" },
  { value: "On hold", label: "On hold" },
  { value: "completed", label: "Completed" },
];

function fmtDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function getProjectId(project: Project): string {
  return (project as Project & { id?: string })._id ?? (project as Project & { id?: string }).id ?? "";
}

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

function getTeamIdFromTeamRef(t: { _id?: string; id?: string }): string {
  return (t as { id?: string }).id ?? t._id ?? "";
}

/* ============================================================
   PROJECT DETAIL MODAL
============================================================ */

interface ProjectDetailModalProps {
  open: boolean;
  projectData: Project | null;
  loading: boolean;
  error: string | null;
  membersByTeamId?: Record<string, TeamMember[]>;
  onClose: () => void;
  canEdit?: boolean;
}

function ProjectDetailModal({
  open,
  projectData,
  loading,
  error,
  membersByTeamId = {},
  onClose,
  canEdit = true,
}: ProjectDetailModalProps): JSX.Element | null {
  if (!open) return null;

  const progress = projectData ? getProjectProgress(projectData) : 0;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="bg-bodybg border border-defaultborder/80 flex max-h-[92vh] w-[96vw] max-w-4xl flex-col overflow-hidden rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-defaultborder/60 px-5 py-4 dark:border-white/10">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Project · Detail
            </p>
            <h5 className="mt-0.5 truncate text-base font-semibold tracking-tight">
              {projectData?.name ?? "Project Details"}
            </h5>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:border-white/30 dark:hover:text-white"
            onClick={onClose}
            aria-label="Close"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 min-h-0">
          {loading ? (
            <div className="text-center py-10 text-muted dark:text-white/50">Loading project details…</div>
          ) : error ? (
            <div className="text-center py-10 text-danger">{error}</div>
          ) : !projectData ? (
            <div className="text-center py-10 text-muted dark:text-white/50">Project not found.</div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-defaultborder/70 p-4 dark:border-white/10">
                <div className="flex items-start justify-between gap-3">
                  <h6 className="text-base font-semibold">{projectData.name}</h6>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${priorityBadgeClass(projectData.priority)}`}>
                    {projectData.priority}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 text-[0.8125rem] sm:grid-cols-2">
                  <DetailField label="Project Manager" value={projectData.projectManager || "—"} />
                  <DetailField label="Client / Stakeholder" value={projectData.clientStakeholder || "—"} />
                  <DetailField label="Status" value={STATUS_LABEL[projectData.status] ?? projectData.status} />
                  <DetailField
                    label="Progress"
                    value={`${projectData.completedTasks ?? 0}/${projectData.totalTasks ?? 0} tasks (${progress}%)`}
                  />
                  <DetailField label="Start Date" value={fmtDate(projectData.startDate)} />
                  <DetailField label="Due Date" value={fmtDate(projectData.endDate)} />
                </div>
              </div>

              {projectData.description ? (
                <div className="rounded-xl border border-defaultborder/70 p-4 dark:border-white/10">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Description
                  </p>
                  <div
                    className="prose prose-sm mt-2 max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(projectData.description) }}
                  />
                </div>
              ) : null}

              <div className="rounded-xl border border-defaultborder/70 p-4 dark:border-white/10">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Teams &amp; Members
                </p>
                <div className="mt-3 space-y-3">
                  {(projectData.assignedTeams ?? []).length === 0 ? (
                    <div className="text-muted dark:text-white/50 text-[0.8125rem]">No team assigned.</div>
                  ) : (
                    (projectData.assignedTeams ?? []).map((t) => {
                      const teamId = getTeamIdFromTeamRef(t);
                      const teamName = t.name ?? (teamId || "—");
                      const members = membersByTeamId[teamId] ?? [];
                      return (
                        <div key={teamId} className="rounded-lg border border-defaultborder/60 p-3 dark:border-white/10">
                          <div className="text-[0.875rem] font-semibold text-primary">{teamName}</div>
                          {members.length === 0 ? (
                            <div className="mt-2 text-[0.8125rem] text-muted dark:text-white/50">
                              No members in this team.
                            </div>
                          ) : (
                            <ul className="mt-2 list-none space-y-1.5">
                              {members.map((m) => (
                                <li
                                  key={(m as TeamMember & { id?: string }).id ?? m._id}
                                  className="flex items-center gap-2 text-[0.8125rem]"
                                >
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[0.7rem] font-semibold">
                                    {(m.name ?? m.email ?? "?").slice(0, 1).toUpperCase()}
                                  </span>
                                  <div className="min-w-0">
                                    <span className="font-medium">{m.name || "—"}</span>
                                    {m.email ? (
                                      <span className="ms-1 text-muted dark:text-white/50">({m.email})</span>
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
                <div className="rounded-xl border border-defaultborder/70 p-4 dark:border-white/10">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tags</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(projectData.tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex rounded-full border border-slate-200 px-2.5 py-0.5 text-[0.7rem] text-slate-700 dark:border-white/15 dark:text-slate-200"
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

        <div className="flex items-center justify-end gap-2 border-t border-defaultborder/70 p-4 dark:border-white/10">
          {projectData?._id && canEdit ? (
            <Link
              href={`/apps/projects/edit/${projectData._id}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <i className="ri-edit-line" /> Edit Project
            </Link>
          ) : null}
          <button
            type="button"
            className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-700 hover:border-slate-900 hover:text-slate-900 dark:border-white/15 dark:text-slate-200 dark:hover:border-white"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailField(props: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">{props.label}</p>
      <p className="mt-0.5 text-defaulttextcolor break-words">{props.value}</p>
    </div>
  );
}

/* ============================================================
   PAGE
============================================================ */

const Projectlist = (): JSX.Element => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const { roleNames, isAdministrator, permissionsLoaded } = auth;
  const canCreateProject = hasPermission(auth, "create_project");
  const canEditProject = hasPermission(auth, "update_project");
  const canDeleteProject = hasPermission(auth, "delete_project");
  const canUseProjectAi = canCreateProject && canEditProject;
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
  const [statusFilter, setStatusFilter] = useState<"" | ProjectStatus>("");
  const [sortBy, setSortBy] = useState("createdAt:desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedProjectDetail, setSelectedProjectDetail] = useState<Project | null>(null);
  const [membersByTeamId, setMembersByTeamId] = useState<Record<string, TeamMember[]>>({});
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiProject, setAiProject] = useState<Project | null>(null);
  const lastSyncedUrlSearchRef = useRef<string | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  /** sync URL ?search= → state on back/forward */
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
          text: "Could not read this project's id from the list. Refresh the page or open the project from Edit and try again.",
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
          status: statusFilter || undefined,
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
    [searchQuery, sortBy, statusFilter, page, mineOnly]
  );

  useEffect(() => {
    fetchProjects({ page });
  }, [fetchProjects, page]);

  usePmRefetchOnFocus(
    useCallback(() => {
      fetchProjects({ page });
    }, [fetchProjects, page])
  );

  // close menu on outside click / Esc
  useEffect(() => {
    if (!openMenuId) return;
    function onDocClick(e: MouseEvent): void {
      const t = e.target as Node | null;
      if (gridRef.current && t && !gridRef.current.contains(t)) {
        setOpenMenuId(null);
      }
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") setOpenMenuId(null);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenuId]);

  // auto-clear toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSearch = (): void => {
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

  const handleDelete = useCallback(
    async (id: string) => {
      const confirm = await Swal.fire({
        title: "Delete project?",
        text: "This action cannot be undone.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#6c757d",
        confirmButtonText: "Yes, delete",
      });
      if (!confirm.isConfirmed) return;
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
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") closeDetailModal();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [detailModalOpen, closeDetailModal]);

  async function handleStatusChange(id: string, next: ProjectStatus): Promise<void> {
    if (!id) return;
    setUpdatingId(id);
    setOpenMenuId(null);
    setProjects((prev) => prev.map((p) => (getProjectId(p) === id ? { ...p, status: next } : p)));
    try {
      await updateProject(id, { status: next });
      emitPmDataMutated();
      setToast(`Project moved to "${STATUS_LABEL[next]}"`);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "Failed to update status";
      setToast(`Error: ${msg}`);
      void fetchProjects({ page });
    } finally {
      setUpdatingId(null);
    }
  }

  const summary = useMemo(() => {
    const counts = { Inprogress: 0, "On hold": 0, completed: 0 } as Record<ProjectStatus, number>;
    for (const p of projects) {
      if (p.status in counts) counts[p.status] += 1;
    }
    return counts;
  }, [projects]);

  const headingLabel = mineOnly ? "My projects" : "All projects";

  return (
    <Fragment>
      <Seo title={mineOnly ? "My projects" : "Project List"} />
      <div className="relative px-4 py-5 md:px-8 md:py-6 max-w-[1600px] mx-auto">

        {/* HEADER — minimal inline bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-slate-200 pb-4 dark:border-white/10">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              {headingLabel}
            </span>
            <span className="hidden h-3 w-px bg-slate-300 sm:inline-block dark:bg-white/15" />
            <Stat label="Total" value={totalResults} />
            <Stat label="Active" value={summary.Inprogress} tone="info" />
            <Stat label="Hold" value={summary["On hold"]} tone="warning" />
            <Stat label="Done" value={summary.completed} tone="success" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!mineOnly && canCreateProject ? (
              <Link
                href="/apps/projects/create-project/"
                className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <i className="ri-add-line" /> New
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => fetchProjects({ page })}
              disabled={loading}
              aria-label="Refresh"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600 transition hover:border-slate-900 hover:text-slate-900 disabled:opacity-50 dark:border-white/10 dark:bg-bgdark2 dark:text-slate-300 dark:hover:border-white dark:hover:text-white"
            >
              <i className={`ri-refresh-line ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map((f) => {
              const active = statusFilter === f.value;
              return (
                <button
                  key={f.label}
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setStatusFilter(f.value);
                  }}
                  className={
                    "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition " +
                    (active
                      ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-400 dark:border-white/10 dark:bg-bgdark2 dark:text-slate-300 dark:hover:border-white/30")
                  }
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
            <div className="relative w-full sm:w-auto">
              <i className="ri-search-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                className="h-9 w-full rounded-full border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none sm:w-[260px] dark:border-white/10 dark:bg-bgdark2 dark:text-slate-200 dark:focus:border-white/40"
                placeholder="Search projects…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              className="h-9 rounded-full bg-slate-900 px-4 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Search
            </button>
            <Dropdown
              value={sortBy}
              options={[
                { value: "createdAt:desc", label: "Newest" },
                { value: "createdAt:asc", label: "Oldest" },
                { value: "name:asc", label: "Name A → Z" },
                { value: "name:desc", label: "Name Z → A" },
                { value: "endDate:asc", label: "Due (earliest)" },
                { value: "endDate:desc", label: "Due (latest)" },
              ]}
              onChange={(v) => {
                setSortBy(v);
                setPage(1);
              }}
              ariaLabel="Sort projects"
            />
          </div>
        </div>

        {/* GRID */}
        {loading && projects.length === 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            isCandidateSpecialistListViewer={isCandidateSpecialistListViewer}
            mineOnly={mineOnly}
            canCreateProject={canCreateProject}
          />
        ) : (
          <div ref={gridRef} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {projects.map((p) => {
              const id = getProjectId(p);
              const pct = getProjectProgress(p);
              const stripCls = STATUS_STRIP[p.status] ?? "bg-slate-400";
              const statusTextCls = STATUS_TEXT[p.status] ?? "text-slate-500";
              const isMenuOpen = openMenuId === id;
              const isUpdating = updatingId === id;
              const teams = p.assignedTeams ?? [];
              const teamDisplay = 2;
              const extraTeams = teams.length > teamDisplay ? teams.length - teamDisplay : 0;

              return (
                <div
                  key={id || p.name}
                  className={
                    "group relative flex h-full flex-col rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:z-20 hover:border-slate-300 hover:shadow-lg dark:border-white/10 dark:bg-bgdark2 dark:hover:border-white/20 " +
                    (isMenuOpen ? "z-30 " : "") +
                    (isUpdating ? "opacity-70" : "")
                  }
                >
                  <span className={`absolute left-0 top-0 h-full w-[3px] rounded-l-2xl ${stripCls}`} aria-hidden />

                  <div className="flex items-start justify-between gap-3 px-5 pl-6 pt-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[p.priority] ?? "bg-slate-400"} ring-4 ${PRIORITY_RING[p.priority] ?? "ring-slate-200"}`}
                          title={`${p.priority} priority`}
                          aria-label={`${p.priority} priority`}
                        />
                        <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          {p.priority} priority
                        </p>
                      </div>
                      <Link
                        href={id ? `/apps/projects/edit/${encodeURIComponent(id)}` : "#"}
                        title={p.name}
                        className="mt-1.5 block truncate text-lg font-semibold tracking-tight text-slate-900 hover:text-primary dark:text-white"
                      >
                        {p.name}
                      </Link>
                      <p className={`mt-1 inline-flex items-center gap-1.5 text-xs font-semibold ${statusTextCls}`}>
                        <span className="relative inline-flex h-1.5 w-1.5">
                          {p.status === "Inprogress" && (
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-info opacity-75" />
                          )}
                          <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${stripCls}`} />
                        </span>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </p>
                    </div>

                    {id && (
                      <div className="relative">
                        <button
                          type="button"
                          aria-label="Project actions"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(isMenuOpen ? null : id);
                          }}
                          disabled={isUpdating}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-slate-400 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 dark:hover:border-white/10 dark:hover:bg-white/5 dark:hover:text-white"
                        >
                          <i className={`${isUpdating ? "ri-loader-4-line animate-spin" : "ri-more-2-fill"}`} />
                        </button>

                        {isMenuOpen && (
                          <div className="absolute right-0 top-full z-30 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-bgdark2">
                            <p className="border-b border-slate-100 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-slate-400 dark:border-white/10">
                              Change status
                            </p>
                            {p.status !== "Inprogress" && (
                              <MenuItem
                                icon="ri-play-circle-line"
                                tone="info"
                                label={p.status === "On hold" ? "Resume project" : "Mark in progress"}
                                onClick={() => void handleStatusChange(id, "Inprogress")}
                              />
                            )}
                            {p.status !== "On hold" && (
                              <MenuItem
                                icon="ri-pause-circle-line"
                                tone="warning"
                                label="Put on hold"
                                onClick={() => void handleStatusChange(id, "On hold")}
                              />
                            )}
                            {p.status !== "completed" && (
                              <MenuItem
                                icon="ri-check-double-line"
                                tone="success"
                                label="Mark complete"
                                onClick={() => void handleStatusChange(id, "completed")}
                              />
                            )}

                            {showPmAi && canUseProjectAi && (
                              <>
                                <p className="border-y border-slate-100 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-slate-400 dark:border-white/10">
                                  AI workflows
                                </p>
                                <MenuItem
                                  icon="ri-sparkling-line"
                                  tone="info"
                                  label="AI task breakdown"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setAiProject(p);
                                    setAiModalOpen(true);
                                  }}
                                />
                                <MenuItem
                                  icon="ri-user-shared-line"
                                  tone="info"
                                  label="AI employee assignment"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    void handleAiCandidateAssignment(p);
                                  }}
                                />
                              </>
                            )}

                            <div className="border-t border-slate-100 dark:border-white/10">
                              <p className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-slate-400">
                                Manage
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  void handleView(id);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
                              >
                                <i className="ri-eye-line text-base" /> View
                              </button>
                              {canEditProject && (
                                <Link
                                  href={`/apps/projects/edit/${encodeURIComponent(id)}`}
                                  onClick={() => setOpenMenuId(null)}
                                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
                                >
                                  <i className="ri-edit-line text-base" /> Edit
                                </Link>
                              )}
                              {canDeleteProject && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    void handleDelete(id);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-danger hover:bg-danger/10"
                                >
                                  <i className="ri-delete-bin-line text-base" /> Delete
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {p.description && (
                    <p className="line-clamp-2 px-5 pl-6 pt-3 text-sm text-slate-600 dark:text-slate-300">
                      {p.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()}
                    </p>
                  )}

                  {teams.length > 0 && (
                    <div className="px-5 pl-6 pt-3">
                      <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Teams
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {teams.slice(0, teamDisplay).map((t) => {
                          const tid = (t as { id?: string }).id ?? t._id;
                          const tname = t.name ?? tid ?? "—";
                          return (
                            <span
                              key={tid}
                              title={tname}
                              className="inline-flex max-w-[10rem] truncate rounded-full border border-slate-200 px-2.5 py-0.5 text-[0.7rem] text-slate-700 dark:border-white/10 dark:text-slate-200"
                            >
                              {tname}
                            </span>
                          );
                        })}
                        {extraTeams > 0 && (
                          <span className="inline-flex rounded-full bg-slate-900 px-2 py-0.5 text-[0.7rem] font-semibold text-white dark:bg-white dark:text-slate-900">
                            +{extraTeams}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-auto px-5 pl-6 pt-5">
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Progress
                      </span>
                      <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums dark:text-slate-200">
                        {p.completedTasks ?? 0}<span className="text-slate-400">/</span>{p.totalTasks ?? 0}
                        <span className="ms-2 text-slate-500">{pct}%</span>
                      </span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          p.status === "completed" ? "bg-success" : p.status === "On hold" ? "bg-warning" : "bg-primary"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-px border-t border-slate-100 bg-slate-100 dark:border-white/10 dark:bg-white/10">
                    <MetaCell kicker="Start" value={fmtDate(p.startDate)} />
                    <MetaCell kicker="Due" value={fmtDate(p.endDate)} />
                  </div>

                  {id && (
                    <div className="flex items-center justify-between border-t border-slate-100 px-5 pl-6 py-3 dark:border-white/10">
                      <button
                        type="button"
                        onClick={() => void handleView(id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 transition hover:text-primary dark:text-slate-200"
                      >
                        View details
                        <i className="ri-arrow-right-line transition-transform group-hover:translate-x-0.5" />
                      </button>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                        #{(id || "—").slice(-6)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <nav aria-label="Page navigation" className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 transition hover:border-slate-900 hover:text-slate-900 disabled:opacity-40 dark:border-white/10 dark:bg-bgdark2 dark:text-slate-300 dark:hover:border-white/40 dark:hover:text-white"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              ← Prev
            </button>
            <div className="hidden flex-wrap items-center gap-1 sm:flex">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
                .reduce<Array<number | "…">>((acc, n, idx, arr) => {
                  const prev = arr[idx - 1];
                  if (typeof prev === "number" && n - prev > 1) acc.push("…");
                  acc.push(n);
                  return acc;
                }, [])
                .map((n, i) =>
                  n === "…" ? (
                    <span key={`dots-${i}`} className="px-2 text-xs text-slate-400">
                      …
                    </span>
                  ) : (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={
                        "min-w-[2rem] rounded-full px-2.5 py-1 font-mono text-xs tabular-nums transition " +
                        (n === page
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5")
                      }
                    >
                      {String(n).padStart(2, "0")}
                    </button>
                  )
                )}
            </div>
            <span className="font-mono text-xs text-slate-500 tabular-nums sm:hidden dark:text-slate-400">
              {String(page).padStart(2, "0")} / {String(totalPages).padStart(2, "0")}
            </span>
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 transition hover:border-slate-900 hover:text-slate-900 disabled:opacity-40 dark:border-white/10 dark:bg-bgdark2 dark:text-slate-300 dark:hover:border-white/40 dark:hover:text-white"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next →
            </button>
          </nav>
        )}

        {toast && (
          <div className="fixed bottom-6 left-1/2 z-50 max-w-[calc(100vw-2rem)] -translate-x-1/2 truncate rounded-full border border-slate-900 bg-slate-900 px-5 py-2.5 text-center text-xs font-semibold text-white shadow-2xl dark:border-white dark:bg-white dark:text-slate-900">
            {toast}
          </div>
        )}
      </div>

      <ProjectDetailModal
        open={detailModalOpen}
        projectData={selectedProjectDetail}
        loading={detailLoading}
        error={detailError}
        membersByTeamId={membersByTeamId}
        onClose={closeDetailModal}
        canEdit={canEditProject}
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
    </Fragment>
  );
};

export default Projectlist;

/* ============================================================
   subcomponents — mirror the My Projects page
============================================================ */

type StatTone = "slate" | "info" | "warning" | "success";

const STAT_VALUE: Record<StatTone, string> = {
  slate: "text-slate-900 dark:text-white",
  info: "text-info",
  warning: "text-warning",
  success: "text-success",
};

function Stat(props: { label: string; value: number; tone?: StatTone }): JSX.Element {
  const tone = props.tone ?? "slate";
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
        {props.label}
      </span>
      <span className={`font-mono text-sm font-semibold tabular-nums ${STAT_VALUE[tone]}`}>
        {props.value.toString().padStart(2, "0")}
      </span>
    </span>
  );
}

function MetaCell(props: { kicker: string; value: string }): JSX.Element {
  return (
    <div className="bg-white px-5 py-3 dark:bg-bgdark2">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {props.kicker}
      </p>
      <p className="mt-0.5 font-mono text-xs text-slate-700 tabular-nums dark:text-slate-200">
        {props.value}
      </p>
    </div>
  );
}

type MenuTone = "info" | "warning" | "success";
const TONE_HOVER: Record<MenuTone, string> = {
  info: "hover:bg-info/10 hover:text-info",
  warning: "hover:bg-warning/10 hover:text-warning",
  success: "hover:bg-success/10 hover:text-success",
};

function MenuItem(props: { icon: string; label: string; tone: MenuTone; onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 transition dark:text-slate-200 ${TONE_HOVER[props.tone]}`}
    >
      <i className={`${props.icon} text-base`} />
      <span>{props.label}</span>
    </button>
  );
}

interface DropdownOption {
  value: string;
  label: string;
}

function Dropdown(props: {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const current = props.options.find((o) => o.value === props.value) ?? props.options[0];

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={props.ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex h-9 w-full items-center justify-between gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 sm:w-auto dark:border-white/10 dark:bg-bgdark2 dark:text-slate-200 dark:hover:border-white/30"
      >
        <span>{current?.label ?? "Select"}</span>
        <i className={`ri-arrow-down-s-line text-base transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-30 mt-1 min-w-[12rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-white/10 dark:bg-bgdark2"
        >
          {props.options.map((o) => {
            const active = o.value === props.value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  props.onChange(o.value);
                  setOpen(false);
                }}
                className={
                  "flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left text-sm transition " +
                  (active
                    ? "bg-slate-100 font-semibold text-slate-900 dark:bg-white/10 dark:text-white"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5")
                }
              >
                <span>{o.label}</span>
                {active && <i className="ri-check-line text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SkeletonCard(): JSX.Element {
  return (
    <div className="relative flex h-[260px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-bgdark2">
      <span className="absolute left-0 top-0 h-full w-[3px] bg-slate-200 dark:bg-white/10" />
      <div className="flex-1 animate-pulse space-y-3 p-5">
        <div className="h-2 w-16 rounded bg-slate-200 dark:bg-white/10" />
        <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-white/10" />
        <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-white/10" />
        <div className="h-3 w-full rounded bg-slate-100 dark:bg-white/5" />
        <div className="h-3 w-5/6 rounded bg-slate-100 dark:bg-white/5" />
        <div className="h-1 w-full rounded bg-slate-200 dark:bg-white/10" />
      </div>
      <div className="grid grid-cols-2 gap-px border-t border-slate-100 bg-slate-100 dark:border-white/10 dark:bg-white/10">
        <div className="h-12 bg-white dark:bg-bgdark2" />
        <div className="h-12 bg-white dark:bg-bgdark2" />
      </div>
    </div>
  );
}

interface EmptyStateProps {
  isCandidateSpecialistListViewer: boolean;
  mineOnly: boolean;
  canCreateProject: boolean;
}

function EmptyState({
  isCandidateSpecialistListViewer,
  mineOnly,
  canCreateProject,
}: EmptyStateProps): JSX.Element {
  let body: React.ReactNode;
  let cta: React.ReactNode;

  if (isCandidateSpecialistListViewer && mineOnly) {
    body = (
      <>
        This view lists projects you created and projects where you have at least one task assigned (any type).
        Tasks must be linked to a project to appear here. Try another search, or open{" "}
        <Link href="/task/my-tasks" className="text-primary underline-offset-2 hover:underline">
          My Tasks
        </Link>{" "}
        to review assignments.
      </>
    );
    cta = (
      <Link
        href="/task/my-tasks"
        className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
      >
        <i className="ri-task-line" /> My Tasks
      </Link>
    );
  } else if (isCandidateSpecialistListViewer) {
    body = (
      <>
        On the main Projects list, projects you did not create only appear when you are assigned to a task tagged
        for one of these workflows: <strong>feature-engineer</strong>, <strong>feasibility-reviewer</strong>, or{" "}
        <strong>orchestrating-swarms</strong>. Use{" "}
        <Link href="/apps/projects/my-projects" className="text-primary underline-offset-2 hover:underline">
          My Projects
        </Link>{" "}
        for everything you are assigned to, or open{" "}
        <Link href="/task/my-tasks" className="text-primary underline-offset-2 hover:underline">
          My Tasks
        </Link>
        .
      </>
    );
    cta = (
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/apps/projects/my-projects"
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          <i className="ri-folder-user-line" /> My Projects
        </Link>
        <Link
          href="/task/my-tasks"
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-700 hover:border-slate-900 hover:text-slate-900 dark:border-white/15 dark:text-slate-200 dark:hover:border-white"
        >
          <i className="ri-task-line" /> My Tasks
        </Link>
      </div>
    );
  } else if (mineOnly) {
    body = (
      <>
        Try another search, or open the full{" "}
        <Link href="/apps/projects/project-list" className="text-primary underline-offset-2 hover:underline">
          project list
        </Link>{" "}
        if you have access to create projects there.
      </>
    );
    cta = (
      <Link
        href="/apps/projects/project-list"
        className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
      >
        <i className="ri-folder-line" /> All projects
      </Link>
    );
  } else if (canCreateProject) {
    body = <>Try another search or create a project with <strong>New Project</strong>.</>;
    cta = (
      <Link
        href="/apps/projects/create-project/"
        className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
      >
        <i className="ri-add-line" /> Create project
      </Link>
    );
  } else {
    body = "Try another search.";
    cta = null;
  }

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-white/15 dark:bg-bgdark2 sm:p-12">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
        <i className="ri-folder-open-line text-2xl text-slate-400" />
      </div>
      <p className="mt-4 text-base font-semibold text-slate-800 dark:text-slate-100">No projects found</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500 dark:text-slate-400">{body}</p>
      {cta}
    </div>
  );
}
