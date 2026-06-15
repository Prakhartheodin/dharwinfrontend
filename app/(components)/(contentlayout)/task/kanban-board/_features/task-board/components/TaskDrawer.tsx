"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import FocusLock from "react-focus-lock";
import { toast } from "../lib/toast";
import {
  createTask,
  updateTask,
  getTaskId,
  TASK_STATUS_LABELS,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/shared/lib/api/tasks";
import { emitPmDataMutated } from "@/shared/hooks/usePmRefetchOnFocus";
import { PRIORITY_OPTIONS, STATUS_COLUMNS } from "../lib/constants";
import { assignedToWritePayload } from "../lib/task-write-payload";
import type { DrawerMode } from "../types";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges";
import { trackTaskBoard } from "../lib/telemetry";
import { TaskCommentsSection } from "../../../../TaskCommentsSection";
import styles from "../../../kanban-board.module.css";

const Select = dynamic(() => import("react-select"), { ssr: false });
const DatePicker = dynamic(() => import("react-datepicker"), { ssr: false });

export interface TaskDrawerProps {
  open: boolean;
  mode: DrawerMode;
  task: Task | null;
  createStatus?: TaskStatus | null;
  projects: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string; email: string }>;
  canDelete?: boolean;
  onDelete?: () => void;
  onClose: () => void;
  onSaved?: () => void;
}

function projectIdFromTask(task: Task | null): string {
  if (!task?.projectId) return "";
  const raw = task.projectId;
  if (typeof raw === "string") return raw;
  return (raw as { id?: string }).id ?? (raw as { _id?: string })._id ?? "";
}

function assignedIdsFromTask(task: Task | null): string[] {
  if (!task?.assignedTo) return [];
  return (task.assignedTo ?? [])
    .map((u) => {
      if (!u) return "";
      if (typeof u === "string") return u;
      return (
        ((u as { id?: string }).id ?? (u as { _id?: string })._id ?? "") as string
      );
    })
    .filter(Boolean);
}

