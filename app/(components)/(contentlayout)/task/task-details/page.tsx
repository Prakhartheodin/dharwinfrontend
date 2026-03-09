"use client";

import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getTaskById,
  getTaskId,
  deleteTask,
  TASK_STATUS_LABELS,
  formatCreatedDate,
  type Task,
} from "@/shared/lib/api/tasks";
import { TaskCommentsSection } from "../TaskCommentsSection";
import Swal from "sweetalert2";

function getProjectId(projectId: Task["projectId"]): string {
  if (!projectId) return "";
  if (typeof projectId === "string") return projectId;
  return (projectId as { id?: string }).id ?? (projectId as { _id?: string })._id ?? "";
}

const Taskdetails = () => {
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId?.trim()) {
      setLoading(false);
      setError("No task ID provided.");
      return;
    }
    setLoading(true);
    setError(null);
    getTaskById(taskId)
      .then(setTask)
      .catch(() => {
        setError("Failed to load task.");
        setTask(null);
      })
      .finally(() => setLoading(false));
  }, [taskId]);

  const handleDelete = () => {
    if (!task) return;
    const id = getTaskId(task);
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
          await deleteTask(id);
          await Swal.fire("Deleted", "Task has been deleted.", "success");
          window.location.href = "/task/kanban-board";
        } catch {
          Swal.fire("Error", "Failed to delete task.", "error");
        }
      }
    });
  };

  return (
    <div>
      <Seo title="Task Details" />
      <Pageheader
        currentpage="Task Details"
        activepage="Task"
        mainpage="Task Details"
      />
      <div className="grid grid-cols-12 gap-6">
        <div className="xl:col-span-9 col-span-12">
          <div className="box">
            <div className="box-header justify-between flex-wrap gap-2">
              <div className="box-title">Task Summary</div>
              <div className="btn-list flex gap-2">
                {task && (
                  <>
                    <Link
                      href={`/task/kanban-board?editTaskId=${getTaskId(task)}`}
                      className="ti-btn bg-primary !py-1 !px-2 !font-medium text-white !text-[0.75rem]"
                    >
                      <i className="ri-edit-line me-1 align-middle" />
                      Edit Task
                    </Link>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="ti-btn bg-danger !py-1 !px-2 !font-medium text-white !text-[0.75rem]"
                    >
                      <i className="ri-delete-bin-line me-1 align-middle" />
                      Delete
                    </button>
                  </>
                )}
                <Link
                  href="/task/kanban-board"
                  className="ti-btn ti-btn-light !py-1 !px-2 !font-medium !text-[0.75rem]"
                >
                  Back to Board
                </Link>
              </div>
            </div>
            <div className="box-body">
              {loading ? (
                <div className="text-center py-10 text-[#8c9097] dark:text-white/50">
                  Loading task...
                </div>
              ) : error ? (
                <div className="text-center py-10 text-danger">{error}</div>
              ) : !task ? (
                <div className="text-center py-10 text-[#8c9097] dark:text-white/50">
                  Task not found.{" "}
                  <Link href="/task/kanban-board" className="text-primary hover:underline">
                    Return to Kanban board
                  </Link>
                </div>
              ) : (
                <>
                  <h5 className="font-semibold mb-4 task-title text-[1.25rem]">
                    {task.title}
                  </h5>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="badge bg-primary/10 text-primary">
                      {TASK_STATUS_LABELS[task.status]}
                    </span>
                    {task.taskCode && (
                      <span className="badge bg-defaultborder text-defaulttextcolor">
                        {task.taskCode}
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <>
                      <div className="text-[.9375rem] font-semibold mb-2">
                        Task Description
                      </div>
                      <p className="text-[#8c9097] dark:text-white/50 task-description mb-4">
                        {task.description}
                      </p>
                    </>
                  )}
                  {task.projectId && (
                    <div className="mb-4">
                      <div className="text-[.9375rem] font-semibold mb-1">Project</div>
                      {getProjectId(task.projectId) ? (
                        <Link
                          href={`/apps/projects/edit/${getProjectId(task.projectId)}`}
                          className="text-primary hover:underline"
                        >
                          {typeof task.projectId === "object"
                            ? task.projectId.name ?? "View project"
                            : "View project"}
                        </Link>
                      ) : (
                        <span className="text-[#8c9097] dark:text-white/50">—</span>
                      )}
                    </div>
                  )}
                  {(task.tags ?? []).length > 0 && (
                    <div className="mb-4">
                      <div className="text-[.9375rem] font-semibold mb-2">Tags</div>
                      <div className="flex flex-wrap gap-1">
                        {task.tags!.map((tag) => (
                          <span
                            key={tag}
                            className="badge bg-primary/10 text-primary me-1"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <TaskCommentsSection
                    taskId={getTaskId(task)}
                    initialComments={task.comments}
                    onCommentAdded={() =>
                      getTaskById(getTaskId(task)).then(setTask)
                    }
                  />
                </>
              )}
            </div>
            {task && !loading && (
              <div className="box-footer">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {task.createdBy && (
                    <div>
                      <span className="block text-[#8c9097] dark:text-white/50 text-[0.75rem]">
                        Created By
                      </span>
                      <span className="block text-[.875rem] font-semibold dark:text-defaulttextcolor/70">
                        {task.createdBy.name ?? task.createdBy.email ?? "—"}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="block text-[#8c9097] dark:text-white/50 text-[0.75rem]">
                      Created
                    </span>
                    <span className="block text-[.875rem] font-semibold dark:text-defaulttextcolor/70">
                      {formatCreatedDate(task.createdAt)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[#8c9097] dark:text-white/50 text-[0.75rem]">
                      Due Date
                    </span>
                    <span className="block text-[.875rem] font-semibold dark:text-defaulttextcolor/70">
                      {task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[#8c9097] dark:text-white/50 text-[0.75rem]">
                      Likes
                    </span>
                    <span className="block text-[.875rem] font-semibold dark:text-defaulttextcolor/70">
                      {task.likesCount ?? 0}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[#8c9097] dark:text-white/50 text-[0.75rem]">
                      Comments
                    </span>
                    <span className="block text-[.875rem] font-semibold dark:text-defaulttextcolor/70">
                      {task.commentsCount ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="xl:col-span-3 col-span-12">
          {task && !loading && (
            <div className="box">
              <div className="box-header">
                <div className="box-title">Additional Details</div>
              </div>
              <div className="box-body !p-0">
                <div className="table-responsive">
                  <table className="table whitespace-nowrap min-w-full">
                    <tbody>
                      <tr className="border-b border-defaultborder">
                        <td>
                          <span className="font-semibold">Task ID</span>
                        </td>
                        <td>{task.taskCode ?? getTaskId(task).slice(-8)}</td>
                      </tr>
                      <tr className="border-b border-defaultborder">
                        <td>
                          <span className="font-semibold">Status</span>
                        </td>
                        <td>{TASK_STATUS_LABELS[task.status]}</td>
                      </tr>
                      <tr>
                        <td>
                          <span className="font-semibold">Assigned To</span>
                        </td>
                        <td>
                          {(task.assignedTo ?? []).length === 0 ? (
                            <span className="text-[#8c9097] dark:text-white/50">
                              Unassigned
                            </span>
                          ) : (
                            <div className="space-y-1">
                              {(task.assignedTo ?? []).map((u) => {
                                if (typeof u === "string") {
                                  return (
                                    <span
                                      key={u}
                                      className="block text-[0.8125rem]"
                                    >
                                      {u}
                                    </span>
                                  );
                                }
                                const obj = u as {
                                  id?: string;
                                  _id?: string;
                                  name?: string;
                                  email?: string;
                                };
                                const label =
                                  obj.name ?? obj.email ?? obj.id ?? obj._id ?? "—";
                                return (
                                  <span
                                    key={obj.id ?? obj._id ?? label}
                                    className="block text-[0.8125rem]"
                                  >
                                    {label}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Taskdetails;
