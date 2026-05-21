"use client";

import { useCallback, useState } from "react";
import type { TaskStatus } from "@/shared/lib/api/tasks";
import {
  deleteTask,
  getTaskId,
  updateTask,
  updateTaskStatus,
} from "@/shared/lib/api/tasks";
import { emitPmDataMutated } from "@/shared/hooks/usePmRefetchOnFocus";
import { useTaskSelection } from "../providers/TaskSelectionProvider";
import { useTaskData } from "../providers/TaskDataProvider";
import { extractCorrelationId, humanizeApiError } from "../lib/errors";
import { toast } from "../lib/toast";
import { trackTaskBoard } from "../lib/telemetry";

function newPatchId(taskId: string): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `patch-${Date.now()}-${taskId}`;
}

export function useBulkTaskActions() {
  const { selectedIds, clearSelection } = useTaskSelection();
  const { refetch, mutate } = useTaskData();
  const [busy, setBusy] = useState(false);

  const bulkMoveToStatus = useCallback(
    async (status: TaskStatus, taskIds?: string[]) => {
      const ids = (taskIds ?? [...selectedIds]).filter(Boolean);
      if (!ids.length) return { ok: 0, fail: 0 };

      setBusy(true);
      let ok = 0;
      let fail = 0;

      for (const taskId of ids) {
        const patchId = newPatchId(taskId);
        mutate.applyPatch({
          patchId,
          ts: Date.now(),
          kind: "move",
          taskId,
          patch: { status },
        });
        try {
          await updateTaskStatus(taskId, status);
          ok += 1;
        } catch {
          mutate.revert(patchId);
          fail += 1;
        }
      }

      setBusy(false);
      await refetch();
      emitPmDataMutated();
      trackTaskBoard("taskboard.bulk_move", { count: ok, status });

      if (taskIds == null) clearSelection();

      if (fail > 0) {
        toast.warning(`Moved ${ok} task(s). ${fail} could not be updated.`);
      } else if (ok > 1) {
        toast.success(`Moved ${ok} tasks.`);
      }

      return { ok, fail };
    },
    [clearSelection, mutate, refetch, selectedIds]
  );

  const bulkAssign = useCallback(
    async (userId: string | null) => {
      const ids = [...selectedIds];
      if (!ids.length) return;

      // `null` clears assignees (sets assignedTo to an empty array).
      const assignedTo: string[] = userId ? [userId] : [];
      const isClear = assignedTo.length === 0;

      setBusy(true);
      let ok = 0;
      let fail = 0;

      for (const taskId of ids) {
        const patchId = newPatchId(taskId);
        mutate.applyPatch({
          patchId,
          ts: Date.now(),
          kind: "update",
          taskId,
          patch: { assignedTo },
        });
        try {
          await updateTask(taskId, { assignedTo });
          ok += 1;
        } catch {
          mutate.revert(patchId);
          fail += 1;
        }
      }

      setBusy(false);
      await refetch();
      emitPmDataMutated();
      clearSelection();
      trackTaskBoard("taskboard.bulk_assign", { count: ok });

      const verb = isClear ? "Unassigned" : "Assigned";
      if (fail > 0) {
        toast.warning(`${verb} ${ok} task(s). ${fail} failed.`);
      } else {
        toast.success(`${verb} ${ok} task(s).`);
      }
    },
    [clearSelection, mutate, refetch, selectedIds]
  );

  const bulkDelete = useCallback(async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;

    const confirmed = await toast.confirm(
      `Delete ${ids.length} selected task${ids.length === 1 ? "" : "s"}? This cannot be undone.`,
      { title: "Delete tasks?" }
    );
    if (!confirmed.isConfirmed) return;

    setBusy(true);
    let ok = 0;
    let fail = 0;

    for (const taskId of ids) {
      const patchId = newPatchId(taskId);
      mutate.applyPatch({
        patchId,
        ts: Date.now(),
        kind: "delete",
        taskId,
      });
      try {
        await deleteTask(taskId);
        ok += 1;
      } catch (e) {
        mutate.revert(patchId);
        fail += 1;
        if (ok === 0 && fail === 1) {
          toast.error(humanizeApiError(e, "Failed to delete task."), {
            correlationId: extractCorrelationId(e),
          });
        }
      }
    }

    setBusy(false);
    await refetch();
    emitPmDataMutated();
    clearSelection();
    trackTaskBoard("taskboard.bulk_delete", { count: ok });

    if (fail > 0 && ok > 0) {
      toast.warning(`Deleted ${ok} task(s). ${fail} could not be deleted.`);
    } else if (ok > 0) {
      toast.success(`Deleted ${ok} task(s).`);
    }
  }, [clearSelection, mutate, refetch, selectedIds]);

  return {
    busy,
    bulkMoveToStatus,
    bulkAssign,
    bulkDelete,
    selectedCount: selectedIds.size,
  };
}

/** Resolve task ids to move when dragging with a multi-selection. */
export function bulkDragTaskIds(
  activeId: string,
  selectedIds: ReadonlySet<string>,
  taskStatuses: Map<string, TaskStatus | undefined>,
  targetStatus: TaskStatus
): string[] {
  const useBulk = selectedIds.has(activeId) && selectedIds.size > 1;
  const source = useBulk ? [...selectedIds] : [activeId];
  return source.filter((id) => taskStatuses.get(id) !== targetStatus);
}

