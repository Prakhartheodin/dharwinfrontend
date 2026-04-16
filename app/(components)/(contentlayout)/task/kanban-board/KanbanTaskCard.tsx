"use client";

import React, { useRef, useEffect } from "react";
import type { Task } from "@/shared/lib/api/tasks";
import {
  getTaskId,
  formatCreatedDate,
  formatDueDate,
} from "@/shared/lib/api/tasks";
import styles from "./kanban-board.module.css";

export interface KanbanTaskCardProps {
  task: Task;
  onView: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  /** Optional candidate lookup so avatars can show initials from candidate name/email when assignedTo is just IDs. */
  allCandidates?: { id: string; name: string; email: string }[];
  /** Optional project lookup for name when projectId is not populated. */
  projectsMap?: { id: string; name: string }[];
}

export function KanbanTaskCard({
  task,
  onView,
  onEdit,
  onDelete,
  allCandidates,
  projectsMap,
}: KanbanTaskCardProps) {
  const taskId = getTaskId(task);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dueLabel = formatDueDate(task.dueDate, task.status);
  const isCompleted = task.status === "completed";
  const projectIdRaw = task.projectId;
  const projectId =
    typeof projectIdRaw === "string"
      ? projectIdRaw
      : (projectIdRaw as { id?: string })?.id ??
        (projectIdRaw as { _id?: string })?._id;
  const projectName =
    (typeof projectIdRaw === "object" && projectIdRaw?.name) ??
    (projectId && projectsMap?.find((p) => p.id === projectId)?.name);

  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dropdownRef.current) return;
    const menu = dropdownRef.current.querySelector(".hs-dropdown-menu") as HTMLElement;
    const button = dropdownRef.current.querySelector("button") as HTMLElement;
    if (!menu || !button) return;
    const isHidden = menu.classList.contains("hidden");
    document.querySelectorAll(".kanban-card-dropdown .hs-dropdown-menu").forEach((other) => {
      if (other !== menu) {
        (other as HTMLElement).classList.add("hidden");
        (other as HTMLElement).style.cssText =
          "opacity: 0 !important; pointer-events: none !important; display: none !important;";
      }
    });
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

  const closeDropdown = () => {
    if (!dropdownRef.current) return;
    const menu = dropdownRef.current.querySelector(".hs-dropdown-menu") as HTMLElement;
    const button = dropdownRef.current.querySelector("button") as HTMLElement;
    if (menu) {
      menu.classList.add("hidden");
      menu.style.cssText =
        "opacity: 0 !important; pointer-events: none !important; display: none !important;";
    }
    if (button) button.setAttribute("aria-expanded", "false");
  };

  const handleView = () => {
    closeDropdown();
    onView(taskId);
  };

  const handleEdit = () => {
    closeDropdown();
    onEdit(taskId);
  };

  const handleDelete = () => {
    closeDropdown();
    onDelete(taskId);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        const menu = dropdownRef.current.querySelector(".hs-dropdown-menu") as HTMLElement;
        const button = dropdownRef.current.querySelector("button") as HTMLElement;
        if (menu) {
          menu.classList.add("hidden");
          menu.style.cssText =
            "opacity: 0 !important; pointer-events: none !important; display: none !important;";
          if (button) button.setAttribute("aria-expanded", "false");
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const tags = task.tags ?? [];
  const assignedTo = task.assignedTo ?? [];

  const getAssigneeDisplay = (u: unknown): { key: string; initial: string; title: string } => {
    if (typeof u === "string") {
      const cand = allCandidates?.find((c) => c.id === u);
      const nameOrEmail = cand?.name || cand?.email || "";
      const initial = nameOrEmail ? nameOrEmail.slice(0, 1).toUpperCase() : "?";
      const title = nameOrEmail || u;
      return { key: u, initial, title };
    }
    const obj = u as { id?: string; _id?: string; name?: string; email?: string };
    const id = obj.id ?? obj._id ?? "";
    const nameOrEmail = obj.name || obj.email || "";
    const initial = nameOrEmail ? nameOrEmail.slice(0, 1).toUpperCase() : "?";
    const title = nameOrEmail || id || "?";
    return { key: id || title, initial, title };
  };

  return (
    <div
      className={`box kanban-tasks ${styles.kbCard}`}
      data-task-id={taskId}
      data-status={task.status}
    >
      <div className="box-body !p-0">
        <div className="p-4 kanban-board-head">
          <div className={`flex justify-between mb-1 text-[.75rem] font-semibold ${styles.kbMeta}`}>
            <div className="inline-flex">
              <i className="ri-time-line me-1 align-middle" />
              Created - {formatCreatedDate(task.createdAt)}
            </div>
            <div className={isCompleted ? "text-success" : ""}>
              {isCompleted ? (
                <><i className="ri-check-fill me-1 align-middle" />Done</>
              ) : (
                dueLabel || "—"
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="task-badges flex flex-wrap gap-1">
              {task.taskCode && (
                <span className={`badge bg-light text-default border ${styles.kbTag}`}>{task.taskCode}</span>
              )}
              {tags.slice(0, 3).map((tag) => (
                <span key={tag} className={`badge border-0 ${styles.kbTag} ${styles.kbTagAccent}`}>
                  {tag}
                </span>
              ))}
            </div>
            <div className="hs-dropdown ti-dropdown kanban-card-dropdown relative" ref={dropdownRef}>
              <button
                type="button"
                className="ti-btn ti-btn-icon ti-btn-sm ti-btn-light"
                aria-expanded="false"
                onClick={toggleDropdown}
              >
                <i className="fe fe-more-vertical" />
              </button>
              <ul
                className="hs-dropdown-menu ti-dropdown-menu hidden absolute right-0 top-full mt-1 z-50 min-w-[160px] bg-bodybg border border-defaultborder rounded-md shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <li>
                  <button
                    type="button"
                    className="ti-dropdown-item w-full text-left !py-2 !px-3"
                    onClick={handleView}
                  >
                    <i className="ri-eye-line me-1 align-middle" /> View
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="ti-dropdown-item w-full text-left !py-2 !px-3"
                    onClick={handleEdit}
                  >
                    <i className="ri-edit-line me-1 align-middle" /> Edit
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="ti-dropdown-item w-full text-left text-danger !py-2 !px-3"
                    onClick={handleDelete}
                  >
                    <i className="ri-delete-bin-line me-1 align-middle" /> Delete
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <div className="kanban-content !mt-1">
            {projectName && (
              <div className="mb-1">
                <span className="badge bg-secondary/10 text-secondary text-[0.6875rem]">
                  {projectName}
                </span>
              </div>
            )}
            {task.imageUrl && (
              <div className="task-image mt-2">
                <img
                  src={task.imageUrl}
                  className="img-fluid rounded kanban-image max-h-32 object-cover w-full"
                  alt=""
                />
              </div>
            )}
            <h6 className={`mb-1 ${styles.kbTitle}`}>{task.title}</h6>
            <div className={`kanban-task-description line-clamp-2 ${styles.kbDesc}`}>
              {task.description || "No description."}
            </div>
          </div>
        </div>
        <div className="p-4 border-t dark:border-defaultborder/10 border-dashed">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center">
              <span className={`inline-flex items-center me-2 ${styles.kbStat}`}>
                <i className="ri-thumb-up-fill align-middle font-normal" aria-hidden />
                <span className="font-semibold text-[.75rem] ms-1">{task.likesCount ?? 0}</span>
              </span>
              <span className={`inline-flex items-center ${styles.kbMeta}`}>
                <i className="ri-message-2-line align-middle font-normal" aria-hidden />
                <span className="font-semibold text-[.75rem] ms-1">{task.commentsCount ?? 0}</span>
              </span>
            </div>
            <div className="avatar-list-stacked">
              {assignedTo.slice(0, 4).map((u) => {
                const { key, initial, title } = getAssigneeDisplay(u);
                return (
                  <span
                    key={key}
                    className="avatar avatar-sm avatar-rounded bg-primary/10 text-primary"
                    title={title}
                  >
                    {initial}
                  </span>
                );
              })}
              {assignedTo.length === 0 && (
                <span className={`text-[0.75rem] ${styles.kbMeta}`}>Unassigned</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
