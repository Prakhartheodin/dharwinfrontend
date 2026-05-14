"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Plus_Jakarta_Sans, Syne } from "next/font/google";
import Seo from "@/shared/layout-components/seo/seo";
import dynamic from "next/dynamic";
import Swal from "sweetalert2";
import PerfectScrollbar from "react-perfect-scrollbar";
import "react-perfect-scrollbar/dist/css/styles.css";
import {
  listTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getTaskId,
  type Task,
  type TaskStatus,
  TASK_STATUS_LABELS,
} from "@/shared/lib/api/tasks";
import { listProjects } from "@/shared/lib/api/projects";
import { listUsers } from "@/shared/lib/api/users";
import { KanbanTaskCard } from "./KanbanTaskCard";
import { TaskDetailModal } from "./TaskDetailModal";
import { usePmRefetchOnFocus, PM_DATA_MUTATED_EVENT } from "@/shared/hooks/usePmRefetchOnFocus";
import styles from "./kanban-board.module.css";
import { useAuth } from "@/shared/contexts/auth-context";
import { hasPermission } from "@/shared/lib/permissions";

const kbSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--kb-font-body",
  display: "swap",
});
const kbDisplay = Syne({
  subsets: ["latin"],
  variable: "--kb-font-display",
  weight: ["600", "700", "800"],
  display: "swap",
});

const Select = dynamic(() => import("react-select"), { ssr: false });
const DatePicker = dynamic(() => import("react-datepicker"), { ssr: false });

const STATUS_COLUMNS: { status: TaskStatus; label: string; className: string }[] = [
  { status: "new", label: "NEW", className: "new" },
  { status: "todo", label: "TODO", className: "todo" },
  { status: "on_going", label: "ON GOING", className: "in-progress" },
  { status: "in_review", label: "IN REVIEW", className: "inreview" },
  { status: "completed", label: "COMPLETED", className: "completed" },
];

const COLUMN_TOP: Record<TaskStatus, string> = {
  new: styles.kbColumnAccentNew,
  todo: styles.kbColumnAccentTodo,
  on_going: styles.kbColumnAccentGoing,
  in_review: styles.kbColumnAccentReview,
  completed: styles.kbColumnAccentDone,
};