export function TaskDrawer({
  open,
  mode,
  task,
  createStatus,
  projects,
  users,
  canDelete,
  onDelete,
  onClose,
  onSaved,
}: TaskDrawerProps): React.JSX.Element | null {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("new");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [projectId, setProjectId] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const baselineKey =
    open && mode === "create"
      ? `create-${createStatus ?? "new"}`
      : open && mode === "edit" && task
        ? `edit-${getTaskId(task)}`
        : null;

  const snapshot = useMemo(
    () => ({
      title,
      description,
      status,
      priority,
      due: dueDate?.toISOString() ?? "",
      projectId,
      tagsText,
      assignedIds,
    }),
    [title, description, status, priority, dueDate, projectId, tagsText, assignedIds]
  );

  const { isDirty, resetBaseline } = useUnsavedChanges({
    value: snapshot,
    baselineKey,
  });

  useEffect(() => {
    if (!open || !mode) return;
    if (mode === "create") {
      setTitle("");
      setDescription("");
      setStatus(createStatus ?? "new");
      setPriority("medium");
      setDueDate(null);
      setProjectId("");
      setTagsText("");
      setAssignedIds([]);
      return;
    }
    if (mode === "edit" && task) {
      setTitle(task.title ?? "");
      setDescription(task.description ?? "");
      setStatus(task.status);
      setPriority(task.priority ?? "medium");
      setDueDate(task.dueDate ? new Date(task.dueDate) : null);
      setProjectId(projectIdFromTask(task));
      setTagsText((task.tags ?? []).join(", "));
      setAssignedIds(assignedIdsFromTask(task));
    }
  }, [open, mode, task, createStatus]);

  const selectMenuPortalTarget = useMemo(
    () => (typeof window === "undefined" ? null : document.body),
    []
  );
  const selectMenuLayerStyles = useMemo(
    () => ({
      menuPortal: (base: Record<string, unknown>) => ({ ...base, zIndex: 14000 }),
      menu: (base: Record<string, unknown>) => ({ ...base, zIndex: 14000 }),
    }),
    []
  );

  const handleRequestClose = useCallback(async () => {
    if (!isDirty) {
      onClose();
      return;
    }
    const r = await toast.confirm("Discard unsaved changes?", { title: "Discard changes?" }); if (r.isConfirmed) {
      resetBaseline();
      onClose();
    }
  }, [isDirty, onClose, resetBaseline]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !open) return;
      void handleRequestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleRequestClose]);

  const submit = useCallback(async () => {
    if (!title.trim()) {
      toast.warning("Task title is required.");
      return;
    }
    const tags = tagsText
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    setSubmitting(true);
    try {
      if (mode === "create") {
        await createTask({
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          priority,
          dueDate: dueDate ? dueDate.toISOString() : undefined,
          projectId: projectId || undefined,
          tags: tags.length ? tags : undefined,
          ...assignedToWritePayload(mode, assignedIds),
        });
        emitPmDataMutated();
        trackTaskBoard("taskboard.task_created", { status });
        resetBaseline();
        onSaved?.();
        onClose();
        toast.success("Task has been created.");
        return;
      }
      if (mode === "edit" && task) {
        const taskId = getTaskId(task);
        await updateTask(taskId, {
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          priority,
          dueDate: dueDate ? dueDate.toISOString() : undefined,
          projectId: projectId || undefined,
          tags: tags.length ? tags : undefined,
          ...assignedToWritePayload(mode, assignedIds),
        });
        emitPmDataMutated();
        trackTaskBoard("taskboard.task_status_changed", { taskId, status });
        resetBaseline();
        onSaved?.();
        onClose();
        toast.success("Task has been updated.");
      }
    } catch {
      toast.error("Could not save task.");
    } finally {
      setSubmitting(false);
    }
  }, [
    assignedIds,
    description,
    dueDate,
    mode,
    onClose,
    onSaved,
    priority,
    projectId,
    resetBaseline,
    status,
    tagsText,
    task,
    title,
  ]);

  // Sticky-shadow on header/footer when body scrolls (P1.5 §6.11).
  const bodyScrollRef = useRef<HTMLDivElement | null>(null);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [footerScrolled, setFooterScrolled] = useState(false);
  useEffect(() => {
    const el = bodyScrollRef.current;
    if (!el) return;
    const update = () => {
      setHeaderScrolled(el.scrollTop > 4);
      setFooterScrolled(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    return () => el.removeEventListener("scroll", update);
  }, [open]);

  if (!open || !mode) return null;
  if (mode === "edit" && !task) return null;

  const kicker = mode === "create" ? "Task / New" : "Task / Edit";
  const taskCode = task?.taskCode ?? "";

  return (
    <div
      className={styles.kbDrawerOverlay}
      role="presentation"
      onClick={() => void handleRequestClose()}
    >
      <FocusLock returnFocus>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-drawer-title"
          className={styles.kbDrawerPanel}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sticky header — compact context strip only; title lives in body */}
          <header
            className={`${styles.kbDrawerHeader} flex items-center justify-between gap-3 px-5 py-2.5`}
            data-scrolled={headerScrolled ? "true" : "false"}
          >
            <p className="flex min-w-0 items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              <span aria-hidden>{kicker}</span>
              {taskCode ? (
                <>
                  <span className="text-slate-300 dark:text-slate-600" aria-hidden>
                    ·
                  </span>
                  <span className="truncate text-slate-700 dark:text-slate-200">
                    {taskCode}
                  </span>
                </>
              ) : null}
            </p>
            <button
              type="button"
              className="flex h-7 w-7 shrink-0 items-center justify-center text-slate-400 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              onClick={() => void handleRequestClose()}
              aria-label="Close"
            >
              <i className="ri-close-line text-base" aria-hidden />
            </button>
          </header>

          {/* Scrollable body */}
          <div ref={bodyScrollRef} className="flex-1 overflow-y-auto px-5 py-4">
            {/* Title — editorial dominant field */}
            <input
              id="task-drawer-title"
              type="text"
              className={styles.kbDrawerTitleInput}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus={mode === "create"}
              aria-label="Task title"
            />

            <div className={styles.kbDrawerDivider} aria-hidden />

            {/* Properties — compact row stack */}
            <section aria-labelledby="drawer-props-label">
              <p id="drawer-props-label" className={styles.kbDrawerSectionLabel}>
                Properties
              </p>

              <div className={styles.kbDrawerPropRow}>
                <span className={styles.kbDrawerPropLabel}>Status</span>
                {mode === "edit" ? (
                  <Select
                    value={{ value: status, label: TASK_STATUS_LABELS[status] }}
                    options={STATUS_COLUMNS.map((c) => ({
                      value: c.status,
                      label: c.label,
                    }))}
                    onChange={(opt) => {
                      const v = (opt as { value: TaskStatus } | null)?.value;
                      if (v) setStatus(v);
                    }}
                    classNamePrefix="kb-drawer-select"
                    menuPortalTarget={selectMenuPortalTarget}
                    styles={selectMenuLayerStyles}
                  />
                ) : (
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700 dark:text-slate-200">
                    {TASK_STATUS_LABELS[status]}
                  </span>
                )}
              </div>

              <div className={styles.kbDrawerPropRow}>
                <span className={styles.kbDrawerPropLabel}>Priority</span>
                <Select
                  value={{
                    value: priority,
                    label:
                      PRIORITY_OPTIONS.find((p) => p.value === priority)?.label ??
                      priority,
                  }}
                  options={PRIORITY_OPTIONS.map((p) => ({
                    value: p.value,
                    label: p.label,
                  }))}
                  onChange={(opt) => {
                    const v = (opt as { value: TaskPriority } | null)?.value;
                    if (v) setPriority(v);
                  }}
                  classNamePrefix="kb-drawer-select"
                  menuPortalTarget={selectMenuPortalTarget}
                  styles={selectMenuLayerStyles}
                />
              </div>

              <div className={styles.kbDrawerPropRow}>
                <span className={styles.kbDrawerPropLabel}>Project</span>
                <Select
                  placeholder="None"
                  options={projects.map((p) => ({ value: p.id, label: p.name }))}
                  value={
                    projectId
                      ? {
                          value: projectId,
                          label:
                            projects.find((p) => p.id === projectId)?.name ??
                            projectId,
                        }
                      : null
                  }
                  onChange={(opt) =>
                    setProjectId(((opt as { value: string } | null)?.value) ?? "")
                  }
                  classNamePrefix="kb-drawer-select"
                  isClearable
                  menuPortalTarget={selectMenuPortalTarget}
                  styles={selectMenuLayerStyles}
                />
              </div>

              <div className={styles.kbDrawerPropRow}>
                <span className={styles.kbDrawerPropLabel}>Assignees</span>
                <Select
                  isMulti
                  placeholder="Unassigned"
                  options={users.map((c) => ({
                    value: c.id,
                    label: c.name || c.email,
                  }))}
                  value={assignedIds.map((id) => {
                    const c = users.find((x) => x.id === id);
                    return c
                      ? { value: c.id, label: c.name || c.email }
                      : { value: id, label: id };
                  })}
                  onChange={(opts) =>
                    setAssignedIds(((opts ?? []) as { value: string }[]).map((o) => o.value))
                  }
                  classNamePrefix="kb-drawer-select"
                  menuPortalTarget={selectMenuPortalTarget}
                  styles={selectMenuLayerStyles}
                />
              </div>

              <div className={styles.kbDrawerPropRow}>
                <span className={styles.kbDrawerPropLabel}>Due date</span>
                <DatePicker
                  className={styles.kbDrawerInlineInput}
                  selected={dueDate}
                  onChange={(d: Date | null) => setDueDate(d)}
                  dateFormat="MMM d, yyyy"
                  placeholderText="No due date"
                  isClearable
                />
              </div>

              <div className={styles.kbDrawerPropRow}>
                <span className={styles.kbDrawerPropLabel}>Tags</span>
                <input
                  type="text"
                  className={styles.kbDrawerInlineInput}
                  placeholder="comma or space separated"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                />
              </div>
            </section>

            <div className={styles.kbDrawerDivider} aria-hidden />

            {/* Description */}
            <section aria-labelledby="drawer-desc-label">
              <p id="drawer-desc-label" className={styles.kbDrawerSectionLabel}>
                Description
              </p>
              <textarea
                className={styles.kbDrawerTextarea}
                rows={5}
                placeholder="Add details, context, or links..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </section>

            {mode === "edit" && task ? (
              <>
                <div className={styles.kbDrawerDivider} aria-hidden />
                <section aria-labelledby="drawer-activity-label">
                  <p
                    id="drawer-activity-label"
                    className={styles.kbDrawerSectionLabel}
                  >
                    Activity
                  </p>
                  <TaskCommentsSection
                    taskId={getTaskId(task)}
                    initialComments={task.comments}
                    onCommentAdded={() => {
                      emitPmDataMutated();
                      onSaved?.();
                    }}
                  />
                </section>
              </>
            ) : null}
          </div>

          {/* Sticky footer */}
          <footer
            className={`${styles.kbDrawerFooter} flex items-center justify-end gap-2 px-5 py-3`}
            data-scrolled={footerScrolled ? "true" : "false"}
          >
            {mode === "edit" && canDelete && onDelete ? (
              <button
                type="button"
                className="me-auto border border-red-300 bg-white px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-red-700 transition hover:border-red-500 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:bg-bgdark2 dark:text-red-300 dark:hover:bg-red-950/40"
                onClick={() => onDelete()}
                disabled={submitting}
              >
                Delete
              </button>
            ) : null}
            <button
              type="button"
              className="border border-slate-300 bg-white px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700 transition hover:border-slate-900 hover:text-slate-900 disabled:opacity-50 dark:border-white/15 dark:bg-bgdark2 dark:text-slate-200 dark:hover:border-white dark:hover:text-white"
              onClick={() => void handleRequestClose()}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="border border-slate-900 bg-slate-900 px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-slate-700 disabled:opacity-50 dark:border-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              onClick={() => void submit()}
              disabled={submitting || !title.trim()}
            >
              {submitting ? "Saving..." : mode === "create" ? "Create task" : "Save"}
            </button>
          </footer>
        </div>
      </FocusLock>
    </div>
  );
}

