"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Seo from "@/shared/layout-components/seo/seo";
import {
  listProjects,
  updateProject,
  type Project,
  type ProjectStatus,
  type ProjectPriority,
} from "@/shared/lib/api/projects";

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

function projectId(p: Project): string {
  return (p as Project & { id?: string })._id ?? (p as Project & { id?: string }).id ?? "";
}

function progressPct(p: Project): number {
  if (!p.totalTasks || p.totalTasks <= 0) return 0;
  const pct = Math.round((p.completedTasks / p.totalTasks) * 100);
  return Math.max(0, Math.min(100, pct));
}

export default function MyProjectsPage(): JSX.Element {
  const [projects, setProjects] = useState<Project[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | ProjectStatus>("");
  const [sortBy, setSortBy] = useState("createdAt:desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listProjects({
        mine: true,
        limit: PAGE_SIZE,
        page,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        sortBy,
      });
      setProjects(res.results ?? []);
      setTotalPages(res.totalPages ?? 0);
      setTotalResults(res.totalResults ?? 0);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "Failed to load your projects";
      setError(msg);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, sortBy]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const menuWrapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!openMenuId) return;
    function onDocClick(e: MouseEvent): void {
      const t = e.target as Node | null;
      if (menuWrapRef.current && t && !menuWrapRef.current.contains(t)) {
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

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const summary = useMemo(() => {
    const counts = { Inprogress: 0, "On hold": 0, completed: 0 } as Record<ProjectStatus, number>;
    for (const p of projects) {
      if (p.status in counts) counts[p.status] += 1;
    }
    return counts;
  }, [projects]);

  async function handleStatusChange(id: string, next: ProjectStatus): Promise<void> {
    if (!id) return;
    setUpdatingId(id);
    setOpenMenuId(null);
    setProjects((prev) => prev.map((p) => (projectId(p) === id ? { ...p, status: next } : p)));
    try {
      await updateProject(id, { status: next });
      setToast(`Project moved to "${STATUS_LABEL[next]}"`);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "Failed to update status";
      setToast(`Error: ${msg}`);
      void refresh();
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <React.Fragment>
      <Seo title="My Projects" />
      <div className="relative px-4 py-5 md:px-8 md:py-6 max-w-[1600px] mx-auto">

        {/* HEADER — minimal inline bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-slate-200 pb-4 dark:border-white/10">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              My projects
            </span>
            <span className="hidden h-3 w-px bg-slate-300 sm:inline-block dark:bg-white/15" />
            <Stat label="Total" value={totalResults} />
            <Stat label="Active" value={summary.Inprogress} tone="info" />
            <Stat label="Hold" value={summary["On hold"]} tone="warning" />
            <Stat label="Done" value={summary.completed} tone="success" />
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            aria-label="Refresh"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600 transition hover:border-slate-900 hover:text-slate-900 disabled:opacity-50 dark:border-white/10 dark:bg-bgdark2 dark:text-slate-300 dark:hover:border-white dark:hover:text-white"
          >
            <i className={`ri-refresh-line ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
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
                type="text"
                className="h-9 w-full rounded-full border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none sm:w-[260px] dark:border-white/10 dark:bg-bgdark2 dark:text-slate-200 dark:focus:border-white/40"
                placeholder="Search projects…"
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
              />
            </div>
            <select
              className="h-9 w-full rounded-full border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-slate-900 focus:outline-none sm:w-auto dark:border-white/10 dark:bg-bgdark2 dark:text-slate-200"
              value={sortBy}
              onChange={(e) => {
                setPage(1);
                setSortBy(e.target.value);
              }}
            >
              <option value="createdAt:desc">Newest</option>
              <option value="createdAt:asc">Oldest</option>
              <option value="name:asc">Name A → Z</option>
              <option value="name:desc">Name Z → A</option>
              <option value="endDate:asc">Due (earliest)</option>
              <option value="endDate:desc">Due (latest)</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-900/40 dark:bg-red-900/15">
            <p className="text-sm font-semibold text-red-800 dark:text-red-200">
              Couldn&apos;t load your projects
            </p>
            <p className="mt-1 text-xs text-red-600 dark:text-red-300">{error}</p>
            <button
              type="button"
              className="mt-3 rounded-full border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200"
              onClick={() => void refresh()}
            >
              Try again
            </button>
          </div>
        )}

        {/* GRID */}
        {loading && projects.length === 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : projects.length === 0 && !error ? (
          <EmptyState />
        ) : (
          <div ref={menuWrapRef} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {projects.map((p) => {
              const id = projectId(p);
              const pct = progressPct(p);
              const stripCls = STATUS_STRIP[p.status] ?? "bg-slate-400";
              const statusTextCls = STATUS_TEXT[p.status] ?? "text-slate-500";
              const isMenuOpen = openMenuId === id;
              const isUpdating = updatingId === id;

              return (
                <div
                  key={id || p.name}
                  className={
                    "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg dark:border-white/10 dark:bg-bgdark2 dark:hover:border-white/20 " +
                    (isUpdating ? "opacity-70" : "")
                  }
                >
                  <span className={`absolute left-0 top-0 h-full w-[3px] ${stripCls}`} aria-hidden />

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
                      <h3 className="mt-1.5 truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                        {p.name}
                      </h3>
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
                          <div className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-bgdark2">
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
                            <div className="border-t border-slate-100 dark:border-white/10">
                              <Link
                                href={`/apps/projects/edit/${encodeURIComponent(id)}`}
                                onClick={() => setOpenMenuId(null)}
                                className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"
                              >
                                <i className="ri-edit-line text-base" /> Edit details
                              </Link>
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
                      <Link
                        href={`/apps/projects/project-overview?id=${encodeURIComponent(id)}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 transition hover:text-primary dark:text-slate-200"
                      >
                        View overview
                        <i className="ri-arrow-right-line transition-transform group-hover:translate-x-0.5" />
                      </Link>
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

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 transition hover:border-slate-900 hover:text-slate-900 disabled:opacity-40 dark:border-white/10 dark:bg-bgdark2 dark:text-slate-300 dark:hover:border-white/40 dark:hover:text-white"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
            >
              ← Prev
            </button>
            <span className="font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
              {String(page).padStart(2, "0")} / {String(totalPages).padStart(2, "0")}
            </span>
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 transition hover:border-slate-900 hover:text-slate-900 disabled:opacity-40 dark:border-white/10 dark:bg-bgdark2 dark:text-slate-300 dark:hover:border-white/40 dark:hover:text-white"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
            >
              Next →
            </button>
          </div>
        )}

        {toast && (
          <div className="fixed bottom-6 left-1/2 z-50 max-w-[calc(100vw-2rem)] -translate-x-1/2 truncate rounded-full border border-slate-900 bg-slate-900 px-5 py-2.5 text-center text-xs font-semibold text-white shadow-2xl dark:border-white dark:bg-white dark:text-slate-900">
            {toast}
          </div>
        )}
      </div>
    </React.Fragment>
  );
}

/* ---------- subcomponents ---------- */

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

function EmptyState(): JSX.Element {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-white/15 dark:bg-bgdark2">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
        <i className="ri-folder-line text-2xl text-slate-400" />
      </div>
      <p className="mt-4 text-base font-semibold text-slate-800 dark:text-slate-100">No projects yet</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500 dark:text-slate-400">
        You haven&apos;t created any projects. Create one from the Projects section if you have permission.
      </p>
      <Link
        href="/apps/projects/create-project"
        className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
      >
        <i className="ri-add-line" /> New project
      </Link>
    </div>
  );
}
