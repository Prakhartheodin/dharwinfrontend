"use client";

import React from "react";
import Link from "next/link";
import type { Task } from "@/shared/lib/api/tasks";
import {
  getTaskId,
  TASK_STATUS_LABELS,
  formatCreatedDate,
} from "@/shared/lib/api/tasks";

export interface TaskDetailModalProps {
  open: boolean;
  task: Task | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onEdit?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
}

function getProjectId(projectId: Task["projectId"]): string {
  if (!projectId) return "";
  if (typeof projectId === "string") return projectId;
  return (projectId as { id?: string }).id ?? (projectId as { _id?: string })._id ?? "";
}

export function TaskDetailModal({
  open,
  task,
  loading,
  error,
  onClose,
  onEdit,
  onDelete,
}: TaskDetailModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-bodybg border border-defaultborder rounded-lg shadow-xl w-[96vw] max-w-2xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-defaultborder">
          <h5 className="font-semibold mb-0 text-[1rem]">Task Details</h5>
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
              Loading task...
            </div>
          ) : error ? (
            <div className="text-center py-10 text-danger">{error}</div>
          ) : !task ? (
            <div className="text-center py-10 text-[#8c9097] dark:text-white/50">
              Task not found.
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold mb-2">{task.title}</h2>
                <div className="flex flex-wrap gap-2 text-[0.75rem]">
                  <span className="px-2 py-1 rounded bg-primary/10 text-primary">
                    {TASK_STATUS_LABELS[task.status]}
                  </span>
                  {task.taskCode && (
                    <span className="px-2 py-1 rounded bg-defaultborder text-defaulttextcolor">
                      {task.taskCode}
                    </span>
                  )}
                </div>
              </div>
              {task.description && (
                <div>
                  <div className="font-semibold mb-1 text-[0.875rem]">Description</div>
                  <p className="text-[#8c9097] dark:text-white/50 text-[0.8125rem]">
                    {task.description}
                  </p>
                </div>
              )}
              {task.projectId && (
                <div>
                  <div className="font-semibold mb-1 text-[0.875rem]">Project</div>
                  {getProjectId(task.projectId) ? (
                    <Link
                      href={`/apps/projects/edit/${getProjectId(task.projectId)}`}
                      className="text-primary text-[0.8125rem] hover:underline"
                    >
                      {task.projectId.name ?? "View project"}
                    </Link>
                  ) : (
                    <span className="text-[0.8125rem]">{task.projectId.name ?? "—"}</span>
                  )}
                </div>
              )}
              {task.createdBy && (
                <div>
                  <div className="font-semibold mb-1 text-[0.875rem]">Created By</div>
                  <span className="text-[0.8125rem]">
                    {task.createdBy.name ?? task.createdBy.email ?? "—"}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-[0.8125rem]">
                <div>
                  <span className="text-[#8c9097] dark:text-white/50">Created: </span>
                  {formatCreatedDate(task.createdAt)}
                </div>
                <div>
                  <span className="text-[#8c9097] dark:text-white/50">Due: </span>
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString()
                    : "—"}
                </div>
                <div>
                  <span className="text-[#8c9097] dark:text-white/50">Likes: </span>
                  {task.likesCount ?? 0}
                </div>
                <div>
                  <span className="text-[#8c9097] dark:text-white/50">Comments: </span>
                  {task.commentsCount ?? 0}
                </div>
              </div>
              {(task.tags ?? []).length > 0 && (
                <div>
                  <div className="font-semibold mb-1 text-[0.875rem]">Tags</div>
                  <div className="flex flex-wrap gap-1">
                    {(task.tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded text-[0.75rem] bg-defaultborder"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {(task.assignedTo ?? []).length > 0 && (
                <div>
                  <div className="font-semibold mb-1 text-[0.875rem]">Assigned To</div>
                  <div className="flex flex-wrap gap-2">
                    {(task.assignedTo ?? []).map((u) => (
                      <span
                        key={(u as { id?: string }).id ?? u._id}
                        className="text-[0.8125rem]"
                      >
                        {u.name ?? u.email ?? (u as { id?: string }).id ?? u._id}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t border-defaultborder">
          {task && (
            <>
              {onEdit && (
                <button
                  type="button"
                  className="ti-btn ti-btn-primary !mb-0"
                  onClick={() => onEdit(getTaskId(task))}
                >
                  <i className="ri-edit-line me-1" /> Edit Task
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  className="ti-btn ti-btn-danger !mb-0"
                  onClick={() => onDelete(getTaskId(task))}
                >
                  <i className="ri-delete-bin-line me-1" /> Delete
                </button>
              )}
            </>
          )}
          <button type="button" className="ti-btn ti-btn-light !mb-0" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