const Kanbanboard = () => {
  const auth = useAuth();
  /** Permission gates for create / edit / delete task UI. */
  const canCreateTask = hasPermission(auth, "create_task");
  const canEditTask = hasPermission(auth, "update_task");
  const canDeleteTask = hasPermission(auth, "delete_task");
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [projectFilterId, setProjectFilterId] = useState<string>("");
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addTaskStatus, setAddTaskStatus] = useState<TaskStatus>("new");
  const [addTitle, setAddTitle] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addDueDate, setAddDueDate] = useState<Date | null>(null);
  const [addProjectId, setAddProjectId] = useState<string>("");
  const [addTags, setAddTags] = useState<string>("");
  const [addAssignedCandidateIds, setAddAssignedCandidateIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<TaskStatus>("new");
  const [editDueDate, setEditDueDate] = useState<Date | null>(null);
  const [editProjectId, setEditProjectId] = useState<string>("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editAssignedCandidateIds, setEditAssignedCandidateIds] = useState<string[]>([]);
  const selectMenuPortalTarget = useMemo(
    () => (typeof window === "undefined" ? null : document.body),
    []
  );
  const selectMenuLayerStyles = useMemo(
    () => ({
      menuPortal: (base: Record<string, unknown>) => ({ ...base, zIndex: 9999 }),
      menu: (base: Record<string, unknown>) => ({ ...base, zIndex: 9999 }),
    }),
    []
  );

  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  /** Perfect Scrollbar mounts on this node — it is the real scroll container (not SimpleBar). */
  const scrollHostRefs = useRef<(HTMLElement | null)[]>([]);
  const dragulaRef = useRef<{ destroy: () => void } | null>(null);

  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listTasks({
        limit: 200,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(projectFilterId && { projectId: projectFilterId }),
        ...(assignedToMe && { assignedToMe: true }),
      });
      setTasks(res.results ?? []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, projectFilterId, assignedToMe]);

  useEffect(() => {
    listProjects({ limit: 200 })
      .then((r) => {
        const list = (r.results ?? []).map((p) => ({
          id: (p as { id?: string }).id ?? p._id,
          name: p.name ?? "",
        }));
        setProjects(list);
      })
      .catch(() => setProjects([]));

    // Load users (students/candidates) for assigning tasks
    listUsers({ limit: 200 })
      .then((res) => {
        const list = (res.results ?? []).map((u) => ({
          id: u.id ?? u._id ?? "",
          name: u.name ?? "",
          email: u.email ?? "",
        }));
        setUsers(list);
      })
      .catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const onPmMutate = () => {
      fetchTasks();
    };
    window.addEventListener(PM_DATA_MUTATED_EVENT, onPmMutate);
    return () => window.removeEventListener(PM_DATA_MUTATED_EVENT, onPmMutate);
  }, [fetchTasks]);

  usePmRefetchOnFocus(fetchTasks);

  const scrollColumnToEnd = useCallback((colIndex: number) => {
    const el = scrollHostRefs.current[colIndex];
    if (!el) return;
    const maxScroll = el.scrollHeight - el.clientHeight;
    const top = Math.max(0, maxScroll);
    el.scrollTo({ top, behavior: "smooth" });
  }, []);

  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      new: [],
      todo: [],
      on_going: [],
      in_review: [],
      completed: [],
    };
    tasks.forEach((t) => {
      if (map[t.status]) map[t.status].push(t);
    });
    return map;
  }, [tasks]);

  const handleView = useCallback(async (taskId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailTask(null);
    try {
      const task = await getTaskById(taskId);
      setDetailTask(task);
    } catch {
      setDetailError("Failed to load task.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleDelete = useCallback(
    (taskId: string) => {
      Swal.fire({
        title: "Delete task?",
        text: "This action cannot be undone.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#6c757d",
        confirmButtonText: "Yes, delete",
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            await deleteTask(taskId);
            setDetailOpen(false);
            setEditOpen(false);
            await Swal.fire("Deleted", "Task has been deleted.", "success");
            fetchTasks();
          } catch {
            Swal.fire("Error", "Failed to delete task.", "error");
          }
        }
      });
    },
    [fetchTasks]
  );

  const closeDetailModal = useCallback(() => setDetailOpen(false), []);

  const openEditModal = useCallback((task: Task) => {
    setEditTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setEditStatus(task.status);
    setEditDueDate(task.dueDate ? new Date(task.dueDate) : null);
    const pid =
      task.projectId && typeof task.projectId === "object"
        ? ((task.projectId as { id?: string }).id ?? (task.projectId as { _id?: string })._id)
        : "";
    setEditProjectId(pid ?? "");
    setEditTags(task.tags ?? []);
    const assignedIds = (task.assignedTo ?? [])
      .map((u) => {
        if (!u) return "";
        if (typeof u === "string") return u;
        return ((u as { id?: string }).id ?? (u as { _id?: string })._id ?? "") as string;
      })
      .filter((id) => !!id);
    setEditAssignedCandidateIds(assignedIds);
    setEditOpen(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (addModalOpen) setAddModalOpen(false);
      else if (editOpen) setEditOpen(false);
      else if (detailOpen) closeDetailModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [addModalOpen, editOpen, detailOpen, closeDetailModal]);

  const editTaskIdProcessed = useRef(false);
  useEffect(() => {
    const editTaskId = searchParams.get("editTaskId");
    if (!editTaskId?.trim() || loading || editTaskIdProcessed.current) return;
    editTaskIdProcessed.current = true;
    const existing = tasks.find((t) => getTaskId(t) === editTaskId);
    if (existing) {
      openEditModal(existing);
      window.history.replaceState({}, "", "/task/kanban-board");
    } else {
      getTaskById(editTaskId)
        .then((task) => {
          openEditModal(task);
          window.history.replaceState({}, "", "/task/kanban-board");
        })
        .catch(() => {
          editTaskIdProcessed.current = false;
        });
    }
  }, [searchParams, loading, tasks, openEditModal]);

  const handleEditFromDetail = useCallback((taskId: string) => {
    const task = tasks.find((t) => getTaskId(t) === taskId) ?? detailTask;
    if (task) {
      setDetailOpen(false);
      openEditModal(task);
    }
  }, [tasks, detailTask, openEditModal]);

  const handleEditSubmit = useCallback(async () => {
    if (!editTask) return;
    if (!editTitle.trim()) {
      Swal.fire("Validation", "Task title is required.", "warning");
      return;
    }
    const taskId = getTaskId(editTask);
    setEditSubmitting(true);
    try {
      await updateTask(taskId, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        status: editStatus,
        dueDate: editDueDate ? editDueDate.toISOString() : undefined,
        projectId: editProjectId || undefined,
        tags: editTags.length ? editTags : undefined,
        ...(editAssignedCandidateIds.length
          ? { assignedTo: editAssignedCandidateIds }
          : {}),
      });
      setEditOpen(false);
      setEditTask(null);
      await Swal.fire("Updated", "Task has been updated.", "success");
      fetchTasks();
    } catch {
      Swal.fire("Error", "Failed to update task.", "error");
    } finally {
      setEditSubmitting(false);
    }
  }, [
    editTask,
    editTitle,
    editDescription,
    editStatus,
    editDueDate,
    editProjectId,
    editTags,
    editAssignedCandidateIds,
    fetchTasks,
  ]);

  const openAddTask = useCallback((_status: TaskStatus) => {
    // Always start new tasks in NEW status, regardless of which column button was clicked
    setAddTaskStatus("new");
    setAddTitle("");
    setAddDescription("");
    setAddDueDate(null);
    setAddProjectId("");
    setAddTags("");
    setAddAssignedCandidateIds([]);
    setAddModalOpen(true);
  }, []);

  const handleCreateTask = useCallback(async () => {
    if (!addTitle.trim()) {
      Swal.fire("Validation", "Task title is required.", "warning");
      return;
    }
    const tags = addTags
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    setSubmitting(true);
    try {
      await createTask({
        title: addTitle.trim(),
        description: addDescription.trim() || undefined,
        status: addTaskStatus,
        dueDate: addDueDate ? addDueDate.toISOString() : undefined,
        projectId: addProjectId || undefined,
        tags: tags.length ? tags : undefined,
        ...(addAssignedCandidateIds.length
          ? { assignedTo: addAssignedCandidateIds }
          : {}),
      });
      setAddModalOpen(false);
      setAddTitle("");
      setAddDescription("");
      setAddDueDate(null);
      setAddProjectId("");
      setAddTags("");
      setAddAssignedCandidateIds([]);
      fetchTasks();
      Swal.fire("Created", "Task has been created.", "success");
    } catch {
      Swal.fire("Error", "Failed to create task.", "error");
    } finally {
      setSubmitting(false);
    }
  }, [
    addTitle,
    addDescription,
    addTaskStatus,
    addDueDate,
    addProjectId,
    addTags,
    addAssignedCandidateIds,
    fetchTasks,
  ]);

  useEffect(() => {
    if (loading) return;
    const containers = columnRefs.current.filter(Boolean) as HTMLDivElement[];
    if (containers.length < 5) return;
    if (dragulaRef.current) {
      dragulaRef.current.destroy();
      dragulaRef.current = null;
    }
    const dragula = require("dragula");
    const drake = dragula(containers, {
      moves: (el: HTMLElement) => !!el.getAttribute("data-task-id"),
    });
    dragulaRef.current = drake;
    drake.on("drop", (el: HTMLElement, target: HTMLElement) => {
      const taskId = el.getAttribute("data-task-id");
      // Ensure we read status from the column container even if drop happens on a child element
      const statusContainer = target.closest("[data-status]") as HTMLElement | null;
      const newStatus = statusContainer?.getAttribute("data-status") as TaskStatus | null;
      if (taskId && newStatus) {
        updateTaskStatus(taskId, newStatus)
          .then(() => fetchTasks())
          .catch(() => {
            Swal.fire("Error", "Failed to update task status.", "error");
            fetchTasks();
          });
      } else {
        fetchTasks();
      }
    });
    return () => {
      drake.destroy();
      dragulaRef.current = null;
    };
  }, [loading, tasks, fetchTasks]);

  return (
    <div className={`${kbSans.variable} ${kbDisplay.variable} ${styles.kbRoot} max-w-full overflow-x-hidden`}>
      <Seo title="Kanban Board" />
      <h1 className="sr-only">Kanban Board</h1>

      <div className="px-4 py-5 md:px-6 md:py-6 max-w-full">
        {/* TOOLBAR ROW 1 — kicker + actions */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-slate-200 pb-4 dark:border-white/10">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Task board
            </span>
            <span className="hidden h-3 w-px bg-slate-300 sm:inline-block dark:bg-white/15" />
            <span className="font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
              {tasks.length.toString().padStart(2, "0")} <span className="text-slate-400">tasks</span>
            </span>
            <span className="hidden items-center gap-1 text-[11px] text-slate-500 sm:inline-flex dark:text-slate-400">
              <i className="ri-drag-move-2-line text-sm" aria-hidden />
              Drag cards to update status
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canCreateTask && (
              <button
                type="button"
                onClick={() => openAddTask("new")}
                className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <i className="ri-add-line" /> New task
              </button>
            )}
            <button
              type="button"
              onClick={() => fetchTasks()}
              disabled={loading}
              aria-label="Refresh"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600 transition hover:border-slate-900 hover:text-slate-900 disabled:opacity-50 dark:border-white/10 dark:bg-bgdark2 dark:text-slate-300 dark:hover:border-white dark:hover:text-white"
            >
              <i className={`ri-refresh-line ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* TOOLBAR ROW 2 — filters */}
        <div className="mb-4 flex flex-wrap items-stretch gap-2">
          <div className="kb-project-select min-w-0 flex-1 sm:w-[16rem] sm:max-w-[18rem] sm:flex-none">
            <Select
              name="project"
              placeholder="All projects"
              options={[
                { value: "", label: "All projects" },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
              value={
                projectFilterId
                  ? {
                      value: projectFilterId,
                      label: projects.find((p) => p.id === projectFilterId)?.name ?? projectFilterId,
                    }
                  : { value: "", label: "All projects" }
              }
              onChange={(opt) => setProjectFilterId(((opt as { value: string } | null)?.value) ?? "")}
              className="w-full"
              menuPlacement="auto"
              menuPosition="fixed"
              menuPortalTarget={selectMenuPortalTarget}
              styles={selectMenuLayerStyles}
              classNamePrefix="Select2"
            />
          </div>

          <button
            type="button"
            onClick={() => setAssignedToMe((v) => !v)}
            aria-pressed={assignedToMe}
            className={
              "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition " +
              (assignedToMe
                ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-400 dark:border-white/10 dark:bg-bgdark2 dark:text-slate-300 dark:hover:border-white/30")
            }
          >
            <i className={`ri-user-${assignedToMe ? "fill" : "line"}`} aria-hidden />
            <span>Assigned to me</span>
            {assignedToMe && <i className="ri-check-line" aria-hidden />}
          </button>

          <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-[22rem]">
            <i className="ri-search-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              className="h-9 w-full rounded-full border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none dark:border-white/10 dark:bg-bgdark2 dark:text-slate-200 dark:focus:border-white/40"
              placeholder="Search tasks…"
              aria-label="Search tasks"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* BOARD */}
        {loading ? (
          <div
            className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory xl:grid xl:grid-cols-5 xl:gap-4 xl:overflow-visible"
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label="Loading tasks"
          >
            {STATUS_COLUMNS.map((col) => (
              <div
                key={col.status}
                className={`${styles.kbSkeletonCol} w-[280px] flex-shrink-0 snap-start sm:w-[300px] xl:w-auto xl:flex-1`}
              >
                <div className={styles.kbSkeletonLine} style={{ width: "42%" }} />
                <div className={styles.kbSkeletonLine} style={{ width: "28%" }} />
                <div className={styles.kbSkeletonCard} />
                <div className={styles.kbSkeletonCard} style={{ animationDelay: "0.12s" }} />
                <div className={styles.kbSkeletonCard} style={{ animationDelay: "0.24s" }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="dharwin-kanban-board text-defaulttextcolor dark:text-defaulttextcolor/70 text-defaultsize flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory xl:grid xl:grid-cols-5 xl:gap-4 xl:overflow-visible">
            {STATUS_COLUMNS.map((col, colIndex) => {
              const count = (tasksByStatus[col.status] ?? []).length;
              return (
                <div
                  key={col.status}
                  className={`kanban-tasks-type ${col.className} ${styles.kbColumn} ${COLUMN_TOP[col.status]} w-[280px] flex-shrink-0 snap-start sm:w-[300px] xl:w-auto xl:flex-1`}
                  role="region"
                  aria-label={`${col.label} column, ${count} tasks`}
                >
                  <div className={styles.kbColumnHeader}>
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="truncate">{col.label}</span>
                      <span className={styles.kbCount} aria-hidden>
                        {count}
                      </span>
                    </span>
                    {canCreateTask && (
                      <button type="button" className={styles.kbBtnGhost} onClick={() => openAddTask(col.status)}>
                        <i className="ri-add-line align-middle" /> <span className="align-middle">Add</span>
                      </button>
                    )}
                  </div>
                  <div className={`kanban-tasks ${styles.kbColumnBody}`} id={`${col.status}-tasks`}>
                    <PerfectScrollbar
                      className={styles.kbScrollHost}
                      style={{ height: "100%" }}
                      containerRef={(el) => {
                        scrollHostRefs.current[colIndex] = el;
                      }}
                    >
                      <div
                        ref={(el) => {
                          columnRefs.current[colIndex] = el;
                        }}
                        className={`firstdrag flex flex-col ${styles.kbFirstDrag}`}
                        data-status={col.status}
                        data-view-btn={`${col.status}-tasks`}
                      >
                        {count === 0 ? (
                          <div
                            className={`flex min-h-full flex-1 flex-col items-center justify-center px-4 py-8 text-center min-w-0 ${styles.kbEmpty}`}
                          >
                            <p className="text-[0.8125rem] mb-3 max-w-[14rem] leading-relaxed">
                              No tasks here yet{canCreateTask ? " — add one or drag a card from another column." : "."}
                            </p>
                            {canCreateTask && (
                              <button
                                type="button"
                                className={`${styles.kbBtnPrimary} !text-[0.8125rem] !py-2 inline-flex items-center justify-center gap-1`}
                                onClick={() => openAddTask(col.status)}
                              >
                                <i className="ri-add-line shrink-0" aria-hidden />
                                <span>Add task</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          (tasksByStatus[col.status] ?? []).map((task) => (
                            <KanbanTaskCard
                              key={getTaskId(task)}
                              task={task}
                              onView={handleView}
                              onEdit={(id) => {
                                const t = tasks.find((x) => getTaskId(x) === id);
                                if (t) openEditModal(t);
                              }}
                              onDelete={handleDelete}
                              allCandidates={users}
                              projectsMap={projects}
                              canEdit={canEditTask}
                              canDelete={canDeleteTask}
                            />
                          ))
                        )}
                      </div>
                    </PerfectScrollbar>
                  </div>
                  <button
                    type="button"
                    className={styles.kbViewMore}
                    onClick={() => scrollColumnToEnd(colIndex)}
                    aria-label={`Scroll ${col.label} column to the bottom`}
                  >
                    View more
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TaskDetailModal
        open={detailOpen}
        task={detailTask}
        loading={detailLoading}
        error={detailError}
        onClose={closeDetailModal}
        onEdit={canEditTask ? handleEditFromDetail : undefined}
        onDelete={canDeleteTask ? handleDelete : undefined}
        allCandidates={users}
        onCommentAdded={
          detailTask
            ? () => getTaskById(getTaskId(detailTask)).then(setDetailTask)
            : undefined
        }
      />

      {addModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px] motion-safe:transition-opacity motion-reduce:backdrop-blur-none">
          <div
            className="w-[96vw] max-w-md overflow-hidden rounded-2xl border border-defaultborder/80 bg-bodybg shadow-2xl motion-safe:animate-pm-panel-in motion-reduce:animate-none dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-defaultborder/60 bg-gradient-to-r from-slate-50/90 to-white px-4 py-4 dark:border-white/10 dark:from-white/[0.04] dark:to-transparent">
              <h6 className="mb-0 font-semibold">Add Task</h6>
              <button
                type="button"
                className="ti-btn ti-btn-light !py-1 !px-2"
                onClick={() => setAddModalOpen(false)}
              >
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="form-label">Task Name</label>
                <input
                  type="text"
                  className="form-control w-full !rounded-md"
                  placeholder="Task Name"
                  value={addTitle}
                  onChange={(e) => setAddTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea
                  className="form-control w-full !rounded-md"
                  rows={2}
                  placeholder="Description"
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Project</label>
                <Select
                  placeholder="Select project (optional)"
                  options={projects.map((p) => ({ value: p.id, label: p.name }))}
                  value={addProjectId ? { value: addProjectId, label: projects.find((p) => p.id === addProjectId)?.name ?? addProjectId } : null}
                  onChange={(opt) =>
                    setAddProjectId(((opt as { value: string } | null)?.value) ?? "")
                  }
                  className="w-full !rounded-md"
                  menuPlacement="auto"
                  classNamePrefix="Select2"
                  isClearable
                />
              </div>
              <div>
                <label className="form-label">Assign Users</label>
                <Select
                  isMulti
                  placeholder="Select users to assign"
                  options={users.map((c) => ({
                    value: c.id,
                    label: `${c.name} - ${c.email}`,
                  }))}
                  value={addAssignedCandidateIds.map((id) => {
                    const c = users.find((x) => x.id === id);
                    return c
                      ? { value: c.id, label: `${c.name} - ${c.email}` }
                      : { value: id, label: id };
                  })}
                  onChange={(opts) =>
                    setAddAssignedCandidateIds(
                      ((opts ?? []) as { value: string }[]).map((o) => o.value)
                    )
                  }
                  className="w-full !rounded-md"
                  menuPlacement="auto"
                  classNamePrefix="Select2"
                />
              </div>
              <div>
                <label className="form-label">Due Date</label>
                <DatePicker
                  className="form-control w-full !rounded-md"
                  selected={addDueDate}
                  // react-datepicker can pass Date or null for single-date picker
                  onChange={(d: Date | null) => setAddDueDate(d)}
                  dateFormat="MMMM d, yyyy"
                />
              </div>
              <div>
                <label className="form-label">Tags (comma or space separated)</label>
                <input
                  type="text"
                  className="form-control w-full !rounded-md"
                  placeholder="e.g. UI, bug, frontend"
                  value={addTags}
                  onChange={(e) => setAddTags(e.target.value)}
                />
              </div>
              <div>
                <span className="text-[0.75rem] text-[#8c9097] dark:text-white/50">
                  Status: {TASK_STATUS_LABELS[addTaskStatus]}
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-defaultborder/60 bg-gradient-to-r from-transparent to-slate-50/80 p-4 dark:border-white/10 dark:to-white/[0.02]">
              <button
                type="button"
                className="ti-btn ti-btn-light"
                onClick={() => setAddModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ti-btn bg-primary text-white !font-medium"
                onClick={handleCreateTask}
                disabled={submitting}
              >
                {submitting ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editOpen && editTask && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px] motion-safe:transition-opacity motion-reduce:backdrop-blur-none">
          <div
            className="flex max-h-[92vh] w-[96vw] max-w-lg flex-col overflow-hidden rounded-2xl border border-defaultborder/80 bg-bodybg shadow-2xl motion-safe:animate-pm-panel-in motion-reduce:animate-none dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-defaultborder/60 bg-gradient-to-r from-slate-50/90 to-white px-4 py-4 dark:border-white/10 dark:from-white/[0.04] dark:to-transparent">
              <h6 className="mb-0 font-semibold">Edit Task</h6>
              <button
                type="button"
                className="ti-btn ti-btn-light !py-1 !px-2"
                onClick={() => setEditOpen(false)}
              >
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              <div>
                <label className="form-label">Task Name</label>
                <input
                  type="text"
                  className="form-control w-full !rounded-md"
                  placeholder="Task Name"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea
                  className="form-control w-full !rounded-md"
                  rows={3}
                  placeholder="Description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Status</label>
                <Select
                  value={{ value: editStatus, label: TASK_STATUS_LABELS[editStatus] }}
                  options={STATUS_COLUMNS.map((c) => ({ value: c.status, label: c.label }))}
                  onChange={(opt) => {
                    const v = (opt as { value: TaskStatus } | null)?.value;
                    if (v) setEditStatus(v);
                  }}
                  className="w-full !rounded-md"
                  menuPlacement="auto"
                  classNamePrefix="Select2"
                />
              </div>
              <div>
                <label className="form-label">Project</label>
                <Select
                  placeholder="Select project (optional)"
                  options={projects.map((p) => ({ value: p.id, label: p.name }))}
                  value={editProjectId ? { value: editProjectId, label: projects.find((p) => p.id === editProjectId)?.name ?? editProjectId } : null}
                  onChange={(opt) =>
                    setEditProjectId(((opt as { value: string } | null)?.value) ?? "")
                  }
                  className="w-full !rounded-md"
                  menuPlacement="auto"
                  classNamePrefix="Select2"
                  isClearable
                />
              </div>
              <div>
                <label className="form-label">Assign Users</label>
                <Select
                  isMulti
                  placeholder="Select users to assign"
                  options={users.map((c) => ({
                    value: c.id,
                    label: `${c.name} - ${c.email}`,
                  }))}
                  value={editAssignedCandidateIds.map((id) => {
                    const c = users.find((x) => x.id === id);
                    return c
                      ? { value: c.id, label: `${c.name} - ${c.email}` }
                      : { value: id, label: id };
                  })}
                  onChange={(opts) =>
                    setEditAssignedCandidateIds(
                      ((opts ?? []) as { value: string }[]).map((o) => o.value)
                    )
                  }
                  className="w-full !rounded-md"
                  menuPlacement="auto"
                  classNamePrefix="Select2"
                />
              </div>
              <div>
                <label className="form-label">Due Date</label>
                <DatePicker
                  className="form-control w-full !rounded-md"
                  selected={editDueDate}
                  onChange={(d: Date | null) => setEditDueDate(d)}
                  dateFormat="MMMM d, yyyy"
                />
              </div>
              <div>
                <label className="form-label">Tags (comma separated)</label>
                <input
                  type="text"
                  className="form-control w-full !rounded-md"
                  placeholder="e.g. UI, bug"
                  value={editTags.join(", ")}
                  onChange={(e) =>
                    setEditTags(
                      e.target.value
                        .split(/[\s,]+/)
                        .map((s) => s.trim())
                        .filter(Boolean)
                    )
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-defaultborder/60 bg-gradient-to-r from-transparent to-slate-50/80 p-4 dark:border-white/10 dark:to-white/[0.02]">
              <button
                type="button"
                className="ti-btn ti-btn-light"
                onClick={() => setEditOpen(false)}
                disabled={editSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-primary"
                onClick={handleEditSubmit}
                disabled={editSubmitting || !editTitle.trim()}
              >
                {editSubmitting ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Kanbanboard;
