"use client";

import React, { Fragment, useState, useEffect, useCallback } from "react";
import { usePmRefetchOnFocus } from "@/shared/hooks/usePmRefetchOnFocus";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import dynamic from "next/dynamic";
import Swal from "sweetalert2";
import {
  listMyAssignedTasks,
  updateTaskStatus,
  getTaskId,
  formatDueDate,
  formatCreatedDate,
  type Task,
  type TaskStatus,
  TASK_STATUS_LABELS,
} from "@/shared/lib/api/tasks";
import { TaskCommentsSection } from "../TaskCommentsSection";

const Select = dynamic(() => import("react-select"), { ssr: false });

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "new", label: "NEW" },
  { value: "todo", label: "TODO" },
  { value: "on_going", label: "ON GOING" },
  { value: "in_review", label: "IN REVIEW" },
  { value: "completed", label: "COMPLETED" },
];

const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest" },
  { value: "createdAt", label: "Oldest" },
  { value: "title", label: "A - Z" },
  { value: "-title", label: "Z - A" },
  { value: "dueDate", label: "Due Date (earliest)" },
  { value: "-dueDate", label: "Due Date (latest)" },
];

const PAGE_SIZE = 15;

function statusBadgeClass(status: TaskStatus): string {
  switch (status) {
    case "completed":
      return "bg-success/10 text-success";
    case "in_review":
      return "bg-info/10 text-info";
    case "on_going":
      return "bg-warning/10 text-warning";
    case "todo":
      return "bg-primary/10 text-primary";
    case "new":
      return "bg-secondary/10 text-secondary";
    default:
      return "bg-secondary/10 text-secondary";
  }
}

function dueDateBadgeClass(dueDate: string | undefined, status: TaskStatus): string {
  if (status === "completed") return "bg-success/10 text-success";
  if (!dueDate) return "bg-secondary/10 text-secondary";
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return "bg-secondary/10 text-secondary";
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "bg-danger/10 text-danger";
  if (diffDays === 0) return "bg-warning/10 text-warning";
  if (diffDays <= 3) return "bg-info/10 text-info";
  return "bg-success/10 text-success";
}

interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<void>;
}

