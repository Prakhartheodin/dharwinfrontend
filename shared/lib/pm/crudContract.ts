/**
 * PM CRUD contract (v1) — authoritative product decisions for this codebase.
 *
 * - Team groups: full CRUD via `/project-teams`; members remain on `/teams`.
 * - Task comments: append-only via POST `/tasks/:id/comments` (no edit/delete API).
 * - Milestones: not modeled separately; use task statuses and project dates.
 * - Project attachments: removed from UI until upload pipeline persists URLs on the Project model.
 */
export const PM_TEAM_GROUPS_CRUD = "rename_and_delete_via_project_teams_api" as const;
export const PM_TASK_COMMENTS = "append_only" as const;
export const PM_MILESTONES = "use_tasks_and_project_dates" as const;
export const PM_ATTACHMENTS = "ui_disabled_pending_upload_pipeline" as const;
