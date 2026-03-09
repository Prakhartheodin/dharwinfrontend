"use client";

import React from "react";
import Link from "next/link";
import type { Task } from "@/shared/lib/api/tasks";
import {
  getTaskId,
  TASK_STATUS_LABELS,
  formatCreatedDate,
} from "@/shared/lib/api/tasks";
import { TaskCommentsSection } from "../TaskCommentsSection";

export interface TaskDetailModalProps {
  open: boolean;
  task: Task | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onEdit?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  /** Optional lookup of candidates (id, name, email) so we can show details even when assignedTo is just IDs. */
  allCandidates?: { id: string; name: string; email: string }[];
  /** Called after a comment is added; parent can refetch task to update commentsCount. */
  onCommentAdded?: () => void;
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
  allCandidates,
  onCommentAdded,
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
              <div>
                <div className="font-semibold mb-1 text-[0.875rem]">Assigned Candidates</div>
                {(task.assignedTo ?? []).length === 0 ? (
                  <span className="text-[0.8125rem] text-[#8c9097] dark:text-white/50">
                    Unassigned
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(task.assignedTo ?? []).map((u) => {
                      // u may be an ObjectId string or a populated object
                      if (typeof u === "string") {
                        const c = allCandidates?.find((cand) => cand.id === u);
                        const label = c ? `${c.name} (${c.email})` : u;
                        return (
                          <span
                            key={u}
                            className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[0.75rem]"
                          >
                            {label}
                          </span>
                        );
                      }
                      const obj = u as { id?: string; _id?: string; name?: string; email?: string };
                      const id = obj.id ?? obj._id ?? "";
                      const label = obj.name ?? obj.email ?? id;
                      return (
                        <span
                          key={id || label}
                          className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[0.75rem]"
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              {task && (
                <TaskCommentsSection
                  taskId={getTaskId(task)}
                  initialComments={task.comments}
                  onCommentAdded={onCommentAdded}
                />
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