function TaskCard({ task, onStatusChange }: TaskCardProps) {
  const taskId = getTaskId(task);
  const [updating, setUpdating] = useState(false);
  const [localStatus, setLocalStatus] = useState<TaskStatus>(task.status);

  useEffect(() => {
    setLocalStatus(task.status);
  }, [task.status]);

  const handleStatusChange = async (opt: { value: TaskStatus; label: string } | null) => {
    if (!opt || opt.value === localStatus) return;
    setUpdating(true);
    try {
      await onStatusChange(taskId, opt.value);
      setLocalStatus(opt.value);
    } catch {
      Swal.fire("Error", "Failed to update task status.", "error");
    } finally {
      setUpdating(false);
    }
  };

  const currentStatusOption = STATUS_OPTIONS.find((o) => o.value === localStatus) ?? STATUS_OPTIONS[0];
  const dueDateDisplay = formatDueDate(task.dueDate, task.status);

  return (
    <div className="box custom-box">
      <div className="box-body p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-grow min-w-0 pr-3">
            <h6 className="font-semibold text-[.9375rem] mb-1">{task.title}</h6>
            {task.description && (
              <p className="text-[#8c9097] dark:text-white/50 text-[0.8125rem] mb-2 line-clamp-2">
                {task.description}
              </p>
            )}
            {task.projectId?.name && (
              <div className="flex items-center gap-2 mb-2">
                <i className="ri-folder-line text-[#8c9097]" />
                <span className="text-[0.75rem] text-[#8c9097] dark:text-white/50">
                  {task.projectId.name}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 items-end">
            {dueDateDisplay && (
              <span className={`badge ${dueDateBadgeClass(task.dueDate, task.status)}`}>
                {dueDateDisplay}
              </span>
            )}
            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 justify-end">
                {task.tags.slice(0, 2).map((tag, i) => (
                  <span key={i} className="badge bg-light text-dark text-[0.625rem]">
                    {tag}
                  </span>
                ))}
                {task.tags.length > 2 && (
                  <span className="badge bg-light text-dark text-[0.625rem]">
                    +{task.tags.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-defaultborder">
          <div className="flex items-center gap-2">
            <span className="text-[0.75rem] text-[#8c9097] dark:text-white/50">Status:</span>
            <Select
              options={STATUS_OPTIONS}
              value={currentStatusOption}
              onChange={handleStatusChange}
              isDisabled={updating}
              className="!w-full !min-w-[140px]"
              classNamePrefix="Select2"
              placeholder="Change status"
            />
          </div>
          <div className="text-end">
            <span className="text-[0.6875rem] text-[#8c9097] dark:text-white/50">
              {formatCreatedDate(task.createdAt)}
            </span>
          </div>
        </div>
        <TaskCommentsSection
          taskId={taskId}
          initialComments={task.comments}
          onCommentAdded={undefined}
        />
      </div>
    </div>
  );
}

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("-createdAt");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "">("");

  const fetchTasks = useCallback(
    async (params?: { page?: number; sortBy?: string; status?: TaskStatus | "" }) => {
      setLoading(true);
      try {
        const result = await listMyAssignedTasks({
          sortBy: params?.sortBy ?? sortBy,
          page: params?.page ?? page,
          limit: PAGE_SIZE,
          ...(params?.status && params.status !== "" ? { status: params.status } : {}),
        });
        setTasks(result.results ?? []);
        setTotalPages(result.totalPages ?? 0);
        if (params?.page !== undefined) setPage(params.page);
      } catch {
        setTasks([]);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    },
    [sortBy, page, statusFilter]
  );

  useEffect(() => {
    fetchTasks({ page, sortBy, status: statusFilter });
  }, [sortBy, page, statusFilter]);

  const refetchVisible = useCallback(() => {
    fetchTasks({ page, sortBy, status: statusFilter });
  }, [fetchTasks, page, sortBy, statusFilter]);

  usePmRefetchOnFocus(refetchVisible);

  const handleStatusChange = useCallback(
    async (taskId: string, status: TaskStatus) => {
      await updateTaskStatus(taskId, status);
      await Swal.fire("Updated", "Task status has been updated.", "success");
      fetchTasks({ page, sortBy, status: statusFilter });
    },
    [fetchTasks, page, sortBy, statusFilter]
  );

  const handleSortChange = (opt: { value: string; label: string } | null) => {
    if (opt) {
      setSortBy(opt.value);
      setPage(1);
    }
  };

  const handleStatusFilterChange = (opt: { value: TaskStatus | ""; label: string } | null) => {
    if (opt !== null) {
      setStatusFilter(opt.value);
      setPage(1);
    }
  };

  const currentSortOption = SORT_OPTIONS.find((o) => o.value === sortBy) ?? SORT_OPTIONS[0];
  const statusFilterOptions = [
    { value: "", label: "All Statuses" },
    ...STATUS_OPTIONS,
  ];
  const currentStatusFilterOption = statusFilterOptions.find((o) => o.value === statusFilter) ?? statusFilterOptions[0];

  return (
    <Fragment>
      <Seo title="My Tasks" />
      <Pageheader
        currentpage="My Tasks"
        activepage="Tasks"
        mainpage="Assigned Tasks"
      />
      <div className="grid grid-cols-12 gap-6">
        <div className="xl:col-span-12 col-span-12">
          <div className="box custom-box">
            <div className="box-body p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <p className="text-[#8c9097] dark:text-white/50 mb-0">
                  Tasks assigned to you. You can update the status of each task.
                </p>
                <div className="flex gap-2">
                  <Select
                    name="status-filter"
                    options={statusFilterOptions}
                    className="!w-40"
                    menuPlacement="auto"
                    classNamePrefix="Select2"
                    placeholder="Filter by status"
                    value={currentStatusFilterOption}
                    onChange={(opt) => handleStatusFilterChange(opt as { value: TaskStatus | ""; label: string } | null)}
                  />
                  <Select
                    name="sort"
                    options={SORT_OPTIONS}
                    className="!w-48"
                    menuPlacement="auto"
                    classNamePrefix="Select2"
                    placeholder="Sort By"
                    value={currentSortOption}
                    onChange={(opt) => handleSortChange(opt as { value: string; label: string } | null)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="box custom-box">
          <div className="box-body p-6 text-center text-[#8c9097]">Loading your tasks...</div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-x-6">
          {tasks.map((task) => (
            <div key={getTaskId(task)} className="xxl:col-span-4 xl:col-span-6 col-span-12">
              <TaskCard task={task} onStatusChange={handleStatusChange} />
            </div>
          ))}
        </div>
      )}

      {!loading && tasks.length === 0 && (
        <div className="box custom-box">
          <div className="box-body p-6 text-center text-[#8c9097]">
            No tasks assigned to you yet.
          </div>
        </div>
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
}
