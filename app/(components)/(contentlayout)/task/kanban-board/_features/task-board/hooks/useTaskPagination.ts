"use client";

import {
  useTaskData,
  type TaskPaginationApi,
} from "../providers/TaskDataProvider";

/**
 * Selector hook for board-wide offset pagination (P1.5 §5).
 *
 * Reads the pagination slice from `TaskDataProvider`. Page state lives there
 * because the fetch depends on it; this hook keeps consumers decoupled from
 * the wider data context surface.
 */
export function useTaskPagination(): TaskPaginationApi {
  return useTaskData().pagination;
}
