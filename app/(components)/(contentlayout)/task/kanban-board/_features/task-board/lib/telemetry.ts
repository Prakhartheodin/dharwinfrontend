export type TaskBoardTelemetryEvent =
  | "taskboard.viewed"
  | "taskboard.filter_applied"
  | "taskboard.view_saved"
  | "taskboard.view_loaded"
  | "taskboard.task_created"
  | "taskboard.task_status_changed"
  | "taskboard.density_changed"
  | "taskboard.list_view_toggled"
  | "taskboard.optimistic_rollback"
  | "taskboard.mutation_failed"
  | "taskboard.feature_flag_fetch_failed"
  | "taskboard.url_param_invalid"
  | "taskboard.localStorage_unavailable"
  | "taskboard.first_drag"
  // P1.5 pagination events (§5.10)
  | "taskboard.page_changed"
  | "taskboard.page_reset"
  | "taskboard.page_clamped"
  | "taskboard.page_drag_animation"
  | "taskboard.sort_changed"
  | "taskboard.filter_chip_overflow"
  | "taskboard.drawer_mode_switch";

export function trackTaskBoard(
  event: TaskBoardTelemetryEvent,
  detail: Record<string, unknown> = {}
): void {
  const payload = { event, ...detail, ts: Date.now() };
  if (typeof window === "undefined") return;
  const w = window as Window & {
    __analytics?: { track?: (e: string, d: object) => void };
  };
  w.__analytics?.track?.(event, payload);
  if (process.env.NODE_ENV !== "production") {
    console.debug("[taskboard telemetry]", payload);
  }
}
