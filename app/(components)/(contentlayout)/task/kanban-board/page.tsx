"use client";

import React, { Fragment, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import dynamic from "next/dynamic";
import Link from "next/link";
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
import { usePmRefetchOnFocus } from "@/shared/hooks/usePmRefetchOnFocus";

const Select = dynamic(() => import("react-select"), { ssr: false });
const DatePicker = dynamic(() => import("react-datepicker"), { ssr: false });

const STATUS_COLUMNS: { status: TaskStatus; label: string; className: string }[] = [
  { status: "new", label: "NEW", className: "new" },
  { status: "todo", label: "TODO", className: "todo" },
  { status: "on_going", label: "ON GOING", className: "in-progress" },
  { status: "in_review", label: "IN REVIEW", className: "inreview" },
  { status: "completed", label: "COMPLETED", className: "completed" },
];

const Kanbanboard = () => {
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

  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
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
        limit: 500,
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

  usePmRefetchOnFocus(fetchTasks);

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
    <div>
      <Seo title="Kanban Board" />
      <Pageheader currentpage="Kanban Board" activepage="Task" mainpage="Kanban Board" />
      <div className="grid grid-cols-12 gap-x-6">
        <div className="xl:col-span-12 col-span-12">
          <div className="box">
            <div className="box-body p-4">
              <div className="md:flex items-center justify-between flex-wrap gap-4">
                <div className="grid grid-cols-12 gap-2 md:w-[40%]">
                  <div className="xl:col-span-5 col-span-12">
                    <button
                      type="button"
                      className="ti-btn bg-primary text-white !font-medium !py-1"
                      onClick={() => openAddTask("new")}
                    >
                      <i className="ri-add-line !text-[1rem]" /> New Task
                    </button>
                  </div>
                  <div className="xl:col-span-7 col-span-12 flex items-center gap-3">
                    <Select
                      name="project"
                      placeholder="All projects"
                      options={[
                        { value: "", label: "All projects" },
                        ...projects.map((p) => ({ value: p.id, label: p.name })),
                      ]}
                      value={
                        projectFilterId
                          ? { value: projectFilterId, label: projects.find((p) => p.id === projectFilterId)?.name ?? projectFilterId }
                          : { value: "", label: "All projects" }
                      }
                      onChange={(opt) =>
                        setProjectFilterId(((opt as { value: string } | null)?.value) ?? "")
                      }
                      className="flex-1 !rounded-md"
                      menuPlacement="auto"
                      classNamePrefix="Select2"
                    />
                    <label className="flex items-center gap-1.5 cursor-pointer shrink-0 text-[0.8125rem]">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={assignedToMe}
                        onChange={(e) => setAssignedToMe(e.target.checked)}
                      />
                      Assigned to me
                    </label>
                  </div>
                </div>
                <div className="avatar-list-stacked my-3 md:my-0">
                  <span className="avatar avatar-rounded bg-primary/10 text-primary text-xs">+</span>
                </div>
                <div className="flex gap-2" role="search">
                  <input
                    className="form-control flex-1 !rounded-sm min-w-0"
                    type="search"
                    placeholder="Search (debounced)"
                    aria-label="Search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <button
                    type="button"
                    className="ti-btn ti-btn-light !mb-0 shrink-0"
                    onClick={() => fetchTasks()}
                    disabled={loading}
                    title="Refresh"
                  >
                    <i className="ri-refresh-line" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="box py-12 text-center text-[#8c9097] dark:text-white/50">
          Loading tasks...
        </div>
      ) : (
        <div className="dharwin-kanban-board text-defaulttextcolor dark:text-defaulttextcolor/70 text-defaultsize">
          {STATUS_COLUMNS.map((col, colIndex) => (
            <div key={col.status} className={`kanban-tasks-type ${col.className}`}>
              <div className="mb-4">
                <div className="flex justify-between items-center">
                  <span className="block font-semibold text-[.9375rem]">
                    {col.label} - {(tasksByStatus[col.status] ?? []).length}
                  </span>
                  <div>
                    <button
                      type="button"
                      className="ti-btn !py-1 !px-2 !font-medium !text-[0.75rem] bg-white dark:bg-bodybg text-default border-0"
                      onClick={() => openAddTask(col.status)}
                    >
                      <i className="ri-add-line" /> Add Task
                    </button>
                  </div>
                </div>
              </div>
              <div className="kanban-tasks" id={`${col.status}-tasks`}>
                <PerfectScrollbar style={{ height: "560px" }}>
                  <div
                    ref={(el) => {
                      columnRefs.current[colIndex] = el;
                    }}
                    className="firstdrag min-h-[120px]"
                    data-status={col.status}
                    data-view-btn={`${col.status}-tasks`}
                  >
                    {(tasksByStatus[col.status] ?? []).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-[#8c9097] dark:text-white/50 min-w-0">
                        <p className="text-[0.8125rem] mb-3 whitespace-nowrap">No tasks in this column</p>
                        <button
                          type="button"
                          className="ti-btn ti-btn-sm ti-btn-primary !min-w-[7.5rem] !px-4 whitespace-nowrap shrink-0 inline-flex items-center justify-center"
                          onClick={() => openAddTask(col.status)}
                        >
                          <i className="ri-add-line me-1 shrink-0" /> <span>Add Task</span>
                        </button>
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
                        />
                      ))
                    )}
                  </div>
                </PerfectScrollbar>
              </div>
              <div className="grid mt-4">
                <button type="button" className="ti-btn ti-btn-primary view-more-button">
                  View More
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskDetailModal
        open={detailOpen}
        task={detailTask}
        loading={detailLoading}
        error={detailError}
        onClose={closeDetailModal}
        onEdit={handleEditFromDetail}
        onDelete={handleDelete}
        allCandidates={users}
        onCommentAdded={
          detailTask
            ? () => getTaskById(getTaskId(detailTask)).then(setDetailTask)
            : undefined
        }
      />

      {addModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60">
          <div
            className="bg-bodybg border border-defaultborder rounded-lg shadow-xl w-[96vw] max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-defaultborder">
              <h6 className="font-semibold mb-0">Add Task</h6>
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
            <div className="flex justify-end gap-2 p-4 border-t border-defaultborder">
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60">
          <div
            className="bg-bodybg border border-defaultborder rounded-lg shadow-xl w-[96vw] max-w-lg max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-defaultborder">
              <h6 className="font-semibold mb-0">Edit Task</h6>
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
            <div className="flex justify-end gap-2 p-4 border-t border-defaultborder">
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
