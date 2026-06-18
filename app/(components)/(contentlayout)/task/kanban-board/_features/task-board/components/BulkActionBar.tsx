"use client";

import React, { useState } from "react";
import type { TaskStatus } from "@/shared/lib/api/tasks";
import { STATUS_COLUMNS } from "../lib/constants";
import { useTaskSelection } from "../providers/TaskSelectionProvider";
import { useTaskData } from "../providers/TaskDataProvider";
import { useBulkTaskActions } from "../hooks/useBulkTaskActions";
import styles from "../../../kanban-board.module.css";

const actionBtn =
  "rounded-full border border-indigo-300 bg-white px-3 py-1 text-xs font-semibold text-indigo-900 transition hover:border-indigo-500 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-400/40 dark:bg-transparent dark:text-indigo-100 dark:hover:bg-indigo-950/40";

/** Sentinel select value for the "Clear / Unassigned" assign option. */
const UNASSIGN_VALUE = "__unassign__";

export interface BulkActionBarProps {
  canEdit?: boolean;
  canDelete?: boolean;
}

export function BulkActionBar({
  canEdit = false,
  canDelete = false,
}: BulkActionBarProps): React.JSX.Element | null {
  const { selectedIds, clearSelection } = useTaskSelection();
  const { users } = useTaskData();
  const { busy, bulkMoveToStatus, bulkAssign, bulkDelete } = useBulkTaskActions();
  const [panel, setPanel] = useState<"move" | "assign" | null>(null);
  const count = selectedIds.size;

  if (count <= 0 || !canEdit) return null;

  const closePanel = () => setPanel(null);

  return (
    <div className={styles.kbBulkBar} role="toolbar" aria-label="Bulk actions">
      <span className="text-sm font-semibold tabular-nums">{count} selected</span>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={actionBtn}
          disabled={busy}
          aria-expanded={panel === "move"}
          onClick={() => setPanel((p) => (p === "move" ? null : "move"))}
        >
          Move
        </button>
        {panel === "move" ? (
          <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Move to status">
            {STATUS_COLUMNS.map((col) => (
              <button
                key={col.status}
                type="button"
                className={actionBtn}
                disabled={busy}
                onClick={() => {
                  void bulkMoveToStatus(col.status as TaskStatus);
                  closePanel();
                }}
              >
                {col.label}
              </button>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          className={actionBtn}
          disabled={busy}
          aria-expanded={panel === "assign"}
          onClick={() => setPanel((p) => (p === "assign" ? null : "assign"))}
        >
          Assign
        </button>
        {panel === "assign" ? (
          <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-900 dark:text-indigo-100">
            <span className="sr-only">Assign to user</span>
            <select
              /* Use the themed .form-control base + compact overrides (matches the
                 working pattern in ats/pre-boarding). A raw native <select> pinned to
                 h-8 with no line-height clips the option text vertically on Windows
                 browsers, which looked broken. !leading-none + !py-0 + !pe-7 fix it. */
              className="form-control !h-8 !w-auto min-w-[9rem] max-w-[12rem] !rounded-full !border-indigo-300 !bg-white !py-0 !ps-3 !pe-7 !text-xs !leading-none !text-indigo-900 dark:!border-indigo-400/40 dark:!bg-bodybg2 dark:!text-indigo-100"
              disabled={busy}
              defaultValue=""
              onChange={(e) => {
                const value = e.target.value;
                if (!value) return;
                void bulkAssign(value === UNASSIGN_VALUE ? null : value);
                e.target.value = "";
                closePanel();
              }}
            >
              <option value="">Choose user…</option>
              <option value={UNASSIGN_VALUE}>Clear / Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {canDelete ? (
          <button
            type="button"
            className={`${actionBtn} !border-red-300 !text-red-800 hover:!border-red-500 hover:!bg-red-50 dark:!text-red-200`}
            disabled={busy}
            onClick={() => void bulkDelete()}
          >
            Delete
          </button>
        ) : null}

        <button
          type="button"
          className={actionBtn}
          disabled={busy}
          onClick={() => {
            closePanel();
            clearSelection();
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
